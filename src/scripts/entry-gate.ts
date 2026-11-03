// Self-contained: serialized into the head so it runs before the first body paint.
export function installEntryGate(assetKey: string) {
  const root = document.documentElement;
  let seen = false;
  try { seen = sessionStorage.getItem('cannon-ready-v2') === assetKey; } catch { /* Optional storage. */ }
  let internal = false;
  try { internal = new URL(document.referrer).origin === location.origin; } catch { /* Direct visit. */ }
  root.dataset.assetKey = assetKey;
  root.dataset.startup = seen || internal ? 'ready' : 'pending';
  // A failed JS module must not permanently conceal otherwise readable HTML.
  if (!seen && !internal) setTimeout(() => {
    if (root.dataset.startup !== 'pending') return;
    root.dataset.startup = 'ready';
    const shell = document.getElementById('console-shell');
    if (shell) shell.inert = false;
    const boot = document.getElementById('boot-screen');
    if (boot) boot.hidden = true;
  }, 15000);
}
