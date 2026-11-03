import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImages } from '../src/scripts/image-readiness.ts';
const flush = () => new Promise(resolve => setImmediate(resolve));

test('L01: readiness waits for the last decode, not just the first downloaded image', async () => {
  const releases = {}, progress = [];
  let finished = false;
  const ready = prepareImages(['a', 'b'], { load: url => new Promise(resolve => { releases[url] = resolve; }), onProgress: p => progress.push(p) }).then(r => { finished = true; return r; });
  await flush(); releases.a(); await flush();
  assert.equal(finished, false);
  assert.deepEqual(progress.at(-1), { ready: 1, settled: 1, total: 2 });
  releases.b();
  assert.deepEqual(await ready, { ready: 2, total: 2, failed: [] });
});
test('L02: duplicate and empty URLs do not inflate requests or progress', async () => {
  const requested = [];
  const result = await prepareImages(['a', 'a', '', 'b'], { load: async url => { requested.push(url); } });
  assert.deepEqual(requested.sort(), ['a', 'b']);
  assert.deepEqual(result, { ready: 2, total: 2, failed: [] });
});
test('L03: broken and synchronously failing assets settle without hiding successful ones', async () => {
  const result = await prepareImages(['ok', '404', 'throw'], { load: url => { if (url === 'throw') throw Error('failed'); return url === '404' ? Promise.reject(Error('404')) : Promise.resolve(); } });
  assert.equal(result.ready, 1);
  assert.deepEqual(result.failed.sort(), ['404', 'throw']);
});
test('L04: a stalled asset times out and late completion cannot change settled progress', async () => {
  let release; const progress = [];
  const result = await prepareImages(['slow'], { load: () => new Promise(resolve => { release = resolve; }), timeoutMs: 10, onProgress: p => progress.push(p) });
  assert.deepEqual(result, { ready: 0, total: 1, failed: ['slow'] });
  const count = progress.length;
  release(); await flush();
  assert.equal(progress.length, count);
});
test('L05: an image-free page can become ready immediately', async () => {
  assert.deepEqual(await prepareImages([], { load: () => { throw Error('must not load'); } }), { ready: 0, total: 0, failed: [] });
});
test('L06: a failed attempt does not poison a later successful retry', async () => {
  const first = await prepareImages(['a'], { load: async () => { throw Error('offline'); } });
  assert.deepEqual(first.failed, ['a']);
  assert.deepEqual(await prepareImages(['a'], { load: async () => {} }), { ready: 1, total: 1, failed: [] });
});
