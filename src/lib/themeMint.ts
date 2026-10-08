// The theme MINTING path — create AND edit — and what it needs. DOM-free on
// purpose: the plugin's native setup builds a system on the server with it
// (`pluginStudio.ts`), the Generator's New theme panel with the same call.

import { useDesignStore, RESERVED_COLOR_KEYS, type ThemeSources } from '../store/useDesignStore'
import { FAMILY_SLOTS, type FamilySlot } from './themeSources'
import {
  generateColorScale, generateDarkColorScale, generateFamilyDarkScale, previewHarmony,
  type NeutralTint,
} from './colorUtils'
import { slugify } from './utils'
import { MY_THEME_FULL_ERROR, canAddMyTheme, myThemeKeys } from './themeLibrary'
import { INDUSTRY_SPECTRUM } from './industryPacks'

export function uniqueKey(wanted: string, taken: Set<string>): string {
  const base = wanted || 'theme'
  let key = base
  let n = 2
  while (taken.has(key) || RESERVED_COLOR_KEYS.includes(key)) key = `${base}-${n++}`
  return key
}

function titleCaseKey(key: string) {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function labelForAccent(hex: string): string {
  const h = hex.slice(0, 7).toLowerCase()
  return INDUSTRY_SPECTRUM.find((p) => p.hex.toLowerCase() === h)?.label ?? 'Theme'
}

/** Derive the five non-accent slots from an accent, the way "one colour, a
 *  whole theme" implies. Same `previewHarmony` the accent↔neutral/states links
 *  use, so a theme minted from an accent lands on the colours the rest of the
 *  system would have picked for it. */
export function slotsFromAccent(
  hex: string,
  tint: NeutralTint,
  /** Severity seeds to use instead of the accent-derived recommendation — a
   *  System Style's own `states`. See `presetStates`. */
  states?: { error: string; warning: string; success: string; info: string },
): Record<FamilySlot, string> {
  const h = previewHarmony(hex, tint)
  const st = states ?? h.states
  return {
    brand: hex,
    gray: h.neutral,
    error: st.error,
    warning: st.warning,
    success: st.success,
    info: st.info,
  }
}

/**
 * THE minting path — create AND edit. There used to be two:
 * `mintThemeFromAccent` (create) and `AddThemeForm.handleCreate` (edit), and
 * they disagreed on the two things that matter.
 *
 * 1. **The dark twin.** The edit path minted families with `scale` only, no
 *    `darkScale`. `tokenGenerator` gates `<key>-dark-*` on that field being
 *    non-empty, so an export or an auto-sync fired between the save and the
 *    next `ColorPrimitives` mount (where `useEnsureColorScales`, a `[]`-deps
 *    effect, happens to backfill it) shipped the family's ENTIRE dark ramp
 *    missing. Measured: `lightSteps: 12, darkSteps: 0` in the persisted
 *    snapshot right after saving a re-pointed Error slot.
 * 2. **The gray slot is not a generic family.** Only `generateDarkColorScale`
 *    re-derives the base as a dark neutral, and only the neutral carries
 *    `neutralTint`'s chroma link — the generic `generateFamilyDarkScale` the
 *    backfill uses for everything is wrong for it (see NEUTRAL_TINTS).
 *
 * Both are handled here, once, so neither entry point can drift again.
 */
/**
 * The two pages a minted family's ramps are anchored to.
 *
 * Normally the SYSTEM's pages — a theme is a reading of one set of primitives,
 * and they all sit on the same paper. A System Style is the exception: it
 * brings its own neutral AND its own `neutralTint`, and the page is derived
 * from exactly that pair (`backgroundFromBase`). Anchoring a warm `tinted`
 * neutral to the open system's white page is what made every style adopt
 * identically — the same defect `stylePreviewOverlay` carried, and it has to be
 * fixed in BOTH or "Add to system" stops matching what was previewed.
 */
export interface MintPages { light: string; dark: string }

function scalesForSlot(
  slot: FamilySlot,
  hex: string,
  s: ReturnType<typeof useDesignStore.getState>,
  neutralTint: NeutralTint = s.neutralTint,
  pages: MintPages = { light: s.pageBackground, dark: s.darkBackground },
) {
  if (slot === 'gray') {
    return {
      scale: generateColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.light, 'light', neutralTint),
      darkScale: generateDarkColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.dark, neutralTint),
    }
  }
  return {
    scale: generateColorScale(hex, s.colorAlgorithm, s.contrastShift, pages.light),
    darkScale: generateFamilyDarkScale(hex, s.colorAlgorithm, s.contrastShift, pages.dark),
  }
}

