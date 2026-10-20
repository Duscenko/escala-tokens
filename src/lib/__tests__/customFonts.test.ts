import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { ensureColorScales } from '../colorActions'
import { buildCSS } from '../exporters'
import { generateTokenJSON } from '../tokenGenerator'
import { fontStack } from '../fontStack'
import {
  checkFontStylesheetUrl, cleanFontSources, familiesInGoogleUrl, familiesInStylesheet, fontImportLines,
  MAX_FONT_SOURCES, normalizeFamilyName, upsertFontSource, type FontSource,
} from '../customFonts'

describe('custom fonts — rules', () => {
  it('accepts only https stylesheets on an allowed provider', () => {
    expect(checkFontStylesheetUrl('https://use.typekit.net/abc1234.css')).toMatchObject({ ok: true, provider: 'Adobe Fonts' })
    expect(checkFontStylesheetUrl('https://api.fontshare.com/v2/css?f[]=satoshi@400&display=swap')).toMatchObject({ ok: true })
    expect(checkFontStylesheetUrl('http://use.typekit.net/abc.css')).toEqual({ ok: false, reason: 'https' })
    expect(checkFontStylesheetUrl('https://evil.example.com/x.css')).toEqual({ ok: false, reason: 'host' })
    expect(checkFontStylesheetUrl('https://use.typekit.net.evil.com/x.css')).toEqual({ ok: false, reason: 'host' })
    expect(checkFontStylesheetUrl('https://u:p@use.typekit.net/x.css')).toEqual({ ok: false, reason: 'credentials' })
    expect(checkFontStylesheetUrl('javascript:alert(1)')).toMatchObject({ ok: false })
    expect(checkFontStylesheetUrl('not a url')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('keeps family names safe to write into CSS', () => {
    expect(normalizeFamilyName('  Space   Grotesk ')).toBe('Space Grotesk')
    expect(normalizeFamilyName("Inter'; } body { color: red")).toBeNull()
    expect(normalizeFamilyName('')).toBeNull()
  })

  it('reads the families a stylesheet or a Google URL declares', () => {
    const css = `@font-face { font-family: "Satoshi"; src: url(a.woff2) } @font-face { font-family: 'Satoshi'; font-weight: 700 } @font-face { font-family: Gambetta; }`
    expect(familiesInStylesheet(css)).toEqual(['Satoshi', 'Gambetta'])
    expect(familiesInGoogleUrl('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter&display=swap')).toEqual(['Space Grotesk', 'Inter'])
  })

  it('upserts by family, caps the list and drops bad stored entries', () => {
    let list: FontSource[] = []
    for (let i = 0; i < MAX_FONT_SOURCES + 3; i++) list = upsertFontSource(list, { family: `Font ${i}`, kind: 'google', category: 'Serif' })
    expect(list).toHaveLength(MAX_FONT_SOURCES)
    list = upsertFontSource(list, { family: 'font 14', kind: 'google', category: 'Mono' })
    expect(list.filter((f) => f.family.toLowerCase() === 'font 14')).toHaveLength(1)
    expect(cleanFontSources([
      { family: 'Ok', kind: 'css', url: 'https://fonts.bunny.net/css?family=ok', category: 'Serif' },
      { family: 'Bad', kind: 'css', url: 'https://evil.com/x.css', category: 'Serif' },
      { family: 'x;y', kind: 'google', category: 'Serif' },
      null,
    ])).toEqual([{ family: 'Ok', kind: 'css', url: 'https://fonts.bunny.net/css?family=ok', category: 'Serif' }])
    expect(cleanFontSources(undefined)).toEqual([])
  })

  it('an added family carries its own generic fallback', () => {
    expect(fontStack('Gambetta')).toBe(`'Gambetta', sans-serif`)
    expect(fontStack('Gambetta', 'Serif')).toBe(`'Gambetta', serif`)
    expect(fontStack('Inter', 'Serif')).toBe(`'Inter', sans-serif`)
  })

  it('imports only the added families a file uses, once each', () => {
    const sources: FontSource[] = [
      { family: 'Satoshi', kind: 'css', url: 'https://api.fontshare.com/v2/css?f[]=satoshi@400', category: 'Sans-serif' },
      { family: 'Gambetta', kind: 'google', category: 'Serif' },
      { family: 'Space Grotesk', kind: 'google', category: 'Sans-serif', spec: 'wght@400;500;600;700' },
    ]
    expect(fontImportLines(sources, ['Satoshi', 'Inter', 'Satoshi', 'Gambetta', 'Space Grotesk'])).toEqual([
      '@import url("https://api.fontshare.com/v2/css?f[]=satoshi@400");',
      // A static family is imported without a weight list Google would refuse.
      '@import url("https://fonts.googleapis.com/css2?family=Gambetta&display=swap");',
      '@import url("https://fonts.googleapis.com/css2?family=Space%20Grotesk:wght@400;500;600;700&display=swap");',
    ])
    expect(cleanFontSources([{ family: 'X', kind: 'google', category: 'Serif', spec: 'wght@400);x' }])).toEqual([{ family: 'X', kind: 'google', category: 'Serif' }])
  })
})

describe('custom fonts — export', () => {
  beforeEach(() => {
    useDesignStore.setState({ ...makeDesignDefaults() })
    ensureColorScales()
  })

  it('a system with no added fonts exports exactly as before', () => {
    const css = buildCSS(useDesignStore.getState())
    expect(css.startsWith(':root {')).toBe(true)
    expect(css).not.toContain('@import')
    expect((generateTokenJSON() as any).typography.sources).toBeUndefined()
  })

  it('an added family in use ships an @import, its fallback and its source', () => {
    const s = useDesignStore.getState()
    s.addFontSource({ family: 'Satoshi', kind: 'css', url: 'https://api.fontshare.com/v2/css?f[]=satoshi@400', category: 'Serif' })
    s.setTypography({ ...useDesignStore.getState().typography, fontFamily: 'Satoshi' })
    const css = buildCSS(useDesignStore.getState())
    expect(css.split('\n')[0]).toBe('@import url("https://api.fontshare.com/v2/css?f[]=satoshi@400");')
    expect(css).toContain(`--font-family-body: 'Satoshi', serif;`)
    expect((generateTokenJSON() as any).typography.sources).toEqual([
      expect.objectContaining({ family: 'Satoshi', kind: 'css', href: 'https://api.fontshare.com/v2/css?f[]=satoshi@400' }),
    ])
  })
})
