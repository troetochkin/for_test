import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, newClip, newLayer, schedule, totalDuration, activeScenes, layerPose, sceneGeometry, ease, parseProject } from '../engine.js';

test('timeline overlaps scenes without a gap and accounts for speed', () => {
  const a = newClip(), b = newClip('orbit'); b.speed = 2;
  const items = schedule([a, b]);
  assert.equal(items[0].start, 0);
  assert.equal(items[1].start, a.duration - .45);
  assert.equal(totalDuration([a, b]), a.duration + b.duration / 2 - .45);
  const active = activeScenes([a, b], items[1].start + .225);
  assert.equal(active.length, 2);
  assert.ok(Math.abs(active[0].alpha - .5) < .000001);
  assert.ok(Math.abs(active[1].alpha - .5) < .000001);
  assert.ok(Math.abs(active[1].local - .45) < .000001);
  for (let t = 0; t < totalDuration([a, b]); t += .025) assert.ok(activeScenes([a, b], t).length > 0);
});
test('the final frame and shortest clips remain defined', () => {
  const a = newClip(), b = newClip('device'); a.duration = b.duration = 2; a.speed = b.speed = 3;
  const items = schedule([a, b]);
  assert.ok(items[1].overlap < items[0].duration);
  assert.equal(activeScenes([a, b], totalDuration([a, b])).at(-1).clip.id, b.id);
});
test('card presets animate multiple independent layers in 3D at any seek position', () => {
  for (const preset of PRESETS.filter(p => !p.renderer)) {
    const clip = newClip(preset.id); clip.layers = Array.from({ length: 8 }, (_, i) => newLayer(i));
    for (const ratio of [[1920, 1080], [1080, 1920], [7680, 100]]) {
      const geometry = sceneGeometry(...ratio, clip.presetId);
      for (let time = 0; time <= clip.duration; time += .31) {
        clip.layers.forEach((l, index) => {
          const pose = layerPose(clip, l, index, time, geometry);
          assert.ok(Object.values(pose).every(Number.isFinite), preset.id);
          assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
          assert.deepEqual(pose, layerPose(clip, l, index, time, geometry));
        });
      }
    }
    const geometry = sceneGeometry(1920, 1080, clip.presetId);
    assert.notDeepEqual(layerPose(clip, clip.layers[0], 0, 2, geometry), layerPose(clip, clip.layers[1], 1, 2, geometry));
  }
});
test('frame transformations and stagger apply independently', () => {
  const clip = newClip(), geometry = sceneGeometry(1920, 1080, clip.presetId);
  const a = layerPose(clip, clip.layers[0], 0, 3, geometry);
  clip.layers[0].x = 120; clip.layers[0].z = 80; clip.layers[0].rotation = 45; clip.layers[0].opacity = 50;
  const b = layerPose(clip, clip.layers[0], 0, 3, geometry);
  assert.equal(b.x, a.x + 120); assert.equal(b.z, a.z + 80); assert.equal(b.rz, a.rz + 45); assert.equal(b.opacity, .5);
  clip.layers[1].delay = 3;
  assert.equal(layerPose(clip, clip.layers[1], 1, 1, geometry).opacity, 0);
  assert.equal(clip.layers[2].x, 0);
});
test('all easing curves have valid endpoints and deterministic interior values', () => {
  for (const type of ['smooth', 'in', 'out', 'linear', 'spring', 'cinematic']) {
    assert.ok(Math.abs(ease(0, type)) < .0001); assert.ok(Math.abs(ease(1, type) - 1) < .0001);
    assert.equal(ease(.33, type), ease(.33, type));
  }
});
test('portable projects round-trip media, independent clips and layer overrides', () => {
  const a = newClip(), b = newClip('orbit'); b.layers[0].kind = 'image'; b.layers[0].mediaId = 'asset'; b.layers[0].x = 52; b.speed = 2;
  const project = { version: 2, name: 'Тест', width: 1080, height: 1920, clips: [a, b], media: { asset: { kind: 'image', name: 'test.svg', src: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' } } };
  const restored = parseProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.media.asset.src, project.media.asset.src);
  assert.equal(restored.clips[1].layers[0].x, 52); assert.equal(restored.clips[1].speed, 2);
  restored.clips[0].layers[0].title = 'changed'; assert.notEqual(restored.clips[1].layers[0].title, 'changed');
  assert.notEqual(restored.clips[0].id, a.id);
});
test('broken project files are rejected before replacing the current project', () => {
  assert.throws(() => parseProject({ version: 1, clips: [] }));
  const p = { version: 2, clips: [newClip()], media: {} };
  p.clips[0].layers[0].kind = 'image'; p.clips[0].layers[0].mediaId = 'missing';
  assert.throws(() => parseProject(p), /медиафайл/);
  p.media.missing = { kind: 'image', src: 'https://example.com/tracker.svg' }; assert.throws(() => parseProject(p), /медиафайл/);
  p.media = {}; p.clips[0] = newClip(); p.clips[0].duration = Infinity; p.clips[0].depth = 2000;
  const result = parseProject(p); assert.equal(result.clips[0].duration, 7); assert.equal(result.clips[0].depth, 400);
});
