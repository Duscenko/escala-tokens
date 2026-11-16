import { buildStudioTokens } from '../../../src/lib/pluginStudio'
import { FIGMA_FILE_PALETTE, applyFigmaFilePalette } from '../../../src/lib/figmaFilePalette'
import { useDesignStore } from '../../../src/store/useDesignStore'
import { themeBrandRamp } from '../../../src/lib/themeSources'

// The system the Figma file `Escala Design System (Real)` holds: a brand minted
// from the file's accent (the plugin's own build), then carrying the file's
// CURATED ramps and alpha twins (owner, 2026-11-12: Figma wins over the
// generator). Every Color Semantics role then resolves to the file's hex in
// both modes — figmaFilePalette.test.ts holds all 166.
// One module, so the stories (preview.tsx) and the docs pages (../docs) paint
// with the same store, built once.
const built = buildStudioTokens({ accent: FIGMA_FILE_PALETTE.accent, name: 'Escala' }, 'pro')
if ('error' in built) throw new Error(`Storybook: could not build the Figma file's system — ${built.error}`)
const { themeOrder, themeSources } = useDesignStore.getState()
/** The brand the stories paint with: the one the studio just minted. */
export const BRAND = themeOrder.find((k) => themeSources?.[k]) ?? themeOrder[0]
applyFigmaFilePalette(BRAND)

/** The Figma file every component and token page documents. */
export const FIGMA_FILE = { key: '7j5zukN5HpihGVJMmyjA20', name: 'Escala Design System (Real)' } as const
export const figmaNodeUrl = (nodeId?: string) =>
  `https://www.figma.com/design/${FIGMA_FILE.key}/Escala-Design-System--Real-${nodeId ? `?node-id=${nodeId.replace(':', '-')}&m=dev` : ''}`

/** The brand's accent ramp (tone 1 → 12) in one appearance — the family the brand reads, not the system root's. */
export function brandRamp(kind: 'light' | 'dark') {
  const s = useDesignStore.getState()
  return themeBrandRamp(BRAND, s.themeSources ?? {}, s.themeKinds ?? {}, s, kind) ?? (kind === 'dark' ? s.primaryDarkScale : s.primaryScale)
}
