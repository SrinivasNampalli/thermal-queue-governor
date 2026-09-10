/* Acceptance checks for the deployed layout, local assets, and native video captions. */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const site=path.resolve(__dirname,'../../docs');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css',
  '.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.json':'application/json'};

async function localServer(){
  const server=http.createServer((request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      const file=path.resolve(site,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
      const relative=path.relative(site,file);
      if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
        response.writeHead(404);response.end();return;
      }
      const size=fs.statSync(file).size;
      response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
      response.setHeader('Cache-Control','no-store');response.setHeader('Accept-Ranges','bytes');
      let start=0,end=size-1;
      if(request.headers.range){
        const range=request.headers.range.match(/^bytes=(\d+)-(\d*)$/);
        if(!range||Number(range[1])>=size){response.writeHead(416,{'Content-Range':`bytes */${size}`});response.end();return;}
        start=Number(range[1]);if(range[2])end=Math.min(Number(range[2]),size-1);
        if(end<start){response.writeHead(416);response.end();return;}
        response.statusCode=206;response.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
      }
      response.setHeader('Content-Length',Math.max(0,end-start+1));
      if(request.method==='HEAD'||!size){response.end();return;}
      const stream=fs.createReadStream(file,{start,end});
      stream.on('error',()=>response.destroy());response.on('close',()=>stream.destroy());stream.pipe(response);
    }catch(error){response.writeHead(400);response.end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {server,url:`http://127.0.0.1:${server.address().port}/`};
}

(async()=>{
  let server,browser;
  try{
    let base=process.env.HOSTED_BASE_URL;
    if(!base){const local=await localServer();server=local.server;base=local.url;}
    const baseUrl=new URL(base.endsWith('/')?base:base+'/');
    assert.ok(['http:','https:'].includes(baseUrl.protocol),'Hosted checks require an HTTP(S) base URL');
    browser=await chromium.launch({headless:true,
      ...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),
      args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark',reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],failures=[],requests=[],responses=new Map();
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
    page.on('requestfailed',request=>{
      // A browser may cancel an earlier video range when the test seeks to another chapter.
      if(!(request.resourceType()==='media'&&request.failure()?.errorText==='net::ERR_ABORTED')){
        failures.push({url:request.url(),error:request.failure()?.errorText});
      }
    });
    page.on('response',response=>responses.set(response.url(),response));
    const main=await page.goto(baseUrl.href);
    assert.equal(main.status(),200,'Hosted landing responds successfully');
    const htmlBytes=(await main.body()).length;
    assert.ok(htmlBytes<100000,`Landing HTML is under 100 KB (${htmlBytes} bytes)`);
    await page.waitForFunction(()=>window.thermalLanding?.heroScene&&document.querySelector('#tq-motor canvas'));
    await page.waitForSelector('#tq-history [data-chart-frame]');
    const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>({
      url:node.src,defer:node.defer,integrity:node.integrity,crossOrigin:node.crossOrigin
    })));
    assert.equal(scripts.length,3,'Three local scripts provide Three.js, D3, and the application');
    const assets=[];
    for(const script of scripts){
      const url=new URL(script.url);
      assert.equal(url.origin,baseUrl.origin,'Hosted dependencies use the same origin');
      assert.ok(url.pathname.startsWith(baseUrl.pathname+'assets/'),'Scripts live in the site assets directory');
      assert.equal(script.defer,true,'Hosted scripts defer execution until HTML parsing completes');
      assert.equal(script.crossOrigin,'anonymous');assert.match(script.integrity,/^sha384-[A-Za-z0-9+/]{64}$/);
      const response=responses.get(script.url);assert.ok(response,'The browser requested '+url.pathname);
      assert.equal(response.status(),200);
      const bytes=await response.body(),digest=crypto.createHash('sha384').update(bytes).digest('base64');
      assert.equal(script.integrity,'sha384-'+digest,'Declared SRI matches the bytes actually served');
      assets.push({file:path.posix.basename(url.pathname),bytes:bytes.length,deferred:true,integrityVerified:true});
    }
    assert.deepEqual(await page.evaluate(()=>({three:window.THREE.REVISION,d3:window.d3.version})),{three:'160',d3:'7.9.0'});
    await page.locator('#tq-part-select').selectOption('inverter');
    assert.match(await page.locator('#tq-part-name').textContent(),/inverter/i);
    await page.locator('#tq-step').click();assert.match(await page.locator('#tq-clock').textContent(),/^1 s/);
    await page.locator('#tq-add').click();await page.locator('#tq-play').click();
    await page.waitForFunction(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time>=5);
    await page.locator('#tq-play').click();
    const snapshot=await page.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot());
    assert.ok(snapshot.valid&&snapshot.inside,'Hosted simulation retains valid thermal containment');
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time),snapshot.time,'Hosted pause freezes simulation time');
    await page.setViewportSize({width:768,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal overflow at 768 px');
    const panels=page.locator('.tq-main > section'),motor=await panels.nth(0).boundingBox(),history=await panels.nth(1).boundingBox();
    assert.ok(history.y>=motor.y+motor.height&&Math.abs(history.x-motor.x)<1,'Motor and history stack completely at 768 px');
    assert.equal(await page.locator('#thermal-queue-governor-v1 [role="status"][aria-live="polite"][aria-atomic="true"]').count(),3);

    const watchResponse=await page.goto(new URL('watch.html',baseUrl).href);assert.equal(watchResponse.status(),200);
    await page.waitForFunction(()=>document.querySelector('track[kind="captions"]').readyState===2);
    const captions=await page.locator('track[kind="captions"]').evaluate(track=>({
      default:track.default,mode:track.track.mode,cues:Array.from(track.track.cues).map(cue=>({line:cue.line,snapToLines:cue.snapToLines}))
    }));
    assert.equal(captions.default,true);assert.equal(captions.mode,'showing');assert.equal(captions.cues.length,8);
    assert.ok(captions.cues.every(cue=>cue.line===12&&!cue.snapToLines),'Caption placement clears recorded banners and result cards');
    await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
    await page.locator('video').evaluate(video=>{video.currentTime=47;});
    await page.waitForFunction(()=>{const video=document.querySelector('video');return !video.seeking&&video.currentTime>=47;});
    await page.locator('video').evaluate(video=>{video.muted=true;return video.play();});
    await page.waitForFunction(()=>document.querySelector('video').currentTime>47.2);
    const duration=await page.locator('video').evaluate(video=>{video.pause();return video.duration;});
    assert.ok(duration>51&&duration<53,'The recorded walkthrough is about 52 seconds');
    const bridgeResponse=await page.goto(new URL('thermal-bridge.html?guide=1#experiment',baseUrl).href);
    assert.equal(bridgeResponse.status(),200);
    await page.waitForFunction(()=>window.thermalBridge?.scene?.getState().ready);
    assert.equal(await page.locator('#part-select option').count(),18);
    assert.equal(await page.evaluate(()=>window.thermalBridge.getGuideState().open),true,'The public deep link opens the exploded guide');
    assert.equal(await page.locator('[data-callout-id]').count(),6);
    await page.locator('#part-select').selectOption('guard');
    assert.equal(await page.evaluate(()=>window.thermalBridge.scene.getState().selected),'guard');
    assert.equal(await page.evaluate(()=>window.thermalBridge.getGuideState().group),'sensor');
    await page.locator('[data-callout-id="pad"]').click();
    assert.equal(await page.locator('#part-select').inputValue(),'pad');
    await page.locator('#bridge-guide').click();
    assert.equal(await page.evaluate(()=>window.thermalBridge.getGuideState().open),false);
    const bridgeWatch=await page.goto(new URL('bridge-watch.html',baseUrl).href);
    assert.equal(bridgeWatch.status(),200);
    await page.waitForFunction(()=>document.querySelector('track[kind="captions"]').readyState===2);
    const bridgeCaptions=await page.locator('track[kind="captions"]').evaluate(track=>({
      default:track.default,mode:track.track.mode,cues:Array.from(track.track.cues).map(cue=>({line:cue.line,snapToLines:cue.snapToLines,start:cue.startTime,end:cue.endTime}))
    }));
    const bridgeReceipt=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../media/bridge-recording.json'),'utf8'));
    assert.equal(bridgeCaptions.default,true);assert.equal(bridgeCaptions.mode,'showing');
    assert.equal(bridgeCaptions.cues.length,bridgeReceipt.chapters.filter(c=>c.t<bridgeReceipt.durationSeconds).length);
    assert.ok(bridgeCaptions.cues.every(c=>c.line===4&&!c.snapToLines&&c.end>c.start));
    await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
    const bridgeDuration=await page.locator('video').evaluate(v=>v.duration);
    assert.ok(Math.abs(bridgeDuration-bridgeReceipt.durationSeconds)<.1,'Guarded bridge video matches its recorded duration');
    assert.ok(bridgeCaptions.cues.every(c=>c.end<=bridgeDuration+.1),'Captions stay within the video');
    await page.locator('video').evaluate(v=>{v.currentTime=7;});
    await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&v.currentTime>=7;});
    await page.locator('video').evaluate(v=>{v.muted=true;return v.play();});
    await page.waitForFunction(()=>document.querySelector('video').currentTime>7.2);
    await page.locator('video').evaluate(v=>v.pause());
    for(const width of [768,320]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Bridge watch page fits '+width);
    }
    const offsite=requests.filter(url=>new URL(url).origin!==baseUrl.origin);
    const failedResponses=[...responses.values()].filter(response=>response.status()>=400).map(response=>({url:response.url(),status:response.status()}));
    assert.deepEqual(offsite,[],'The hosted experience requests no external dependencies');
    assert.deepEqual(failedResponses,[]);assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
    const result={passed:true,target:process.env.HOSTED_BASE_URL?baseUrl.href:'local docs/ HTTP server',htmlBytes,
      assets,simulationControls:true,stackedAt768:true,liveRegions:3,
      watch:{defaultCaptions:true,captionCues:captions.cues.length,captionPositionVerified:true,playbackVerified:true,durationSeconds:duration},
      bridge:{components:18,explodedCallouts:true,defaultCaptions:true,captionCues:bridgeCaptions.cues.length,playbackVerified:true,durationSeconds:bridgeDuration},
      externalRequests:offsite,consoleErrors:errors,failedRequests:failures};
    if(process.env.HOSTED_TEST_REPORT)fs.writeFileSync(process.env.HOSTED_TEST_REPORT,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));await context.close();
  }finally{
    if(browser)await browser.close();
    if(server)await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
