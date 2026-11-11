// Multi-brand agent context (PLAN-multibrand-foundations F5): a paste for a
// system of several brands says once that token names are the same in every
// brand, lists the shared values once, puts only what differs in By brand, and
// still carries every brand (with its own foundations) in the Escala JSON.

import { beforeAll, describe, expect, it } from 'vitest'
import { buildStudioTokens } from '../pluginStudio'
import { agentContextFromJSON, contextAppearances, contextBrands, narrowToBrand } from '../agentBundle/contextFromJson'
import { figmaPrimitiveName } from '../agentBundle/names'
import { extractEscalaPayload } from '../figmaContext'
import { addBrandFromPayload, readBrandPayload } from '../importBrand'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { resolveThemeFoundations } from '../themeFoundations'
import type { TokenJSON } from '../agentBundle/types'

type Loose = Record<string, any>

/** The plugin's `mergeTheme`, cut to what a fixture needs: the added brand's
 *  columns, ramps, semantic columns and foundations join the base. */
function merge(base: Loose, added: Loose): Loose {
  const out = JSON.parse(JSON.stringify(base))
  const c = out.colors
  const a = added.colors
  Object.assign(c.primitive, a.primitive)
  c.primitiveAlpha = { ...c.primitiveAlpha, ...a.primitiveAlpha }
  for (const m of ['themes', 'themeSources', 'themeLabels', 'themeModes']) if (a[m]) c[m] = { ...c[m], ...a[m] }
  c.themeOrder = [...c.themeOrder, ...a.themeOrder]
  out.foundationsByTheme = { ...out.foundationsByTheme, ...added.foundationsByTheme }
  for (const [g, roles] of Object.entries<Loose>(a.architecture?.tokens ?? {})) {
    for (const [r, byMode] of Object.entries<Loose>(roles)) Object.assign((c.architecture.tokens[g] ??= {})[r] ??= {}, byMode)
  }
  out.brandCss = [...(out.brandCss ?? []), ...(added.brandCss ?? [])]
  return out
}

/** One brand of the studio, with only the appearances asked for. */
function brand(choices: Loose, keep?: 'light' | 'dark'): Loose {
  const res = buildStudioTokens(choices as never, 'pro') as Loose
  if (res.error) throw new Error(res.error)
  const t = res.tokens as Loose
  t.studio = { ...choices }
  if (keep) {
    t.colors.themeOrder = t.colors.themeOrder.filter((k: string) => k.endsWith(`::${keep}`))
    for (const k of Object.keys(t.foundationsByTheme ?? {})) if (!t.colors.themeOrder.includes(k)) delete t.foundationsByTheme[k]
  }
  const slug = t.colors.themeOrder[0].split('::')[0]
  t.studioThemes = { [slug]: t.studio }
  return t
}

let three: TokenJSON
beforeAll(() => {
  const escala = brand({ name: 'Escala', accent: '#3b5bdb', kind: 'light', bodyFont: 'Inter', radiusPreset: 'Rounded' })
  const hola = brand({ name: 'Hola', accent: '#e8590c', kind: 'light', bodyFont: 'Roboto', headingFont: 'Roboto', radiusPreset: 'Sharp', spacingMode: 'compact' }, 'light')
  const otra = brand({ name: 'Otra', accent: '#2b8a3e', kind: 'dark', radiusPreset: 'Pill' }, 'dark')
  let sys = merge(escala, hola)
  sys = merge(sys, otra)
  sys.studioThemes = { ...escala.studioThemes, ...hola.studioThemes, ...otra.studioThemes }
  three = sys as TokenJSON
})

