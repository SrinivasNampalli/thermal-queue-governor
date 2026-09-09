const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launch,clickPart,demo}=require('../tools/browser-helpers.cjs');
(async()=>{
  const app=await launch();const {page,frame,errors}=app;
  const result={components:0,raycastSelections:[],viewports:[],simulation:false,waitTimeout:false,accessibility:{}};
  try {
    const regions=['tq-live','tq-admission-live','tq-summary-live'];
    assert.equal(await frame.locator('#thermal-queue-governor-v1 [aria-live="polite"]').count(),regions.length);
    for(const id of regions){
      const region=frame.locator('#'+id);
      assert.equal(await region.getAttribute('role'),'status');
      assert.equal(await region.getAttribute('aria-atomic'),'true');
      assert.ok(await region.getAttribute('aria-label'),'Live channels have distinct accessible names');
    }
    const watch=fs.readFileSync(path.join(demo,'watch.html'),'utf8');
    assert.match(watch,/<track\b[^>]*kind="captions"[^>]*\bdefault(?:\s|>)/,'Watch captions must start enabled');
    result.accessibility.liveRegions=regions;result.accessibility.defaultCaptions=true;
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
    assert.match(await frame.locator('#tq-live').textContent(),/Advanced one second/);
    assert.match(await frame.locator('#tq-summary-live').textContent(),/^At 1 seconds: motor .*bounds .*Sensor .*headroom .*over-limit samples.*completed.*rejected/);
    await frame.locator('#tq-play').click();await frame.waitForFunction(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time>=5);
    await frame.locator('#tq-play').click();
    const snapshot=await frame.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot());
    assert.ok(snapshot.valid&&snapshot.inside);result.simulation=true;
    await page.waitForTimeout(350);
    assert.equal(await frame.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time),snapshot.time,'Pause must freeze time');
    assert.match(await frame.locator('#tq-live').textContent(),/Simulation paused/);
    assert.match(await frame.locator('#tq-summary-live').textContent(),new RegExp('^At '+snapshot.time+' seconds:'));
    // Observe actual live-region mutations at maximum speed, not just the source constants.
    await frame.locator('#tq-speed').selectOption('30');
    await frame.evaluate(()=>{
      window.liveUpdates=[];
      window.liveObserver=new MutationObserver(records=>{
        for(const id of new Set(records.map(record=>record.target.id))){
          window.liveUpdates.push({id,wall:performance.now(),text:document.getElementById(id).textContent});
        }
      });
      for(const id of ['tq-admission-live','tq-summary-live'])window.liveObserver.observe(document.getElementById(id),{childList:true});
    });
    await frame.locator('#tq-play').click();await page.waitForTimeout(16200);
    const updates=await frame.evaluate(()=>{window.liveObserver.disconnect();return window.liveUpdates;});
    await frame.locator('#tq-play').click();
    for(const [id,minGap,maxCount] of [['tq-admission-live',4900,5],['tq-summary-live',14900,2]]){
      const events=updates.filter(event=>event.id===id);
      assert.ok(events.length>=1&&events.length<=maxCount,`${id}: periodic updates without flooding (${events.length})`);
      for(let i=1;i<events.length;i++)assert.ok(events[i].wall-events[i-1].wall>=minGap,`${id}: wall-clock throttle is independent of simulation speed`);
      result.accessibility[id]={updates:events.length,minimumIntervalMs:minGap};
    }
    assert.match(updates.find(event=>event.id==='tq-summary-live').text,/effort delivered/);
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
      // The srcdoc iframe can resize a frame after the outer page. Wait for its
      // viewport, then read both panels in one task so their geometry cannot mix.
      await frame.waitForFunction(expected=>innerWidth===expected,width);
      const layout=await frame.evaluate(()=>{
        const panels=document.querySelectorAll('.tq-main > section');
        return {width:innerWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
          columns:getComputedStyle(document.querySelector('.tq-main')).gridTemplateColumns,
          motor:panels[0].getBoundingClientRect().toJSON(),history:panels[1].getBoundingClientRect().toJSON()};
      });
      assert.equal(layout.width,width,'The child frame must use the requested viewport');
      assert.equal(layout.overflow,false,`Horizontal overflow at ${width}px`);
      if(width===768){
        const {motor,history}=layout;
        assert.ok(history.y>=motor.y+motor.height,'768 px stacks history below the complete motor panel: '+JSON.stringify(layout));
        assert.ok(Math.abs(history.x-motor.x)<1,'Stacked sections align at 768 px');
        result.stackedAt768=true;
      }
      result.viewports.push(width);
    }
    assert.deepEqual(errors,[]);result.consoleErrors=errors;result.passed=true;
    if(process.env.DEMO_TEST_REPORT)fs.writeFileSync(process.env.DEMO_TEST_REPORT,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  } finally {await app.context.close();await app.browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
