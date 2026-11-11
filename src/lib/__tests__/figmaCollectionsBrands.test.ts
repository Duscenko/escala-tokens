import { beforeAll, describe, expect, it } from 'vitest'
import { buildStudioTokens, type StudioChoices } from '../pluginStudio'
import { BRAND_COLLECTION, FIGMA_COLLECTION_ORDER, figmaCollectionsSnapshot, figmaCollectionsW3C, isSnapAlias, type CollectionsSnapshot, type SnapCollection, type SnapScalar, type SnapValue, type SnapVariable } from '../figmaCollections'

// Two or more brands (`<slug>::<appearance>` columns): the plugin's code.ts
// writes a Brand collection, one mode per brand, and Color Semantics becomes
// Light · Dark with whatever differs between brands aliased through Brand.
// The web mirrors it (fromTokens.ts). Payloads are real studio-build ones,
// merged the way the plugin's `mergeTheme` (ui.html) merges an added brand.

type Loose = Record<string, any>
type Tokens = Parameters<typeof figmaCollectionsSnapshot>[0]

const appearanceOf = (k: string) => (k.includes('::') ? k.slice(k.indexOf('::') + 2) : '')
const slugOf = (k: string) => k.split('::')[0]

/** One brand from studio-build; `keep` drops the other appearance (the
 *  plugin's `keepAppearances`). */
function brand(choices: StudioChoices, keep?: ('light' | 'dark')[]): Loose {
  const r = buildStudioTokens(choices, 'pro')
  if ('error' in r) throw new Error(r.error)
  const t = JSON.parse(JSON.stringify(r.tokens)) as Loose
  t.studio = { ...choices }
  if (!keep) return t
  const kept = (t.colors.themeOrder as string[]).filter((k) => keep.includes(appearanceOf(k) as 'light'))
  const gone = (k: string) => k.includes('::') && !kept.includes(k)
  t.colors.themeOrder = kept
  for (const m of ['themes', 'themeSources', 'themeLabels']) for (const k of Object.keys(t.colors[m] ?? {})) if (gone(k)) delete t.colors[m][k]
  for (const m of ['foundationsByTheme', 'gradientsByTheme']) for (const k of Object.keys(t[m] ?? {})) if (gone(k)) delete t[m][k]
  for (const g of Object.values((t.colors.architecture?.tokens ?? {}) as Loose)) {
    for (const tk of Object.values(g as Loose)) for (const k of Object.keys(tk as Loose)) if (gone(k)) delete (tk as Loose)[k]
  }
  if (t.colors.activeTheme && gone(t.colors.activeTheme)) t.colors.activeTheme = kept[0]
  return t
}

/** The plugin's `mergeTheme` (no replace): `added` becomes another brand. */
function mergeTheme(base: Loose, added: Loose): Loose {
  const clone = JSON.parse(JSON.stringify(base)) as Loose
  const c = clone.colors
  clone.studioThemes = clone.studioThemes ?? {}
  if (!Object.keys(clone.studioThemes).length && clone.studio) clone.studioThemes[slugOf(c.themeOrder[0])] = clone.studio
  const ac = added.colors
  Object.assign(c.primitive, ac.primitive ?? {})
  c.primitiveAlpha = Object.assign(c.primitiveAlpha ?? {}, ac.primitiveAlpha ?? {})
  for (const m of ['themes', 'themeSources', 'themeLabels', 'themeModes']) if (ac[m]) c[m] = Object.assign(c[m] ?? {}, ac[m])
  c.themeOrder.push(...(ac.themeOrder as string[]).filter((k) => !c.themeOrder.includes(k)))
  for (const m of ['foundationsByTheme', 'gradientsByTheme']) if (added[m]) clone[m] = Object.assign(clone[m] ?? {}, added[m])
  const aArch = ac.architecture?.tokens
  const bArch = c.architecture?.tokens
  if (aArch && bArch) {
    for (const g of Object.keys(aArch)) {
      bArch[g] = bArch[g] ?? {}
      for (const tk of Object.keys(aArch[g])) {
        const dst = (bArch[g][tk] = bArch[g][tk] ?? {})
        for (const k of Object.keys(aArch[g][tk])) if (k.includes('::') || !(k in dst)) dst[k] = aArch[g][tk][k]
      }
    }
  }
  if (added.studio) clone.studioThemes[slugOf(ac.themeOrder[0])] = added.studio
  return clone
}

/** A variable's value with each collection in the given mode (a collection
 *  not named resolves in its only — or first — mode), the way Figma does. */
function resolve(snap: CollectionsSnapshot, collection: string, name: string, modes: Record<string, string>): SnapScalar | undefined {
  let value: SnapValue | undefined = { alias: { collection, name } }
  for (let depth = 0; isSnapAlias(value) && depth < 12; depth++) {
    const target: SnapValue = value
    const at: SnapCollection | undefined = snap.collections.find((c) => c.name === target.alias.collection)
    const v: SnapVariable | undefined = at?.variables.find((x) => x.name === target.alias.name)
    if (!at || !v) return undefined
    value = v.values[modes[at.name] ?? at.modes[0]]
  }
  return isSnapAlias(value) ? undefined : value
}

