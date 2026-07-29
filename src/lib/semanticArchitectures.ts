// ─── Semantic architectures ──────────────────────────────────────────────────
// The flat 89-role catalogue (semanticRoles.ts) stays the single editing model;
// this module PROJECTS it into alternative token shapes the user can pick in
// the Alias/Semantics tab. Pure data + math — no store imports, so it's shared
// by the picker UI, the token export and the README without cycles.
//
//   flat        — the existing shape (colors.semantic / colors.themes)
//   categorical — LIGHTWEIGHT: a fixed 29-role catalogue (Content · Action ·
//                 Surface · Status · Border), light/dark primitive refs inside
//                 each token (DTCG-style) — deliberately NOT the 89 flat roles
//   vibrancy    — Apple HIG roles: labels/fills/separators as alpha layers over
//                 RGB channel primitives + opaque WCAG fallbacks + materials
//   tonal       — Material 3: 0–100 tonal palettes derived from the accent,
//                 paired on-colors, light↔dark as a tone inversion (40↔80…)
import chroma from 'chroma-js'
import type { GlobalScales } from './semanticRoles'
import { accessibleSolidTone } from './colorUtils'
import type { ThemePalette } from '../store/useDesignStore'

export type SemanticArchitecture = 'flat' | 'categorical' | 'vibrancy' | 'tonal'

export const ARCHITECTURE_OPTIONS: {
  key: SemanticArchitecture
  label: string
  desc: string
  /** Educational tooltip — when to reach for this system. */
  tip: string
}[] = [
  {
    key: 'flat',
    label: 'Flat Semantic',
    desc: 'One alias per role — fastest to consume.',
    tip: 'One alias per role, resolved in a single hop — token → primitive. Hierarchy lives in the name (surface-, action-, text-). Best for CSS variables, Tailwind utilities and flat Figma collections; zero tooling required to consume.',
  },
  {
    key: 'categorical',
    label: 'Categorical Semantic',
    desc: 'Lightweight — 29 curated roles, light/dark built in.',
    tip: 'A minimal, fixed catalogue of 29 roles grouped by function — Content, Action, Surface, Status, Border — with the light and dark primitive reference inside each token. Best when you want a lean system that tooling walks as a token tree (DTCG, Style Dictionary, Figma modes).',
  },
  {
    key: 'vibrancy',
    label: 'Contextual Vibrancy',
    desc: 'Alpha labels over materials + fallbacks.',
    tip: 'Hierarchy through opacity instead of separate inks: labels and fills are alpha layers over RGB primitives, adapting to any material behind them. Every translucent role ships an opaque fallback that holds WCAG contrast without backdrop-filter.',
  },
  {
    key: 'tonal',
    label: 'Material Tonal',
    desc: 'M3 tones 0–100, paired on-colors.',
    tip: 'Guarantees algorithmic contrast through HCT color spaces and 0-to-100 tonal scales. Every color ships a paired on-color, and dark mode is a mathematical inversion — 40↔80, 90↔30 — so contrast survives any seed color.',
  },
]

export function architectureLabel(kind: SemanticArchitecture): string {
  return ARCHITECTURE_OPTIONS.find((o) => o.key === kind)?.label ?? kind
}

// Everything a projection needs, resolved by the caller (store or export).
export type ProjectionInput = {
  themes: Record<string, Record<string, string>>
  themeKinds: Record<string, 'light' | 'dark'>
  themePalettes: Record<string, ThemePalette>
  scales: GlobalScales
  accent: string
}

