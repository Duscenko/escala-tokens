// What a brand may have of its OWN besides colour, when it is added to a
// system that already has one (the plugin's Add brand, PLAN-multibrand-
// foundations.md decision 4): the font families (body, display), the radius,
// and the spacing (paddings, gaps). Everything else — the text scale, weights,
// shadows, icons, motion, control sizes, stroke — is shared with the system.
//
// There is no "own" flag in the store. A brand's row is OWN when its resolved
// values differ from the system brand's, SYSTEM when they match — read from the
// tokens, like `matchSpacingMode`. Both write through the same per-theme layer
// every edition already uses (`themeFoundations[brand]`), so the payload's
// `foundationsByTheme[<brand>::<appearance>]` carries the difference with no
// new field.

import { useDesignStore } from '../store/useDesignStore'
import { resolveThemeFoundations, type FoundationSource, type ThemeFoundationOverride } from './themeFoundations'
import { myThemeKeys } from './themeLibrary'
import { savedBrandKeysFrom } from './libraryStatus'
import {
  INSET_SURFACE_ROLE, PADDING_DEFAULT_STEP, SPACING_MODES, mergeLayoutRoles, spacingRefStep, type SpacingMode,
} from './layoutTokens'

/** The three rows a brand may own, in the order the studio lists them. Keys are
 *  the quick-settings rail's row keys (`QuickPanelFoundation`). */
export const BRAND_OWN_ROWS = [
  { row: 'typography', label: 'Font' },
  { row: 'radius', label: 'Radius' },
  { row: 'sizes', label: 'Spacing' },
] as const
export type BrandOwnRow = (typeof BRAND_OWN_ROWS)[number]['row']

/** The override keys each row may write on a brand. Spacing is paddings and
 *  gaps only: field sizes and border width are shared. Font writes the whole
 *  `typography` object (its shape is fixed), but only its families differ
 *  from the system's: the brand's editor does not offer the text scale. */
export const BRAND_OWN_KEYS = {
  typography: ['typography'],
  radius: ['radius', 'radiusRoles', 'radiusRoleViewports'],
  sizes: ['spacingRoles', 'padding'],
} as const satisfies Record<BrandOwnRow, readonly (keyof ThemeFoundationOverride)[]>

type State = ReturnType<typeof useDesignStore.getState>

/** The brand a new brand's shared foundations come from: the system's first
 *  SAVED brand that is not `brand` (a hidden draft is not "the system"), or
 *  the first listed one. Undefined while `brand` is the only one. */
export function systemBrandFor(state: State, brand: string): string | undefined {
  const saved = savedBrandKeysFrom(state).filter((key) => key !== brand)
  if (saved.length) return saved[0]
  return myThemeKeys(state.themeOrder, state.themes).find((key) => key !== brand)
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

function rowValues(f: FoundationSource, row: BrandOwnRow): unknown[] {
  if (row === 'typography') return [f.typography.fontFamily, f.typography.headingFontFamily ?? f.typography.fontFamily]
  if (row === 'radius') return [f.radius, mergeLayoutRoles('radius', f.radiusRoles), f.radiusRoleViewports ?? {}]
  return [mergeLayoutRoles('spacing', f.spacingRoles), f.padding]
}

/** Whether `brand` has its own value for the row (it differs from `system`). */
export function brandOwnsRow(state: State, brand: string, system: string, row: BrandOwnRow): boolean {
  const mine = rowValues(resolveThemeFoundations(state, brand), row)
  const theirs = rowValues(resolveThemeFoundations(state, system), row)
  return mine.some((value, i) => !same(value, theirs[i]))
}

/** "Use <system>'s font": the row's slice becomes the system brand's again —
 *  its own override copied, or no override where the system has none. */
export function followSystemRow(brand: string, system: string, row: BrandOwnRow): void {
  const s = useDesignStore.getState()
  if (!s.themes[brand]) return
  const theirs = (s.themeFoundations[system] ?? {}) as Record<string, unknown>
  const next: Record<string, unknown> = { ...(s.themeFoundations[brand] ?? {}) }
  for (const key of BRAND_OWN_KEYS[row]) {
    if (theirs[key] === undefined) delete next[key]
    else next[key] = structuredClone(theirs[key])
  }
  s.setThemeFoundations(brand, Object.keys(next).length ? next as ThemeFoundationOverride : null)
}

/** A brand added to a system starts on the system's foundations: everything
 *  `system` overrides is copied (so the shared type scale, shadows, icons,
 *  motion, sizes and stroke match it column for column), and nothing of its
 *  own. A style it started from brings its colour only. */
export function seedAddedBrand(brand: string, system: string): void {
  const s = useDesignStore.getState()
  if (!s.themes[brand]) return
  const theirs = s.themeFoundations[system]
  s.setThemeFoundations(brand, theirs ? structuredClone(theirs) : null)
}

/** Inside a brand a spacing mode sets the card padding only, so the modes it
 *  offers are the ones that differ there (Bold is Quiet's padding with heavier
 *  strokes, which are shared). */
export const BRAND_SPACING_MODES: readonly SpacingMode[] = SPACING_MODES.filter((mode) => mode.id !== 'bold')

/** The mode a brand's card padding sits on, or null (set by hand). */
export function matchBrandSpacingMode(spacingRoles: Record<string, string> | undefined): SpacingMode['id'] | null {
  const roles = mergeLayoutRoles('spacing', spacingRoles)
  const inset = spacingRefStep(roles[INSET_SURFACE_ROLE] ?? PADDING_DEFAULT_STEP)
  // Sides set apart from the inset are a hand-set padding, not a mode.
  const raw = spacingRoles ?? {}
  if (Object.keys(raw).some((key) => key.startsWith(`${INSET_SURFACE_ROLE}-`) && raw[key] && raw[key] !== roles[INSET_SURFACE_ROLE])) return null
  return BRAND_SPACING_MODES.find((mode) => mode.insetStep === inset)?.id ?? null
}
