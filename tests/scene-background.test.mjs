import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/scene-background.ts', import.meta.url), 'utf8'))
  .replace('export function', 'function');
const personal = { personal: true, cover: '' };
const abyss = { personal: false, cover: '/abyss.webp' };
const city = { personal: false, cover: '/city.webp' };
const near = (a, b) => assert.ok(Math.abs(a - b) < .00001, `${a} != ${b}`);

function fixture({ reduced = false, deferred = false } = {}) {
  const elements = [], loads = [], animations = [];
  let notifications = 0;
  function element() {
    const item = { style: { opacity: '0', backgroundImage: 'none' }, dataset: {}, active: null,
      animate(frames, options) {
        const animation = { frames, options, progress: 0, onfinish: null,
          cancel() { if (item.active === this) item.active = null; },
          finish() { this.cancel(); this.onfinish?.(); },
        };
        item.active = animation;
        animations.push(animation);
        return animation;
      },
    };
    elements.push(item); return item;
  }
  const opacity = item => {
    const a = item.active;
    return a ? Number(a.frames[0].opacity) + (Number(a.frames[1].opacity) - Number(a.frames[0].opacity)) * a.progress : Number(item.style.opacity);
  };
  const backdrop = element(), layers = [element(), element()];
  const context = vm.createContext({
    getComputedStyle: item => ({ opacity: String(opacity(item)) }),
    Image: class {
      decode() {
        return new Promise((resolve, reject) => { loads.push({ url: this.src, resolve, reject }); if (!deferred) resolve(); });
      }
    },
  });
  vm.runInContext(source, context);
  const api = context.createSceneBackground({ backdrop, layers, motionOff: () => reduced, onParticleVisibilityChange: () => { notifications++; } });
  return { api, backdrop, layers, animations, loads, opacity,
    weight: url => opacity(backdrop) * layers.filter(layer => layer.dataset.cover === url).reduce((sum, layer) => sum + opacity(layer), 0),
    progress: fraction => elements.forEach(item => { if (item.active) item.active.progress = fraction; }),
    finish: () => elements.forEach(item => item.active?.finish()),
    pause: () => { reduced = true; api.finish(); },
    notifications: () => notifications,
  };
}

test('BG01: reversing an unfinished artwork reveal never restores it to full brightness', async () => {
  const f = fixture(); await f.api.show(abyss); f.progress(.25);
  const weight = f.weight(abyss.cover), images = f.layers.map(layer => layer.style.backgroundImage);
  await f.api.show(personal);
  near(f.weight(abyss.cover), weight);
  assert.deepEqual(f.layers.map(layer => layer.style.backgroundImage), images);
  let previous = weight;
  for (const progress of [.1, .3, .6, .9, 1]) {
    f.progress(progress);
    assert.ok(f.weight(abyss.cover) <= previous);
    previous = f.weight(abyss.cover);
  }
  f.finish(); near(f.opacity(f.backdrop), 0);
  assert.equal(f.api.needsParticles(), true);
});

test('BG02: repeated personal/artwork reversals preserve the exact visible frame and reuse the decoded image', async () => {
  const f = fixture(); await f.api.show(abyss); f.finish();
  for (let i = 0; i < 12; i++) {
    await f.api.show(personal); f.progress(.35);
    const before = f.weight(abyss.cover);
    await f.api.show(abyss);
    near(f.weight(abyss.cover), before);
    f.progress(.4);
    const reverse = f.weight(abyss.cover);
    await f.api.show(personal);
    near(f.weight(abyss.cover), reverse);
  }
  assert.equal(f.loads.length, 1);
  assert.equal(f.layers.length, 2);
});

test('BG03: repeated selection, Hub synchronization and the two personal scenes do not restart a fade', async () => {
  const f = fixture(); await f.api.show(abyss); f.progress(.2);
  const animation = f.backdrop.active, count = f.animations.length;
  await f.api.show(abyss);
  assert.equal(f.backdrop.active, animation); assert.equal(f.animations.length, count);
  await f.api.show(personal); f.progress(.5);
  const returnAnimation = f.backdrop.active;
  await f.api.show({ ...personal });
  assert.equal(f.backdrop.active, returnAnimation);
});

