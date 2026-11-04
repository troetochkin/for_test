const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');
const {openCardFixture}=require('./browser-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1512,height:982}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(process.env.FORMA_TEST_URL||'http://localhost:3000',{waitUntil:'networkidle'});
 assert.ok((await page.title()).includes('Forma 3'));assert.equal(await page.locator('.preset').count(),13);assert.equal(await page.locator('.renderer-error').count(),0);
 assert.ok(await page.evaluate(()=>document.fonts.check('20px "Forma Anton"')));
 await page.locator('#play').click();await page.locator('#scrubber').fill('2');
 const canvas=page.locator('.spatial-canvas');const pixels=()=>canvas.evaluate(c=>c.toDataURL());
 const still=await pixels();await page.waitForTimeout(150);assert.equal(await pixels(),still,'paused mesh stays still');
 await canvas.focus();await page.keyboard.press('Space');await page.waitForTimeout(200);await page.keyboard.press('Space');assert.notEqual(await pixels(),still,'space advances a real curved surface');
 // GPU picking chooses the surface under the pointer; pointer capture supports direct dragging.
 let box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.42);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+45,box.y+box.height*.42+18,{steps:6});await page.mouse.up();
 assert.ok(Number(await page.locator('#layer-x').inputValue())>0,'surface drag changes selected layer coordinates');
 await canvas.focus();await page.keyboard.press('Control+z');assert.equal(await page.locator('#layer-x').inputValue(),'0');
 // Sidebar drag changes order, not the clip count, and keyboard deletion targets a frame.
 const firstId=await page.locator('.layer-row').first().getAttribute('data-layer-row');
 await page.locator('.layer-row').first().dragTo(page.locator('.layer-row').last(),{targetPosition:{x:40,y:46}});
 assert.equal(await page.locator('.layer-row').last().getAttribute('data-layer-row'),firstId);
 await page.locator('.layer-item').last().click();await page.keyboard.press('Delete');assert.equal(await page.locator('.layer-row').count(),5);assert.equal(await page.locator('.timeline-clip').count(),1);
 await page.locator('#layer-title').focus();await page.keyboard.press('Delete');assert.equal(await page.locator('.layer-row').count(),5,'Delete in a text field does not delete a layer');
 await page.locator('[data-preset="orbit"]').click();await page.locator('#clip-name').fill('Keep this clip');await page.locator('#undo-card').click();assert.equal(await page.locator('.timeline-clip').count(),2,'undo of a frame does not remove another clip');assert.equal(await page.locator('.timeline-clip-name').last().textContent(),'Keep this clip');assert.equal(await page.locator('.layer-row').count(),6);
 while(await page.locator('.quick-remove-layer').count())await page.locator('.quick-remove-layer').first().click();
 assert.equal(await page.locator('.layer-row').count(),0);assert.equal(await page.locator('.empty-scene').count(),1);assert.ok(await page.locator('#layer-editor').isHidden());
 await page.locator('#add-layer').click();assert.equal(await page.locator('.layer-row').count(),1);assert.equal(await page.locator('.spatial-canvas').count(),1);
 // Each new renderer produces non-flat pixels and reacts to its shape/text controls.
 for(const id of ['type-rings','liquid-sphere','type-tunnel','letter-ballet','pattern-roll','helix','type-cloth']){
  await page.locator(`[data-preset="${id}"]`).click();assert.equal(await page.locator('.renderer-error').count(),0,id);const c=page.locator('.spatial-canvas');
  const image=await c.evaluate(el=>el.toDataURL());assert.ok(image.length>4000,`${id} renders actual content`);
  if(id === 'letter-ballet') { await page.locator('#frame-colors').uncheck(); await page.locator('#auto-ink').uncheck(); assert.equal(await page.locator('#ink').isEnabled(),true); const old = await c.evaluate(el=>el.toDataURL()); await page.locator('#background').evaluate(el=>{el.value='#00ad87';el.dispatchEvent(new Event('input',{bubbles:true}));}); assert.notEqual(await c.evaluate(el=>el.toDataURL()),old,'global backdrop works when frame palette is disabled'); }
  if(!['letter-ballet','pattern-roll'].includes(id)){const error=await c.evaluate(el=>el.getContext('webgl').getError());assert.equal(error,0,id);const before=await c.evaluate(el=>el.toDataURL());await page.locator('#ink').evaluate(el=>{el.value='#003bff';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.notEqual(await c.evaluate(el=>el.toDataURL()),before,'ink is editable');}
 }
 // Uploaded images are mapped onto a curved mesh and survive project round-trip.
 await page.locator('#media-file').setInputFiles({name:'custom.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#05d86b"/><circle cx="150" cy="150" r="60" fill="white"/></svg>')});
 await page.waitForFunction(()=>document.querySelectorAll('.layer-row').length===5);await page.locator('#curvature').fill('130');await page.locator('#turns').fill('150');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#save-project').click()]);const path=await download.path();const saved=JSON.parse(await fs.readFile(path,'utf8'));const cloth=saved.clips.at(-1);assert.equal(cloth.presetId,'type-cloth');assert.equal(cloth.curvature,130);assert.equal(cloth.turns,150);assert.ok(saved.media[cloth.layers.at(-1).mediaId]);
 await page.locator('#project-file').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await page.waitForFunction(()=>document.querySelectorAll('.timeline-clip').length===9);
 await page.locator('.timeline-clip').last().click();assert.equal(await page.locator('#curvature').inputValue(),'130');assert.equal(await page.locator('.layer-row').count(),5);
 // The legacy card renderer has the same direct manipulation and Delete scope.
 await openCardFixture(page);await page.locator('#scrubber').fill('2');const card=page.locator('.render-layer').nth(1),cb=await card.boundingBox();
 await page.mouse.move(cb.x+cb.width*.5,cb.y+cb.height*.5);await page.mouse.down();await page.mouse.move(cb.x+cb.width*.5+35,cb.y+cb.height*.5+20,{steps:6});await page.mouse.up();assert.ok(Number(await page.locator('#layer-x').inputValue())>0);await page.keyboard.press('Delete');assert.equal(await page.locator('.layer-row').count(),2);assert.equal(await page.locator('.timeline-clip').count(),1);
 await page.locator('[data-preset="type-rings"]').click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'/tmp/forma-v3-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: all 7 new presets, local fonts, WebGL rendering/picking, direct surface and card dragging, list reorder, contextual Delete, quick remove through empty scene, frame undo isolation, media textures, portable settings, old projects and mobile layout.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
