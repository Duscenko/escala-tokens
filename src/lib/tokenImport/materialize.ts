// ─── Import pipeline: materialization ────────────────────────────────────────
// ImportAnalysis + user choices (name, normalize) → a complete DesignSnapshot.
// Starts from makeDesignDefaults() so every gap the file left is filled: missing
// ramps are generated, missing state colors recommended from the accent, and
// BOTH light and dark themes are fully seeded from the role taxonomy before the
// detected semantic values overlay them.

import {
  generateColorScale, generateDarkColorScale, recommendStateColors,
} from '../colorUtils'
import {
  ALL_ROLES, recHexFor, sourceScaleFor, normalizeThemeValue, type GlobalScales,
} from '../semanticRoles'
import {
  makeDesignDefaults, RESERVED_COLOR_KEYS,
  type CustomColor, type DesignSnapshot,
} from '../../store/useDesignStore'
import { slugify } from '../utils'
import type { FamilyPick, ImportAnalysis, ImportFamilyKey } from './types'
import chroma from 'chroma-js'

export interface MaterializeOptions {
  name: string
  /** Snap off-ramp semantic values onto their family ramps (the review toggle). */
  normalize: boolean
}

function lightnessOf(hex: string): number {
  try {
    const l = chroma(hex).oklch()[0]
    return Number.isNaN(l) ? 0.5 : l
  } catch {
    return 0.5
  }
}

// Derive a low-saturation neutral that keeps the accent's hue — mirrors
// colorControls.neutralFromBrand, duplicated here so this module stays free of
// component imports.
function neutralFromAccent(hex: string): string {
  try {
    return chroma(hex).set('hsl.s', 0.08).set('hsl.l', 0.46).hex()
  } catch {
    return hex
  }
}

const ROLE_BY_KEY = new Map(ALL_ROLES.map((r) => [r.key, r]))

