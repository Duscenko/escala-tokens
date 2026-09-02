import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ICON_AI_SOURCE,
  ICON_AI_SOURCES,
  ICON_LIBRARIES,
  PHOSPHOR_CORE,
  PHOSPHOR_CORE_COMPONENT,
  PHOSPHOR_LIBRARY,
  aiSourceFromLegacyLibrary,
  getIconAiSource,
  getIconLibrary,
  iconAiContext,
} from '../iconLibraries'
import {
  PHOSPHOR_ICONS_COUNT,
  PHOSPHOR_WEIGHTS,
  findPhosphorIcon,
  loadPhosphorWeight,
  phosphorCoreBody,
  phosphorIconSvg,
  phosphorIconSvgForFigma,
  searchPhosphorIcons,
} from '../phosphorIcons'

describe('icon library model', () => {
  it('embeds only Phosphor', () => {
    expect(ICON_LIBRARIES).toEqual([PHOSPHOR_LIBRARY])
    expect(PHOSPHOR_LIBRARY.license).toBe('MIT')
    // every persisted key — including the old 'untitled' — resolves to Phosphor
    expect(getIconLibrary('untitled').key).toBe('phosphor')
    expect(getIconLibrary('lucide').key).toBe('phosphor')
  })

  it('offers Phosphor (default) plus Untitled and the rest as options', () => {
    expect(ICON_AI_SOURCES.map((s) => s.key)).toEqual(['phosphor', 'untitled', 'mage', 'tabler', 'heroicons'])
    expect(DEFAULT_ICON_AI_SOURCE).toBe('phosphor')
    expect(getIconAiSource(undefined).key).toBe(DEFAULT_ICON_AI_SOURCE)
    expect(getIconAiSource('phosphor').npm).toBe('@phosphor-icons/react')
    expect(getIconAiSource('tabler').repo).toContain('tabler-icons')
  })

  it('preserves a Heroicons pick, otherwise falls back to the default', () => {
    expect(aiSourceFromLegacyLibrary('heroicons')).toBe('heroicons')
    expect(aiSourceFromLegacyLibrary('lucide')).toBe(DEFAULT_ICON_AI_SOURCE)
  })

  it('writes Phosphor size/color/weight usage into the context', () => {
    const phosphor = iconAiContext('phosphor')
    expect(phosphor.instruction).toContain('@phosphor-icons/react')
    expect(phosphor.markdown).toContain('`size`, `color`, and `weight`')
  })

  it('still writes the right GitHub repo for a non-default source', () => {
    const tabler = iconAiContext('tabler')
    expect(tabler.instruction).toContain('https://github.com/tabler/tabler-icons')
    expect(tabler.source.npm).toBe('@tabler/icons-react')
  })
})

describe('phosphor catalog', () => {
  it('is generated from @phosphor-icons/core', () => {
    expect(PHOSPHOR_ICONS_COUNT).toBeGreaterThanOrEqual(1500)
    expect(findPhosphorIcon('MagnifyingGlass')?.slug).toBe('magnifying-glass')
    expect(findPhosphorIcon('gear')?.name).toBe('Gear')
    expect(searchPhosphorIcons('house', 8).length).toBeGreaterThan(0)
  })

  it('emits Figma-pasteable SVG (xmlns, explicit fill, no currentColor)', () => {
    const body = phosphorCoreBody('magnifying-glass')
    expect(body).toBeTruthy()
    const svg = phosphorIconSvgForFigma(body!)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('fill="#000000"')
    expect(svg).not.toContain('currentColor')
    // in-app variant keeps currentColor
    expect(phosphorIconSvg(body!)).toContain('fill="currentColor"')
  })

  it('resolves every specimen concept to a real inline glyph', () => {
    for (const slug of Object.values(PHOSPHOR_CORE)) {
      expect(phosphorCoreBody(slug), `missing body for ${slug}`).toBeTruthy()
    }
  })

  it('has a component name for every concept', () => {
    for (const concept of Object.keys(PHOSPHOR_CORE)) {
      expect(PHOSPHOR_CORE_COMPONENT[concept], `missing component name for ${concept}`).toMatch(/^[A-Z][A-Za-z]*$/)
    }
  })

  it('lazy-loads a non-regular weight map', async () => {
    expect(PHOSPHOR_WEIGHTS).toContain('duotone')
    const bold = await loadPhosphorWeight('bold')
    expect(Object.keys(bold).length).toBe(PHOSPHOR_ICONS_COUNT)
    expect(bold['gear']).toContain('<path')
  })
})
