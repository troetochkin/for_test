// Deterministic motion: playback, scrubbing and clip transitions use the same clock.
export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const PALETTE = ['#d8ed7c', '#cab8ed', '#efb5a2', '#bddbd0', '#e9d9be', '#9bbde0', '#edc5d4', '#c8d2dd'];
export const PRESETS = [
  { id: 'type-rings', name: 'Type rings', category: 'type', renderer: 'webgl', caption: 'Типографические ленты · сфера', source: 'По приложенному изображению', color: '#eeeeeb', bg: '#bfc0c2', duration: 10, depth: 150, spread: 100, tiltX: -17, tiltY: -16, stagger: 0 },
  { id: 'liquid-sphere', name: 'Liquid type', category: 'type', renderer: 'webgl', caption: 'Красный хром · текучая форма', source: 'По приложенному изображению', color: '#ef1d25', bg: '#f6f4f0', duration: 9, depth: 120, spread: 100, tiltX: 8, tiltY: -8, stagger: 0 },
  { id: 'type-tunnel', name: 'Type tunnel', category: 'type', renderer: 'webgl', caption: 'Воронка · изогнутая типографика', source: 'По приложенному изображению', color: '#161619', bg: '#080809', duration: 10, depth: 100, spread: 100, tiltX: 0, tiltY: 0, stagger: 0 },
  { id: 'letter-ballet', name: 'Letter ballet', category: 'graphic', renderer: 'kinetic', caption: 'Курсив · вихрь · смена масштаба', source: 'По приложенному видео', color: '#f8c700', bg: '#f8c700', duration: 12, depth: 120, spread: 100, tiltX: 0, tiltY: 0, stagger: 0 },
  { id: 'pattern-roll', name: 'Pattern roll', category: 'graphic', renderer: 'kinetic', caption: 'Повтор · вращение · оптический ритм', source: 'По приложенному видео', color: '#ece8df', bg: '#141416', duration: 9, depth: 100, spread: 100, tiltX: 0, tiltY: 0, stagger: 0 },
  { id: 'helix', name: 'Ribbon helix', category: 'type', renderer: 'webgl', caption: 'Спираль · встречное вращение', source: 'Авторская вариация', color: '#d0f97b', bg: '#24252b', duration: 10, depth: 150, spread: 100, tiltX: -12, tiltY: -20, stagger: 0 },
  { id: 'type-cloth', name: 'Type textile', category: 'type', renderer: 'webgl', caption: 'Ткань · волны · печатный паттерн', source: 'Авторская вариация', color: '#c6adf2', bg: '#e4dfd9', duration: 10, depth: 150, spread: 100, tiltX: 10, tiltY: -15, stagger: 0 },
  { id: 'cascade', name: 'Объёмный каскад', category: 'cards', caption: 'Слои · глубина · мягкий свет', color: '#c4b1ea', bg: '#bdb2d3', duration: 7, depth: 140, spread: 75, tiltX: 10, tiltY: -16, stagger: .16 },
  { id: 'orbit', name: 'Орбита', category: 'cards', caption: 'Дуга · параллакс · поворот', color: '#c2dbb3', bg: '#bbc8b5', duration: 8, depth: 220, spread: 90, tiltX: 5, tiltY: -8, stagger: .12 },
  { id: 'editorial', name: 'Editorial flow', category: 'cards', caption: 'Встречный вылет · ритм', color: '#ebc0ac', bg: '#d6b8a5', duration: 7, depth: 90, spread: 85, tiltX: 3, tiltY: -12, stagger: .2 },
  { id: 'device', name: 'Device studio', category: 'mockups', caption: 'Мокапы · стекло · блики', color: '#a9bfdf', bg: '#a7b6ca', duration: 8, depth: 180, spread: 85, tiltX: 8, tiltY: -16, stagger: .18 },
  { id: 'ribbon', name: 'Волна', category: 'cards', caption: 'Пластика · свет · движение', color: '#d1b9d7', bg: '#c8b2c8', duration: 8, depth: 160, spread: 78, tiltX: 5, tiltY: -10, stagger: .12 },
  { id: 'gallery', name: 'Галерея', category: 'mockups', caption: 'Сетка · пролёт камеры', color: '#dfd2b7', bg: '#cec2ad', duration: 8, depth: 110, spread: 82, tiltX: 12, tiltY: -18, stagger: .1 },
];
export const presetById = id => PRESETS.find(p => p.id === id) || PRESETS.find(p => p.id === 'cascade');
export function newLayer(index = 0) {
  const titles = ['Make\nit move.', 'Less,\nbut better.', 'A new\nperspective.', 'Stay\ncurious.', 'Beyond\nthe ordinary.', 'Find\nyour rhythm.', 'Create\nsomething.', 'Keep\nexploring.'];
  return { id: uid(), name: `Кадр ${index + 1}`, kind: 'design', mediaId: null, title: titles[index % 8], subtitle: 'FORM / MOTION STUDIES', color: PALETTE[index % 8], fit: 'cover', fontSize: 100, x: 0, y: 0, z: 0, rotation: 0, scale: 100, opacity: 100, delay: 0 };
}
export function presetLayers(id) {
  const titles = {
    'type-rings': ['Queens / The Bronx', 'NEW YORK * NEW YORK', 'Brooklyn / Staten Island', 'BROOKLYN * BROOKLYN', '02•12•20', 'MANHATTAN * MANHATTAN'],
    'liquid-sphere': ['The Photo\nPop Up\nCulture Series', 'presents', 'NEW WAYS\nTO SEE', 'Move your\nperspective'],
    'type-tunnel': ['ALTERNATIVE PLANET FM', 'W/ TASH LC, ANZ & SPECIAL REQUEST', 'ECHOBOX PRESENTS W/ APRIL22.', 'ART OF DJING LIVE: FREDDY K'],
    'letter-ballet': ['Let', 'my', 'ideas', 'run', 'wild'],
    'pattern-roll': ['my', 'own', 'rhythm'],
    'helix': ['INFINITE MOTION', 'FIND YOUR FLOW', 'CREATE SOMETHING', 'MOVE BEYOND', 'INFINITE MOTION'],
    'type-cloth': ['FEEL THE FLOW', 'MOVE WITH IT', 'FEEL THE FLOW', 'MOVE WITH IT'],
  }[id];
  if (!titles) return [0, 1, 2].map(newLayer);
  return titles.map((title, i) => {
    const l = newLayer(i); l.title = title; l.kind = 'text'; l.subtitle = ''; l.color = presetById(id).color;
    if (id === 'letter-ballet') l.color = ['#faf8f2', '#111113', '#ed5100', '#f5c500', '#4c00cb'][i];
    return l;
  });
}
export function newClip(presetId = 'cascade') {
  const p = presetById(presetId);
  return { id: uid(), presetId: p.id, name: p.name, duration: p.duration, speed: 1, easing: p.renderer ? 'linear' : 'smooth', background: p.bg, depth: p.depth, spread: p.spread, tiltX: p.tiltX, tiltY: p.tiltY, stagger: p.stagger, motion: 100, zoom: 100, light: 75, lightAngle: -35, shadow: 55, softness: 65, curvature: p.id === 'liquid-sphere' ? 80 : 65, turns: 100, repeat: p.id === 'type-tunnel' ? 2 : 3, gloss: p.id === 'liquid-sphere' ? 85 : 30, frameColors: p.id === 'letter-ballet', autoInk: p.id === 'letter-ballet', ink: ['type-tunnel', 'pattern-roll'].includes(p.id) ? '#f5f2ec' : '#101013', typeface: ['letter-ballet', 'pattern-roll'].includes(p.id) ? 'serif' : 'condensed', layers: presetLayers(p.id) };
}
export const effectiveDuration = clip => clip.duration / clip.speed;
export function schedule(clips) {
  let end = 0;
  return clips.map((clip, index) => {
    const duration = effectiveDuration(clip);
    const overlap = index ? Math.min(.45, duration * .12, effectiveDuration(clips[index - 1]) * .12) : 0;
    const start = end - overlap;
    end = start + duration;
    return { clip, index, start, end, duration, overlap };
  });
}
export function totalDuration(clips) { return schedule(clips).at(-1)?.end || 0; }
export function activeScenes(clips, time) {
  const items = schedule(clips);
  const at = clamp(time, 0, Math.max(0, totalDuration(clips) - .00001));
  const active = items.filter(item => at >= item.start && at < item.end);
  return active.map((item, i) => {
    let alpha = 1;
    if (active.length === 2) {
      const next = active[1];
      const mix = clamp((at - next.start) / next.overlap);
      alpha = i === 0 ? 1 - mix : mix;
    }
    return { ...item, local: (at - item.start) * item.clip.speed, alpha };
  });
}
const bezier = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
export function ease(t, type = 'smooth') {
  t = clamp(t);
  if (type === 'linear') return t;
  if (type === 'spring') return 1 - (1 - t) ** 3 * Math.cos(t * Math.PI * 3.5);
  const points = { smooth: [.65, 0, .35, 1], in: [.55, 0, 1, .45], out: [0, .55, .45, 1], cinematic: [.76, 0, .24, 1] }[type] || [.65, 0, .35, 1];
  let low = 0, high = 1;
  for (let i = 0; i < 16; i++) { const mid = (low + high) / 2; if (bezier(mid, points[0], points[2]) < t) low = mid; else high = mid; }
  return bezier((low + high) / 2, points[1], points[3]);
}
export function sceneGeometry(width, height, presetId) {
  const sceneHeight = 1200 * height / width;
  const ratio = presetId === 'device' ? .49 : .75;
  const cardHeight = Math.min(sceneHeight * .59, 380 / ratio);
  return { width: 1200, height: sceneHeight, cardWidth: cardHeight * ratio, cardHeight };
}
export function layerPose(clip, layer, index, localTime, geometry) {
  const { cardWidth: w, cardHeight: h } = geometry;
  const count = clip.layers.length;
  const c = index - (count - 1) / 2;
  const spread = clip.spread / 100;
  const d = clip.depth;
  const p = clamp(localTime / clip.duration);
  const motion = clip.motion / 100;
  const drift = Math.sin(p * Math.PI * 2 - .8) * motion;
  let x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0;
  switch (clip.presetId) {
    case 'orbit': {
      const a = c * Math.min(.6, 2.5 / count) + drift * .24;
      x = Math.sin(a) * w * 2.15 * spread; z = Math.cos(a) * d * 1.6 - d;
      y = Math.sin(a * 1.4) * h * .08; ry = -a * 38; rz = Math.sin(a) * -5; rx = 4 + drift * 3;
      break;
    }
    case 'editorial':
      x = c * w * .9 * spread; y = (index % 2 ? -1 : 1) * h * .15 + drift * h * .035;
      z = (index % 2 ? .35 : -.35) * d; rz = (index % 2 ? 7 : -7) + drift * 2; ry = c * -6; rx = 5;
      break;
    case 'device':
      x = c * w * 1.28 * spread; y = Math.abs(c) * h * .07 + drift * 12;
      z = -Math.abs(c) * d * .5; ry = -c * 15 + drift * 7; rx = 3 + drift * 3; rz = c * 3;
      break;
    case 'ribbon':
      x = c * w * .83 * spread; y = Math.sin(c * .9 + p * Math.PI * 2) * h * .16 * motion;
      z = Math.cos(c * .8 + p * Math.PI * 2) * d * .55; ry = -c * 13 + drift * 10; rx = Math.cos(c + p * 6) * 9 * motion; rz = Math.sin(c + p * 6) * 6 * motion;
      break;
    case 'gallery': {
      const cols = count <= 2 ? count : Math.min(3, Math.ceil(Math.sqrt(count)));
      const rows = Math.ceil(count / cols);
      x = (index % cols - (cols - 1) / 2) * w * 1.18 * spread;
      y = (Math.floor(index / cols) - (rows - 1) / 2) * h * 1.12 * spread;
      z = (index % 2 ? 1 : -1) * d * .3; ry = -4 + drift * 3; rz = 0;
      break;
    }
    default:
      x = c * w * .68 * spread; y = Math.abs(c) * h * .1 + drift * 8;
      z = -Math.abs(c) * d * .7 + d * .3; ry = c * -11 + drift * 6; rx = 9; rz = c * -7 + drift * 2;
  }
  // A coordinated entrance uses the same easing with a stagger per media frame.
  const maxDelay = Math.min(clip.duration * .4, clip.stagger * (count - 1));
  const delay = count > 1 ? index / (count - 1) * maxDelay : 0;
  const enterRaw = clamp((localTime - delay - layer.delay) / Math.min(1.25, clip.duration * .25));
  const enter = ease(enterRaw, clip.easing);
  const groupScale = clip.presetId === 'gallery' ? (count > 3 ? .63 : .85) : Math.min(1, 3.8 / Math.max(3, count));
  const side = index % 2 ? 1 : -1;
  x += (clip.presetId === 'editorial' ? side * w * 1.1 : c * 25) * (1 - enter);
  y += h * .65 * (1 - enter); z -= d * 1.5 * (1 - enter);
  rx += 28 * (1 - enter); ry += side * 35 * (1 - enter); rz += side * 10 * (1 - enter);
  return { x: x * groupScale + layer.x, y: y * groupScale + layer.y, z: z + layer.z, rx, ry, rz: rz + layer.rotation, scale: groupScale * layer.scale / 100 * (.85 + .15 * enter), opacity: clamp(enterRaw * 3) * layer.opacity / 100 };
}
export function cameraPose(clip, localTime) {
  const p = clamp(localTime / clip.duration);
  const amount = clip.motion / 100;
  const travel = ease(p, clip.easing);
  return { rx: clip.tiltX + Math.sin(p * Math.PI * 2) * 2.5 * amount, ry: clip.tiltY + (travel - .5) * 14 * amount, zoom: clip.zoom / 100 * (1 + Math.sin(p * Math.PI) * .045 * amount) };
}
const numeric = (v, fallback, min, max) => Number.isFinite(Number(v)) ? clamp(Number(v), min, max) : fallback;
const str = (v, fallback = '', max = 200) => typeof v === 'string' ? v.slice(0, max) : fallback;
const color = (v, fallback) => /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
export function parseProject(input) {
  if (!input || input.version !== 2 || !Array.isArray(input.clips) || !input.clips.length || input.clips.length > 30) throw new Error('Нужен проект Forma версии 2 (от 1 до 30 клипов).');
  const media = Object.create(null);
  const entries = Object.entries(input.media || {});
  if (entries.length > 240) throw new Error('Слишком много медиафайлов.');
  for (const [id, m] of entries) {
    if (!m || typeof id !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(id) || !['image', 'video'].includes(m.kind) || typeof m.src !== 'string' || !/^data:(image\/(png|jpeg|webp|gif|svg\+xml|avif)|video\/(mp4|webm|ogg|quicktime));base64,[a-zA-Z0-9+/=]+$/.test(m.src)) throw new Error('Некорректный медиафайл в проекте.');
    media[id] = { id, kind: m.kind, name: str(m.name, 'Медиа'), src: m.src };
  }
  const clips = input.clips.map(raw => {
    if (!raw || !PRESETS.some(p => p.id === raw.presetId) || !Array.isArray(raw.layers) || raw.layers.length > 8) throw new Error('Некорректный пресет или количество кадров.');
    const c = newClip(raw.presetId);
    c.frameColors = typeof raw.frameColors === 'boolean' ? raw.frameColors : c.frameColors; c.autoInk = typeof raw.autoInk === 'boolean' ? raw.autoInk : c.autoInk;
    c.name = str(raw.name, c.name, 60); c.background = color(raw.background, c.background); c.ink = color(raw.ink, c.ink); c.typeface = ['condensed', 'sans', 'serif', 'mono'].includes(raw.typeface) ? raw.typeface : c.typeface;
    for (const [key, min, max] of [['duration', 2, 30], ['speed', .25, 3], ['depth', 0, 400], ['spread', 20, 150], ['tiltX', -45, 45], ['tiltY', -55, 55], ['stagger', 0, .6], ['motion', 0, 200], ['zoom', 30, 160], ['light', 0, 100], ['lightAngle', -180, 180], ['shadow', 0, 100], ['softness', 0, 100], ['curvature', 0, 150], ['turns', 0, 200], ['repeat', 1, 8], ['gloss', 0, 100]]) c[key] = numeric(raw[key], c[key], min, max);
    c.easing = ['smooth', 'in', 'out', 'linear', 'spring', 'cinematic'].includes(raw.easing) ? raw.easing : 'smooth';
    c.layers = raw.layers.map((r, i) => {
      if (!r || !['design', 'image', 'video', 'text'].includes(r.kind)) throw new Error('Некорректный кадр.');
      if (['image', 'video'].includes(r.kind) && (!media[r.mediaId] || media[r.mediaId].kind !== r.kind)) throw new Error('Не найден медиафайл кадра.');
      const l = newLayer(i);
      l.kind = r.kind; l.name = str(r.name, l.name, 60); l.title = str(r.title, l.title, 300); l.subtitle = str(r.subtitle, l.subtitle, 100); l.color = color(r.color, l.color); l.mediaId = ['image', 'video'].includes(l.kind) ? r.mediaId : null; l.fit = r.fit === 'contain' ? 'contain' : 'cover';
      for (const [key, min, max] of [['fontSize', 50, 160], ['x', -600, 600], ['y', -600, 600], ['z', -400, 400], ['rotation', -180, 180], ['scale', 20, 200], ['opacity', 0, 100], ['delay', 0, 5]]) l[key] = numeric(r[key], l[key], min, max);
      return l;
    });
    return c;
  });
  return { version: 2, name: str(input.name, 'Мой motion-проект', 80), width: Math.round(numeric(input.width, 1920, 100, 7680)), height: Math.round(numeric(input.height, 1080, 100, 7680)), clips, media };
}
