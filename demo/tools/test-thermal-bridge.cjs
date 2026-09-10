/* Offline interaction and layout acceptance for the guarded concept replay. */
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
const receipt = { scope: 'Synthetic concept webpage acceptance; no physical validation.', offline: true, cases: [], viewports: [], errors: [], externalRequests: [] };
const expected = value => Number.isFinite(value) ? value.toFixed(1) : '—';

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}), args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', offline: true });
    page.on('pageerror', error => receipt.errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') receipt.errors.push(msg.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) receipt.externalRequests.push(request.url()); });
    await page.goto(pathToFileURL(html).href);
    await page.waitForFunction(() => window.thermalBridge && document.querySelectorAll('#hardware-svg [data-part]').length === 9);
    assert.equal(await page.locator('#case-select option').count(), data.cases.length);
    assert.match(await page.title(), /Guarded Thermal Bridge/);
    assert.equal(await page.locator('#estimated-hot').textContent(), '—', 'Final estimates stay hidden before final observation');
    assert.equal(await page.locator('#phase-list .phase').count(), data.cases[0].observations.length);
    assert.equal(await page.locator('#direct-reading').textContent(), '95.0°C');
    await page.locator('#schematic-details summary').click();
    for (const id of ['guard', 'bond', 'pad', 'shunt', 'case', 'reference', 'adc', 'estimator', 'winding']) {
      await page.locator(`#hardware-svg [data-part="${id}"]`).click();
      assert.equal(await page.locator('#part-select').inputValue(), id);
      assert.equal(await page.evaluate(() => window.thermalBridge.getState().selected), id);
    }
    await page.locator('#part-select').selectOption('guard');
    assert.match(await page.locator('#part-role').textContent(), /heater\/cooler/);
    await page.locator('#step').click();
    assert.equal(await page.evaluate(() => window.thermalBridge.getState().index), 1);
    await page.locator('#speed').selectOption('30');
    await page.locator('#play').click();
    await page.waitForFunction(() => window.thermalBridge.getState().index > 3);
    await page.locator('#play').click();
    assert.equal(await page.evaluate(() => window.thermalBridge.getState().playing), false);
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false');

    for (const item of data.cases) {
      await page.locator('#case-select').selectOption(item.id);
      assert.equal(await page.locator('#estimated-hot').textContent(), '—');
      await page.locator('#timeline').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => window.thermalBridge.getState().complete);
      assert.equal(await page.locator('#estimated-hot').textContent(), expected(item.result.estimated_hot_c), `${item.id} temperature matches recorded result`);
      assert.match(await page.locator('#result-status').getAttribute('class'), new RegExp(item.result.status));
      assert.equal(await page.locator('#phase-list .done').count(), item.observations.length);
      if (['common_gain_bias', 'unguarded_leak'].includes(item.id)) {
        assert.equal(await page.locator('#bias-warning').isVisible(), true);
        assert.match(await page.locator('#bias-title').textContent(), /Consistency passed.*failed/);
        assert.match(await page.locator('#bias-copy').textContent(), /reference|truth/);
      }
      if (item.id === 'unguarded_leak') {
        assert.match(await page.locator('#bias-copy').textContent(), /85.0°C.*130.0°C/);
        if (screenshots) { fs.mkdirSync(screenshots, { recursive: true }); await page.screenshot({ path: path.join(screenshots, 'bridge-blind-spot-desktop.png'), fullPage: true }); }
      }
      receipt.cases.push({ id: item.id, status: item.result.status, observations: item.observations.length });
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.locator('#estimated-hot').textContent(), '—', 'Scrubbing back hides the final estimate');
      assert.match(await page.locator('#playback-status').textContent(), /Paused/);
    }

    await page.locator('#case-select').selectOption('nominal');
    await page.locator('#timeline').focus();
    await page.keyboard.press('End');
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.waitForFunction(() => Math.abs(document.querySelector('#hardware-svg').viewBox.baseVal.width - document.querySelector('#hardware').getBoundingClientRect().width) < 1);
      const geometry = await page.evaluate(() => {
        const overflow = [...document.querySelectorAll('#hardware-svg [data-part]')].flatMap(g => {
          const r = g.querySelector('rect').getBBox();
          return [...g.querySelectorAll('text')].filter(t => { const b = t.getBBox(); return b.x < -1 || b.x + b.width > r.width + 1 || b.y < -1 || b.y + b.height > r.height + 1; }).map(t => ({ component: g.dataset.part, text: t.textContent }));
        });
        return { viewport: innerWidth, width: document.documentElement.scrollWidth, labelsOutsideComponents: overflow, parts: document.querySelectorAll('#hardware-svg [data-part]').length };
      });
      assert.ok(geometry.width <= width + 1, `No horizontal overflow at ${width}: ${geometry.width}`);
      assert.deepEqual(geometry.labelsOutsideComponents, [], `Hardware labels stay within components at ${width}`);
      assert.equal(geometry.parts, 9);
      receipt.viewports.push(geometry);
      if (screenshots && [1440, 768, 320].includes(width)) {
        fs.mkdirSync(screenshots, { recursive: true });
        await page.screenshot({ path: path.join(screenshots, `bridge-nominal-${width}.png`), fullPage: true });
        if (width === 320) await page.locator('.diagram-panel').screenshot({ path: path.join(screenshots, 'bridge-hardware-320.png') });
      }
    }
    assert.equal(await page.locator('#live').getAttribute('aria-live'), 'polite');
    assert.equal(await page.locator('#timeline').getAttribute('aria-valuetext'), '83.0 seconds, D · challenge');
    assert.equal(await page.locator('.heat-path').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.deepEqual(receipt.externalRequests, [], 'Self-contained replay makes no external requests');
    assert.deepEqual(receipt.errors, [], 'No client errors');
    receipt.passed = true;
    console.log(JSON.stringify(receipt, null, 2));
    if (process.env.BRIDGE_TEST_REPORT) fs.writeFileSync(process.env.BRIDGE_TEST_REPORT, JSON.stringify(receipt, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
