import { describe, expect, it } from 'vitest'
import { generateTokenJSON } from '../tokenGenerator'
import { freeFigmaScope } from '../freeFigmaScope'
import { adoptPreset } from '../adoptPreset'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { useDesignStore } from '../../store/useDesignStore'

// The free download is narrowed at the source, so the payload itself — not just
// the scope object — must carry one Color Semantics column.
describe('free Figma payload', () => {
  it('ships a single appearance column for one library theme', () => {
    const adopted = adoptPreset(THEME_STYLE_PRESETS[0], 'light', { track: false })
    expect('key' in adopted).toBe(true)
    const s = useDesignStore.getState()
    const scope = freeFigmaScope(undefined, s.themeOrder, s.themes, s.themeKinds, 'dark')
    expect(scope.modes).toHaveLength(1)
    expect(scope.modes?.[0].appearance).toBe('dark')
    const free = generateTokenJSON(undefined, scope)
    const cols = (t: ReturnType<typeof generateTokenJSON>) => Object.keys(((t.colors?.architecture?.tokens ?? {}) as Record<string, Record<string, Record<string, unknown>>>).surface?.page ?? {}).filter((k) => k !== 'description')
    expect(cols(free)).toHaveLength(1)
    expect(cols(free)[0]).toMatch(/::dark$/)
  })
})
