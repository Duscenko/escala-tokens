import { useMemo } from 'react'
import { useDesignStore } from '../store/useDesignStore'
import { dimensionScaleForStore, dimensionUsage } from './dimensions'
import { resolveThemeFoundations } from './themeFoundations'

/**
 * The Dimension primitives the editor offers, and who uses each one.
 *
 * The scale is built over EVERY theme the system ships (same call tokens.json
 * makes), so a value only one theme uses is still pickable everywhere. Usage is
 * the PREVIEWED theme's — "which of my tokens point here" is a question about
 * the system on screen.
 */
export function useDimensions(previewTheme?: string) {
  const store = useDesignStore()
  return useMemo(() => {
    const scale = dimensionScaleForStore(store, store.themeOrder)
    const usage = dimensionUsage(previewTheme ? resolveThemeFoundations(store, previewTheme) : store)
    return { scale, usage }
  }, [store, previewTheme])
}
