// The Figma plugin's native theme setup, built on the server.
//
// The plugin shows the same six steps the Generator's guided setup has (Color →
// Font → Radius → Spacing → Shadow → Icons) but cannot run the generator, so it
// sends the CHOICES and this module applies them with the same store actions and
// the same helpers the web's quick-settings rail calls, then builds the payload
// with the one `generateTokenJSON`. Nothing here is re-derived: a step that
// works on the web works here because it is the same call.
//
// DOM-free (the tests run it in Node). One build per call, synchronous end to
// end, because it borrows the process-wide store — never add an `await` between
// `startNewSystem()` and the final `generateTokenJSON`.

import { useDesignStore } from '../store/useDesignStore'
import { ensureColorScales, applyAccentColor, applyAccentDarkColor, applyStateColorForAppearance } from './colorActions'

const STATE_SLOTS = ['error', 'warning', 'success', 'info'] as const
import { mintTheme, slotsFromAccent } from './themeMint'
import { resolveThemeFoundations } from './themeFoundations'
import { themeModeKey } from './themeModes'
import { generateTokenJSON } from './tokenGenerator'
import { defaultFigmaSyncModes } from './figmaSyncModes'
import { themeDisplayName } from './themeSources'
import { FONT_PRESETS } from './fonts'
import { TYPE_SCALE_MODES, buildTypeScale } from './typographyStandard'
import { SHADOW_PRESETS } from './shadowTokens'
import { PHOSPHOR_WEIGHTS, type PhosphorWeight } from './phosphorIcons'
import {
  INSET_SURFACE_ROLE, RADIUS_GROUPS, RADIUS_GROUP_STEPS, RADIUS_ROLE_PRESETS, RADIUS_STANDARD,
  SPACING_DEFAULT_BASE, SPACING_MODES, SPACING_STEPS, STROKE_SM_STOPS, applyRadiusGroup, buildSizesFromBase, insetSurfacePadding,
  radiusPresetPatch, radiusPresetPx, matchSpacingMode, mergeLayoutRoles, type RadiusGroupStep, type SpacingMode,
} from './layoutTokens'
import { slugify } from './utils'
import { ACTION_LABEL_TARGET, backgroundFromBase, brandSolidPair, darkShadow, darkShadowMap, generateColorScale, generateLightNeutralScale, generateDarkColorScale, generateFamilyDarkScale, type NeutralTint } from './colorUtils'
import { approximateSource } from './tokenImport/approximateSource'
import { THEME_STYLE_PRESETS, themeStylePreset, presetHarmony, presetStates, type ThemeStylePreset } from './themePresets'
import { matchShadowPreset } from './shadowTokens'
import { adoptPreset } from './adoptPreset'
import { MOTION_PRESETS, MOTION_PRESET_KEYS, matchMotionPreset, motionPresetPatch, normalizeMotionSettings, resolveMotionRole, type MotionPresetKey } from './motion'

