const path=require('node:path');
const {pathToFileURL}=require('node:url');
const playwright=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const demo=path.resolve(__dirname,'..');
async function launch(options={}) {
  const browser=await playwright.chromium.launch({headless:true,
    ...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1360,height:1000},deviceScaleFactor:1,colorScheme:'dark',...options});
  const started=Date.now(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto(pathToFileURL(path.join(demo,'index.html')).href);
  const frame=page.frames()[1];
  await frame.waitForFunction(()=>document.querySelector('#tq-motor canvas') && document.querySelector('#tq-scene-label').textContent.includes('Click a part'),null,{timeout:45000});
  await frame.waitForSelector('#tq-history [data-chart-frame]');
  return {browser,context,page,frame,errors,started};
}
async function clickPart(frame,id) {
  const point=await frame.evaluate(id=>document.getElementById('thermal-queue-governor-v1').thermalDemo.getScene().getComponentScreenPoint(id),id);
  if(!point)return false;
  const canvas=frame.locator('#tq-motor canvas');await canvas.click({position:point});return true;
}
module.exports={launch,clickPart,demo};