test('BG04: late decoded or failed artwork cannot replace the latest personal scene', async () => {
  for (const fail of [false, true]) {
    const f = fixture({ deferred: true }); const pending = f.api.show(abyss);
    await f.api.show(personal);
    if (fail) f.loads[0].reject(Error('offline')); else f.loads[0].resolve();
    await pending;
    near(f.opacity(f.backdrop), 0);
    assert.ok(f.layers.every(layer => layer.style.backgroundImage === 'none'));
    assert.equal(f.api.needsParticles(), true);
  }
});

test('BG05: out-of-order image decoding keeps only the last requested work', async () => {
  const f = fixture({ deferred: true });
  const first = f.api.show(abyss), last = f.api.show(city);
  f.loads[1].resolve(); await last; f.finish();
  f.loads[0].resolve(); await first;
  near(f.weight(city.cover), .83); near(f.weight(abyss.cover), 0);
});

test('BG06: old completion callbacks cannot stop particles during a new return', async () => {
  const f = fixture(); await f.api.show(abyss); f.progress(.7);
  const stale = f.backdrop.active.onfinish;
  await f.api.show(personal); stale();
  assert.equal(f.api.needsParticles(), true);
  f.finish(); assert.equal(f.api.needsParticles(), true);
  await f.api.show(abyss); assert.equal(f.api.needsParticles(), true);
  f.finish(); assert.equal(f.api.needsParticles(), false);
});

test('BG07: interrupting a work-to-work fade for personal preserves both image weights', async () => {
  const f = fixture(); await f.api.show(abyss); f.finish();
  await f.api.show(city); f.progress(.4);
  const weights = [f.weight(abyss.cover), f.weight(city.cover)];
  await f.api.show(personal);
  near(f.weight(abyss.cover), weights[0]); near(f.weight(city.cover), weights[1]);
  f.finish(); await f.api.show(city); f.finish();
  near(f.weight(city.cover), .83); near(f.weight(abyss.cover), 0);
});

test('BG08: the image-free notes scene remains opaque and does not draw particles forever', async () => {
  const f = fixture(); await f.api.show(abyss); f.finish();
  await f.api.show({ personal: false, cover: '' }); f.finish();
  near(f.opacity(f.backdrop), 1);
  assert.equal(f.backdrop.dataset.theme, 'notes');
  assert.ok(f.layers.every(layer => f.opacity(layer) === 0));
  assert.equal(f.api.needsParticles(), false);
  await f.api.show(personal); f.finish(); near(f.opacity(f.backdrop), 0);
});

test('BG09: reduced motion and pausing settle the target without leaving competing animations', async () => {
  const reduced = fixture({ reduced: true }); await reduced.api.show(abyss);
  near(reduced.opacity(reduced.backdrop), 1); assert.equal(reduced.api.needsParticles(), false);
  await reduced.api.show(personal); near(reduced.opacity(reduced.backdrop), 0);
  assert.equal(reduced.animations.length, 0);
  const paused = fixture(); await paused.api.show(abyss); paused.progress(.2); paused.pause();
  near(paused.opacity(paused.backdrop), 1); assert.equal(paused.api.needsParticles(), false);
  await paused.api.show(personal); near(paused.opacity(paused.backdrop), 0);
});

test('BG10: leaving invalidates pending work; restoring can request the same scene again', async () => {
  const f = fixture({ deferred: true }); const pending = f.api.show(abyss);
  f.api.suspend(); f.loads[0].resolve(); await pending;
  near(f.opacity(f.backdrop), 0);
  await f.api.show(abyss); f.finish(); near(f.weight(abyss.cover), .83);
  f.api.suspend(); await f.api.show(personal); f.finish();
  near(f.opacity(f.backdrop), 0);
});

test('BG11: failed artwork can be selected again and recovered', async () => {
  const f = fixture({ deferred: true }); const first = f.api.show(abyss);
  f.loads[0].reject(Error('offline')); await first; f.finish();
  const retry = f.api.show(abyss); f.loads[1].resolve(); await retry; f.finish();
  near(f.weight(abyss.cover), .83);
});
