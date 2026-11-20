import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PLAN_FOCUS_TILES, activePlanItem, brandPlan } from '../brandPlan'
import { pickBlankBrandSeed } from '../blankBrandSeed'
import { hexToOklch } from '../color/gamut'

const none = new Set<string>()

describe('brandPlan', () => {
  it('a first brand lists every foundation, in the accordion order', () => {
    const items = brandPlan({ addBrand: false, changed: none, kept: none, shipsPicked: false })
    expect(items.map((item) => item.key)).toEqual(['color', 'typography', 'radius', 'shadow', 'sizes', 'icons', 'motion'])
    expect(items.every((item) => !item.inherited && !item.done)).toBe(true)
  })

  it('an added brand lists only what a brand owns, with Themes after Color', () => {
    const items = brandPlan({ addBrand: true, changed: none, kept: none, shipsPicked: false })
    expect(items.map((item) => item.key)).toEqual(['color', 'themes', 'typography', 'radius', 'sizes'])
    expect(items.find((item) => item.key === 'themes')?.row).toBe('color')
    expect(items.filter((item) => item.inherited).map((item) => item.key)).toEqual(['typography', 'radius', 'sizes'])
  })

  it('an item is done when its row changed, when kept, or (Themes) when the ships were picked', () => {
    const items = brandPlan({ addBrand: true, changed: new Set(['color']), kept: new Set(['radius']), shipsPicked: true })
    const done = Object.fromEntries(items.map((item) => [item.key, item.done]))
    expect(done).toEqual({ color: true, themes: true, typography: false, radius: true, sizes: false })
  })

  it('the open Color row stands for Themes once the colour is done', () => {
    const fresh = brandPlan({ addBrand: true, changed: none, kept: none, shipsPicked: false })
    expect(activePlanItem(fresh, 'color')).toBe('color')
    const coloured = brandPlan({ addBrand: true, changed: new Set(['color']), kept: none, shipsPicked: false })
    expect(activePlanItem(coloured, 'color')).toBe('themes')
    expect(activePlanItem(coloured, 'radius')).toBe('radius')
    // A first brand has no Themes item: Color stays Color.
    const first = brandPlan({ addBrand: false, changed: new Set(['color']), kept: none, shipsPicked: false })
    expect(activePlanItem(first, 'color')).toBe('color')
  })

  it('every tile the plan points at exists on the board', () => {
    const collage = readFileSync(new URL('../../components/preview/artefacts/SystemCollage.tsx', import.meta.url), 'utf8')
    const named = new Set([
      ...[...collage.matchAll(/tile="(\w+)"/g)].map((m) => m[1]),
      ...[...collage.matchAll(/block\('(\w+)'/g)].map((m) => m[1]),
    ])
    for (const tiles of Object.values(PLAN_FOCUS_TILES)) {
      for (const tile of tiles) expect(named, tile).toContain(tile)
    }
  })
})

describe('pickBlankBrandSeed', () => {
  const hueGap = (a: string, b: string) => {
    const d = Math.abs(hexToOklch(a).h - hexToOklch(b).h) % 360
    return d > 180 ? 360 - d : d
  }

  it('never hands a new brand the accent of the brand beside it', () => {
    const violet = '#905CFF'
    const seed = pickBlankBrandSeed([violet])
    expect(hueGap(seed.hex, violet)).toBeGreaterThan(90)
  })

  it('is deterministic and ignores greys', () => {
    expect(pickBlankBrandSeed(['#905CFF']).id).toBe(pickBlankBrandSeed(['#905CFF', '#777777']).id)
    expect(pickBlankBrandSeed([]).source).toBe('createui')
  })
})

describe('uniqueThemeLabel', () => {
  it('numbers a blank brand whose name is taken, so mintTheme never refuses it', async () => {
    const { uniqueThemeLabel } = await import('../themeMint')
    expect(uniqueThemeLabel('New brand', {})).toBe('New brand')
    expect(uniqueThemeLabel('New brand', { 'new-brand': {} })).toBe('New brand 2')
    expect(uniqueThemeLabel('New brand', { 'new-brand': {}, 'new-brand-2': {} })).toBe('New brand 3')
  })
})
