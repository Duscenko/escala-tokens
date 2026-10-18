/**
 * The theme scope every shadcn-skeleton specimen renders inside.
 *
 * The stylesheet is generated from `lib/componentRecipes` and holds no values —
 * every declaration is `var(--…)` named as `variables.css` names it. This scope
 * supplies the values for the ONE theme / appearance / platform on screen, from
 * the same `PreviewTokens` the rest of the preview reads, so a card can paint a
 * different theme from the page it sits on.
 */
import type { ReactNode } from 'react'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { recipeVarStyle } from '../../../../lib/recipeVars'
import { RECIPE_CSS } from '../../../../lib/recipeStyles'

// Injected at module load, before the first render: mounted from an effect, the
// first specimens painted unstyled and then transitioned into their colours.
if (typeof document !== 'undefined' && !document.getElementById('escala-component-recipes')) {
  const el = document.createElement('style')
  el.id = 'escala-component-recipes'
  el.textContent = RECIPE_CSS
  document.head.appendChild(el)
}

/** `display: contents` — a box-less wrapper, so it cannot disturb the layout. */
export function RecipeScope({ t, children }: { t: PreviewTokens; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'contents',
        // Inherited through `display: contents`: copy added around a component
        // reads in the system's ink and face.
        color: 'var(--color-content-primary)',
        fontFamily: 'var(--font-family-body)',
        ...recipeVarStyle(t),
      }}
    >
      {children}
    </div>
  )
}

export const lower = (s: string | undefined, fallback: string) => (s ?? fallback).toLowerCase()
