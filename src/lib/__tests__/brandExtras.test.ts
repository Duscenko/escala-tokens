import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { addBrandExtra, removeBrandExtra } from '../colorActions'
import { brandRankLabel, familyDisplayLabel, nextBrandExtraRank, primitiveDisplayLabel } from '../themeSources'

describe('brand extras (secondary / tertiary palettes)', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('mints Secondary then Tertiary as primitives, without moving the brand slot', () => {
    const themesBefore = JSON.stringify(useDesignStore.getState().themes)
    const first = addBrandExtra('light', '#4f46e5')
    expect(first).toEqual({ key: 'secondary', rank: 'secondary' })

    let s = useDesignStore.getState()
    expect(s.themeSources.light.brand).toBe('accent')
    expect(s.themeSources.light.secondary).toBe('secondary')
    expect(s.customColors.find((c) => c.key === 'secondary')?.label).toBe('Secondary')
    expect(s.customColors.find((c) => c.key === 'secondary')?.base.toLowerCase()).toBe('#4f46e5')
    expect(s.customColors.find((c) => c.key === 'secondary')?.scale[9].toLowerCase()).toBe('#4f46e5')
    expect(nextBrandExtraRank(s.themeSources.light)).toBe('tertiary')

    const second = addBrandExtra('light', '#d348e5')
    expect(second).toEqual({ key: 'tertiary', rank: 'tertiary' })

    s = useDesignStore.getState()
    expect(s.themeSources.light.brand).toBe('accent')
    expect(s.themeSources.light.tertiary).toBe('tertiary')
    expect(JSON.stringify(s.themes)).toBe(themesBefore)
    expect(nextBrandExtraRank(s.themeSources.light)).toBeNull()
    expect(addBrandExtra('light', '#111111')).toBeNull()
  })

  it('promotes Tertiary to Secondary when Secondary is removed', () => {
    addBrandExtra('light', '#4f46e5')
    addBrandExtra('light', '#d348e5')
    removeBrandExtra('light', 'secondary')

    const s = useDesignStore.getState()
    expect(s.themeSources.light.secondary).toBe('tertiary')
    expect(s.themeSources.light.tertiary).toBeUndefined()
    expect(s.customColors.some((c) => c.key === 'secondary')).toBe(false)
    expect(s.customColors.find((c) => c.key === 'tertiary')?.label).toBe('Secondary')
    expect(nextBrandExtraRank(s.themeSources.light)).toBe('tertiary')
  })

  it('drops Tertiary without touching Secondary', () => {
    addBrandExtra('light', '#4f46e5')
    addBrandExtra('light', '#d348e5')
    removeBrandExtra('light', 'tertiary')

    const s = useDesignStore.getState()
    expect(s.themeSources.light.secondary).toBe('secondary')
    expect(s.themeSources.light.tertiary).toBeUndefined()
    expect(s.customColors.some((c) => c.key === 'tertiary')).toBe(false)
  })

  it('names Accents ranks Primary / Secondary, never the theme family label', () => {
    const empty = {}
    expect(brandRankLabel('accent', empty)).toBe('Primary')
    expect(brandRankLabel('accent', empty, true)).toBe('Primary-Alpha')

    addBrandExtra('light', '#4f46e5')
    const sources = useDesignStore.getState().themeSources
    expect(brandRankLabel('accent', sources)).toBe('Primary')
    expect(brandRankLabel('secondary', sources)).toBe('Secondary')
    expect(brandRankLabel('secondary', sources, true)).toBe('Secondary-Alpha')
    expect(brandRankLabel('core-copy-brand', sources)).toBeNull()
  })

  it('names slot families Error / Neutral without the theme prefix', () => {
    const sources = {
      'core-copy': {
        brand: 'core-copy-brand',
        gray: 'core-copy-gray',
        error: 'core-copy-error',
        warning: 'core-copy-warning',
        success: 'core-copy-success',
        info: 'core-copy-info',
      },
      glass: {
        brand: 'glass-brand',
        gray: 'glass-gray',
        error: 'glass-error',
        warning: 'warning',
        success: 'success',
        info: 'info',
      },
    }
    const labels = { 'core-copy': 'Core Copy', glass: 'Glass' }

    expect(familyDisplayLabel('core-copy-error', sources)).toBe('Error')
    expect(familyDisplayLabel('core-copy-error', sources, true)).toBe('Error-Alpha')
    expect(familyDisplayLabel('core-copy-warning', sources)).toBe('Warning')
    expect(familyDisplayLabel('core-copy-gray', sources)).toBe('Neutral')
    expect(familyDisplayLabel('core-copy-neutral', {
      'core-copy': { ...sources['core-copy'], gray: 'core-copy-neutral' },
    })).toBe('Neutral')
    expect(familyDisplayLabel('core-copy-neutral', {
      'core-copy': { ...sources['core-copy'], gray: 'core-copy-neutral' },
    }, true)).toBe('Neutral-Alpha')
    expect(familyDisplayLabel('core-copy-brand', sources)).toBe('Primary')

    const oneTheme = ['core-copy-error']
    expect(primitiveDisplayLabel('core-copy-error', sources, labels, oneTheme)).toBe('Error')

    const twoErrors = ['core-copy-error', 'glass-error']
    expect(primitiveDisplayLabel('core-copy-error', sources, labels, twoErrors)).toBe('Error · Core Copy')
    expect(primitiveDisplayLabel('glass-error', sources, labels, twoErrors)).toBe('Error · Glass')
  })
})
