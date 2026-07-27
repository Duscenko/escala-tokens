// ─── Semantic role catalogue ─────────────────────────────────────────────────
// Single source of truth for the semantic-token taxonomy: which roles exist,
// which primitive ramp each one draws from, and its recommended tone per theme
// kind. Shared by the Semantic editor (Step3_SemanticTokens) and the token
// export (tokenGenerator), so exported values ALWAYS resolve to a tone of
// their source ramp — the Figma plugin aliases them to primitives by hex.
import { GRAY_DARK_SCALE, type ThemePalette } from '../store/useDesignStore'
import { accessibleSolidTone } from './colorUtils'

// ── Source palettes a token can draw from ──────────────────────────────────
export type ScaleSource = 'gray' | 'brand' | 'error' | 'warning' | 'success' | 'info'

// A role can also point at the theme-independent `base` primitives (pure
// white / black). It's not one of the 12-tone ramps, so it stays out of
// GlobalScales / ThemePalette and resolves from BASE_SCALE below.
export type RoleScale = ScaleSource | 'base'

export const SCALE_META: Record<RoleScale, { label: string }> = {
  gray:    { label: 'neutral' },
  brand:   { label: 'accent' },
  error:   { label: 'error' },
  warning: { label: 'warning' },
  success: { label: 'success' },
  info:    { label: 'info' },
  base:    { label: 'base' },
}

// The `base` primitive family — theme-independent pure white / black. Only
// tone 1 (white) and tone 12 (black) are meaningful; the in-between slots exist
// so it satisfies the Record<number,string> ramp shape the resolver expects.
export const BASE_SCALE: Record<number, string> = {
  1: '#ffffff', 2: '#ffffff', 3: '#ffffff', 4: '#ffffff', 5: '#ffffff', 6: '#ffffff',
  7: '#000000', 8: '#000000', 9: '#000000', 10: '#000000', 11: '#000000', 12: '#000000',
}
/** Primitive reference label for a `base` tone (1 → white, 12 → black). */
export const baseLabelForTone = (tone: number): 'white' | 'black' => (tone <= 6 ? 'white' : 'black')

export type Role = {
  key: string
  label: string
  description: string
  // Light-mode source ramp + tone.
  scale: RoleScale
  tone: number
  // Optional explicit dark-mode spec. When present the resolver uses these
  // verbatim instead of deriving dark from light via recDarkTone — the
  // Content/Background/Border catalogue pins dark tones that don't follow a
  // uniform inversion (e.g. content-primary 900↔50, border-brand-alt brand↔gray).
  darkScale?: RoleScale
  darkTone?: number
  contrastAgainst: string | null
  isVariant: boolean
}

