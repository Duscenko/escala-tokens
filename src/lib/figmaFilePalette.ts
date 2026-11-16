/**
 * The Figma file's curated palette, applied to a brand.
 *
 * Owner's call (2026-11-12): `Escala Design System (Real)` is curated and
 * tested, so its colours win over the generator. No generator rule reproduces
 * them (most steps differ for the same accent), so the brand that file shows
 * carries the file's ramps AND alpha twins as data
 * (`figmaFilePalette.generated.ts`, written by `npm run gen:figma-palette`).
 * Every semantic role keeps its own recipe; it now reads these steps.
 */
import { useDesignStore, type ThemeSources } from '../store/useDesignStore'
import { FIGMA_FILE_PALETTE, type FigmaPaletteSlot } from './figmaFilePalette.generated'
import { BLACK_ALPHA_SCALE, WHITE_ALPHA_SCALE } from './colorUtils'
import { categoricalRoleCatalogue } from './semanticArchitectures'
import { SHADOW_RECIPES, type ElevationRole } from './elevationTokens'
import { SHADOW_STEPS } from './shadowTokens'

export { FIGMA_FILE_PALETTE }

/** Escala's theme slot → the palette's family. */
const SLOT_OF: Partial<Record<keyof ThemeSources, FigmaPaletteSlot>> = {
  brand: 'accent', gray: 'gray', error: 'error', warning: 'warning', success: 'success', info: 'info',
}

/**
 * Writes the file's ramps and alpha twins onto the families `brandKey` reads.
 * Returns the family keys it pinned. Only families private to the brand are
 * touched: a slot that reads a GLOBAL family (accent, neutral…) is left alone,
 * since other brands read it too.
 */
export function applyFigmaFilePalette(brandKey: string): string[] {
  const s = useDesignStore.getState()
  const sources = s.themeSources?.[brandKey]
  if (!sources) return []
  const pinned: string[] = []
  for (const [slot, paletteSlot] of Object.entries(SLOT_OF) as [keyof ThemeSources, FigmaPaletteSlot][]) {
    const key = sources[slot]
    if (typeof key !== 'string' || !s.customColors.some((c) => c.key === key)) continue
    const f = FIGMA_FILE_PALETTE.families[paletteSlot]
    s.updateCustomColor(key, {
      base: f.light[9],
      darkBase: f.dark[9],
      scale: { ...f.light },
      darkScale: { ...f.dark },
      alpha: { ...f.alpha },
      darkAlpha: { ...f.darkAlpha },
    })
    pinned.push(key)
  }
  return pinned
}

/** The colour of an Elevation role in one appearance, from the role table's own alpha-ladder ref (`{black-a.2}`). */
function elevationColour(role: ElevationRole, appearance: 'light' | 'dark'): string {
  const key = role === 'ring' ? 'shadow-ring' : `shadow-${role}`
  const ref = categoricalRoleCatalogue().find((r) => r.group === 'elevation' && r.key === key)?.[appearance]
  const m = /^\{(black|white)-a\.(\d+)\}$/.exec(ref ?? '')
  if (!m) throw new Error(`Elevation role ${key} (${appearance}) is not on the alpha ladder: ${ref}`)
  return (m[1] === 'black' ? BLACK_ALPHA_SCALE : WHITE_ALPHA_SCALE)[Number(m[2])]
}

const px = (n: number) => (n === 0 ? '0' : `${n}px`)

/** The `--shadow-*` ramp of one appearance, as the file's `Shadow/*` effect styles draw it: ring + key/ambient drop shadows whose colours are the Elevation roles. */
export function figmaFileShadows(appearance: 'light' | 'dark'): Record<string, string> {
  const out: Record<string, string> = {}
  for (const step of SHADOW_STEPS) {
    out[step] = SHADOW_RECIPES[step].map((l) => `${px(l.x)} ${px(l.y)} ${px(l.blur)} ${px(l.spread)} ${elevationColour(l.role, appearance)}`).join(', ')
  }
  return out
}

/**
 * Owner's call (2026-11-16, DEC-2026-11-16-006): the file's shadows win too. The default ramp keeps its own near-black
 * `rgba(10,13,18,…)` colours and derives a dark twin; the file draws ring · key · ambient on the Elevation roles
 * (Light key 10 % · ambient 5 %, Dark key 40 % · ambient 20 %). Pinned on the brand as its own Light and Dark ramp.
 * Storybook only, like the palette: the web's default ramp is not touched without asking.
 */
export function applyFigmaFileShadows(brandKey: string): void {
  const s = useDesignStore.getState()
  if (!s.themes[brandKey]) return
  const current = s.themeFoundations?.[brandKey] ?? {}
  s.setThemeFoundations(brandKey, { ...current, shadows: figmaFileShadows('light'), shadowsDark: figmaFileShadows('dark') })
}
