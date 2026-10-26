/**
 * The theme scope every shadcn-skeleton specimen renders inside.
 *
 * The stylesheet is generated from `lib/componentRecipes` and holds no values —
 * every declaration is `var(--…)` named as `variables.css` names it. This scope
 * supplies the values for the ONE theme / appearance / platform on screen, from
 * the same `PreviewTokens` the rest of the preview reads, so a card can paint a
 * different theme from the page it sits on.
 */
import { useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import { PortalScopeContext } from '../../../escala-ui/portal-scope'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { recipeVarStyle } from '../../../../lib/recipeVars'
import { RECIPE_CSS } from '../../../../lib/recipeStyles'

// Injected at module load, before the first render: mounted from an effect, the
// first specimens painted unstyled and then transitioned into their colours.
// The text is rewritten when the element already exists: under HMR a recipe
// edit re-runs this module, and a guard on the id kept the OLD sheet painting.
if (typeof document !== 'undefined') {
  let el = document.getElementById('escala-component-recipes')
  if (!el) {
    el = document.createElement('style')
    el.id = 'escala-component-recipes'
    document.head.appendChild(el)
  }
  if (el.textContent !== RECIPE_CSS) el.textContent = RECIPE_CSS
}

/** `display: contents` — a box-less wrapper, so it cannot disturb the layout. */
export function RecipeScope({ t, children }: { t: PreviewTokens; children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const reducedMotion = useReducedMotion() ?? false
  return (
    <PortalScopeContext.Provider value={el}>
    <div
      ref={setEl}
      style={{
        display: 'contents',
        // Inherited through `display: contents`: copy added around a component
        // reads in the system's ink and face.
        color: 'var(--color-content-primary)',
        fontFamily: 'var(--font-family-body)',
        ...recipeVarStyle(t, { reducedMotion }),
      }}
    >
      {children}
    </div>
    </PortalScopeContext.Provider>
  )
}

export const lower = (s: string | undefined, fallback: string) => (s ?? fallback).toLowerCase()