export type RoleGroup = {
  category: string
  label: string
  description: string
  roles: Role[]
}
// Untitled-UI canonical semantic layer: Content (text/icon foregrounds),
// Background (surfaces + solid fills) and Border. Each role pins an explicit
// light + dark primitive — dark tones don't follow a uniform inversion — so the
// export can emit them as DTCG references verbatim.
export const ROLE_GROUPS: RoleGroup[] = [
  {
    category: 'content',
    label: 'Content',
    description: 'Text and icon foreground colors across light and dark modes',
    roles: [
      { key: 'content-primary',       label: 'content-primary',       description: 'Primary text — headings, body.',                scale: 'gray',    tone: 11, darkTone: 2,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-secondary',     label: 'content-secondary',     description: 'Secondary text — labels, section headings.',    scale: 'gray',    tone: 9,  darkTone: 5,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-tertiary',      label: 'content-tertiary',      description: 'Tertiary text — supporting / paragraph text.',  scale: 'gray',    tone: 8,  darkTone: 6,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-quaternary',    label: 'content-quaternary',    description: 'Quaternary text — captions, footnotes.',        scale: 'gray',    tone: 7,  darkTone: 7,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-inverse',       label: 'content-inverse',       description: 'Text on inverse / solid surfaces.',             scale: 'base',    tone: 1,  darkScale: 'gray', darkTone: 11, contrastAgainst: null, isVariant: false },
      { key: 'content-disabled',      label: 'content-disabled',      description: 'Disabled text.',                                scale: 'gray',    tone: 6,  darkTone: 8,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-brand',         label: 'content-brand',         description: 'Brand text — links, emphasis.',                 scale: 'brand',   tone: 8,  darkTone: 6,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-brand-hover',   label: 'content-brand-hover',   description: 'Brand text hover state.',                       scale: 'brand',   tone: 9,  darkTone: 5,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-error',         label: 'content-error',         description: 'Error text.',                                   scale: 'error',   tone: 8,  darkTone: 6,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-warning',       label: 'content-warning',       description: 'Warning text.',                                 scale: 'warning', tone: 8,  darkTone: 6,  contrastAgainst: 'background-primary', isVariant: false },
      { key: 'content-success',       label: 'content-success',       description: 'Success text.',                                 scale: 'success', tone: 8,  darkTone: 6,  contrastAgainst: 'background-primary', isVariant: false },
    ],
  },
  {
    category: 'background',
    label: 'Background',
    description: 'Surface and fill colors — page, containers and solid actions',
    roles: [
      { key: 'background-primary',           label: 'background-primary',           description: 'Page background — the base canvas.',      scale: 'base',    tone: 1,  darkScale: 'gray', darkTone: 12, contrastAgainst: null, isVariant: false },
      { key: 'background-primary-hover',     label: 'background-primary-hover',     description: 'Hover state for the primary background.', scale: 'gray',    tone: 2,  darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'background-secondary',         label: 'background-secondary',         description: 'Raised / secondary surface — cards.',     scale: 'gray',    tone: 2,  darkTone: 11, contrastAgainst: null, isVariant: false },
      { key: 'background-secondary-hover',   label: 'background-secondary-hover',   description: 'Hover state for the secondary surface.',  scale: 'gray',    tone: 3,  darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'background-tertiary',          label: 'background-tertiary',          description: 'Sunken / nested surface.',                scale: 'gray',    tone: 3,  darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'background-quaternary',        label: 'background-quaternary',        description: 'Deepest nested surface.',                 scale: 'gray',    tone: 4,  darkTone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'background-active',            label: 'background-active',            description: 'Active / selected row surface.',          scale: 'gray',    tone: 2,  darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'background-disabled',          label: 'background-disabled',          description: 'Disabled control fill.',                  scale: 'gray',    tone: 3,  darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'background-disabled-subtle',   label: 'background-disabled-subtle',   description: 'Subtle disabled fill.',                   scale: 'gray',    tone: 2,  darkTone: 11, contrastAgainst: null, isVariant: false },
      { key: 'background-overlay',           label: 'background-overlay',           description: 'Modal scrim behind dialogs.',            scale: 'gray',    tone: 12, darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'background-brand-primary',     label: 'background-brand-primary',     description: 'Subtle brand-tinted surface.',            scale: 'brand',   tone: 2,  darkTone: 12, contrastAgainst: null, isVariant: false },
      { key: 'background-brand-secondary',   label: 'background-brand-secondary',   description: 'Stronger brand-tinted surface.',          scale: 'brand',   tone: 3,  darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'background-brand-solid',       label: 'background-brand-solid',       description: 'Solid brand fill — primary buttons.',     scale: 'brand',   tone: 8,  darkTone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'background-brand-solid-hover', label: 'background-brand-solid-hover', description: 'Solid brand fill hover state.',           scale: 'brand',   tone: 9,  darkTone: 7,  contrastAgainst: null, isVariant: false },
      { key: 'background-error-primary',     label: 'background-error-primary',     description: 'Subtle error surface.',                   scale: 'error',   tone: 2,  darkTone: 12, contrastAgainst: null, isVariant: false },
      { key: 'background-error-solid',       label: 'background-error-solid',       description: 'Solid error fill.',                       scale: 'error',   tone: 8,  darkTone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'background-warning-primary',   label: 'background-warning-primary',   description: 'Subtle warning surface.',                 scale: 'warning', tone: 2,  darkTone: 12, contrastAgainst: null, isVariant: false },
      { key: 'background-warning-solid',     label: 'background-warning-solid',     description: 'Solid warning fill.',                     scale: 'warning', tone: 8,  darkTone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'background-success-primary',   label: 'background-success-primary',   description: 'Subtle success surface.',                 scale: 'success', tone: 2,  darkTone: 12, contrastAgainst: null, isVariant: false },
      { key: 'background-success-solid',     label: 'background-success-solid',     description: 'Solid success fill.',                     scale: 'success', tone: 8,  darkTone: 8,  contrastAgainst: null, isVariant: false },
    ],
  },
  {
    category: 'border',
    label: 'Border',
    description: 'Stroke colors for borders, dividers and separators',
    roles: [
      { key: 'border-primary',        label: 'border-primary',        description: 'Default border — inputs, cards.',        scale: 'gray',  tone: 5, darkTone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'border-secondary',      label: 'border-secondary',      description: 'Subtle border — dividers.',              scale: 'gray',  tone: 4, darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'border-tertiary',       label: 'border-tertiary',       description: 'Faint border — nested dividers.',        scale: 'gray',  tone: 3, darkTone: 10, contrastAgainst: null, isVariant: false },
      { key: 'border-disabled',       label: 'border-disabled',       description: 'Disabled border.',                       scale: 'gray',  tone: 5, darkTone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'border-brand',          label: 'border-brand',          description: 'Brand border — focus / active states.',  scale: 'brand', tone: 7, darkTone: 6,  contrastAgainst: null, isVariant: false },
      { key: 'border-brand-alt',      label: 'border-brand-alt',      description: 'Brand border; turns gray in dark mode.', scale: 'brand', tone: 8, darkScale: 'gray', darkTone: 9, contrastAgainst: null, isVariant: false },
      { key: 'border-error',          label: 'border-error',          description: 'Error border — invalid inputs.',         scale: 'error', tone: 7, darkTone: 6,  contrastAgainst: null, isVariant: false },
      { key: 'border-error-subtle',   label: 'border-error-subtle',   description: 'Subtle error border.',                   scale: 'error', tone: 5, darkTone: 7,  contrastAgainst: null, isVariant: false },
    ],
  },
]

