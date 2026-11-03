import { WheelNavigator, type WheelInput } from './wheel-navigation.ts';

/** Browsers do not expose the input device. Be conservative with pixel streams:
 * fractional/diagonal/variable deltas stay touchpad; repeated 100/120px detents
 * can opt into mouse acceleration. One ambiguous event always advances once.
 */
export class WheelBurstNavigator {
  private touchpad = new WheelNavigator();
  private lastTime = -Infinity;
  private direction = 0;
  private source: 'unknown' | 'touchpad' | 'mouse' = 'unknown';
  private quantum = 0;
  private candidateAt = 0;
  private admitted = 0;

  reset() {
    this.touchpad.reset(); this.lastTime = -Infinity; this.direction = 0;
    this.source = 'unknown'; this.quantum = 0; this.candidateAt = 0; this.admitted = 0;
  }

  push(event: WheelInput, delta: number, now: number) {
    if (!Number.isFinite(delta) || !Number.isFinite(now) || Math.abs(delta) < .5) return { steps: 0, fresh: false };
    const sign = Math.sign(delta);
    const fresh = now - this.lastTime > 180 || (sign !== this.direction && Math.abs(delta) >= 3);
    if (!fresh && sign !== this.direction && Math.abs(delta) < 3) return { steps: 0, fresh: false };
    if (fresh) this.reset();
    this.lastTime = now; this.direction = sign;
    const magnitude = Math.abs(event.deltaY);
    const quantum = event.deltaMode === 0 && event.deltaX === 0 && Number.isInteger(magnitude)
      ? magnitude % 120 === 0 ? 120 : magnitude % 100 === 0 ? 100 : 0 : 0;
    if (event.deltaMode !== 0) this.source = 'mouse';
    else if (!quantum && this.source !== 'mouse') this.source = 'touchpad';
    else if (this.source === 'unknown') {
      if (!this.quantum) { this.quantum = quantum; this.candidateAt = now; }
      else if (this.quantum === quantum && now - this.candidateAt >= 24) this.source = 'mouse';
      else if (this.quantum !== quantum) this.source = 'touchpad';
    }
    if (this.source === 'mouse') {
      const notch = event.deltaMode === 1 ? 48 : event.deltaMode === 2 ? Math.abs(delta) : this.quantum;
      const requested = Math.max(1, Math.round(Math.abs(delta) / notch));
      const accepted = Math.max(0, Math.min(5 - this.admitted, requested));
      this.admitted += accepted;
      this.touchpad.reset();
      return { steps: sign * accepted, fresh };
    }
    const steps = this.touchpad.push(delta, now);
    this.admitted += Math.abs(steps);
    return { steps, fresh };
  }
}

/** Drain admitted detents one by one, with no more than one selection / 140ms. */
export class PacedWheelSteps {
  private pending = 0;
  private lastStep = -Infinity;
  reset() { this.pending = 0; this.lastStep = -Infinity; }
  add(steps: number) {
    if (!steps) return;
    if (this.pending && Math.sign(steps) !== Math.sign(this.pending)) this.reset();
    this.pending = Math.sign(steps) * Math.min(5, Math.abs(this.pending) + Math.abs(steps));
  }
  take(now: number) {
    if (!this.pending || now - this.lastStep < 140) return 0;
    const step = Math.sign(this.pending);
    this.pending -= step; this.lastStep = now;
    return step;
  }
  delay(now: number) { return this.pending ? Math.max(0, 140 - (now - this.lastStep)) : null; }
}
