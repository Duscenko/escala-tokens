import { describe, expect, it } from 'vitest'
import { RECIPE_CSS, recipeCssVars } from '../recipeStyles'

describe('browser autofill', () => {
  it('keeps the field’s own fill and ink, on roles only', () => {
    for (const pseudo of ['-webkit-autofill', 'autofill']) {
      const rule = RECIPE_CSS.match(new RegExp(`\\[data-escala\\] :is\\(input, textarea\\):${pseudo} \\{[^}]*\\}`))?.[0]
      expect(rule, pseudo).toBeTruthy()
      expect(rule).toContain('var(--color-surface-input)')
      expect(rule).toContain('-webkit-text-fill-color: var(--color-content-primary)')
      expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b|\d+(px|s)\b/i)
    }
    expect(recipeCssVars()).toContain('--color-surface-input')
  })
})
