import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installEntryGate } from '../src/scripts/entry-gate.ts';

function enter({ stored, referrer = '', blocked = false } = {}) {
  const root = { dataset: {} }, shell = { inert: true }, boot = { hidden: false }, timers = [];
  const context = { URL, location: { origin: 'https://portfolio.example' },
    document: { documentElement: root, referrer, getElementById: id => id === 'console-shell' ? shell : boot },
    sessionStorage: { getItem() { if (blocked) throw Error('denied'); return stored; } },
    setTimeout: (callback, delay) => timers.push({ callback, delay }) };
  vm.runInNewContext(`(${installEntryGate.toString()})('current-assets')`, context);
  return { root, shell, boot, timers };
}
test('G01: a first direct visit gates HTML before module startup', () => {
  const state = enter();
  assert.equal(state.root.dataset.startup, 'pending');
  assert.equal(state.root.dataset.assetKey, 'current-assets');
});
test('G02: prepared assets or a same-origin return do not replay initial loading', () => {
  for (const options of [{ stored: 'current-assets' }, { referrer: 'https://portfolio.example/works/abyss/' }]) {
    const state = enter(options);
    assert.equal(state.root.dataset.startup, 'ready');
    assert.equal(state.timers.length, 0);
  }
});
test('G03: new image contents and external referrers still require readiness', () => {
  assert.equal(enter({ stored: 'old-assets', referrer: 'https://elsewhere.example/' }).root.dataset.startup, 'pending');
});
test('G04: denied session storage cannot break startup or same-site navigation', () => {
  assert.equal(enter({ blocked: true }).root.dataset.startup, 'pending');
  assert.equal(enter({ blocked: true, referrer: 'https://portfolio.example/about/' }).root.dataset.startup, 'ready');
});
test('G05: watchdog releases missing-JS HTML but never bypasses an active image loader', () => {
  const broken = enter();
  assert.equal(broken.timers[0].delay, 15000);
  broken.timers[0].callback();
  assert.equal(broken.root.dataset.startup, 'ready');
  assert.equal(broken.shell.inert, false);
  assert.equal(broken.boot.hidden, true);
  const running = enter(); running.root.dataset.startup = 'loading';
  running.timers[0].callback();
  assert.equal(running.root.dataset.startup, 'loading');
});
