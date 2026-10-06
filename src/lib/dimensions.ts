// ── Dimension primitives ─────────────────────────────────────────────────────
// ONE global collection of numbers that every numeric foundation aliases —
// the same two-tier model colour already follows (`Color Primitives` →
// `Color Semantics`). See design-plans/dimension-primitives.md.
//
//   dimension.16        16px            ← primitive, one value, no theme modes
//   radius.lg           {dimension.16}  ← the category's scale, a filtered alias
//   radius.container    {radius.lg}     ← the role
//
// A primitive is NAMED BY ITS VALUE (`16`, `-4`, `9999`, `3_5`), never by an
// index. Every base unit here is editable (spacing presets, the size/selector
// base 3–5 in 0.5 steps, the radius slider, `ScrubInput`), so a system with a
// 3.5 base produces 10.5 and 17.5; an index ladder has no stable slot for those
// and an index whose value moves with the base stops meaning anything. `16`
// always means 16.
//
// The ladder is the STANDARD set unioned with every value some theme actually
// uses. That second half is load-bearing: the Figma plugin aliases a token to a
// primitive by exact value, so a number used by a category but missing here
// would land in Figma as a detached raw float — the exact failure the colour
// layer just had with status alphas (semanticPrimitiveLink.test.ts).

import { resolveThemeFoundations, type FoundationSource } from './themeFoundations'

/** Shown even when nothing uses them, so the collection reads as a complete
 *  palette (negatives for overlaps and shadow spreads, 9999 for pills). */
export const DIMENSION_STANDARD: readonly number[] = [
  -32, -24, -16, -12, -8, -6, -4, -2, -1,
  0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48,
  56, 60, 64, 72, 80, 96, 112, 128, 144, 160, 192, 224, 256, 320, 344, 360, 480,
  640, 768, 1024, 1280, 1440, 1920,
  9999,
]

/** The foundation maps whose values are lengths, in export order. */
export const DIMENSION_CATEGORIES = ['spacing', 'padding', 'radius', 'sizes', 'selector', 'stroke', 'grid'] as const
export type DimensionCategory = (typeof DIMENSION_CATEGORIES)[number]

/** Keys inside a category that hold a number that is NOT a length. A column
 *  count is a count: aliasing it to `dimension.12` would claim 12px. */
const NON_DIMENSION_KEYS: Partial<Record<DimensionCategory, ReadonlySet<string>>> = {
  grid: new Set(['columns']),
}

import { dimensionFromKey, dimensionKey, normalizeDimension as normalize, parseDimension } from './dimensionCore'
import { roleDimensionPx } from './layoutTokens'
export { dimensionFromKey, dimensionKey, parseDimension }

/** The W3C / tokens.json reference to a primitive. */
export const dimensionRef = (n: number) => `{dimension.${dimensionKey(n)}}`

/** The CSS custom property for a primitive. */
export const dimensionCssVar = (n: number) => `--dimension-${dimensionKey(n)}`

/** `16px` → `var(--dimension-16)`; a value that isn't a length passes through. */
export function dimensionVar(value: string): string {
  const n = parseDimension(value)
  return n === null ? value : `var(${dimensionCssVar(n)})`
}

/** Is this entry of this category a length the ladder has to carry? */
export function isDimensionEntry(category: DimensionCategory, key: string, value: string): boolean {
  if (NON_DIMENSION_KEYS[category]?.has(key)) return false
  return parseDimension(value) !== null
}

export type DimensionMaps = Partial<Record<DimensionCategory, Record<string, string> | undefined>> & {
  /** Role maps: a role may be PINNED to a primitive (`dimension-21`), a length
   *  that exists nowhere in the scale maps once the ramp moves on. */
  radiusRoles?: Record<string, string>
  spacingRoles?: Record<string, string>
  sizeRoles?: Record<string, string>
  selectorRoles?: Record<string, string>
  strokeRoles?: Record<string, string>
  breakpointRoles?: Record<string, string>
  gridFrame?: Partial<Record<'desktop' | 'tablet' | 'mobile', Partial<Record<'columns' | 'gutter' | 'margin' | 'container', string>>>>
}

const ROLE_MAPS = ['radiusRoles', 'spacingRoles', 'sizeRoles', 'selectorRoles', 'strokeRoles', 'breakpointRoles'] as const

