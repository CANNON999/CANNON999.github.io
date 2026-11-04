/** Seven rows leave overscan for the diagonal crop without dropping new tools. */
export const TOOL_ROW_COUNT = 7;
export function toolRows<T>(tools: readonly T[]): T[][] {
  if (!tools.length) return [];
  return Array.from({ length: TOOL_ROW_COUNT }, (_, row) => {
    // Separate neighbouring rows by a third of the catalogue so the diagonal
    // window shows different tools instead of adjacent duplicate clusters.
    const offset = (row * Math.ceil(tools.length / 3)) % tools.length;
    return [...tools.slice(offset), ...tools.slice(0, offset)];
  });
}