export interface StudioChoices {
  /** A System Style id (`THEME_STYLE_PRESETS`). When set, the theme is that
   *  style adopted as-is — the same `adoptPreset` the web's Edit theme runs —
   *  and `accent` is not needed. Step choices sent with it still apply on top. */
  style?: string
  name?: string
  kind?: 'light' | 'dark'
  /** #rrggbb */
  accent?: string
  /** #rrggbb — the Dark reference for the accent. Absent, the dark ramp grows
   *  from `accent`; present, it grows from this hex, so Light and Dark each
   *  follow the hex the designer set for that appearance. */
  accentDark?: string
  bodyFont?: string
  headingFont?: string
  /** Index into `TYPE_SCALE_MODES`. */
  typeScale?: number
  /** A `RADIUS_ROLE_PRESETS` label. */
  radiusPreset?: string
  /** Per-axis picks on top of the preset. */
  radiusAxes?: Partial<Record<'boxes' | 'fields' | 'selectors', string>>
  /** Colour edition beyond the accent — the web rail's Neutral tint, Contrast
   *  and States rows. Any of them makes the build mint from the accent (a
   *  style's foundations still apply on top). */
  neutralTint?: string
  /** #rrggbb — a neutral that does NOT follow the accent (the plugin's
   *  unlocked Neutral). Absent = the linked neutral the accent gives. */
  neutral?: string
  /** -1 (softer) … 1 (stronger), the rail's contrast shift. */
  contrastShift?: number
  states?: Partial<Record<'error' | 'warning' | 'success' | 'info', string>>
  /** #rrggbb per severity — the Dark anchor, solved for the dark page the way
   *  the web's Color edition does (`colorRoles.solveRoleColor`). Absent, a
   *  severity's dark ramp grows from its light seed. */
  statesDark?: Partial<Record<'error' | 'warning' | 'success' | 'info', string>>
  /** A `SPACING_MODES` id. */
  spacingMode?: string
  /** Card padding — a `SPACING_STEPS` step for the surface inset, on top of
   *  the spacing mode (the web rail's Spacing · Card padding). */
  cardInset?: string
  /** Border width in px, one of `STROKE_SM_STOPS` (Spacing · Border width). */
  borderWidth?: number
  /** A `SHADOW_PRESETS` label — the LIGHT appearance's elevation ramp. */
  shadow?: string
  /** A `SHADOW_PRESETS` label for the DARK appearance, picked apart from
   *  Light (it ships as that preset's dark twin). Absent = Dark follows Light,
   *  the derived twin of `shadow` — what every system did before. */
  shadowDark?: string
  iconWeight?: string
  /** A `MOTION_PRESET_KEYS` key — the web rail's Motion row (`snappy` …
   *  `calm`). Absent = the style's motion, or Standard. */
  motionPreset?: string
  /** Per-role picks made in the plugin's Token Details: role id → appearance →
   *  `{family.tone}` (`{error-a.3}`, `{neutral.12}`). Applied after everything
   *  else through `setArchitectureOverride`, the action the web's Variables
   *  table writes — one override format. Keyed by APPEARANCE, not by theme
   *  key, so they survive a rebuild that mints the theme under another key. */
  roleOverrides?: Record<string, Partial<Record<'light' | 'dark', string>>>
}

/** What the plugin draws its six steps from — never hand-copied into the UI. */
export function studioOptions() {
  const radius = RADIUS_STANDARD as Record<string, string>
  return {
    fonts: FONT_PRESETS.map((f) => ({ value: f.value, label: f.label, group: f.category })),
    typeScales: TYPE_SCALE_MODES.map((m, i) => ({ index: i, label: m.label, factor: m.factor })),
    radiusPresets: RADIUS_ROLE_PRESETS.map((p) => ({
      label: p.label,
      description: p.description,
      picks: p.picks,
      px: radiusPresetPx(p),
    })),
    radiusGroups: RADIUS_GROUPS.map((g) => ({ key: g.key, label: g.label, hint: g.hint })),
    radiusSteps: RADIUS_GROUP_STEPS.map((step) => ({ step, px: parseFloat(radius[step] ?? '0') || 0 })),
    spacingModes: SPACING_MODES.map((m) => ({
      id: m.id, label: m.label, description: m.description, fieldBase: m.fieldBase, insetStep: m.insetStep, border: m.border,
      ...spacingPaint(m),
    })),
    shadows: SHADOW_PRESETS.map((p) => ({ label: p.label, description: p.description, md: p.values.md, mdDark: darkShadow(p.values.md) })),
    insetSteps: SPACING_STEPS.map((step) => ({ step, px: Number(step.replace('_', '.')) * SPACING_DEFAULT_BASE })),
    borderStops: [...STROKE_SM_STOPS],
    iconWeights: [...PHOSPHOR_WEIGHTS],
    // The Motion row: each preset with the two timings its tile plays (the
    // dialog card's entrance and a list row's), read off the preset itself.
    motionPresets: MOTION_PRESET_KEYS.map((key) => {
      const p = MOTION_PRESETS[key]
      const play = (role: 'use-emphasis-in' | 'use-stagger-in') => {
        const r = resolveMotionRole(role, p.settings)
        return { ms: r.ms, easing: r.value.slice(`${r.ms}ms `.length) }
      }
      return { key, label: p.label, brief: p.brief, factor: p.settings.durationFactor, enter: p.settings.transforms.enter, emphasis: play('use-emphasis-in'), stagger: play('use-stagger-in'), offset: p.settings.stagger }
    }),
    neutralTints: ['pure', 'subtle', 'tinted', 'vivid'],
    contrast: { min: -1, max: 1, step: 0.05 },
    styles: THEME_STYLE_PRESETS.map((p) => styleSummary(p, radius)),
  }
}

