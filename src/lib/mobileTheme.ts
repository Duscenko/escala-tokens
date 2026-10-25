// The phone Theme sheet (`MobileThemeSheet`, plan:
// `design-plans/mobile-theme-sheet.md`) as pure functions — the component
// feeds them, Vitest checks them in Node.
//
// Every edit here is a PICK from a list the desktop already ships, never a
// free value (AGENTS.md rule 9): a curated brand colour (`BRAND_SPECTRUM`), a
// `FONT_PRESETS` family, a `TYPE_SCALE_MODES` step, a `RADIUS_ROLE_PRESETS`
// look, a `SPACING_MODES` density. Each writes the same foundation fields the
// desktop rail writes, so a system built here hands off to a laptop intact.

import { BRAND_SPECTRUM, type ColorPreset } from './brandPalette'
import { evaluate, type ContrastVerdict, type IntentClass } from './color/apca'
import {
  INSET_SURFACE_ROLE, RADIUS_ROLE_PRESETS, SPACING_MODES, SPACING_STEPS,
  buildSizesFromBase, insetSurfacePadding, matchRadiusRolePreset, matchSpacingMode, radiusPresetPatch,
  type SpacingMode,
} from './layoutTokens'
import { withAgentEnvelope } from './aiContext'
import type { FoundationSource } from './themeFoundations'
import type { ThemeStylePreset } from './themePresets'
import { TYPE_SCALE_MODES, buildTypeScale, inferTypeScaleMode, type TypeScaleMode } from './typographyStandard'

// ── Sheet state, in the URL ────────────────────────────────────────────────
// `?sheet=<tab>` = the sheet is open on that tab. No param = folded (the
// colour row only). Same shape as the workspace's `?section=` links: a link
// opens the sheet where it was, and Back does not replay every tab tap
// (the address is REPLACED, never pushed).

export const THEME_SHEET_PARAM = 'sheet'
/** The pages of the Controls panel: `edit` is the list (the desktop's "Edit
 *  {name}"), the rest are the pages its rows open. */
export const THEME_SHEET_TABS = ['edit', 'color', 'type', 'radius', 'spacing', 'style', 'export'] as const
export type ThemeSheetTab = (typeof THEME_SHEET_TABS)[number]

export interface ThemeSheetState {
  open: boolean
  tab: ThemeSheetTab
}

export const FOLDED: ThemeSheetState = { open: false, tab: 'edit' }

const isTab = (v: string | null): v is ThemeSheetTab => !!v && (THEME_SHEET_TABS as readonly string[]).includes(v)

/** Pages that were renamed: an old link still lands. */
const OLD_TABS: Record<string, ThemeSheetTab> = { shape: 'radius' }

/** The sheet a URL asks for. An unknown page opens nothing. */
export function readThemeSheet(search: string): ThemeSheetState {
  const raw = new URLSearchParams(search).get(THEME_SHEET_PARAM)
  const tab = raw && OLD_TABS[raw] ? OLD_TABS[raw] : raw
  return isTab(tab) ? { open: true, tab } : FOLDED
}

/** `search` with the sheet written in, every other param kept as it was. */
export function writeThemeSheet(search: string, state: ThemeSheetState): string {
  const params = new URLSearchParams(search)
  if (state.open) params.set(THEME_SHEET_PARAM, state.tab)
  else params.delete(THEME_SHEET_PARAM)
  const out = params.toString()
  return out ? `?${out}` : ''
}


// ── Preview pages ───────────────────────────────────────────────────────────
// The preview is six pages, swiped sideways under an icon bar; each page is a
// small bento of the tiles in that group. `?view=` holds the page on screen;
// the first page is the default and is not written.

export const PREVIEW_VIEW_PARAM = 'view'
export const PREVIEW_VIEWS = ['account', 'actions', 'status', 'forms', 'cards', 'navigation'] as const
export type PreviewView = (typeof PREVIEW_VIEWS)[number]

