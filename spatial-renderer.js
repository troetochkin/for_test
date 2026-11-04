import { ease } from './engine.js?v=3.0.0';
import { makeGrid, updateGrid, surfaceFor, compose, translation, scaling, rotationX, rotationY, rotationZ, perspective, TAU } from './geometry.js?v=3.0.0';
import { LayerMaterial } from './materials.js?v=3.0.0';

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;
uniform mat4 uModelView;
uniform mat4 uProjection;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUV;
void main(){
  vec4 p=uModelView*vec4(aPosition,1.0);
  vPosition=p.xyz; vNormal=mat3(uModelView)*aNormal; vUV=aUV;
  gl_Position=uProjection*p;
}`;
const FRAGMENT = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUV;
uniform sampler2D uTexture;
uniform float uAlpha;
uniform float uLight;
uniform float uGloss;
uniform float uShadow;
uniform float uSoftness;
uniform float uFlat;
uniform float uSelected;
uniform vec3 uLightDirection;
uniform float uPicking;
uniform float uId;
uniform vec2 uUVOffset;
void main(){
  if(uPicking>0.5){gl_FragColor=vec4(uId/255.0,0.0,0.0,1.0);return;}
  vec2 uv=fract(vUV+uUVOffset);
  vec4 tex=texture2D(uTexture,uv);
  vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
  vec3 light=normalize(uLightDirection);
  float diffuse=max(dot(n,light),0.0);
  vec3 view=normalize(-vPosition);
  float specular=pow(max(dot(n,normalize(light+view)),0.0),mix(12.0,100.0,uGloss));
  float softDiffuse=pow(diffuse,mix(1.8,.55,uSoftness));
  float brightness=mix(1.0,.82-uShadow*.35+softDiffuse*(.2+uShadow*.3),uLight*(1.0-uFlat));
  vec3 result=tex.rgb*brightness+vec3(specular*uGloss*uLight*.46*(1.0-uFlat));
  float rim=pow(1.0-abs(dot(n,view)),3.0);
  result+=vec3(.65,.45,1.0)*uSelected*rim*.2;
  gl_FragColor=vec4(result,tex.a*uAlpha);
}`;
function shader(gl, type, source) {
  const s = gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s);
  if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(error); }
  return s;
}
export class SpatialRenderer {
  constructor(canvas, onError) {
    this.canvas = canvas; this.onError = onError; this.resources = new Map(); this.layers = []; this.objects = []; this.lastOptions = null; this.disposed = false;
    const gl = canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
    if (!gl) throw new Error('Для объёмных пресетов нужен WebGL. Включите аппаратное ускорение браузера.');
    this.gl = gl; this.program = gl.createProgram();
    const vs=shader(gl,gl.VERTEX_SHADER,VERTEX), fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
    gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
    this.attributes = Object.fromEntries(['aPosition','aNormal','aUV'].map(n=>[n,gl.getAttribLocation(this.program,n)]));
    this.uniforms = Object.fromEntries(['uModelView','uProjection','uTexture','uAlpha','uLight','uGloss','uShadow','uSoftness','uFlat','uSelected','uLightDirection','uPicking','uId','uUVOffset'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
    this.solidTexture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,this.solidTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([5,5,7,255]));
    this.core = this.createMesh(72,36); this.lost = false;
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(!this.disposed){this.lost=true;onError('3D-контекст потерян. Переключите клип, чтобы восстановить сцену.');}});
  }
  createMesh(columns,rows) {
    const gl=this.gl, grid=makeGrid(columns,rows), vertex=gl.createBuffer(), index=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,grid.indices,gl.STATIC_DRAW);
    return {grid,vertex,index};
  }
  deleteMesh(mesh) { this.gl.deleteBuffer(mesh.vertex);this.gl.deleteBuffer(mesh.index); }
  sync(clip, media) {
    const gl=this.gl;
    const ids=new Set(clip.layers.map(l=>l.id));
    for(const [id,r] of this.resources)if(!ids.has(id)){r.material.dispose();gl.deleteTexture(r.texture);this.deleteMesh(r.mesh);this.resources.delete(id);}
    this.layers=clip.layers.map(layer=>{
      let r=this.resources.get(layer.id);
      if(!r){const texture=gl.createTexture();r={texture,mesh:this.createMesh(clip.presetId==='type-cloth'?56:96,clip.presetId==='liquid-sphere'?16:8),material:new LayerMaterial(layer,(['image','video'].includes(layer.kind)?media[layer.mediaId]:null),this.onError)};this.resources.set(layer.id,r);
        gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
      }
      r.material.setAsset(layer,(['image','video'].includes(layer.kind)?media[layer.mediaId]:null),this.onError);
      return {layerId:layer.id,video:r.material.video};
    });
  }
  draw(clip, local, options) {
    if(this.disposed||this.lost)return;
    this.clip=clip;this.local=local;this.lastOptions=options;
    this.sync(clip,options.media);
    const key=JSON.stringify([clip,local,options.width,options.height,options.selectedLayerId,options.playing]);
    if (!options.playing && key===this.lastKey && ![...this.resources.values()].some(r=>!r.material.signature)) return;
    this.lastKey=key;
    const warpedLocal=ease(Math.min(1,local/clip.duration),clip.easing)*clip.duration;
    const gl=this.gl;
    const dpr=Math.min(window.devicePixelRatio||1,1.5), width=Math.max(1,Math.round(options.width*dpr)), height=Math.max(1,Math.round(options.height*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    this.objects=[];
    const phase=warpedLocal/clip.duration*TAU*clip.turns/100*clip.motion/100;
    const tunnel=clip.presetId==='type-tunnel';
    const distance=tunnel?5.9:5.4;
    this.distance=distance;
    const tilt=clip.tiltX*Math.PI/180, yaw=clip.tiltY*Math.PI/180;
    const view=compose(translation(0,0,-distance),rotationX(tilt),rotationY(yaw+(tunnel?0:Math.sin(phase)*.07)),rotationZ(clip.presetId==='type-rings'?-.23:clip.presetId==='helix'?-.15:0),scaling(clip.zoom/100),scaling(1,1,.65+clip.depth/400));
    this.projection=perspective(40*Math.PI/180,width/height);
    const coreColor = clip.presetId === 'liquid-sphere' ? (clip.layers[0]?.color || '#ef1d25') : '#050507';
    gl.bindTexture(gl.TEXTURE_2D,this.solidTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([...coreColor.slice(1).match(/../g).map(h=>parseInt(h,16)),255]));
    if(['type-rings','liquid-sphere'].includes(clip.presetId)&&clip.layers.length){
      const coreClip=clip.presetId==='type-rings'?{...clip,curvature:0}:clip;
      updateGrid(this.core.grid,surfaceFor('core',0,1,warpedLocal,coreClip));
      this.objects.push({mesh:this.core,texture:this.solidTexture,matrix:compose(view,translation(0,clip.presetId==='type-rings'?-.3:0,0),scaling(clip.presetId==='type-rings'?.93:1)),id:0,alpha:1,flat:0,selected:false});
    }
    clip.layers.forEach((layer,i)=>{
      const r=this.resources.get(layer.id);
      options.syncVideo?.(r.material.video,Math.max(0,local-layer.delay),clip.speed);
      if(r.material.update(layer,clip,i)){
        gl.bindTexture(gl.TEXTURE_2D,r.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,r.material.canvas);
      }
      updateGrid(r.mesh.grid,surfaceFor(clip.presetId,i,clip.layers.length,warpedLocal,clip));
      const matrix=compose(view,translation(layer.x/240,-layer.y/240,layer.z/240),rotationZ(-layer.rotation*Math.PI/180),scaling(layer.scale/100));
      const alpha=layer.opacity/100*Math.min(1,Math.max(0,(local-layer.delay-Math.min(clip.duration*.4,clip.stagger*i))*4));
      if(alpha>.001)this.objects.push({mesh:r.mesh,texture:r.texture,matrix,id:i+1,alpha,flat:tunnel?1:0,selected:!options.playing&&options.selectedLayerId===layer.id});
    });
    this.render(false);
  }
  render(picking) {
    const gl=this.gl,c=this.clip,u=this.uniforms;
    gl.viewport(0,0,this.canvas.width,this.canvas.height);const rgb=c.background.slice(1).match(/../g).map(h=>parseInt(h,16)/255);
    gl.clearColor(picking?0:rgb[0],picking?0:rgb[1],picking?0:rgb[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    if(picking){gl.disable(gl.BLEND);gl.disable(gl.DITHER);}else{gl.enable(gl.BLEND);gl.enable(gl.DITHER);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}
    gl.useProgram(this.program);gl.uniformMatrix4fv(u.uProjection,false,this.projection);gl.uniform1i(u.uTexture,0);gl.uniform1f(u.uPicking,picking?1:0);
    gl.uniform1f(u.uLight,c.light/100);gl.uniform1f(u.uGloss,c.gloss/100);gl.uniform1f(u.uShadow,c.shadow/100);gl.uniform1f(u.uSoftness,c.softness/100);
    const lightAngle=c.lightAngle*Math.PI/180;gl.uniform3f(u.uLightDirection,Math.sin(lightAngle)*3,2.5,4);
    for(const object of this.objects){
      const {mesh}=object;
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertex);gl.bufferData(gl.ARRAY_BUFFER,mesh.grid.vertices,gl.DYNAMIC_DRAW);
      for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aUV',2,24]]){const a=this.attributes[name];gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,32,offset);}
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,object.texture);
      gl.uniformMatrix4fv(u.uModelView,false,object.matrix);gl.uniform1f(u.uAlpha,object.alpha);gl.uniform1f(u.uId,object.id);gl.uniform1f(u.uFlat,object.flat);gl.uniform1f(u.uSelected,object.selected?1:0);
      gl.uniform2f(u.uUVOffset,0,c.presetId==='type-tunnel'?ease(this.local/c.duration,c.easing)*c.repeat:0);
      gl.drawElements(gl.TRIANGLES,mesh.grid.indices.length,gl.UNSIGNED_SHORT,0);
    }
  }
  pick(x,y) {
    if(this.lost||this.disposed||!this.lastOptions)return -1;
    this.render(true);const gl=this.gl,pixel=new Uint8Array(4),r=this.canvas.getBoundingClientRect();
    gl.readPixels(Math.floor(x/r.width*this.canvas.width),Math.floor((1-y/r.height)*this.canvas.height),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);this.render(false);return pixel[0]-1;
  }
  dragDelta(dx,dy) { const scale=2*Math.tan(20*Math.PI/180)*this.distance/this.canvas.clientHeight*240/(this.clip.zoom/100);return [dx*scale,dy*scale]; }
  dispose() {
    if(this.disposed)return;this.disposed=true;
    const gl=this.gl;for(const r of this.resources.values()){r.material.dispose();gl.deleteTexture(r.texture);this.deleteMesh(r.mesh);}this.resources.clear();this.deleteMesh(this.core);gl.deleteTexture(this.solidTexture);gl.deleteProgram(this.program);gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
