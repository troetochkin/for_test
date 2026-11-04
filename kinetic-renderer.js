import { LayerMaterial, drawMedia, fontFamily, contrast } from './materials.js?v=3.0.0';
import { ease, clamp } from './engine.js?v=3.0.0';
export class KineticRenderer {
  constructor(canvas,onError){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.resources=new Map();this.layers=[];this.hitRects=[];this.onError=onError;}
  sync(clip,media){
    const ids=new Set(clip.layers.map(l=>l.id));for(const[id,r]of this.resources)if(!ids.has(id)){r.dispose();this.resources.delete(id);}
    this.layers=clip.layers.map(layer=>{let r=this.resources.get(layer.id);if(!r){r=new LayerMaterial(layer,media[layer.mediaId],this.onError);this.resources.set(layer.id,r);}r.setAsset(layer,['image','video'].includes(layer.kind)?media[layer.mediaId]:null,this.onError);return{layerId:layer.id,video:r.video};});
  }
  draw(clip,local,options){
    this.sync(clip,options.media);this.clip=clip;this.hitRects=[];
    const key=JSON.stringify([clip,local,options.width,options.height,[...this.resources.values()].map(r=>r.revision)]);
    if (!options.playing && key===this.lastKey) return; this.lastKey=key;
    const dpr=Math.min(window.devicePixelRatio||1,1.5),w=1200,h=1200*options.height/options.width;
    if(this.canvas.width!==Math.round(options.width*dpr)||this.canvas.height!==Math.round(options.height*dpr)){this.canvas.width=Math.round(options.width*dpr);this.canvas.height=Math.round(options.height*dpr);}
    const ctx=this.ctx;ctx.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);ctx.globalAlpha=1;ctx.fillStyle=clip.background;ctx.fillRect(0,0,w,h);
    if(!clip.layers.length)return;
    if(clip.presetId==='pattern-roll')this.pattern(clip,local,w,h,options);else this.ballet(clip,local,w,h,options);
  }
  layerSetup(ctx,layer,clip,w,h){ctx.translate(w/2+layer.x,h/2+layer.y);ctx.rotate((layer.rotation+(clip.tiltX+clip.tiltY)*.4)*Math.PI/180);ctx.scale(layer.scale/100*clip.zoom/100,layer.scale/100*clip.zoom/100);ctx.globalAlpha=layer.opacity/100;}
  record(index,rect){this.hitRects.push({index,matrix:this.ctx.getTransform(),rect});}
  ballet(clip,local,w,h,options){
    const frame=local/clip.duration*clip.layers.length,index=Math.min(clip.layers.length-1,Math.floor(frame)),layer=clip.layers[index];
    const t=frame%1,motion=clip.motion/100,p=ease(t,clip.easing),ctx=this.ctx,r=this.resources.get(layer.id);
    const background=clip.frameColors?layer.color:clip.background;ctx.fillStyle=background;ctx.fillRect(0,0,w,h);ctx.save();this.layerSetup(ctx,layer,clip,w,h);
    ctx.fillStyle=clip.autoInk?contrast(background):clip.ink;ctx.textAlign='center';ctx.textBaseline='middle';
    options.syncVideo?.(r.video,Math.max(0,local-layer.delay),clip.speed);
    if(r.media){ctx.rotate((p-.5)*.5*motion);const mw=w*.8,mh=h*.8;ctx.translate(-mw/2,-mh/2);drawMedia(ctx,r.media,mw,mh,layer.fit);this.record(index,[0,0,mw,mh]);}
    else{
      const text=layer.title.replace(/\n/g,' '),base=Math.min(w*.26,h*.28)*layer.fontSize/100;
      ctx.font=`italic 500 ${base}px ${fontFamily(clip.typeface)}`;
      const mode=index%3;
      if(mode===0){
        ctx.rotate((-1.1+p*1.8)*motion*clip.turns/100);ctx.translate(0,(.5-p)*h*.45*motion);ctx.scale(.8+Math.sin(p*Math.PI)*.5,.8+Math.sin(p*Math.PI)*.5);
        const size=ctx.measureText(text).width;ctx.fillText(text,0,0);this.record(index,[-size/2,-base*.65,size,base*1.3]);
      }else if(mode===1){
        const cellW=Math.min(w*.3,h*.3)*3/clip.repeat,cellH=base*.7*3/clip.repeat;
        ctx.rotate(Math.sin(p*Math.PI*2)*.12*motion*clip.turns/100);ctx.translate(0,(p-.5)*cellH*2*motion);
        const scale=Math.min(1,cellW*.9/Math.max(1,ctx.measureText(text).width));ctx.font=`italic 500 ${base*scale}px ${fontFamily(clip.typeface)}`;
        for(let y=-Math.ceil(h/cellH);y<=Math.ceil(h/cellH);y++)for(let x=-Math.ceil(w/cellW);x<=Math.ceil(w/cellW);x++){ctx.fillText(text,x*cellW+(y%2)*cellW/2,y*cellH);}
        this.record(index,[-w,-h,w*2,h*2]);
      }else{
        const letters=Array.from(text),radius=Math.min(w,h)*(.15+Math.sin(p*Math.PI)*.19)*clip.spread/100*(.65+clip.curvature/150);
        ctx.font=`italic 500 ${base*.68}px ${fontFamily(clip.typeface)}`;
        letters.forEach((letter,i)=>{ctx.save();const a=i/Math.max(letters.length,1)*Math.PI*2+p*Math.PI*2*motion*clip.turns/100;ctx.translate(Math.cos(a)*radius,Math.sin(a)*radius);ctx.rotate(a+Math.PI/2);ctx.fillText(letter,0,0);this.record(index,[-base*.35,-base*.5,base*.7,base]);ctx.restore();});
      }
    }
    ctx.restore();
  }
  pattern(clip,local,w,h,options){
    const ctx=this.ctx,phase=ease(local/clip.duration,clip.easing)*Math.PI*2*clip.turns/100,cellW=290/Math.max(1,clip.repeat/3),cellH=210/Math.max(1,clip.repeat/3);
    ctx.save();ctx.translate(w/2,h/2);ctx.rotate(Math.sin(phase)*.16*clip.motion/100+(clip.tiltX+clip.tiltY)*Math.PI/450);ctx.scale(clip.zoom/100,clip.zoom/100);
    const radius=Math.ceil(Math.hypot(w,h)/Math.min(cellW,cellH))+2;
    for(let y=-radius;y<=radius;y++){
      const index=((y%clip.layers.length)+clip.layers.length)%clip.layers.length,layer=clip.layers[index],resource=this.resources.get(layer.id);
      options.syncVideo?.(resource.video,Math.max(0,local-layer.delay),clip.speed);
      ctx.save();ctx.translate(layer.x,layer.y);ctx.rotate((layer.rotation+(clip.tiltX+clip.tiltY)*.4)*Math.PI/180);ctx.scale(layer.scale/100,layer.scale/100);ctx.globalAlpha=layer.opacity/100;
      ctx.fillStyle=clip.ink;ctx.textBaseline='middle';ctx.textAlign='center';ctx.font=`italic 500 ${150*layer.fontSize/100}px ${fontFamily(clip.typeface)}`;
      for(let x=-radius;x<=radius;x++){
        const xx=x*cellW+(y%2)*cellW/2+Math.sin(phase+y*.3)*cellW*.4*clip.motion/100*clip.curvature/100,yy=y*cellH+(phase/Math.PI/2%1)*cellH;
        if(resource.media){ctx.save();ctx.translate(xx-cellW*.43,yy-cellH*.42);drawMedia(ctx,resource.media,cellW*.86,cellH*.84,layer.fit);this.record(index,[0,0,cellW*.86,cellH*.84]);ctx.restore();}
        else{ctx.save();ctx.translate(xx,yy);ctx.scale(Math.min(1,cellW*.9/Math.max(1,ctx.measureText(layer.title).width)),1);ctx.fillText(layer.title,0,0);this.record(index,[-ctx.measureText(layer.title).width/2,-cellH*.4,ctx.measureText(layer.title).width,cellH*.8]);ctx.restore();}
      }
      ctx.restore();
    }
    ctx.restore();
  }
  pick(x,y){
    const p=new DOMPoint(x*this.canvas.width/this.canvas.clientWidth,y*this.canvas.height/this.canvas.clientHeight);
    for(const hit of [...this.hitRects].reverse()){const q=p.matrixTransform(hit.matrix.inverse()),[a,b,w,h]=hit.rect;if(q.x>=a&&q.x<=a+w&&q.y>=b&&q.y<=b+h)return hit.index;}
    return -1;
  }
  dragDelta(dx,dy){const s=1200/this.canvas.clientWidth;return[dx*s,dy*s];}
  dispose(){for(const r of this.resources.values())r.dispose();this.resources.clear();}
}
