/* Offline acceptance of the explanatory 3D bridge and its recorded replay. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const repo = path.resolve(__dirname, '../..');
const html = path.resolve(process.env.BRIDGE_HTML || path.join(repo, 'thermal-bridge.html'));
const data = JSON.parse(fs.readFileSync(path.join(repo, 'project/thermal_bridge/results.json'), 'utf8'));
const screenshots = process.env.BRIDGE_SCREENSHOT_DIR;
const navigationOnly = process.argv.includes('--navigation-only');
const componentIds = ['winding', 'bond', 'pad', 'shunt', 'guard', 'case', 'reference', 'adc', 'estimator', 'rotor', 'shaft', 'stator', 'guard_driver', 'guard_sensor', 'leads', 'connector', 'power', 'bypass'];
const viewFor = id => ['adc', 'estimator', 'guard_driver', 'connector', 'power'].includes(id) ? 'electronics'
  : ['bond', 'pad', 'shunt', 'guard', 'guard_sensor', 'leads', 'bypass'].includes(id) ? 'sensor' : 'assembly';
const receipt = {
  scope: 'Offline browser acceptance of an explanatory 3D model and synthetic experiment replay. No physical validation.',
  offline: true, raycastSelections: [], cases: [], viewports: [], errors: [], externalRequests: [],
};
const temperature = value => Number.isFinite(value) ? value.toFixed(1) : '—';

function observe(page) {
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url())) receipt.externalRequests.push(request.url()); });
}
async function sceneState(page) { return page.evaluate(() => window.thermalBridge.scene.getState()); }
async function cameraState(page) {
  return page.evaluate(() => {
    const s = window.thermalBridge.scene.getState();
    return s.camera;
  });
}
async function tick(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function screenshot(page, name, selector) {
  if (!screenshots) return;
  fs.mkdirSync(screenshots, { recursive: true });
  if (selector) await page.locator(selector).screenshot({ path: path.join(screenshots, name) });
  else await page.screenshot({ path: path.join(screenshots, name), fullPage: true });
}
async function setView(page, view) {
  await page.locator('#bridge-view').selectOption(view);
  await tick(page);
}
async function setToggle(page, id, checked, field) {
  await page.locator(`#${id}`).setChecked(checked);
  await page.waitForFunction(({ field, checked }) => window.thermalBridge.scene.getState()[field] === checked, { field, checked });
  await tick(page);
}
async function assertReadings(page, sample, label) {
  for (const [id, field] of [['bridge-hot', 'hot_c'], ['bridge-pad', 'pad_c'], ['bridge-guard', 'guard_c'], ['bridge-adc', 'readout_c']]) {
    assert.equal(await page.locator(`#${id}`).textContent(), `${temperature(sample[field])}°C`, `${label}: ${field} is synchronized beside the 3D scene`);
  }
}
async function checkNavigationLifecycle(page) {
  await page.locator('#case-select').selectOption('nominal');
  await page.locator('#bridge-reset-view').click();
  await page.locator('#bridge-scene canvas').scrollIntoViewIfNeeded();
  await tick(page);
  const before = await cameraState(page);
  // Chromium's automation configuration need not admit this page to its cache.
  // Exercise the persisted-page event contract explicitly; this is not a claim
  // that a native back/forward-cache navigation took place in the test browser.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal((await sceneState(page)).ready, true, 'A persisted page retains its live renderer');
  assert.equal(await page.locator('#bridge-scene canvas').count(), 1, 'The retained page keeps its canvas');
  await setView(page, 'sensor');
  assert.notDeepEqual(await cameraState(page), before, 'Camera controls still render after a persisted pagehide');
  await page.locator('#step').click();
  assert.equal(await page.evaluate(() => window.thermalBridge.getState().index), 1, 'Step works on the retained page');
  await page.locator('#speed').selectOption('30');
  await page.locator('#play').click();
  await page.waitForFunction(() => window.thermalBridge.getState().index > 3, null, { timeout: 5000 });
  await page.locator('#play').click();
  assert.equal(await page.evaluate(() => window.thermalBridge.getState().playing), false);
  await page.locator('#case-select').selectOption('nominal');
  await page.locator('#play').click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  assert.equal((await sceneState(page)).ready, false, 'A nonpersisted page disposes its renderer');
  const stoppedAt = await page.evaluate(() => window.thermalBridge.getState().index);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.thermalBridge.getState().index), stoppedAt, 'A nonpersisted page stops its replay animation');
  return { method: 'Explicit PageTransitionEvent lifecycle contract; native cache admission was not exercised',
    persistedRetainsCanvasAndCamera: true, persistedRetainsStepAndPlayback: true, nonpersistedDisposesAndStops: true };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', offline: true });
    observe(page);
    await page.goto(pathToFileURL(html).href);
    await page.waitForFunction(() => window.thermalBridge?.scene?.getState().ready);
    if (navigationOnly) {
      const lifecycle = await checkNavigationLifecycle(page);
      assert.deepEqual(receipt.externalRequests, [], 'The lifecycle regression stays offline');
      assert.deepEqual(receipt.errors, [], 'No client errors during lifecycle regression');
      const result = { scope: 'Bounded retained-page lifecycle regression only; 18-component geometry checks were not rerun.',
        offline: true, lifecycle, errors: receipt.errors, externalRequests: receipt.externalRequests, passed: true };
      console.log(JSON.stringify(result, null, 2));
      if (process.env.BRIDGE_3D_TEST_REPORT) fs.writeFileSync(process.env.BRIDGE_3D_TEST_REPORT, JSON.stringify(result, null, 2) + '\n');
      return;
    }
    const initial = await sceneState(page);
    assert.deepEqual([...initial.componentIds].sort(), [...componentIds].sort(), 'All 18 components are represented in the scene');
    assert.equal(await page.locator('#bridge-scene canvas').count(), 1, 'One WebGL canvas is mounted');
    assert.equal(await page.locator('#hardware-svg [data-part]').count(), 9, 'The original schematic remains available');
    assert.equal(await page.locator('#part-select option').count(), componentIds.length, 'Every 3D component has a keyboard-accessible selector');
    assert.equal(initial.autoRotate, false, 'Reduced motion starts with spin stopped');
    assert.equal(await page.locator('#bridge-spin').isDisabled(), true, 'Reduced motion disables automatic spin');
    assert.equal(await page.locator('#estimated-hot').textContent(), '—', 'Final result stays hidden before observations finish');

    // Projection is used only to locate visible geometry. Selection itself must
    // pass through the canvas pointer handler and its actual raycast.
    await setToggle(page, 'bridge-cutaway', true, 'cutaway');
    await setToggle(page, 'bridge-exploded', true, 'exploded');
    const canvas = page.locator('#bridge-scene canvas');
    for (const id of componentIds) {
      if (id === 'bypass') await page.locator('#case-select').selectOption('unguarded_leak');
      const views = [...new Set([viewFor(id), 'assembly', 'sensor', 'electronics'])];
      let hit = null;
      const attempts = [];
      for (const view of views) {
        await setView(page, view);
        const other = id === 'adc' ? 'shaft' : 'adc';
        await page.locator('#part-select').selectOption(other);
        assert.equal((await sceneState(page)).selected, other, 'Accessible selection synchronizes into the scene');
        const point = await page.evaluate(id => window.thermalBridge.scene.getComponentScreenPoint(id), id);
        const attempt = { view, point };
        attempts.push(attempt);
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        const size = await canvas.boundingBox();
        if (point.x < 1 || point.y < 1 || point.x >= size.width - 1 || point.y >= size.height - 1) continue;
        await canvas.click({ position: { x: point.x, y: point.y } });
        await tick(page);
        attempt.selectedAfterClick = (await sceneState(page)).selected;
        if (attempt.selectedAfterClick !== id) continue;
        assert.equal(await page.locator('#part-select').inputValue(), id, `${id}: canvas click synchronizes into the accessible selector`);
        assert.equal(await page.evaluate(() => window.thermalBridge.getState().selected), id, `${id}: detail card follows the canvas selection`);
        assert.ok((await page.locator('#part-role').textContent()).trim().length > 10, `${id}: a substantive explanation is displayed`);
        hit = { id, view, x: Math.round(point.x), y: Math.round(point.y) };
        break;
      }
      assert.ok(hit, `A visible 3D surface for ${id} must be selectable by an actual canvas click: ${JSON.stringify(attempts)}`);
      receipt.raycastSelections.push(hit);
    }
    await setView(page, 'sensor');
    await page.locator('#part-select').selectOption('pad');
    await screenshot(page, 'bridge-3d-sensor.png', '#bridge-scene');
    await setView(page, 'electronics');
    await page.locator('#part-select').selectOption('adc');
    await screenshot(page, 'bridge-3d-electronics.png', '#bridge-scene');
    await setView(page, 'assembly');
    await screenshot(page, 'bridge-3d-exploded.png', '#bridge-scene');

    // Deliberate orbit and zoom stay usable for reduced-motion users. A drag
    // must not be interpreted as a click on whatever is under its end point.
    await page.locator('#part-select').selectOption('adc');
    const beforeDrag = await cameraState(page);
    assert.ok(beforeDrag, 'Scene exposes camera state for checking orbit and zoom');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const start = { x: box.x + box.width * .45, y: box.y + box.height * .55 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + Math.min(120, box.width * .2), start.y + 45, { steps: 12 });
    await page.mouse.up();
    await tick(page);
    assert.equal((await sceneState(page)).selected, 'adc', 'Dragging the model does not select a component');
    assert.notDeepEqual(await cameraState(page), beforeDrag, 'Dragging changes the camera');
    const beforeZoom = await cameraState(page);
    await page.mouse.wheel(0, -250);
    await tick(page);
    assert.notDeepEqual(await cameraState(page), beforeZoom, 'Wheel input zooms the camera');
    await page.locator('#bridge-reset-view').click();
    await tick(page);
    assert.equal((await sceneState(page)).autoRotate, false, 'Reset does not enable spin under reduced motion');
    await setToggle(page, 'bridge-exploded', false, 'exploded');
    await setToggle(page, 'bridge-cutaway', false, 'cutaway');
    await setToggle(page, 'bridge-cutaway', true, 'cutaway');

    // This is still the same recorded experiment. Visual controls must never
    // change its numerical samples, conclusions, or delayed result reveal.
    for (const item of data.cases) {
      await page.locator('#case-select').selectOption(item.id);
      assert.equal(await page.locator('#estimated-hot').textContent(), '—');
      assert.equal(await page.locator('#direct-reading').textContent(), `${temperature(item.samples[0].direct_readout_c)}°C`);
      assert.deepEqual(await page.evaluate(() => window.thermalBridge.getState().sample), item.samples[0], `${item.id}: first sample is unchanged`);
      await assertReadings(page, item.samples[0], `${item.id} start`);
      assert.equal((await sceneState(page)).replayCaseId, item.id, `${item.id}: renderer follows scenario changes`);
      assert.deepEqual((await sceneState(page)).renderedSample, item.samples[0], `${item.id}: renderer receives the first recorded sample`);
      await page.locator('#timeline').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => window.thermalBridge.getState().complete);
      await tick(page);
      assert.deepEqual(await page.evaluate(() => window.thermalBridge.getState().sample), item.samples.at(-1), `${item.id}: final sample is unchanged`);
      await assertReadings(page, item.samples.at(-1), `${item.id} finish`);
      assert.deepEqual((await sceneState(page)).renderedSample, item.samples.at(-1), `${item.id}: renderer receives the final recorded sample`);
      assert.equal(await page.locator('#estimated-hot').textContent(), temperature(item.result.estimated_hot_c));
      assert.match(await page.locator('#result-status').getAttribute('class'), new RegExp(item.result.status));
      receipt.cases.push({ id: item.id, result: item.result.status });
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.locator('#estimated-hot').textContent(), '—', 'Scrubbing back hides the final estimate');
    }

    await page.locator('#case-select').selectOption('nominal');
    await page.locator('#timeline').focus();
    await page.keyboard.press('End');
    await setView(page, 'assembly');
    await page.locator('#part-select').selectOption('pad');
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      await tick(page);
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('#bridge-scene canvas');
        const c = canvas.getBoundingClientRect();
        const region = document.querySelector('#bridge-scene').getBoundingClientRect();
        return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          canvas: { width: c.width, height: c.height, left: c.left, right: c.right },
          region: { width: region.width, height: region.height }, buffer: { width: canvas.width, height: canvas.height } };
      });
      assert.ok(geometry.scrollWidth <= width + 1, `No horizontal overflow at ${width}: ${geometry.scrollWidth}`);
      assert.ok(geometry.canvas.width > 200 && geometry.canvas.height > 200, `The scene remains useful at ${width}`);
      assert.ok(geometry.canvas.left >= -1 && geometry.canvas.right <= width + 1, `The canvas fits the viewport at ${width}`);
      assert.ok(geometry.buffer.width > 0 && geometry.buffer.height > 0, `The drawing buffer is present at ${width}`);
      receipt.viewports.push(geometry);
      await screenshot(page, `bridge-3d-nominal-${width}.png`);
    }
    receipt.lifecycle = await checkNavigationLifecycle(page);
    await page.close();

    const motionPage = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference', offline: true });
    observe(motionPage);
    await motionPage.goto(pathToFileURL(html).href);
    await motionPage.waitForFunction(() => window.thermalBridge?.scene?.getState().ready);
    assert.equal(await motionPage.locator('#bridge-spin').isEnabled(), true);
    await setToggle(motionPage, 'bridge-spin', true, 'autoRotate');
    const spinStart = await cameraState(motionPage);
    await motionPage.waitForFunction(before => JSON.stringify(window.thermalBridge.scene.getState().camera) !== JSON.stringify(before), spinStart);
    await setToggle(motionPage, 'bridge-spin', false, 'autoRotate');
    await motionPage.emulateMedia({ reducedMotion: 'reduce' });
    await motionPage.waitForFunction(() => document.querySelector('#bridge-spin').disabled && !window.thermalBridge.scene.getState().autoRotate);
    receipt.motion = { reducedMotionDisablesSpin: true, explicitOrbitAndZoomWork: true, spinMovesCamera: true, livePreferenceChangeRespected: true };
    assert.deepEqual(receipt.externalRequests, [], 'The model and replay make no external requests');
    assert.deepEqual(receipt.errors, [], 'No client errors');
    receipt.passed = true;
    console.log(JSON.stringify(receipt, null, 2));
    if (process.env.BRIDGE_3D_TEST_REPORT) fs.writeFileSync(process.env.BRIDGE_3D_TEST_REPORT, JSON.stringify(receipt, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