/** One System Style as the plugin's overview shows it BEFORE it is used: the
 *  same foundations the build will write, read off the preset — never a
 *  description typed twice. */
function styleSummary(p: ThemeStylePreset, standard: Record<string, string>) {
  const f = p.foundations
  const ramp = (f.radius as Record<string, string> | undefined) ?? standard
  const roles = mergeLayoutRoles('radius', f.radiusRoles)
  const px = (role: string) => parseFloat(ramp[roles[role]] ?? '0') || 0
  const mode = SPACING_MODES.find((m) => m.id === matchSpacingMode(f.sizes, f.spacingRoles, f.stroke))
  const states = presetStates(p)
  return {
    id: p.id,
    label: p.label,
    shortLabel: p.shortLabel,
    description: p.description,
    detail: p.detail,
    accent: p.accent,
    neutral: presetHarmony(p).neutral,
    states: [states.error, states.warning, states.success, states.info],
    appearance: p.preferredAppearance,
    font: f.typography?.fontFamily ?? 'Inter',
    heading: f.typography?.headingFontFamily ?? f.typography?.fontFamily ?? 'Inter',
    radius: { boxes: px('container'), fields: px('action'), selectors: px('control') },
    spacing: mode?.label ?? 'Custom',
    shadow: (f.shadows && matchShadowPreset(f.shadows)) ?? 'Custom',
    shadowMd: f.shadows?.md ?? 'none',
    shadowMdDark: darkShadow(f.shadows?.md ?? 'none'),
    iconWeight: f.iconWeight ?? 'regular',
    motionPreset: matchMotionPreset(normalizeMotionSettings(f.motion)) ?? 'standard',
  }
}

const HEX = /^#[0-9a-f]{6}$/i

/** The four severities the accent alone would give — the base a partial
 *  States pick fills the rest from. */
function slotsFromAccentStates(accent: string, tint: NeutralTint) {
  const s = slotsFromAccent(accent, tint)
  return { error: s.error, warning: s.warning, success: s.success, info: s.info }
}

