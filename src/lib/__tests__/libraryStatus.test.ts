import { describe, expect, it } from 'vitest'
import { savedBrandKeysFrom } from '../libraryStatus'

const empty = {
  themeOrder: ['light', 'dark'],
  themes: { light: {}, dark: {} },
  savedSystems: [] as { id: string; snapshot: { themeOrder?: string[] } }[],
  githubRepo: null,
  projectName: 'Escala',
}

describe('savedBrandKeysFrom', () => {
  it('ignores light/dark scaffolding', () => {
    expect(savedBrandKeysFrom(empty, {})).toEqual([])
  })

  it('treats a studio mint as unset until it is saved', () => {
    expect(savedBrandKeysFrom({
      ...empty,
      themeOrder: ['light', 'dark', 'brand'],
      themes: { light: {}, dark: {}, brand: {} },
    }, { brand: true })).toEqual([])
  })

  it('counts a brand that already lives in the saved library', () => {
    expect(savedBrandKeysFrom({
      ...empty,
      projectName: 'Escala-DS',
      themeOrder: ['light', 'dark', 'brand'],
      themes: { light: {}, dark: {}, brand: {} },
      savedSystems: [{ id: 'local:escala-ds', snapshot: { themeOrder: ['light', 'dark', 'brand'] } }],
    }, {})).toEqual(['brand'])
  })
})
