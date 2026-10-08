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
import { ensureColorScales } from './colorActions'
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
  radiusPresetPatch, radiusPresetPx, type RadiusGroupStep,
} from './layoutTokens'
import { slugify } from './utils'
import { THEME_STYLE_PRESETS, themeStylePreset } from './themePresets'
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
    styles: THEME_STYLE_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      shortLabel: p.shortLabel,
      description: p.description,
      accent: p.accent,
      appearance: p.preferredAppearance,
      font: p.foundations.typography?.fontFamily ?? 'Inter',
    })),
  }
}

const HEX = /^#[0-9a-f]{6}$/i

export function buildStudioTokens(
  choices: StudioChoices,
  tier: 'free' | 'pro',
): { project: string; tokens: unknown } | { error: string } {
  const preset = choices?.style ? themeStylePreset(choices.style) : undefined
  if (choices?.style && !preset) return { error: 'Unknown style.' }
  if (!preset && (!choices || typeof choices.accent !== 'string' || !HEX.test(choices.accent))) return { error: 'Pick an accent colour.' }

  const store = useDesignStore.getState()
  store.startNewSystem()
  // The global ramps ship empty and the web fills them on mount
  // (`useEnsureColorScales` in the shell). Same backfill here, or every theme
  // that reuses a global family (accent, error…) exports no primitives for it.
  ensureColorScales()
  const s0 = useDesignStore.getState()
  const kind = choices.kind === 'dark' ? 'dark' : 'light'
  const name = String(choices.name ?? '').slice(0, 60)
  const minted = preset
    ? adoptPreset(preset, choices.kind ? kind : preset.preferredAppearance, { track: false })
    : mintTheme(slotsFromAccent(choices.accent as string, s0.neutralTint), kind, name, null, s0.neutralTint)
  if ('error' in minted) return { error: minted.error }
  const key = minted.key
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
