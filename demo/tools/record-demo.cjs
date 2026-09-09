/* Records actual browser interactions. Captions are added only to the recording session. */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {launch,clickPart,demo}=require('./browser-helpers.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const media=path.join(demo,'media');fs.mkdirSync(media,{recursive:true});
  const rawDir=process.env.DEMO_RECORD_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'thermal-demo-recording-'));
  const app=await launch({recordVideo:{dir:rawDir,size:{width:1360,height:1000}}});
  const {page,frame,errors}=app,chapters=[];
  const ready=Date.now();
  const caption=async(title,body,position='bottom')=>{
    const t=(Date.now()-ready)/1000;chapters.push({t,title,body});console.log(title);
    await frame.evaluate(({title,body,position})=>{
      let banner=document.getElementById('recording-caption');
      if(!banner){banner=document.createElement('div');banner.id='recording-caption';banner.style.cssText='position:fixed;bottom:12px;left:16px;right:16px;z-index:100;background:rgba(15,20,27,.94);color:#fff;padding:14px 20px;border-radius:12px;pointer-events:none;font-family:system-ui,sans-serif';document.body.append(banner);}
      banner.style.top=position==='top'?'12px':'auto';banner.style.bottom=position==='top'?'auto':'12px';
      banner.replaceChildren();const h=document.createElement('div');h.style.cssText='font-size:22px;font-weight:600';h.textContent=title;
      const p=document.createElement('div');p.style.cssText='font-size:16px;margin-top:5px';p.textContent=body;banner.append(h,p);
    },{title,body,position});
  };
  const select=async(id)=>{if(!await clickPart(frame,id))await frame.locator('#tq-part-select').selectOption(id);};
  let video,finished;
  try{
    await caption('Thermal Queue Governor','Recorded interactive walkthrough · synthetic motor data');await wait(2500);
    await caption('1 · Explore the motor','Click the windings to see what they do and how effort produces heat.');await select('windings');await wait(2500);
    await frame.locator('#tq-exploded').check();await wait(2500);
    await caption('2 · Inspect the drive electronics','The controller, inverter, capacitor, and sensors are clickable schematic parts.');
    await select('controller');await wait(2300);await select('inverter');await wait(2300);await select('dc_link');await wait(1800);
    await caption('3 · A clipped sensor can hide a hotter motor','The reading stops at 95°C; the governor keeps an upper temperature bound.');
    await frame.locator('#tq-exploded').uncheck();await select('temp_sensor');await frame.locator('#tq-play').click();await wait(6500);
    await frame.evaluate(()=>document.getElementById('recording-caption').style.display='none');
    await page.screenshot({path:path.join(media,'demo-poster.png')});
    await frame.evaluate(()=>document.getElementById('recording-caption').style.display='');
    await frame.locator('#tq-play').click();
    await caption('4 · Accepted commands still have to execute','The governor accounts for all eight queued commands before admitting more effort.');
    await frame.locator('#tq-queue').scrollIntoViewIfNeeded();await wait(2500);
    await frame.locator('#tq-effort').focus();await page.keyboard.press('End');for(let i=0;i<4;i++)await page.keyboard.press('ArrowLeft');
    await frame.locator('#tq-add').click();await wait(1700);
    await frame.locator('#tq-play').click();await frame.locator('#tq-queue').scrollIntoViewIfNeeded();await wait(2500);await frame.locator('#tq-play').click();
    await caption('5 · Compare the optional waiting scheduler','This demo mode waits for full effort and rejects requests after 20 simulated seconds.');
    await frame.locator('#tq-handling').selectOption('wait');await frame.locator('#tq-auto').uncheck();
    await frame.locator('#tq-effort').focus();await page.keyboard.press('End');await frame.locator('#tq-apply').click();
    for(let i=0;i<12;i++)await frame.locator('#tq-add').click();
    await frame.locator('#tq-speed').selectOption('12');await frame.locator('#tq-play').click();await frame.locator('#tq-queue').scrollIntoViewIfNeeded();
    await frame.waitForFunction(()=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getSnapshot().time>=24);
    await wait(1200);await frame.locator('#tq-play').click();
    await caption('6 · Review the measured simulation results','Effort delivered, completed and rejected commands, and over-limit samples update from the run.','top');
    await frame.locator('.viz-grid').scrollIntoViewIfNeeded();await wait(3800);
    await frame.locator('#tq-play').scrollIntoViewIfNeeded();await select('controller');
    await caption('Explore it yourself','Same scalar governor · detailed hardware illustration · no physical motor or electrical circuit test');await wait(3000);
    if(errors.length)throw new Error('Browser errors during recording: '+errors.join('; '));
    video=page.video();finished=Date.now();
  } finally {await app.context.close();await app.browser.close();}
  const duration=(finished-ready)/1000,raw=await video.path();
  const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
  const run=args=>{const result=spawnSync(ffmpeg,['-y','-hide_banner','-loglevel','error',...args],{encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error(result.stderr||'FFmpeg is unavailable; set FFMPEG_PATH.');};
  const output=path.join(media,'thermal-governor-walkthrough.mp4');
  run(['-ss',((ready-app.started)/1000).toFixed(3),'-i',raw,'-t',duration.toFixed(3),'-r','24','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-an',output]);
  const probe=spawnSync(ffmpeg,['-hide_banner','-i',output],{encoding:'utf8',windowsHide:true});
  const match=probe.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  if(!match)throw new Error('Could not read the encoded video duration.');
  const encodedDuration=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
  run(['-ss','3','-t','9','-i',output,'-vf','crop=744:740:0:90,fps=8,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4','-loop','0',path.join(media,'demo-preview.gif')]);
  const timestamp=s=>{const ms=Math.round(s*1000);return`${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
  fs.writeFileSync(path.join(media,'walkthrough.vtt'),'WEBVTT\n\n'+chapters.filter(c=>c.t<encodedDuration).map((c,i)=>`${timestamp(c.t)} --> ${timestamp(Math.min(chapters[i+1]?.t||encodedDuration,encodedDuration))}\n${c.title}\n${c.body}\n`).join('\n'));
  fs.writeFileSync(path.join(media,'recording.json'),JSON.stringify({recordedAt:new Date().toISOString(),format:'MP4 H.264, 1360x1000, 24 fps, silent with on-screen captions',source:'Actual browser interactions with the shipped demo; synthetic simulation data',durationSeconds:encodedDuration,sessionDurationSeconds:duration,chapterTiming:'Approximate wall-clock offsets from the first caption; the video also contains synchronized on-screen captions.',chapters,consoleErrors:errors},null,2)+'\n');
  console.log(JSON.stringify({video:output,bytes:fs.statSync(output).size,durationSeconds:encodedDuration}));
})().catch(error=>{console.error(error);process.exitCode=1});
