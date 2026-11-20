// The platform's Components section lists exactly what the Storybook documents:
// one row per Storybook family (spec/storybook-families.json), parts inside
// their family, and nothing from the shadcn era that `COMPONENTS` still carries
// for export. A family added to the Storybook appears here without a hand edit;
// one the platform cannot open fails here.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMPONENTS } from '../componentCatalogue'
import { PLATFORM_FAMILIES, PLATFORM_FOLDERS, PLATFORM_PAGES, SCREENS_FOLDER, familyOf, isPlatformComponent } from '../platformCatalogue'
import { matchPublicPath, sitemapPaths } from '../publicSeo'

const ROOT = join(__dirname, '../../..')
const manifest = JSON.parse(readFileSync(join(ROOT, 'spec/storybook-families.json'), 'utf8')) as {
  folders: string[]
  families: { id: string; folder: string; root: string | null; parts: string[] }[]
  noStory?: Record<string, string>
}

/** shadcn-era entries the Figma file and the Storybook do not have. Most were
 *  removed from the catalogue (DEC-2026-11-16-008); they stay listed so none can
 *  come back. Label · Spinner · Card have stories now and are families. */
/** The Storybook's Screens are the Screens tab's: they and their pieces are never Elements. */
/** A family whose sets are all `noStory` is in the Figma file but not built yet (ActionButton, SplitButton, 2026-11-19):
 *  it keeps its place in the manifest and has nothing to show on the platform until it is. */
const unbuilt = new Set(Object.keys((manifest as { noStory?: Record<string, string> }).noStory ?? {}))
const elementFamilies = manifest.families
  .filter((f) => f.folder !== SCREENS_FOLDER)
  .filter((f) => ![f.root, ...f.parts].filter((k): k is string => Boolean(k)).every((k) => unbuilt.has(k)))
const screenPieces = manifest.families.filter((f) => f.folder === SCREENS_FOLDER).flatMap((f) => [f.root, ...f.parts]).filter((k): k is string => Boolean(k))

const HIDDEN = [
  'Toggle', 'AppStoreBadge', 'InputGroup', 'StatusBadge', 'Icon', 'FileFormat',
  'Collapsible', 'AlertDialog', 'Drawer', 'HoverCard', 'Item', 'Attachment', 'Message', 'Bubble', 'Resizable',
  'Carousel', 'Chart', 'Skeleton', 'Empty', 'NavigationMenu', 'Command', 'Navbar',
]

describe('platform Components = the Storybook families', () => {
  it('has one family per Storybook family, in its folders and order', () => {
    expect(PLATFORM_FOLDERS).toEqual(manifest.folders.filter((f) => f !== SCREENS_FOLDER))
    expect(PLATFORM_FAMILIES.map((f) => [f.folder, f.id])).toEqual(elementFamilies.map((f) => [f.folder, f.id]))
  })

  it('keeps every screen and the pieces it is made of out of Elements', () => {
    expect(screenPieces.length).toBeGreaterThan(0)
    for (const k of screenPieces) {
      expect(isPlatformComponent(k), `${k} is a screen's piece: it lives in Screens, not Elements`).toBe(false)
      expect(sitemapPaths()).not.toContain(`/components/${k}`)
    }
  })

  it('can open every root and every part that has a story', () => {
    const noStory = new Set(Object.keys(manifest.noStory ?? {}))
    const keys = new Set(COMPONENTS.map((c) => c.key))
    for (const f of elementFamilies) {
      for (const k of [f.root, ...f.parts].filter((k): k is string => Boolean(k) && !noStory.has(k!))) {
        expect(keys.has(k), `${f.id}: ${k} has no catalogue entry, so the platform cannot draw it`).toBe(true)
        expect(familyOf(k)?.id).toBe(f.id)
      }
    }
  })

  it('hides every shadcn-era component, on the platform and in public', () => {
    for (const k of HIDDEN) {
      expect(isPlatformComponent(k), k).toBe(false)
      expect(matchPublicPath(`/components/${k}`), k).toBeNull()
      expect(sitemapPaths()).not.toContain(`/components/${k}`)
    }
    // Nothing else is hidden: every catalogue entry is either Escala's or listed above.
    const orphans = COMPONENTS.filter((c) => !isPlatformComponent(c.key) && !HIDDEN.includes(c.key) && !screenPieces.includes(c.key)).map((c) => c.key)
    expect(orphans).toEqual([])
  })

  it('walks each page once, family first', () => {
    const keys = PLATFORM_PAGES.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const f of PLATFORM_FAMILIES) expect(keys.indexOf(f.lead.key)).toBeLessThan(Math.min(...f.parts.map((p) => keys.indexOf(p.key)).filter((i) => i !== keys.indexOf(f.lead.key)), Infinity))
  })
})
