import { createPortfolioDust } from './particles.js';

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
const front = document.querySelector<HTMLElement>('.world-current')!;
const back = document.querySelector<HTMLElement>('.world-previous')!;
let current = 0;
let paused = false;
let bootVisible = false;
let bootTimer: ReturnType<typeof setTimeout>;
let hideTimer: ReturnType<typeof setTimeout>;
let bootFadeUntil = 0;
let backgroundGeneration = 0;
let backgroundAnimations: Animation[] = [];
let copyAnimation: Animation | undefined;
let frame = 0;
let lastFrame = 0;
let motionTime = 0;
try { paused = localStorage.getItem('cannon-motion') === 'paused'; } catch { /* Storage can be unavailable in private contexts. */ }
const motionOff = () => paused || reduced.matches;

function positionRail() {
  const css = getComputedStyle(document.documentElement);
  const small = parseFloat(css.getPropertyValue('--cover-small'));
  const large = parseFloat(css.getPropertyValue('--cover-large'));
  const gap = parseFloat(css.getPropertyValue('--cover-gap'));
  const viewport = document.querySelector('.rail-window')!.clientWidth - 16;
  const total = (tabs.length - 1) * (small + gap) + large;
  const previousContext = innerWidth < 700 ? small + gap : Math.min(2 * (small + gap), viewport * .2);
  const offset = total > viewport ? Math.max(0, current * (small + gap) - previousContext) : 0;
  rail.style.setProperty('--rail-offset', `${-offset}px`);
  byId('wheel-hint').textContent = innerWidth < 600 ? '左右轻扫' : '滚轮向下 · 向右浏览';
}

async function setBackground(cover: string) {
  const generation = ++backgroundGeneration;
  if (cover) {
    const image = new Image();
    image.src = cover;
    try { await image.decode(); } catch { if (generation !== backgroundGeneration) return; cover = ''; }
  }
  if (generation !== backgroundGeneration) return;
  const old = front.style.backgroundImage;
  backgroundAnimations.forEach(animation => animation.cancel());
  back.style.backgroundImage = old;
  back.style.opacity = old && old !== 'none' ? '.83' : '0';
  front.style.backgroundImage = cover ? `url("${cover}")` : 'none';
  front.style.opacity = cover ? '.83' : '0';
  if (!motionOff()) {
    backgroundAnimations = [
      front.animate([{ opacity: 0, transform: 'scale(1.018)' }, { opacity: cover ? .83 : 0, transform: 'scale(1)' }], { duration: 820, easing: 'cubic-bezier(.2,.65,.25,1)' }),
      back.animate([{ opacity: back.style.opacity }, { opacity: 0 }], { duration: 820, fill: 'forwards', easing: 'ease-out' }),
    ];
  } else back.style.opacity = '0';
}

function select(index: number, focus = false, updateHash = true) {
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
  document.documentElement.style.setProperty('--accent', selected.dataset.color!);
  byId('library-count').textContent = `${String(current + 1).padStart(2, '0')} / ${String(tabs.length).padStart(2, '0')}`;
  previousButton.disabled = current === 0;
  nextButton.disabled = current === tabs.length - 1;
  byId('selection-status').textContent = `${selected.getAttribute('aria-label')}，${tabs.length} 个条目中的第 ${current + 1} 个。`;
  positionRail();
  if (changed) {
    copyAnimation?.cancel();
    if (!motionOff()) copyAnimation = panels[current].querySelector('.project-copy')!.animate([{ opacity: .15, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  void setBackground(selected.dataset.cover || '');
  if (updateHash) history.replaceState(null, '', `#${selected.dataset.id}`);
  if (focus) selected.focus({ preventScroll: true });
}

tabs.forEach((tab, index) => tab.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); select(index);
}));
previousButton.addEventListener('click', () => select(current - 1));
nextButton.addEventListener('click', () => select(current + 1));
byId('explore-work').addEventListener('click', event => { event.preventDefault(); select(1, true); });
byId('home-link').addEventListener('click', event => { event.preventDefault(); select(0); });
window.addEventListener('hashchange', () => { const index = tabs.findIndex(tab => `#${tab.dataset.id}` === location.hash); if (index >= 0) select(index, false, false); });

// Consume one gesture, including trackpad inertia. Let short/zoomed pages scroll normally.
let wheelTotal = 0, lastWheel = 0, consumed = false, lastSwitch = -1000;
shell.addEventListener('wheel', event => {
  if (bootVisible || event.ctrlKey || event.metaKey) return;
  if (shell.scrollHeight > innerHeight + 2 && !(event.target as Element).closest('.library')) return;
  const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  if (!delta) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastWheel > 180) { wheelTotal = 0; consumed = false; }
  lastWheel = now;
  if (consumed || now - lastSwitch < (motionOff() ? 180 : 460)) return;
  wheelTotal += delta;
  if (Math.abs(wheelTotal) >= 42) { select(current + Math.sign(wheelTotal)); consumed = true; lastSwitch = now; }
}, { passive: false });

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || (event.target as Element).closest('input,textarea,select,[contenteditable="true"]')) return;
  if (bootVisible) {
    if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); endIntro(); }
    if (event.key === 'Tab') { event.preventDefault(); byId('skip-intro').focus(); }
    return;
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    if (shell.scrollHeight > innerHeight + 2 && !rail.contains(event.target as Node) && ['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); select(current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1), true);
  } else if (event.key === 'Home' || event.key === 'End') {
    if (!rail.contains(event.target as Node)) return;
    event.preventDefault(); select(event.key === 'Home' ? 0 : tabs.length - 1, true);
  } else if (event.key === 'Enter' && (!(event.target as Element).closest('a,button') || rail.contains(event.target as Node))) {
    event.preventDefault(); location.assign(tabs[current].href);
  }
});

