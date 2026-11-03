/** Serialized into <head>: reveal registration must precede first paint.
 * Native snapshots retain the old page while the next static document loads.
 * The fallback never hides the document or depends on animation completion.
 */
export function installPageTransitions() {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const native = 'onpagereveal' in window && 'onpageswap' in window;
  const key = 'cannon-page-transition';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let animation: Animation | undefined;
  const motion = () => {
    let paused = false;
    try { paused = localStorage.getItem('cannon-motion') === 'paused'; } catch { /* Optional preference. */ }
    root.dataset.pageMotion = reduced.matches || paused ? 'off' : 'on';
    return root.dataset.pageMotion === 'on';
  };
  function kind(from: string, to: string) {
    const a = new URL(from, location.href).pathname.replace(/\/$/, '') || '/';
    const b = new URL(to, location.href).pathname.replace(/\/$/, '') || '/';
    if (b === '/about') return 'profile-in';
    if (a === '/about') return 'profile-out';
    if (a === '/' && b === '/works') return 'section-forward';
    if (a === '/works' && b === '/') return 'section-back';
    if (a.startsWith('/works/') && (b === '/' || b === '/works')) return 'detail-out';
    return 'detail-in';
  }
  function record(to: string) {
    const value = { from: location.href, to, at: Date.now() };
    root.dataset.pageTransition = kind(value.from, to);
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Native default still works. */ }
  }
  function restore() {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (value && Date.now() - value.at < 15000 && new URL(value.to).pathname === location.pathname) {
        root.dataset.pageTransition = kind(value.from, value.to);
        return true;
      }
    } catch { /* Missing or invalid navigation record. */ }
    return false;
  }
  function enter() {
    if (!motion() || root.dataset.startup === 'pending') return;
    const main = document.querySelector<HTMLElement>('main');
    animation?.cancel();
    animation = main?.animate?.([{ opacity: .25, transform: 'translateY(.5rem)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,.8,.22,1)' });
  }
  motion(); restore();
  window.addEventListener('pageswap', ((event: PageTransitionEvent & { viewTransition?: ViewTransition; activation?: { entry?: { url?: string } } }) => {
    event.viewTransition?.ready.catch(() => {});
    if (event.activation?.entry?.url) record(event.activation.entry.url);
    if (!motion()) event.viewTransition?.skipTransition();
  }) as EventListener);
  window.addEventListener('pagereveal', ((event: Event & { viewTransition?: ViewTransition }) => {
    const navigation = (window as Window & { navigation?: { activation?: { from?: { url?: string } } } }).navigation;
    const from = navigation?.activation?.from?.url;
    if (event.viewTransition) {
      root.dataset.pageTransitionState = 'pending';
      event.viewTransition.ready.then(() => { root.dataset.pageTransitionState = 'running'; }).catch(() => { root.dataset.pageTransitionState = 'fallback'; enter(); });
      event.viewTransition.finished.then(() => { if (root.dataset.pageTransitionState === 'running') root.dataset.pageTransitionState = 'done'; });
    } else if (restore()) enter();
    if (from) root.dataset.pageTransition = kind(from, location.href);
    else restore();
    if (!motion()) event.viewTransition?.skipTransition();
    try { sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
  }) as EventListener);
  window.addEventListener('pageshow', (event) => {
    clearTimeout(timer); animation?.cancel();
    if (!native) {
      if (event.persisted || restore()) enter();
      try { sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
    }
  });
  window.addEventListener('pagehide', () => { clearTimeout(timer); animation?.cancel(); });
  reduced.addEventListener('change', () => { if (!motion()) animation?.cancel(); });
  window.addEventListener('cannon-motion-change', () => { if (!motion()) animation?.cancel(); });
  // Bubble after page handlers: handled tiles, Hub links and anchors stay local.
  window.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const link = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const next = new URL(link.href, location.href);
    if (next.origin !== location.origin || !/^https?:$/.test(next.protocol) || (next.pathname === location.pathname && next.search === location.search)) return;
    if (/\.[a-z0-9]+$/i.test(next.pathname) && !/\.html$/i.test(next.pathname)) return;
    record(next.href);
    if (native || !motion()) return;
    event.preventDefault(); clearTimeout(timer); animation?.cancel();
    animation = document.querySelector<HTMLElement>('main')?.animate?.([{ opacity: 1 }, { opacity: .65 }], { duration: 120 });
    timer = setTimeout(() => { location.assign(next.href); }, 120);
  });
}
