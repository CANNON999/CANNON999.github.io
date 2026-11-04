import { createPortfolioDust } from './particles';
import { prepareImages } from './image-readiness';
import { entryRevealDelay } from './entry-gate';
import { wheelIntent } from './wheel-navigation';
import { WheelBurstNavigator, PacedWheelSteps } from './wheel-burst';
import { bindCoverSelection } from './cover-selection';
import { railOffset } from './rail-layout';
import { createProjectHub } from './project-hub';
import { createSceneBackground } from './scene-background';
import { canOpenHub, consoleRoute, isPersonalScene } from '../lib/project-hub';

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const shell = byId('console-shell');
const rail = document.querySelector<HTMLElement>('.rail-track')!;
const tabs = [...rail.querySelectorAll<HTMLAnchorElement>('[role="tab"]')];
const panels = [...document.querySelectorAll<HTMLElement>('.scene-panel')];
const previousButton = byId<HTMLButtonElement>('previous');
const nextButton = byId<HTMLButtonElement>('next');
const boot = byId('boot-screen');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = byId<HTMLButtonElement>('toggle-motion');
const replayButton = byId<HTMLButtonElement>('replay-intro');
let current = 0;
let paused = false;
const root = document.documentElement;
let bootVisible = root.dataset.startup === 'pending';
let introMode: 'loading' | 'error' | 'replay' | 'none' = bootVisible ? 'loading' : 'none';
let readinessGeneration = 0;
let bootTimer: ReturnType<typeof setTimeout>;
let hideTimer: ReturnType<typeof setTimeout>;
let copyAnimation: Animation | undefined;
let frame = 0;
let lastFrame = 0;
let motionTime = 0;
try { paused = localStorage.getItem('cannon-motion') === 'paused'; } catch { /* Storage can be unavailable in private contexts. */ }
const motionOff = () => paused || reduced.matches;
const wheel = new WheelBurstNavigator();
const wheelSteps = new PacedWheelSteps();
let wheelTimer: ReturnType<typeof setTimeout> | undefined;
function resetWheel() { wheel.reset(); wheelSteps.reset(); clearTimeout(wheelTimer); }
function drainWheel() {
  clearTimeout(wheelTimer);
  if (bootVisible || hub.isOpen() || document.hidden) { resetWheel(); return; }
  const now = performance.now();
  const direction = wheelSteps.take(now);
  if (direction) select(current + direction, false, true, true);
  const delay = wheelSteps.delay(now);
  if (delay !== null) wheelTimer = setTimeout(drainWheel, delay);
}
const hub = createProjectHub({
  select: id => { const index = tabs.findIndex(tab => tab.dataset.id === id); select(index >= 0 ? index : 0, false, false); },
  restoreFocus: () => tabs[current].focus({ preventScroll: true }),
  motionOff,
  isLoading: () => bootVisible,
});
const background = createSceneBackground({
  backdrop: document.querySelector<HTMLElement>('.backdrop')!,
  layers: [document.querySelector<HTMLElement>('.world-previous')!, document.querySelector<HTMLElement>('.world-current')!],
  motionOff,
  onParticleVisibilityChange: resumePaint,
});

function positionRail() {
  const css = getComputedStyle(document.documentElement);
  // The custom sizes are rem values; getComputedStyle preserves their units.
  const offset = railOffset({
    current, count: tabs.length,
    viewportWidth: document.querySelector('.rail-window')!.clientWidth,
    rootFontSize: parseFloat(css.fontSize),
    smallRem: parseFloat(css.getPropertyValue('--cover-small')),
    largeRem: parseFloat(css.getPropertyValue('--cover-large')),
    gapRem: parseFloat(css.getPropertyValue('--cover-gap')),
    compact: innerWidth < 700,
  });
  rail.style.setProperty('--rail-offset', `${-offset}px`);
  byId('wheel-hint').textContent = innerWidth < 600 ? '左右轻扫' : '滚轮向下 · 向右浏览';
}