const col = (snap: CollectionsSnapshot, name: string) => snap.collections.find((c) => c.name === name)!
const names = (snap: CollectionsSnapshot, name: string) => col(snap, name).variables.map((v) => v.name)

const ESCALA: StudioChoices = { name: 'Escala', accent: '#3b5bdb', kind: 'light', bodyFont: 'Inter', radiusPreset: 'Rounded' }
const HOLA: StudioChoices = { name: 'Hola', accent: '#e8590c', kind: 'light', bodyFont: 'Roboto', headingFont: 'Roboto', radiusPreset: 'Sharp', spacingMode: 'compact' }
const OTRA: StudioChoices = { name: 'Otra', accent: '#2b8a3e', kind: 'dark', radiusPreset: 'Pill' }

describe('Figma collections with several brands', () => {
  let escala: Loose, hola: Loose, otra: Loose, three: Tokens, snap: CollectionsSnapshot
  beforeAll(() => {
    escala = brand(ESCALA)
    hola = brand(HOLA, ['light'])
    otra = brand(OTRA, ['dark'])
    three = mergeTheme(mergeTheme(escala, hola), otra) as Tokens
    snap = figmaCollectionsSnapshot(three)
  })

  it('one brand: the five collections, no Brand', () => {
    const one = figmaCollectionsSnapshot(escala as Tokens)
    expect(one.collections.map((c) => c.name)).toEqual([...FIGMA_COLLECTION_ORDER])
    // Mode names start upper-case: the system's name, not its slug.
    expect(col(one, 'Color Semantics').modes).toEqual(['Escala Light', 'Escala Dark'])
  })

  it('a Brand collection with one mode per brand, named as the brand was', () => {
    expect(snap.collections.map((c) => c.name)).toEqual([...FIGMA_COLLECTION_ORDER, BRAND_COLLECTION])
    expect(col(snap, BRAND_COLLECTION).modes).toEqual(['Escala', 'Hola', 'Otra'])
  })

  it('Color Semantics is Light · Dark; values that differ alias Brand/<Appearance>/<role>', () => {
    const sem = col(snap, 'Color Semantics')
    expect(sem.modes).toEqual(['Light', 'Dark'])
    const primary = sem.variables.find((v) => v.name === 'Action/primary/default')!
    expect(primary.values).toEqual({
      Light: { alias: { collection: BRAND_COLLECTION, name: 'Light/Action/primary/default' } },
      Dark: { alias: { collection: BRAND_COLLECTION, name: 'Dark/Action/primary/default' } },
    })
    const inBrand = col(snap, BRAND_COLLECTION).variables.find((v) => v.name === 'Light/Action/primary/default')!
    expect(Object.keys(inBrand.values)).toEqual(['Escala', 'Hola', 'Otra'])
    for (const v of Object.values(inBrand.values)) expect(v).toMatchObject({ alias: { collection: 'Color Primitives' } })
  })

  it('Brand holds only what differs between brands', () => {
    const brandVars = col(snap, BRAND_COLLECTION).variables
    expect(brandVars.length).toBeGreaterThan(0)
    for (const v of brandVars) expect(new Set(Object.values(v.values).map((x) => JSON.stringify(x))).size).toBeGreaterThan(1)
    // panel-background and the type scale are shared: written directly.
    const panel = col(snap, 'Color Semantics').variables.find((v) => v.name === 'panel-background')
    if (panel) expect(Object.values(panel.values).some(isSnapAlias)).toBe(false)
    for (const v of col(snap, 'Typography').variables.filter((x) => x.name.startsWith('size/'))) {
      expect(Object.values(v.values).some(isSnapAlias)).toBe(false)
    }
    // Every Brand variable is reached from a semantic one.
    const used = new Set<string>()
    for (const c of snap.collections) for (const v of c.variables) for (const x of Object.values(v.values)) {
      if (isSnapAlias(x) && x.alias.collection === BRAND_COLLECTION) used.add(x.alias.name)
    }
    expect(brandVars.map((v) => v.name).filter((n) => !used.has(n))).toEqual([])
  })

  it('a brand that ships one appearance repeats it in the other column', () => {
    for (const n of names(snap, 'Color Semantics')) {
      expect(resolve(snap, 'Color Semantics', n, { 'Color Semantics': 'Dark', Brand: 'Hola' }))
        .toBe(resolve(snap, 'Color Semantics', n, { 'Color Semantics': 'Light', Brand: 'Hola' }))
      expect(resolve(snap, 'Color Semantics', n, { 'Color Semantics': 'Light', Brand: 'Otra' }))
        .toBe(resolve(snap, 'Color Semantics', n, { 'Color Semantics': 'Dark', Brand: 'Otra' }))
    }
  })

  it('each brand resolves the colours, spacing, radii and families it has alone', () => {
    const cases: [Loose, string, [string, string][]][] = [
      [escala, 'Escala', [['Light', 'Escala Light'], ['Dark', 'Escala Dark']]],
      [hola, 'Hola', [['Light', 'Hola Light'], ['Dark', 'Hola Light']]],
      [otra, 'Otra', [['Light', 'Otra Dark'], ['Dark', 'Otra Dark']]],
    ]
    for (const [alone, label, columns] of cases) {
      const own = figmaCollectionsSnapshot(alone as Tokens)
      for (const [mode, ownMode] of columns) {
        for (const n of names(own, 'Color Semantics')) {
          expect([label, mode, n, resolve(snap, 'Color Semantics', n, { 'Color Semantics': mode, Brand: label })])
            .toEqual([label, mode, n, resolve(own, 'Color Semantics', n, { 'Color Semantics': ownMode })])
        }
      }
      for (const vp of ['Desktop', 'Tablet', 'Mobile']) {
        for (const n of names(own, 'Dimension Semantics').filter((x) => /^(Spacing|Radius)\//.test(x))) {
          expect([label, vp, n, resolve(snap, 'Dimension Semantics', n, { 'Dimension Semantics': vp, Brand: label })])
            .toEqual([label, vp, n, resolve(own, 'Dimension Semantics', n, { 'Dimension Semantics': vp })])
        }
        for (const n of ['font-family-body', 'font-family-display']) {
          expect([label, n, resolve(snap, 'Typography', n, { Typography: vp, Brand: label })])
            .toEqual([label, n, resolve(own, 'Typography', n, { Typography: vp })])
        }
      }
    }
  })

  it('the families alias Brand/Font/*; spacing and radius alias Brand/<name>/<viewport>', () => {
    const body = col(snap, 'Typography').variables.find((v) => v.name === 'font-family-body')!
    expect(body.values.Desktop).toEqual({ alias: { collection: BRAND_COLLECTION, name: 'Font/body' } })
    expect(col(snap, BRAND_COLLECTION).variables.find((v) => v.name === 'Font/body')!.values).toEqual({ Escala: 'Inter', Hola: 'Roboto', Otra: 'Inter' })
    const branded = col(snap, 'Dimension Semantics').variables
      .flatMap((v) => Object.entries(v.values).map(([m, x]) => [v.name, m, x] as const))
      .filter(([, , x]) => isSnapAlias(x) && x.alias.collection === BRAND_COLLECTION)
    expect(branded.length).toBeGreaterThan(0)
    for (const [n, m, x] of branded) {
      expect(n).toMatch(/^(Spacing|Radius)\//)
      expect((x as { alias: { name: string } }).alias.name).toBe(`${n}/${m.toLowerCase()}`)
    }
  })

  it('state ramps are grouped per brand', () => {
    const states = [...new Set(names(snap, 'Color Primitives').filter((n) => n.startsWith('States/')).map((n) => n.split('/')[1]))]
    expect(states).toEqual(['Escala', 'Hola', 'Otra'])
  })

  it('brands that share everything: an empty Brand collection, Light · Dark semantics', () => {
    const twin = figmaCollectionsSnapshot(mergeTheme(escala, brand({ ...ESCALA, name: 'Twin' })) as Tokens)
    expect(col(twin, BRAND_COLLECTION).modes).toEqual(['Escala', 'Twin'])
    expect(col(twin, BRAND_COLLECTION).variables).toEqual([])
    expect(col(twin, 'Color Semantics').modes).toEqual(['Light', 'Dark'])
  })

  it('W3C: Brand after the five, every reference resolves, families stay fontFamily', () => {
    const doc = figmaCollectionsW3C(three) as Loose
    expect(Object.keys(doc).filter((k) => !k.startsWith('$'))).toEqual([...FIGMA_COLLECTION_ORDER, BRAND_COLLECTION])
    expect(Object.keys(doc.Brand)).toEqual(['Escala', 'Hola', 'Otra'])
    expect(doc.Typography.Desktop['font-family-body']).toEqual({ $type: 'fontFamily', $value: '{Brand.Escala.Font.body}' })
    expect(doc.Brand.Hola.Font.body).toEqual({ $type: 'fontFamily', $value: 'Roboto' })
    expect(doc['Color Semantics'].Light.Action.primary.default.$value).toBe('{Brand.Escala.Light.Action.primary.default}')
    const refs = [...JSON.stringify(doc).matchAll(/"(\{[^"}]+\})"/g)].map((m) => m[1])
    const at = (ref: string) => ref.slice(1, -1).split('.').reduce((n: any, k) => n?.[k], doc)
    expect(refs.filter((r) => !at(r)?.$type)).toEqual([])
  })

  it('W3C scoped to one brand column keeps its appearance and its Brand mode', () => {
    const doc = figmaCollectionsW3C(three, { semanticModes: ['hola::light'] }) as Loose
    expect(Object.keys(doc['Color Semantics'])).toEqual(['Light'])
    expect(Object.keys(doc.Brand)).toEqual(['Hola'])
    expect(doc['Color Semantics'].Light.Action.primary.default.$value).toBe('{Brand.Hola.Light.Action.primary.default}')
  })
})
