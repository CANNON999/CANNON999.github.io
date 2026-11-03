import test from 'node:test';
import assert from 'node:assert/strict';
import { hubResources, consoleRoute, canOpenHub } from '../src/lib/project-hub.ts';

test('H01: document is the primary action; all other links remain accessible', () => {
  const resources = [
    { label: 'Video one', kind: 'video', url: 'https://example.com/video1', code: 'abcd' },
    { label: 'Build', kind: 'download', url: 'https://example.com/build' },
    { label: 'Design', kind: 'document', url: 'https://example.com/design' },
    { label: 'Video two', kind: 'video', url: 'https://example.com/video2' },
    { label: 'Source', kind: 'source', url: 'https://example.com/source' },
  ];
  const result = hubResources(resources, 'abyss');
  assert.equal(result.primary, resources[2]);
  assert.equal(result.groups.flatMap(group => group.resources).length, resources.length);
  assert.deepEqual(result.groups[1].resources, [resources[0], resources[3]]);
  assert.deepEqual(result.groups[2].resources, [resources[1], resources[4]]);
  assert.equal(result.groups[1].resources[0].code, 'abcd');
});
test('H02: absent resources create three honest placeholders and a working local primary link', () => {
  const result = hubResources([], 'blackhole');
  assert.equal(result.groups.length, 3);
  assert.ok(result.groups.every(group => group.resources.length === 0));
  assert.equal(result.primary.url, '/works/blackhole/#project-story');
  assert.equal(result.primary.label, '查看作品介绍');
});
test('H03: video, download and source-only projects retain a usable primary action', () => {
  for (const kind of ['video', 'download', 'source']) {
    const resource = { kind, label: kind, url: `https://example.com/${kind}` };
    assert.equal(hubResources([resource], 'project').primary, resource);
  }
});
test('H04: hub deep links and restored history resolve the same selected project', () => {
  assert.deepEqual(consoleRoute('#hub-abyss', ['abyss', 'tanks']), { selected: 'abyss', hub: 'abyss' });
  assert.deepEqual(consoleRoute('#abyss', ['abyss', 'tanks']), { selected: 'abyss', hub: null });
  assert.deepEqual(consoleRoute('#profile', ['abyss']), { selected: 'profile', hub: null });
});
test('H05: unknown, malformed and empty routes never open a missing hub', () => {
  for (const hash of ['', '#', '#hub-', '#hub-missing', '#%E0%A4%A', '#constructor', '#__proto__']) {
    assert.deepEqual(consoleRoute(hash, ['abyss']), { selected: 'welcome', hub: null });
  }
});
test('H06: hyphenated project ids can be shared and opened', () => {
  assert.deepEqual(consoleRoute('#hub-my-new-level', ['my-new-level']), { selected: 'my-new-level', hub: 'my-new-level' });
});
test('H07: modified and middle clicks preserve browser new-tab behavior', () => {
  assert.equal(canOpenHub({ button: 0 }), true);
  for (const event of [{ button: 1 }, { button: 2 }, { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }]) assert.equal(canOpenHub(event), false);
});
test('H08: resource grouping does not mutate the author’s content or ordering', () => {
  const resources = Object.freeze([Object.freeze({ kind: 'source', label: 'Source', url: 'https://example.com/source' })]);
  const first = hubResources(resources, 'tanks');
  first.groups[2].resources.push({ kind: 'download', label: 'Other', url: 'https://example.com/other' });
  assert.equal(resources.length, 1);
  assert.equal(hubResources(resources, 'tanks').groups[2].resources.length, 1);
});

test('H15: welcome and profile are distinct, shareable personal scenes', () => {
  for (const id of ['welcome', 'profile']) {
    assert.deepEqual(consoleRoute(`#${id}`, ['abyss', 'notes']), { selected: id, hub: null });
  }
  assert.deepEqual(consoleRoute('', ['abyss']), { selected: 'welcome', hub: null });
});
test('H16: personal scenes never resolve to phantom project hubs', () => {
  for (const hash of ['#hub-welcome', '#hub-profile']) {
    assert.deepEqual(consoleRoute(hash, ['abyss', 'notes']), { selected: 'welcome', hub: null });
  }
});
