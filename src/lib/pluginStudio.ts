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
import { ensureColorScales, applyAccentColor } from './colorActions'
import { mintTheme, slotsFromAccent } from './themeMint'
import { resolveThemeFoundations } from './themeFoundations'
import { generateTokenJSON } from './tokenGenerator'
import { freeFigmaScope } from './freeFigmaScope'
import { defaultFigmaSyncModes } from './figmaSyncModes'
import { themeDisplayName } from './themeSources'
import { FONT_PRESETS } from './fonts'
import { TYPE_SCALE_MODES, buildTypeScale } from './typographyStandard'
import { SHADOW_PRESETS } from './shadowTokens'
import { PHOSPHOR_WEIGHTS, type PhosphorWeight } from './phosphorIcons'
import {
  INSET_SURFACE_ROLE, RADIUS_GROUPS, RADIUS_GROUP_STEPS, RADIUS_ROLE_PRESETS, RADIUS_STANDARD,
  SPACING_MODES, SPACING_STEPS, applyRadiusGroup, buildSizesFromBase, insetSurfacePadding,
  radiusPresetPatch, radiusPresetPx, matchSpacingMode, mergeLayoutRoles, type RadiusGroupStep,
} from './layoutTokens'
import { slugify } from './utils'
import { backgroundFromBase, type NeutralTint } from './colorUtils'
import { approximateSource } from './tokenImport/approximateSource'
import { THEME_STYLE_PRESETS, themeStylePreset, presetHarmony, presetStates, type ThemeStylePreset } from './themePresets'
import { matchShadowPreset } from './shadowTokens'
import { adoptPreset } from './adoptPreset'

export interface StudioChoices {
  /** A System Style id (`THEME_STYLE_PRESETS`). When set, the theme is that
   *  style adopted as-is — the same `adoptPreset` the web's Edit theme runs —
   *  and `accent` is not needed. Step choices sent with it still apply on top. */
  style?: string
  name?: string
  kind?: 'light' | 'dark'
  /** #rrggbb */
  accent?: string
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
  /** -1 (softer) … 1 (stronger), the rail's contrast shift. */
  contrastShift?: number
  states?: Partial<Record<'error' | 'warning' | 'success' | 'info', string>>
  /** A `SPACING_MODES` id. */
  spacingMode?: string
  /** A `SHADOW_PRESETS` label. */
  shadow?: string
  iconWeight?: string
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
    })),
    shadows: SHADOW_PRESETS.map((p) => ({ label: p.label, description: p.description, md: p.values.md })),
    iconWeights: [...PHOSPHOR_WEIGHTS],
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
    iconWeight: f.iconWeight ?? 'regular',
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
  const colourCustom = !!tint || shift != null || Object.keys(pickedStates).length > 0
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
    const slots = slotsFromAccent(accent, useTint, states)
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

  const shadow = SHADOW_PRESETS.find((p) => p.label === choices.shadow)
  if (shadow) patch({ shadows: { ...shadow.values } })

  const weight = (PHOSPHOR_WEIGHTS as readonly string[]).includes(choices.iconWeight ?? '') ? (choices.iconWeight as PhosphorWeight) : undefined
  if (weight) patch({ iconWeight: weight })

  // Ship it: Free is one theme in one mode on Desktop; Pro gets Light + Dark.
  const s = useDesignStore.getState()
  const appearance = s.themeKinds[key] === 'dark' ? 'dark' : 'light'
  const scope = tier === 'free'
    ? freeFigmaScope(key, [key], s.themes, s.themeKinds, appearance)
    : { themes: [key], modes: defaultFigmaSyncModes([key], s.themeKinds) }
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
