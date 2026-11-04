import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { profileSections, profileSection, profileKeyIndex, profileAnchor } from '../src/lib/profile-tabs.ts';
import { canOpenHub } from '../src/lib/project-hub.ts';
const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/profile-tabs.ts', import.meta.url), 'utf8')).replace(/^import[^;]+;/gm, '').replace('export function', 'function');
function fixture(hash = '', motionOff = false) {
  let focused = '', entries = 0;
  const animations = [], events = {}, panes = {};
  const tabs = profileSections.map(({ id }) => ({ dataset: { profileTab: id }, attrs: {}, events: {}, tabIndex: 0,
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, v) { this.events[k] = v; }, focus() { focused = id; } }));
  const panels = profileSections.map(({ id }) => {
    const pane = { scrollTop: 0, focus() { focused = `reader-${id}`; }, getBoundingClientRect: () => ({ top: 100 }),
      querySelector(selector) {
        const anchor = /data-profile-anchor="([^"]+)"/.exec(selector)?.[1];
        const top = { education: 80, campus: 700, skills: 1050 }[anchor];
        return id === 'info' && top !== undefined ? { getBoundingClientRect: () => ({ top: 100 + top - this.scrollTop }) } : null;
      },
    };
    panes[id] = pane;
    return { id, hidden: false, querySelector: () => pane,
      animate(frames, options) { const a = { id, frames, options, cancelled: false, cancel() { this.cancelled = true; } }; animations.push(a); return a; } };
  });
  const shell = { dataset: {}, querySelectorAll: s => s === '[data-profile-tab]' ? tabs : panels };
  const location = { hash };
  const context = vm.createContext({ matchMedia: () => ({ matches: motionOff }), profileSection, profileKeyIndex, profileAnchor, canOpenHub, location,
    history: { replaceState: (_, __, url) => { location.hash = url; entries++; } }, window: { addEventListener: (k, v) => { events[k] = v; } } });
  vm.runInContext(source, context); const api = context.createProfileTabs(shell);
  function click(id, extra = {}) { let prevented = false; tabs.find(t => t.dataset.profileTab === id).events.click({ button: 0, ...extra, preventDefault() { prevented = true; } }); return prevented; }
  return { api, tabs, panels, panes, location, events, click, animations, state: () => ({ focused, entries, active: panels.filter(p => !p.hidden).map(p => p.id) }) };
}
test('PF01: default, direct and invalid chapters always produce one visible panel', () => {
  for (const [hash, want] of [['', 'info'], ['#games', 'games'], ['#missing', 'info'], ['#%E0%A4', 'info']]) {
    const f = fixture(hash); assert.deepEqual(f.state().active, [want]);
    assert.equal(f.tabs.filter(t => t.tabIndex === 0).length, 1);
    assert.equal(f.tabs.find(t => t.tabIndex === 0).attrs['aria-selected'], 'true');
  }
});
test('PF02: each real scroll pane remembers its position without moving the other panes', () => {
  const f = fixture(); f.panes.info.scrollTop = 125; f.click('projects'); assert.equal(f.panes.projects.scrollTop, 0);
  f.panes.projects.scrollTop = 640; f.click('games'); f.panes.games.scrollTop = 320;
  f.click('projects'); assert.equal(f.panes.projects.scrollTop, 640);
  f.click('info'); assert.equal(f.panes.info.scrollTop, 125); assert.equal(f.panes.games.scrollTop, 320); assert.equal(f.location.hash, '#info');
});
test('PF03: four-tab keyboard focus wraps, Home/End work, vertical reading remains native', () => {
  const f = fixture(); const fire = (i, key) => { let prevented = false; f.tabs[i].events.keydown({ key, preventDefault() { prevented = true; } }); return prevented; };
  assert.equal(fire(0, 'ArrowLeft'), true); assert.equal(f.state().focused, 'games');
  fire(3, 'Home'); assert.deepEqual(f.state().active, ['info']);
  fire(0, 'End'); assert.deepEqual(f.state().active, ['games']);
  assert.equal(fire(3, 'ArrowDown'), false); assert.equal(fire(3, 'PageDown'), false);
});
test('PF04: modified tab links and skip-to-content preserve browser behavior', () => {
  const f = fixture(); assert.equal(f.click('games', { metaKey: true }), false); assert.deepEqual(f.state().active, ['info']);
  f.location.hash = '#games'; f.events.hashchange(); assert.deepEqual(f.state().active, ['games']);
  f.location.hash = '#main-content'; f.events.hashchange(); assert.deepEqual(f.state().active, ['games']); assert.equal(f.state().focused, 'reader-games');
});
test('PF05: chapter transitions are cancellable and respect reduced motion', () => {
  const f = fixture(); assert.equal(f.animations.length, 0); f.click('projects'); assert.equal(f.animations[0].id, 'projects'); f.click('games'); assert.equal(f.animations[0].cancelled, true); assert.equal(f.animations.at(-1).id, 'games');
  const quiet = fixture('', true); quiet.click('games'); assert.equal(quiet.animations.length, 0);
});
test('PF06: old education, campus and skills links open their section in the merged personal reader', () => {
  for (const [id, top] of [['education', 80], ['campus', 700], ['skills', 1050]]) {
    const f = fixture(`#${id}`); assert.deepEqual(f.state().active, ['info']);
    assert.equal(f.panes.info.scrollTop, top); assert.equal(f.location.hash, `#${id}`);
    assert.equal(f.tabs.length, 4);
  }
});
test('PF07: external subsection changes scroll the personal reader even when already selected', () => {
  const f = fixture('#skills'); f.panes.info.scrollTop = 1300;
  f.location.hash = '#campus'; f.events.hashchange(); assert.equal(f.panes.info.scrollTop, 700);
  f.click('games'); f.location.hash = '#education'; f.events.hashchange();
  assert.deepEqual(f.state().active, ['info']); assert.equal(f.panes.info.scrollTop, 80);
});
