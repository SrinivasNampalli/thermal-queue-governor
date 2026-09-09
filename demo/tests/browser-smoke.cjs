const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launch,clickPart,demo}=require('../tools/browser-helpers.cjs');
(async()=>{
  const app=await launch();const {page,frame,errors}=app;
  const result={components:0,raycastSelections:[],viewports:[],simulation:false,waitTimeout:false};
  try {
    const catalog=await frame.evaluate(()=>window.THERMAL_COMPONENTS.map(({id,name})=>({id,name})));
    assert.equal(catalog.length,16);
    for(const part of catalog){await frame.locator('#tq-part-select').selectOption(part.id);assert.equal(await frame.locator('#tq-part-name').textContent(),part.name);result.components++;}
    await frame.locator('#tq-exploded').check();
    for(const part of catalog)if(await clickPart(frame,part.id)){
      assert.equal(await frame.locator('#tq-part-select').inputValue(),part.id);result.raycastSelections.push(part.id);
    }
    assert.equal(result.raycastSelections.length,catalog.length,'Every component group must be directly clickable in exploded view');
    const selected=await frame.locator('#tq-part-select').inputValue();
    const box=await frame.locator('#tq-motor canvas').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+65,box.y+box.height/2,{steps:12});await page.mouse.up();
    assert.equal(await frame.locator('#tq-part-select').inputValue(),selected,'Dragging should not change component selection');
    await frame.locator('#tq-step').click();assert.match(await frame.locator('#tq-clock').textContent(),/^1 s/);
    await frame.locator('#tq-play').click();await frame.waitForFunction(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time>=5);
    await frame.locator('#tq-play').click();
    const snapshot=await frame.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot());
    assert.ok(snapshot.valid&&snapshot.inside);result.simulation=true;
    await page.waitForTimeout(350);
    assert.equal(await frame.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time),snapshot.time,'Pause must freeze time');
    await frame.locator('[data-series="bounds"]').click();assert.equal(await frame.locator('[data-series="bounds"]').getAttribute('aria-pressed'),'false');
    await frame.locator('[data-series="bounds"]').click();
    await frame.locator('#tq-cap').focus();await page.keyboard.press('Home');
    await frame.locator('#tq-handling').selectOption('wait');await frame.locator('#tq-auto').uncheck();
    await frame.locator('#tq-apply').click();assert.match(await frame.locator('#tq-clock').textContent(),/^0 s/);
    await frame.locator('#tq-speed').selectOption('30');await frame.locator('#tq-play').click();
    await frame.waitForFunction(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time>=22);
    await frame.locator('#tq-play').click();assert.match(await frame.locator('#tq-counts').textContent(),/[1-9]\d* rejected/);result.waitTimeout=true;
    for(const width of [1360,768,390,320]){
      await page.setViewportSize({width,height:900});
      assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,`Horizontal overflow at ${width}px`);
      result.viewports.push(width);
    }
    assert.deepEqual(errors,[]);result.consoleErrors=errors;result.passed=true;
    if(process.env.DEMO_TEST_REPORT)fs.writeFileSync(process.env.DEMO_TEST_REPORT,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  } finally {await app.context.close();await app.browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