// ── Categorical ──────────────────────────────────────────────────────────────
// LIGHTWEIGHT by contract: a fixed, curated 29-role catalogue — NOT a
// projection of the 89 flat roles. Content · Action · Surface · Status ·
// Border, every leaf carrying its light + dark primitive reference. Tones
// follow the same math the flat catalogue uses (gray hierarchy inverts onto
// neutral-dark, subtle tints deepen 2→11, text band mirrors 11→7, solid brand
// fills hold their tone), so both architectures always agree on what a role
// looks like.
// NOTE ON THE DARK COLUMN: `neutral-dark` runs 1 = darkest (tone 1 IS
// `darkBackground`, emitted verbatim) → 12 = lightest, exactly like the light
// ramp runs 1 = page → 12 = highest-contrast text. So a dark ref uses the SAME
// step number as its light counterpart, not a mirrored one. This table
// originally mirrored them (page → `{neutral-dark.12}`), which rendered the
// whole dark column as a light theme — the same leftover pre-Radix inversion
// that had to be removed from the flat catalogue's `darkTone`s. Keep the steps
// aligned; if you find yourself writing `13 − n` here, that's the bug.
const CATEGORICAL_ROLES: { group: string; key: string; light: string; dark: string }[] = [
  // Content — text & icon ink
  { group: 'content', key: 'primary',   light: '{neutral.12}', dark: '{neutral-dark.12}' },
  { group: 'content', key: 'on-action', light: '{neutral.1}',  dark: '{neutral.1}' }, // holds — sits on action.primary, which holds its tone
  { group: 'content', key: 'secondary', light: '{neutral.11}', dark: '{neutral-dark.11}' },
  { group: 'content', key: 'subtle',    light: '{neutral.9}',  dark: '{neutral-dark.9}' },
  { group: 'content', key: 'inverse',   light: '{neutral.1}',  dark: '{neutral-dark.1}' }, // ink on surface.inverse
  { group: 'content', key: 'accent',    light: '{accent.11}',  dark: '{accent.11}' },
  // Action — interactive fills ('{accent.solid}' resolves to accessibleSolidTone)
  { group: 'action', key: 'primary',   light: '{accent.solid}', dark: '{accent.solid}' },
  { group: 'action', key: 'neutral',   light: '{neutral.3}',    dark: '{neutral-dark.3}' },
  { group: 'action', key: 'secondary', light: '{accent.3}',     dark: '{accent.3}' },
  { group: 'action', key: 'disabled',  light: '{neutral.2}',    dark: '{neutral-dark.2}' },
  // Surface — elevation levels
  { group: 'surface', key: 'page',    light: '{neutral.1}',  dark: '{neutral-dark.1}' },
  { group: 'surface', key: 'layer-1', light: '{neutral.2}',  dark: '{neutral-dark.2}' },
  { group: 'surface', key: 'layer-2', light: '{neutral.3}',  dark: '{neutral-dark.3}' },
  { group: 'surface', key: 'accent',  light: '{accent.2}',   dark: '{accent.2}' },
  // Deliberately inverted, like the flat catalogue's `*-inverse`: an inverse
  // surface is dark on a light page and light on a dark one, by definition.
  { group: 'surface', key: 'inverse', light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // Scrim — stays dark in BOTH appearances (it dims, it doesn't invert).
  { group: 'surface', key: 'overlay', light: '{neutral.12}', dark: '{neutral-dark.1}' }, // pair with opacity.60
  // Status — feedback fg/bg pairs (critical = error family)
  { group: 'status', key: 'critical-bg', light: '{error.2}',    dark: '{error.11}' },
  { group: 'status', key: 'critical-fg', light: '{error.11}',   dark: '{error.7}' },
  { group: 'status', key: 'warning-bg',  light: '{warning.2}',  dark: '{warning.11}' },
  { group: 'status', key: 'warning-fg',  light: '{warning.11}', dark: '{warning.7}' },
  { group: 'status', key: 'success-bg',  light: '{success.2}',  dark: '{success.11}' },
  { group: 'status', key: 'success-fg',  light: '{success.11}', dark: '{success.7}' },
  // Border — strokes. (`subtle` sitting on a HIGHER tone than `default` reads
  // backwards, but that's the shipped light-mode schema and light mode isn't
  // broken — left alone deliberately rather than silently re-pointing exported
  // tokens. Only the dark steps are realigned here.)
  { group: 'border', key: 'default',  light: '{neutral.3}', dark: '{neutral-dark.3}' },
  { group: 'border', key: 'accent',   light: '{accent.8}',  dark: '{accent.8}' },
  { group: 'border', key: 'subtle',   light: '{neutral.5}', dark: '{neutral-dark.5}' },
  { group: 'border', key: 'active',   light: '{accent.9}',  dark: '{accent.8}' }, // focus ring — ≥3:1 vs page (WCAG 1.4.11)
  { group: 'border', key: 'critical', light: '{error.8}',   dark: '{error.7}' },
  { group: 'border', key: 'warning',  light: '{warning.8}', dark: '{warning.7}' },
  { group: 'border', key: 'success',  light: '{success.8}', dark: '{success.7}' },
]

/**
 * Categorical's ref SCHEMA for every role, at a given theme KIND. Unlike
 * Vibrancy/Tonal (fixed binary formulas over the global primitives),
 * Categorical's schema only depends on kind — "surface.page is neutral.1 for
 * a light-kind theme, neutral-dark.1 for a dark-kind one" — the same rule any
 * number of themes can share. So this stays a 2-variant function (light-kind,
 * dark-kind schema); what varies per THEME is which primitive family a ref's
 * `neutral`/`accent`/etc. resolves against, handled by the caller's `look`.
 */
function categoricalSchemaFor(kind: 'light' | 'dark', solidTone: number): { group: string; key: string; ref: string }[] {
  return CATEGORICAL_ROLES.map((r) => ({
    group: r.group,
    key: r.key,
    // The one dynamic tone: the solid brand fill deepens until its light ink
    // passes WCAG AA — same accessibleSolidTone() anchor the flat export uses.
    ref: (kind === 'dark' ? r.dark : r.light).replace('{accent.solid}', `{accent.${solidTone}}`),
  }))
}

/**
 * Categorical resolved across every theme in `themeOrder`: group → token →
 * themeKey → ref. Each theme reuses `categoricalSchemaFor(theme's kind)` — the
 * schema is theme-count-independent — resolved against that THEME's own
 * palette (`themePalettes[key]`, already kind-picked by `resolveThemePalette`)
 * when it has one, falling back to the global scales for the two built-ins.
 */
export function projectCategorical(
  input: ProjectionInput,
  themeOrder: string[] = ['light', 'dark'],
): Record<string, Record<string, Record<string, string>>> {
  const solid = accessibleSolidTone(input.scales.brand)
  const out: Record<string, Record<string, Record<string, string>>> = {}
  for (const t of themeOrder) {
    const kind = input.themeKinds[t] ?? 'light'
    for (const r of categoricalSchemaFor(kind, solid)) {
      out[r.group] ??= {}
      out[r.group][r.key] ??= {}
      out[r.group][r.key][t] = r.ref
    }
  }
  return out
}

// ── Vibrancy ─────────────────────────────────────────────────────────────────
// Apple HIG opacity tiers (labels 100/60/30/18 · fills 20/16/12/8 · separator
// 36). Alpha roles reference RGB channel primitives; every text-grade role
// ships an opaque fallback resolved to the nearest AA-safe ramp tone.
const rgbOf = (hex: string): string => {
  try { return chroma(hex).rgb().map(Math.round).join(' ') } catch { return '0 0 0' }
}

type VibrancyMode = {
  channels: Record<string, string>
  labels: Record<string, string>
  labelFallbacks: Record<string, string>
  backgrounds: Record<string, string>
  fills: Record<string, string>
  separators: Record<string, string>
  tint: string
  materials: Record<string, string>
}

export function projectVibrancy(input: ProjectionInput): { light: VibrancyMode; dark: VibrancyMode; blur: string } {
  const gray = input.scales.gray
  const grayDark = input.scales.grayDark ?? gray
  const solidTone = accessibleSolidTone(input.scales.brand)
  const solidBrand = input.scales.brand[solidTone] ?? input.accent

  const mode = (
    scale: Record<number, string>, fam: 'neutral' | 'neutral-dark',
    pageTone: number, inkTone: number, bg2Tone: number, bg3Tone: number, sepTone: number,
    // Opaque fallback refs — mode-specific: the nearest solid tone to what the
    // alpha label composites to over the page (secondary must stay AA-safe).
    secondaryFb: number, tertiaryFb: number,
  ): VibrancyMode => {
    const page = scale[pageTone] ?? '#ffffff'
    const ink = scale[inkTone] ?? '#000000'
    return {
      channels: {
        [`rgb-${fam}-${pageTone}`]: rgbOf(page),
        [`rgb-${fam}-${inkTone}`]: rgbOf(ink),
        'rgb-accent-solid': rgbOf(solidBrand),
      },
      labels: {
        primary: `rgb(${rgbOf(ink)} / 1)`,
        secondary: `rgb(${rgbOf(ink)} / 0.60)`,
        tertiary: `rgb(${rgbOf(ink)} / 0.30)`,   // non-text use only
        quaternary: `rgb(${rgbOf(ink)} / 0.18)`, // decorative only
      },
      labelFallbacks: {
        primary: `{${fam}.${inkTone}}`,
        secondary: `{${fam}.${secondaryFb}}`, // nearest AA-safe solid tone
        tertiary: `{${fam}.${tertiaryFb}}`,   // appearance match — not for text
      },
      // System background stack — opaque by design, so pure primitive refs (R1).
      backgrounds: {
        primary: `{${fam}.${pageTone}}`,
        secondary: `{${fam}.${bg2Tone}}`,
        tertiary: `{${fam}.${bg3Tone}}`,
      },
      fills: {
        primary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.20)`,
        secondary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.16)`,
        tertiary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.12)`,
        quaternary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.08)`,
      },
      separators: {
        default: `rgb(${rgbOf(scale[sepTone] ?? '#919396')} / 0.36)`,
        opaque: `{${fam}.${bg3Tone}}`,
      },
      tint: `rgb(${rgbOf(solidBrand)} / 1)`,
      materials: {
        thick: `rgb(${rgbOf(page)} / 0.93)`,
        regular: `rgb(${rgbOf(page)} / 0.80)`,
        thin: `rgb(${rgbOf(page)} / 0.60)`,
      },
    }
  }

  return {
    // light: page grows from tone 1, ink is tone 12.
    light: mode(gray, 'neutral', 1, 12, 2, 3, 6, 8, 5),
    // dark: the hierarchy inverts — page IS tone 12 of the dark ramp.
    dark: mode(grayDark, 'neutral-dark', 12, 1, 11, 10, 6, 5, 9),
    blur: 'blur(20px) saturate(1.8)',
  }
}

