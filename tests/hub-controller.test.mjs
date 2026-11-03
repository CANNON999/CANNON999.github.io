import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { canOpenHub, consoleRoute } from '../src/lib/project-hub.ts';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/project-hub.ts', import.meta.url), 'utf8'))
  .replace(/^import[^;]+;/m, '').replace('export function', 'function');

function fixture({ loading = false, reduced = false, hash = '#profile' } = {}) {
  const classes = () => {
    const values = new Set();
    return { add: (...items) => items.forEach(item => values.add(item)), remove: (...items) => items.forEach(item => values.delete(item)), contains: item => values.has(item) };
  };
  const events = new Map(), windowEvents = new Map(), timers = new Map(), frames = new Map();
  let serial = 0, selected = '', focus = '', restored = 0;
  const scenes = ['abyss', 'city'].map(id => ({ dataset: { hubId: id }, hidden: true,
    querySelector: selector => selector === '.hub-name' ? { textContent: id } : { focus: () => { focus = id; } } }));
  const dialog = { open: false, classList: classes(), scrollTop: 0, offsetWidth: 1200,
    querySelectorAll: () => scenes, setAttribute() {},
    showModal() { this.open = true; },
    close() { this.open = false; events.get('close')?.({}); },
    addEventListener: (name, handler) => events.set(name, handler),
  };
  const document = { title: 'Home', body: { classList: classes() }, querySelector: () => dialog, querySelectorAll: () => [] };
  const location = { hash };
  const entries = [{ hash, state: null }];
  let position = 0;
  const history = { state: null,
    replaceState(state, _, nextHash) { this.state = state; location.hash = nextHash; entries[position] = { hash: nextHash, state }; },
    pushState(state, _, nextHash) { entries.splice(++position); entries.push({ hash: nextHash, state }); this.state = state; location.hash = nextHash; },
    back() { if (position > 0) { const entry = entries[--position]; this.state = entry.state; location.hash = entry.hash; windowEvents.get('popstate')(); } },
  };
  const context = vm.createContext({ canOpenHub, consoleRoute, document, location, history, scrollY: 0,
    window: { addEventListener: (name, handler) => windowEvents.set(name, handler), scrollTo() {} },
    setTimeout: fn => { timers.set(++serial, fn); return serial; }, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; }, cancelAnimationFrame: id => frames.delete(id),
  });
  vm.runInContext(source, context);
  const api = context.createProjectHub({ select: id => { selected = id; }, restoreFocus: () => { restored++; }, motionOff: () => reduced, isLoading: () => loading });
  const flush = map => { const jobs = [...map.values()]; map.clear(); jobs.forEach(job => job()); };
  return { api, dialog, document, location, history, scenes, entries,
    frame: () => flush(frames), finish: () => flush(timers),
    cancel: () => events.get('cancel')({ preventDefault() {} }),
    dismiss: () => dialog.close(),
    state: () => ({ selected, focus, restored }),
  };
}

test('H09: clicking a work opens ready HTML and records a reversible route', () => {
  const f = fixture(); f.api.open('abyss'); f.frame();
  assert.equal(f.api.isOpen(), true);
  assert.equal(f.location.hash, '#hub-abyss');
  assert.deepEqual(f.entries.map(entry => entry.hash), ['#abyss', '#hub-abyss']);
  assert.equal(f.scenes.filter(scene => !scene.hidden).length, 1);
  assert.equal(f.state().focus, 'abyss');
  assert.equal(f.document.body.classList.contains('hub-open'), true);
});
test('H10: Escape reverses the transition and restores the selected cover', () => {
  const f = fixture(); f.api.open('abyss'); f.frame(); f.cancel(); f.finish();
  assert.equal(f.location.hash, '#abyss');
  assert.equal(f.api.isOpen(), false);
  assert.equal(f.document.body.classList.contains('hub-open'), false);
  assert.equal(f.document.title, 'Home');
  assert.equal(f.state().selected, 'abyss');
  assert.ok(f.state().restored > 0);
});
test('H11: browser-managed native dismissal cannot leave the homepage invisible', () => {
  const f = fixture(); f.api.open('abyss'); f.frame(); f.dismiss();
  assert.equal(f.document.body.classList.contains('hub-open'), false);
  assert.equal(f.dialog.classList.contains('is-open'), false);
  assert.equal(f.location.hash, '#abyss');
  assert.equal(f.document.title, 'Home');
  assert.ok(f.scenes.every(scene => scene.hidden));
  f.api.open('city'); f.frame();
  assert.equal(f.api.isOpen(), true);
  assert.equal(f.location.hash, '#hub-city');
});
test('H12: a stale close callback cannot close a newly opened hub', () => {
  const f = fixture(); f.api.open('abyss'); f.frame(); f.cancel();
  f.api.open('city'); f.frame(); f.finish();
  assert.equal(f.api.isOpen(), true);
  assert.equal(f.location.hash, '#hub-city');
  assert.equal(f.scenes.find(scene => !scene.hidden).dataset.hubId, 'city');
});
test('H13: direct hub hashes do not create a loop in history; reduced motion closes immediately', () => {
  const f = fixture({ hash: '#hub-abyss', reduced: true }); f.api.syncRoute(); f.frame();
  assert.equal(f.entries.length, 1);
  assert.equal(f.api.isOpen(), true);
  f.cancel();
  assert.equal(f.api.isOpen(), false);
  assert.equal(f.location.hash, '#abyss');
});
test('H14: loading and unknown projects cannot bypass the entry gate', () => {
  const loading = fixture({ loading: true }); loading.api.open('abyss');
  assert.equal(loading.api.isOpen(), false);
  assert.equal(loading.location.hash, '#profile');
  const normal = fixture(); normal.api.open('missing');
  assert.equal(normal.api.isOpen(), false);
});
