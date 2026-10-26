import type { ColorScale } from '../types/tokens'
import {
  captureSnapshot,
  scopeSnapshotToTheme,
  type DesignSnapshot,
  type ThemeSources,
} from '../store/useDesignStore'
import { GLOBAL_FAMILY } from './themeSources'
import { resolveThemeFoundations } from './themeFoundations'
import { appearanceOrder, themeModeKey, type ThemeAppearance } from './themeModes'
import { themeContextFromStore } from './tokenGenerator'

type FamilyRecord = { base: string; scale: ColorScale; darkScale?: ColorScale }

function familyOf(snapshot: DesignSnapshot, key: string): FamilyRecord | null {
  if (key === 'accent') return { base: snapshot.primaryColor, scale: snapshot.primaryScale, darkScale: snapshot.primaryDarkScale }
  if (key === 'neutral') return { base: snapshot.grayBaseColor, scale: snapshot.grayLightScale, darkScale: snapshot.grayDarkScale }
  if (key === 'error') return { base: snapshot.errorColor, scale: snapshot.errorScale, darkScale: snapshot.errorDarkScale }
  if (key === 'warning') return { base: snapshot.warningColor, scale: snapshot.warningScale, darkScale: snapshot.warningDarkScale }
  if (key === 'success') return { base: snapshot.successColor, scale: snapshot.successScale, darkScale: snapshot.successDarkScale }
  if (key === 'info') return { base: snapshot.infoColor, scale: snapshot.infoScale, darkScale: snapshot.infoDarkScale }
  const custom = snapshot.customColors.find((item) => item.key === key)
  return custom ? { base: custom.base, scale: custom.scale, darkScale: custom.darkScale } : null
}

function tone(scale: ColorScale | undefined, step: number): string | undefined {
  if (!scale) return undefined
  return scale[step] ?? (scale as Record<string, string>)[String(step)]
}

function promoteThemeFamilies(snapshot: DesignSnapshot, themeKey: string): DesignSnapshot {
  const sources = snapshot.themeSources[themeKey]
  const brand = familyOf(snapshot, sources?.brand || GLOBAL_FAMILY.brand)
  const gray = familyOf(snapshot, sources?.gray || GLOBAL_FAMILY.gray)
  const error = familyOf(snapshot, sources?.error || GLOBAL_FAMILY.error)
  const warning = familyOf(snapshot, sources?.warning || GLOBAL_FAMILY.warning)
  const success = familyOf(snapshot, sources?.success || GLOBAL_FAMILY.success)
  const info = familyOf(snapshot, sources?.info || GLOBAL_FAMILY.info)

  const promotedSources: ThemeSources = {
    brand: GLOBAL_FAMILY.brand,
    gray: GLOBAL_FAMILY.gray,
    error: GLOBAL_FAMILY.error,
    warning: GLOBAL_FAMILY.warning,
    success: GLOBAL_FAMILY.success,
    info: GLOBAL_FAMILY.info,
  }

  return {
    ...snapshot,
    primaryColor: brand?.base ?? snapshot.primaryColor,
    primaryScale: brand?.scale ?? snapshot.primaryScale,
    primaryDarkScale: brand?.darkScale ?? snapshot.primaryDarkScale,
    grayBaseColor: gray?.base ?? snapshot.grayBaseColor,
    grayLightScale: gray?.scale ?? snapshot.grayLightScale,
    grayDarkScale: gray?.darkScale ?? snapshot.grayDarkScale,
    pageBackground: tone(gray?.scale, 1) ?? snapshot.pageBackground,
    darkBackground: tone(gray?.darkScale, 1) ?? snapshot.darkBackground,
    errorColor: error?.base ?? snapshot.errorColor,
    errorScale: error?.scale ?? snapshot.errorScale,
    errorDarkScale: error?.darkScale ?? snapshot.errorDarkScale,
    warningColor: warning?.base ?? snapshot.warningColor,
    warningScale: warning?.scale ?? snapshot.warningScale,
    warningDarkScale: warning?.darkScale ?? snapshot.warningDarkScale,
    successColor: success?.base ?? snapshot.successColor,
    successScale: success?.scale ?? snapshot.successScale,
    successDarkScale: success?.darkScale ?? snapshot.successDarkScale,
    infoColor: info?.base ?? snapshot.infoColor,
    infoScale: info?.scale ?? snapshot.infoScale,
    infoDarkScale: info?.darkScale ?? snapshot.infoDarkScale,
    customColors: [],
    themeSources: { [themeKey]: promotedSources },
  }
}