/** Composite an alpha ink over a base — what an alpha role effectively reads as. */
export function compositeOver(inkHex: string, alpha: number, baseHex: string): string {
  try { return chroma.mix(baseHex, inkHex, alpha, 'rgb').hex() } catch { return inkHex }
}

// ── Tonal (Material 3) ───────────────────────────────────────────────────────
// Palettes are derived in OKLCH (the codebase's color space): L = tone/100 and
// chroma tapers sinusoidally to 0 at both extremes — the same behavior HCT
// tonal palettes exhibit. Neutral carries the extended surface-container stops.
const TONAL_STOPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100]
const TONAL_STOPS_NEUTRAL = [0, 4, 6, 10, 12, 17, 20, 22, 24, 30, 40, 50, 60, 70, 80, 87, 90, 92, 94, 95, 96, 98, 99, 100]

export function tonalPalette(seedHex: string, opts: { hueShift?: number; chromaMul?: number; chromaAbs?: number; stops?: number[] } = {}): Record<number, string> {
  let c = 0.13
  let h = 0
  try {
    const [, sc, shRaw] = chroma(seedHex).oklch()
    c = sc
    h = Number.isNaN(shRaw) ? 0 : shRaw
  } catch { /* keep fallbacks */ }
  h += opts.hueShift ?? 0
  const base = opts.chromaAbs ?? c * (opts.chromaMul ?? 1)
  const out: Record<number, string> = {}
  for (const t of opts.stops ?? TONAL_STOPS) {
    const L = t / 100
    const cc = Math.max(0, base * Math.sin(Math.PI * (t / 100)))
    try { out[t] = chroma.oklch(L, cc, h).hex() } catch { out[t] = t >= 50 ? '#ffffff' : '#000000' }
  }
  return out
}