export function buildStudioTokens(
  choices: StudioChoices,
  tier: 'free' | 'pro',
): { project: string; tokens: unknown } | { error: string } {
  const preset = choices?.style ? themeStylePreset(choices.style) : undefined
  if (choices?.style && !preset) return { error: 'Unknown style.' }
  if (!preset && (!choices || typeof choices.accent !== 'string' || !HEX.test(choices.accent))) return { error: 'Pick an accent colour.' }

  const store = useDesignStore.getState()
  store.startNewSystem()
  // Neutral tint and contrast shape every ramp, so they are set BEFORE the
  // global ramps are generated and the theme's families minted.
  const TINTS: NeutralTint[] = ['pure', 'subtle', 'tinted', 'vivid']
  const tint = TINTS.includes(choices?.neutralTint as NeutralTint) ? choices.neutralTint as NeutralTint : undefined
  const shift = typeof choices?.contrastShift === 'number' && Number.isFinite(choices.contrastShift)
    ? Math.max(-1, Math.min(1, choices.contrastShift)) : undefined
  const pickedStates = choices?.states && typeof choices.states === 'object'
    ? Object.fromEntries(Object.entries(choices.states).filter(([k, v]) => ['error', 'warning', 'success', 'info'].includes(k) && typeof v === 'string' && HEX.test(v))) as Record<string, string>
    : {}
  const pickedNeutral = typeof choices?.neutral === 'string' && HEX.test(choices.neutral) ? choices.neutral.toLowerCase() : undefined
  const colourCustom = !!tint || shift != null || Object.keys(pickedStates).length > 0 || !!pickedNeutral
  if (tint) store.setNeutralTint(tint)
  if (shift != null) store.setContrastShift(shift)
  // The global ramps ship empty and the web fills them on mount
  // (`useEnsureColorScales` in the shell). Same backfill here, or every theme
  // that reuses a global family (accent, error…) exports no primitives for it.
  ensureColorScales()
  const s0 = useDesignStore.getState()
  const kind = choices.kind === 'dark' ? 'dark' : 'light'
  const name = String(choices.name ?? '').slice(0, 60)
  // A style with no colour edition is adopted as the web adopts it. Anything
  // else mints from the accent with the chosen tint, contrast and states, on
  // pages derived from its own neutral (the New theme form's rule) — and a
  // style's foundations are patched on top so its type, radius, spacing,
  // shadow and icons survive a colour change.
  let minted: { key: string } | { error: string }
  if (preset && !colourCustom) {
    minted = adoptPreset(preset, choices.kind ? kind : preset.preferredAppearance, { track: false })
  } else {
    const useTint = tint ?? (preset ? preset.neutralTint : s0.neutralTint)
    if (!tint && preset) store.setNeutralTint(useTint)
    const accent = (typeof choices.accent === 'string' && HEX.test(choices.accent) ? choices.accent : preset?.accent) as string
    const baseStates = preset ? presetStates(preset) : undefined
    const states = Object.keys(pickedStates).length
      ? { ...(baseStates ?? slotsFromAccentStates(accent, useTint)), ...pickedStates } as { error: string; warning: string; success: string; info: string }
      : baseStates
    const slots = { ...slotsFromAccent(accent, useTint, states), ...(pickedNeutral ? { gray: pickedNeutral } : {}) }
    const pages = { light: backgroundFromBase(slots.gray, 'light', useTint), dark: backgroundFromBase(slots.gray, 'dark', useTint) }
    minted = mintTheme(slots, choices.kind ? kind : (preset?.preferredAppearance ?? kind), name || preset?.label || '', null, useTint, pages)
    if (!('error' in minted) && preset) useDesignStore.getState().patchThemeFoundations(minted.key, preset.foundations)
  }
  if ('error' in minted) return { error: minted.error }
  const key = minted.key
  // A style brings its own accent; an accent sent WITH it is the user's change
  // on top. The same retint the web's Accent row runs: a theme on its own brand
  // family retints that family, one on the global accent moves the whole system
  // (neutral link, pages, states and gradients included).
  if (preset && typeof choices.accent === 'string' && HEX.test(choices.accent)
    && choices.accent.toLowerCase() !== preset.accent.toLowerCase()) {
    applyAccentColor(choices.accent.toLowerCase(), useDesignStore.getState().linkNeutralToAccent, key)
  }
  // The Dark reference: the dark ramp grows from its own hex while the light
  // ramp stays on the accent. Same retint the web's accent row runs on Dark.
  if (typeof choices.accentDark === 'string' && HEX.test(choices.accentDark)) {
    applyAccentDarkColor(choices.accentDark.toLowerCase(), key)
  }
  // Each severity's Dark anchor, the web's `writeState(…, 'dark')`.
  for (const slot of STATE_SLOTS) {
    const hex = choices.statesDark?.[slot]
    if (typeof hex === 'string' && HEX.test(hex)) applyStateColorForAppearance(slot, hex.toLowerCase(), 'dark', true, key)
  }
  const patch = (partial: Parameters<typeof s0.patchThemeFoundations>[1]) =>
    useDesignStore.getState().patchThemeFoundations(key, partial)
  const resolved = () => resolveThemeFoundations(useDesignStore.getState(), key)

  // Font — body, heading and the text scale, as the rail's Font edition does.
  const known = (family: string | undefined) => (family && FONT_PRESETS.some((f) => f.value === family) ? family : undefined)
  const body = known(choices.bodyFont)
  const heading = known(choices.headingFont)
  const scale = Number.isInteger(choices.typeScale) ? TYPE_SCALE_MODES[choices.typeScale as number] : undefined
  if (body || heading || scale) {
    const typography = resolved().typography
    const next = { ...typography }
    if (body) next.fontFamily = body
    if (heading) next.headingFontFamily = heading
    if (scale) Object.assign(next, buildTypeScale(scale.factor))
    patch({ typography: next })
  }

  // Radius — a preset (three axis picks on the standard ramp), then per-axis.
  if (choices.radiusPreset) {
    const p = radiusPresetPatch(choices.radiusPreset, resolved().radiusRoles)
    if (p) patch(p)
  }
  if (choices.radiusAxes) {
    let roles = resolved().radiusRoles
    for (const group of RADIUS_GROUPS) {
      const step = choices.radiusAxes[group.key as 'boxes' | 'fields' | 'selectors']
      if (step && (RADIUS_GROUP_STEPS as readonly string[]).includes(step)) {
        roles = applyRadiusGroup(group, roles, step as RadiusGroupStep)
      }
    }
    patch({ radiusRoles: roles })
  }

  // Spacing — a mode sets field size, card inset and border width together.
  const mode = SPACING_MODES.find((m) => m.id === choices.spacingMode)
  if (mode) {
    const f = resolved()
    const step = SPACING_STEPS[Math.max(0, SPACING_STEPS.indexOf(mode.insetStep))]
    const px = f.spacing[step] ?? `${Number(step) * 4}px`
    patch({
      sizes: buildSizesFromBase(mode.fieldBase),
      stroke: { ...f.stroke, sm: `${mode.border}px` },
      spacingRoles: { ...f.spacingRoles, [INSET_SURFACE_ROLE]: step },
      padding: insetSurfacePadding(px),
    })
  }

  // Card padding and Border width refine the mode, like the web's rows below it.
  if (choices.cardInset && (SPACING_STEPS as readonly string[]).includes(choices.cardInset)) {
    const f = resolved()
    const step = choices.cardInset
    patch({
      spacingRoles: { ...f.spacingRoles, [INSET_SURFACE_ROLE]: step },
      padding: insetSurfacePadding(f.spacing[step] ?? `${Number(step.replace('_', '.')) * SPACING_DEFAULT_BASE}px`),
    })
  }
  if (typeof choices.borderWidth === 'number' && (STROKE_SM_STOPS as readonly number[]).includes(choices.borderWidth)) {
    patch({ stroke: { ...resolved().stroke, sm: `${choices.borderWidth}px` } })
  }

  const shadow = SHADOW_PRESETS.find((p) => p.label === choices.shadow)
  if (shadow) patch({ shadows: { ...shadow.values } })
  const shadowDark = SHADOW_PRESETS.find((p) => p.label === choices.shadowDark)
  if (shadowDark) patch({ shadowsDark: darkShadowMap(shadowDark.values) })

  const weight = (PHOSPHOR_WEIGHTS as readonly string[]).includes(choices.iconWeight ?? '') ? (choices.iconWeight as PhosphorWeight) : undefined
  if (weight) patch({ iconWeight: weight })

  // Motion — the rail's Motion row: a preset writes the brand's whole motion.
  if ((MOTION_PRESET_KEYS as readonly string[]).includes(choices.motionPreset ?? '')) {
    patch({ motion: motionPresetPatch(choices.motionPreset as MotionPresetKey) })
  }

  applyRoleOverrides(key, choices.roleOverrides)

  // Ship it. Free and Pro both get this brand's Light + Dark; the difference is
  // Free's Desktop-only viewport and single grid style (more brands are gated
  // elsewhere, in the plugin). `freeFigmaScope` still governs the web's
  // downloads — it is not applied here.
  const s = useDesignStore.getState()
  const modes = defaultFigmaSyncModes([key], s.themeKinds)
  const scope = tier === 'free'
    ? { themes: [key], modes, viewports: ['desktop' as const], gridStyles: ['xl-desktop' as const] }
    : { themes: [key], modes }
  const label = themeDisplayName(key, s.themeLabels) || key
  return { project: slugify(label), tokens: generateTokenJSON(s, { ...scope, project: label }) }
}