let touchStart: { x: number; y: number } | null = null;
let ignoreClickUntil = 0;
shell.addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
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

const ambientDust = createPortfolioDust(byId<HTMLCanvasElement>('ambient-canvas'), 97);
const bootDust = createPortfolioDust(byId<HTMLCanvasElement>('boot-canvas'), 97);
function paint(now: number) {
  const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16.67;
  lastFrame = now; motionTime += dt;
  // The full-screen intro obscures the ambient layer, so render only one particle field.
  if (!bootVisible) ambientDust.draw(motionTime, true, motionOff());
  if (bootVisible || now < bootFadeUntil) bootDust.draw(motionTime, false, motionOff());
  if (!motionOff() && !document.hidden) frame = requestAnimationFrame(paint);
}
function resumePaint() { cancelAnimationFrame(frame); lastFrame = 0; if (!document.hidden) frame = requestAnimationFrame(paint); }

function endIntro(immediate = false) {
  clearTimeout(bootTimer); clearTimeout(hideTimer);
  const focusWasInside = boot.contains(document.activeElement);
  bootVisible = false; bootFadeUntil = immediate || motionOff() ? 0 : performance.now() + 1100;
  boot.classList.add('is-hidden'); boot.inert = true; shell.inert = false;
  if (immediate || motionOff()) boot.hidden = true;
  else hideTimer = setTimeout(() => { boot.hidden = true; }, 1100);
  try { sessionStorage.setItem('cannon-intro-v1', 'seen'); } catch { /* Optional preference only. */ }
  if (focusWasInside) tabs[current].focus({ preventScroll: true });
  resumePaint();
}
function startIntro() {
  if (motionOff()) return;
  clearTimeout(bootTimer); clearTimeout(hideTimer);
  boot.hidden = false; boot.classList.remove('is-hidden'); boot.inert = false; shell.inert = true; bootVisible = true;
  bootDust.resize();
  for (const element of boot.querySelectorAll<HTMLElement>('.boot-brand,.boot-progress span')) {
    element.style.animation = 'none'; void element.offsetWidth; element.style.animation = '';
  }
  byId('skip-intro').focus({ preventScroll: true });
  bootTimer = setTimeout(() => endIntro(), 3800);
  resumePaint();
}
function updateMotion() {
  document.body.dataset.motion = motionOff() ? 'paused' : 'playing';
  motionButton.setAttribute('aria-pressed', String(motionOff()));
  motionButton.textContent = reduced.matches ? '已减少动态效果' : paused ? '开启动效' : '暂停动效';
  motionButton.disabled = reduced.matches;
  replayButton.disabled = motionOff();
  if (motionOff()) { copyAnimation?.cancel(); backgroundAnimations.forEach(animation => animation.finish()); endIntro(true); }
  resumePaint();
}
byId('skip-intro').addEventListener('click', () => endIntro());
replayButton.addEventListener('click', startIntro);
motionButton.addEventListener('click', () => {
  paused = !paused;
  try { localStorage.setItem('cannon-motion', paused ? 'paused' : 'playing'); } catch { /* Optional preference only. */ }
  updateMotion();
});
reduced.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); lastFrame = 0; } else resumePaint(); });
window.addEventListener('resize', () => { positionRail(); ambientDust.resize(); bootDust.resize(); resumePaint(); });
window.addEventListener('pageshow', event => { if (event.persisted) { select(current, false, false); endIntro(true); } });
window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); clearTimeout(bootTimer); clearTimeout(hideTimer); });

const initial = tabs.findIndex(tab => `#${tab.dataset.id}` === location.hash);
select(initial >= 0 ? initial : 0, false, initial < 0);
let seen = false;
try { seen = sessionStorage.getItem('cannon-intro-v1') === 'seen'; } catch { /* Intro still remains skippable. */ }
updateMotion();
if (!seen && initial < 0 && !motionOff()) startIntro(); else endIntro(true);
