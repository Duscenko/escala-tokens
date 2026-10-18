/**
 * PreviewTokens → the custom properties the recipe sheet reads.
 *
 * A preview card paints one theme in one appearance on one platform, so it
 * sets the variables itself (a product gets the same names from
 * `variables.css`). Values come from the SAME helpers the specimens use
 * (`radiusRoleOf`, `sizeRoleOf`, `typeStyleOf` …), so a Spacing mode, the
 * Platform switch or a System Style move both renderers identically.
 */
import type { CSSProperties } from 'react'
import type { PreviewTokens } from '../components/preview/ButtonPreview'
import { COMPONENT_RECIPES, recipeTokenRefs, splitRef, cssVarOf } from './componentRecipes'
import {
  iconRoleOf, radiusRoleOf, selectorRoleOf, shadowOf, sizeRoleOf, spacingRoleOf, strokeRoleOf, typeStyleOf,
} from './previewTokens'

const REFS: string[] = [
  ...new Set(Object.values(COMPONENT_RECIPES).flatMap(recipeTokenRefs)),
]

function px(v: unknown): string | undefined {
  if (v == null || v === '') return undefined
  return typeof v === 'number' ? `${v}px` : String(v)
}

/** Resolve one non-colour reference against the previewed tokens. */
export function previewDimension(t: PreviewTokens, ref: string): Record<string, string> {
  const [ns, name] = splitRef(ref)
  const one = (value: string | undefined): Record<string, string> =>
    value ? { [cssVarOf(ref)]: value } : {}
  switch (ns) {
    case 'size': return one(sizeRoleOf(t, name, '') || t.sizes?.[name])
    case 'radius': return one(radiusRoleOf(t, name))
    case 'icon': return one(`${iconRoleOf(t, name as 'small' | 'medium' | 'large')}px`)
    case 'selector': return one(selectorRoleOf(t, name, '') || t.selector?.[name])
    case 'spacing': return one(t.spacing?.[name] || spacingRoleOf(t, name, ''))
    case 'stroke': return one(strokeRoleOf(t, name, '1px'))
    case 'shadow': return one(shadowOf(t, name, 'none'))
    case 'type': {
      const s = typeStyleOf(t, name, { leading: true })
      const out: Record<string, string> = {}
      const put = (facet: string, value: unknown) => {
        const p = facet === 'font-weight' || facet === 'font-family' ? (value == null ? undefined : String(value)) : px(value)
        if (p) out[cssVarOf(ref, facet)] = p
      }
      put('font-family', s.fontFamily)
      put('font-size', s.fontSize)
      put('line-height', s.lineHeight)
      put('font-weight', s.fontWeight)
      put('letter-spacing', s.letterSpacing ?? 'normal')
      return out
    }
    default: return {}
  }
}

/**
 * Style object for a preview container. Colours: every Categorical role the
 * previewed mode resolves (`t.archTokens`). Dimensions: only what the recipes
 * reference. `undefined` when the architecture is not projected — the caller
 * keeps the legacy specimen then.
 */
export function recipeVarStyle(t: PreviewTokens): CSSProperties | undefined {
  if (!t.archTokens) return undefined
  const vars: Record<string, string> = {}
  for (const [id, value] of Object.entries(t.archTokens)) vars[cssVarOf(`color.${id}`)] = value
  for (const ref of REFS) {
    if (ref.startsWith('color.')) continue
    Object.assign(vars, previewDimension(t, ref))
  }
  vars['--stroke-focus'] = strokeRoleOf(t, 'focus', '2px')
  // The page's base ink and families, so text a specimen adds around a
  // component (a sentence, a label) reads like the system, not the chrome.
  const body = typeStyleOf(t, 'body-md', { leading: false })
  if (body.fontFamily) vars['--font-family-body'] = String(body.fontFamily)
  const heading = typeStyleOf(t, 'heading-sm', { leading: false })
  if (heading.fontFamily) vars['--font-family-heading'] = String(heading.fontFamily)
  return vars as CSSProperties
}
