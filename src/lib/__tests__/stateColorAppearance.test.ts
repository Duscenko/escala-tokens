import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { applyStateColorForAppearance, stateColorAnchor } from '../colorActions'
import { BASE_TONE } from '../colorUtils'

describe('state color per appearance', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('updates light and dark anchors independently on global state families', () => {
    applyStateColorForAppearance('error', '#b91c1c', 'light')
    applyStateColorForAppearance('error', '#fca5a5', 'dark')

    const s = useDesignStore.getState()
    expect(s.errorColor.toLowerCase()).toBe('#b91c1c')
    expect(s.errorScale[BASE_TONE].toLowerCase()).toBe('#b91c1c')
    expect(s.errorDarkScale[BASE_TONE].toLowerCase()).toBe('#fca5a5')
    expect(stateColorAnchor(s, 'error', 'light')).toBe(s.errorScale[BASE_TONE])
    expect(stateColorAnchor(s, 'error', 'dark')).toBe(s.errorDarkScale[BASE_TONE])
  })
})