export function readPreviewView(search: string): PreviewView {
  const v = new URLSearchParams(search).get(PREVIEW_VIEW_PARAM)
  return v && (PREVIEW_VIEWS as readonly string[]).includes(v) ? (v as PreviewView) : PREVIEW_VIEWS[0]
}

export function writePreviewView(search: string, view: PreviewView): string {
  const params = new URLSearchParams(search)
  if (view === PREVIEW_VIEWS[0]) params.delete(PREVIEW_VIEW_PARAM)
  else params.set(PREVIEW_VIEW_PARAM, view)
  const out = params.toString().replace(/%2C/g, ',')
  return out ? `?${out}` : ''
}

/** Arrow keys over a list that wraps (the preview's icon bar). */
export function stepIn<T>(list: readonly T[], at: T, key: string): T | null {
  const i = list.indexOf(at)
  const n = list.length
  if (key === 'ArrowRight') return list[(i + 1) % n]
  if (key === 'ArrowLeft') return list[(i - 1 + n) % n]
  if (key === 'Home') return list[0]
  if (key === 'End') return list[n - 1]
  return null
}

// ── The choices ─────────────────────────────────────────────────────────────

/** The six the folded sheet shows, one per hue family, in wheel order. */
const QUICK_ACCENT_LABELS = ['Blue Dark', 'Violet', 'Teal', 'Green', 'Orange', 'Rosé'] as const
export const QUICK_ACCENTS: ColorPreset[] = QUICK_ACCENT_LABELS
  .map((label) => BRAND_SPECTRUM.find((c) => c.label === label))
  .filter((c): c is ColorPreset => !!c)

/** Sans families the Type tab offers, each with the one word that sets it
 *  apart. All are `FONT_PRESETS` (they load from Google Fonts). */
export const SHEET_FONTS: { family: string; voice: string }[] = [
  { family: 'Inter', voice: 'Neutral' },
  { family: 'Geist', voice: 'Tight' },
  { family: 'IBM Plex Sans', voice: 'Humanist' },
  { family: 'DM Sans', voice: 'Geometric' },
]

/** Three base sizes: the scale one step down, as shipped, one step up. */
export const SHEET_TYPE_SCALES: TypeScaleMode[] = ['compact', 'default', 'spacious']

/** Spacing in the desktop's own order: room first, then emphasis. */
export const SHEET_SPACING: SpacingMode['id'][] = ['compact', 'quiet', 'airy', 'bold']

