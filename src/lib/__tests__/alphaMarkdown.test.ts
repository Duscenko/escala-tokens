import { describe, expect, it } from 'vitest'
import { ALPHA_EXPORT_FORMATS, buildAlphaFamilyExport } from '../exportWizard'
import { alphaRampNote, buildSectionExport } from '../sectionExport'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { adoptPreset } from '../adoptPreset'
import { THEME_STYLE_PRESETS } from '../themePresets'

describe('alpha ramps in Markdown', () => {
  it('the alpha column menu offers Markdown', () => {
    expect(ALPHA_EXPORT_FORMATS).toContain('md')
  })

  it('a per-column alpha export carries the note and all twelve steps in order', () => {
    useDesignStore.setState(makeDesignDefaults())
    adoptPreset(THEME_STYLE_PRESETS[0], 'dark', { track: false })
    const scale: Record<number, string> = {}
    for (let i = 1; i <= 12; i++) scale[i] = `#00000${(i % 10)}${i % 10}`.slice(0, 7) + 'aa'
    const [file] = buildAlphaFamilyExport('brand-a-dark', scale, 'md')
    expect(file.language).toBe('md')
    expect(file.content).toMatch(/not an opacity scale/)
    expect(file.content).toMatch(/dark page/)
    const steps = [...file.content.matchAll(/^\| `brand-a-dark-(\d+)` \|/gm)].map((m) => m[1])
    expect(steps).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
  })

  it('the Color section explains each kind of alpha ramp once', () => {
    useDesignStore.setState(makeDesignDefaults())
    adoptPreset(THEME_STYLE_PRESETS[0], 'dark', { track: false })
    const md = buildSectionExport('color', 'md') as string
    expect(md.match(/Alpha twin of/g)?.length).toBe(1)
    expect(md.match(/Fixed opacity ladder/g)?.length).toBe(1)
    // the note sits between the heading and its table
    expect(md).toMatch(/### Neutral-a\n\n> Alpha twin of `neutral`[^\n]*\n\n\| Token/)
  })

  it('solid ramps get no note', () => {
    expect(alphaRampNote('accent')).toBeNull()
    expect(alphaRampNote('accent-dark')).toBeNull()
    expect(alphaRampNote('accent-a')).toMatch(/`accent`/)
    expect(alphaRampNote('accent-a-dark')).toMatch(/`accent-dark`/)
  })
})