export function tonalPalettes(accent: string, errorSeed: string): Record<string, Record<number, string>> {
  return {
    primary: tonalPalette(accent),
    secondary: tonalPalette(accent, { chromaMul: 0.32 }),
    tertiary: tonalPalette(accent, { hueShift: 60, chromaMul: 0.85 }),
    error: tonalPalette(errorSeed),
    neutral: tonalPalette(accent, { chromaAbs: 0.01, stops: TONAL_STOPS_NEUTRAL }),
    'neutral-variant': tonalPalette(accent, { chromaAbs: 0.028, stops: TONAL_STOPS_NEUTRAL }),
  }
}

// The strict M3 scheme: light 40/100/90/10 ↔ dark 80/20/30/90, surfaces on the
// extended neutral stops, outlines on neutral-variant.
export const TONAL_SCHEME: { group: string; role: string; palette: string; light: number; dark: number }[] = [
  { group: 'core', role: 'primary', palette: 'primary', light: 40, dark: 80 },
  { group: 'core', role: 'on-primary', palette: 'primary', light: 100, dark: 20 },
  { group: 'core', role: 'primary-container', palette: 'primary', light: 90, dark: 30 },
  { group: 'core', role: 'on-primary-container', palette: 'primary', light: 10, dark: 90 },
  { group: 'core', role: 'inverse-primary', palette: 'primary', light: 80, dark: 40 },
  { group: 'secondary', role: 'secondary', palette: 'secondary', light: 40, dark: 80 },
  { group: 'secondary', role: 'on-secondary', palette: 'secondary', light: 100, dark: 20 },
  { group: 'secondary', role: 'secondary-container', palette: 'secondary', light: 90, dark: 30 },
  { group: 'secondary', role: 'on-secondary-container', palette: 'secondary', light: 10, dark: 90 },
  { group: 'tertiary', role: 'tertiary', palette: 'tertiary', light: 40, dark: 80 },
  { group: 'tertiary', role: 'on-tertiary', palette: 'tertiary', light: 100, dark: 20 },
  { group: 'tertiary', role: 'tertiary-container', palette: 'tertiary', light: 90, dark: 30 },
  { group: 'tertiary', role: 'on-tertiary-container', palette: 'tertiary', light: 10, dark: 90 },
  { group: 'error', role: 'error', palette: 'error', light: 40, dark: 80 },
  { group: 'error', role: 'on-error', palette: 'error', light: 100, dark: 20 },
  { group: 'error', role: 'error-container', palette: 'error', light: 90, dark: 30 },
  { group: 'error', role: 'on-error-container', palette: 'error', light: 10, dark: 90 },
  { group: 'surfaces', role: 'surface', palette: 'neutral', light: 98, dark: 6 },
  { group: 'surfaces', role: 'on-surface', palette: 'neutral', light: 10, dark: 90 },
  { group: 'surfaces', role: 'surface-variant', palette: 'neutral-variant', light: 90, dark: 30 },
  { group: 'surfaces', role: 'on-surface-variant', palette: 'neutral-variant', light: 30, dark: 80 },
  { group: 'surfaces', role: 'surface-container-lowest', palette: 'neutral', light: 100, dark: 4 },
  { group: 'surfaces', role: 'surface-container-low', palette: 'neutral', light: 96, dark: 10 },
  { group: 'surfaces', role: 'surface-container', palette: 'neutral', light: 94, dark: 12 },
  { group: 'surfaces', role: 'surface-container-high', palette: 'neutral', light: 92, dark: 17 },
  { group: 'surfaces', role: 'surface-container-highest', palette: 'neutral', light: 90, dark: 22 },
  { group: 'surfaces', role: 'inverse-surface', palette: 'neutral', light: 20, dark: 90 },
  { group: 'surfaces', role: 'inverse-on-surface', palette: 'neutral', light: 95, dark: 20 },
  { group: 'outlines', role: 'outline', palette: 'neutral-variant', light: 50, dark: 60 },
  { group: 'outlines', role: 'outline-variant', palette: 'neutral-variant', light: 80, dark: 30 },
]