export const ALL_ROLES = ROLE_GROUPS.flatMap((g) => g.roles)

// Brand-scale tokens (key → recommended tone). Reused by the quick brand-color
// edit in the Components catalogue to re-derive brand tokens from a new scale.
export const BRAND_TOKEN_TONES: Record<string, number> = Object.fromEntries(
  ALL_ROLES.filter((r) => r.scale === 'brand').map((r) => [r.key, r.tone]),
)

/** Index (1–12) of the tone in `scale` whose hex matches `hex`, else null. */
export function toneIndexOf(scale: Record<number, string>, hex: string): number | null {
  if (!hex) return null
  const target = hex.toLowerCase()
  for (const [k, v] of Object.entries(scale)) {
    if (v.toLowerCase() === target) return Number(k)
  }
  return null
}

// Border-band dark tones are hand-tuned, not mirrored from their light tone —
// a straight invert reads too heavy against a near-black surface-0. Grouped
// by weight tier (strong / default / subtle) so disabled variants inherit
// their non-disabled sibling's dark weight.
const BORDER_DARK_TONES: Record<string, number> = {
  'border-strong': 8,
  'border-default': 10,
  'border-default-alt': 10,
  'border-disabled': 10,
  'border-subtle': 11,
  'border-disabled-subtle': 11,
}

/**
 * Recommended dark-mode tone for a role.
 *
 * With Radix role-ordered ramps this is essentially the IDENTITY: step numbers
 * mean the same thing in both appearances (1–2 app background, 3–5 component,
 * 6–8 border, 9 solid, 10 solid hover, 11–12 text), so a role reads the same
 * step and simply gets the value tuned for that page. The dark ramp does the
 * work the old tone-remapping used to fake.
 *
 * The only exceptions are roles that deliberately INVERT against the theme —
 * an inverse surface is dark in a light theme and light in a dark one — so they
 * mirror across the ramp instead of holding their step.
 */
