import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ICON_AI_SOURCE,
  ICON_AI_SOURCES,
  ICON_LIBRARIES,
  UNTITLED_CORE,
  UNTITLED_LIBRARY,
  aiSourceFromLegacyLibrary,
  getIconAiSource,
  getIconLibrary,
  iconAiContext,
} from '../iconLibraries'
import { UNTITLED_ICONS_COUNT, findUntitledIcon, searchUntitledIcons, untitledIconSvgForFigma } from '../untitledIcons'

describe('icon library model', () => {
  it('embeds only Untitled UI', () => {
    expect(ICON_LIBRARIES).toEqual([UNTITLED_LIBRARY])
    expect(getIconLibrary('lucide').key).toBe('untitled')
    expect(getIconLibrary('heroicons').key).toBe('untitled')
  })

  it('offers four AI sources, Untitled first', () => {
    expect(ICON_AI_SOURCES.map((s) => s.key)).toEqual(['untitled', 'mage', 'tabler', 'heroicons'])
    expect(getIconAiSource(undefined).key).toBe(DEFAULT_ICON_AI_SOURCE)
    expect(getIconAiSource('tabler').repo).toContain('tabler-icons')
  })

  it('preserves a Heroicons pick as the AI source', () => {
    expect(aiSourceFromLegacyLibrary('heroicons')).toBe('heroicons')
    expect(aiSourceFromLegacyLibrary('lucide')).toBe('untitled')
  })

  it('writes the GitHub repo into Skill/MD context', () => {
    const untitled = iconAiContext('untitled')
    expect(untitled.instruction).toContain('https://github.com/untitleduico/icons')
    expect(untitled.markdown).toContain('**Repo:** https://github.com/untitleduico/icons')
    const tabler = iconAiContext('tabler')
    expect(tabler.instruction).toContain('https://github.com/tabler/tabler-icons')
    expect(tabler.source.npm).toBe('@tabler/icons-react')
  })
})

describe('untitled catalog', () => {
  it('is generated from @untitledui/icons', () => {
    expect(UNTITLED_ICONS_COUNT).toBeGreaterThanOrEqual(1100)
    expect(findUntitledIcon('SearchLg')?.slug).toBe('search-lg')
    expect(searchUntitledIcons('home', 8).length).toBeGreaterThan(0)
  })

  it('emits Figma-pasteable SVG (xmlns, no currentColor)', () => {
    const icon = findUntitledIcon('SearchLg')
    expect(icon).toBeTruthy()
    const svg = untitledIconSvgForFigma(icon!)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('stroke="#000000"')
    expect(svg).not.toContain('currentColor')
  })

  it('maps every specimen concept onto a real glyph', () => {
    for (const name of Object.values(UNTITLED_CORE)) {
      expect(findUntitledIcon(name), `missing ${name}`).toBeTruthy()
    }
  })
})
