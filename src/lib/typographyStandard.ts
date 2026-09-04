// Typography token standard — Figma "6. Typography" collection (32 vars).
// Pure data, shared by Step4 (UI), the store defaults, and the export. Mirrors the
// ROLE_GROUPS pattern in Step3_SemanticTokens and the COMPONENTS array in componentCatalogue.

// ── Type scale (shared key set for font-size & line-height) ─────────────────
export const TYPE_SCALE_KEYS = [
  'text-xs', 'text-sm', 'text-md', 'text-lg', 'text-xl',
  'display-xs', 'display-sm', 'display-md', 'display-lg', 'display-xl', 'display-2xl',
] as const
export type TypeScaleKey = (typeof TYPE_SCALE_KEYS)[number]

export const FONT_SIZE_STANDARD: Record<string, string> = {
  'text-xs': '12px', 'text-sm': '14px', 'text-md': '16px', 'text-lg': '18px', 'text-xl': '20px',
  'display-xs': '24px', 'display-sm': '30px', 'display-md': '36px',
  'display-lg': '48px', 'display-xl': '60px', 'display-2xl': '72px',
}

export const LINE_HEIGHT_STANDARD: Record<string, string> = {
  'text-xs': '18px', 'text-sm': '20px', 'text-md': '24px', 'text-lg': '28px', 'text-xl': '30px',
  'display-xs': '32px', 'display-sm': '38px', 'display-md': '44px',
  'display-lg': '60px', 'display-xl': '72px', 'display-2xl': '90px',
}

// ── Type-scale modes (rail quick setting) ──────────────────────────────────
// Five curated density steps. `default` is FONT_SIZE_STANDARD verbatim (factor
// 1 × an integer scale is a no-op), so an existing system infers as 'default'
// and nothing regenerates. The others scale every step by one factor and carry
// the line-heights along at the SAME factor, so the standard's size→leading
// ratio — the vertical rhythm — survives the resize. This is the type analogue
// of Sizes' base-unit slider: one control, the whole scale moves together.
// Factors are eighths (0.875 … 1.125): they round cleanly against the standard's
// integer steps, so no two adjacent sizes collapse to a 1px gap the way a
// coarser factor does on the small end.
export const TYPE_SCALE_MODES = [
  { key: 'compact', label: 'Compact', factor: 0.875 },
  { key: 'cozy', label: 'Cozy', factor: 0.9375 },
  { key: 'default', label: 'Default', factor: 1 },
  { key: 'comfortable', label: 'Comfortable', factor: 1.0625 },
  { key: 'spacious', label: 'Spacious', factor: 1.125 },
] as const
export type TypeScaleMode = (typeof TYPE_SCALE_MODES)[number]['key']

export function buildTypeScale(factor: number): {
  sizes: Record<string, string>
  lineHeights: Record<string, string>
} {
  const sizes: Record<string, string> = {}
  const lineHeights: Record<string, string> = {}
  for (const key of TYPE_SCALE_KEYS) {
    const size = parseFloat(FONT_SIZE_STANDARD[key]) || 0
    const lh = parseFloat(LINE_HEIGHT_STANDARD[key]) || 0
    sizes[key] = `${Math.round(size * factor)}px`
    lineHeights[key] = `${Math.round(lh * factor)}px`
  }
  return { sizes, lineHeights }
}

/** Which mode a stored size map matches, or null → the UI reads "Custom". */
/**
 * Modular ratios a generator can pick. The shipped `FONT_SIZE_STANDARD` is
 * hand-tuned (adjacent steps wander 1.111–1.333) and stays the default — this
 * is the parametric alternative, not a replacement. `buildTypeScale` still
 * multiplies the irregular table so existing systems do not restyle.
 */
export const TYPE_SCALE_RATIOS = [1.125, 1.2, 1.25, 1.333] as const
export type TypeScaleRatio = (typeof TYPE_SCALE_RATIOS)[number]

/** `text-md` is the base; every other step is `round(base × ratio^n)`. Leading
 *  is a single factor of the size so the vertical rhythm stays one number. */
export function buildModularTypeScale(basePx: number, ratio: number, leading = 1.5): {
  sizes: Record<string, string>
  lineHeights: Record<string, string>
} {
  const origin = TYPE_SCALE_KEYS.indexOf('text-md')
  const sizes: Record<string, string> = {}
  const lineHeights: Record<string, string> = {}
  for (let i = 0; i < TYPE_SCALE_KEYS.length; i++) {
    const key = TYPE_SCALE_KEYS[i]
    const px = Math.max(1, Math.round(basePx * (ratio ** (i - origin))))
    sizes[key] = `${px}px`
    lineHeights[key] = `${Math.max(px, Math.round(px * leading))}px`
  }
  return { sizes, lineHeights }
}

export function inferTypeScaleMode(sizes?: Record<string, string>): TypeScaleMode | null {
  if (!sizes) return null
  for (const mode of TYPE_SCALE_MODES) {
    const built = buildTypeScale(mode.factor).sizes
    if (TYPE_SCALE_KEYS.every((key) => (sizes[key] ?? '') === built[key])) return mode.key
  }
  return null
}

// ── Font weight ─────────────────────────────────────────────────────────────
// 4 numeric bases are the editable values; the Figma group shows 8 rows (each
// base × normal/italic). Italic rows mirror their base weight.
export interface WeightBase {
  key: string
  label: string
  weight: number
}
export const FONT_WEIGHT_BASES: WeightBase[] = [
  { key: 'regular',  label: 'Regular',  weight: 400 },
  { key: 'medium',   label: 'Medium',   weight: 500 },
  { key: 'semibold', label: 'Semibold', weight: 600 },
  { key: 'bold',     label: 'Bold',     weight: 700 },
]

export const FONT_WEIGHT_STANDARD: Record<string, number> = Object.fromEntries(
  FONT_WEIGHT_BASES.map((b) => [b.key, b.weight]),
)

export interface WeightRow {
  name: string
  base: string
  italic: boolean
}
export const FONT_WEIGHT_ROWS: WeightRow[] = FONT_WEIGHT_BASES.flatMap((b) => [
  { name: b.key, base: b.key, italic: false },
  { name: `${b.key}-italic`, base: b.key, italic: true },
])

// ── Font family ─────────────────────────────────────────────────────────────
export interface FamilyRow {
  key: string
  role: 'display' | 'body'
  label: string
}
export const FONT_FAMILY_ROWS: FamilyRow[] = [
  // CSS emits `--font-family-heading` (and type roles alias that var). The
  // standard used to declare `font-family-display` — same slot, two names.
  // The export name wins; `role: 'display'` is the type-role family slot.
  { key: 'font-family-heading', role: 'display', label: 'font-family-heading' },
  { key: 'font-family-body',    role: 'body',    label: 'font-family-body' },
]

// ── Side-nav categories (counts mirror the Figma "Groups" panel) ────────────
export type TypoCategory = 'all' | 'family' | 'weight' | 'size' | 'lineHeight'
export const TYPO_CATEGORIES: { key: TypoCategory; label: string; count: number }[] = [
  { key: 'all',        label: 'All',         count: 32 },
  { key: 'family',     label: 'Font family', count: FONT_FAMILY_ROWS.length },
  { key: 'weight',     label: 'Font weight', count: FONT_WEIGHT_ROWS.length },
  { key: 'size',       label: 'Font size',   count: TYPE_SCALE_KEYS.length },
  { key: 'lineHeight', label: 'Line height', count: TYPE_SCALE_KEYS.length },
]
