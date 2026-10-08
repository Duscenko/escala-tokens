// One Free cut for every file a download can hand over. The Figma JSON, the
// CSS, the README and the Tailwind config all come from the same scope, so
// they cannot disagree about how many themes, appearances or viewports ship.

import { useDesignStore } from '../store/useDesignStore'
import { buildCSS, buildMarkdown } from './exporters'
import { freeDownloadStore, freeFigmaScope, type FigmaScope } from './freeFigmaScope'
import { buildSectionExport } from './sectionExport'
import { generateTokenJSON } from './tokenGenerator'
import type { ThemeAppearance } from './themeModes'

type Store = ReturnType<typeof useDesignStore.getState>

export interface ShippedBundle {
  tokens: string
  css: string
  markdown: string
  tailwind: string
}

/** `snapshot` is a Get-code store already narrowed to one library theme.
 *  Omit it and the live store is what ships — Pro, the whole system. */
export function shippedBundle(store: Store, scope?: FigmaScope, snapshot = false): ShippedBundle {
  if (!scope) {
    return {
      tokens: JSON.stringify(generateTokenJSON(snapshot ? store : undefined), null, 2),
      css: buildCSS(store),
      markdown: buildMarkdown(store),
      tailwind: buildSectionExport('all', 'tailwind', 'hex', {}, store),
    }
  }
  const narrowed = freeDownloadStore(store, scope) as Store
  const appearance = scope.modes?.[0]?.appearance
  return {
    tokens: JSON.stringify(generateTokenJSON(narrowed, {
      themes: scope.themes,
      modes: scope.modes,
      viewports: scope.viewports,
      gridStyles: scope.gridStyles,
    }), null, 2),
    css: buildCSS(narrowed, { desktopOnly: true }),
    markdown: buildMarkdown(narrowed, { desktopOnly: true, appearance }),
    tailwind: buildSectionExport('all', 'tailwind', 'hex', {
      desktopOnly: true,
      modes: scope.themes ?? undefined,
    }, narrowed),
  }
}

export function freeScopeFor(
  store: Store,
  preferred: string | undefined,
  appearance?: ThemeAppearance,
): FigmaScope {
  return freeFigmaScope(preferred, store.themeOrder, store.themes, store.themeKinds, appearance)
}
