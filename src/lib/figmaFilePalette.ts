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
