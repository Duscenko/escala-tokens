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

import { mintTheme, slotsFromAccent } from './themeMint'
import { useDesignStore } from '../store/useDesignStore'
import { loadGoogleFont } from './fonts'
import { resetThemeSemantics, withStyleSemantics } from './stylePreviewOverlay'
import { slugify } from './utils'
import { trackEvent } from './analytics'
import { MY_THEME_FULL_ERROR, canAddMyTheme, myThemeKeys } from './themeLibrary'
import { presetHarmony, presetStates, themeStylePreset, type ThemeStylePreset } from './themePresets'
import { themeModeKey, type ThemeAppearance } from './themeModes'
import { REMIX_ID_PREFIX } from './remixLink'
import type { ThemeFoundationOverride } from './themeFoundations'

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
 * Returns the new theme's key and the label it was actually FILED under, or an
 * error string — never throws. The label is returned rather than re-derived by
 * the caller because a collision renames ("Core" → "Core 2", see below), so a
 * caller announcing the adopt would otherwise name a theme that isn't there.
 */
export function adoptPreset(
  preset: ThemeStylePreset,
  appearance: ThemeAppearance,
  opts: { asCopy?: boolean; copyWord?: string; /** false for the automatic first-run seed — it isn't a choice anyone made. */ track?: boolean } = {},
): { key: string; name: string } | { error: string } {
  const store = useDesignStore.getState()
  const themes = store.themes
  if (!canAddMyTheme(myThemeKeys(store.themeOrder, themes).length)) {
    return { error: MY_THEME_FULL_ERROR }
  }
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

  const next = useDesignStore.getState()
  // Same expansion the try-on runs, so an adopted style's borders/fills are
  // byte-identical to the ones previewed (the `MintPages` rule, applied to the
  // semantic layer). They land as ordinary `architectureOverrides`, so the
  // Semantics table shows them as edits and "Reset to schema" hands each row
  // back to the solver.
  if (preset.semantics) {
    useDesignStore.setState({
      architectureOverrides: withStyleSemantics(
        next.architectureOverrides,
        preset.semantics,
        result.key,
      ),
    })
  }
  next.setThemeFoundations(result.key, preset.foundations)
  next.setThemeLabel(result.key, label)
  next.setThemeOrigin(result.key, preset.id)
  loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
  loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
  // `preset.id` is a curated constant (core, neo…), never user-typed text. A
  // phone remix carries a hashed id of its own; it is counted as one bucket.
  if (opts.track !== false) {
    trackEvent({ name: 'style_adopt', props: { style: preset.id.startsWith(REMIX_ID_PREFIX) ? 'remix' : preset.id } })
  }
  return { key: result.key, name: label }
}

/**
 * "Edit theme" — the ONE way a System Style enters My themes. Re-opens the
 * copy you already have (`themeOrigin === preset.id`, newest first) instead of
 * minting a second one, otherwise adopts it under its clean name. Nothing else
 * may add to My themes on the user's behalf: a list that grows from every
 * glance and slider nudge stops being a list anyone chose (reported).
 * (`themeHasEdits` can't be the reuse test — it reads true right after an
 * adopt, which duplicated on the second click.)
 */
export function openStyleForEditing(
  preset: ThemeStylePreset,
  appearance: ThemeAppearance,
): { key: string; name: string; created: boolean } | { error: string } {
  const s = useDesignStore.getState()
  const owned = myThemeKeys(s.themeOrder, s.themes).filter((key) => s.themeOrigin?.[key] === preset.id).at(-1)
  if (owned) return { key: owned, name: s.themeLabels[owned] ?? preset.label, created: false }
  const adopted = adoptPreset(preset, appearance)
  if ('error' in adopted) return adopted
  return { ...adopted, created: true }
}

type ThemeEditState = {
  themeOrigin?: Record<string, string>
  themeFoundations: Record<string, object | undefined>
  themeSources: Record<string, { brand?: string } | undefined>
  customColors: { key: string; base: string }[]
  primaryColor: string
  neutralTint: string
}

function themeAccentHex(state: ThemeEditState, themeKey: string): string {
  const brandFamily = state.themeSources[themeKey]?.brand ?? 'accent'
  if (brandFamily === 'accent') return state.primaryColor
  return state.customColors.find((family) => family.key === brandFamily)?.base ?? state.primaryColor
}

