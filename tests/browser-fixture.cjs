async function openCardFixture(page) {
  const fixture = await page.evaluate(async () => {
    const {newClip}=await import(new URL('engine.js?v=3.0.0',location.href));
    return {version:2,name:'Test project',width:1920,height:1080,clips:[newClip('cascade')],media:{}};
  });
  await page.locator('#project-file').setInputFiles({name:'fixture.forma.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await page.waitForFunction(()=>document.querySelectorAll('.render-layer').length===3);
}
module.exports={openCardFixture};