/** What the plugin's "From code" step shows after reading pasted CSS — and the
 *  choices it will build with. Reading is separate from building so the person
 *  reviews what was found before anything is written. */
export interface CodeReading {
  choices: StudioChoices
  found: {
    accent: string
    others: { slot: string; hex: string }[]
    font?: string
    /** Base radius in px, when `--radius` was declared. */
    radiusPx?: number
    hasDark: boolean
  }
}

const REM = 16

/** Nearest radius preset to a base radius: the preset's Fields px is what a
 *  shadcn-style `--radius` describes (buttons, inputs). */
function presetForBaseRadius(px: number): string {
  let best = RADIUS_ROLE_PRESETS[0]
  let gap = Infinity
  for (const p of RADIUS_ROLE_PRESETS) {
    const fields = radiusPresetPx(p)[1]
    const d = Math.abs(fields - px)
    if (d < gap) { gap = d; best = p }
  }
  return best.label
}

export function readCode(css: string, name?: string): { ok: true; reading: CodeReading } | { ok: false; error: string } {
  const text = String(css ?? '').slice(0, 200_000)
  const read = approximateSource(text, name || 'From code')
  if (!read.ok) return { ok: false, error: read.error }
  const primary = read.seeds.find((x) => x.slot === 'primary')
  if (!primary) return { ok: false, error: 'No primary colour found. Declare one as --primary or --brand, or paste the :root block of your globals.css.' }
  const family = (read.json as { fontFamily?: unknown }).fontFamily
  const font = typeof family === 'string' ? FONT_PRESETS.find((f) => f.value.toLowerCase() === family.toLowerCase())?.value : undefined
  const radiusMatch = text.match(/--radius\s*:\s*([0-9.]+)\s*(rem|px)/i)
  const radiusPx = radiusMatch ? Math.round(parseFloat(radiusMatch[1]) * (radiusMatch[2].toLowerCase() === 'rem' ? REM : 1)) : undefined
  const choices: StudioChoices = {
    name: name || 'From code',
    kind: 'light',
    accent: primary.hex,
    ...(font ? { bodyFont: font, headingFont: font } : {}),
    ...(radiusPx != null ? { radiusPreset: presetForBaseRadius(radiusPx) } : {}),
  }
  return {
    ok: true,
    reading: {
      choices,
      found: {
        accent: primary.hex,
        others: read.seeds.filter((x) => x.slot !== 'primary').map((x) => ({ slot: x.slot, hex: x.hex })),
        font,
        radiusPx,
        hasDark: /\.dark\b/.test(text),
      },
    },
  }
}