export function mintTheme(
  chosen: Record<FamilySlot, string>,
  kind: 'light' | 'dark',
  nameLabel: string,
  editKey: string | null,
  neutralTint?: NeutralTint,
  pages?: MintPages,
): { key: string; renamedFrom?: string } | { error: string } {
  const s = useDesignStore.getState()
  if (!editKey && !canAddMyTheme(myThemeKeys(s.themeOrder, s.themes).length)) {
    return { error: MY_THEME_FULL_ERROR }
  }
  const typed = nameLabel.trim()
  // An unnamed theme still gets a name: the accent's own industry label, or
  // "Theme". Erroring on a blank field was the edit form's rule and the create
  // picker's opposite — one behaviour now, and it's the forgiving one.
  const label = typed || labelForAccent(chosen.brand)
  const baseKey = slugify(label)
  if (!baseKey) return { error: 'Name the theme first.' }
  // On edit the key only collides when it points at a DIFFERENT theme.
  if (typed && s.themes[baseKey] && baseKey !== editKey) return { error: `"${baseKey}" already exists.` }
  const key = typed || editKey
    ? baseKey
    : uniqueKey(baseKey, new Set(Object.keys(s.themes)))

  const globals: Record<FamilySlot, { key: string; hex: string }> = {
    brand:   { key: 'accent',  hex: s.primaryColor },
    gray:    { key: 'neutral', hex: s.grayBaseColor },
    error:   { key: 'error',   hex: s.errorColor },
    warning: { key: 'warning', hex: s.warningColor },
    success: { key: 'success', hex: s.successColor },
    info:    { key: 'info',    hex: s.infoColor },
  }
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

  try {
    const taken = new Set(s.customColors.map((c) => c.key))
    const refs = {} as ThemeSources
    for (const slot of FAMILY_SLOTS) {
      const slotHex = chosen[slot]
      const g = globals[slot]
      // A theme never HOLDS colour — it references a family. The system's own
      // global when the hex matches it, an existing family that already
      // carries it, else a new family minted so the colour is editable in
      // Primitives where colour is edited.
      if (eq(slotHex, g.hex)) { refs[slot] = g.key; continue }
      const existing = s.customColors.find((c) => eq(c.base, slotHex))
      if (existing) { refs[slot] = existing.key; continue }
      const familyKey = uniqueKey(slot === 'brand' ? key : `${key}-${slot}`, taken)
      taken.add(familyKey)
      s.addCustomColor({
        key: familyKey,
        label: titleCaseKey(familyKey),
        base: slotHex,
        ...scalesForSlot(slot, slotHex, s, neutralTint, pages),
      })
      refs[slot] = familyKey
    }
    // Extra brand palettes (Secondary / Tertiary) are not slots mintTheme
    // assigns — keep them across an edit so "Save changes" can't silently
    // drop palettes the Accents group still lists.
    if (editKey) {
      const prev = s.themeSources[editKey]
      if (prev?.secondary) refs.secondary = prev.secondary
      if (prev?.tertiary) refs.tertiary = prev.tertiary
    }
    if (editKey) {
      const renamed = key !== editKey
      if (renamed) s.renameTheme(editKey, key)
      s.updateTheme(key, kind, refs)
      return renamed ? { key, renamedFrom: editKey } : { key }
    }
    s.addTheme(key, kind, refs)
    return { key }
  } catch {
    return { error: 'One of the colors is invalid.' }
  }
}

