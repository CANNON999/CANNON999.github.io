import test from 'node:test';
import assert from 'node:assert/strict';
import { toolRows } from '../src/lib/tool-marquee.ts';

test('M01: every row includes every tool once; adding another tool updates all rows', () => {
  for (const count of [1, 6, 14, 15, 30]) {
    const tools = Array.from({ length: count }, (_, id) => ({ id }));
    const rows = toolRows(tools);
    assert.equal(rows.length, 7);
    for (const row of rows) assert.deepEqual(row.map(t => t.id).sort((a,b) => a-b), tools.map(t => t.id));
    assert.deepEqual(tools.map(t => t.id), Array.from({ length: count }, (_, i) => i));
    if (count > 1) assert.notDeepEqual(rows[0], rows[1]);
  }
});
test('M02: row rotations retain original asset metadata and empty catalogues do not create broken icons', () => {
  const tools = Object.freeze([Object.freeze({ id: 'engine', image: '/engine.svg' }), Object.freeze({ id: 'paint', image: '/paint.webp' })]);
  for (const row of toolRows(tools)) for (const tool of row) assert.ok(tools.includes(tool));
  assert.deepEqual(toolRows([]), []);
});