/** Every length a set of foundation maps uses. */
export function collectDimensions(sources: DimensionMaps[]): Set<number> {
  const out = new Set<number>()
  for (const src of sources) {
    for (const category of DIMENSION_CATEGORIES) {
      for (const [key, value] of Object.entries(src[category] ?? {})) {
        if (!isDimensionEntry(category, key, value)) continue
        out.add(parseDimension(value)!)
      }
    }
    // Pinned roles and pinned Grid frame fields — the ladder must keep them.
    for (const key of ROLE_MAPS) {
      for (const value of Object.values(src[key] ?? {})) {
        const n = roleDimensionPx(value)
        if (n !== null) out.add(n)
      }
    }
    for (const frame of Object.values(src.gridFrame ?? {})) {
      for (const [field, value] of Object.entries(frame ?? {})) {
        if (field === 'columns') continue
        const n = roleDimensionPx(value)
        if (n !== null) out.add(n)
      }
    }
  }
  return out
}

/** The collection itself: key → `<n>px`. Built in ascending order, but a JS
 *  object (and therefore the JSON) always lists integer-like keys (`0`, `16`)
 *  before `-4` and `3_5`, whatever the insertion order — so a consumer that
 *  needs numeric order sorts by `dimensionFromKey`, it never trusts key order. */
export function buildDimensionScale(values: Iterable<number>): Record<string, string> {
  const all = new Set<number>(DIMENSION_STANDARD)
  for (const v of values) all.add(normalize(v))
  return Object.fromEntries(
    [...all].sort((a, b) => a - b).map((n) => [dimensionKey(n), `${n}px`]),
  )
}

/** Category → step → `{dimension.N}`, for the entries that are lengths. */
export function dimensionRefsOf(maps: DimensionMaps): Partial<Record<DimensionCategory, Record<string, string>>> {
  const out: Partial<Record<DimensionCategory, Record<string, string>>> = {}
  for (const category of DIMENSION_CATEGORIES) {
    const map = maps[category]
    if (!map) continue
    const refs: Record<string, string> = {}
    for (const [key, value] of Object.entries(map)) {
      if (!isDimensionEntry(category, key, value)) continue
      refs[key] = dimensionRef(parseDimension(value)!)
    }
    if (Object.keys(refs).length) out[category] = refs
  }
  return out
}

/** The ladder for a store: standard ∪ the globals ∪ every listed theme's
 *  resolved foundations. tokens.json and variables.css both call this with
 *  the themes they ship, so the two can't carry different collections. */
export function dimensionScaleForStore(store: FoundationSource, themeKeys: readonly string[]): Record<string, string> {
  const sources: DimensionMaps[] = [store, ...themeKeys.map((t) => resolveThemeFoundations(store, t))]
  return buildDimensionScale(collectDimensions(sources))
}

/** CSS declarations for exactly the primitives a block of lines references —
 *  so a per-section snippet stays self-contained without shipping the whole
 *  ladder. */
export function dimensionDeclsFor(lines: readonly string[]): string[] {
  const used = new Set<string>()
  for (const line of lines) {
    for (const m of line.matchAll(/var\(--dimension-(-?[\d_]+)\)/g)) used.add(m[1])
  }
  return [...used]
    .map((key) => [key, dimensionFromKey(key)] as const)
    .sort((a, b) => a[1] - b[1])
    .map(([key, n]) => `--dimension-${key}: ${n}px;`)
}

/** The token name a category entry ships as in CSS (`radius-lg`,
 *  `padding-top`, `breakpoint-md`) — what "used by" lists. */
function usageName(category: DimensionCategory, key: string): string {
  if (category === 'grid') return key.startsWith('breakpoint-') ? key : `grid-${key}`
  if (category === 'sizes') return `size-${key}`
  return `${category}-${key}`
}

/** Primitive key → every token that aliases it, in category order. */
export function dimensionUsage(maps: DimensionMaps): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const category of DIMENSION_CATEGORIES) {
    for (const [key, value] of Object.entries(maps[category] ?? {})) {
      if (!isDimensionEntry(category, key, value)) continue
      const k = dimensionKey(parseDimension(value)!)
      const list = out.get(k) ?? []
      list.push(usageName(category, key))
      out.set(k, list)
    }
  }
  return out
}

/** Primitives as `[key, px]`, in NUMERIC order (never trust the map's key order). */
export function sortedDimensions(scale: Record<string, string>): [string, number][] {
  return Object.keys(scale)
    .map((k) => [k, dimensionFromKey(k)] as [string, number])
    .sort((a, b) => a[1] - b[1])
}
