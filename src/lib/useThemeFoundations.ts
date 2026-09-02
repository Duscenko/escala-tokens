import { useDesignStore } from '../store/useDesignStore'
import { resolveThemeFoundations, type ThemeFoundationOverride } from './themeFoundations'

/** Theme-aware foundation editor binding used by the Variables workbench. */
export function useThemeFoundations(themeKey?: string) {
  const store = useDesignStore()
  const key = themeKey && store.themes[themeKey] ? themeKey : (store.themeOrder[0] ?? 'light')
  const foundations = resolveThemeFoundations(store, key)
  const patch = (partial: ThemeFoundationOverride) => store.patchThemeFoundations(key, partial)
  return { store, themeKey: key, foundations, patch }
}

