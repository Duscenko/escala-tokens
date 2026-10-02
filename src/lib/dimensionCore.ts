// Pure leaf helpers for Dimension primitives — no imports, so `layoutTokens`
// (which `themeFoundations` and therefore `dimensions` depend on) can use them
// without a cycle. Everything here is re-exported from `dimensions.ts`; import
// from there unless you ARE a module that `dimensions.ts` imports.

const DIMENSION_RE = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*(px)?\s*$/i

/** Strip float noise (`0.1 + 0.2`) so one value never mints two keys. */
export const normalizeDimension = (n: number) => Math.round(n * 1000) / 1000

/** `16px` / `16` / `-4px` / `3.5px` → the number; anything else (`none`,
 *  `1.5rem`, `100%`, a shadow string) → null. Only px is a dimension here. */
export function parseDimension(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? normalizeDimension(value) : null
  if (value == null) return null
  const m = DIMENSION_RE.exec(String(value))
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? normalizeDimension(n) : null
}

/** The primitive's NAME: `16`, `-4`, `9999`, `3_5`. `.` is the path separator
 *  in a W3C ref (`{dimension.3.5}` would read as three segments) and is not
 *  allowed in a Figma variable name, so a decimal point becomes `_`. */
export function dimensionKey(n: number): string {
  return String(normalizeDimension(n)).replace('.', '_')
}

/** Inverse of `dimensionKey`. */
export function dimensionFromKey(key: string): number {
  return Number(key.replace('_', '.'))
}
