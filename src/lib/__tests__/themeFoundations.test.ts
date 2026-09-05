import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_THEME_SOURCES, makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { buildCSS } from '../exporters'
import { nestedRadiusOf, radiusRoleOf, resolvePreviewTokens } from '../previewTokens'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { generateTokenJSON, setActiveThemeHint } from '../tokenGenerator'

describe('theme foundation overrides', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    setActiveThemeHint(null)
  })

  it('keeps existing themes on the global foundation fallback', () => {
    const state = useDesignStore.getState()
    expect(resolvePreviewTokens(state, 'light').radius).toEqual(state.radius)
    expect(resolvePreviewTokens(state, 'dark').typography.fontFamily).toBe(state.typography.fontFamily)
  })

  it('nestedRadiusOf steps a default alert down to Fields inside a default card', () => {
    const t = resolvePreviewTokens(useDesignStore.getState(), 'light')
    expect(radiusRoleOf(t, 'container')).toBe('16px')
    expect(radiusRoleOf(t, 'action')).toBe('8px')
    expect(nestedRadiusOf(t, 'container')).toBe('8px')
  })

  it('nestedRadiusOf tightens a 2xl alert inside a 2xl card', () => {
    const preset = THEME_STYLE_PRESETS.find((item) => item.id === 'cupertino-glass')!
    const state = useDesignStore.getState()
    state.addTheme('glass', 'light', DEFAULT_THEME_SOURCES)
    useDesignStore.getState().setThemeFoundations('glass', preset.foundations)
    const t = resolvePreviewTokens(useDesignStore.getState(), 'glass')
    expect(radiusRoleOf(t, 'container')).toBe('32px')
    expect(nestedRadiusOf(t, 'container')).toBe('12px')
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
    expect(json.foundationsByTheme['neo-brutalism'].radiusRoles.container).toBe('none')
    expect(json.foundationsByTheme['neo-brutalism'].radiusRoles.action).toBe('none')
    expect(buildCSS(useDesignStore.getState())).toContain('[data-theme="neo-brutalism"]')
    expect(buildCSS(useDesignStore.getState())).toContain('--font-family-body: \'Space Grotesk\', sans-serif;')
  })

  it('exports a Theme Preview radius edit on the theme, not only the root', () => {
    const state = useDesignStore.getState()
    state.addTheme('glass', 'light', DEFAULT_THEME_SOURCES)
    useDesignStore.getState().patchThemeFoundations('glass', {
      radiusRoles: { control: '2xl', action: '2xl', container: '2xl', overlay: '2xl', pill: 'full' },
    })
    const json = generateTokenJSON()
    expect(json.foundationsByTheme.glass.radiusRoles.container).toBe('2xl')
    expect(json.foundationsByTheme.glass.radiusRoles.action).toBe('2xl')
    expect(json.radiusRoles.container).not.toBe('2xl')
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

describe('colors.activeTheme', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    setActiveThemeHint(null)
  })

  it('stamps a shipped theme and follows the preview hint', async () => {
    const { adoptPreset } = await import('../adoptPreset')
    const glass = THEME_STYLE_PRESETS.find((item) => item.id === 'cupertino-glass')!
    const neo = THEME_STYLE_PRESETS.find((item) => item.id === 'neo-brutalism')!
    const adoptedGlass = adoptPreset(glass, 'light')
    const adoptedNeo = adoptPreset(neo, 'dark')
    expect('error' in adoptedGlass).toBe(false)
    expect('error' in adoptedNeo).toBe(false)
    if ('error' in adoptedGlass || 'error' in adoptedNeo) return

    setActiveThemeHint(adoptedGlass.key)
    const first = generateTokenJSON()
    expect(first.colors.activeTheme).toBe(adoptedGlass.key)
    expect(first.colors.themeOrder).toContain(adoptedGlass.key)

    setActiveThemeHint(adoptedNeo.key)
    const second = generateTokenJSON()
    expect(second.colors.activeTheme).toBe(adoptedNeo.key)
    expect(second.colors.activeTheme).not.toBe(first.colors.activeTheme)

    const arch = second.colors.architecture as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    const glassSolid = arch.tokens.action['primary.default'][adoptedGlass.key]
    const neoSolid = arch.tokens.action['primary.default'][adoptedNeo.key]
    expect(glassSolid).toMatch(/^#/)
    expect(neoSolid).toMatch(/^#/)
    expect(glassSolid).not.toBe(neoSolid)
  })
})

describe('My themes sync scope', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    setActiveThemeHint(null)
  })

  it('a scaffolding-only system still ships light/dark', () => {
    const json = generateTokenJSON()
    expect(json.colors.themeOrder).toEqual(['light', 'dark'])
    expect(json.colors.themes).toHaveProperty('light')
    expect(json.colors.themes).toHaveProperty('dark')
  })

  it('after adopt ships only My themes — no leftover light/dark or global accent', async () => {
    const { adoptPreset } = await import('../adoptPreset')
    const glass = THEME_STYLE_PRESETS.find((item) => item.id === 'cupertino-glass')!
    const neo = THEME_STYLE_PRESETS.find((item) => item.id === 'neo-brutalism')!
    const adoptedGlass = adoptPreset(glass, 'light')
    const adoptedNeo = adoptPreset(neo, 'dark')
    expect('error' in adoptedGlass).toBe(false)
    expect('error' in adoptedNeo).toBe(false)
    if ('error' in adoptedGlass || 'error' in adoptedNeo) return

    const json = generateTokenJSON()
    expect(json.colors.themeOrder).toEqual([adoptedGlass.key, adoptedNeo.key])
    expect(json.colors.themeOrder).not.toContain('light')
    expect(json.colors.themeOrder).not.toContain('dark')
    expect(json.colors.themes).not.toHaveProperty('light')
    expect(json.colors.themes).not.toHaveProperty('dark')
    expect(json.gradientsByTheme).not.toHaveProperty('light')
    expect(json.gradientsByTheme).not.toHaveProperty('dark')

    const sources = json.colors.themeSources as Record<string, { brand?: string; error?: string; gray?: string }>
    const labels = json.colors.themeLabels as Record<string, string>
    expect(sources[adoptedGlass.key]?.brand).toBeTruthy()
    expect(sources[adoptedGlass.key]?.brand).not.toBe('accent')
    expect(sources[adoptedNeo.key]?.brand).toBeTruthy()
    expect(sources[adoptedNeo.key]?.brand).not.toBe(sources[adoptedGlass.key]?.brand)
    expect(sources[adoptedGlass.key]?.error).not.toBe(sources[adoptedNeo.key]?.error)
    expect(labels[adoptedGlass.key]).toBeTruthy()
    expect(labels[adoptedNeo.key]).toBeTruthy()

    const prim = Object.keys(json.colors.primitive)
    expect(prim.some((k) => k.startsWith('accent-'))).toBe(false)
    expect(prim.some((k) => k.startsWith('error-'))).toBe(false)
    expect(prim.some((k) => k.startsWith('neutral-'))).toBe(false)
    expect(prim.some((k) => k.startsWith(`${sources[adoptedGlass.key].brand}-`))).toBe(true)
    expect(prim.some((k) => k.startsWith(`${sources[adoptedGlass.key].error}-`))).toBe(true)
    expect(prim.some((k) => k.startsWith(`${sources[adoptedNeo.key].error}-`))).toBe(true)
  })

  it('a Figma sync theme scope ships that theme only', async () => {
    const { adoptPreset } = await import('../adoptPreset')
    const glass = THEME_STYLE_PRESETS.find((item) => item.id === 'cupertino-glass')!
    const neo = THEME_STYLE_PRESETS.find((item) => item.id === 'neo-brutalism')!
    const adoptedGlass = adoptPreset(glass, 'light')
    const adoptedNeo = adoptPreset(neo, 'dark')
    expect('error' in adoptedGlass).toBe(false)
    expect('error' in adoptedNeo).toBe(false)
    if ('error' in adoptedGlass || 'error' in adoptedNeo) return

    const full = generateTokenJSON()
    const sources = full.colors.themeSources as Record<string, { brand?: string }>
    expect(full.colors.themeOrder).toEqual([adoptedGlass.key, adoptedNeo.key])

    const scoped = generateTokenJSON(undefined, { theme: adoptedGlass.key })
    expect(scoped.colors.themeOrder).toEqual([adoptedGlass.key])
    expect(scoped.colors.activeTheme).toBe(adoptedGlass.key)
    expect(scoped.colors.themes).not.toHaveProperty(adoptedNeo.key)
    expect(scoped.colors.themeSources).not.toHaveProperty(adoptedNeo.key)
    expect(scoped.gradientsByTheme).not.toHaveProperty(adoptedNeo.key)

    const prim = Object.keys(scoped.colors.primitive)
    expect(prim.some((k) => k.startsWith(`${sources[adoptedGlass.key].brand}-`))).toBe(true)
    expect(prim.some((k) => k.startsWith(`${sources[adoptedNeo.key].brand}-`))).toBe(false)
  })

  it('drops Dark Brand leftovers minted on scaffolding dark', async () => {
    const { adoptPreset } = await import('../adoptPreset')
    const swiss = THEME_STYLE_PRESETS.find((item) => item.id === 'nature')
      ?? THEME_STYLE_PRESETS.find((item) => item.id === 'cupertino-glass')!
    const adopted = adoptPreset(swiss, 'dark')
    expect('error' in adopted).toBe(false)
    if ('error' in adopted) return

    useDesignStore.setState((s) => ({
      customColors: [
        ...s.customColors,
        {
          key: 'dark-brand',
          label: 'Dark Brand',
          base: '#2970ff',
          scale: { 1: '#fdfdff', 9: '#2970ff', 12: '#1a3366' },
          darkScale: { 1: '#0a1628', 9: '#2970ff', 12: '#d6e4ff' },
        },
        {
          key: 'dark-neutral',
          label: 'Dark Neutral',
          base: '#6b7280',
          scale: { 1: '#fafafa', 9: '#6b7280', 12: '#111827' },
          darkScale: { 1: '#111827', 9: '#6b7280', 12: '#fafafa' },
        },
      ],
      themeSources: {
        ...s.themeSources,
        dark: { brand: 'dark-brand', gray: 'dark-neutral', error: 'error', warning: 'warning', success: 'success', info: 'info' },
      },
    }))

    const json = generateTokenJSON()
    expect(json.colors.themeOrder).toEqual([adopted.key])
    expect(json.colors.themes).not.toHaveProperty('dark')
    expect(Object.keys(json.colors.primitive).some((k) => k.startsWith('dark-brand'))).toBe(false)
    expect(Object.keys(json.colors.primitive).some((k) => k.startsWith('dark-neutral'))).toBe(false)
  })
})

describe('themeHasEdits', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    setActiveThemeHint(null)
  })

  it('is false for a freshly adopted style and true after a foundation edit', async () => {
    const { adoptPreset, themeHasEdits } = await import('../adoptPreset')
    const preset = THEME_STYLE_PRESETS.find((item) => item.id === 'core-minimal')!
    const adopted = adoptPreset(preset, 'dark')
    expect('error' in adopted).toBe(false)
    if ('error' in adopted) return
    expect(themeHasEdits(useDesignStore.getState(), adopted.key)).toBe(false)
    useDesignStore.getState().patchThemeFoundations(adopted.key, { panelBackground: 'page' })
    expect(themeHasEdits(useDesignStore.getState(), adopted.key)).toBe(true)
  })
})

