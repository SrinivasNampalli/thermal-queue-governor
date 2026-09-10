/* Offline acceptance of the exploded, annotated component guide. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const repo = path.resolve(__dirname, '../..');
const html = path.resolve(process.env.BRIDGE_HTML || path.join(repo, 'thermal-bridge.html'));
const data = JSON.parse(fs.readFileSync(path.join(repo, 'project/thermal_bridge/results.json'), 'utf8'));
const screenshots = process.env.BRIDGE_CALLOUT_SCREENSHOT_DIR;
const groups = {
  motor: ['winding', 'stator', 'rotor', 'shaft', 'case', 'reference'],
  sensor: ['bond', 'pad', 'shunt', 'guard', 'guard_sensor', 'bypass'],
  electronics: ['adc', 'estimator', 'guard_driver', 'connector', 'power', 'leads'],
};
const receipt = { scope: 'Offline browser acceptance of the explanatory exploded guide; no new motor or hardware validation.',
  offline: true, groups: [], selections: [], viewports: [], replayCases: [], errors: [], externalRequests: [] };
const card = (page, id) => page.locator(`#bridge-callouts [data-callout-id="${id}"]`);
const state = page => page.evaluate(() => window.thermalBridge.scene.getState());
const tick = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function capture(page, name) {
  if (!screenshots) return;
  fs.mkdirSync(screenshots, { recursive: true });
  await page.locator('.assembly-viewport').screenshot({ path: path.join(screenshots, name) });
}
async function guide(page, active) {
  if ((await page.locator('#bridge-guide').getAttribute('aria-pressed')) !== String(active)) await page.locator('#bridge-guide').click();
  await page.waitForFunction(active => document.querySelector('#bridge-guide').getAttribute('aria-pressed') === String(active), active);
  assert.equal(await page.locator('#bridge-callouts').isVisible(), active, 'Guide visibility matches its accessible toggle');
  await tick(page);
}
async function chooseGroup(page, group) {
  await page.locator(`#bridge-callout-tabs [data-callout-group="${group}"]`).click();
  await page.waitForFunction(ids => {
    const cards = [...document.querySelectorAll('#bridge-callouts [data-callout-id]')].filter(n => !n.hidden && n.getBoundingClientRect().width);
    return cards.length === ids.length && ids.every(id => cards.some(n => n.dataset.calloutId === id));
  }, groups[group]);
  await tick(page);
}
async function geometry(page) {
  return page.evaluate(() => {
    const rect = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const visible = node => {
      const style = getComputedStyle(node), r = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const root = document.querySelector('#bridge-callouts');
    const cards = [...root.querySelectorAll('[data-callout-id]')].filter(visible).map(n => ({ id: n.dataset.calloutId, status: n.querySelector('[data-callout-status]')?.textContent || '', ...rect(n) }));
    const pins = [...document.querySelectorAll('[data-callout-pin]')].filter(visible).map(n => ({ id: n.dataset.calloutPin, ...rect(n) }));
    const lineRoot = document.querySelector('#bridge-callout-lines');
    const lines = [...lineRoot.querySelectorAll('[data-callout-line]')].filter(n => visible(lineRoot) && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden' && n.getTotalLength() > 0).map(n => {
      const first = n.getPointAtLength(0), last = n.getPointAtLength(n.getTotalLength()), matrix = n.getScreenCTM();
      const start = new DOMPoint(first.x, first.y).matrixTransform(matrix), end = new DOMPoint(last.x, last.y).matrixTransform(matrix);
      return { id: n.dataset.calloutLine, start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } };
    });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      scene: rect(document.querySelector('#bridge-scene')), root: rect(root), cards, pins, lines, linesVisible: visible(lineRoot) && lines.length > 0 };
  });
}
function overlaps(a, b) {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
}
function assertGeometry(g, label) {
  assert.ok(g.scrollWidth <= g.width + 1, `${label}: no horizontal page overflow`);
  assert.equal(g.cards.length, 6, `${label}: six explanatory cards visible`);
  assert.ok(g.scene.width > 200 && g.scene.height > 200, `${label}: useful model area remains`);
  for (const c of g.cards) {
    assert.ok(c.left >= -1 && c.right <= g.width + 1, `${label}/${c.id}: card fits viewport`);
    assert.ok(c.width >= 130 && c.height >= 44, `${label}/${c.id}: readable clickable card`);
    for (const other of g.cards.filter(other => other.id > c.id)) assert.ok(!overlaps(c, other), `${label}: cards ${c.id} and ${other.id} do not overlap`);
  }
  if (g.linesVisible) {
    assert.ok(g.pins.length >= 1 && g.pins.length <= 6, `${label}: visible component anchors have numbered model pins`);
    assert.equal(g.lines.length, g.pins.length, `${label}: one leader line per visible pin`);
    for (const c of g.cards.filter(c => !g.pins.some(p => p.id === c.id))) {
      assert.ok(c.status.trim().length > 5, `${label}/${c.id}: an unavailable model anchor has an explanatory status`);
    }
    const center = { left: g.scene.left + g.scene.width * .37, right: g.scene.left + g.scene.width * .63,
      top: g.scene.top + 15, bottom: g.scene.bottom - 15 };
    for (const c of g.cards) assert.ok(!overlaps(c, center), `${label}/${c.id}: card leaves center of model unobstructed`);
    for (const line of g.lines) {
      const pin = g.pins.find(p => p.id === line.id), c = g.cards.find(c => c.id === line.id);
      assert.ok(pin && c, `${label}/${line.id}: line identifies both its pin and explanation`);
      const pinCenter = { x: pin.left + pin.width / 2, y: pin.top + pin.height / 2 };
      const distance = p => Math.hypot(p.x - pinCenter.x, p.y - pinCenter.y);
      const startsAtPin = distance(line.start) < distance(line.end);
      const pinEnd = startsAtPin ? line.start : line.end, cardEnd = startsAtPin ? line.end : line.start;
      assert.ok(distance(pinEnd) <= Math.max(pin.width, pin.height) / 2 + 4, `${label}/${line.id}: line tracks its numbered pin`);
      assert.ok(cardEnd.x >= c.left - 5 && cardEnd.x <= c.right + 5 && cardEnd.y >= c.top - 5 && cardEnd.y <= c.bottom + 5,
        `${label}/${line.id}: line begins on its matching card`);
      assert.ok(pin.left >= g.scene.left - 2 && pin.right <= g.scene.right + 2 && pin.top >= g.scene.top - 2 && pin.bottom <= g.scene.bottom + 2,
        `${label}/${line.id}: pin stays in scene region`);
    }
  } else {
    assert.ok(g.cards.every(c => c.top >= g.scene.bottom - 1), `${label}: compact-layout explanations sit below the model`);
  }
}
async function assertSelected(page, id) {
  assert.equal(await page.locator('#part-select').inputValue(), id, `${id}: explanation selects the accessible component menu`);
  assert.equal((await state(page)).selected, id, `${id}: explanation selects the rendered component`);
  assert.equal(await page.evaluate(() => window.thermalBridge.getState().selected), id, `${id}: explanation synchronizes the replay inspector`);
  assert.ok((await page.locator('#part-description').textContent()).trim().length > 30, `${id}: inspector contains a meaningful description`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', offline: true });
    page.on('pageerror', e => receipt.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') receipt.errors.push(m.text()); });
    page.on('request', r => { if (/^https?:/.test(r.url())) receipt.externalRequests.push(r.url()); });
    await page.goto(pathToFileURL(html).href);
    await page.waitForFunction(() => window.thermalBridge?.scene?.getState().ready);
    assert.equal(await page.locator('#bridge-guide').getAttribute('aria-pressed'), 'false', 'Explanatory guide is opt-in');
    assert.equal(await page.locator('#bridge-callouts').isVisible(), false);
    const beforeGuide = await page.evaluate(() => window.thermalBridge.getState().sample);
    await guide(page, true);
    assert.equal((await state(page)).exploded, true, 'Guide separates the components');
    assert.equal((await state(page)).cutaway, true, 'Guide opens the housing');
    assert.equal((await state(page)).autoRotate, false, 'Guide opens without automatic rotation');
    assert.equal(await page.locator('#bridge-exploded').isChecked(), true);
    assert.equal(await page.locator('#bridge-cutaway').isChecked(), true);
    assert.deepEqual(await page.evaluate(() => window.thermalBridge.getState().sample), beforeGuide, 'Opening the guide leaves replay data unchanged');
    assert.equal(await page.locator('#bridge-callout-tabs [data-callout-group]').count(), 3, 'Three groups cover all components');

    for (const [group, ids] of Object.entries(groups)) {
      await chooseGroup(page, group);
      const descriptions = [];
      for (const id of ids) {
        const c = card(page, id);
        const text = (await c.textContent()).replace(/\s+/g, ' ').trim();
        assert.ok(text.length > 45, `${id}: callout explains the component`);
        await c.click();
        await assertSelected(page, id);
        // Activate the same visible explanation using the keyboard, after
        // moving selection elsewhere so a missing key handler cannot pass.
        await page.locator('#part-select').selectOption(ids.find(other => other !== id));
        await c.focus();
        await page.keyboard.press('Enter');
        await assertSelected(page, id);
        descriptions.push({ id, text });
        receipt.selections.push({ id, pointer: true, enter: true });
      }
      if (group === 'sensor') assert.match(await card(page, 'bypass').textContent(), /unintended|fault|unmodeled|failure/i, 'Bypass explanation distinguishes an unintended path');
      const g = await geometry(page);
      await capture(page, `bridge-callouts-${group}.png`);
      assertGeometry(g, group);
      receipt.groups.push({ group, descriptions, leaderCount: g.lines.length });
    }
    // The selected card is also operable with the native button Space key.
    await page.locator('#part-select').selectOption('power');
    await card(page, 'adc').focus();
    await page.keyboard.press('Space');
    await assertSelected(page, 'adc');
    receipt.spaceActivation = true;

    await chooseGroup(page, 'motor');
    await page.locator('#bridge-scene canvas').scrollIntoViewIfNeeded();
    const oldGeometry = await geometry(page), oldCamera = (await state(page)).camera;
    const canvas = await page.locator('#bridge-scene canvas').boundingBox();
    await page.mouse.move(canvas.x + canvas.width * .52, canvas.y + canvas.height * .57);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * .57, canvas.y + canvas.height * .63, { steps: 10 });
    await page.mouse.up();
    await tick(page);
    assert.notDeepEqual((await state(page)).camera, oldCamera, 'The model remains draggable inside the guide');
    const movedGeometry = await geometry(page);
    assertGeometry(movedGeometry, 'after orbit');
    assert.notDeepEqual(movedGeometry.pins.map(p => [p.id, p.left, p.top]), oldGeometry.pins.map(p => [p.id, p.left, p.top]), 'Numbered pins follow the rotated components');
    receipt.orbitTracksPinsAndLeaders = true;

    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      await tick(page);
      const g = await geometry(page);
      assertGeometry(g, `width ${width}`);
      await card(page, 'winding').click();
      await assertSelected(page, 'winding');
      receipt.viewports.push({ width, scrollWidth: g.scrollWidth, modelWidth: g.scene.width, modelHeight: g.scene.height,
        cards: g.cards.length, leaderLines: g.lines.length, layout: g.linesVisible ? 'around model' : 'below model' });
      await capture(page, `bridge-callouts-${width}.png`);
    }

    for (const item of data.cases) {
      await page.locator('#case-select').selectOption(item.id);
      assert.deepEqual(await page.evaluate(() => window.thermalBridge.getState().sample), item.samples[0], `${item.id}: opening sample unchanged with guide active`);
      assert.equal(await page.locator('#estimated-hot').textContent(), '—', `${item.id}: result remains hidden before replay completion`);
      await page.locator('#timeline').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => window.thermalBridge.getState().complete);
      assert.deepEqual(await page.evaluate(() => window.thermalBridge.getState().sample), item.samples.at(-1), `${item.id}: final sample unchanged with guide active`);
      const estimate = Number.isFinite(item.result.estimated_hot_c) ? item.result.estimated_hot_c.toFixed(1) : '—';
      assert.equal(await page.locator('#estimated-hot').textContent(), estimate, `${item.id}: estimator result unchanged`);
      receipt.replayCases.push(item.id);
    }
    await guide(page, false);
    assert.equal((await state(page)).exploded, await page.locator('#bridge-exploded').isChecked(), 'Exiting guide keeps separation control synchronized');
    await page.locator('#bridge-exploded').setChecked(false);
    assert.equal((await state(page)).exploded, false, 'The ordinary separation checkbox can reassemble the model');
    await guide(page, true);
    await page.locator('#bridge-exploded').setChecked(false);
    await page.waitForFunction(() => document.querySelector('#bridge-guide').getAttribute('aria-pressed') === 'false');
    assert.equal(await page.locator('#bridge-callouts').isVisible(), false, 'Reassembling while the guide is active closes the exploded explanation');
    assert.equal((await state(page)).exploded, false);
    receipt.exitAndReassemble = true;

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('#bridge-spin').disabled);
    await page.locator('#bridge-spin').setChecked(true);
    assert.equal((await state(page)).autoRotate, true);
    await guide(page, true);
    assert.equal((await state(page)).autoRotate, false, 'Opening explanations stops a previously spinning model');
    assert.equal(await page.locator('#bridge-spin').isChecked(), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#bridge-spin').disabled);
    assert.equal((await state(page)).autoRotate, false);
    receipt.motion = { openingGuideStopsSpin: true, reducedMotionRespected: true };
    await page.goto(pathToFileURL(html).href + '?guide=1#experiment');
    await page.waitForFunction(() => window.thermalBridge?.scene?.getState().ready && window.thermalBridge.getGuideState().open);
    assert.equal(await page.locator('#bridge-callouts').isVisible(), true, 'The shareable guide URL opens its explanations');
    assert.equal((await state(page)).exploded, true);
    receipt.deepLinkOpensGuide = true;
    assert.deepEqual(receipt.errors, [], 'No client errors');
    assert.deepEqual(receipt.externalRequests, [], 'The annotated model stays self-contained offline');
    receipt.passed = true;
    console.log(JSON.stringify(receipt, null, 2));
    if (process.env.BRIDGE_CALLOUT_TEST_REPORT) fs.writeFileSync(process.env.BRIDGE_CALLOUT_TEST_REPORT, JSON.stringify(receipt, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
