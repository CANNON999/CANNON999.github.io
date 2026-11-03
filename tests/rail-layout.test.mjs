import test from 'node:test';
import assert from 'node:assert/strict';
import { railOffset } from '../src/scripts/rail-layout.ts';

const reference = { current: 3, count: 12, viewportWidth: 1125, rootFontSize: 16, smallRem: 82 / 16, largeRem: 132 / 16, gapRem: 9 / 16, compact: false };
const close = (a, b) => assert.ok(Math.abs(a - b) < .001, `${a} != ${b}`);

test('D01: scaling the full desktop keeps the same selected-cover position', () => {
  assert.equal(railOffset(reference), 91);
  for (const scale of [1.25, 1308 / 862, 2, 2160 / 862]) {
    for (let current = 0; current < reference.count; current++) {
      const base = railOffset({ ...reference, current });
      const scaled = railOffset({ ...reference, current, rootFontSize: 16 * scale, viewportWidth: 1125 * scale });
      close(scaled, base * scale);
    }
  }
});
test('D02: a rail that fits stays still at both normal and enlarged sizes', () => {
  for (const scale of [1, 1.5, 2.5]) {
    assert.equal(railOffset({ ...reference, count: 4, current: 3, rootFontSize: 16 * scale, viewportWidth: 1125 * scale }), 0);
  }
});
test('D03: first and last item bounds stay safe while resizing', () => {
  assert.equal(railOffset({ ...reference, current: -1 }), 0);
  assert.equal(railOffset({ ...reference, current: 99 }), railOffset({ ...reference, current: 11 }));
  assert.equal(railOffset({ ...reference, count: 0 }), 0);
});
test('D04: narrow screens keep one previous cover in view', () => {
  const mobile = { ...reference, compact: true, viewportWidth: 374, smallRem: 58 / 16, largeRem: 92 / 16, gapRem: 7 / 16 };
  for (let current = 2; current < mobile.count; current++) {
    const selectedLeft = current * 65 - railOffset({ ...mobile, current });
    assert.equal(selectedLeft, 65);
    assert.ok(selectedLeft + 92 <= mobile.viewportWidth - 16);
  }
});
test('D05: fractional scaling and a narrow desktop still expose the whole selected cover', () => {
  const scale = 1.5174;
  for (let current = 0; current < 12; current++) {
    const input = { ...reference, current, rootFontSize: 16 * scale, viewportWidth: 600 * scale };
    const selectedLeft = current * 91 * scale - railOffset(input);
    assert.ok(selectedLeft >= 0);
    assert.ok(selectedLeft + 132 * scale <= input.viewportWidth - input.rootFontSize);
  }
});