function select(index: number, focus = false, updateHash = true, fromWheel = false) {
  if (!fromWheel) resetWheel();
  const next = Math.max(0, Math.min(tabs.length - 1, index));
  const changed = next !== current;
  current = next;
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === current));
    tab.tabIndex = i === current ? 0 : -1;
    panels[i].hidden = i !== current;
  });
  const selected = tabs[current];
  document.body.dataset.scene = selected.dataset.id;
  byId('enter-hint').textContent = selected.dataset.id === 'welcome' ? '个人介绍' : selected.dataset.id === 'profile' ? '个人档案' : '选中预览';
  document.documentElement.style.setProperty('--accent', selected.dataset.color!);
  byId('library-count').textContent = `${String(current + 1).padStart(2, '0')} / ${String(tabs.length).padStart(2, '0')}`;
  previousButton.disabled = current === 0;
  nextButton.disabled = current === tabs.length - 1;
  byId('selection-status').textContent = `${selected.getAttribute('aria-label')}，${tabs.length} 个条目中的第 ${current + 1} 个。`;
  positionRail();
  if (changed) {
    copyAnimation?.cancel();
    const copy = panels[current].querySelector('.project-copy, .welcome-widgets, .landing-copy');
    if (!motionOff() && copy) copyAnimation = copy.animate([{ opacity: .25, transform: 'translateY(.375rem)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  void background.show({ personal: isPersonalScene(selected.dataset.id!), cover: selected.dataset.cover || '' });
  if (updateHash) history.replaceState(null, '', `#${selected.dataset.id}`);
  if (focus) selected.focus({ preventScroll: true });
  resumePaint();
}

bindCoverSelection(tabs, index => select(index), () => bootVisible);
previousButton.addEventListener('click', () => select(current - 1));
nextButton.addEventListener('click', () => select(current + 1));
byId('home-link').addEventListener('click', event => { if (canOpenHub(event)) { event.preventDefault(); select(0); } });

// Keep gesture recognition independent from CSS/scene animation completion.
shell.addEventListener('wheel', event => {
  if (hub.isOpen() || (event.target as Element).closest('[data-static-widgets]')) return;
  const delta = wheelIntent(event, {
    intro: bootVisible,
    overflowing: shell.scrollHeight > innerHeight + 2,
    overLibrary: Boolean((event.target as Element).closest('.library')),
    viewportHeight: innerHeight,
  });
  if (!delta) return;
  event.preventDefault();
  const plan = wheel.push(event, delta, performance.now());
  if (plan.fresh) { wheelSteps.reset(); clearTimeout(wheelTimer); }
  wheelSteps.add(plan.steps);
  drainWheel();
}, { passive: false });

document.addEventListener('keydown', event => {
  if (hub.isOpen()) return;
  if (event.ctrlKey || event.metaKey || event.altKey || (event.target as Element).closest('input,textarea,select,[contenteditable="true"]')) return;
  if (bootVisible) {
    if (introMode === 'replay' && ['Enter', 'Escape'].includes(event.key)) { event.preventDefault(); endIntro(); }
    if (event.key === 'Tab') {
      const controls = [...boot.querySelectorAll<HTMLButtonElement>('button')].filter(button => !button.hidden && !button.disabled);
      event.preventDefault();
      const active = controls.indexOf(document.activeElement as HTMLButtonElement);
      const next = (active + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      (controls[next] || boot).focus();
    }
    return;
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    if ((event.target as Element).closest('[data-static-widgets]')) return;
    if (shell.scrollHeight > innerHeight + 2 && !rail.contains(event.target as Node) && ['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); select(current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1), true);
  } else if (event.key === 'Home' || event.key === 'End') {
    if (!rail.contains(event.target as Node)) return;
    event.preventDefault(); select(event.key === 'Home' ? 0 : tabs.length - 1, true);
  } else if (event.key === 'Enter' && (!(event.target as Element).closest('a,button') || rail.contains(event.target as Node))) {
    event.preventDefault();
    const id = tabs[current].dataset.id!;
    if (id === 'welcome') select(tabs.findIndex(tab => tab.dataset.id === 'profile'), true);
    else if (id === 'profile') location.assign(tabs[current].href);
    else select(current, true);
  }
});

let touchStart: { x: number; y: number } | null = null;
let ignoreClickUntil = 0;
shell.addEventListener('touchstart', event => { touchStart = event.touches.length === 1 && !(event.target as Element).closest('[data-static-widgets]') && !hub.isOpen() ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
shell.addEventListener('touchmove', event => {
  if (!touchStart || event.touches.length !== 1 || bootVisible) return;
  const dx = event.touches[0].clientX - touchStart.x;
  const dy = event.touches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) event.preventDefault();
}, { passive: false });
shell.addEventListener('touchend', event => {
  if (touchStart && !bootVisible) {
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { select(current + (dx < 0 ? 1 : -1)); ignoreClickUntil = performance.now() + 400; }
  }
  touchStart = null;
}, { passive: true });
shell.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
shell.addEventListener('click', event => { if (performance.now() < ignoreClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);

const ambientDust = createPortfolioDust(byId<HTMLCanvasElement>('ambient-canvas'));
const wantsParticles = () => bootVisible || background.needsParticles();
function paint(now: number) {
  frame = 0;
  if (document.hidden || !wantsParticles()) return;
  const dt = lastFrame ? now - lastFrame : 16.67;
  if (!lastFrame || dt >= ambientDust.interval() - 1 || motionOff()) {
    lastFrame = now;
    motionTime += Math.min(dt, 80);
    ambientDust.draw(motionTime, motionOff(), dt);
  }
  if (!motionOff()) frame = requestAnimationFrame(paint);
}
function resumePaint() {
  cancelAnimationFrame(frame); lastFrame = 0;
  const visible = wantsParticles();
  document.body.dataset.particles = visible ? 'on' : 'off';
  if (visible && !document.hidden) frame = requestAnimationFrame(paint);
}

function endIntro(immediate = false) {
  clearTimeout(bootTimer); clearTimeout(hideTimer);
  const focusWasInside = boot.contains(document.activeElement);
  bootVisible = false; introMode = 'none'; root.dataset.startup = 'ready';
  boot.classList.add('is-hidden'); boot.inert = true; shell.inert = false;
  shell.removeAttribute('aria-busy');
  if (immediate || motionOff()) boot.hidden = true;
  else hideTimer = setTimeout(() => { boot.hidden = true; }, 480);
  if (focusWasInside) tabs[current].focus({ preventScroll: true });
  resumePaint();
  hub.syncRoute();
}
function showBoot(mode: 'loading' | 'replay') {
  clearTimeout(bootTimer); clearTimeout(hideTimer); resetWheel();
  introMode = mode; bootVisible = true; root.dataset.startup = mode;
  boot.hidden = false; boot.classList.remove('is-hidden'); boot.inert = false; shell.inert = true;
  byId('retry-loading').hidden = true;
  byId('skip-intro').hidden = mode === 'loading';
  byId('boot-progress').hidden = mode === 'replay';
  byId('skip-intro').textContent = mode === 'replay' ? '进入主页 ↵' : '先进入主页 ↵';
  boot.focus({ preventScroll: true });
  resumePaint();
}
function startIntro() {
  if (motionOff()) return;
  showBoot('replay');
  byId('boot-status').textContent = '每一个世界，都从一个想法开始。';
  byId('boot-detail').textContent = 'WELCOME TO MY WORLD';
  bootTimer = setTimeout(() => endIntro(), 3000);
}
const homeImages = [...shell.querySelectorAll<HTMLImageElement>('img')];
const imageGroups = new Map<string, HTMLImageElement[]>();
for (const image of homeImages) {
  image.loading = 'eager';
  const url = image.getAttribute('src')!;
  imageGroups.set(url, [...(imageGroups.get(url) || []), image]);
  image.addEventListener('load', () => { delete image.dataset.unavailable; });
}
async function prepareHome(showLoading: boolean) {
  const generation = ++readinessGeneration;
  let allDecoded = false;
  if (showLoading) { showBoot('loading'); shell.setAttribute('aria-busy', 'true'); }
  const started = performance.now();
  const result = await prepareImages([...imageGroups.keys()], {
    onAllReady: () => {
      if (generation !== readinessGeneration) return;
      allDecoded = true;
      for (const image of homeImages) delete image.dataset.unavailable;
      try { sessionStorage.setItem('cannon-ready-v2', root.dataset.assetKey!); } catch { /* Internal navigation also skips startup. */ }
      if (showLoading && (introMode === 'loading' || introMode === 'error')) {
        byId('boot-status').textContent = '作品已准备就绪';
        byId('boot-detail').textContent = `已准备 ${imageGroups.size} / ${imageGroups.size}`;
        byId('boot-progress').setAttribute('aria-valuenow', '100');
        byId('boot-progress').style.setProperty('--load-progress', '1');
        // Even cached/fast devices see the opening for one second. Reduced motion
        // keeps a still opening and skips the fade, but retains this reading time.
        const remaining = entryRevealDelay(performance.now() - started);
        bootTimer = setTimeout(() => { if (generation === readinessGeneration) endIntro(); }, remaining);
      }
    },
    load: async url => {
      const images = imageGroups.get(url)!;
      // Reassign only failed images to allow the retry button to request them again.
      for (const image of images) if (image.complete && !image.naturalWidth) image.src = url;
      await Promise.all(images.map(image => image.decode()));
    },
    onProgress: ({ ready, total }) => {
      if (generation !== readinessGeneration || !showLoading || allDecoded) return;
      byId('boot-status').textContent = '正在加载作品…';
      byId('boot-detail').textContent = `已准备 ${ready} / ${total}`;
      byId('boot-progress').setAttribute('aria-valuenow', String(total ? Math.round(ready / total * 100) : 100));
      byId('boot-progress').style.setProperty('--load-progress', String(total ? ready / total : 1));
    },
  });
  if (generation !== readinessGeneration || allDecoded) return;
  if (result.failed.length) {
    for (const url of result.failed) for (const image of imageGroups.get(url)!) image.dataset.unavailable = 'true';
    if (!showLoading) return;
    introMode = 'error'; root.dataset.startup = 'error';
    byId('boot-status').textContent = '有几张图片暂时未能加载';
    byId('boot-detail').textContent = '可以重试，或先进入主页浏览。';
    byId('retry-loading').hidden = false;
    byId('skip-intro').hidden = false;
    byId('retry-loading').focus({ preventScroll: true });
    return;
  }
}
byId('retry-loading').addEventListener('click', () => { void prepareHome(true); });

function updateMotion() {
  document.body.dataset.motion = motionOff() ? 'paused' : 'playing';
  window.dispatchEvent(new Event('cannon-motion-change'));
  motionButton.setAttribute('aria-pressed', String(motionOff()));
  motionButton.textContent = reduced.matches ? '已减少动态效果' : paused ? '开启动效' : '暂停动效';
  motionButton.disabled = reduced.matches;
  replayButton.disabled = motionOff();
  if (motionOff()) { copyAnimation?.cancel(); background.finish(); if (introMode === 'replay') endIntro(true); }
  resumePaint();
}
byId('skip-intro').addEventListener('click', () => { if (introMode !== 'loading') endIntro(); });
replayButton.addEventListener('click', startIntro);
motionButton.addEventListener('click', () => {
  paused = !paused;
  try { localStorage.setItem('cannon-motion', paused ? 'paused' : 'playing'); } catch { /* Optional preference only. */ }
  updateMotion();
});
reduced.addEventListener('change', updateMotion);
document.body.dataset.visibility = document.hidden ? 'hidden' : 'visible';
document.addEventListener('visibilitychange', () => { document.body.dataset.visibility = document.hidden ? 'hidden' : 'visible'; resetWheel(); if (document.hidden) { cancelAnimationFrame(frame); lastFrame = 0; } else resumePaint(); });
window.addEventListener('resize', () => { positionRail(); ambientDust.resize(); resumePaint(); });
// Moving between monitors / browser zoom can change DPR without a layout resize.
function watchPixelRatio() {
  const density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
  density.addEventListener('change', () => { ambientDust.resize(); resumePaint(); watchPixelRatio(); }, { once: true });
}
watchPixelRatio();
window.addEventListener('pageshow', event => { if (event.persisted) { select(current, false, false); if (bootVisible && introMode !== 'replay') void prepareHome(true); else endIntro(true); } });
window.addEventListener('pagehide', () => { resetWheel(); readinessGeneration++; background.suspend(); cancelAnimationFrame(frame); clearTimeout(bootTimer); clearTimeout(hideTimer); });

const route = consoleRoute(location.hash, tabs.filter(tab => tab.dataset.kind === 'project').map(tab => tab.dataset.id!));
const initial = tabs.findIndex(tab => tab.dataset.id === route.selected);
select(initial >= 0 ? initial : 0, false, !location.hash);
updateMotion();
if (bootVisible) void prepareHome(true);
else { endIntro(true); void prepareHome(false); }
