/** Wheel events do not expose a portable "fingers down" / momentum phase.
 * Recognize a fresh impulse without waiting for the previous inertial tail to end.
 * Keep this independent of animation duration and DOM so traces can be replayed.
 */
export interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export function wheelIntent(event: WheelInput, context: {
  intro: boolean; overflowing: boolean; overLibrary: boolean; viewportHeight: number;
}): number {
  if (context.intro || event.ctrlKey || event.metaKey) return 0;
  const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  // A short page must still accept horizontal trackpad input over its main content.
  if (context.overflowing && !context.overLibrary && !horizontal) return 0;
  const delta = horizontal ? event.deltaX : event.deltaY;
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? context.viewportHeight : 1;
  return Number.isFinite(delta) ? delta * scale : 0;
}

export class WheelNavigator {
  private lastTime = -Infinity;
  private lastStep = -Infinity;
  private direction = 0;
  private previous = 0;
  private distance = 0;
  private consumed = false;
  private falling = false;
  private trough = Infinity;
  private attack: { base: number; peak: number; distance: number; samples: number } | null = null;
  private steadySince = 0;
  private steadyDistance = 0;

  reset() {
    this.lastTime = this.lastStep = -Infinity;
    this.direction = this.previous = this.distance = 0;
    this.consumed = this.falling = false;
    this.trough = Infinity;
    this.attack = null;
    this.steadySince = this.steadyDistance = 0;
  }

  push(delta: number, now: number, discrete = false): number {
    if (!Number.isFinite(delta) || !Number.isFinite(now) || Math.abs(delta) < .5) return 0;
    const magnitude = Math.abs(delta);
    const direction = Math.sign(delta);
    // Line/page-mode wheels are discrete inputs, not pixel-mode trackpad inertia.
    if (discrete) { this.reset(); return direction; }
    const idle = now - this.lastTime > 110;
    const reversed = direction !== this.direction;
    if (!idle && reversed && magnitude < 3) return 0; // Ignore tiny rebound noise.
    if (idle || reversed) this.reset();
    this.lastTime = now;
    this.direction = direction;
    const previous = this.previous;
    this.previous = magnitude;

    const step = () => {
      this.lastStep = now;
      this.consumed = true;
      this.distance = 0;
      this.falling = false;
      this.trough = magnitude;
      this.attack = null;
      this.steadySince = now;
      this.steadyDistance = 0;
      return direction;
    };
    if (!this.consumed) {
      this.distance += magnitude;
      return this.distance >= 36 ? step() : 0;
    }

    if (magnitude < previous - .5) this.falling = true;
    this.trough = this.falling ? Math.min(this.trough, magnitude) : magnitude;
    // Ignore the initial acceleration of the same swipe, not the whole animation.
    if (now - this.lastStep < 80) return 0;

    if (this.attack) {
      // One anomalous spike in a tail must not become another project selection.
      if (magnitude < Math.max(3, this.attack.base * 1.25, this.attack.peak * .45)) {
        this.attack = null;
      } else {
        this.attack.distance += magnitude;
        this.attack.samples++;
        this.attack.peak = Math.max(this.attack.peak, magnitude);
        if (this.attack.samples >= 2 && this.attack.distance >= 36) return step();
      }
    } else if (this.falling && magnitude >= Math.max(4, this.trough * 1.6) && magnitude - this.trough >= 3) {
      this.attack = { base: this.trough, peak: magnitude, distance: magnitude, samples: 1 };
    }

    // A deliberately sustained drag may keep browsing; a decaying tail may not.
    if (magnitude >= 8 && magnitude >= previous * .98 && magnitude <= previous * 1.1) {
      if (!this.steadyDistance) this.steadySince = now;
      this.steadyDistance += magnitude;
      if (now - this.lastStep >= 220 && now - this.steadySince >= 80 && this.steadyDistance >= 80) return step();
    } else {
      this.steadyDistance = 0;
    }
    return 0;
  }
}
