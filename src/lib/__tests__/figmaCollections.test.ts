import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { generateTokenJSON } from '../tokenGenerator'
import { generateColorScale, generateFamilyDarkScale } from '../colorUtils'
import { FIGMA_COLLECTION_ORDER, figmaCollectionsW3C, pruneSnapshot, snapshotToW3C, type CollectionsSnapshot } from '../figmaCollections'
import { buildWizardExport, ALL_WIZARD_COLLECTIONS } from '../exportWizard'

// The W3C export IS the Figma file: the five collections the plugin creates as
// top-level groups, a group per mode under each, aliases between collections.

function backfillGlobalRamps() {
  const s = useDesignStore.getState()
  const gen = (b: string) => generateColorScale(b, s.colorAlgorithm, s.contrastShift, s.pageBackground)
  const genDark = (b: string) => generateFamilyDarkScale(b, s.colorAlgorithm, s.contrastShift, s.darkBackground)
  for (const [scale, set, base] of [
    ['primaryScale', s.setPrimaryScale, s.primaryColor], ['errorScale', s.setErrorScale, s.errorColor],
    ['warningScale', s.setWarningScale, s.warningColor], ['successScale', s.setSuccessScale, s.successColor],
    ['infoScale', s.setInfoScale, s.infoColor],
  ] as const) if (!Object.keys((s as any)[scale] ?? {}).length) (set as (x: unknown) => void)(gen(base))
  if (!Object.keys(s.primaryDarkScale ?? {}).length) s.setPrimaryDarkScale(genDark(s.primaryColor))
  if (!Object.keys(s.errorDarkScale ?? {}).length) s.setErrorDarkScale(genDark(s.errorColor))
}

type Doc = Record<string, any>
const refsOf = (doc: Doc) => [...JSON.stringify(doc).matchAll(/"(\{[^"}]+\})"/g)].map((m) => m[1])
const at = (doc: Doc, ref: string) => ref.slice(1, -1).split('.').reduce((n: any, k) => n?.[k], doc)
const leaves = (node: any, out: any[] = []): any[] => {
  if (node && typeof node === 'object') {
    if ('$value' in node) out.push(node)
    else for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) leaves(v, out)
  }
  return out
}

describe('W3C = the Figma collections', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    backfillGlobalRamps()
  })

  it('has exactly the five collections, in the plugin’s order', () => {
    const doc: Doc = figmaCollectionsW3C(generateTokenJSON())
    expect(Object.keys(doc).filter((k) => !k.startsWith('$'))).toEqual([...FIGMA_COLLECTION_ORDER])
  })

  it('modes: themes for colour, viewports for lengths and type, Default for the primitives', () => {
    const doc: Doc = figmaCollectionsW3C(generateTokenJSON())
    expect(Object.keys(doc['Color Primitives'])).toEqual(['Default'])
    expect(Object.keys(doc['Dimension Primitives'])).toEqual(['Default'])
    expect(Object.keys(doc['Color Semantics'])).toEqual(['Light', 'Dark'])
    expect(Object.keys(doc['Dimension Semantics'])).toEqual(['Desktop', 'Tablet', 'Mobile'])
    expect(Object.keys(doc.Typography)).toEqual(['Desktop', 'Tablet', 'Mobile'])
  })

  it('names variables the way the plugin does', () => {
    const doc: Doc = figmaCollectionsW3C(generateTokenJSON())
    expect(Object.keys(doc['Color Primitives'].Default)).toEqual(expect.arrayContaining(['Accents', 'Neutrals', 'States']))
    expect(doc['Color Primitives'].Default.Accents.Accent['09'].$type).toBe('color')
    expect(Object.keys(doc['Color Semantics'].Light)).toEqual(['Content', 'Action', 'Surface', 'Status', 'Border', 'panel-background'])
    expect(doc['Color Semantics'].Light.Action.primary.default.$value).toMatch(/^\{Color Primitives\.Default\.Accents\.Accent\./)
    expect(Object.keys(doc['Dimension Semantics'].Desktop)).toEqual(['Spacing', 'Radius', 'Stroke', 'Size', 'Selector', 'Icon', 'Grid'])
    expect(doc['Dimension Semantics'].Desktop.Radius.role.container.$value).toBe('{Dimension Semantics.Desktop.Radius.component.2xl}')
    expect(doc.Typography.Desktop['font-family-body']).toEqual({ $type: 'fontFamily', $value: 'Inter' })
    expect(doc.Typography.Desktop.role['body-md'].weight.$type).toBe('fontWeight')
  })

  it('every reference resolves inside the document, and no leaf is empty', () => {
    const doc: Doc = figmaCollectionsW3C(generateTokenJSON())
    const refs = refsOf(doc)
    expect(refs.length).toBeGreaterThan(200)
    expect(refs.filter((r) => !at(doc, r)?.$type)).toEqual([])
    expect(leaves(doc).filter((l) => l.$value === undefined || l.$value === null || l.$value === '')).toEqual([])
  })

  it('the alpha-backed semantic roles alias an alpha primitive', () => {
    const doc: Doc = figmaCollectionsW3C(generateTokenJSON())
    expect(doc['Color Semantics'].Light.Surface.overlay.$value).toMatch(/Alpha/)
  })

  for (const preset of THEME_STYLE_PRESETS) {
    it(`${preset.id}: every Color Semantics value is a primitive reference`, async () => {
      const { adoptPreset } = await import('../adoptPreset')
      adoptPreset(preset, 'dark')
      adoptPreset(preset, 'light')
      backfillGlobalRamps()
      const doc: Doc = figmaCollectionsW3C(generateTokenJSON())
      const raw = Object.values(doc['Color Semantics'] as Doc).flatMap((mode) => leaves(mode))
        .filter((l) => l.$type === 'color' && !String(l.$value).startsWith('{'))
      expect(raw).toEqual([])
      expect(refsOf(doc).filter((r) => !at(doc, r)?.$type)).toEqual([])
    })
  }
})

