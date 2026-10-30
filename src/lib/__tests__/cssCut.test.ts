import { describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import { buildCSS } from '../exporters'
import { CONTEXT_FOUNDATIONS } from '../contextRequest'
import { brandSlug, combineBrandCss, cssCollectionOf, cutCssCollection } from '../cssCut'

const full = buildCSS(useDesignStore.getState())
const declared = (css: string) => new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))
const referenced = (css: string) => new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))
const braces = (css: string) => (css.match(/{/g) ?? []).length - (css.match(/}/g) ?? []).length

describe('cutCssCollection', () => {
  it('returns the file unchanged for all foundations', () => {
    expect(cutCssCollection(full, 'all')).toBe(full)
  })

  it('every variable in the full file belongs to a collection', () => {
    const orphans = [...declared(full)].filter((name) => !cssCollectionOf(name))
    expect(orphans).toEqual([])
  })

  for (const { key } of CONTEXT_FOUNDATIONS) {
    it(`${key}: keeps its own lines verbatim and every alias resolves`, () => {
      const cut = cutCssCollection(full, key)
      expect(braces(cut)).toBe(0)
      const names = declared(cut)
      // A collection the default system ships is never cut to nothing.
      expect([...names].some((name) => cssCollectionOf(name) === key)).toBe(true)
      // Every var() the cut file uses is declared in it — unless the full file
      // doesn't declare it either (a runtime variable a component sets).
      const fullNames = declared(full)
      for (const ref of referenced(cut)) {
        if (fullNames.has(ref)) expect(names.has(ref), `${key} lost ${ref}`).toBe(true)
      }
      // Only the collection and what it aliases: never another collection's own roles.
      const owners = new Set([...names].map((name) => cssCollectionOf(name)))
      if (key !== 'dimensions') expect(owners.has('color') && key !== 'color' && key !== 'gradients').toBe(false)
      // A cut never invents a line: each declaration is in the full file.
      for (const line of cut.split('\n')) if (/^\s*--/.test(line)) expect(full.includes(line)).toBe(true)
    })
  }

  it('radius carries the dimension primitives its roles alias', () => {
    const cut = cutCssCollection(full, 'radius')
    expect(cut).toContain('--radius-container')
    expect(cut).toMatch(/--dimension-\d+:/)
    expect(cut).not.toContain('--color-')
    expect(cut).toContain('@media (max-width')
  })

  it('keyframes ship with motion only', () => {
    expect(cutCssCollection(full, 'motion')).toContain('@keyframes motion-')
    expect(cutCssCollection(full, 'color')).not.toContain('@keyframes')
  })
})

describe('combineBrandCss', () => {
  const brands = [
    { slug: 'acme', name: 'Acme', css: full },
    { slug: 'beta', name: 'Beta', css: full },
  ]
  const combined = combineBrandCss('Escala', brands)

  it('the first brand also answers bare :root and .dark; the others only their data-brand', () => {
    expect(combined).toContain(':root, [data-brand="acme"] {')
    expect(combined).toMatch(/\.dark, \[data-brand="acme"\]\.dark/)
    expect(combined).toContain('\n[data-brand="beta"] {')
    expect(combined).toContain('[data-brand="beta"].dark, [data-brand="beta"][data-theme="dark"] {')
    expect(combined).not.toMatch(/^:root, \[data-brand="beta"\]/m)
  })

  it('media blocks are scoped per brand, keyframes ship once', () => {
    expect(combined).toMatch(/@media \(max-width: \d+px\) {\n {2}\[data-brand="beta"\] {/)
    const fadeIn = combined.match(/@keyframes motion-fade-in /g) ?? []
    expect(fadeIn).toHaveLength(1)
    expect(braces(combined)).toBe(0)
  })
})

describe('brandSlug', () => {
  it('is readable and unique', () => {
    const taken = new Set<string>()
    expect(brandSlug('Café Noir', taken)).toBe('cafe-noir')
    expect(brandSlug('Café Noir', taken)).toBe('cafe-noir-2')
    expect(brandSlug('***', taken)).toBe('brand')
  })
})
