import test from 'node:test';
import assert from 'node:assert/strict';
import { identity, compose, translation, rotationX, rotationY, scaling, perspective, transformPoint, makeGrid, updateGrid, surfaceFor } from '../geometry.js';
import { PRESETS, newClip, parseProject } from '../engine.js';
test('matrix composition keeps projection and dragging coordinates finite',()=>{
 assert.deepEqual(transformPoint(identity(),[1,2,3]),[1,2,3]);
 assert.deepEqual(transformPoint(compose(translation(2,3,4),scaling(2)),[1,2,3]),[4,7,10]);
 const m=compose(perspective(.7,16/9),translation(0,0,-5),rotationX(.2),rotationY(-.5));
 assert.ok(transformPoint(m,[1,1,1]).every(Number.isFinite));
});
test('all curved presets tessellate into finite indexed meshes at any playback position',()=>{
 for(const preset of PRESETS.filter(p=>p.renderer==='webgl')){
  const clip=newClip(preset.id);
  for(const time of [0,1,clip.duration/2,clip.duration]){
   for(let i=0;i<clip.layers.length;i++){
    const grid=makeGrid(32,8);updateGrid(grid,surfaceFor(clip.presetId,i,clip.layers.length,time,clip));
    assert.ok(grid.vertices.every(Number.isFinite),preset.id);
    assert.ok(grid.indices.every(n=>n<grid.vertices.length/8));
    assert.deepEqual(grid.vertices,updateGrid(makeGrid(32,8),surfaceFor(clip.presetId,i,clip.layers.length,time,clip)).vertices,'seek is deterministic');
   }
  }
 }
});
test('3D shape settings change the actual mesh instead of a cosmetic wrapper',()=>{
 const c=newClip('type-rings');
 const a=updateGrid(makeGrid(16,4),surfaceFor(c.presetId,0,6,1,c)).vertices;
 const b=updateGrid(makeGrid(16,4),surfaceFor(c.presetId,0,6,1,{...c,curvature:150,turns:170})).vertices;
 assert.notDeepEqual(a,b);
});
test('spatial settings, empty scenes and media remain portable in existing version 2 projects',()=>{
 const c=newClip('liquid-sphere');c.curvature=140;c.turns=75;c.repeat=5;c.gloss=85;c.ink='#123456';c.typeface='serif';c.layers=[];
 const restored=parseProject({version:2,width:1080,height:1080,clips:[c],media:{}}).clips[0];
 for(const k of ['curvature','turns','repeat','gloss','ink','typeface'])assert.equal(restored[k],c[k]);
 assert.deepEqual(restored.layers,[]);
 const old=newClip('cascade');delete old.curvature;delete old.typeface;
 const result=parseProject({version:2,clips:[old],media:{}}).clips[0];assert.equal(result.curvature,65);assert.equal(result.typeface,'condensed');
});