/** The neutral and the four severities an accent gives on its own — what the
 *  plugin's Colour edition shows before anyone picks a state, from the same
 *  `slotsFromAccent` the build mints with. */
export function harmonyFor(accent: string, tint?: string): { neutral: string; states: Record<'error' | 'warning' | 'success' | 'info', string> } | null {
  if (typeof accent !== 'string' || !HEX.test(accent)) return null
  const TINTS: NeutralTint[] = ['pure', 'subtle', 'tinted', 'vivid']
  const t = TINTS.includes(tint as NeutralTint) ? tint as NeutralTint : 'subtle'
  const s = slotsFromAccent(accent.toLowerCase(), t)
  return { neutral: s.gray, states: { error: s.error, warning: s.warning, success: s.success, info: s.info } }
}

/** Control height is the field base × 10 (Quiet → 40). Card padding is the
 *  inset step on the 4px spacing base (step 5 → 20). Both are what the web
 *  writes; the preview must not invent a second scale. */
function spacingPaint(mode: SpacingMode): { controlH: number; pad: number } {
  return {
    controlH: Math.round(mode.fieldBase * 10),
    pad: Math.round(Number(mode.insetStep) * SPACING_DEFAULT_BASE),
  }
}

const SOLID_INKS = ['#ffffff', '#0a0d12']

function rampList(scale: Record<number, string>): string[] {
  const out: string[] = []
  for (let i = 1; i <= 12; i++) out.push(scale[i] || '')
  return out
}

function solidOf(scale: Record<number, string>): { fill: string; ink: string } {
  const pair = brandSolidPair(scale, SOLID_INKS, 9, ACTION_LABEL_TARGET)
  return { fill: scale[pair.tone] || scale[9] || '', ink: SOLID_INKS[pair.ink] ?? '#ffffff' }
}

export interface StudioLook {
  page: string
  card: string
  fg: string
  muted: string
  line: string
  accent: string
  ink: string
  accentRamp: string[]
  neutralRamp: string[]
  states: Record<'error' | 'warning' | 'success' | 'info', string>
  stateInk: Record<'error' | 'warning' | 'success' | 'info', string>
  box: number
  field: number
  control: number
  controlH: number
  pad: number
  border: number
  shadow: string
  factor: number
  heading: string
  body: string
}

