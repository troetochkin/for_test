const {openCardFixture}=require('./browser-fixture.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1512,height:982}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(process.env.FORMA_TEST_URL || 'http://localhost:3000',{waitUntil:'networkidle'});
 await openCardFixture(page); await page.locator('#play').click();
 await page.screenshot({path:'/tmp/forma-v2-initial.png'});
 await page.locator('body').click({position:{x:10,y:10}});
 await page.keyboard.press('Space'); assert.equal(await page.locator('#play').getAttribute('aria-label'),'Воспроизвести');
 const before=await page.locator('.render-layer').first().getAttribute('style');await page.waitForTimeout(180);assert.equal(await page.locator('.render-layer').first().getAttribute('style'),before,'pause freezes the motion');
 await page.keyboard.press('Space');await page.waitForTimeout(180);assert.notEqual(await page.locator('.render-layer').first().getAttribute('style'),before,'resume advances motion');await page.keyboard.press('Space');
 await page.locator('#clip-name').fill('Мой каскад');await page.locator('#clip-name').press('Space');assert.equal(await page.locator('#play').getAttribute('aria-label'),'Воспроизвести','typing space must not play');
 await page.locator('#depth').fill('280');await page.getByRole('button',{name:'Добавить пресет Орбита',exact:true}).click();assert.equal(await page.locator('.timeline-clip').count(),2);assert.equal(await page.locator('#depth').inputValue(),'220','independent preset values');
 await page.locator('.timeline-clip').first().click();assert.equal(await page.locator('#depth').inputValue(),'280');
 await page.locator('#layer-title').fill('<script>test</script>\nЗаголовок');assert.equal(await page.locator('.design-title').first().textContent(),'<script>test</script>\nЗаголовок');assert.equal(await page.locator('.design-title script').count(),0);
 await page.locator('#add-layer').click();assert.equal(await page.locator('.layer-item').count(),4);
 await page.locator('#layer-title').fill('Новый кадр');await page.locator('summary').click();await page.locator('#layer-x').fill('80');await page.locator('#layer-x').press('Tab');assert.equal(await page.locator('#layer-x').inputValue(),'80');
 await page.locator('#layer-up').click();assert.equal(await page.locator('.layer-item.active .layer-item-copy strong').textContent(),'Кадр 4');
 await page.locator('#duplicate-layer').click();assert.equal(await page.locator('.layer-item').count(),5);await page.locator('#remove-layer').click();assert.equal(await page.locator('.layer-item').count(),4);
 const svg=color=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${color}"/></svg>`);
 await page.locator('#media-file').setInputFiles([{name:'one.svg',mimeType:'image/svg+xml',buffer:svg('red')},{name:'two.svg',mimeType:'image/svg+xml',buffer:svg('blue')}]);
 await page.waitForFunction(()=>document.querySelectorAll('.layer-item').length===6);assert.equal(await page.locator('#media-count').textContent(),'2');assert.equal(await page.locator('.render-layer img').count(),2);
 await page.locator('#media-fit').selectOption('contain');
 // Change only the selected media frame, then replace it without adding a layer.
 await page.locator('#replace-file').setInputFiles({name:'replacement.svg',mimeType:'image/svg+xml',buffer:svg('green')});await page.waitForFunction(()=>document.querySelector('#layer-name').value==='replacement.svg');assert.equal(await page.locator('.layer-item').count(),6);
 await page.locator('#ratio').selectOption('9:16');assert.equal(await page.locator('#height').inputValue(),'1920');
 await page.locator('#ratio').selectOption('16:9');
 // Trim a real timeline clip by its handle.
 await page.locator('.timeline-clip').first().click();const oldDuration=Number(await page.locator('#duration').inputValue());const handle=page.locator('.trim-handle').first();const box=await handle.boundingBox();await page.mouse.move(box.x+4,box.y+20);await page.mouse.down();await page.mouse.move(box.x+66,box.y+20,{steps:8});await page.mouse.up();assert.ok(Number(await page.locator('#duration').inputValue())>oldDuration);
 await page.locator('#duplicate-clip').click();assert.equal(await page.locator('.timeline-clip').count(),3);await page.locator('#clip-name').fill('Независимая копия');await page.locator('#move-clip-right').click();assert.equal(await page.locator('.timeline-clip').last().getAttribute('aria-pressed'),'true');
 // Exercise the actual drop handlers with the same browser DataTransfer used by drag/drop.
 const dt=await page.evaluateHandle(()=>{const d=new DataTransfer();d.setData('application/x-forma-preset','ribbon');return d});await page.locator('#clip-track').dispatchEvent('drop',{dataTransfer:dt,clientX:10000});assert.equal(await page.locator('.timeline-clip').count(),4);
 await page.locator('#duration').fill('3');await page.locator('#duration').press('Tab');await page.locator('#speed').fill('2');
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#save-project').click()]);const path=await download.path();const saved=JSON.parse(await fs.readFile(path,'utf8'));assert.equal(saved.version,2);assert.equal(saved.clips.length,4);assert.ok(Object.keys(saved.media).length>=2);assert.equal(saved.clips[0].depth,280);assert.equal(saved.clips[0].layers[0].title,'<script>test</script>\nЗаголовок');
 await fs.copyFile(path,'/tmp/forma-v2-project.json');
 await page.locator('#remove-clip').click();assert.equal(await page.locator('.timeline-clip').count(),3);await page.locator('#project-file').setInputFiles('/tmp/forma-v2-project.json');await page.waitForFunction(()=>document.querySelectorAll('.timeline-clip').length===4);
 await page.locator('.timeline-clip').first().click();assert.equal(await page.locator('.layer-item').count(),6);assert.equal(await page.locator('.render-layer img').count(),2);
 await page.locator('#scrubber').fill(String(saved.clips[0].duration-.3));await page.waitForTimeout(50);assert.equal(await page.locator('.scene').count(),2,'crossfade renders both scenes');
 await page.locator('#layer-title').blur();await page.locator('#restart').click();await page.locator('#loop').click();await page.locator('#scrubber').fill(String(Number((Number(await page.locator('#scrubber').getAttribute('max'))-.08).toFixed(3))));await page.locator('#play').click();await page.waitForTimeout(300);assert.equal(await page.locator('#play').getAttribute('aria-label'),'Воспроизвести','end pauses with looping off');
 await page.locator('.timeline-clip').first().click();await page.locator('#scrubber').fill('2.4');await page.screenshot({path:'/tmp/forma-v2-edited.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.ok(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'mobile has no horizontal page overflow');await page.screenshot({path:'/tmp/forma-v2-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: Space playback, typing guard, per-clip isolation, frame editing/order/duplication/removal, multiple image import, replacement, fit, ratios, trimming, clip duplication/reorder, preset drop, speed, portable save/load, transitions, stop at end, mobile overflow; no page errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