export function projectTonal(input: ProjectionInput, errorSeed: string): {
  palettes: Record<string, Record<number, string>>
  scheme: Record<string, Record<string, { light: string; dark: string }>>
} {
  const palettes = tonalPalettes(input.accent, errorSeed)
  const scheme: Record<string, Record<string, { light: string; dark: string }>> = {}
  for (const e of TONAL_SCHEME) {
    scheme[e.group] ??= {}
    scheme[e.group][e.role] = { light: `{${e.palette}.${e.light}}`, dark: `{${e.palette}.${e.dark}}` }
  }
  return { palettes, scheme }
}

// ── UI view model (Alias/Semantics matrix) ──────────────────────────────────
// What the Semantic editor renders for a NON-flat architecture: the sidebar
// categories, per-category token lists and resolved swatches all derive from
// the SAME projection the export emits, so the view is always schema-faithful.
export type ArchTokenValue = { css: string; label: string }
export type ArchTokenView = {
  key: string
  /** One value per MODE this token's architecture ships, keyed by theme key.
   *  Vibrancy and Tonal always carry exactly `{light, dark}` — their math is a
   *  fixed binary transform of the global primitives with no per-theme
   *  concept, so adding a theme can't extend them (see `buildArchitectureView`).
   *  Categorical carries one entry per theme passed in `themeOrder`, since its
   *  refs resolve per-theme the same way the flat catalogue's roles do. */
  modes: Record<string, ArchTokenValue>
  /** Which modes the user re-pointed — drives the "edited" affordance. */
  edited?: Record<string, boolean>
  /** Vibrancy labels only: the opaque WCAG fallback alias, per mode — shown as
   *  a badge so the safety net for missing backdrop-filter stays visible. */
  fallback?: Record<string, ArchTokenValue>
}
export type ArchCategoryView = { key: string; label: string; description: string; tokens: ArchTokenView[] }
/** `modeKeys` is the AUTHORITATIVE column list for the table to render — every
 *  token's `modes` map has exactly these keys. Categorical: `themeOrder`
 *  (as many columns as themes exist). Vibrancy/Tonal: always `['light','dark']`,
 *  regardless of `themeOrder` — their math has no per-theme concept to extend. */
