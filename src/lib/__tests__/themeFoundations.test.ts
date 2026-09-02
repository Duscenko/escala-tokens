import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { buildCSS } from '../exporters'
import { resolvePreviewTokens } from '../previewTokens'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { generateTokenJSON } from '../tokenGenerator'

describe('theme foundation overrides', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
  })

  it('keeps existing themes on the global foundation fallback', () => {
    const state = useDesignStore.getState()
    expect(resolvePreviewTokens(state, 'light').radius).toEqual(state.radius)
    expect(resolvePreviewTokens(state, 'dark').typography.fontFamily).toBe(state.typography.fontFamily)
  })

  it('resolves and exports a preset through the same theme key', () => {
    const preset = THEME_STYLE_PRESETS.find((item) => item.id === 'neo-brutalism')!
    const state = useDesignStore.getState()
    state.addTheme('neo-brutalism', 'light', DEFAULT_THEME_SOURCES)
    useDesignStore.getState().setThemeFoundations('neo-brutalism', preset.foundations)

    const preview = resolvePreviewTokens(useDesignStore.getState(), 'neo-brutalism')
    expect(preview.typography.fontFamily).toBe('Space Grotesk')
    expect(preview.radius.md).toBe(preset.foundations.radius?.md)
    expect(preview.stroke?.sm).toBe('2px')

    const json = generateTokenJSON()
    expect(json.foundationsByTheme['neo-brutalism'].typography.fontFamily).toBe('Space Grotesk')
    expect(json.foundationsByTheme['neo-brutalism'].stroke.sm).toBe('2px')
    expect(buildCSS(useDesignStore.getState())).toContain('[data-theme="neo-brutalism"]')
    expect(buildCSS(useDesignStore.getState())).toContain('--font-family-body: \'Space Grotesk\', sans-serif;')
  })

  it('moves and removes foundation overrides with their theme', () => {
    const state = useDesignStore.getState()
    state.addTheme('nature', 'dark', DEFAULT_THEME_SOURCES)
    state.setThemeFoundations('nature', { panelBackground: 'translucent' })
    state.renameTheme('nature', 'organic')
    expect(useDesignStore.getState().themeFoundations.organic?.panelBackground).toBe('translucent')
    useDesignStore.getState().removeTheme('organic')
    expect(useDesignStore.getState().themeFoundations.organic).toBeUndefined()
  })
})

