import { icon } from './icons.js';
import { PRESETS, clamp, uid, newClip, newLayer, presetById, schedule, totalDuration, activeScenes, sceneGeometry, layerPose, cameraPose, parseProject } from './engine.js';

const $ = id => document.getElementById(id);
const firstClip = newClip();
let project = { version: 2, name: 'Мой motion-проект', width: 1920, height: 1080, clips: [firstClip], media: {} };
let selectedClipId = firstClip.id, selectedLayerId = firstClip.layers[0].id;
let currentTime = 1.6, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, looping = true;
let lastTick = null, timelineZoom = 1, filter = 'all', dirty = false, toastTimer;
let scenes = new Map();
const selectedClip = () => project.clips.find(c => c.id === selectedClipId) || project.clips[0];
const selectedLayer = () => selectedClip().layers.find(l => l.id === selectedLayerId) || selectedClip().layers[0];
const pxPerSecond = () => 62 * timelineZoom;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const timeLabel = t => `${pad(Math.floor(t / 60))}:${pad(Math.floor(t % 60))}.${pad(Math.floor((t % 1) * 100))}`;
const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : fallback;
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show'); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3800); }
function markChanged() { dirty = true; }
function clearScenes() { for (const scene of scenes.values()) scene.root.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); }); scenes.clear(); $('stage-scenes').replaceChildren(); }
function updateRange(input) { const value = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100; input.style.setProperty('--fill', `${value}%`); }
function setPlaying(value) {
  playing = value; lastTick = null;
  $('play').innerHTML = icon(playing ? 'pause' : 'play'); $('play').setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
  for (const scene of scenes.values()) for (const { video } of scene.layers) if (video && !playing) video.pause();
  renderAt();
}
function seek(time, pause = false) { currentTime = clamp(time, 0, totalDuration(project.clips)); if (pause) setPlaying(false); lastTick = null; renderAt(); }
function refreshScenes() { clearScenes(); renderAt(); }
function selectClip(id, moveHead = true) {
  selectedClipId = id; selectedLayerId = selectedClip().layers[0].id;
  if (moveHead) { const item = schedule(project.clips).find(s => s.clip.id === id); currentTime = item.start + Math.min(1.7 / item.clip.speed, item.duration * .5); setPlaying(false); }
  renderInspector(); renderTimeline(); renderAt();
  $('clip-track').querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function addClip(id, atIndex = project.clips.length) {
  if (project.clips.length >= 30) return toast('В проекте может быть до 30 клипов.');
  const clip = newClip(id); project.clips.splice(atIndex, 0, clip); markChanged(); selectClip(clip.id); toast(`${clip.name} — добавлен на таймлайн`);
}
function renderPresets() {
  $('presets').innerHTML = PRESETS.filter(p => filter === 'all' || p.category === filter).map(p => `<button class="preset" draggable="true" data-preset="${p.id}" title="Добавить «${p.name}» на таймлайн" aria-label="Добавить пресет ${p.name}"><div class="preset-thumb ${p.id}" style="--tile:${p.bg}"><div class="mini-group"><span class="mini-card" style="--i:-1">a</span><span class="mini-card" style="--i:0">f.</span><span class="mini-card" style="--i:1">${icon('arrow')}</span></div><span class="preset-plus">＋</span></div><strong>${p.name}</strong><small>${p.caption}</small></button>`).join('');
  $('presets').querySelectorAll('[data-preset]').forEach(button => {
    button.onclick = () => addClip(button.dataset.preset);
    button.ondragstart = event => { event.dataTransfer.setData('application/x-forma-preset', button.dataset.preset); event.dataTransfer.effectAllowed = 'copy'; };
  });
}
function renderTimeline() {
  const total = totalDuration(project.clips), px = pxPerSecond();
  const contentWidth = Math.max($('timeline-scroll').clientWidth, total * px + 80);
  $('timeline-content').style.width = `${contentWidth}px`;
  $('clip-track').style.width = `${Math.max(total * px, 30)}px`;
  $('ruler').style.width = `${contentWidth - 64}px`;
  const step = timelineZoom < .7 ? 2 : 1;
  const marks = [];
  for (let t = 0; t <= Math.ceil((contentWidth - 64) / px); t += step) marks.push(`<span class="ruler-mark" style="left:${t * px}px">${pad(Math.floor(t / 60))}:${pad(t % 60)}</span>`);
  $('ruler').innerHTML = marks.join('');
  $('clip-track').innerHTML = schedule(project.clips).map(({ clip, start, duration, index }) => `<button class="timeline-clip${clip.id === selectedClipId ? ' selected' : ''}" data-clip="${clip.id}" draggable="true" style="left:${start * px}px;width:${duration * px}px;--clip-color:${presetById(clip.presetId).color};${clip.id === selectedClipId ? '' : `z-index:${index + 1}`};" aria-label="Клип ${esc(clip.name)}" aria-pressed="${clip.id === selectedClipId}"><span class="timeline-clip-name">${esc(clip.name)}</span><span class="timeline-clip-info">${clip.layers.length} кадр. · ${duration.toFixed(1)} с · ${clip.speed}×</span><span class="trim-handle" data-trim="${clip.id}" title="Потяните, чтобы изменить длительность"></span></button>`).join('');
  $('clip-count').textContent = `${project.clips.length} клип${project.clips.length === 1 ? '' : project.clips.length < 5 ? 'а' : 'ов'}`;
  $('scrubber').max = total;
  $('remove-clip').disabled = project.clips.length === 1;
  $('duplicate-clip').disabled = project.clips.length >= 30;
  $('move-clip-left').disabled = project.clips[0].id === selectedClipId;
  $('move-clip-right').disabled = project.clips.at(-1).id === selectedClipId;
  $('zoom-value').textContent = `${Math.round(timelineZoom * 100)}%`;
  $('zoom-out').disabled = timelineZoom <= .4; $('zoom-in').disabled = timelineZoom >= 2;
  $('clip-track').querySelectorAll('[data-clip]').forEach(button => {
    button.onclick = () => selectClip(button.dataset.clip);
    button.ondragstart = event => {
      event.dataTransfer.setData('application/x-forma-clip', button.dataset.clip); event.dataTransfer.effectAllowed = 'move'; button.classList.add('is-dragging');
    };
    button.ondragend = () => { button.classList.remove('is-dragging'); $('clip-track').classList.remove('drag-over'); };
  });
  $('clip-track').querySelectorAll('[data-trim]').forEach(handle => handle.onpointerdown = startTrim);
  updatePlayhead();
}
function startTrim(event) {
  event.preventDefault(); event.stopPropagation();
  const clip = project.clips.find(c => c.id === event.target.dataset.trim);
  selectedClipId = clip.id; selectedLayerId = clip.layers[0].id; setPlaying(false);
  const initialX = event.clientX, duration = clip.duration;
  function move(e) {
    clip.duration = Math.round(clamp(duration + (e.clientX - initialX) / pxPerSecond() * clip.speed, 2, 30) * 10) / 10;
    currentTime = Math.min(currentTime, totalDuration(project.clips)); renderTimeline(); renderInspector(); renderAt();
  }
  function stop() { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); markChanged(); }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop, { once: true }); window.addEventListener('pointercancel', stop, { once: true });
}
function updatePlayhead() {
  const total = totalDuration(project.clips);
  if (playing) { const scroll = $('timeline-scroll'), x = 32 + currentTime * pxPerSecond(); if (x > scroll.scrollLeft + scroll.clientWidth - 35 || x < scroll.scrollLeft + 15) scroll.scrollLeft = Math.max(0, x - scroll.clientWidth * .25); }
  $('playhead').style.left = `${32 + currentTime * pxPerSecond()}px`;
  $('time-readout').innerHTML = `${timeLabel(currentTime)} <span>/ ${timeLabel(total)}</span>`;
  $('scrubber').value = currentTime; updateRange($('scrubber'));
}
function renderLayerList() {
  const clip = selectedClip();
  $('layer-count').textContent = `${clip.layers.length} / 8`;
  $('layer-list').innerHTML = clip.layers.map((layer, index) => {
    const media = project.media[layer.mediaId];
    const thumb = layer.kind === 'image' && media ? `<img class="layer-item-thumb" alt="" src="${esc(media.src)}">` : `<span class="layer-item-thumb" style="--layer-color:${layer.color}">${layer.kind === 'video' ? '▶' : esc(layer.title.slice(0, 1))}</span>`;
    return `<button class="layer-item${selectedLayerId === layer.id ? ' active' : ''}" data-layer="${layer.id}" aria-pressed="${selectedLayerId === layer.id}">${thumb}<span class="layer-item-copy"><strong>${esc(layer.name)}</strong><small>${{ design: 'Дизайн-карточка', text: 'Текст', image: 'Изображение', video: 'Видео · без звука' }[layer.kind]}</small></span><span class="layer-item-index">${pad(index + 1)}</span></button>`;
  }).join('');
  $('layer-list').querySelectorAll('[data-layer]').forEach(button => button.onclick = () => { selectedLayerId = button.dataset.layer; if (!activeScenes(project.clips, currentTime).some(s => s.clip.id === selectedClipId)) { const item = schedule(project.clips).find(s => s.clip.id === selectedClipId); currentTime = item.start + Math.min(1.7 / item.clip.speed, item.duration * .5); } setPlaying(false); renderLayerList(); renderLayerEditor(); renderAt(); });
  $('add-layer').disabled = clip.layers.length >= 8;
}
function renderLayerEditor() {
  const layer = selectedLayer(), clip = selectedClip();
  $('selected-layer-label').textContent = layer.name;
  $('layer-kind').value = layer.kind; $('layer-name').value = layer.name;
  $('layer-title').value = layer.title; $('layer-subtitle').value = layer.subtitle;
  $('layer-color').value = layer.color; $('media-fit').value = layer.fit;
  $('text-fields').hidden = ['image', 'video'].includes(layer.kind); $('media-fields').hidden = !['image', 'video'].includes(layer.kind);
  for (const key of ['x', 'y', 'z', 'rotation', 'scale', 'opacity', 'delay', 'fontSize']) {
    $(`layer-${key}`).value = layer[key];
    if (['scale', 'opacity', 'fontSize'].includes(key)) { $(`layer-${key}-value`).textContent = `${layer[key]}%`; updateRange($(`layer-${key}`)); }
  }
  const index = clip.layers.indexOf(layer);
  $('layer-up').disabled = index === 0; $('layer-down').disabled = index === clip.layers.length - 1;
  $('remove-layer').disabled = clip.layers.length === 1; $('duplicate-layer').disabled = clip.layers.length >= 8;
}
const clipSliders = { speed: ['speed', '×'], depth: ['depth', ''], spread: ['spread', '%'], tiltX: ['tiltX', '°'], tiltY: ['tiltY', '°'], 'zoom-clip': ['zoom', '%'], motion: ['motion', '%'], stagger: ['stagger', ' с'], light: ['light', '%'], lightAngle: ['lightAngle', '°'], shadow: ['shadow', '%'], softness: ['softness', '%'] };
function renderInspector() {
  const clip = selectedClip();
  $('clip-name').value = clip.name; $('duration').value = clip.duration; $('easing').value = clip.easing;
  $('background').value = clip.background; $('background-value').textContent = clip.background;
  for (const [id, [key, unit]] of Object.entries(clipSliders)) {
    $(id).value = clip[key]; $(`${id}-value`).textContent = `${clip[key]}${unit}`; updateRange($(id));
  }
  renderLayerList(); renderLayerEditor();
}
function makeScene(clip) {
  const geometry = sceneGeometry(project.width, project.height, clip.presetId);
  const root = document.createElement('div'); root.className = 'scene'; root.dataset.scene = clip.id;
  root.style.setProperty('--scene-bg', clip.background);
  const wash = document.createElement('div'); wash.className = 'lightwash'; root.append(wash);
  const space = document.createElement('div'); space.className = 'scene-space'; space.style.width = `${geometry.width}px`; space.style.height = `${geometry.height}px`; root.append(space);
  const camera = document.createElement('div'); camera.className = 'camera'; space.append(camera);
  const layers = clip.layers.map((layer, index) => {
    const shadow = document.createElement('div'); shadow.className = 'floor-shadow'; space.insertBefore(shadow, camera);
    const node = document.createElement('div'); node.className = `render-layer${clip.presetId === 'device' ? ' device-layer' : ''}`;
    node.dataset.frame = layer.id; node.style.width = `${geometry.cardWidth}px`; node.style.height = `${geometry.cardHeight}px`;
    node.style.marginLeft = `${-geometry.cardWidth / 2}px`; node.style.marginTop = `${-geometry.cardHeight / 2}px`;
    node.style.setProperty('--card-color', layer.color); const measure = document.createElement('canvas').getContext('2d'); measure.font = '650 100px Arial';
    const longestLine = Math.max(1, ...layer.title.split('\n').map(line => measure.measureText(line).width));
    const titleSize = Math.min(geometry.cardWidth * .232, geometry.cardWidth * .85 / longestLine * 100) * layer.fontSize / 100;
    node.style.setProperty('--title-size', `${titleSize}px`);
    node.innerHTML = '<div class="layer-back"></div><div class="layer-face"></div><div class="layer-gloss"></div>';
    const face = node.querySelector('.layer-face'), gloss = node.querySelector('.layer-gloss');
    let video = null;
    if (['image', 'video'].includes(layer.kind)) {
      const asset = project.media[layer.mediaId];
      const media = document.createElement(layer.kind === 'video' ? 'video' : 'img'); media.className = 'media-face'; media.style.objectFit = layer.fit;
      if (asset) media.src = asset.src;
      if (layer.kind === 'image') media.alt = layer.name;
      else { video = media; video.muted = true; video.playsInline = true; video.preload = 'auto'; }
      media.onerror = () => { if (!media.dataset.errorShown) { media.dataset.errorShown = 'true'; toast(`Браузер не может открыть файл «${asset?.name || layer.name}». Замените его.`); } };
      face.append(media);
    } else {
      const textColor = readableColor(layer.color);
      face.innerHTML = `<div class="design-face${layer.kind === 'text' ? ' text-only' : ''}" style="color:${textColor}"><div class="design-top">${esc(layer.subtitle)}<span>${icon('arrow')}</span></div><div class="design-orb"></div><div class="design-title">${esc(layer.title)}</div><div class="design-footer"><div>A little motion.<br>A different perspective.<div class="design-index">STUDY ${pad(index + 1)} / FORMA</div></div><b>✳</b></div></div>`;
    }
    if (clip.presetId === 'device') { const notch = document.createElement('div'); notch.className = 'device-notch'; node.append(notch); }
    node.onclick = () => { if (selectedClipId !== clip.id) selectedClipId = clip.id; selectedLayerId = layer.id; setPlaying(false); renderInspector(); renderTimeline(); renderAt(); };
    camera.append(node);
    return { layerId: layer.id, node, face, gloss, shadow, video };
  });
  $('stage-scenes').append(root);
  return { root, wash, space, camera, layers, geometry };
}
function readableColor(color) {
  const rgb = color.slice(1).match(/.{2}/g).map(h => parseInt(h, 16));
  return rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 135 ? '#263020' : '#f4eee6';
}
function renderAt() {
  const active = activeScenes(project.clips, currentTime);
  const activeIds = new Set(active.map(s => s.clip.id));
  for (const [id, scene] of scenes) if (!activeIds.has(id)) { scene.layers.forEach(l => l.video?.pause()); scene.root.remove(); scenes.delete(id); }
  active.forEach((item, activeIndex) => {
    const { clip, local, alpha } = item;
    let scene = scenes.get(clip.id); if (!scene) { scene = makeScene(clip); scenes.set(clip.id, scene); }
    scene.root.style.zIndex = String(item.index);
    scene.root.style.opacity = active.length > 1 && activeIndex === 0 ? '1' : String(alpha);
    scene.root.style.setProperty('--scene-bg', clip.background);
    const lightX = 50 + Math.sin(clip.lightAngle * Math.PI / 180) * 45;
    scene.wash.style.setProperty('--light-x', `${lightX}%`); scene.wash.style.opacity = String(clip.light / 100);
    scene.space.style.transform = `scale(${$('stage').clientWidth / scene.geometry.width})`;
    const camera = cameraPose(clip, local);
    scene.camera.style.transform = `rotateX(${camera.rx}deg) rotateY(${camera.ry}deg) scale3d(${camera.zoom},${camera.zoom},${camera.zoom})`;
    scene.layers.forEach((view, index) => {
      const layer = clip.layers[index], pose = layerPose(clip, layer, index, local, scene.geometry);
      view.node.style.transform = `translate3d(${pose.x}px,${pose.y}px,${pose.z}px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale3d(${pose.scale},${pose.scale},${pose.scale})`;
      // Opacity on the face preserves the card's 3D back and thickness.
      view.face.style.opacity = String(pose.opacity); view.node.querySelector('.layer-back').style.opacity = String(pose.opacity);
      view.node.classList.toggle('is-selected', clip.id === selectedClipId && layer.id === selectedLayerId && !playing);
      view.node.style.pointerEvents = pose.opacity < .1 ? 'none' : 'auto';
      const ambient = clip.shadow / 100;
      view.face.style.boxShadow = `${(pose.ry + camera.ry) * -.3}px ${8 + Math.abs(pose.z) * .035}px ${15 + clip.softness * .28}px rgba(23,16,31,${ambient * .4}), 0 0 0 1px rgba(255,255,255,.25)`;
      view.gloss.style.opacity = String(clip.light / 100 * pose.opacity * (.3 + Math.abs(Math.sin((pose.ry + camera.ry + clip.lightAngle) * Math.PI / 180)) * .55));
      view.gloss.style.setProperty('--gloss-angle', `${120 + pose.ry * 1.5 + camera.ry + clip.lightAngle}deg`);
      view.gloss.style.backgroundPosition = `${50 + Math.sin(local * .55 + index) * 30}% 50%`;
      const shadowWidth = scene.geometry.cardWidth * pose.scale * 1.15;
      const shadowHeight = scene.geometry.cardHeight * pose.scale * .14;
      view.shadow.style.width = `${shadowWidth}px`; view.shadow.style.height = `${shadowHeight}px`;
      view.shadow.style.marginLeft = `${-shadowWidth / 2}px`; view.shadow.style.marginTop = `${-shadowHeight / 2}px`;
      view.shadow.style.transform = `translate(${pose.x + (lightX - 50) * -1.2}px,${pose.y * .15 + pose.z * .07}px) rotate(${pose.rz * .25}deg) scale(${1 + Math.max(0, pose.z) / 700})`;
      view.shadow.style.opacity = String(ambient * .23 * pose.opacity / (1 + Math.abs(pose.z) / 400)); view.shadow.style.filter = `blur(${7 + clip.softness * .35 + Math.abs(pose.z) * .035}px)`;
      syncVideo(view.video, local, clip.speed);
    });
  });
  const main = active.at(-1);
  $('scene-name').textContent = main?.clip.name || '';
  updatePlayhead();
}
function syncVideo(video, local, speed) {
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
  const target = local % video.duration;
  video.playbackRate = speed;
  if (Math.abs(video.currentTime - target) > (playing ? .2 : .025)) video.currentTime = target;
  if (playing && video.paused && !video.dataset.playFailed) video.play().catch(() => { video.dataset.playFailed = 'true'; toast('Не удалось воспроизвести видео. Попробуйте MP4 или WebM.'); });
  if (!playing && !video.paused) video.pause();
}
function fitStage() {
  const viewer = $('viewer'), style = getComputedStyle(viewer);
  const width = viewer.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = viewer.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const ratio = project.width / project.height;
  const fittedWidth = Math.max(30, Math.min(width, height * ratio));
  $('stage').style.width = `${fittedWidth}px`; $('stage').style.height = `${fittedWidth / ratio}px`;
  $('fit-value').textContent = `${Math.round(fittedWidth / project.width * 100)}%`;
  renderAt();
}
function tick(timestamp) {
  if (playing && lastTick !== null) {
    // Wall-clock time is the source of truth, including slow rendering and background tabs.
    currentTime += (timestamp - lastTick) / 1000;
    const total = totalDuration(project.clips);
    if (currentTime >= total) {
      if (looping) currentTime %= total;
      else { currentTime = total; setPlaying(false); }
    }
  }
  lastTick = timestamp;
  renderAt(); requestAnimationFrame(tick);
}
function addLayer(layer = newLayer(selectedClip().layers.length)) {
  const clip = selectedClip(); if (clip.layers.length >= 8) return toast('До 8 кадров в одном пресете. Добавьте ещё один клип.');
  clip.layers.push(layer); selectedLayerId = layer.id; markChanged(); setPlaying(false); refreshScenes(); renderInspector(); renderTimeline();
}
function moveLayer(direction) {
  const layers = selectedClip().layers, index = layers.findIndex(l => l.id === selectedLayerId), target = index + direction;
  if (target < 0 || target >= layers.length) return;
  [layers[index], layers[target]] = [layers[target], layers[index]]; markChanged(); refreshScenes(); renderInspector();
}
function moveClip(direction) {
  const index = project.clips.findIndex(c => c.id === selectedClipId), target = index + direction;
  if (target < 0 || target >= project.clips.length) return;
  [project.clips[index], project.clips[target]] = [project.clips[target], project.clips[index]]; markChanged(); selectClip(selectedClipId);
}
function renderMedia() {
  const assets = Object.values(project.media); $('media-count').textContent = assets.length; $('media-empty').hidden = assets.length > 0;
  $('media-grid').innerHTML = '';
  assets.forEach(asset => {
    const button = document.createElement('button'); button.className = 'media-item'; button.title = `Добавить «${asset.name}» в выбранный клип`;
    const thumbnail = document.createElement(asset.kind === 'video' ? 'video' : 'img'); thumbnail.src = asset.src;
    if (asset.kind === 'video') { thumbnail.muted = true; thumbnail.preload = 'metadata'; } else thumbnail.alt = '';
    const label = document.createElement('span'); label.textContent = asset.name; button.append(thumbnail, label);
    button.onclick = () => { const layer = newLayer(selectedClip().layers.length); layer.kind = asset.kind; layer.mediaId = asset.id; layer.name = asset.name; addLayer(layer); };
    $('media-grid').append(button);
  });
}
function readDataURL(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Не удалось прочитать файл.')); reader.readAsDataURL(file); }); }
async function validateMedia(asset) {
  await new Promise((resolve, reject) => {
    const element = document.createElement(asset.kind === 'image' ? 'img' : 'video');
    const timer = setTimeout(() => done(new Error('Браузер не смог открыть файл за 15 секунд.')), 15000);
    function done(error) { clearTimeout(timer); element.removeAttribute('src'); element.onload = element.onloadedmetadata = element.onerror = null; error ? reject(error) : resolve(); }
    element.onload = element.onloadedmetadata = () => done(); element.onerror = () => done(new Error('Этот формат не поддерживается браузером.'));
    if (asset.kind === 'video') { element.muted = true; element.preload = 'metadata'; }
    element.src = asset.src;
  });
}
async function importMedia(files, replace = false) {
  const clipId = selectedClipId, layerId = selectedLayerId;
  setPlaying(false);
  let added = 0;
  for (const file of Array.from(files)) {
    if (!/^(image|video)\//.test(file.type)) { toast(`«${file.name}»: нужен файл изображения или видео.`); continue; }
    if (file.size > 30 * 1024 * 1024) { toast(`«${file.name}»: максимальный размер — 30 МБ.`); continue; }
    if (Object.values(project.media).reduce((sum, m) => sum + m.src.length, 0) + file.size * 4 / 3 > 100 * 1024 * 1024) { toast('В библиотеке уже 100 МБ. Сохраните проект и начните новый.'); break; }
    if (Object.keys(project.media).length >= 240) { toast('В библиотеке уже 240 файлов.'); break; }
    try {
      const asset = { id: uid(), name: file.name, kind: file.type.startsWith('image/') ? 'image' : 'video', src: await readDataURL(file) };
      await validateMedia(asset);
      project.media[asset.id] = asset;
      // Preserve the import target even if selection changes while decoding media.
      const clip = project.clips.find(c => c.id === clipId);
      if (replace) {
        const layer = clip?.layers.find(l => l.id === layerId);
        if (layer) { layer.kind = asset.kind; layer.mediaId = asset.id; layer.name = asset.name; }
      } else if (clip && clip.layers.length < 8) {
        const layer = newLayer(clip.layers.length); layer.kind = asset.kind; layer.mediaId = asset.id; layer.name = asset.name; clip.layers.push(layer);
        if (selectedClipId === clipId) selectedLayerId = layer.id;
      }
      added++; markChanged();
    } catch (error) { toast(`${file.name}: ${error.message}`); }
    if (replace) break;
  }
  if (added) { renderMedia(); refreshScenes(); renderInspector(); renderTimeline(); toast(`${added} файл. добавлено${!replace && selectedClip().layers.length >= 8 ? ' · в сцене до 8 кадров, остальные — в «Моих файлах»' : ''}`); }
}
function saveProject() {
  project.name = $('project-name').value.trim() || 'Мой motion-проект';
  const usedIds = new Set(project.clips.flatMap(c => c.layers.map(l => l.mediaId)).filter(Boolean));
  const media = Object.fromEntries(Object.entries(project.media).filter(([id]) => usedIds.has(id)));
  const blob = new Blob([JSON.stringify({ ...project, media }, null, 2)], { type: 'application/json' });
  if (blob.size > 150 * 1024 * 1024) return toast('Проект превышает 150 МБ. Удалите несколько медиакадров перед сохранением.');
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `${project.name.replace(/[^a-zа-яё0-9 _-]/gi, '').slice(0, 60) || 'forma-project'}.forma.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); dirty = false;
  toast('Проект сохранён вместе с кадрами и медиафайлами.');
}
async function openProject(file) {
  if (!file) return;
  if (file.size > 150 * 1024 * 1024) return toast('Максимальный размер проекта — 150 МБ.');
  try {
    const next = parseProject(JSON.parse(await file.text()));
    if (dirty && !window.confirm('Открыть другой проект? Несохранённые изменения текущего проекта будут потеряны.')) return;
    setPlaying(false); clearScenes(); project = next; currentTime = 0; selectedClipId = next.clips[0].id; selectedLayerId = next.clips[0].layers[0].id;
    dirty = false; $('project-name').value = project.name; syncComposition(); renderInspector(); renderTimeline(); renderMedia(); fitStage(); toast('Проект открыт. Все настройки и медиа восстановлены.');
  } catch (error) { toast(error instanceof SyntaxError ? 'Не удалось прочитать JSON проекта.' : error.message); }
}
function syncComposition() {
  $('width').value = project.width; $('height').value = project.height;
  const value = ['16:9', '1:1', '4:5', '9:16'].find(r => { const [w, h] = r.split(':').map(Number); return Math.abs(w / h - project.width / project.height) < .002; });
  $('ratio').value = value || 'custom';
}
function wireEvents() {
  document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button)); renderPresets(); });
  function libraryTab(media) { $('preset-library').hidden = media; $('media-library').hidden = !media; $('presets-tab').classList.toggle('active', !media); $('media-tab').classList.toggle('active', media); $('presets-tab').setAttribute('aria-selected', String(!media)); $('media-tab').setAttribute('aria-selected', String(media)); }
  $('presets-tab').onclick = () => libraryTab(false); $('media-tab').onclick = () => libraryTab(true);
  $('play').onclick = () => { if (!playing && currentTime >= totalDuration(project.clips)) currentTime = 0; setPlaying(!playing); };
  $('restart').onclick = () => seek(0);
  $('previous').onclick = () => { const items = schedule(project.clips); const prev = items.filter(s => s.start < currentTime - .1).at(-1); seek(prev?.start || 0); };
  $('next').onclick = () => { const next = schedule(project.clips).find(s => s.start > currentTime + .1); seek(next?.start ?? totalDuration(project.clips)); };
  $('loop').onclick = () => { looping = !looping; $('loop').classList.toggle('active', looping); $('loop').setAttribute('aria-pressed', String(looping)); };
  $('scrubber').oninput = e => seek(Number(e.target.value), true);
  $('ruler').onpointerdown = event => {
    const ruler = $('ruler'); setPlaying(false);
    const scrub = e => seek((e.clientX - ruler.getBoundingClientRect().left) / pxPerSecond());
    scrub(event);
    const done = () => { window.removeEventListener('pointermove', scrub); window.removeEventListener('pointerup', done); window.removeEventListener('pointercancel', done); };
    window.addEventListener('pointermove', scrub); window.addEventListener('pointerup', done, { once: true }); window.addEventListener('pointercancel', done, { once: true });
  };
  $('zoom-in').onclick = () => { timelineZoom = Math.min(2, Math.round((timelineZoom + .2) * 10) / 10); renderTimeline(); };
  $('zoom-out').onclick = () => { timelineZoom = Math.max(.4, Math.round((timelineZoom - .2) * 10) / 10); renderTimeline(); };
  $('duplicate-clip').onclick = () => {
    if (project.clips.length >= 30) return;
    const source = selectedClip(), copy = structuredClone(source); copy.id = uid(); copy.name = `${source.name} — копия`.slice(0, 60); copy.layers.forEach(l => l.id = uid());
    project.clips.splice(project.clips.indexOf(source) + 1, 0, copy); markChanged(); selectClip(copy.id);
  };
  $('remove-clip').onclick = () => {
    if (project.clips.length <= 1) return;
    const index = project.clips.findIndex(c => c.id === selectedClipId); project.clips.splice(index, 1); markChanged(); selectClip(project.clips[Math.min(index, project.clips.length - 1)].id);
  };
  $('move-clip-left').onclick = () => moveClip(-1); $('move-clip-right').onclick = () => moveClip(1);
  const track = $('clip-track');
  track.ondragover = event => { if (Array.from(event.dataTransfer.types).some(t => t.startsWith('application/x-forma-'))) { event.preventDefault(); track.classList.add('drag-over'); } };
  track.ondragleave = event => { if (!track.contains(event.relatedTarget)) track.classList.remove('drag-over'); };
  track.ondrop = event => {
    event.preventDefault(); event.stopPropagation(); track.classList.remove('drag-over');
    const preset = event.dataTransfer.getData('application/x-forma-preset'), clipId = event.dataTransfer.getData('application/x-forma-clip');
    const time = (event.clientX - track.getBoundingClientRect().left) / pxPerSecond();
    let target = schedule(project.clips).findIndex(s => time < s.start + s.duration / 2); if (target < 0) target = project.clips.length;
    if (preset && PRESETS.some(p => p.id === preset)) addClip(preset, target);
    else if (clipId) {
      const from = project.clips.findIndex(c => c.id === clipId); if (from < 0) return;
      const [clip] = project.clips.splice(from, 1); if (from < target) target--; project.clips.splice(target, 0, clip); markChanged(); selectClip(clipId);
    }
  };
  // The full timeline accepts a drop; stop propagation in the shared handler to add once.
  $('timeline-content').ondragover = event => { if (Array.from(event.dataTransfer.types).some(t => t.startsWith('application/x-forma-'))) event.preventDefault(); };
  $('timeline-content').ondrop = track.ondrop;
  $('timeline-scroll').addEventListener('dragover', event => {
    if (!Array.from(event.dataTransfer.types).some(t => t.startsWith('application/x-forma-'))) return;
    const scroll = $('timeline-scroll'), bounds = scroll.getBoundingClientRect();
    if (event.clientX < bounds.left + 45) scroll.scrollLeft -= 12;
    if (event.clientX > bounds.right - 45) scroll.scrollLeft += 12;
  });
  $('project-name').oninput = () => { project.name = $('project-name').value; markChanged(); };
  $('clip-name').oninput = () => { selectedClip().name = $('clip-name').value; markChanged(); renderTimeline(); renderAt(); };
  $('duration').onchange = () => { const clip = selectedClip(); clip.duration = number($('duration').value, clip.duration, 2, 30); $('duration').value = clip.duration; currentTime = Math.min(currentTime, totalDuration(project.clips)); markChanged(); renderTimeline(); renderAt(); };
  $('easing').onchange = () => { selectedClip().easing = $('easing').value; markChanged(); renderAt(); };
  $('background').oninput = () => { selectedClip().background = $('background').value; $('background-value').textContent = $('background').value; markChanged(); renderAt(); };
  for (const [id, [key, unit]] of Object.entries(clipSliders)) $(id).oninput = () => {
    const clip = selectedClip(), item = schedule(project.clips).find(s => s.clip.id === clip.id), oldSpeed = clip.speed;
    clip[key] = Number($(id).value); $(`${id}-value`).textContent = `${clip[key]}${unit}`; updateRange($(id)); markChanged();
    if (key === 'speed') { if (currentTime >= item.start && currentTime < item.end) currentTime = item.start + (currentTime - item.start) * oldSpeed / clip.speed; currentTime = Math.min(currentTime, totalDuration(project.clips)); renderTimeline(); }
    renderAt();
  };
  $('reset-motion').onclick = () => { const clip = selectedClip(), defaults = newClip(clip.presetId); for (const key of [...Object.values(clipSliders).map(v => v[0]), 'easing']) clip[key] = defaults[key]; currentTime = Math.min(currentTime, totalDuration(project.clips)); markChanged(); renderInspector(); renderTimeline(); renderAt(); toast('Движение сброшено. Кадры и их настройки сохранены.'); };
  $('add-layer').onclick = () => addLayer();
  $('duplicate-layer').onclick = () => { const layer = structuredClone(selectedLayer()); layer.id = uid(); layer.name = `${layer.name} — копия`.slice(0, 60); addLayer(layer); };
  $('remove-layer').onclick = () => { const clip = selectedClip(); if (clip.layers.length <= 1) return; const index = clip.layers.findIndex(l => l.id === selectedLayerId); clip.layers.splice(index, 1); selectedLayerId = clip.layers[Math.min(index, clip.layers.length - 1)].id; markChanged(); refreshScenes(); renderInspector(); renderTimeline(); };
  $('layer-up').onclick = () => moveLayer(-1); $('layer-down').onclick = () => moveLayer(1);
  $('layer-kind').onchange = () => { const kind = $('layer-kind').value; if (!['design', 'text'].includes(kind)) return; selectedLayer().kind = kind; markChanged(); refreshScenes(); renderLayerList(); renderLayerEditor(); };
  for (const key of ['name', 'title', 'subtitle', 'color']) $(`layer-${key}`).oninput = () => {
    const layer = selectedLayer(); layer[key] = $(`layer-${key}`).value; markChanged(); refreshScenes();
    if (key === 'name' || key === 'title' || key === 'color') { renderLayerList(); $('selected-layer-label').textContent = layer.name; }
  };
  $('media-fit').onchange = () => { selectedLayer().fit = $('media-fit').value; markChanged(); refreshScenes(); };
  for (const key of ['x', 'y', 'z', 'rotation', 'scale', 'opacity', 'delay', 'fontSize']) {
    const input = $(`layer-${key}`);
    input.addEventListener(input.type === 'range' ? 'input' : 'change', () => {
      const layer = selectedLayer(); layer[key] = number(input.value, layer[key], Number(input.min), Number(input.max)); input.value = layer[key];
      if (input.type === 'range') { $(`layer-${key}-value`).textContent = `${layer[key]}%`; updateRange(input); }
      markChanged(); if (key === 'fontSize') refreshScenes(); else renderAt();
    });
  }
  $('media-file').onchange = async event => { await importMedia(event.target.files); event.target.value = ''; };
  $('replace-file').onchange = async event => { await importMedia(event.target.files, true); event.target.value = ''; };
  const drop = $('library-drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag'); }; drop.ondragleave = () => drop.classList.remove('drag');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('drag'); importMedia(e.dataTransfer.files); };
  $('viewer').ondragover = e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); };
  $('viewer').ondrop = e => { if (e.dataTransfer.files.length) { e.preventDefault(); importMedia(e.dataTransfer.files); } };
  $('save-project').onclick = saveProject;
  $('open-project').onclick = () => $('project-file').click();
  $('project-file').onchange = async e => { await openProject(e.target.files[0]); e.target.value = ''; };
  for (const id of ['width', 'height']) $(id).onchange = () => { project[id] = Math.round(number($(id).value, project[id], 100, 7680)); markChanged(); syncComposition(); clearScenes(); fitStage(); };
  $('ratio').onchange = () => { if ($('ratio').value === 'custom') return; const [w, h] = $('ratio').value.split(':').map(Number); project.width = w < h ? 1080 : 1920; project.height = Math.round(project.width * h / w); markChanged(); syncComposition(); clearScenes(); fitStage(); };
  $('fit-stage').onclick = fitStage;
  new ResizeObserver(() => { fitStage(); renderTimeline(); }).observe($('viewer'));
  $('inspector-scroll').addEventListener('focusin', event => { if (!event.target.matches('input,select,textarea')) return; if (!activeScenes(project.clips, currentTime).some(s => s.clip.id === selectedClipId)) { const item = schedule(project.clips).find(s => s.clip.id === selectedClipId); seek(item.start + Math.min(1.7 / item.clip.speed, item.duration * .5), true); } });
  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveProject(); return; }
    const target = event.target;
    if (target instanceof Element && (target.isContentEditable || target.closest('input,textarea,select,[role="textbox"]'))) return;
    if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) $('play').click(); }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !event.metaKey && !event.ctrlKey) { event.preventDefault(); $('remove-clip').click(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); seek(currentTime + (event.shiftKey ? 1 : 1 / 30), true); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek(currentTime - (event.shiftKey ? 1 : 1 / 30), true); }
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
}
for (const [id, name] of Object.entries({restart:'restart',previous:'previous',next:'next',loop:'loop','duplicate-clip':'copy','remove-clip':'remove'})) {
  const button = $(id), label = button.querySelector('span');
  button.innerHTML = icon(name) + (label ? label.outerHTML : '');
}
$('open-project').innerHTML = icon('upload') + '<span>Открыть</span>';
$('save-project').innerHTML = icon('download') + '<span>Сохранить проект</span>';
$('fit-stage').innerHTML = icon('fit') + '<span id="fit-value">Вписать</span>';
for (const label of document.querySelectorAll('label[for="media-file"].button, .replace-button')) label.innerHTML = icon('upload') + (label.classList.contains('replace-button') ? 'Заменить файл' : 'Загрузить');
wireEvents(); renderPresets(); renderInspector(); renderTimeline(); renderMedia(); syncComposition(); fitStage(); setPlaying(playing); requestAnimationFrame(tick);
