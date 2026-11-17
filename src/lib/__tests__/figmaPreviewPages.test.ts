import { describe, expect, it } from 'vitest'
import { COMPONENTS } from '../componentCatalogue'
import { FIGMA_KIT_EMBED_URL, FIGMA_KIT_FILE_URL, FIGMA_PREVIEW_FILE_KEY, figmaPreviewUrl } from '../figmaKit'
import { figmaPageFor, figmaPreviewPageUrl } from '../figmaPreviewPages'

// One link for the design system (owner, 2026-11-17): the PREVIEW library.
describe('Preview library links', () => {
  it('every link is built from the one Preview key', () => {
    expect(FIGMA_PREVIEW_FILE_KEY).toBe('X736U9ffkni3gg6rmvEEnJ')
    expect(FIGMA_KIT_FILE_URL).toBe('https://www.figma.com/design/X736U9ffkni3gg6rmvEEnJ/Escala-Design-System--Preview-?node-id=4-17005')
    expect(FIGMA_KIT_EMBED_URL).toContain(`/design/${FIGMA_PREVIEW_FILE_KEY}/`)
    expect(figmaPreviewUrl('4:2185')).toContain('node-id=4-2185')
    expect(figmaPreviewUrl('4-2185')).toContain('node-id=4-2185')
  })

  it('Button opens the Button page', () => {
    expect(figmaPageFor('Button')?.id).toBe('4:2185')
    expect(figmaPreviewPageUrl('Button', ['Button'])).toBe(
      'https://www.figma.com/design/X736U9ffkni3gg6rmvEEnJ/Escala-Design-System--Preview-?node-id=4-2185',
    )
  })

  it('a component with no Figma twin falls back to the Cover, never a dead link', () => {
    expect(figmaPreviewPageUrl('NoSuchComponent')).toBe(FIGMA_KIT_FILE_URL)
  })

  it('every catalogue component lands on its own page, or on the Cover while it has none', () => {
    for (const def of COMPONENTS) {
      const page = figmaPageFor(def.key, def.figmaSets)
      const url = figmaPreviewPageUrl(def.key, def.figmaSets)
      if (page) expect(url, def.key).toMatch(/node-id=\d+-\d+$/)
      else expect(url, def.key).toBe(FIGMA_KIT_FILE_URL)
    }
    // The ones that do have a page are the bulk of the catalogue.
    expect(COMPONENTS.filter((c) => figmaPageFor(c.key, c.figmaSets)).length).toBeGreaterThan(40)
  })
})
