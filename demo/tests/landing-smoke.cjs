/* Offline acceptance checks for the public single-file landing page. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const repo=path.resolve(__dirname,'../..');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'reduce',offline:true});
    const page=await context.newPage(),errors=[],network=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
    page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url())});
    await page.goto(pathToFileURL(path.join(repo,'index.html')).href);
    await page.waitForFunction(()=>window.thermalLanding?.heroScene && document.querySelector('#tq-motor canvas'));
    await page.waitForSelector('#tq-history [data-chart-frame]');
    assert.equal(await page.locator('#thermal-queue-governor-v1 [aria-live="polite"][aria-atomic="true"]').count(),3,'Landing retains the simulator accessibility channels');
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'dark');
    assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#motion-toggle').isDisabled(),true);
    const point=await page.evaluate(()=>window.thermalLanding.heroScene.getComponentScreenPoint('inverter'));
    assert.ok(point,'Hero inverter must be clickable');
    await page.locator('#hero-motor canvas').click({position:point});
    assert.equal(await page.locator('#tq-part-select').inputValue(),'inverter');
    const catalog=await page.evaluate(()=>window.THERMAL_COMPONENTS.map(p=>p.id));
    await page.locator('#tq-exploded').check();
    for(const id of catalog){
      const point=await page.evaluate(id=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getScene().getComponentScreenPoint(id),id);
      assert.ok(point,'Direct click target exists for '+id);
      await page.locator('#tq-motor canvas').click({position:point});
      assert.equal(await page.locator('#tq-part-select').inputValue(),id);
    }
    await page.locator('#tq-step').click();assert.match(await page.locator('#tq-clock').textContent(),/^1 s/);
    assert.match(await page.locator('#tq-summary-live').textContent(),/^At 1 seconds: motor/);
    await page.locator('#tq-add').click();await page.locator('#tq-play').click();
    await page.waitForFunction(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time>=5);
    await page.locator('#tq-play').click();
    const snapshot=await page.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot());
    assert.ok(snapshot.valid&&snapshot.inside);
    await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time),snapshot.time);
    await page.locator('.evidence-details summary').click();assert.equal(await page.locator('.evidence-details').getAttribute('open'),'');
    assert.match(await page.locator('.evidence-details').innerText(),/113 samples/);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>!document.getElementById('motion-toggle').disabled);
    await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
    await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'false');
    await page.locator('#motion-toggle').click();
    for(const width of [1440,1024,768,390,320]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal overflow at '+width);
      if(width===768){
        const sections=page.locator('.tq-main > section'),motor=await sections.nth(0).boundingBox(),history=await sections.nth(1).boundingBox();
        assert.ok(history.y>=motor.y+motor.height,'At 768 px both landing and simulator use the stacked layout');
        assert.ok(Math.abs(history.x-motor.x)<1,'768 px simulator sections share a left edge');
      }
    }
    if(process.env.DEMO_SCREENSHOT_DIR){
      const dir=process.env.DEMO_SCREENSHOT_DIR;fs.mkdirSync(dir,{recursive:true});
      for(const [name,width] of [['landing-desktop',1440],['landing-mobile',390]]){
        await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});
        for(const selector of ['.hero','#approach','#prototype','#results'])await page.locator(selector).screenshot({path:path.join(dir,name+'-'+selector.replace(/[.#]/g,'')+'.png')});
      }
    }
    assert.deepEqual(network,[],'Landing must load without any remote request');assert.deepEqual(errors,[]);
    const result={passed:true,offline:true,components:catalog.length,heroSelection:true,simulationControls:true,reducedMotion:true,liveRegions:3,stackedAt768:true,viewports:[1440,1024,768,390,320],consoleErrors:errors,remoteRequests:network};
    if(process.env.LANDING_TEST_REPORT)fs.writeFileSync(process.env.LANDING_TEST_REPORT,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));await context.close();
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