export const sameHex = (a: string | undefined, b: string | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

/** `text-md` of a type scale mode, in px — the "base size" a person reads. */
export function basePx(mode: TypeScaleMode): number {
  const factor = TYPE_SCALE_MODES.find((m) => m.key === mode)?.factor ?? 1
  return parseFloat(buildTypeScale(factor).sizes['text-md'])
}

// ── Edits: a preset in, a preset out ───────────────────────────────────────
// `base` is the system's RESOLVED foundations, so a field the preset never
// set (most styles leave spacing alone) is filled from what is on screen,
// not from a default the visitor never saw.

const withFoundations = (preset: ThemeStylePreset, patch: Partial<FoundationSource>): ThemeStylePreset =>
  ({ ...preset, foundations: { ...preset.foundations, ...patch } })

export function withAccent(preset: ThemeStylePreset, hex: string): ThemeStylePreset {
  return { ...preset, accent: hex }
}

/** One family for body AND headings: the Type tab picks the system's voice. */
export function withFont(preset: ThemeStylePreset, base: FoundationSource, family: string): ThemeStylePreset {
  const typography = preset.foundations.typography ?? base.typography
  return withFoundations(preset, { typography: { ...typography, fontFamily: family, headingFontFamily: family } })
}

export function withTypeScale(preset: ThemeStylePreset, base: FoundationSource, mode: TypeScaleMode): ThemeStylePreset {
  const typography = preset.foundations.typography ?? base.typography
  const factor = TYPE_SCALE_MODES.find((m) => m.key === mode)?.factor ?? 1
  const { sizes, lineHeights } = buildTypeScale(factor)
  return withFoundations(preset, { typography: { ...typography, sizes, lineHeights } })
}

export function withRadiusPreset(preset: ThemeStylePreset, base: FoundationSource, label: string): ThemeStylePreset {
  const patch = radiusPresetPatch(label, preset.foundations.radiusRoles ?? base.radiusRoles)
  return patch ? withFoundations(preset, patch) : preset
}

/** The same three fields the desktop's Spacing mode writes (field base, card
 *  padding, border width) — see `pluginStudio.buildStudioTokens`. */
export function withSpacingMode(preset: ThemeStylePreset, base: FoundationSource, id: SpacingMode['id']): ThemeStylePreset {
  const mode = SPACING_MODES.find((m) => m.id === id)
  if (!mode) return preset
  const f = { ...base, ...preset.foundations }
  const step = SPACING_STEPS[Math.max(0, SPACING_STEPS.indexOf(mode.insetStep))]
  const px = f.spacing?.[step] ?? `${Number(step) * 4}px`
  return withFoundations(preset, {
    sizes: buildSizesFromBase(mode.fieldBase),
    stroke: { ...f.stroke, sm: `${mode.border}px` },
    spacingRoles: { ...f.spacingRoles, [INSET_SURFACE_ROLE]: step },
    padding: insetSurfacePadding(px),
  })
}

/** What each tab shows as picked, read back from the tokens (never stored),
 *  so a shuffle that lands on a preset lights it up. `null` = none matches. */
export function sheetChoices(f: Pick<FoundationSource, 'typography' | 'radiusRoles' | 'sizes' | 'spacingRoles' | 'stroke'>) {
  return {
    font: f.typography?.fontFamily ?? null,
    typeScale: inferTypeScaleMode(f.typography?.sizes),
    radius: matchRadiusRolePreset(f.radiusRoles),
    spacing: matchSpacingMode(f.sizes, f.spacingRoles, f.stroke),
  }
}

export { RADIUS_ROLE_PRESETS, SPACING_MODES }

// ── Contrast, per role ─────────────────────────────────────────────────────
// One row per colour family a person picks, measured the way the System
// dashboard measures that role: the label ON the accent fill, then each
// role's text ON the page. `evaluate` is the one contrast implementation
// (WCAG floor + APCA) — a row passes only when both agree.

export interface RoleContrast {
  id: 'accent' | 'neutral' | 'success' | 'critical' | 'warning' | 'info'
  label: string
  /** The token the swatch shows. */
  token: string
  hex: string
  verdict: ContrastVerdict
}

const ROLE_PAIRS: { id: RoleContrast['id']; label: string; fg: string; bg: string; swatch: string; intent: IntentClass }[] = [
  { id: 'accent', label: 'Accent', fg: 'content.on-action', bg: 'action.primary.default', swatch: 'action.primary.default', intent: 'action-label' },
  { id: 'neutral', label: 'Neutral', fg: 'content.secondary', bg: 'surface.page', swatch: 'content.secondary', intent: 'body-text' },
  { id: 'success', label: 'Success', fg: 'status.success.content', bg: 'surface.page', swatch: 'status.success.content', intent: 'body-text' },
  { id: 'critical', label: 'Critical', fg: 'status.critical.content', bg: 'surface.page', swatch: 'status.critical.content', intent: 'body-text' },
  { id: 'warning', label: 'Warning', fg: 'status.warning.content', bg: 'surface.page', swatch: 'status.warning.content', intent: 'body-text' },
  { id: 'info', label: 'Info', fg: 'status.info.content', bg: 'surface.page', swatch: 'status.info.content', intent: 'body-text' },
]

const OPAQUE = /^#[0-9a-f]{6}$/i

/** The rows the Color tab lists, for the appearance on screen. A role the
 *  system does not resolve to a solid colour is left out, never guessed. */
export function roleContrast(roles: Record<string, string>): RoleContrast[] {
  return ROLE_PAIRS.flatMap((p) => {
    const fg = roles[p.fg], bg = roles[p.bg], hex = roles[p.swatch]
    if (!OPAQUE.test(fg ?? '') || !OPAQUE.test(bg ?? '') || !hex) return []
    return [{ id: p.id, label: p.label, token: p.swatch, hex, verdict: evaluate(fg, bg, p.intent) }]
  })
}

// ── Export: the CSS a person can paste ─────────────────────────────────────
// Real variable names (rule 7: `action.primary.default` →
// `--color-action-primary-default`), Light on `:root`, Dark on `.dark` — the
// same split `variables.css` ships. The phone copies the colour roles and
// the few foundations the sheet edits; the full export lives on a laptop.

const CSS_LEAD = ['action.primary.default', 'content.on-action', 'content.primary', 'content.secondary', 'surface.page', 'border.control']

export const cssVarOf = (token: string) => `--color-${token.replace(/\./g, '-')}`

export function cssVariables(input: {
  light: Record<string, string>
  dark: Record<string, string>
  fontFamily?: string
  radiusRoles?: Record<string, string>
  radius?: Record<string, string>
  textBase?: string
}): string {
  // The roles a person looks for first, then the rest A→Z.
  const order = (k: string) => { const i = CSS_LEAD.indexOf(k); return i < 0 ? CSS_LEAD.length : i }
  const colorLines = (roles: Record<string, string>) =>
    Object.keys(roles).filter((k) => roles[k])
      .sort((x, y) => order(x) - order(y) || x.localeCompare(y))
      .map((k) => `  ${cssVarOf(k)}: ${roles[k]};`)
  const foundation: string[] = []
  if (input.fontFamily) foundation.push(`  --font-family-body: '${input.fontFamily}', system-ui, sans-serif;`)
  if (input.textBase) foundation.push(`  --font-size-text-md: ${input.textBase};`)
  for (const [role, step] of Object.entries(input.radiusRoles ?? {}).sort()) {
    const px = input.radius?.[step]
    if (px) foundation.push(`  --radius-${role}: ${px};`)
  }
  return [
    ':root {', ...foundation, ...colorLines(input.light), '}',
    '',
    '.dark {', ...colorLines(input.dark), '}',
    '',
  ].join('\n')
}

// ── Copy prompt: the system as a brief for an agent ────────────────────────
// What the phone's "Copy prompt" button copies. The colour roles by their real
// token names, the type and shape picked, the CSS variables, and the link
// that opens this same system on a laptop — inside the `agent-context/v1`
// envelope the desktop already ships (`withAgentEnvelope`), never a second
// vocabulary. Always English: agents read it.

/** The roles a brief names, in the order a person builds with them. */
const BRIEF_ROLES: { label: string; token: string }[] = [
  { label: 'Primary action', token: 'action.primary.default' },
  { label: 'Label on primary', token: 'content.on-action' },
  { label: 'Page', token: 'surface.page' },
  { label: 'Text', token: 'content.primary' },
  { label: 'Secondary text', token: 'content.secondary' },
  { label: 'Control border', token: 'border.control' },
  { label: 'Success', token: 'status.success.content' },
  { label: 'Critical', token: 'status.critical.content' },
  { label: 'Warning', token: 'status.warning.content' },
  { label: 'Info', token: 'status.info.content' },
]

export interface SystemBriefInput {
  name: string
  light: Record<string, string>
  dark: Record<string, string>
  headingFont?: string
  bodyFont?: string
  /** `text-md` in px. */
  basePx?: number
  /** Radius preset label (`Rounded`), or null when the system matches none. */
  radius?: string | null
  /** Spacing mode label (`Quiet`), or null when the system matches none. */
  spacing?: string | null
  css: string
  /** The `?remix=` link; left out while it is still being encoded. */
  link?: string | null
}

export function systemBrief(input: SystemBriefInput): string {
  const roleLines = BRIEF_ROLES.flatMap(({ label, token }) => {
    const light = input.light[token]
    if (!light) return []
    const dark = input.dark[token]
    const both = dark && !sameHex(dark, light) ? `${light} (dark ${dark})` : light
    return [`- ${label}: \`var(${cssVarOf(token)})\` · ${both}`]
  })
  const type = [
    input.headingFont && `- Headings: ${input.headingFont}`,
    input.bodyFont && `- Body: ${input.bodyFont}`,
    input.basePx && `- Base size: ${input.basePx}px`,
  ].filter(Boolean)
  const shape = [
    input.radius && `- Radius: ${input.radius}`,
    input.spacing && `- Spacing: ${input.spacing}`,
  ].filter(Boolean)
  const body = [
    `Build UI in the "${input.name}" design system. Use only these colours and typefaces; do not introduce new ones. Reference colours through the CSS variables, not the hex.`,
    '',
    '## Colour roles',
    ...roleLines,
    ...(type.length ? ['', '## Type', ...type] : []),
    ...(shape.length ? ['', '## Shape', ...shape] : []),
    '',
    '## CSS variables',
    '```css',
    input.css.trim(),
    '```',
    ...(input.link ? ['', `Open and edit this system in Escala Tokens: ${input.link}`] : []),
  ].join('\n')
  return withAgentEnvelope('global', input.name, body)
}

// ── Locks and section shuffles (Controls sheet, phase 3) ───────────────────
// A lock says what survives a shuffle. The big Shuffle deals a whole system
// (`nextShuffle`), then `applyLocks` puts the locked picks back with the same
// fields the `with*` edits write. A section's own shuffle is narrower: it
// re-picks only that section's choices, from the same curated lists the sheet
// shows (rule 9), and leaves everything else — and every lock — alone.

export const LOCK_KEYS = ['accent', 'font', 'scale', 'radius', 'spacing'] as const
export type LockKey = (typeof LOCK_KEYS)[number]
export type Locks = ReadonlySet<LockKey>

export const SHEET_SECTIONS = ['color', 'type', 'radius', 'spacing'] as const
export type SheetSection = (typeof SHEET_SECTIONS)[number]
export const SECTION_LOCKS: Record<SheetSection, readonly LockKey[]> = {
  color: ['accent'],
  type: ['font', 'scale'],
  radius: ['radius'],
  spacing: ['spacing'],
}

export const LOCK_PARAM = 'lock'

/** `?lock=accent,font` → the set; unknown names are dropped. */
export function readLocks(search: string): Set<LockKey> {
  const raw = new URLSearchParams(search).get(LOCK_PARAM) ?? ''
  return new Set(raw.split(',').filter((k): k is LockKey => (LOCK_KEYS as readonly string[]).includes(k)))
}

/** Locks into the URL in a fixed order; none → no param. Other params stay. */
export function writeLocks(search: string, locks: Locks): string {
  const params = new URLSearchParams(search)
  const list = LOCK_KEYS.filter((k) => locks.has(k))
  if (list.length) params.set(LOCK_PARAM, list.join(','))
  else params.delete(LOCK_PARAM)
  // `,` reads better than `%2C` in a link a person shares.
  const out = params.toString().replace(/%2C/g, ',')
  return out ? `?${out}` : ''
}

/** `next` with every locked pick taken back from the system before it.
 *  Both bases are RESOLVED foundations (what is on screen), so a field a
 *  preset never set is still carried. */
export function applyLocks(
  next: ThemeStylePreset,
  nextBase: FoundationSource,
  prev: ThemeStylePreset,
  prevBase: FoundationSource,
  locks: Locks,
): ThemeStylePreset {
  if (!locks.size) return next
  let out: ThemeStylePreset = locks.has('accent') ? withAccent(next, prev.accent) : next
  const typography = () => out.foundations.typography ?? nextBase.typography
  if (locks.has('font')) {
    out = withFoundations(out, {
      typography: {
        ...typography(),
        fontFamily: prevBase.typography.fontFamily,
        headingFontFamily: prevBase.typography.headingFontFamily ?? prevBase.typography.fontFamily,
      },
    })
  }
  if (locks.has('scale')) {
    out = withFoundations(out, {
      typography: { ...typography(), sizes: prevBase.typography.sizes, lineHeights: prevBase.typography.lineHeights },
    })
  }
  if (locks.has('radius')) {
    out = withFoundations(out, { radius: prevBase.radius, radiusRoles: prevBase.radiusRoles, radiusRoleViewports: prevBase.radiusRoleViewports })
  }
  if (locks.has('spacing')) {
    out = withFoundations(out, {
      sizes: prevBase.sizes,
      stroke: { ...(out.foundations.stroke ?? nextBase.stroke), sm: prevBase.stroke.sm },
      spacingRoles: prevBase.spacingRoles,
      padding: prevBase.padding,
    })
  }
  return out
}

/** One of `list`, never `current` when there is another to pick. */
function pickOther<T>(list: readonly T[], current: T | null | undefined, rng: () => number, same: (a: T, b: T) => boolean = (a, b) => a === b): T {
  const pool = current == null ? list : list.filter((x) => !same(x, current))
  const from = pool.length ? pool : list
  return from[Math.min(from.length - 1, Math.floor(rng() * from.length))]
}

/** A section's own shuffle: new picks for its unlocked choices, from the
 *  sheet's lists. Returns the preset unchanged when the whole section is locked. */
export function shuffleSection(
  section: SheetSection,
  preset: ThemeStylePreset,
  base: FoundationSource,
  locks: Locks,
  rng: () => number = Math.random,
): ThemeStylePreset {
  const now = sheetChoices(base)
  let out = preset
  if (section === 'color' && !locks.has('accent')) {
    const color = pickOther(BRAND_SPECTRUM, BRAND_SPECTRUM.find((c) => sameHex(c.hex, preset.accent)), rng, (a, b) => sameHex(a.hex, b.hex))
    out = withAccent(out, color.hex)
  }
  if (section === 'type') {
    if (!locks.has('font')) out = withFont(out, base, pickOther(SHEET_FONTS.map((f) => f.family), now.font, rng))
    if (!locks.has('scale')) out = withTypeScale(out, base, pickOther(SHEET_TYPE_SCALES, now.typeScale, rng))
  }
  if (section === 'radius' && !locks.has('radius')) {
    out = withRadiusPreset(out, base, pickOther(RADIUS_ROLE_PRESETS.map((p) => p.label), now.radius, rng))
  }
  if (section === 'spacing' && !locks.has('spacing')) {
    out = withSpacingMode(out, base, pickOther(SHEET_SPACING, now.spacing, rng))
  }
  return out
}

// ── The home in the shuffled system (phone) ─────────────────────────────────
// After a visitor shuffles or picks, the WHOLE phone home takes the system on:
// its page, surfaces, inks, lines, accent, the hero's CTA and the font. The
// chrome's own variables (`index.css`, documented there with the role each one
// reads) are overridden one for one, so nothing in the page has to know.

/** Chrome variable ← system role. The pairs `index.css` documents. */
const CHROME_FROM_ROLE: [string, string][] = [
  ['--app', 'surface.page'],
  ['--canvas', 'surface.page'],
  ['--nav', 'surface.page'],
  ['--surface', 'surface.layer-1'],
  ['--elevated', 'surface.layer-2'],
  ['--chrome-control', 'surface.layer-2'],
  ['--chip-rest', 'surface.layer-1'],
  ['--fg', 'content.primary'],
  ['--fg-muted', 'content.secondary'],
  ['--fg-faint', 'content.subtle'],
  ['--line', 'border.subtle'],
  ['--line-strong', 'border.default'],
  ['--accent-ui', 'content.accent'],
  ['--accent-solid', 'action.primary.default'],
  ['--accent-ink', 'content.on-action'],
  // The hero's "Try it here" (RainbowButton) fills with the system's primary.
  ['--rainbow-fill-a', 'action.primary.default'],
  ['--rainbow-ink', 'content.on-action'],
]

/** The chrome variables to set for a system: only roles it resolves. */
export function chromeFromRoles(roles: Record<string, string>, fontFamily?: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [cssVar, role] of CHROME_FROM_ROLE) if (roles[role]) out[cssVar] = roles[role]
  if (fontFamily) out['font-family'] = `'${fontFamily}', system-ui, sans-serif`
  return out
}
