import { createContext, useContext } from 'react'

/**
 * Where a floating layer (a Select's list, a Popover, a Tooltip) portals to.
 *
 * Radix portals to `<body>` by default. In a product that is right: it imports
 * `variables.css` at `:root`. In Escala's own previews the theme's variables
 * live on a scope element, so a layer portaled to `<body>` would paint with the
 * page's theme (or none). `RecipeScope` provides its element here; a layer
 * portals INTO it and inherits the previewed theme. `null` = Radix's default.
 */
export const PortalScopeContext = createContext<HTMLElement | null>(null)

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalScopeContext) ?? undefined
}