export type ArchitectureView = { categories: ArchCategoryView[]; total: number; modeKeys: string[] }

/** `{family.tone}` ref → swatch color + display label; raw CSS values pass through. */
function refToView(ref: string, lookup: (fam: string, tone: number) => string | undefined): ArchTokenValue {
  const m = /^\{([a-z-]+)\.(\d+)\}$/.exec(ref)
  if (m) return { css: lookup(m[1], Number(m[2])) ?? 'transparent', label: `${m[1]}.${m[2]}` }
  return { css: ref, label: ref }
}

// `palette`, when given, is a THEME's own resolved families (`resolveThemePalette`
// — already picked for that theme's kind, so `palette.gray` is the right-appearance
// ramp regardless of whether the caller asks for 'neutral' or 'neutral-dark'; only
// one of those two ever actually gets read for a given theme, since a role's ref
// schema only exposes the half matching that theme's kind). Falls back to the
// GLOBAL scales for the two built-in themes (which carry no `themeSources` entry
// and so resolve `undefined` from `resolveThemePalette`) — identical to today.
// `kind` picks the dark TWIN for a coloured family when there's no palette to
// resolve it from — the built-in 'dark' theme has no `themeSources` entry (so
// `palette` is undefined) but its `action.primary`/etc refs still read
// `{accent.X}`, and without this that resolved the LIGHT accent ramp even in
// dark mode (every coloured ref showed the identical hex across both columns
// — `accent.9` in light and dark both landing on the raw input colour).
// `GlobalScales.dark` already carries these twins (the flat catalogue's
// `sourceScaleFor` reads the exact same field); this was the one caller that
// wasn't consulting it. `kind` defaults to 'light' for callers that never
// need it (Vibrancy's `look` only ever resolves explicit 'neutral'/
// 'neutral-dark' family names, never 'accent'/'error'/etc, so its mode split
// is already handled upstream).
function scaleLookup(
  scales: GlobalScales,
  palette?: ThemePalette,
  kind: 'light' | 'dark' = 'light',
): (fam: string, tone: number) => string | undefined {
  const darkTwin = (fam: 'brand' | 'error' | 'warning' | 'success' | 'info') =>
    kind === 'dark' ? scales.dark?.[fam] : undefined
  const fams: Record<string, Record<number, string> | undefined> = {
    neutral: palette?.gray ?? scales.gray,
    'neutral-dark': palette?.gray ?? (scales.grayDark ?? scales.gray),
    accent: palette?.brand ?? darkTwin('brand') ?? scales.brand,
    error: palette?.error ?? darkTwin('error') ?? scales.error,
    warning: palette?.warning ?? darkTwin('warning') ?? scales.warning,
    success: palette?.success ?? darkTwin('success') ?? scales.success,
    info: palette?.info ?? darkTwin('info') ?? scales.info,
  }
  return (fam, tone) => fams[fam]?.[tone]
}

// Vibrancy/Tonal only — always exactly a light+dark pair (see ArchTokenView).
const pairViews = (
  keys: string[],
  light: Record<string, string>,
  dark: Record<string, string>,
  look: (fam: string, tone: number) => string | undefined,
): ArchTokenView[] =>
  keys.map((key) => ({
    key,
    modes: { light: refToView(light[key] ?? '', look), dark: refToView(dark[key] ?? '', look) },
  }))

