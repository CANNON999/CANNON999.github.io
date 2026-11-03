import { resizeCanvas, createField, sampleMote, ParticleBudget } from './particle-field';

// Reference: Sony's gold login field (local reference frames 04 and 06).
// All light and motes are procedural; no video or full-screen bitmap is downloaded.
export function createPortfolioDust(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { resize() {}, draw(_time: number, _still = false, _interval = 16.67) {}, interval: () => 1000 / 60 };
  const context = ctx;
  let width = 0, height = 0, ratio = 0, frames = 0, sampleFrames = 0, sampleTime = 0, sampleCost = 0;
  const field = createField();
  const budget = new ParticleBudget();
  function sprite(color: string, layer: number, bright: boolean) {
    const texture = document.createElement('canvas');
    texture.width = texture.height = 128;
    const g = texture.getContext('2d')!;
    const glow = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (layer === 0) {
      glow.addColorStop(0, `rgba(${color},1)`);
      glow.addColorStop(.2, `rgba(${color},.95)`);
      glow.addColorStop(.48, `rgba(${color},.2)`);
    } else {
      glow.addColorStop(0, `rgba(${color},${layer === 1 ? bright ? 1 : .62 : .2})`);
      glow.addColorStop(.48, `rgba(${color},${layer === 1 ? bright ? .95 : .58 : .18})`);
      glow.addColorStop(.72, `rgba(${color},${layer === 1 ? .23 : .1})`);
    }
    glow.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = glow; g.fillRect(0, 0, 128, 128);
    return texture;
  }
  const textures = ['239,188,116', '255,245,218'].map((color, i) => [0, 1, 2].map(layer => sprite(color, layer, i === 1)));
  function resize() {
    const box = canvas.getBoundingClientRect();
    const size = resizeCanvas(canvas, context, box.width, box.height, devicePixelRatio);
    width = box.width; height = box.height; ratio = size.ratio;
    canvas.dataset.pixelRatio = String(ratio);
  }
  function draw(time: number, still = false, interval = 16.67) {
    if (ratio !== devicePixelRatio) resize();
    if (!width || !height) return;
    const start = performance.now();
    const count = Math.round((width < 600 ? 380 : 720) * budget.density);
    const scale = Math.min(1.3, Math.max(.7, width / 1500));
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const p = field[i];
      const point = sampleMote(p, time / 1000);
      const size = p.size * scale;
      context.globalAlpha = Math.min(1, point.alpha * (p.color === 1 && p.phase > 4.5 ? 1.8 : 1));
      context.drawImage(textures[p.color][p.layer], point.x * width - size / 2, point.y * height - size / 2, size, size);
    }
    context.globalAlpha = 1; context.globalCompositeOperation = 'source-over';
    const cost = performance.now() - start;
    // At a 30fps drawing cap, don't misclassify intentional skips as GPU overload.
    budget.observe(budget.level === 2 ? Math.min(interval, 16.67) : interval, cost);
    frames++; sampleFrames++; sampleTime += interval; sampleCost += cost;
    if (sampleFrames >= 60 || still) {
      // Low-frequency DOM diagnostics for real browser QA; not a user-facing HUD.
      canvas.dataset.frames = String(frames);
      canvas.dataset.particles = String(count);
      canvas.dataset.drawMs = (sampleCost / sampleFrames).toFixed(2);
      canvas.dataset.fps = (1000 * sampleFrames / Math.max(1, sampleTime)).toFixed(1);
      canvas.dataset.quality = String(budget.level);
      sampleFrames = sampleTime = sampleCost = 0;
    }
  }
  resize();
  return { resize, draw, interval: () => budget.interval };
}
