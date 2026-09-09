'use strict';

// No browser, npm packages, machine-specific paths, or hardware are required.
// From the repository: node --test demo/tests/thermal-engine.test.cjs
// For a staged engine: THERMAL_ENGINE_PATH=/path/to/engine.js node --test <this file>
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const enginePath = process.env.THERMAL_ENGINE_PATH
  ? path.resolve(process.env.THERMAL_ENGINE_PATH)
  : path.resolve(__dirname, '../src/thermal-engine.js');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context, {filename: enginePath});
const E = context.ThermalQueueCore;
const TOL = 1e-8;

function close(actual, expected, message = '') {
  assert.ok(Math.abs(actual - expected) <= TOL,
    `${message}: expected ${expected}, received ${actual}`);
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

// Independent oracle: exhaust every available grid action and roll out all
// queued actions explicitly. This deliberately does not invert the one-step
// inequality with the engine's square-root formula.
function enumerateAdmissible(initialUpper, pending, demand, m) {
  const ceiling = m.limit - m.ambient;
  let state = initialUpper;
  let queuedPeak = state;
  for (const action of pending) {
    state = m.amax * state + m.bmax * action ** 2 + m.wmax;
    queuedPeak = Math.max(queuedPeak, state);
  }
  if (queuedPeak > ceiling + 1e-9) return {valid: false, action: 0, peak: queuedPeak};
  let best = null;
  for (let index = 0; index <= Math.floor((Math.min(demand, 1) + 1e-12) / m.step); index++) {
    const action = index * m.step;
    const next = m.amax * state + m.bmax * action ** 2 + m.wmax;
    const peak = Math.max(queuedPeak, next);
    // A stable affine zero-input tail lies between its start and equilibrium.
    const tailPeak = Math.max(next, m.wmax / (1 - m.amax));
    if (Math.max(peak, tailPeak) <= ceiling + 1e-9) best = {valid: true, action, peak};
  }
  assert.ok(best, 'Valid current/queued state must admit the zero-input tail');
  return best;
}

function inspect(s, label) {
  const v = E.snapshot(s);
  assert.equal(s.queue.length, 8, `${label}: accepted delay line remains exactly eight slots`);
  assert.equal(v.inside, true, `${label}: actual thermal state lies in its interval`);
  assert.equal(v.valid, true, `${label}: certificate remains valid under the model`);
  assert.ok(v.upper <= s.m.limit + TOL, `${label}: current upper bound`);
  assert.ok(v.predictedPeak <= s.m.limit + TOL, `${label}: queued upper bound`);
  assert.equal(s.stats.breaches, 0, `${label}: simulated thermal breaches`);
  assert.ok(s.requests.length <= 24, `${label}: bounded request buffer`);
  assert.ok(s.history.length <= 241, `${label}: bounded history`);
  assert.ok(v.effortPercent >= -TOL && v.effortPercent <= 100 + TOL, `${label}: delivered ratio`);
  for (const packet of s.queue) {
    assert.ok(packet.effort >= 0 && packet.effort <= s.m.cap + TOL, `${label}: effort cap`);
    assert.ok(packet.effort <= packet.requested + TOL, `${label}: requested effort`);
  }
}

test('the engine exports the documented standalone numerical and state API', () => {
  for (const name of ['model', 'propagate', 'intersect', 'admissible', 'create', 'request', 'tick', 'snapshot']) {
    assert.equal(typeof E[name], 'function', name);
  }
});

test('model rejects invalid bounds, sensor geometry, and unsafe zero-input equilibrium', () => {
  const invalid = [
    {limit: NaN}, {width: Infinity}, {ambient: 95}, {clip: 105}, {amin: -0.1},
    {amin: 0.999}, {amax: 1}, {bmin: -1}, {bmin: 2}, {bmax: 0},
    {wmin: -1}, {wmin: 0.1}, {eps: -1}, {step: 0}, {step: 1.1},
    {width: 0}, {cap: -0.1}, {cap: 1.1}, {wmax: 1}
  ];
  for (const settings of invalid) assert.throws(() => E.model(settings), /Invalid thermal settings/);
});

test('interval propagation contains independent model realizations at every parameter corner', () => {
  const random = rng(20260909);
  const m = E.model();
  for (let fixture = 0; fixture < 400; fixture++) {
    const lo = 80 * random(), hi = lo + 12 * random(), effort = random();
    const interval = E.propagate(lo, hi, effort, m);
    for (const initial of [lo, lo + (hi - lo) * random(), hi]) {
      for (const a of [m.amin, m.amax]) for (const b of [m.bmin, m.bmax]) {
        for (const w of [m.wmin, m.wmax]) {
          const actual = a * initial + b * effort ** 2 + w;
          assert.ok(actual >= interval[0] - TOL && actual <= interval[1] + TOL);
        }
      }
    }
  }
});

test('a clipped reading imposes a lower bound while preserving the prior upper bound', () => {
  const m = E.model();
  const result = E.intersect(60, 78, 95, m);
  close(result[0], 69.7);
  close(result[1], 78);
  assert.ok(result[1] + m.ambient > m.clip + m.eps,
    'The sensor ceiling cannot be treated as a finite upper temperature measurement');
});

test('an unclipped reading constrains both sides, while a missing reading retains prediction', () => {
  const m = E.model();
  const measured = E.intersect(40, 78, 80, m);
  close(measured[0], 54.7);
  close(measured[1], 55.3);
  const missing = E.intersect(40, 78, null, m);
  close(missing[0], 40);
  close(missing[1], 78);
});

test('invalid and inconsistent observations throw instead of producing a trusted estimate', () => {
  const m = E.model();
  for (const reading of [NaN, Infinity, 96]) {
    assert.throws(() => E.intersect(60, 78, reading, m), /Invalid sensor reading/);
  }
  assert.throws(() => E.intersect(0, 1, 95, m), /disagree/);
});

test('admission agrees with an exhaustive action-grid oracle for 1,200 seeded cases', () => {
  const random = rng(761044);
  for (let fixture = 0; fixture < 1200; fixture++) {
    const m = E.model({limit: 98 + 17 * random(), step: [0.05, 0.1, 0.2][fixture % 3]});
    const upper = 90 * random();
    const pending = Array.from({length: Math.floor(13 * random())}, () => Math.floor(21 * random()) / 20);
    const demand = random();
    const expected = enumerateAdmissible(upper, pending, demand, m);
    const actual = E.admissible(upper, pending, demand, m);
    assert.equal(actual.valid, expected.valid, `fixture ${fixture}`);
    close(actual.action, expected.action, `fixture ${fixture}: maximal grid action`);
    close(actual.peak, expected.peak, `fixture ${fixture}: sequence peak`);
  }
});

test('accepted queued heat reduces headroom compared with an empty queue', () => {
  const m = E.model();
  const empty = E.admissible(75, [], 1, m);
  const delayed = E.admissible(75, Array(8).fill(1), 1, m);
  assert.equal(empty.valid, true);
  assert.equal(delayed.valid, true);
  assert.ok(delayed.action < empty.action);
  assert.ok(delayed.peak > empty.peak);
});

test('infeasible current or queued upper bounds return invalid even for zero new effort', () => {
  const m = E.model();
  assert.equal(E.admissible(81, [], 0, m).valid, false);
  const hotQueue = E.admissible(79.9, [1, 1], 0, m);
  assert.equal(hotQueue.valid, false);
  assert.equal(hotQueue.action, 0);
});

test('initial state is valid at all selected control-panel corner combinations', () => {
  for (const limit of [98, 105, 115]) for (const width of [1, 3, 12]) {
    for (const cap of [0, 0.1, 0.55, 1]) inspect(E.create({limit, width, cap}), `${limit}/${width}/${cap}`);
  }
});

test('1,920 closed-loop corner transitions preserve bounds and exact FIFO order in both modes', () => {
  for (const limit of [98, 115]) for (const width of [1, 12]) {
    for (const cap of [0.1, 1]) for (const handling of ['reduce', 'wait']) {
      const s = E.create({limit, width, cap});
      s.handling = handling;
      for (let step = 0; step < 120; step++) {
        const before = s.queue.map(packet => ({id: packet.id, effort: packet.effort}));
        if (step % 13 === 0) E.request(s, ((step * 7) % 21) / 20, 'Seeded test request');
        E.tick(s);
        assert.equal(s.executing.id, before[0].id);
        close(s.executing.effort, before[0].effort);
        for (let index = 0; index < 7; index++) {
          assert.equal(s.queue[index].id, before[index + 1].id);
          close(s.queue[index].effort, before[index + 1].effort);
        }
        inspect(s, `${limit}/${width}/${cap}/${handling}/${step}`);
      }
    }
  }
});

test('a newly accepted command executes only after all eight pre-existing FIFO slots', () => {
  const s = E.create({cap: 0.5});
  s.automatic = false;
  s.requests = [];
  const ahead = s.queue.map(packet => packet.id);
  E.request(s, 0.2, 'Latency check');
  const id = s.requests[0].id;
  E.tick(s);
  assert.equal(s.queue[7].id, id);
  assert.equal(s.executing.id, ahead[0]);
  for (let index = 1; index < 8; index++) {
    E.tick(s);
    assert.equal(s.executing.id, ahead[index]);
  }
  E.tick(s);
  assert.equal(s.time, 9);
  assert.equal(s.executing.id, id);
  close(s.executing.effort, 0.2);
});

test('reduce mode accepts lower effort and records the limiting reason', () => {
  const s = E.create({cap: 0.1});
  s.automatic = false;
  const id = s.requests[0].id;
  E.tick(s);
  assert.equal(s.decision.kind, 'Limited');
  assert.match(s.decision.reason, /requested;.*admitted/);
  assert.equal(s.queue[7].id, id);
  close(s.queue[7].effort, 0.1);
  assert.equal(s.stats.scaled, 1);
  assert.equal(s.stats.rejected, 0);
});

test('wait mode expires all three impossible full-effort requests at 20 seconds, never early', () => {
  const s = E.create({cap: 0.1});
  s.automatic = false;
  s.handling = 'wait';
  for (let index = 0; index < 20; index++) {
    E.tick(s);
    assert.equal(s.stats.rejected, 0, `no early timeout at time ${s.time}`);
  }
  assert.equal(s.decision.kind, 'Waiting');
  assert.match(s.decision.reason, /Effort ceiling/);
  E.tick(s);
  assert.equal(s.stats.rejected, 3);
  assert.equal(s.stats.complete, 8, 'Only the pre-existing accepted packets execute');
  assert.equal(s.requests.length, 0);
  for (const record of s.recent) assert.match(record.reason, /20 s timeout/);
});

test('wait mode admits full effort when a request fits the model and configured cap', () => {
  const s = E.create({cap: 0.5});
  s.automatic = false;
  s.handling = 'wait';
  s.requests = [];
  E.request(s, 0.2);
  E.tick(s);
  assert.equal(s.decision.kind, 'Admitted');
  close(s.queue[7].effort, 0.2);
  assert.equal(s.requests.length, 0);
});

test('zero effort can be an admitted command; an impossible positive request is rejected', () => {
  const s = E.create({cap: 0});
  s.automatic = false;
  s.requests = [];
  E.request(s, 0.5);
  E.tick(s);
  assert.equal(s.decision.kind, 'Rejected');
  assert.match(s.decision.reason, /No positive effort/);
  assert.equal(s.queue[7].id, null);
  E.request(s, 0);
  const id = s.requests[0].id;
  E.tick(s);
  assert.equal(s.decision.kind, 'Admitted');
  assert.equal(s.queue[7].id, id);
  assert.equal(s.queue[7].effort, 0);
});

test('the bounded request buffer rejects overflow without changing accepted packets', () => {
  const s = E.create();
  const before = JSON.stringify(s.queue);
  let refused = 0;
  for (let index = 0; index < 30; index++) if (!E.request(s, 0.8)) refused++;
  assert.equal(s.requests.length, 24);
  assert.equal(refused, 9);
  assert.equal(s.stats.rejected, 9);
  assert.equal(JSON.stringify(s.queue), before);
  assert.equal(s.recent.length, 4);
  assert.match(s.recent[0].reason, /Request buffer full/);
});

test('invalid effort is rejected before mutating sequence or pending requests', () => {
  const s = E.create();
  const before = JSON.stringify({sequence: s.sequence, requests: s.requests, stats: s.stats});
  for (const effort of [-0.01, 1.01, NaN, Infinity, '0.5']) {
    assert.throws(() => E.request(s, effort), /Effort must be between/);
  }
  assert.equal(JSON.stringify({sequence: s.sequence, requests: s.requests, stats: s.stats}), before);
});

test('an inconsistent interval latches invalidity and cannot cancel already accepted commands', () => {
  const s = E.create();
  s.automatic = false;
  const originalHead = s.queue[0].id;
  s.lo = 0;
  s.hi = 1;
  E.tick(s);
  assert.equal(s.valid, false);
  assert.equal(s.decision.kind, 'Invalid');
  assert.equal(s.executing.id, originalHead);
  assert.equal(s.queue[7].id, null);
  assert.equal(s.stats.rejected, 1);
  s.lo = 0;
  s.hi = 90;
  E.tick(s);
  assert.equal(s.valid, false, 'A later compatible observation must not clear the fault');
  assert.equal(E.snapshot(s).valid, false);
});

test('reset-by-create restores a valid fresh state without sharing mutable state', () => {
  const previous = E.create();
  previous.lo = 0;
  previous.hi = 1;
  E.tick(previous);
  previous.stats.rejected = 99;
  const fresh = E.create({limit: 98, width: 12, cap: 0.1});
  inspect(fresh, 'reset');
  assert.equal(fresh.time, 0);
  assert.equal(fresh.stats.rejected, 0);
  assert.equal(fresh.history.length, 1);
  assert.equal(fresh.requests.length, 3);
  assert.notEqual(fresh.queue, previous.queue);
  assert.notEqual(fresh.stats, previous.stats);
  fresh.queue[0].effort = 0;
  assert.notEqual(fresh.queue[0], previous.queue[0]);
});

test('metrics reconcile with an independent execution ledger, including primed packets and idle slots', () => {
  const s = E.create({cap: 0.5});
  s.automatic = false;
  s.requests = [];
  for (const effort of [0, 0.2, 0.8]) E.request(s, effort);
  let complete = 0, delivered = 0, requested = 0;
  for (let index = 0; index < 32; index++) {
    E.tick(s);
    if (s.executing.id !== null) {
      complete++;
      delivered += s.executing.effort;
      requested += s.executing.requested;
    }
  }
  const v = E.snapshot(s);
  assert.equal(complete, 11, 'Eight primed commands plus three injected commands');
  assert.equal(s.stats.complete, complete);
  close(s.stats.delivered, delivered);
  close(s.stats.requestedCompleted, requested);
  close(v.effortPercent, 100 * delivered / requested);
  close(v.throughput, complete / 32);
  close(v.breachRate, 0);
  assert.equal(s.stats.scaled, 1);
  assert.equal(s.stats.rejected, 0);
  assert.equal(v.effort, 0, 'Trailing idle slot has no effort');
});

test('breach count and rate report an injected out-of-model overtemperature', () => {
  const s = E.create();
  s.automatic = false;
  s.x = 95;
  E.tick(s);
  assert.equal(s.stats.breaches, 1);
  close(E.snapshot(s).breachRate, 100);
  assert.equal(E.snapshot(s).inside, false);
});

test('history remains a chronological 241-sample window and the snapshot exposes finite metrics', () => {
  const s = E.create();
  for (let index = 0; index < 260; index++) E.tick(s);
  assert.equal(s.history.length, 241);
  assert.equal(s.history[0].time, 20);
  assert.equal(s.history[240].time, 260);
  for (let index = 1; index < s.history.length; index++) {
    assert.equal(s.history[index].time, s.history[index - 1].time + 1);
  }
  const v = E.snapshot(s);
  for (const field of ['temperature', 'lower', 'upper', 'limit', 'reading', 'effort', 'time',
    'remaining', 'capacity', 'predictedPeak', 'effortPercent', 'breachRate', 'throughput']) {
    assert.ok(Number.isFinite(v[field]), field);
  }
  for (const field of ['inside', 'clipped', 'valid']) assert.equal(typeof v[field], 'boolean', field);
  close(s.history.at(-1).actual, v.temperature);
  close(s.history.at(-1).reading, v.reading);
});
