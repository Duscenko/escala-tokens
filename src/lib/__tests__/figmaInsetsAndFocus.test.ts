import { describe, expect, it } from 'vitest'
import { COMPONENT_RECIPES, resolveRecipe } from '../componentRecipes'
import { defaultLayoutRoles, spacingRolesAtViewport } from '../layoutTokens'
import { SOCIAL_BRANDS, socialCssVars } from '../socialBrands'

/** DEC-2026-11-18-007: the values of the Figma file. */
describe('spacing insets', () => {
  const at = (role: string) => (['desktop', 'tablet', 'mobile'] as const).map((vp) => spacingRolesAtViewport(defaultLayoutRoles('spacing'), vp)[role])
  it('inset-surface is 24 · 20 · 16 and inset-action 16 · 16 · 12', () => {
    expect(at('inset-surface')).toEqual(['6', '5', '4'])
    expect(at('inset-action')).toEqual(['4', '4', '3'])
  })
})

describe('Button padding', () => {
  const pad = (Appearance: string, Size: string) => resolveRecipe(COMPONENT_RECIPES.Button, { Appearance, Size, Variant: 'default', State: 'Default' }).root.paddingX
  it('default and lg read inset-action; xs, sm and link read inset-control', () => {
    for (const a of ['solid', 'outline', 'ghost']) {
      for (const s of ['default', 'lg']) expect(pad(a, s), `${a} ${s}`).toBe('spacing.inset-action')
      for (const s of ['xs', 'sm']) expect(pad(a, s), `${a} ${s}`).toBe('spacing.inset-control')
    }
    for (const s of ['xs', 'sm', 'default', 'lg']) expect(pad('link', s), s).toBe('spacing.inset-control')
  })
})

describe('SocialLoginButton focus', () => {
  it('draws the ring of its brand, outside the edge', () => {
    for (const Appearance of ['white', 'brand']) {
      const root = resolveRecipe(COMPONENT_RECIPES.SocialLoginButton, { Brand: 'Google', Appearance, Size: 'default', State: 'Focused', IconOnly: 'false' }).root
      expect(root.gapRing, Appearance).toBe('social.google.border.focus')
    }
  })
  it('ships the values of the file', () => {
    const vars = socialCssVars()
    expect(vars).toContain('--social-google-border-focus: #db44374f;')
    for (const id of ['apple', 'github', 'x']) expect(vars).toContain(`--social-${id}-border-focus: var(--color-border-ring-neutral);`)
    expect(Object.keys(SOCIAL_BRANDS)).toHaveLength(9)
  })
})