function bakeFoundations(snapshot: DesignSnapshot, themeKey: string): DesignSnapshot {
  if (!snapshot.themeFoundations[themeKey]) return { ...snapshot, themeFoundations: {} }
  const resolved = resolveThemeFoundations(snapshot, themeKey)
  return {
    ...snapshot,
    typography: resolved.typography,
    spacing: resolved.spacing,
    padding: resolved.padding,
    radius: resolved.radius,
    opacity: resolved.opacity,
    shadows: resolved.shadows,
    grid: resolved.grid,
    sizes: resolved.sizes,
    selector: resolved.selector,
    stroke: resolved.stroke,
    radiusRoles: resolved.radiusRoles,
    spacingRoles: resolved.spacingRoles,
    sizeRoles: resolved.sizeRoles,
    selectorRoles: resolved.selectorRoles,
    strokeRoles: resolved.strokeRoles,
    breakpointRoles: resolved.breakpointRoles,
    gridFrame: resolved.gridFrame,
    panelBackground: resolved.panelBackground,
    iconWeight: resolved.iconWeight,
    motion: resolved.motion,
    themeFoundations: {},
  }
}

/**
 * Get code's snapshot — ONE library theme, both appearances, only the
 * families and foundations that theme actually reads. Kits save still uses
 * `scopeSnapshotToTheme` (primitives stay untouched). This one is for a
 * file someone will paste: accent in the file IS this theme's brand, and
 * `:root` / `.dark` (or `.light`) follow the mode they created it in.
 */
export function scopeSnapshotForCode(snapshot: DesignSnapshot, themeKey: string): DesignSnapshot {
  if (!snapshot.themeOrder.includes(themeKey)) return snapshot
  const preferred: ThemeAppearance = snapshot.themeKinds[themeKey] ?? 'light'
  const narrowed = bakeFoundations(promoteThemeFamilies(scopeSnapshotToTheme(snapshot, themeKey), themeKey), themeKey)
  const { orderedThemeModes } = themeContextFromStore(narrowed as Parameters<typeof themeContextFromStore>[0])
  const modes = orderedThemeModes[themeKey] ?? {
    light: narrowed.themeSemantics[themeKey]?.light ?? narrowed.themes[themeKey] ?? {},
    dark: narrowed.themeSemantics[themeKey]?.dark ?? {},
  }
  const order = appearanceOrder(preferred)
  const sources = narrowed.themeSources[themeKey]
  return {
    ...narrowed,
    themeOrder: [...order],
    themes: { light: modes.light, dark: modes.dark },
    themeSemantics: { light: modes, dark: modes },
    themeKinds: { light: 'light', dark: 'dark' },
    themeLabels: {},
    themeSources: sources ? { light: sources, dark: sources } : {},
    themeOrigin: {},
    // From the ORIGINAL snapshot: `scopeSnapshotToTheme` keeps only bare
    // `<theme>` keys and drops the `<theme>::<appearance>` ones styles write.
    architectureOverrides: overridesForCode(snapshot.architectureOverrides, themeKey, preferred),
  }
}

/** The theme's role overrides — a System Style's borders, inputs and inks, and
 *  every hand-edit — re-keyed onto the code snapshot's `light` / `dark`
 *  columns. They are keyed by mode (`<theme>::light`), and those columns no
 *  longer exist here; dropping them made Get code ship the schema default
 *  where the board, Figma and Export show the style's own value (Core's
 *  `border.control` came out `#00000080` instead of `{neutral.5}`). A bare
 *  `<theme>` key (older data) applies to the theme's own appearance. */
function overridesForCode(
  all: DesignSnapshot['architectureOverrides'] | undefined,
  themeKey: string,
  preferred: ThemeAppearance,
): DesignSnapshot['architectureOverrides'] {
  const out: DesignSnapshot['architectureOverrides'] = {}
  for (const [arch, roles] of Object.entries(all ?? {})) {
    const kept: Record<string, Record<string, string>> = {}
    for (const [role, byMode] of Object.entries(roles ?? {})) {
      const entry: Record<string, string> = {}
      if (byMode[themeKey]) entry[preferred] = byMode[themeKey]
      for (const appearance of ['light', 'dark'] as const) {
        const ref = byMode[themeModeKey(themeKey, appearance)]
        if (ref) entry[appearance] = ref
      }
      if (Object.keys(entry).length) kept[role] = entry
    }
    if (Object.keys(kept).length) out[arch] = kept
  }
  return out
}

export function captureCodeSnapshot(store: DesignSnapshot, themeKey: string): DesignSnapshot {
  return scopeSnapshotForCode(captureSnapshot(store), themeKey)
}