/** Edits applied over a projection: `category.token` → mode → primitive ref. */
export type ArchOverrides = Record<string, Record<string, string>>

/**
 * Re-points a projected token at whatever primitive the user chose. The value
 * is still a REF, so an edited token resolves through the ramps exactly like an
 * unedited one — the projection defines the schema, the override only says
 * which primitive a slot reads.
 */
function applyOverrides(
  categories: ArchCategoryView[],
  overrides: ArchOverrides,
  // Per-MODE lookup — an override on theme "midnight" must resolve against
  // midnight's own palette, not whichever theme happened to supply a shared
  // `look`. Accepts either one shared function (Vibrancy/Tonal, always
  // light/dark over the globals) or a map keyed by mode (Categorical).
  look: ((fam: string, tone: number) => string | undefined) | Record<string, (fam: string, tone: number) => string | undefined>,
): ArchCategoryView[] {
  if (!Object.keys(overrides).length) return categories
  const lookFor = (mode: string) => (typeof look === 'function' ? look : look[mode] ?? Object.values(look)[0])
  return categories.map((c) => ({
    ...c,
    tokens: c.tokens.map((tk) => {
      const ov = overrides[`${c.key}.${tk.key}`]
      if (!ov) return tk
      const modes = { ...tk.modes }
      const edited: Record<string, boolean> = {}
      for (const [mode, ref] of Object.entries(ov)) {
        edited[mode] = Boolean(ref)
        if (ref) modes[mode] = refToView(ref, lookFor(mode))
      }
      return { ...tk, modes, edited }
    }),
  }))
}