/**
 * Whether `themeKey` has moved off the thing Reset would restore.
 *
 * A System Style goes back to its origin preset; a hand-made theme goes back
 * to the system defaults (no foundation overrides). A live try-on is not a
 * theme, so the header Reset stays hidden until something is actually owned.
 */
export function themeHasEdits(state: ThemeEditState, themeKey: string): boolean {
  const origin = themeStylePreset(state.themeOrigin?.[themeKey] ?? '')
  const foundations = state.themeFoundations[themeKey]
  if (!origin) return Boolean(foundations && Object.keys(foundations).length)
  if (JSON.stringify(foundations ?? {}) !== JSON.stringify(origin.foundations)) return true
  if (state.neutralTint !== origin.neutralTint) return true
  return themeAccentHex(state, themeKey).toLowerCase() !== origin.accent.toLowerCase()
}

/**
 * Restore `themeKey` to its origin System Style, or drop its foundation
 * overrides if it was made by hand. Colour re-derives through the same
 * accent applier a first adopt uses, so the page / neutral / states land
 * where they did at creation — not a second, simpler path.
 */
export function resetThemeToOrigin(
  themeKey: string,
  applyAccent: (hex: string, fromLink: boolean, themeKey: string) => void,
): { label: string } {
  const s = useDesignStore.getState()
  const preset = themeStylePreset(s.themeOrigin?.[themeKey] ?? '')
  if (!preset) {
    s.setThemeFoundations(themeKey, null)
    return { label: 'System defaults' }
  }
  s.setThemeFoundations(themeKey, preset.foundations)
  resetThemeColorToOrigin(themeKey, applyAccent)
  loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
  loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
  return { label: preset.label }
}

// ── One row of the quick-settings panel at a time ────────────────────────────
//
// The panel's rows each own a slice of the brand. Resetting a row restores
// ONLY that slice — the same target the whole-brand Reset uses (the origin
// System Style, or no override at all for a hand-made brand), so a row reset
// and the brand reset can never disagree about what "back" means.

/** The foundation keys each quick-settings row writes. */
export const FOUNDATION_ROW_KEYS = {
  typography: ['typography'],
  radius: ['radius', 'radiusRoles', 'radiusRoleViewports'],
  shadow: ['shadows', 'shadowsDark'],
  sizes: ['sizes', 'selector', 'stroke', 'spacingRoles', 'padding'],
  icons: ['iconWeight'],
  motion: ['motion'],
} as const satisfies Record<string, readonly (keyof ThemeFoundationOverride)[]>

export type FoundationRow = keyof typeof FOUNDATION_ROW_KEYS

/** Whether the row's slice differs from what Reset restores. */
export function foundationRowHasEdits(state: ThemeEditState, themeKey: string, row: FoundationRow): boolean {
  const origin = themeStylePreset(state.themeOrigin?.[themeKey] ?? '')
  const own = (state.themeFoundations[themeKey] ?? {}) as Record<string, unknown>
  const target = (origin?.foundations ?? {}) as Record<string, unknown>
  return FOUNDATION_ROW_KEYS[row].some((key) => JSON.stringify(own[key]) !== JSON.stringify(target[key]))
}

/** Put the row's slice back: the origin's values, or no override at all. */
export function resetFoundationRow(themeKey: string, row: FoundationRow): void {
  const s = useDesignStore.getState()
  const origin = themeStylePreset(s.themeOrigin?.[themeKey] ?? '')
  const next: Record<string, unknown> = { ...(s.themeFoundations[themeKey] ?? {}) }
  for (const key of FOUNDATION_ROW_KEYS[row]) {
    const value = (origin?.foundations as Record<string, unknown> | undefined)?.[key]
    if (value === undefined) delete next[key]
    else next[key] = structuredClone(value)
  }
  s.setThemeFoundations(themeKey, Object.keys(next).length ? next as ThemeFoundationOverride : null)
  if (row === 'typography') {
    loadGoogleFont(origin?.foundations.typography?.fontFamily ?? '')
    loadGoogleFont(origin?.foundations.typography?.headingFontFamily ?? '')
  }
}

/** Whether the Colour row (accent and neutral tint) moved off its origin. A
 *  hand-made brand has no colour to go back to, so it never reads edited. */
export function colorRowHasEdits(state: ThemeEditState, themeKey: string): boolean {
  const origin = themeStylePreset(state.themeOrigin?.[themeKey] ?? '')
  if (!origin) return false
  if (state.neutralTint !== origin.neutralTint) return true
  return themeAccentHex(state, themeKey).toLowerCase() !== origin.accent.toLowerCase()
}