export function materializeImport(analysis: ImportAnalysis, opts: MaterializeOptions): DesignSnapshot {
  const snap = makeDesignDefaults()
  snap.projectName = opts.name.trim() || 'Imported system'
  const algo = snap.colorAlgorithm
  const f = analysis.families

  // ── Backgrounds first: ramps and the dark neutral anchor to them ──
  const findMapped = (theme: 'light' | 'dark', roleKey: string) =>
    analysis.semantics.mapped.find((m) => m.theme === theme && m.roleKey === roleKey)
  const lightSurface = analysis.backgrounds?.page ?? findMapped('light', 'surface-0')?.hex
  if (lightSurface && lightnessOf(lightSurface) > 0.85) snap.pageBackground = lightSurface
  // A detected dark neutral ramp's deepest tone IS the dark page.
  const darkSurface =
    analysis.backgrounds?.dark ?? findMapped('dark', 'surface-0')?.hex ?? f.grayDark?.scale[12]
  if (darkSurface && lightnessOf(darkSurface) < 0.5) snap.darkBackground = darkSurface

  // ── Primitive families (detected → adopted; missing → generated) ──
  if (f.accent) {
    snap.primaryColor = f.accent.baseHex
    snap.primaryScale = { ...f.accent.scale }
  } else {
    snap.primaryScale = generateColorScale(snap.primaryColor, algo, 0, snap.pageBackground)
  }

  if (f.neutral) {
    snap.grayBaseColor = f.neutral.baseHex
    snap.grayLightScale = { ...f.neutral.scale }
  } else if (f.accent) {
    snap.grayBaseColor = neutralFromAccent(f.accent.baseHex)
    snap.grayLightScale = generateColorScale(snap.grayBaseColor, algo, 0, snap.pageBackground)
  }
  // (No accent and no neutral → the default Figma gray ramp stays.)

  const recommended = recommendStateColors(snap.primaryColor)
  const stateSlots: [ImportFamilyKey & keyof typeof recommended, 'errorColor' | 'warningColor' | 'successColor' | 'infoColor', 'errorScale' | 'warningScale' | 'successScale' | 'infoScale'][] = [
    ['error', 'errorColor', 'errorScale'],
    ['warning', 'warningColor', 'warningScale'],
    ['success', 'successColor', 'successScale'],
    ['info', 'infoColor', 'infoScale'],
  ]
  for (const [fam, colorKey, scaleKey] of stateSlots) {
    const pickVal: FamilyPick | undefined = f[fam]
    if (pickVal) {
      snap[colorKey] = pickVal.baseHex
      snap[scaleKey] = { ...pickVal.scale }
    } else {
      snap[colorKey] = recommended[fam]
      snap[scaleKey] = generateColorScale(recommended[fam], algo, 0, snap.pageBackground)
    }
  }

  // Custom families — keys deduped against the reserved set and each other.
  const usedKeys = new Set(RESERVED_COLOR_KEYS)
  snap.customColors = f.custom.map((c): CustomColor => {
    let key = slugify(c.name) || 'custom'
    while (usedKeys.has(key)) key = `${key}-2`
    usedKeys.add(key)
    return { key, label: c.name, base: c.baseHex, scale: { ...c.scale } }
  })

  // Dark neutral ramp — detected (Escala) or regenerated against the imported
  // dark background. NEVER left as the stale default when backgrounds changed.
  snap.grayDarkScale = f.grayDark
    ? { ...f.grayDark.scale }
    : generateDarkColorScale(snap.grayBaseColor, algo, 0, snap.darkBackground, snap.neutralTint)

  // ── Themes: seed every role from the taxonomy, then overlay detections ──
  // grayDark is mandatory here — omitting it would make Step3's resync treat
  // every dark gray as stale and overwrite the imported values on first open.
  const globalScales: GlobalScales = {
    gray: snap.grayLightScale,
    grayDark: snap.grayDarkScale,
    brand: snap.primaryScale,
    error: snap.errorScale,
    warning: snap.warningScale,
    success: snap.successScale,
    info: snap.infoScale,
  }
  for (const kind of ['light', 'dark'] as const) {
    const theme: Record<string, string> = { ...snap.themes[kind] }
    for (const role of ALL_ROLES) {
      const scale = sourceScaleFor(role, kind, globalScales)
      if (scale && Object.keys(scale).length) theme[role.key] = recHexFor(role, kind, scale)
    }
    for (const m of analysis.semantics.mapped) {
      if (m.theme !== kind) continue
      const role = ROLE_BY_KEY.get(m.roleKey)
      if (!role) continue
      const scale = sourceScaleFor(role, kind, globalScales)
      theme[m.roleKey] = opts.normalize && scale ? normalizeThemeValue(role, kind, scale, m.hex) : m.hex
    }
    snap.themes[kind] = theme
  }

  // ── Foundations ──
  // Spacing is a free-form scale the file owns wholesale; the other records
  // have canonical key sets our tables/export enumerate, so detected values
  // merge OVER the defaults — imported keys win, gaps stay filled.
  if (analysis.foundations.spacing.status === 'detected') {
    snap.spacing = { ...analysis.foundations.spacing.values }
  }
  for (const key of ['radius', 'opacity', 'shadows', 'grid', 'sizes'] as const) {
    const report = analysis.foundations[key]
    if (report.status === 'detected' && Object.keys(report.values).length) {
      snap[key] = { ...snap[key], ...report.values }
    }
  }

  const t = analysis.typography
  if (t.fontFamily) snap.typography.fontFamily = t.fontFamily
  snap.typography.headingFontFamily = t.headingFontFamily ?? t.fontFamily ?? snap.typography.headingFontFamily
  if (t.weights && Object.keys(t.weights).length) {
    snap.typography.weights = { ...snap.typography.weights, ...t.weights }
  }
  if (t.sizes) snap.typography.sizes = { ...snap.typography.sizes, ...t.sizes }
  if (t.lineHeights) snap.typography.lineHeights = { ...snap.typography.lineHeights, ...t.lineHeights }

  // Fresh provenance: an imported system never inherits connections.
  snap.projectDescription = ''
  snap.figmaLastPublishAt = null
  snap.githubRepo = null
  snap.githubLastPushAt = null
  snap.completedFoundations = []

  return snap
}
