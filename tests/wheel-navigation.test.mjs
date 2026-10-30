import test from 'node:test';
import assert from 'node:assert/strict';
import { WheelNavigator, wheelIntent } from '../src/scripts/wheel-navigation.ts';

// Synthetic, explicitly timed input traces; not recordings from a physical Mac.
const swipe = [12, 24, 42, 36, 28, 20, 14, 9, 5, 3, 2, 1];
const second = [10, 25, 48, 35, 22, 12, 6, 3, 1];
function replay(deltas, interval = 16, navigator = new WheelNavigator(), start = 1000) {
  return deltas.flatMap((delta, i) => {
    const at = start + i * interval;
    const step = navigator.push(delta, at);
    return step ? [{ step, at }] : [];
  });
}
const steps = deltas => replay(deltas).map(event => event.step);
const context = { intro: false, overflowing: false, overLibrary: false, viewportHeight: 800 };
const event = { deltaX: 40, deltaY: 0, deltaMode: 0 };

test('W01: one swipe with a decaying tail selects one project', () => {
  assert.deepEqual(steps(swipe), [1]);
});
test('W02: a second swipe during the previous inertial tail is accepted', () => {
  assert.deepEqual(steps([...swipe, ...second]), [1, 1]);
});
test('W03: reversing direction does not wait for an animation or idle gap', () => {
  assert.deepEqual(steps([20, 25, -14, -28]), [1, -1]);
});
test('W04: a fresh swipe after a short pause is not held by a 460ms lock', () => {
  const navigator = new WheelNavigator();
  assert.equal(navigator.push(50, 1000), 1);
  assert.equal(navigator.push(50, 1140), 1);
});
test('W05: a long inertial tail never scrolls through multiple projects', () => {
  const tail = Array.from({ length: 150 }, (_, i) => 40 * .92 ** i);
  assert.deepEqual(steps([14, 26, 48, ...tail]), [1]);
});
test('W06: an isolated late momentum spike is ignored', () => {
  assert.deepEqual(steps([...swipe, 55, 2, 1, .7, .5]), [1]);
});
test('W07: subpixel noise and tiny opposite rebounds do not navigate', () => {
  assert.deepEqual(steps([...swipe, -.8, 1, -2, .3, 0]), [1]);
});
test('W08: a gentle second acceleration can accumulate into a new swipe', () => {
  assert.deepEqual(steps([...swipe, 2, 3, 4, 5, 6, 8, 10, 12]), [1, 1]);
});
test('W09: deliberate sustained movement keeps advancing at a bounded pace', () => {
  const result = replay(Array(70).fill(12));
  assert.ok(result.length >= 3 && result.length <= 6);
  for (let i = 1; i < result.length; i++) assert.ok(result[i].at - result[i - 1].at >= 220);
});
test('W10: repeated swipes in both directions do not leave the navigator locked', () => {
  const trace = Array.from({ length: 12 }, (_, i) => swipe.map(x => x * (i < 6 ? 1 : -1))).flat();
  assert.deepEqual(steps(trace), [...Array(6).fill(1), ...Array(6).fill(-1)]);
});
test('W11: discrete line/page wheel inputs accept every deliberate step', () => {
  const navigator = new WheelNavigator();
  assert.deepEqual([navigator.push(48, 1000, true), navigator.push(48, 1050, true), navigator.push(-48, 1100, true)], [1, 1, -1]);
});
test('W12: resetting after another input prevents stale gesture energy', () => {
  const navigator = new WheelNavigator();
  assert.equal(navigator.push(25, 1000), 0);
  navigator.reset();
  assert.equal(navigator.push(15, 1016), 0);
  assert.equal(navigator.push(25, 1032), 1);
});
test('W13: short-window horizontal input over main content still navigates', () => {
  assert.equal(wheelIntent(event, { ...context, overflowing: true }), 40);
});
test('W14: short-window vertical reading outside the rail is left to the browser', () => {
  assert.equal(wheelIntent({ ...event, deltaX: 0, deltaY: 60 }, { ...context, overflowing: true }), 0);
  assert.equal(wheelIntent({ ...event, deltaX: 0, deltaY: 60 }, { ...context, overflowing: true, overLibrary: true }), 60);
});
test('W15: vertical wheels and dominant horizontal diagonals retain their direction', () => {
  assert.equal(wheelIntent({ ...event, deltaX: 0, deltaY: 60 }, context), 60);
  assert.equal(wheelIntent({ ...event, deltaX: -40, deltaY: 5 }, context), -40);
});
test('W16: pixel, line and page delta units are normalized', () => {
  assert.equal(wheelIntent({ ...event, deltaX: 3, deltaMode: 1 }, context), 48);
  assert.equal(wheelIntent({ ...event, deltaX: -1, deltaMode: 2 }, context), -800);
});
test('W17: pinch zoom, command gestures and intro do not change projects', () => {
  assert.equal(wheelIntent({ ...event, ctrlKey: true }, context), 0);
  assert.equal(wheelIntent({ ...event, metaKey: true }, context), 0);
  assert.equal(wheelIntent(event, { ...context, intro: true }), 0);
});
test('W18: invalid input and small alternating movements do not navigate', () => {
  assert.deepEqual(steps([NaN, Infinity, -Infinity, 0, .2, 8, -8, 8, -8]), []);
  assert.equal(wheelIntent({ ...event, deltaX: Infinity }, context), 0);
});
test('W19: a low-amplitude second swipe is not lost behind a weak tail', () => {
  assert.deepEqual(steps([...swipe, ...Array(12).fill(4)]), [1, 1]);
});
