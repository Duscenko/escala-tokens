import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETUP_STEPS, finishThemeSetup, placeThemeSetup, useThemeSetup } from '../themeSetup'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) },
  }
}

describe('placeThemeSetup', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    useThemeSetup.setState({ drafts: {}, stepStart: {}, unsaved: {} })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('remembers the step the create studio is on', () => {
    placeThemeSetup('escala', SETUP_STEPS.indexOf('icons'))
    expect(useThemeSetup.getState().drafts.escala).toBe(5)
    expect(JSON.parse(localStorage.getItem('sd-theme-setup') ?? '{}')).toEqual({ escala: 5 })
  })

  it('drops the draft when setup finishes, so a refresh does not reopen Colour', () => {
    placeThemeSetup('escala', 5)
    finishThemeSetup('escala')
    expect(useThemeSetup.getState().drafts.escala).toBeUndefined()
    expect(JSON.parse(localStorage.getItem('sd-theme-setup') ?? '{}')).toEqual({})
  })
})