/** The bento, from the same helpers the web and `buildStudioTokens` use.
 *  Pure: it does not touch the store, so a hue drag can call it. */
export function studioLook(choices: StudioChoices | null | undefined): StudioLook {
  const c = choices ?? {}
  const preset = c.style ? themeStylePreset(c.style) : undefined
  const TINTS: NeutralTint[] = ['pure', 'subtle', 'tinted', 'vivid']
  const tint: NeutralTint = TINTS.includes(c.neutralTint as NeutralTint)
    ? c.neutralTint as NeutralTint
    : (preset?.neutralTint ?? 'subtle')
  const accent = (typeof c.accent === 'string' && HEX.test(c.accent) ? c.accent : preset?.accent ?? '#7f56d9').toLowerCase()
  const accentMoved = !!preset && accent !== preset.accent.toLowerCase()
  const kind: 'light' | 'dark' = c.kind === 'dark' || c.kind === 'light'
    ? c.kind
    : (preset?.preferredAppearance === 'dark' ? 'dark' : 'light')
  const shift = typeof c.contrastShift === 'number' && Number.isFinite(c.contrastShift)
    ? Math.max(-1, Math.min(1, c.contrastShift)) : 0

  const derived = harmonyFor(accent, tint)
  const styled = !accentMoved && preset ? presetHarmony(preset) : null
  // An unlocked neutral (the plugin's own pick) outranks the one the accent gives.
  const pickedNeutral = typeof c.neutral === 'string' && HEX.test(c.neutral) ? c.neutral.toLowerCase() : undefined
  const gray = pickedNeutral || styled?.neutral || derived?.neutral || '#8b8d98'
  const seeded = !accentMoved && preset ? presetStates(preset) : derived?.states
  const stateSeed = (slot: 'error' | 'warning' | 'success' | 'info', fallback: string) => {
    const picked = c.states?.[slot]
    if (typeof picked === 'string' && HEX.test(picked)) return picked.toLowerCase()
    return seeded?.[slot] || fallback
  }
  const seeds = {
    error: stateSeed('error', '#e5484d'),
    warning: stateSeed('warning', '#f5a524'),
    success: stateSeed('success', '#30a46c'),
    info: stateSeed('info', '#3b82f6'),
  }

  const pageLight = backgroundFromBase(gray, 'light', tint)
  const pageDark = backgroundFromBase(gray, 'dark', tint)
  const page = kind === 'dark' ? pageDark : pageLight
  const brand = kind === 'dark'
    ? generateFamilyDarkScale(typeof c.accentDark === 'string' && HEX.test(c.accentDark) ? c.accentDark.toLowerCase() : accent, 'radix', shift, pageDark)
    : generateColorScale(accent, 'radix', shift, pageLight)
  const neutral = kind === 'dark'
    ? generateDarkColorScale(gray, 'radix', shift, pageDark, tint)
    : generateLightNeutralScale(gray, 'radix', shift, pageLight, tint)
  const family = (hex: string) => kind === 'dark'
    ? generateFamilyDarkScale(hex, 'radix', shift, pageDark)
    : generateColorScale(hex, 'radix', shift, pageLight)
  const darkSeed = (slot: 'error' | 'warning' | 'success' | 'info') => {
    const hex = c.statesDark?.[slot]
    return typeof hex === 'string' && HEX.test(hex) ? hex.toLowerCase() : null
  }
  const brandSolid = solidOf(brand)
  const states = {} as StudioLook['states']
  const stateInk = {} as StudioLook['stateInk']
  for (const slot of ['error', 'warning', 'success', 'info'] as const) {
    const solid = solidOf(family((kind === 'dark' && darkSeed(slot)) || seeds[slot]))
    states[slot] = solid.fill
    stateInk[slot] = solid.ink
  }

  let box = 16, field = 8, control = 4
  if (c.radiusAxes && (c.radiusAxes.boxes || c.radiusAxes.fields || c.radiusAxes.selectors)) {
    const pxOf = (step: string | undefined, fallback: number) => {
      const n = parseFloat(step ? (RADIUS_STANDARD as Record<string, string>)[step] ?? '' : '')
      return Number.isFinite(n) ? n : fallback
    }
    box = pxOf(c.radiusAxes.boxes, box)
    field = pxOf(c.radiusAxes.fields, field)
    control = pxOf(c.radiusAxes.selectors, control)
  } else if (c.radiusPreset) {
    const hit = RADIUS_ROLE_PRESETS.find((p) => p.label === c.radiusPreset)
    if (hit) { const px = radiusPresetPx(hit); box = px[0]; field = px[1]; control = px[2] }
  } else if (preset) {
    const summary = styleSummary(preset, RADIUS_STANDARD as Record<string, string>)
    box = summary.radius.boxes
    field = summary.radius.fields
    control = summary.radius.selectors
  }

  const modeId = c.spacingMode
    || (preset ? matchSpacingMode(preset.foundations.sizes, preset.foundations.spacingRoles, preset.foundations.stroke) : null)
    || 'quiet'
  const mode = SPACING_MODES.find((m) => m.id === modeId) ?? SPACING_MODES[1]
  const paint = spacingPaint(mode)

  let shadowCss: string = SHADOW_PRESETS.find((p) => p.label === 'Soft')!.values.md
  const named = c.shadow ? SHADOW_PRESETS.find((p) => p.label === c.shadow) : undefined
  if (named) shadowCss = named.values.md
  else if (preset?.foundations.shadows?.md) shadowCss = preset.foundations.shadows.md
  // Dark: its own pick, else a style's own dark ramp (only while Light is the
  // style's too), else the derived twin of whatever Light is.
  const namedDark = c.shadowDark ? SHADOW_PRESETS.find((p) => p.label === c.shadowDark) : undefined
  const darkCss = namedDark ? darkShadow(namedDark.values.md)
    : (!named && preset?.foundations.shadowsDark?.md) ? preset.foundations.shadowsDark.md
    : darkShadow(shadowCss)

  const scale = Number.isInteger(c.typeScale) ? TYPE_SCALE_MODES[c.typeScale as number] : undefined
  const summaryFonts = preset ? styleSummary(preset, RADIUS_STANDARD as Record<string, string>) : null

  return {
    page: neutral[1] || page,
    card: neutral[2] || page,
    fg: neutral[12] || '#18181b',
    muted: neutral[11] || '#71717a',
    line: neutral[6] || '#d4d4d8',
    accent: brandSolid.fill,
    ink: brandSolid.ink,
    accentRamp: rampList(brand),
    neutralRamp: rampList(neutral),
    states,
    stateInk,
    box, field, control,
    controlH: paint.controlH,
    pad: paint.pad,
    border: mode.border,
    shadow: kind === 'dark' ? darkCss : shadowCss,
    factor: scale?.factor ?? 1,
    heading: c.headingFont || summaryFonts?.heading || 'Inter',
    body: c.bodyFont || summaryFonts?.font || 'Inter',
  }
}

