/* Record the shipped guarded-bridge page through real browser controls.
 * Requires Playwright/Chromium and FFmpeg; no browser footage is synthesized.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const repo = path.resolve(__dirname, '../..');
const media = path.join(repo, 'demo/media');
const html = path.resolve(process.env.BRIDGE_HTML || path.join(repo, 'thermal-bridge.html'));
const viewport = { width: 1360, height: 1000 };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ff = args => {
  const result = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || 'FFmpeg failed; set FFMPEG_PATH.');
};
const durationOf = file => {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8', windowsHide: true });
  const match = result.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  if (!match) throw new Error('Could not determine video duration.');
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
};
const timestamp = seconds => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};

(async () => {
  fs.mkdirSync(media, { recursive: true });
  const recordedPageHash = sha256(html);
  const rawDir = process.env.BRIDGE_RECORD_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'guarded-bridge-recording-'));
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: 'dark', offline: true,
    recordVideo: { dir: rawDir, size: viewport } });
  const chromiumVersion = browser.version();
  const started = Date.now(), page = await context.newPage(), errors = [], externalRequests = [], chapters = [], actions = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  let ready, finished, video;
  const scrollTo = async selector => {
    await page.locator(selector).evaluate(element => window.scrollTo({ top: Math.max(0, element.getBoundingClientRect().top + window.scrollY), behavior: 'smooth' }));
    await wait(400);
  };
  const chapter = async (title, body) => {
    chapters.push({ t: (Date.now() - ready) / 1000, title, body });
    console.log(title);
    await page.evaluate(({ title, body }) => {
      let banner = document.getElementById('bridge-recording-caption');
      if (!banner) {
        banner = document.createElement('aside'); banner.id = 'bridge-recording-caption';
        banner.style.cssText = 'position:fixed;left:18px;right:18px;bottom:14px;z-index:9999;box-sizing:border-box;padding:14px 20px 15px;border:1px solid #e5aa7270;border-radius:12px;background:rgba(8,15,25,.96);color:#f0f3f6;box-shadow:0 12px 40px #0007;pointer-events:none;font-family:system-ui,sans-serif';
        document.body.append(banner);
      }
      banner.replaceChildren();
      const heading = document.createElement('div'); heading.style.cssText = 'font-size:21px;font-weight:600;line-height:1.3;color:#edbd90'; heading.textContent = title;
      const copy = document.createElement('div'); copy.style.cssText = 'font-size:16px;line-height:1.4;margin-top:5px'; copy.textContent = body;
      banner.append(heading, copy);
    }, { title, body });
  };
  const selectPart = async id => {
    const point = await page.evaluate(id => window.thermalBridge.scene.getComponentScreenPoint(id), id);
    let method = 'component selector';
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      const bounds = await page.locator('#bridge-scene').boundingBox();
      if (bounds && point.x >= 0 && point.y >= 0 && point.x <= bounds.width && point.y <= bounds.height) {
        await page.locator('#bridge-scene canvas').click({ position: { x: point.x, y: point.y } });
        if (await page.locator('#part-select').inputValue() === id) method = '3D raycast click';
      }
    }
    if (method !== '3D raycast click') await page.locator('#part-select').selectOption(id);
    actions.push({ t: (Date.now() - ready) / 1000, component: id, method });
  };
  const replay = async (id, speed) => {
    await page.locator('#case-select').selectOption(id);
    await page.locator('#speed').selectOption(String(speed));
    await page.locator('#play').click();
  };
  const finishReplay = async () => {
    await page.waitForFunction(() => window.thermalBridge.getState().complete, null, { timeout: 15000 });
    const state = await page.evaluate(() => window.thermalBridge.getState());
    const estimated = await page.locator('#estimated-hot').textContent();
    const expected = { nominal: '130.0', wire_leak: '130.0', unguarded_leak: '85.0' }[state.caseId];
    if (estimated !== expected) throw new Error(`Unexpected ${state.caseId} result in recording: ${estimated}, expected ${expected}.`);
    actions.push({ t: (Date.now() - ready) / 1000, replayCompleted: state.caseId,
      estimatedWindingC: estimated, index: state.index });
  };
  try {
    await page.goto(pathToFileURL(html).href);
    await page.waitForFunction(() => window.thermalBridge?.scene && document.querySelector('#bridge-scene canvas'), null, { timeout: 45000 });
    await page.locator('#bridge-spin').uncheck();
    await scrollTo('#experiment');
    ready = Date.now();
    await chapter('Guarded Thermal Bridge · 3D walkthrough', 'Actual browser recording of the concept model and synthetic experiment.');
    await wait(2600);
    await chapter('1 · Look inside the motor', 'Orbit the assembly, then separate the parts to inspect the sensor module.');
    await scrollTo('.assembly-layout');
    const canvas = await page.locator('#bridge-scene canvas').boundingBox();
    if (!canvas) throw new Error('The 3D canvas is not visible.');
    await page.mouse.move(canvas.x + canvas.width * .48, canvas.y + canvas.height * .5);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * .66, canvas.y + canvas.height * .56, { steps: 36 });
    await page.mouse.up();
    actions.push({ t: (Date.now() - ready) / 1000, action: 'Orbit assembly by pointer drag' });
    await wait(2200);
    await page.locator('#bridge-exploded').check();
    await page.locator('#bridge-cutaway').check();
    await page.locator('#bridge-view').selectOption('sensor');
    await wait(1050);
    await selectPart('pad');
    await wait(2400);
    await chapter('2 · Two independent thermal controls', 'The shunt cools the sensing pad. A separate heater/cooler changes the guard around its leads.');
    await selectPart('shunt'); await wait(2200);
    await selectPart('guard'); await wait(2400);
    await chapter('3 · Inspect the measurement electronics', 'Click the ADC, guard driver, and estimator. The wiring is a functional illustration.');
    await page.locator('#bridge-view').selectOption('electronics');
    await wait(1050);
    await selectPart('adc'); await wait(2100);
    await selectPart('guard_driver'); await wait(1800);
    await selectPart('estimator'); await wait(1800);
    await chapter('4 · Recover information after clipping', 'The direct channel stays at 95°C. Cooling the pad makes its own measurement readable again.');
    await page.locator('#bridge-view').selectOption('sensor');
    await wait(1050);
    await selectPart('pad');
    await replay('nominal', 12);
    await scrollTo('.trace-panel');
    await finishReplay();
    await wait(600);
    await chapter('Three observations fit; the fourth checks', 'The synthetic nominal case reconstructs a 130°C winding. This is a model consistency check.');
    await scrollTo('.outcome');
    await wait(3200);
    await chapter('5 · Why the separate guard matters', 'With strong wire leakage, changing the guard supplies information that shunt changes alone cannot.');
    await replay('wire_leak', 30);
    await scrollTo('.trace-panel');
    await finishReplay();
    await scrollTo('.outcome');
    await wait(800);
    await chapter('130°C recovered in the constructed example', 'A shunt-only model that ignores the wire path reports 85°C; the guarded fit recovers 130°C.');
    await wait(4700);
    await chapter('6 · Test the blind spot too', 'An extra heat path bypassing the guard can defeat the fit and its fourth-state check.');
    await replay('unguarded_leak', 30);
    await scrollTo('.trace-panel');
    await finishReplay();
    await scrollTo('.outcome');
    await chapter('A pass can still be wrong', 'The bypass case reports 85°C for a 130°C source. Consistency does not establish safe motor operation.');
    await wait(5200);
    await page.locator('#case-select').selectOption('nominal');
    await page.locator('#bridge-view').selectOption('assembly');
    await page.locator('#bridge-exploded').uncheck();
    await page.locator('#bridge-reset-view').click();
    await scrollTo('.assembly-layout');
    await wait(1050);
    await selectPart('winding');
    await page.evaluate(() => document.getElementById('bridge-recording-caption').style.visibility = 'hidden');
    await wait(350);
    await page.screenshot({ path: path.join(media, 'bridge-poster.png') });
    await page.evaluate(() => document.getElementById('bridge-recording-caption').style.visibility = '');
    await chapter('Explore all 18 components and 10 cases', 'Proposed hardware geometry and synthetic replay. No physical motor, circuit, or prototype test.');
    await page.locator('#bridge-spin').check();
    await wait(2800);
    if (errors.length) throw new Error('Browser errors: ' + errors.join('; '));
    if (externalRequests.length) throw new Error('The self-contained page made external requests.');
    if (sha256(html) !== recordedPageHash) throw new Error('The bundled page changed during recording; rebuild and record a stable version.');
    video = page.video(); finished = Date.now();
  } finally { await context.close(); await browser.close(); }

  const raw = await video.path(), sessionDuration = (finished - ready) / 1000;
  const output = path.join(media, 'bridge-walkthrough.mp4');
  ff(['-ss', ((ready - started) / 1000).toFixed(3), '-i', raw, '-t', sessionDuration.toFixed(3), '-r', '24', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', output]);
  const duration = durationOf(output);
  ff(['-i', output, '-f', 'null', '-']);
  ff(['-ss', '3', '-t', '10', '-i', output, '-vf', 'crop=1360:760:0:0,fps=8,scale=680:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', path.join(media, 'bridge-preview.gif')]);
  fs.writeFileSync(path.join(media, 'bridge-walkthrough.vtt'), 'WEBVTT\n\n' + chapters.filter(c => c.t < duration).map((c, i) => `${timestamp(c.t)} --> ${timestamp(Math.min(chapters[i + 1]?.t ?? duration, duration))}\n${c.title}\n${c.body}\n`).join('\n'));
  const sourceFiles = [html, path.join(repo, 'demo/src/thermal-bridge.template.html'), path.join(repo, 'demo/src/thermal-bridge-scene.js'), path.join(repo, 'project/thermal_bridge/results.json'), __filename].filter(file => fs.existsSync(file));
  const assets = ['bridge-walkthrough.mp4', 'bridge-preview.gif', 'bridge-poster.png', 'bridge-walkthrough.vtt'].map(name => ({ file: 'demo/media/' + name, bytes: fs.statSync(path.join(media, name)).size, sha256: sha256(path.join(media, name)) }));
  const receipt = { recordedAt: new Date().toISOString(), source: 'Actual offline Chromium interactions with the shipped guarded thermal bridge page',
    scope: 'Conceptual hardware geometry and stored synthetic experiment replay; no physical motor, electronic circuit, or prototype validation.',
    format: 'MP4 H.264, 1360×1000, 24 fps, silent with on-screen explanations and separate WebVTT captions',
    durationSeconds: duration, sessionDurationSeconds: sessionDuration, viewport, chromiumVersion,
    chapterTiming: 'Approximate wall-clock offsets from the first banner; synchronized explanatory banners are also embedded in the recorded frames.',
    sourceHashes: sourceFiles.map(file => ({ file: path.relative(repo, file).replace(/\\/g, '/'), sha256: sha256(file) })),
    chapters, actions, assets, consoleErrors: errors, externalRequests, encodedVideoDecodePassed: true };
  fs.writeFileSync(path.join(media, 'bridge-recording.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ video: output, durationSeconds: duration, bytes: fs.statSync(output).size, componentClicks: actions.filter(a => a.method === '3D raycast click').length }));
})().catch(error => { console.error(error); process.exitCode = 1; });