export function buildArchitectureView(
  kind: SemanticArchitecture,
  input: ProjectionInput,
  errorSeed: string,
  overrides: ArchOverrides = {},
  /** Which themes to resolve columns for — CATEGORICAL ONLY. Defaults to the
   *  two built-ins for callers that don't pass one. Vibrancy/Tonal ignore this
   *  entirely (see ArchitectureView.modeKeys). */
  themeOrder: string[] = ['light', 'dark'],
): ArchitectureView | null {
  if (kind === 'flat') return null

  if (kind === 'categorical') {
    const tokens = projectCategorical(input, themeOrder)
    // Each theme resolves refs against ITS OWN palette (custom families a
    // theme references), not one shared lookup — same per-theme resolution
    // the flat catalogue's roles get via `sourceScaleFor`.
    const lookByTheme: Record<string, (fam: string, tone: number) => string | undefined> =
      Object.fromEntries(themeOrder.map((t) => [t, scaleLookup(input.scales, input.themePalettes[t], input.themeKinds[t] ?? 'light')]))
    const META: Record<string, [string, string]> = {
      content: ['Content', 'Text & icon ink — primary to inverse'],
      action: ['Action', 'Interactive element fills'],
      surface: ['Surface', 'Page and layer backgrounds'],
      status: ['Status', 'Feedback fg/bg pairs per severity'],
      border: ['Border', 'Strokes, focus and severity borders'],
    }
    const categories = Object.entries(tokens).map(([key, group]) => ({
      key,
      label: META[key]?.[0] ?? key,
      description: META[key]?.[1] ?? '',
      tokens: Object.entries(group).map(([k, byTheme]) => ({
        key: k,
        modes: Object.fromEntries(
          themeOrder.map((t) => [t, refToView(byTheme[t] ?? '', lookByTheme[t])]),
        ),
      })),
    }))
    const edited = applyOverrides(categories, overrides, lookByTheme)
    return { categories: edited, total: edited.reduce((n, c) => n + c.tokens.length, 0), modeKeys: themeOrder }
  }

  if (kind === 'vibrancy') {
    const v = projectVibrancy(input)
    const look = scaleLookup(input.scales)
    // The HIG grouping is strictly labels · backgrounds · fills · separators ·
    // materials. Fallbacks aren't a group of their own — each label carries its
    // opaque alias as metadata (rendered as a badge on the row). `tint` stays
    // export-only.
    const labelTokens = pairViews(Object.keys(v.light.labels), v.light.labels, v.dark.labels, look).map((t) => {
      const fbL = v.light.labelFallbacks[t.key]
      const fbD = v.dark.labelFallbacks[t.key]
      return fbL && fbD
        ? { ...t, fallback: { light: refToView(fbL, look), dark: refToView(fbD, look) } }
        : t
    })
    const categories: ArchCategoryView[] = [
      { key: 'labels', label: 'Labels', description: 'One ink, hierarchy through opacity (100/60/30/18) — each text label carries its opaque WCAG fallback', tokens: labelTokens },
      { key: 'backgrounds', label: 'Backgrounds', description: 'System background stack — opaque by design', tokens: pairViews(Object.keys(v.light.backgrounds), v.light.backgrounds, v.dark.backgrounds, look) },
      { key: 'fills', label: 'Fills', description: 'Thin control washes over any content', tokens: pairViews(Object.keys(v.light.fills), v.light.fills, v.dark.fills, look) },
      { key: 'separators', label: 'Separators', description: 'Hairlines — alpha default + opaque twin', tokens: pairViews(Object.keys(v.light.separators), v.light.separators, v.dark.separators, look) },
      { key: 'materials', label: 'Materials', description: 'Translucent panels — pair with backdrop blur', tokens: pairViews(Object.keys(v.light.materials), v.light.materials, v.dark.materials, look) },
    ]
    const edited = applyOverrides(categories, overrides, look)
    // Fixed light/dark by construction — Vibrancy's math has no per-theme
    // concept, so adding a theme doesn't add a column here (see modeKeys doc).
    return { categories: edited, total: edited.reduce((n, c) => n + c.tokens.length, 0), modeKeys: ['light', 'dark'] }
  }

  // tonal
  const { palettes, scheme } = projectTonal(input, errorSeed)
  const look = (fam: string, tone: number) => palettes[fam]?.[tone]
  const META: Record<string, [string, string]> = {
    core: ['Core', 'Primary roles + paired on-colors'],
    secondary: ['Secondary', 'Muted companion palette (chroma ÷3)'],
    tertiary: ['Tertiary', 'Contrast accent (hue +60°)'],
    error: ['Error', 'Error roles + paired on-colors'],
    surfaces: ['Surfaces', 'Neutral surface stack + containers'],
    outlines: ['Outlines', 'Borders on the neutral-variant palette'],
  }
  const categories = Object.entries(scheme).map(([key, group]) => ({
    key,
    label: META[key]?.[0] ?? key,
    description: META[key]?.[1] ?? '',
    tokens: Object.entries(group).map(([k, v]) => ({
      key: k,
      modes: { light: refToView(v.light, look), dark: refToView(v.dark, look) },
    })),
  }))
  const editedTonal = applyOverrides(categories, overrides, look)
  // Fixed light/dark by construction — Tonal's dark is a tone-inversion of the
  // one accent (40↔80, 90↔30…), with no per-theme concept to extend either.
  return { categories: editedTonal, total: editedTonal.reduce((n, c) => n + c.tokens.length, 0), modeKeys: ['light', 'dark'] }
}

// ── Export dispatcher ────────────────────────────────────────────────────────
/** The additive `colors.architecture` payload for tokens.json (null for flat —
 *  the flat shape already ships as colors.semantic/themes). */
export function projectArchitecture(
  kind: SemanticArchitecture,
  input: ProjectionInput,
  errorSeed: string,
  overrides: ArchOverrides = {},
  /** Themes to ship columns for (Categorical only) — same as buildArchitectureView. */
  themeOrder: string[] = ['light', 'dark'],
): Record<string, unknown> | null {
  switch (kind) {
    case 'categorical': {
      const tokens = projectCategorical(input, themeOrder)
      // Re-point any edited slot so tokens.json matches what the table shows.
      // ADDITIVE by construction: `light`/`dark` keys are always present (any
      // consumer reading `.light`/`.dark` sees identical values to before),
      // extra theme keys only appear when the system actually has them.
      for (const [id, ov] of Object.entries(overrides)) {
        const [group, key] = id.split('.')
        const slot = tokens[group]?.[key]
        if (!slot) continue
        for (const [mode, ref] of Object.entries(ov)) {
          if (ref) slot[mode] = ref
        }
      }
      return { kind, tokens }
    }
    case 'vibrancy':
      return { kind, tokens: projectVibrancy(input) }
    case 'tonal':
      return { kind, ...projectTonal(input, errorSeed) }
    default:
      return null
  }
}