/** A role ref the plugin may send: a slot family (solid or alpha twin) or the
 *  neutral alpha ladder, tone 1–12. Anything else is dropped, never stored. */
const ROLE_REF = /^\{(?:(?:accent|neutral|error|warning|success|info)(?:-a)?|black-a|white-a)\.(?:[1-9]|1[0-2])\}$/
const ROLE_ID = /^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+){1,3}$/

/** The plugin's Token Details picks → `architectureOverrides` on this theme's
 *  mode columns. Exported for the tests. */
export function applyRoleOverrides(themeKey: string, overrides: StudioChoices['roleOverrides']): number {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return 0
  // Columns are `theme::appearance` (`themeModeKey`), the keys the web's
  // Semantics table writes; the theme itself must exist.
  if (!useDesignStore.getState().themeOrder.includes(themeKey)) return 0
  let n = 0
  for (const [role, byAppearance] of Object.entries(overrides).slice(0, 200)) {
    if (!ROLE_ID.test(role) || !byAppearance || typeof byAppearance !== 'object') continue
    for (const appearance of ['light', 'dark'] as const) {
      const ref = byAppearance[appearance]
      if (typeof ref !== 'string' || !ROLE_REF.test(ref)) continue
      const column = themeModeKey(themeKey, appearance)
      useDesignStore.getState().setArchitectureOverride('categorical', role, column, ref)
      n++
    }
  }
  return n
}