describe('agent context with several brands', () => {
  it('lists the brands with their appearance', () => {
    const brands = contextBrands(three)
    expect(brands.map((b) => [b.label, b.appearance, b.dataBrand])).toEqual([
      ['Escala', 'both', 'escala'],
      ['Hola', 'light', 'hola'],
      ['Otra', 'dark', 'otra'],
    ])
    expect(contextAppearances(three, 'all')).toEqual(['light', 'dark'])
    expect(contextAppearances(three, 'hola')).toEqual(['light'])
  })

  it('all brands: names invariant once, shared values, then By brand', () => {
    const md = agentContextFromJSON(three, { scope: 'all', mode: 'all', detail: 'tokens', brand: 'all' })
    const head = md.slice(0, md.indexOf('## Escala JSON'))
    expect(head.match(/Token names are the same in every brand/g)).toHaveLength(1)
    expect(head).toContain('## Activate a brand')
    expect(head).toContain('data-brand="hola"')
    expect(head).toContain('`Brand` collection')
    expect(head.indexOf('## By brand')).toBeGreaterThan(head.indexOf('## Radius'))
    const byBrand = head.slice(head.indexOf('## By brand'))
    expect(byBrand).toMatch(/\| Appearance \| Light \+ Dark \| Light only \| Dark only \|/)
    expect(byBrand).toMatch(/\| `font-family-body` \| `Inter` \| `Roboto` \| `Inter` \|/)
    expect(byBrand).toMatch(/\| `Radius\/action` \| `12px` \| `0px` \| `32px` \|/)
    // Light / Dark for the brand that ships both, its one value otherwise.
    expect(byBrand).toMatch(/\| `Action\/primary\/default` \| `#[0-9a-f]{6}` \/ `#[0-9a-f]{6}` \| `#[0-9a-f]{6}` \| `#[0-9a-f]{6}` \|/)
    // A shared value is not in By brand, and a differing one not in the shared part.
    expect(byBrand).not.toContain('`Radius/full`')
    const shared = head.slice(head.indexOf('# '), head.indexOf('## By brand'))
    expect(shared).toContain('`Radius/full`')
    expect(shared).not.toMatch(/\| `Radius\/role\/action` \|/)
    // Per-brand state ramps, named the way the plugin writes them.
    expect(shared).toContain('States/Hola/Error')
  })

  it('one brand: its values, flat, with no other brand in it', () => {
    const md = agentContextFromJSON(three, { scope: 'all', mode: 'all', detail: 'tokens', brand: 'hola' })
    expect(md).toContain('**Brand: Hola** (Light only)')
    expect(md).toContain('`font-family-body` = `Roboto`')
    expect(md).not.toContain('## By brand')
    expect(md).not.toContain('Accents/Escala')
    expect(md).not.toMatch(/Hola::light/)
    const json = JSON.parse(extractEscalaPayload(md)) as TokenJSON
    expect(json.colors.themeOrder).toEqual(['hola::light'])
    expect(json.typography.fontFamily).toBe('Roboto')
  })

  it('a column key still picks its brand and appearance', () => {
    const md = agentContextFromJSON(three, { scope: 'color', mode: 'escala::dark', detail: 'tokens' })
    expect(md).toContain('**Brand: Escala**')
    expect(md).toMatch(/\| Figma variable \| Role id \| Dark \|/)
  })

  it('round-trips: the JSON carries every brand and its own foundations', () => {
    const md = agentContextFromJSON(three, { scope: 'all', mode: 'all', detail: 'full', brand: 'all' })
    const read = readBrandPayload(md, 'context')
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const back = read.json as unknown as TokenJSON
    expect(back.colors.themeOrder).toEqual(three.colors.themeOrder)
    expect(back.foundationsByTheme).toEqual(three.foundationsByTheme)
    for (const b of contextBrands(three)) {
      expect(narrowToBrand(back, b.slug).radiusRoles).toEqual(narrowToBrand(three, b.slug).radiusRoles)
    }
    expect(narrowToBrand(back, 'hola').typography.fontFamily).toBe('Roboto')
    expect(narrowToBrand(back, 'otra').radiusRoles?.action).toBe(narrowToBrand(three, 'otra').radiusRoles?.action)
  })

  it('one brand keeps the context it always had', () => {
    const one = brand({ name: 'Solo', accent: '#3b5bdb', kind: 'light' })
    expect(contextBrands(one as TokenJSON)).toEqual([])
    const md = agentContextFromJSON(one as TokenJSON, { scope: 'all', mode: 'all', detail: 'tokens' })
    expect(md).not.toContain('## By brand')
    expect(md).not.toContain('**Brand:')
  })

  it('names a brand-owned state ramp after its brand, like the plugin', () => {
    const ctx = { ...three.colors, studioThemes: three.studioThemes }
    expect(figmaPrimitiveName('escala-error-9', ctx)).toBe('States/Escala/Error/09')
    expect(figmaPrimitiveName('otra-error-dark-9', ctx)).toBe('States/Otra/Error Dark/09')
  })
  it('web Import agent context recreates every brand with its foundations', () => {
    useDesignStore.setState(makeDesignDefaults())
    const before = useDesignStore.getState().themeOrder.length
    const md = agentContextFromJSON(three, { scope: 'all', mode: 'all', detail: 'tokens', brand: 'all' })
    const read = readBrandPayload(md, 'context')
    if (!read.ok) throw new Error(read.error)
    const res = addBrandFromPayload(read.json, read.name)
    if (!('key' in res)) throw new Error(res.error)
    expect(res.error).toBeUndefined()
    expect(res.keys).toHaveLength(3)
    const s = useDesignStore.getState()
    expect(s.themeOrder.length).toBe(before + 3)
    const [escala, hola, otra] = res.keys.map((k) => resolveThemeFoundations(s as never, k))
    expect(hola!.typography.fontFamily).toBe('Roboto')
    expect(escala!.typography.fontFamily).toBe('Inter')
    expect(hola!.radiusRoles).toEqual(narrowToBrand(three, 'hola').radiusRoles)
    expect(otra!.radiusRoles).toEqual(narrowToBrand(three, 'otra').radiusRoles)
    expect(hola!.spacingRoles?.['inset-surface']).toBe(narrowToBrand(three, 'hola').spacingRoles?.['inset-surface'])
    expect(hola!.padding).toEqual((narrowToBrand(three, 'hola') as { padding?: unknown }).padding)
    expect(s.themeKinds[res.keys[2]!]).toBe('dark')
  })
})