export function recDarkTone(role: Role): number {
  const t = role.tone
  // Deliberately-inverted roles: they sit on the opposite polarity by design,
  // so in dark they mirror (13−t) rather than keeping their step.
  const inverts =
    role.key === 'text-on-inverse' ||
    role.key === 'icon-on-inverse' ||
    role.key === 'surface-overlay' ||
    role.key === 'surface-inverse' ||
    role.key === 'surface-inverse-muted' ||
    role.key === 'content-inverse'
  if (inverts) return Math.min(12, Math.max(1, 13 - t))
  return t
}

// ── Ramp resolution + recommended values ────────────────────────────────────

/** The global (light) source ramps, one per ScaleSource. */
export type GlobalScales = Record<ScaleSource, Record<number, string>> & {
  /**
   * The dark-appearance ramps — one per family, the Radix two-scale model.
   * A dark theme resolves EVERY coloured scale from its dark twin, not just
   * gray: read from the light ramp, a deepened brand tint (recDarkTone sends
   * subtle tints to tones 10–12) is a colour eased toward a WHITE page, then
   * painted on a dark one. Optional so older callers keep working — they fall
   * back to the light ramp (and GRAY_DARK_SCALE for gray).
   */
  grayDark?: Record<number, string>
  dark?: Partial<Record<ScaleSource, Record<number, string>>>
}

/**
 * The ramp a role draws from in a given theme. Custom style themes carry their
 * own palette; built-in light/dark use the global scales, and in dark EVERY
 * family resolves from its own dark ramp (see `GlobalScales.dark`).
 */
export function sourceScaleFor(
  role: Role,
  kind: 'light' | 'dark',
  global: GlobalScales,
  palette?: ThemePalette,
): Record<number, string> {
  // A role can point at a different ramp in dark mode (e.g. content-inverse:
  // base(white) → gray, border-brand-alt: brand → gray).
  const eff: RoleScale = kind === 'dark' && role.darkScale ? role.darkScale : role.scale
  // The theme-independent base primitives (pure white / black).
  if (eff === 'base') return BASE_SCALE
  if (palette) return palette[eff]
  // Gray is the only ramp with a distinct dark twin: it's generated from the
  // neutral against `darkBackground`, so the dark surfaces carry the accent's
  // tint. Colored ramps keep their hue and just shift tone (see recDarkTone).
  if (kind === 'dark') {
    if (eff === 'gray') return global.grayDark ?? GRAY_DARK_SCALE
    const twin = global.dark?.[eff]
    if (twin && Object.keys(twin).length) return twin
  }
  return global[eff]
}

/**
 * Recommended tone for a role given the theme kind. Light kinds use the role's
 * documented tone; dark kinds invert via recDarkTone. The solid brand button
 * overrides its tone so white text always passes WCAG AA, even for bright hues.
 */
export function recToneFor(role: Role, kind: 'light' | 'dark', scale: Record<number, string>): number {
  // The solid brand fill anchors its tone (in BOTH light and dark) to the
  // lightest tone whose white/near-white label still passes WCAG AA — a bright
  // accent's base tone 9 is too light for readable ink, so we deepen it. Doing
  // this in dark too keeps brand buttons legible for every accent, not just
  // dark-enough ones.
  if (role.key === 'action-primary' || role.key === 'action-primary-hover') {
    const solid = accessibleSolidTone(scale)
    return role.key === 'action-primary' ? solid : Math.min(solid + 1, 12)
  }
  if (kind === 'dark') {
    // Explicit dark tone wins (the Content/Background/Border catalogue pins it);
    // legacy roles without one fall back to the derived inversion.
    return role.darkTone ?? recDarkTone(role)
  }
  return role.tone
}

export function recHexFor(role: Role, kind: 'light' | 'dark', scale: Record<number, string>): string {
  return scale[recToneFor(role, kind, scale)] ?? ''
}

/**
 * Snap a stored value onto its role's source ramp: keep it when it already IS
 * a tone of the ramp (an intentional tone choice), otherwise fall back to the
 * recommended tone. Guarantees exports never carry stale hex values from a
 * ramp that has since been regenerated.
 */
export function normalizeThemeValue(
  role: Role,
  kind: 'light' | 'dark',
  scale: Record<number, string>,
  current: string | undefined,
): string {
  if (current && toneIndexOf(scale, current) !== null) return current
  return recHexFor(role, kind, scale)
}
