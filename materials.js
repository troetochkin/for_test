export function fontFamily(face) {
  return { serif: '"Forma Serif", Georgia, "Times New Roman", serif', sans: 'Arial, sans-serif', condensed: '"Forma Anton", Arial, sans-serif', mono: 'monospace' }[face] || 'Arial, sans-serif';
}
export function drawMedia(ctx, media, width, height, fit = 'cover') {
  const sw = media.videoWidth || media.naturalWidth, sh = media.videoHeight || media.naturalHeight;
  if (!sw || !sh) return false;
  const scale = fit === 'contain' ? Math.min(width / sw, height / sh) : Math.max(width / sw, height / sh);
  ctx.drawImage(media, (width - sw * scale) / 2, (height - sh * scale) / 2, sw * scale, sh * scale);
  return true;
}
export function contrast(color) {
  const rgb = color.slice(1).match(/../g)?.map(h => parseInt(h, 16)) || [255,255,255];
  return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114 > 135 ? '#111113' : '#faf8f1';
}
export class LayerMaterial {
  constructor(layer, asset, onError) {
    this.id = layer.id; this.canvas = document.createElement('canvas'); this.canvas.width = 1024; this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d'); this.signature = ''; this.revision = 0; this.video = null; this.media = null; this.assetId = null;
    this.setAsset(layer, asset, onError);
  }
  setAsset(layer, asset, onError) {
    if (asset?.id === this.assetId && this.media) return;
    if (!asset && !this.media) return;
    this.revision++;
    this.releaseMedia(); this.assetId = asset?.id || null;
    if (!asset) return;
    this.media = document.createElement(asset.kind === 'video' ? 'video' : 'img');
    this.media.src = asset.src;
    if (asset.kind === 'video') { this.video = this.media; this.video.muted = true; this.video.playsInline = true; this.video.preload = 'auto'; }
    this.media.onerror = () => onError?.(`Не удалось открыть «${asset.name}». Замените файл.`);
    this.media.onload = this.media.onloadedmetadata = this.media.onloadeddata = this.media.onseeked = () => { this.signature = ''; this.revision++; };
  }
  update(layer, clip, index) {
    const signature = JSON.stringify([layer.kind,layer.title,layer.color,layer.fontSize,layer.fit,clip.typeface,clip.repeat,clip.ink,clip.presetId,index]);
    if (signature === this.signature && !this.video) return false;
    this.signature = signature;
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.fillStyle = layer.color; ctx.fillRect(0,0,w,h);
    if (this.media) { drawMedia(ctx,this.media,w,h,layer.fit); return true; }
    const isTunnel = clip.presetId === 'type-tunnel', isSphere = clip.presetId === 'liquid-sphere';
    const small = clip.presetId === 'type-rings' && (index === 0 || index === 2);
    const family = small ? 'Arial, sans-serif' : fontFamily(clip.typeface);
    const lines = layer.title.split('\n').filter(Boolean); if (!lines.length) return true;
    const rows = isTunnel ? Math.max(1,Math.round(clip.repeat)) : clip.presetId === 'type-cloth' ? 2 : lines.length;
    const columns = isTunnel ? 1 : clip.presetId === 'helix' ? Math.max(1,Math.round(clip.repeat/3)) : Math.max(1,Math.round(clip.repeat));
    ctx.fillStyle = clip.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (let row = 0; row < rows; row++) {
      const text = lines[row % lines.length], fontSize = (small ? 80 : h / Math.max(rows,1) * .88) * layer.fontSize / 100;
      ctx.font = `${clip.typeface === 'serif' ? 'italic 500' : small ? '400' : '900'} ${fontSize}px ${family}`;
      const measured = Math.max(1,ctx.measureText(text).width);
      const cell = w / columns;
      for (let col = 0; col < columns; col++) {
        ctx.save(); ctx.translate((col+.5)*cell,(row+.5)*h/rows);
        // Horizontal compression keeps a tall, poster-like typeface on a narrow ribbon.
        ctx.scale(Math.min(1,(cell-(isSphere?14:28))/measured),1); ctx.fillText(text,0,0); ctx.restore();
      }
    }
    return true;
  }
  releaseMedia() {
    if (this.media) { this.media.onerror = this.media.onload = this.media.onloadedmetadata = this.media.onloadeddata = this.media.onseeked = null; this.video?.pause(); this.media.removeAttribute('src'); this.video?.load(); }
    this.media = this.video = null;
  }
  dispose() { this.releaseMedia(); }
}
