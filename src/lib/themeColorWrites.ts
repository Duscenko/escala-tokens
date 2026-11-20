/**
 * The colour writes a brand edit makes, shared by the quick rail (Board) and
 * Variables · Color: the accent and the four states land on ONE theme, forking
 * a family that other themes read (see `writeAccent`), and a whole palette
 * (accent, neutral, states) applies in one go (`applyPalette`).
 *
 * Callers wrap a write in their own Undo step; these only write.
 */
import { useDesignStore, DEFAULT_THEME_SOURCES, RESERVED_COLOR_KEYS } from '../store/useDesignStore'
import { useApplyAccentColor, useApplyGrayColor, useApplyStateColor, resolveThemePages, type StateRole } from './colorActions'
import { backgroundFromBase, generateColorScale, generateDarkColorScale, generateFamilyDarkScale, generateLightNeutralScale, neutralFromBrand } from './colorUtils'
import { darkTwinOf, type StateRoleId } from './colorRoles'
import { GLOBAL_FAMILY, SLOT_DISPLAY_LABEL } from './themeSources'
import type { ThemeAppearance } from './themeModes'
import type { TwoColorPalette } from './twoColorPairs'
import { slugify } from './utils'

const PALETTE_STATES: StateRoleId[] = ['success', 'error', 'warning', 'info']

