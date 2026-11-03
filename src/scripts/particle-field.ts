export function canvasResolution(width: number, height: number, pixelRatio: number) {
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)), ratio };
}

export function resizeCanvas(canvas: Pick<HTMLCanvasElement, 'width' | 'height'>,
  context: Pick<CanvasRenderingContext2D, 'setTransform'>, width: number, height: number, pixelRatio: number) {
  const size = canvasResolution(width, height, pixelRatio);
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width; canvas.height = size.height;
  }
  // Browser zoom can change CSS size and DPR while physical dimensions stay equal.
  context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
  return size;
}

export interface Mote { x: number; spread: number; phase: number; speed: number; size: number; alpha: number; layer: number; color: number; }
export function createField(count = 720, seed = 97): Mote[] {
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  return Array.from({ length: count }, () => {
    const depth = random();
    const layer = depth < .62 ? 0 : depth < .94 ? 1 : 2;
    const spread = (random() + random() + random() - 1.5) * .16;
    return { x: random() * 1.3, spread, phase: random() * Math.PI * 2, speed: .55 + random() * .65,
      size: layer === 0 ? .8 + random() * 2.5 : layer === 1 ? 4 + random() * 10 : 17 + random() * 27,
      alpha: .22 + random() * .6, layer, color: random() < .86 ? 0 : 1 };
  });
}

/** A gently rising ribbon, with depth-dependent drift; wrap outside the viewport. */
export function sampleMote(p: Mote, seconds: number) {
  const x = ((p.x + seconds * .005 * p.speed * (1 + p.layer * .28)) % 1.3 + 1.3) % 1.3 - .15;
  const y = .84 - x * .39 + Math.sin(x * 5.2 + seconds * .035) * .045
    + p.spread * (p.layer === 2 ? 1.9 : 1) + Math.sin(seconds * .13 + p.phase) * .018;
  const edge = Math.min(1, Math.max(0, (x + .12) * 12), Math.max(0, (1.12 - x) * 12));
  return { x, y, alpha: p.alpha * edge * (.8 + .2 * Math.sin(seconds * .34 + p.phase)) };
}

/** Reduce work, never canvas resolution. Only react to sustained expensive frames. */
export class ParticleBudget {
  level = 0;
  private samples = 0;
  private slow = 0;
  observe(interval: number, drawMs: number) {
    if (interval <= 0 || interval > 120) return;
    this.samples++;
    if (interval > 26 || drawMs > 8) this.slow++;
    if (this.samples >= 90) {
      if (this.slow > 48) this.level = Math.min(2, this.level + 1);
      this.samples = this.slow = 0;
    }
  }
  get density() { return [1, .72, .48][this.level]; }
  get interval() { return this.level === 2 ? 1000 / 30 : 1000 / 60; }
}
