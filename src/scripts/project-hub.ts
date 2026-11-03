import { canOpenHub, consoleRoute } from '../lib/project-hub';

interface HubOptions {
  select: (id: string) => void;
  restoreFocus: () => void;
  motionOff: () => boolean;
  isLoading: () => boolean;
}

/** The hub is already in the document: opening it never fetches a page or replays startup. */
export function createProjectHub(options: HubOptions) {
  const dialog = document.querySelector<HTMLDialogElement>('#project-hub-dialog')!;
  const scenes = [...dialog.querySelectorAll<HTMLElement>('[data-hub-id]')];
  const ids = scenes.map(scene => scene.dataset.hubId!);
  const originalTitle = document.title;
  let active: string | null = null;
  let generation = 0;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let enterFrame = 0;
  let lastScroll = 0;

  function open(id: string, push = true) {
    const scene = scenes.find(item => item.dataset.hubId === id);
    if (!scene || options.isLoading()) return;
    if (active === id && dialog.open && !dialog.classList.contains('is-closing')) return;
    generation++;
    clearTimeout(closeTimer); cancelAnimationFrame(enterFrame);
    if (!dialog.open) lastScroll = scrollY;
    options.select(id);
    if (push) {
      // Back returns to the same selected cover, even if entry came from a widget.
      history.replaceState(null, '', `#${id}`);
      history.pushState({ cannonHub: id }, '', `#hub-${id}`);
    }
    active = id;
    scenes.forEach(item => { item.hidden = item !== scene; });
    dialog.setAttribute('aria-labelledby', `hub-title-${id}`);
    document.title = `${scene.querySelector('.hub-name')!.textContent} — CANNON / 肖冠荣`;
    dialog.classList.remove('is-closing');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    // Resolve the start style before adding the end state; only transforms/opacity animate.
    void dialog.offsetWidth;
    document.body.classList.add('hub-open');
    enterFrame = requestAnimationFrame(() => { dialog.classList.add('is-open'); });
    scene.querySelector<HTMLAnchorElement>('.hub-primary')?.focus({ preventScroll: true });
  }

  function closeVisual() {
    if (!dialog.open) {
      generation++;
      clearTimeout(closeTimer); cancelAnimationFrame(enterFrame);
      active = null;
      dialog.classList.remove('is-open', 'is-closing');
      document.body.classList.remove('hub-open');
      document.title = originalTitle;
      scenes.forEach(item => { item.hidden = true; });
      return;
    }
    if (dialog.classList.contains('is-closing')) return;
    const token = ++generation;
    cancelAnimationFrame(enterFrame);
    active = null;
    dialog.classList.add('is-closing');
    dialog.classList.remove('is-open');
    document.body.classList.remove('hub-open');
    document.title = originalTitle;
    const finish = () => {
      if (token !== generation) return;
      dialog.close();
      dialog.classList.remove('is-closing');
      scenes.forEach(item => { item.hidden = true; });
      window.scrollTo({ top: lastScroll, behavior: 'instant' });
      options.restoreFocus();
    };
    if (options.motionOff()) finish();
    else closeTimer = setTimeout(finish, 360);
  }

  function syncRoute() {
    if (location.hash === '#main-content') return;
    const route = consoleRoute(location.hash, ids);
    if (route.hub) open(route.hub, false);
    else { options.select(route.selected); closeVisual(); }
  }

  function requestClose() {
    if (!active) return;
    const id = active;
    const goBack = history.state?.cannonHub === id;
    // Start restoring the shell before history traversal can dismiss the native dialog.
    closeVisual();
    if (goBack) history.back();
    else {
      history.replaceState(null, '', `#${id}`);
      syncRoute();
    }
  }

  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  dialog.addEventListener('close', () => {
    // Also recover from browser-managed dismissal (Escape/history), not only our buttons.
    if (dialog.open) return;
    const id = active;
    closeVisual();
    if (id && location.hash === `#hub-${id}`) history.replaceState(null, '', `#${id}`);
    options.restoreFocus();
  });
  dialog.addEventListener('click', event => {
    const link = (event.target as Element).closest('[data-close-hub]');
    if (link && canOpenHub(event)) { event.preventDefault(); requestClose(); }
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-open-hub]').forEach(link => link.addEventListener('click', event => {
    if (!canOpenHub(event) || options.isLoading()) return;
    event.preventDefault(); open(link.dataset.openHub!);
  }));
  window.addEventListener('popstate', syncRoute);
  window.addEventListener('hashchange', syncRoute);
  return { open, syncRoute, isOpen: () => dialog.open };
}
