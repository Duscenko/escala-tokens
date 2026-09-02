import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../tokenGenerator'
import { appearanceOrder, semanticModesFor } from '../themeModes'

describe('theme appearance model', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('puts the preferred appearance first', () => {
    expect(appearanceOrder('dark')).toEqual(['dark', 'light'])
    expect(appearanceOrder('light')).toEqual(['light', 'dark'])
  })

  it('projects a legacy semantic map into its preferred appearance', () => {
    expect(semanticModesFor(undefined, { amber: { 'content-primary': '#111111' } }, 'amber', 'dark')).toEqual({
      light: {},
      dark: { 'content-primary': '#111111' },
    })
  })

  it('exports both appearances for every library theme', () => {
    const json = generateTokenJSON()
    expect(Object.keys(json.colors.themeModes.light)).toEqual(['light', 'dark'])
    expect(Object.keys(json.colors.themeModes.dark)).toEqual(['light', 'dark'])
  })
})