export function useThemeColorWrites() {
  const applyAccent = useApplyAccentColor()
  const applyNeutral = useApplyGrayColor()
  const applyState = useApplyStateColor()

  // Accent only — the Base row is a tint dial now, not a colour edit.
  //
  // ALWAYS forks off the system's own `accent` primitive, and off any family a
  // second theme reads. Only a theme that PRIVATELY owns its brand family
  // retints in place. The old rule ("fork only when shared") let a theme whose
  // brand still pointed at the global `accent` rewrite `primaryColor` — and
  // through it the page, the neutral and every status ramp — from a control
  // that claims to edit one theme. That is also why the Accent swatch and the
  // Neutral-tint row could end up describing two different colours.
  /** `darkValue` sets the dark theme's anchor on its own; omitted, dark
   *  follows `value` as it always has. */
  const writeAccent = (themeKey: string, value: string, darkValue?: string) => {
    const s = useDesignStore.getState()
    // Re-read the family from the store: after an auto-adopt this is the
    // NEWLY minted theme's brand family, not the host's.
    const family = s.themeSources[themeKey]?.brand ?? DEFAULT_THEME_SOURCES.brand
    const affected = s.themeOrder.filter((theme) => (s.themeSources[theme]?.brand ?? DEFAULT_THEME_SOURCES.brand) === family)
    const isGlobal = family === DEFAULT_THEME_SOURCES.brand
    if (!isGlobal && affected.length <= 1) {
      // A private theme may safely retint its own linked Neutral in place.
      // Passing `false` here was the direct cause of Accent moving while the
      // neutral/page remained the old purple.
      applyAccent(value, s.linkNeutralToAccent, themeKey, darkValue)
      return
    }

    const labelRoot = s.themeLabels[themeKey] || themeKey.replace(/-/g, ' ')
    const baseKey = slugify(`${labelRoot}-brand`) || `${themeKey}-brand`
    let familyKey = baseKey
    let suffix = 2
    while (s.customColors.some((color) => color.key === familyKey)) familyKey = `${baseKey}-${suffix++}`
    const linkedNeutral = s.linkNeutralToAccent
      ? neutralFromBrand(value, s.neutralTint)
      : null
    const themePages = linkedNeutral
      ? {
          light: backgroundFromBase(linkedNeutral, 'light', s.neutralTint),
          dark: backgroundFromBase(linkedNeutral, 'dark', s.neutralTint),
        }
      : resolveThemePages(s, themeKey)

    s.addCustomColor({
      key: familyKey,
      label: `${labelRoot} Accent`,
      base: value,
      darkBase: darkValue ?? value,
      scale: generateColorScale(value, s.colorAlgorithm, s.contrastShift, themePages.light),
      darkScale: generateFamilyDarkScale(darkValue ?? value, s.colorAlgorithm, s.contrastShift, themePages.dark),
    })

    let gray = s.themeSources[themeKey]?.gray ?? DEFAULT_THEME_SOURCES.gray
    if (linkedNeutral) {
      const neutralRoot = slugify(`${labelRoot}-neutral`) || `${themeKey}-neutral`
      let neutralKey = neutralRoot
      let neutralSuffix = 2
      while (s.customColors.some((color) => color.key === neutralKey)) neutralKey = `${neutralRoot}-${neutralSuffix++}`
      s.addCustomColor({
        key: neutralKey,
        label: `${labelRoot} Neutral`,
        base: linkedNeutral,
        scale: generateLightNeutralScale(linkedNeutral, s.colorAlgorithm, s.contrastShift, themePages.light, s.neutralTint),
        darkScale: generateDarkColorScale(linkedNeutral, s.colorAlgorithm, s.contrastShift, themePages.dark, s.neutralTint),
      })
      gray = neutralKey
    }
    s.updateTheme(themeKey, s.themeKinds[themeKey] ?? 'light', {
      ...DEFAULT_THEME_SOURCES,
      ...s.themeSources[themeKey],
      brand: familyKey,
      gray,
    })
  }

  /** `fromLink` = the accent re-deriving a linked state, which must not unlink it. */
  const writeState = (themeKey: string, role: StateRole, hex: string, appearance: ThemeAppearance, fromLink = false) => {
    const s = useDesignStore.getState()
    const family = s.themeSources[themeKey]?.[role] ?? GLOBAL_FAMILY[role]
    const affected = s.themeOrder.filter((theme) => (s.themeSources[theme]?.[role] ?? GLOBAL_FAMILY[role]) === family)
    const isGlobal = family === GLOBAL_FAMILY[role]
    if (!isGlobal && affected.length <= 1) {
      applyState(role, hex, fromLink, themeKey, appearance)
      return
    }
    const labelRoot = s.themeLabels[themeKey] || themeKey.replace(/-/g, ' ')
    const baseKey = slugify(`${labelRoot}-${role}`) || `${themeKey}-${role}`
    let familyKey = baseKey
    let suffix = 2
    while (s.customColors.some((color) => color.key === familyKey) || RESERVED_COLOR_KEYS.includes(familyKey)) {
      familyKey = `${baseKey}-${suffix++}`
    }
    const pages = resolveThemePages(s, themeKey)
    s.addCustomColor({
      key: familyKey,
      label: `${labelRoot} ${SLOT_DISPLAY_LABEL[role]}`,
      base: hex,
      darkBase: hex,
      scale: generateColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.light),
      darkScale: generateFamilyDarkScale(hex, s.colorAlgorithm, s.contrastShift, pages.dark),
    })
    s.updateTheme(themeKey, s.themeKinds[themeKey] ?? 'light', {
      ...DEFAULT_THEME_SOURCES,
      ...s.themeSources[themeKey],
      [role]: familyKey,
    })
  }

  /** A whole palette on one theme: its neutral tint and neutral first (the
   *  accent ramps anchor to the pages the neutral produces), then the accent
   *  in both appearances, then each state with its dark twin. */
  const applyPalette = (themeKey: string, palette: TwoColorPalette) => {
    useDesignStore.getState().setNeutralTint(palette.neutralTint)
    applyNeutral(palette.neutral, themeKey)
    writeAccent(themeKey, palette.accentLight, palette.accent)
    const pages = resolveThemePages(useDesignStore.getState(), themeKey)
    for (const role of PALETTE_STATES) {
      const hex = palette.states[role]
      writeState(themeKey, role, hex, 'light')
      writeState(themeKey, role, darkTwinOf(hex, pages.dark), 'dark')
    }
  }

  return { writeAccent, writeState, applyPalette }
}
