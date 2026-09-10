/* Offline acceptance of the reference-excited bridge evidence webpage.
 * Passing these checks establishes presentation behavior, not physical validation.
 */
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const repo = path.resolve(__dirname, '../..');
const html = path.resolve(process.env.REFERENCE_BRIDGE_HTML || path.join(repo, 'reference-bridge.html'));
const sourceBytes = fs.readFileSync(path.join(repo, 'project/reference_bridge/results.json'));
const data = JSON.parse(sourceBytes.toString('utf8'));
const dynamic = JSON.parse(fs.readFileSync(path.join(repo, 'project/reference_bridge/dynamic_results.json'), 'utf8'));
const screenshots = process.env.REFERENCE_BRIDGE_SCREENSHOT_DIR;
const receipt = {
  scope: 'Offline webpage acceptance of stored synthetic evidence; no physical validation.',
  offline: true, cases: [], dynamicCases: [], viewports: [], errors: [], externalRequests: [],
};
const number = (value, digits = 1) => Number(value).toFixed(digits);
const temperature = value => value === null || value === undefined ? 'Not identified' : `${number(value)}°C`;
const interval = values => values ? values.map(value => number(value)).join('–') : 'Not certified';
const statusText = status => status === 'model_consistent' ? 'Model consistent · conditional only' : 'Inconclusive';

async function state(page) { return page.evaluate(() => window.referenceBridgeEvidence.getState()); }
async function screenshot(page, name) {
  if (!screenshots) return;
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, name), fullPage: true });
}

