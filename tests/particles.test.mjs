import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasResolution, resizeCanvas, createField, sampleMote, ParticleBudget } from '../src/scripts/particle-field.ts';

test('P01: native backing pixels match Retina, fractional zoom and resized viewports', () => {
  for (const [w, h, dpr] of [[1440, 900, 2], [1920, 1080, 2], [390, 844, 3], [1280, 720, 1.25], [320.5, 568.5, 1.5]]) {
    const actual = canvasResolution(w, h, dpr);
    assert.equal(actual.width, Math.round(w * dpr));
    assert.equal(actual.height, Math.round(h * dpr));
    assert.equal(actual.ratio, dpr);
  }
  assert.equal(canvasResolution(100, 50, NaN).ratio, 1);
  assert.deepEqual(canvasResolution(0, 0, 0), { width: 1, height: 1, ratio: 1 });
});
test('P02: repeatable particle field retains all depth layers at a reduced density', () => {
  const field = createField();
  assert.deepEqual(field, createField());
  assert.equal(field.length, 720);
  assert.deepEqual(new Set(field.slice(0, 180).map(p => p.layer)), new Set([0, 1, 2]));
  for (const p of field) assert.ok(p.size > 0 && p.alpha > 0 && p.alpha <= 1);
});
test('P03: motion is gradual and remains finite after long sessions and wrapping', () => {
  for (const p of createField()) {
    const a = sampleMote(p, 0), b = sampleMote(p, 1 / 60);
    assert.ok(Math.abs(b.x - a.x) < .001);
    for (const time of [0, 30, 3600, 86400]) {
      const q = sampleMote(p, time);
      assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.alpha));
      assert.ok(q.x >= -.15 && q.x <= 1.15 && q.alpha >= 0 && q.alpha <= 1);
    }
  }
});
test('P04: isolated frame spikes do not permanently reduce particle quality', () => {
  const budget = new ParticleBudget();
  for (let i = 0; i < 360; i++) budget.observe(i % 10 === 0 ? 45 : 16.67, 1);
  assert.equal(budget.level, 0);
});
test('P05: sustained GPU or CPU pressure reduces work and eventually caps at 30fps', () => {
  for (const [interval, cost] of [[33.3, 1], [16.67, 12]]) {
    const budget = new ParticleBudget();
    for (let i = 0; i < 90; i++) budget.observe(interval, cost);
    assert.equal(budget.level, 1);
    assert.ok(budget.density < 1);
    for (let i = 0; i < 900; i++) budget.observe(interval, cost);
    assert.equal(budget.level, 2);
    assert.ok(budget.density < .5);
    assert.equal(budget.interval, 1000 / 30);
    assert.equal(canvasResolution(1440, 900, 2).width, 2880);
  }
});
test('P06: hidden-tab / debugger gaps are not treated as sustained render overload', () => {
  const budget = new ParticleBudget();
  for (let i = 0; i < 300; i++) { budget.observe(5000, 10); budget.observe(0, 0); }
  assert.equal(budget.level, 0);
});
test('P07: zoom keeps the complete canvas covered when backing dimensions stay unchanged', () => {
  const canvas = { width: 0, height: 0 };
  let transform;
  const context = { setTransform(...matrix) { transform = matrix; } };
  for (const [width, height, dpr] of [[1504, 862, 2], [752, 431, 4], [1880, 1077.5, 1.6]]) {
    resizeCanvas(canvas, context, width, height, dpr);
    assert.equal(canvas.width, 3008);
    assert.equal(canvas.height, 1724);
    assert.deepEqual(transform, [dpr, 0, 0, dpr, 0, 0]);
    assert.equal(Math.round(width * transform[0]), canvas.width);
  }
});