describe('wizard W3C', () => {
  beforeEach(() => {
    useDesignStore.setState(makeDesignDefaults())
    backfillGlobalRamps()
  })

  it('a semantics-only export writes colours, not references to a collection it left out', () => {
    const [file] = buildWizardExport({
      collections: ['semantics'], modes: ['light', 'dark'], format: 'w3c', structure: 'single',
      colorFormat: 'hex', includeAliases: true, includeComponents: false,
    })
    const doc = JSON.parse(file.content)
    expect(doc['Color Primitives']).toBeUndefined()
    expect(refsOf(doc)).toEqual([])
    expect(doc['Color Semantics'].Light.Action.primary.default.$value).toMatch(/^#[0-9a-f]{6,8}$/)
  })

  it('narrows Color Semantics to the picked themes', () => {
    const [file] = buildWizardExport({
      collections: ['primitives', 'semantics'], modes: ['dark'], format: 'w3c', structure: 'single',
      colorFormat: 'hex', includeAliases: true, includeComponents: false,
    })
    expect(Object.keys(JSON.parse(file.content)['Color Semantics'])).toEqual(['Dark'])
  })

  it('every collection, per collection: five files', () => {
    const files = buildWizardExport({
      collections: ALL_WIZARD_COLLECTIONS, modes: ['light', 'dark'], format: 'w3c', structure: 'per-collection',
      colorFormat: 'hex', includeAliases: true, includeComponents: false,
    })
    expect(files.map((f) => f.name)).toEqual([
      'color-primitives.tokens.json', 'color-semantics.tokens.json', 'dimension-primitives.tokens.json',
      'dimension-semantics.tokens.json', 'typography.tokens.json',
    ])
  })

  it('a one-family export keeps only that family', () => {
    const [file] = buildWizardExport({
      collections: ['primitives'], modes: [], format: 'w3c', structure: 'single', colorFormat: 'hex',
      includeAliases: false, includeComponents: false, primitiveFamilies: ['accent'], primitiveAppearance: 'light',
    })
    const prim = JSON.parse(file.content)['Color Primitives'].Default
    expect(Object.keys(prim)).toEqual(['Accents'])
    expect(Object.keys(prim.Accents)).toEqual(['Accent'])
    expect(Object.keys(prim.Accents.Accent)).toHaveLength(12)
  })
})

describe('snapshotToW3C', () => {
  const snap: CollectionsSnapshot = {
    collections: [
      { name: 'Color Primitives', modes: ['Mode 1'], variables: [{ name: 'Accents/Accent/09', type: 'COLOR', values: { 'Mode 1': '#9522e9' } }] },
      { name: 'Color Semantics', modes: ['Light', 'Dark'], variables: [
        { name: 'Action/primary', type: 'COLOR', values: { Light: { alias: { collection: 'Color Primitives', name: 'Accents/Accent/09' } }, Dark: '#ffffff' } },
        { name: 'Action/primary/hover', type: 'COLOR', values: { Light: '#000000', Dark: '#111111' } },
      ] },
    ],
  }

  it('cross-collection aliases land on the target’s own mode', () => {
    const doc = snapshotToW3C(snap, { source: 'escala-web' }) as Doc
    expect(doc['Color Semantics'].Light.Action.primary.$root.$value).toBe('{Color Primitives.Default.Accents.Accent.09}')
    expect(doc['Color Semantics'].Light.Action.primary.hover.$value).toBe('#000000')
  })

  it('pruning a target writes the alias as its value', () => {
    const cut = pruneSnapshot(snap, 'Color Primitives', () => false)
    const doc = snapshotToW3C(cut, { source: 'escala-web' }) as Doc
    expect(doc['Color Semantics'].Light.Action.primary.$root.$value).toBe('#9522e9')
  })
})