async function assertCase(page, item) {
  const result = item.result;
  const current = await state(page);
  assert.equal(current.caseId, item.id);
  assert.deepEqual(current.result, result, `${item.id}: embedded result matches stored report`);
  assert.equal(await page.locator('#case-content').getAttribute('data-case-id'), item.id);
  assert.equal(await page.locator('#case-content').getAttribute('data-status'), result.status);
  assert.equal(await page.locator('#case-description').textContent(), item.evaluation);
  assert.equal(await page.locator('#decision-status').textContent(), statusText(result.status));
  assert.equal(await page.locator('#decision-reason').textContent(), result.reason);
  assert.equal(await page.locator('#truth-value').textContent(), temperature(item.plant_truth.hot_c));
  assert.equal(await page.locator('#point-value').textContent(), temperature(result.estimated_hot_c));
  assert.equal(await page.locator('#interval-value').textContent(), interval(result.source_interval_c));
  assert.equal(await page.locator('#interval-note').textContent(), result.interval_width_c === null
    ? 'No finite qualified source interval is available.'
    : `Width ${number(result.interval_width_c)}°C. Proposed precision limit: ${number(data.protocol.criteria.maximum_interval_width_c, 0)}°C.`);

  const rows = await page.locator('#observations tbody tr').evaluateAll(elements =>
    elements.map(row => ({ cells: [...row.cells].map(cell => cell.textContent), holdout: row.classList.contains('holdout') })));
  assert.deepEqual(rows, item.observations.map((observation, index) => ({
    cells: [
      `${observation.phase} · ${index === 4 ? 'HELD OUT' : 'fit'}`,
      number(observation.pad_c, 3), number(observation.guard_c, 3), number(observation.reference_c, 3),
      number(observation.shunt_w_per_k, 4),
      `${observation.clipped ? 'CLIPPED' : 'Readable'} / ${observation.settled ? 'settled' : 'not settled'}`,
    ], holdout: index === 4,
  })), `${item.id}: the five observation rows retain their values and held-out role`);

  const details = await page.locator('#details .kv').evaluateAll(elements => Object.fromEntries(
    elements.map(row => [row.querySelector('span').textContent, row.querySelector('strong').textContent])));
  assert.deepEqual(details, {
    'Held-out pad discrepancy': result.holdout_error_c === null ? 'Not available' : `${number(result.holdout_error_c, 4)}°C`,
    'Minimum possible bond': result.minimum_possible_bond_w_per_k === null ? 'Not certified' : `${number(result.minimum_possible_bond_w_per_k, 5)} W/K`,
    'Model classification': result.model_classification.replaceAll('_', ' '),
    'Physical validation': 'Not performed', 'Motor permission': 'Not authorized',
  });

  const falseCool = item.evaluation_only.model_under_limit_while_true_hot;
  assert.equal(await page.locator('#failure-warning').isVisible(), falseCool,
    `${item.id}: hidden-path failure visibility follows the recorded evaluation`);
  if (falseCool) {
    const warning = await page.locator('#failure-copy').textContent();
    assert.ok(warning.includes(temperature(item.plant_truth.hot_c)));
    assert.ok(warning.includes(temperature(result.estimated_hot_c)));
    assert.ok(warning.includes(`${interval(result.source_interval_c)}°C`));
    assert.match(warning, /unexcited ambient path/);
    assert.match(warning, /incorrect/);
  }
  assert.equal(await page.locator('#history polyline').count(), 5, 'All five recorded channels are plotted');
  assert.match(await page.locator('#history').getAttribute('aria-label'), /Full stored temperature trace/);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', offline: true });
    page.on('pageerror', error => receipt.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
    page.on('request', request => {
      if (/^(?:https?|wss?):/.test(request.url())) receipt.externalRequests.push(request.url());
    });
    page.on('websocket', socket => receipt.externalRequests.push(socket.url()));
    await page.goto(pathToFileURL(html).href);
    await page.waitForFunction(() => Boolean(window.referenceBridgeEvidence));
    assert.match(await page.title(), /Reference-excited thermal bridge/);
    assert.equal(data.cases.length, 14, 'All fourteen frozen cases are expected in this evidence release');
    assert.equal(await page.locator('#case-select option').count(), data.cases.length);
    assert.equal(await page.getByLabel('Experiment case', { exact: true }).count(), 1, 'The selector has an accessible label');
    assert.equal(await page.locator('#case-select').getAttribute('aria-controls'), 'case-content');
    assert.equal(await page.locator('#live-status').getAttribute('aria-live'), 'polite');
    assert.equal((await state(page)).caseCount, data.cases.length);
    const hash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
    assert.ok((await page.locator('#report-hash').textContent()).includes(hash), 'The visible source hash matches the actual bundled report');

    for (const item of data.cases) {
      await page.locator('#case-select').selectOption(item.id);
      await assertCase(page, item);
      receipt.cases.push({ id: item.id, status: item.result.status, observationRows: item.observations.length,
        pointAndIntervalVerified: true, holdoutVerified: true,
        falseCoolWarning: item.evaluation_only.model_under_limit_while_true_hot });
    }

    // Exercise a real keyboard path through the native selector, including its
    // change event, rather than assigning the value through the page API.
    const selector = page.getByLabel('Experiment case', { exact: true });
    await selector.focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(id => window.referenceBridgeEvidence.getState().caseId === id, data.cases[1].id);
    await assertCase(page, data.cases[1]);
    receipt.keyboardSelector = true;

    await page.locator('#show-default').click();
    await assertCase(page, data.cases[0]);
    assert.equal((await state(page)).index, 0);
    const initialPoint = await page.locator('#point-value').textContent();
    await page.locator('#timeline').focus();
    await page.keyboard.press('End');
    assert.equal((await state(page)).index, data.cases[0].samples.length - 1);
    assert.equal(await page.locator('#point-value').textContent(), initialPoint,
      'The full-experiment estimate remains visible when the trace cursor moves');
    assert.equal(await page.locator('#time-value').textContent(),
      `${number(data.cases[0].samples.at(-1).time_s)} / ${number(data.cases[0].samples.at(-1).time_s, 0)} s`);
    await page.locator('#reset').click();
    await page.locator('#play').click();
    await page.waitForFunction(() => window.referenceBridgeEvidence.getState().index > 1, null, { timeout: 5000 });
    await page.locator('#play').click();
    assert.equal((await state(page)).playing, false);
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false');
    receipt.traceControls = { keyboardScrubbing: true, completeResultPreserved: true, playPause: true };

    assert.equal(dynamic.cases.length, 3);
    assert.equal(await page.locator('#dynamic-cases .dynamic-card').count(), dynamic.cases.length);
    assert.equal((await state(page)).dynamicCount, dynamic.cases.length);
    for (const item of dynamic.cases) {
      const card = page.locator(`#dynamic-cases [data-dynamic-id="${item.id}"]`);
      assert.equal(await card.count(), 1);
      assert.equal(await card.getAttribute('data-status'), item.result.status);
      assert.equal(await card.locator('.state').textContent(), item.result.status.replaceAll('_', ' ').toUpperCase());
      const paragraphs = await card.locator('p').allTextContents();
      assert.ok(paragraphs.includes(item.description));
      assert.ok(paragraphs.includes(item.result.reason));
      assert.ok(paragraphs.includes(`Step-refinement difference: ${Number(item.step_refinement.maximum_matched_transient_temperature_difference_c).toExponential(2)}°C. Maximum energy residual: ${Number(item.plant.numerics.maximum_energy_balance_residual_j).toExponential(2)} J.`));
      assert.equal(item.result.status, 'inconclusive', 'All three finite-rate outcomes remain inconclusive');
      receipt.dynamicCases.push({ id: item.id, status: item.result.status, numericalValuesVerified: true });
    }

    await page.locator('#show-failure').click();
    const ambient = data.cases.find(item => item.id === 'unexcited_ambient_leak');
    await assertCase(page, ambient);
    await screenshot(page, 'reference-bridge-ambient-failure-desktop.png');
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.waitForFunction(() => {
        const plot = document.querySelector('#history');
        return Math.abs(plot.viewBox.baseVal.width - Math.max(250, plot.clientWidth)) < 1;
      });
      const geometry = await page.evaluate(() => ({
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        selectorWidth: document.querySelector('#case-select').getBoundingClientRect().width,
      }));
      assert.ok(geometry.documentWidth <= width + 1, `No document overflow at ${width}: ${geometry.documentWidth}`);
      assert.ok(geometry.bodyWidth <= width + 1, `No body overflow at ${width}: ${geometry.bodyWidth}`);
      assert.ok(geometry.selectorWidth > 0 && geometry.selectorWidth <= width);
      assert.equal(await page.locator('#failure-warning').isVisible(), true, 'The failure warning remains available on small screens');
      receipt.viewports.push(geometry);
      if ([1440, 768, 390, 320].includes(width)) await screenshot(page, `reference-bridge-${width}.png`);
    }
    assert.deepEqual(receipt.externalRequests, [], 'The single-file evidence page makes no network requests');
    assert.deepEqual(receipt.errors, [], 'No browser errors');
    receipt.passed = true;
    console.log(JSON.stringify(receipt, null, 2));
    if (process.env.REFERENCE_BRIDGE_TEST_REPORT) {
      fs.writeFileSync(process.env.REFERENCE_BRIDGE_TEST_REPORT, JSON.stringify(receipt, null, 2) + '\n');
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
