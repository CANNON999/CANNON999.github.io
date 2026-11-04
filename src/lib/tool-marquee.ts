/** Rotate the same catalogue across three staggered rows without dropping new tools. */
export function toolRows<T>(tools: readonly T[]): T[][] {
  if (!tools.length) return [];
  return [0, 1, 2].map(row => {
    const offset = (row * Math.ceil(tools.length / 3)) % tools.length;
    return [...tools.slice(offset), ...tools.slice(0, offset)];
  });
}
