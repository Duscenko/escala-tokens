import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Field } from '../../components/escala-ui/field'
import { Input, INPUT_SIZES, INPUT_TYPES } from '../../components/escala-ui/input'
import { COMPONENT_RECIPES, resolveRecipe } from '../componentRecipes'

const GEOMETRY = {
  sm: { height: 'size.compact', icon: 'icon.small', font: 'type.body-md' },
  default: { height: 'size.control', icon: 'icon.medium', font: 'type.body-md' },
  lg: { height: 'size.touch', icon: 'icon.medium', font: 'type.body-lg' },
} as const

describe('Input: every Type honours the Size (DEC-2026-11-18-004)', () => {
  for (const Type of INPUT_TYPES) for (const Size of INPUT_SIZES) {
    it(`${Type} · ${Size}`, () => {
      const r = resolveRecipe(COMPONENT_RECIPES.Input, { Size, Type, State: 'Default' })
      expect(r.root.height).toBe(GEOMETRY[Size].height)
      expect(r.root.font).toBe(GEOMETRY[Size].font)
      expect(r.icon.width).toBe(GEOMETRY[Size].icon)
      expect(r['icon[data-icon="chevron"]'].width).toBe('icon.small')
    })
  }

  it('Field keeps the control Type when its Size changes', () => {
    for (const type of INPUT_TYPES) {
      const html = renderToStaticMarkup(createElement(Field, { label: 'Label', size: 'lg' }, createElement(Input, { type })))
      expect(html).toContain(`data-type="${type}"`)
      expect(html).toContain('data-escala="Input" data-size="lg"')
    }
  })
})

describe('field glyphs stay subtle in every state but Disabled', () => {
  const ink = (key: 'Input' | 'Combobox' | 'DatePickerTrigger', State: string) => resolveRecipe(COMPONENT_RECIPES[key], { State }).icon.text
  for (const key of ['Input', 'Combobox', 'DatePickerTrigger'] as const) {
    it(key, () => {
      for (const State of ['Default', 'Hover', 'Focused', 'Invalid']) expect(ink(key, State), State).toBe('color.content.subtle')
      expect(ink(key, 'Disabled')).toBe('color.content.disabled')
    })
  }
})
