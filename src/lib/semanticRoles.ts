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

export const SCALE_META: Record<ScaleSource, { label: string }> = {
  gray:    { label: 'neutral' },
  brand:   { label: 'accent' },
  error:   { label: 'error' },
  warning: { label: 'warning' },
  success: { label: 'success' },
  info:    { label: 'info' },
}

export type Role = {
  key: string
  label: string
  description: string
  scale: ScaleSource
  tone: number
  contrastAgainst: string | null
  isVariant: boolean
}

export type RoleGroup = {
  category: string
  label: string
  description: string
  roles: Role[]
}
// Tones follow the Radix Colors taxonomy against the 12-step ramps:
// 1–2 backgrounds · 3–5 interactive fills · 6–8 borders · 9–10 solids
// (9 = the base color) · 11–12 text.
export const ROLE_GROUPS: RoleGroup[] = [
  {
    category: 'surface',
    label: 'Surface',
    description: 'Page and container backgrounds — elevation levels',
    roles: [
      { key: 'surface-0',                label: 'surface-0',                description: 'Page background — the base canvas behind everything.',        scale: 'gray',    tone: 1,  contrastAgainst: null, isVariant: false },
      { key: 'surface-0-alt',            label: 'surface-0-alt',            description: 'Page background; swaps to surface-1 in dark mode.',           scale: 'gray',    tone: 1,  contrastAgainst: null, isVariant: true  },
      { key: 'surface-0-hover',          label: 'surface-0-hover',          description: 'Hover state for surface-0 rows — menu items.',                scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: true  },
      { key: 'surface-1',                label: 'surface-1',                description: 'Raised surface — cards, panels, sections.',                   scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'surface-1-alt',            label: 'surface-1-alt',            description: 'Raised surface; swaps to surface-0 in dark mode.',            scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: true  },
      { key: 'surface-1-hover',          label: 'surface-1-hover',          description: 'Hover state for surface-1 rows — nav, date pickers.',         scale: 'gray',    tone: 3,  contrastAgainst: null, isVariant: true  },
      { key: 'surface-1-subtle',         label: 'surface-1-subtle',         description: 'Subtle raised surface — banners.',                            scale: 'gray',    tone: 1,  contrastAgainst: null, isVariant: true  },
      { key: 'surface-2',                label: 'surface-2',                description: 'Sunken / nested surface — wells, table headers.',             scale: 'gray',    tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'surface-3',                label: 'surface-3',                description: 'Deepest nested surface — sliders, tracks.',                   scale: 'gray',    tone: 4,  contrastAgainst: null, isVariant: false },
      { key: 'surface-selected',         label: 'surface-selected',         description: 'Selected item surface — active dropdown rows.',               scale: 'gray',    tone: 5,  contrastAgainst: null, isVariant: false },
      { key: 'surface-inverse',          label: 'surface-inverse',          description: 'Inverse (dark-on-light) surface — tooltips.',                 scale: 'gray',    tone: 12, contrastAgainst: null, isVariant: false },
      { key: 'surface-inverse-muted',    label: 'surface-inverse-muted',    description: 'Muted inverse surface — featured icons.',                     scale: 'gray',    tone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'surface-overlay',          label: 'surface-overlay',          description: 'Modal scrim behind dialogs.',                                scale: 'gray',    tone: 12, contrastAgainst: null, isVariant: false },
      { key: 'surface-brand-subtle',     label: 'surface-brand-subtle',     description: 'Subtle brand-tinted surface — check / selected backgrounds.', scale: 'brand',   tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'surface-brand-subtle-alt', label: 'surface-brand-subtle-alt', description: 'Brand tint; turns gray in dark mode.',                        scale: 'brand',   tone: 2,  contrastAgainst: null, isVariant: true  },
      { key: 'surface-brand-muted',      label: 'surface-brand-muted',      description: 'Stronger brand tint — featured icon backgrounds.',            scale: 'brand',   tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'surface-brand-strong',     label: 'surface-brand-strong',     description: 'Strong brand section — CTA, testimonials.',                   scale: 'brand',   tone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'surface-brand-strong-alt', label: 'surface-brand-strong-alt', description: 'Strong brand section — FAQ sections.',                        scale: 'brand',   tone: 10, contrastAgainst: null, isVariant: true  },
    ],
  },
  {
    category: 'action',
    label: 'Action',
    description: 'Interactive element fills — buttons, toggles, inputs',
    roles: [
      { key: 'action-primary',          label: 'action-primary',          description: 'Primary action fill — buttons, toggles (brand).',            scale: 'brand',   tone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'action-primary-hover',    label: 'action-primary-hover',    description: 'Primary action hover state.',                                scale: 'brand',   tone: 10, contrastAgainst: null, isVariant: true  },
      { key: 'action-disabled',         label: 'action-disabled',         description: 'Disabled control fill — buttons, toggles.',                   scale: 'gray',    tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'action-disabled-subtle',  label: 'action-disabled-subtle',  description: 'Subtle disabled fill — inputs, checkboxes.',                  scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: true  },
    ],
  },
  {
    category: 'status',
    label: 'Status',
    description: 'Feedback fills — badges, alerts, banners',
    roles: [
      { key: 'status-error-subtle',     label: 'status-error-subtle',     description: 'Subtle error background.',                                    scale: 'error',   tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'status-error-muted',      label: 'status-error-muted',      description: 'Muted error background — featured icons.',                    scale: 'error',   tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'status-error',            label: 'status-error',            description: 'Solid error fill — buttons, icons.',                          scale: 'error',   tone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'status-warning-subtle',   label: 'status-warning-subtle',   description: 'Subtle warning background.',                                  scale: 'warning', tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'status-warning-muted',    label: 'status-warning-muted',    description: 'Muted warning background — featured icons.',                  scale: 'warning', tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'status-warning',          label: 'status-warning',          description: 'Solid warning fill — featured icons.',                        scale: 'warning', tone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'status-success-subtle',   label: 'status-success-subtle',   description: 'Subtle success background.',                                  scale: 'success', tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'status-success-muted',    label: 'status-success-muted',    description: 'Muted success background — featured icons.',                  scale: 'success', tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'status-success',          label: 'status-success',          description: 'Solid success fill — icons, metrics.',                        scale: 'success', tone: 9,  contrastAgainst: null, isVariant: false },
      { key: 'status-info-subtle',      label: 'status-info-subtle',      description: 'Subtle info background.',                                     scale: 'info',    tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'status-info-muted',       label: 'status-info-muted',       description: 'Muted info background — featured icons.',                     scale: 'info',    tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'status-info',             label: 'status-info',             description: 'Solid info fill — icons, badges.',                            scale: 'info',    tone: 9,  contrastAgainst: null, isVariant: false },
    ],
  },
  {
    category: 'icon',
    label: 'Icon',
    description: 'Icon and non-text foreground colors',
    roles: [
      { key: 'icon-primary',           label: 'icon-primary',           description: 'Highest-contrast icons.',                                     scale: 'gray',    tone: 12, contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-secondary',         label: 'icon-secondary',         description: 'High-contrast icons.',                                        scale: 'gray',    tone: 11,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-secondary-hover',   label: 'icon-secondary-hover',   description: 'Secondary icon in hover state.',                              scale: 'gray',    tone: 12, contrastAgainst: 'surface-0', isVariant: true  },
      { key: 'icon-tertiary',          label: 'icon-tertiary',          description: 'Medium-contrast icons.',                                      scale: 'gray',    tone: 10,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-tertiary-hover',    label: 'icon-tertiary-hover',    description: 'Tertiary icon in hover state.',                               scale: 'gray',    tone: 11,  contrastAgainst: 'surface-0', isVariant: true  },
      { key: 'icon-quaternary',        label: 'icon-quaternary',        description: 'Low-contrast icons — buttons, help, inputs.',                 scale: 'gray',    tone: 9,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-quaternary-hover',  label: 'icon-quaternary-hover',  description: 'Quaternary icon in hover state.',                             scale: 'gray',    tone: 10,  contrastAgainst: 'surface-0', isVariant: true  },
      { key: 'icon-on-inverse',        label: 'icon-on-inverse',        description: 'Icon on inverse / dark surfaces — always light.',             scale: 'gray',    tone: 1,  contrastAgainst: null,        isVariant: false },
      { key: 'icon-disabled',          label: 'icon-disabled',          description: 'Disabled icons — button groups, dropdowns.',                  scale: 'gray',    tone: 8,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-disabled-subtle',   label: 'icon-disabled-subtle',   description: 'Subtle disabled icons — active checkboxes.',                  scale: 'gray',    tone: 7,  contrastAgainst: 'surface-0', isVariant: true  },
      { key: 'icon-brand',             label: 'icon-brand',             description: 'Primary brand icons — featured icons, bars.',                 scale: 'brand',   tone: 9,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-brand-alt',         label: 'icon-brand-alt',         description: 'Brand icon; turns gray in dark mode.',                        scale: 'brand',   tone: 9,  contrastAgainst: 'surface-0', isVariant: true  },
      { key: 'icon-brand-secondary',   label: 'icon-brand-secondary',   description: 'Secondary brand icons — section accents.',                    scale: 'brand',   tone: 8,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-brand-secondary-alt', label: 'icon-brand-secondary-alt', description: 'Secondary brand icon; gray in dark mode.',                scale: 'brand',   tone: 8,  contrastAgainst: 'surface-0', isVariant: true  },
      { key: 'icon-error',             label: 'icon-error',             description: 'Primary error icons — featured icons.',                       scale: 'error',   tone: 9,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-error-secondary',   label: 'icon-error-secondary',   description: 'Secondary error icons — error input icons.',                  scale: 'error',   tone: 8,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-warning',           label: 'icon-warning',           description: 'Primary warning icons — featured icons.',                     scale: 'warning', tone: 9,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-warning-secondary', label: 'icon-warning-secondary', description: 'Secondary warning icons.',                                    scale: 'warning', tone: 8,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-success',           label: 'icon-success',           description: 'Primary success icons — featured icons.',                     scale: 'success', tone: 9,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-success-secondary', label: 'icon-success-secondary', description: 'Secondary success icons — dots, indicators.',                 scale: 'success', tone: 8,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-info',              label: 'icon-info',              description: 'Primary info icons — featured icons.',                        scale: 'info',    tone: 9,  contrastAgainst: 'surface-0', isVariant: false },
      { key: 'icon-info-secondary',    label: 'icon-info-secondary',    description: 'Secondary info icons.',                                       scale: 'info',    tone: 8,  contrastAgainst: 'surface-0', isVariant: false },
    ],
  },
  {
    category: 'border',
    label: 'Border',
    description: 'Stroke colors for borders, dividers and separators',
    roles: [
      { key: 'border-strong',           label: 'border-strong',           description: 'High-contrast border — inputs, button groups, checkboxes.', scale: 'gray',  tone: 7, contrastAgainst: null, isVariant: false },
      { key: 'border-default',          label: 'border-default',          description: 'Default border — cards, tables, dividers.',                 scale: 'gray',  tone: 3, contrastAgainst: null, isVariant: false },
      { key: 'border-default-alt',      label: 'border-default-alt',      description: 'Alpha alternative for floating menus.',                     scale: 'gray',  tone: 6, contrastAgainst: null, isVariant: true  },
      { key: 'border-subtle',           label: 'border-subtle',           description: 'Subtle border — dividers, chart axes.',                     scale: 'gray',  tone: 5, contrastAgainst: null, isVariant: false },
      { key: 'border-disabled',         label: 'border-disabled',         description: 'Disabled border — inputs, checkboxes.',                     scale: 'gray',  tone: 6, contrastAgainst: null, isVariant: false },
      { key: 'border-disabled-subtle',  label: 'border-disabled-subtle',  description: 'Subtle disabled border — disabled buttons.',                scale: 'gray',  tone: 5, contrastAgainst: null, isVariant: true  },
      { key: 'border-brand',            label: 'border-brand',            description: 'Brand border — active / focus input states.',               scale: 'brand', tone: 8, contrastAgainst: null, isVariant: false },
      { key: 'border-brand-alt',        label: 'border-brand-alt',        description: 'Brand border; turns gray in dark mode.',                    scale: 'brand', tone: 9, contrastAgainst: null, isVariant: true  },
      { key: 'border-error',            label: 'border-error',            description: 'Error state border — inputs, file uploaders.',              scale: 'error', tone: 8, contrastAgainst: null, isVariant: false },
      { key: 'border-error-subtle',     label: 'border-error-subtle',     description: 'Subtle error border — error state inputs.',                 scale: 'error', tone: 6, contrastAgainst: null, isVariant: true  },
    ],
  },
  {
    category: 'text',
    label: 'Text',
    description: 'Text fill colors across light and dark modes',
    roles: [
      { key: 'text-primary',               label: 'text-primary',               description: 'Primary text — page headings.',                              scale: 'gray',    tone: 12, contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-on-brand',              label: 'text-on-brand',              description: 'Primary text on brand fills.',                               scale: 'gray',    tone: 1,  contrastAgainst: 'action-primary', isVariant: true  },
      { key: 'text-secondary',             label: 'text-secondary',             description: 'Secondary text — labels, section headings.',                 scale: 'gray',    tone: 11,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-secondary-hover',       label: 'text-secondary-hover',       description: 'Secondary text in hover state.',                             scale: 'gray',    tone: 12, contrastAgainst: 'surface-0',       isVariant: true  },
      { key: 'text-on-brand-secondary',    label: 'text-on-brand-secondary',    description: 'Secondary text on brand fills.',                             scale: 'brand',   tone: 4,  contrastAgainst: 'action-primary', isVariant: true  },
      { key: 'text-tertiary',              label: 'text-tertiary',              description: 'Tertiary text — supporting / paragraph text.',               scale: 'gray',    tone: 10,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-tertiary-hover',        label: 'text-tertiary-hover',        description: 'Tertiary text in hover state.',                              scale: 'gray',    tone: 11,  contrastAgainst: 'surface-0',       isVariant: true  },
      { key: 'text-on-brand-tertiary',     label: 'text-on-brand-tertiary',     description: 'Tertiary text on brand fills.',                              scale: 'brand',   tone: 4,  contrastAgainst: 'action-primary', isVariant: true  },
      { key: 'text-quaternary',            label: 'text-quaternary',            description: 'Quaternary text — footer headings.',                         scale: 'gray',    tone: 9,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-on-brand-quaternary',   label: 'text-on-brand-quaternary',   description: 'Quaternary text on brand fills.',                            scale: 'brand',   tone: 5,  contrastAgainst: 'action-primary', isVariant: true  },
      { key: 'text-on-inverse',            label: 'text-on-inverse',            description: 'Text on inverse / dark surfaces — always light.',            scale: 'gray',    tone: 1,  contrastAgainst: null,              isVariant: false },
      { key: 'text-disabled',              label: 'text-disabled',              description: 'Disabled text — inputs, buttons.',                           scale: 'gray',    tone: 8,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-placeholder',           label: 'text-placeholder',           description: 'Input placeholder text.',                                    scale: 'gray',    tone: 9,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-placeholder-subtle',    label: 'text-placeholder-subtle',    description: 'Subtle placeholder — verification code inputs.',             scale: 'gray',    tone: 7,  contrastAgainst: 'surface-0',       isVariant: true  },
      { key: 'text-brand',                 label: 'text-brand',                 description: 'Primary brand text — pricing headers.',                      scale: 'brand',   tone: 12, contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-brand-secondary',       label: 'text-brand-secondary',       description: 'Secondary brand text — buttons, highlights.',                scale: 'brand',   tone: 11,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-brand-secondary-hover', label: 'text-brand-secondary-hover', description: 'Secondary brand text in hover state.',                       scale: 'brand',   tone: 12, contrastAgainst: 'surface-0',       isVariant: true  },
      { key: 'text-brand-tertiary',        label: 'text-brand-tertiary',        description: 'Tertiary brand text — metric card numbers.',                 scale: 'brand',   tone: 10,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-brand-tertiary-alt',    label: 'text-brand-tertiary-alt',    description: 'Tertiary brand text; lighter in dark mode.',                 scale: 'brand',   tone: 10,  contrastAgainst: 'surface-0',       isVariant: true  },
      { key: 'text-error',                 label: 'text-error',                 description: 'Error state text — input error states.',                     scale: 'error',   tone: 11,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-warning',               label: 'text-warning',               description: 'Warning state semantic text.',                               scale: 'warning', tone: 11,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-success',               label: 'text-success',               description: 'Success state semantic text.',                               scale: 'success', tone: 11,  contrastAgainst: 'surface-0',       isVariant: false },
      { key: 'text-info',                  label: 'text-info',                  description: 'Info state semantic text.',                                  scale: 'info',    tone: 11,  contrastAgainst: 'surface-0',       isVariant: false },
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
 * Recommended dark-mode tone for a role. Gray hierarchy inverts (dark text in
 * light mode → light text in dark mode); colored scales keep their hue but
 * shift to read well on dark surfaces. These are editable seeds, not fixed.
 */
export function recDarkTone(role: Role): number {
  const t = role.tone
  if (role.key === 'text-on-inverse' || role.key === 'icon-on-inverse') return 1
  if (role.key in BORDER_DARK_TONES) return BORDER_DARK_TONES[role.key]
  if (role.scale === 'gray') {
    // Inverse / overlay surfaces stay dark in dark mode — don't invert them.
    if (role.key === 'surface-overlay' || role.key === 'surface-inverse' || role.key === 'surface-inverse-muted') return t
    return Math.min(12, Math.max(1, 13 - t))
  }
  // Colored (brand / error / warning / success / info) — keep the hue.
  // Solid brand fills, strong brand sections, solid status fills, and text that
  // sits on a constant brand fill all hold their tone in dark mode.
  const holdsTone =
    role.key.startsWith('action-') ||
    role.key.startsWith('surface-brand-strong') ||
    /^status-(error|warning|success|info)$/.test(role.key) ||
    role.key.startsWith('text-on-brand')
  if (holdsTone) return t
  if (t <= 3) return Math.min(12, t + 9)   // subtle tints deepen
  // Text band (10–12): these are dark-on-light text tones — on a dark surface
  // they vanish. Mirror onto the light half of the ramp, keeping the hierarchy
  // (strongest text = lightest tone): 12→6 · 11→7 · 10→8.
  if (t >= 10) return 18 - t
  return Math.max(6, t - 1)                // icon / border lift one step
}

// ── Ramp resolution + recommended values ────────────────────────────────────

/** The global (light) source ramps, one per ScaleSource. */
export type GlobalScales = Record<ScaleSource, Record<number, string>> & {
  /**
   * The dark-appearance neutral ramp (store `grayDarkScale`). Gray roles in a
   * dark theme resolve from this instead of the light `gray` ramp. Optional so
   * older callers keep working — they fall back to the GRAY_DARK_SCALE default.
   */
  grayDark?: Record<number, string>
}

/**
 * The ramp a role draws from in a given theme. Custom style themes carry their
 * own palette; built-in light/dark use the global scales — only gray has a
 * distinct dark ramp (GRAY_DARK_SCALE).
 */
export function sourceScaleFor(
  role: Role,
  kind: 'light' | 'dark',
  global: GlobalScales,
  palette?: ThemePalette,
): Record<number, string> {
  if (palette) return palette[role.scale]
  // Gray is the only ramp with a distinct dark twin: it's generated from the
  // neutral against `darkBackground`, so the dark surfaces carry the accent's
  // tint. Colored ramps keep their hue and just shift tone (see recDarkTone).
  if (role.scale === 'gray' && kind === 'dark') return global.grayDark ?? GRAY_DARK_SCALE
  return global[role.scale]
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
  return kind === 'light' ? role.tone : recDarkTone(role)
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
