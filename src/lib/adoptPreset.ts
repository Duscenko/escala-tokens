// Turning a System Style into a real theme — ONE implementation.
//
// Two call sites need it and they must not drift: the Themes Library's explicit
// "Add to system", and the quick-settings rail's AUTO-ADOPT, which fires the
// moment someone touches a control while trying a style on. Both mint exactly
// the same theme; the only difference is what triggered it.
//
// Auto-adopt exists because an edit has to land somewhere real. The rail's
// controls write through `patchThemeFoundations(previewTheme, …)` and the colour
// appliers, so with an ephemeral try-on there are only three options: lock the
// controls (an obstacle, and the reported cause of "confusión y parálisis"),
// let the edit hit whichever theme happens to be selected (silently corrupting a
// theme you are not looking at), or make the style real first. Only the third is
// both editable and honest.

import { mintTheme, slotsFromAccent } from '../components/configurator/ThemePanel'
import { useDesignStore } from '../store/useDesignStore'
import { loadGoogleFont } from './fonts'
import { withStyleSemantics } from './stylePreviewOverlay'
import { slugify } from './utils'
import { presetHarmony, presetStates, type ThemeStylePreset } from './themePresets'
import type { ThemeAppearance } from './themeModes'

/**
 * Mints `preset` as a real theme in the given appearance and records where it
 * came from (`themeOrigin`), which is what Reset later resets TO.
 *
 * `asCopy` is the AUTO-ADOPT path: a try-on becomes real the moment the user
 * starts iterating on it (opens the token editor, drags a quick-settings
 * control). It names the theme `<shortLabel> Copy` — "Core Copy" — so the row
 * in MY THEMES reads unmistakably as a duplication the user can pull apart from
 * the original, not as the pristine style itself. The explicit "Add to system"
 * button leaves `asCopy` off and keeps the clean name (`preset.label`), because
 * that press is a deliberate "make this style mine".
 *
 * Returns the new theme's key, or an error string — never throws.
 */
export function adoptPreset(
  preset: ThemeStylePreset,
  appearance: ThemeAppearance,
  opts: { asCopy?: boolean; copyWord?: string } = {},
): { key: string } | { error: string } {
  const themes = useDesignStore.getState().themes
  // "Core", then "Core 2"… (explicit add) — or "Core Copy", "Core Copy 2"…
  // (auto-adopt). A style can honestly be adopted more than once, so a collision
  // renames rather than refusing.
  const baseLabel = opts.asCopy
    ? `${preset.shortLabel} ${opts.copyWord ?? 'Copy'}`
    : preset.label
  let label = baseLabel
  let key = slugify(label)
  let suffix = 2
  while (themes[key]) {
    label = `${baseLabel} ${suffix++}`
    key = slugify(label)
  }

  // The minted theme's kind is whatever was PREVIEWED, never the preset's
  // authored default — you cannot try one appearance on and commit the other.
  // The style's OWN pages, derived from its neutral + tint — the same two values
  // `stylePreviewOverlay` renders the try-on against. Without them the minted
  // families anchor to whatever page the open system happens to have, so
  // adopting a warm `tinted` style into a white system silently produced a white
  // one and the tint was invisible (see MintPages).
  const h = presetHarmony(preset)
  const slots = slotsFromAccent(preset.accent, preset.neutralTint, presetStates(preset))
  if (preset.neutral) slots.gray = preset.neutral
  const result = mintTheme(
    slots,
    appearance,
    label,
    null,
    preset.neutralTint,
    { light: h.pageLight, dark: h.pageDark },
  )
  if ('error' in result) return result

  const store = useDesignStore.getState()
  // Same expansion the try-on runs, so an adopted style's borders/fills are
  // byte-identical to the ones previewed (the `MintPages` rule, applied to the
  // semantic layer). They land as ordinary `architectureOverrides`, so the
  // Semantics table shows them as edits and "Reset to schema" hands each row
  // back to the solver.
  if (preset.semantics) {
    useDesignStore.setState({
      architectureOverrides: withStyleSemantics(
        store.architectureOverrides,
        preset.semantics,
        result.key,
      ),
    })
  }
  store.setThemeFoundations(result.key, preset.foundations)
  store.setThemeLabel(result.key, label)
  store.setThemeOrigin(result.key, preset.id)
  loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
  loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
  return { key: result.key }
}
