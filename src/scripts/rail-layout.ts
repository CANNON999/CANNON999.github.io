interface RailLayout {
  current: number;
  count: number;
  viewportWidth: number;
  rootFontSize: number;
  smallRem: number;
  largeRem: number;
  gapRem: number;
  compact: boolean;
}

/** Use final design sizes, not an animated cover's transient bounding box. */
export function railOffset(layout: RailLayout) {
  const { count, rootFontSize: unit, compact } = layout;
  const small = layout.smallRem * unit;
  const large = layout.largeRem * unit;
  const gap = layout.gapRem * unit;
  // The rail has half a rem of outline space on each side.
  const viewport = Math.max(0, layout.viewportWidth - unit);
  const total = (count - 1) * (small + gap) + large;
  if (count < 1 || total <= viewport) return 0;
  const current = Math.max(0, Math.min(count - 1, layout.current));
  const context = compact ? small + gap : Math.min(2 * (small + gap), viewport * .2);
  return Math.max(0, current * (small + gap) - context);
}