/** The Colour half of `resetThemeToOrigin`: tint, the style's role recipe,
 *  then the accent through the adopt's own applier. */
export function resetThemeColorToOrigin(
  themeKey: string,
  applyAccent: (hex: string, fromLink: boolean, themeKey: string) => void,
): void {
  const s = useDesignStore.getState()
  const preset = themeStylePreset(s.themeOrigin?.[themeKey] ?? '')
  if (!preset) return
  s.setNeutralTint(preset.neutralTint)
  useDesignStore.setState({
    architectureOverrides: resetThemeSemantics(
      s.architectureOverrides,
      preset.semantics,
      themeKey,
    ),
  })
  applyAccent(preset.accent, true, themeKey)
}

// ── A phone remix over the guest's automatic brand ───────────────────────────
//
// Every visitor without an account gets Core as their first brand, made for
// them (`ensureGuestBrand` in Configurator), and a second brand asks for an
// account. A `?remix=` from the phone playground would therefore ALWAYS hit
// the sign-up modal on Add brand, though the only brand in the way is one the
// visitor never chose. So when that automatic brand is the only one and nobody
// has touched it, a remix takes its place instead. Anything they did make or
// change stays theirs, and then a second brand asks for an account as usual.

/** The style a visitor's first brand is made from. */
export const GUEST_START_STYLE = 'core-minimal'

type SeedState = ReturnType<typeof useDesignStore.getState>

/** The automatic brand's key, when it is the visitor's only brand and still
 *  exactly the style it was made from: foundations, accent and tint, the
 *  style's own role recipe and nothing else, and the name it was given. */
export function untouchedGuestSeed(state: SeedState = useDesignStore.getState()): string | null {
  const mine = myThemeKeys(state.themeOrder, state.themes)
  if (mine.length !== 1) return null
  const key = mine[0]
  if (state.themeOrigin?.[key] !== GUEST_START_STYLE) return null
  const preset = themeStylePreset(GUEST_START_STYLE)
  if (!preset || themeHasEdits(state, key)) return null
  const label = state.themeLabels[key]?.trim()
  if (label && label !== state.projectName.trim() && label !== preset.label) return null
  // Semantic edits: the overrides on this theme's modes must be the ones the
  // style itself writes on adopt, no more and no fewer.
  const modes = new Set([themeModeKey(key, 'light'), themeModeKey(key, 'dark')])
  const own = (overrides: SeedState['architectureOverrides']) => Object.fromEntries(
    Object.entries(overrides).map(([arch, tokens]) => [arch, Object.fromEntries(
      Object.entries(tokens)
        .map(([token, byMode]) => [token, Object.fromEntries(Object.entries(byMode).filter(([mode]) => modes.has(mode)))] as const)
        .filter(([, byMode]) => Object.keys(byMode).length),
    )]).filter(([, tokens]) => Object.keys(tokens).length),
  )
  const expected = own(withStyleSemantics({}, preset.semantics, key))
  return JSON.stringify(own(state.architectureOverrides)) === JSON.stringify(expected) ? key : null
}

/**
 * Add brand for a phone remix when the guest's only brand is the untouched
 * automatic one: the remix is adopted and the automatic brand removed, under
 * the name the automatic one carried (the design system's). Null when the
 * swap does not apply — the caller keeps its usual path.
 */
export function adoptRemixOverGuestSeed(
  preset: ThemeStylePreset,
  appearance: ThemeAppearance,
): { key: string; name: string } | { error: string } | null {
  if (!preset.id.startsWith(REMIX_ID_PREFIX)) return null
  const seed = untouchedGuestSeed()
  if (!seed) return null
  const s = useDesignStore.getState()
  const name = s.themeLabels[seed]?.trim() || preset.label
  // Remove first: the guest plan holds one brand, so the remix has no room
  // until the automatic one is gone. If the adopt still fails, Core comes back.
  s.removeTheme(seed)
  // Filed under that name from the start, so the theme's key (and the URL's
  // `section`) reads like the brand, not "random".
  const adopted = adoptPreset({ ...preset, label: name, shortLabel: name }, appearance)
  if ('error' in adopted) {
    const back = themeStylePreset(GUEST_START_STYLE)
    if (back) {
      const restored = adoptPreset(back, appearance, { track: false })
      if ('key' in restored) useDesignStore.getState().setThemeLabel(restored.key, name)
    }
    return adopted
  }
  return adopted
}
