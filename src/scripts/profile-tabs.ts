import { profileSection, profileKeyIndex } from '../lib/profile-tabs';
import { canOpenHub } from '../lib/project-hub';
/** Only the lower pane scrolls. Each chapter keeps its own reading position. */
export function createProfileTabs(shell: HTMLElement) {
  const tabs = [...shell.querySelectorAll<HTMLAnchorElement>('[data-profile-tab]')];
  const panels = [...shell.querySelectorAll<HTMLElement>('.resume-panel')];
  const content = shell.querySelector<HTMLElement>('[data-profile-content]')!;
  const ids = tabs.map(tab => tab.dataset.profileTab!);
  const positions = new Map<string, number>();
  let current: string | undefined;
  let transition: Animation | undefined;
  function select(id: string, focus = false, updateHash = true) {
    const next = profileSection(id, ids);
    const changed = current && current !== next;
    const direction = ids.indexOf(next) >= ids.indexOf(current || next) ? 1 : -1;
    transition?.cancel();
    if (current) positions.set(current, content.scrollTop);
    tabs.forEach(tab => {
      const active = tab.dataset.profileTab === next;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus({ preventScroll: true });
    });
    panels.forEach(panel => { panel.hidden = panel.id !== next; });
    if (changed) {
      let off = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { off ||= localStorage.getItem('cannon-motion') === 'paused'; } catch { /* Optional preference. */ }
      const panel = panels.find(panel => panel.id === next);
      if (!off) transition = panel?.animate?.([{ opacity: .3, transform: `translateX(${direction * .65}rem)` }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.22,.8,.22,1)' });
    }
    current = next;
    content.scrollTop = positions.get(next) || 0;
    if (updateHash) history.replaceState(null, '', `#${next}`);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => {
      if (!canOpenHub(event)) return;
      event.preventDefault(); select(ids[index]);
    });
    tab.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const next = profileKeyIndex(event.key, index, tabs.length);
      if (next === null) return;
      event.preventDefault(); select(ids[next], true);
    });
  });
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#main-content') select(profileSection(location.hash, ids), false, false);
  });
  select(profileSection(location.hash, ids), false, false);
  shell.dataset.enhanced = 'true';
  return { select };
}
