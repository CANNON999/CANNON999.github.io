type Scene = { personal: boolean; cover: string };
type Options = {
  backdrop: HTMLElement;
  layers: [HTMLElement, HTMLElement];
  motionOff: () => boolean;
  onParticleVisibilityChange: () => void;
};

/** Keep the particle field underneath one artwork group, including during reversals. */
export function createSceneBackground({ backdrop, layers, motionOff, onParticleVisibilityChange }: Options) {
  const animations = new Map<HTMLElement, Animation>();
  const decoded = new Set<string>();
  let generation = 0;
  let requested = '';
  let particles = true;

  function setParticles(visible: boolean) {
    if (particles === visible) return;
    particles = visible;
    onParticleVisibilityChange();
  }

  // Read every rendered value before canceling anything: inline styles already
  // contain the animation's destination, not the frame the visitor is seeing.
  function freeze() {
    const values = [...animations.keys()].map(element => [element, getComputedStyle(element).opacity] as const);
    for (const [element, opacity] of values) {
      animations.get(element)!.cancel();
      element.style.opacity = opacity;
    }
    animations.clear();
  }

  function fade(element: HTMLElement, opacity: number, done?: () => void) {
    const from = Number(getComputedStyle(element).opacity);
    element.style.opacity = String(opacity);
    if (motionOff() || Math.abs(from - opacity) < .001) { done?.(); return; }
    const animation = element.animate([{ opacity: from }, { opacity }], {
      duration: 620, easing: 'cubic-bezier(.2,.65,.25,1)',
    });
    animations.set(element, animation);
    animation.onfinish = () => {
      if (animations.get(element) !== animation) return;
      animations.delete(element);
      done?.();
    };
  }

  async function show(scene: Scene) {
    const key = scene.personal ? 'personal' : `work:${scene.cover}`;
    if (key === requested) return;
    requested = key;
    const turn = ++generation;
    let cover = scene.cover;
    if (!scene.personal && cover && !decoded.has(cover)) {
      const image = new Image();
      image.src = cover;
      try { await image.decode(); decoded.add(cover); }
      catch { cover = ''; }
    }
    if (turn !== generation) return;
    freeze();

    if (scene.personal) {
      // Keep both artwork textures and their current weights. Moving either one
      // to a fresh layer at .83 here was the flash on a quick return to profile.
      setParticles(true);
      fade(backdrop, 0);
      return;
    }

    const groupOpacity = Number(getComputedStyle(backdrop).opacity);
    backdrop.dataset.theme = cover ? 'project' : 'notes';
    let target = cover ? layers.find(layer => layer.dataset.cover === cover) : undefined;
    if (cover && (!target || groupOpacity < .001)) {
      // Two reusable layers bound memory, even when the visitor scans many works.
      target ||= [...layers].sort((a, b) => Number(a.style.opacity || 0) - Number(b.style.opacity || 0))[0];
      target.style.backgroundImage = `url("${cover}")`;
      target.dataset.cover = cover;
      target.style.opacity = groupOpacity < .001 ? '.83' : '0';
    }
    for (const layer of layers) {
      if (groupOpacity < .001) layer.style.opacity = layer === target ? '.83' : '0';
      else fade(layer, layer === target ? .83 : 0);
    }
    if (groupOpacity < 1) setParticles(true);
    fade(backdrop, 1, () => { if (turn === generation) setParticles(false); });
    // A failed asset may be retried by selecting it again, without stale work
    // ever overwriting a newer personal scene.
    if (cover !== scene.cover) requested = '';
  }

  return {
    show,
    needsParticles: () => particles,
    finish() {
      for (const animation of animations.values()) animation.finish();
      // Finish callbacks are queued by the browser; settle drawing immediately.
      setParticles(Number(backdrop.style.opacity) < 1);
    },
    suspend() { generation++; requested = ''; freeze(); },
  };
}
