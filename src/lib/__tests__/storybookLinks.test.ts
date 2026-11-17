// Every platform page (component, part, block) opens a Storybook docs page that
// exists: its title is a story file's title, and that file keeps its autodocs
// page (no '!autodocs' in the meta's tags).
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BLOCKS } from '../../components/configurator/blocks/blockRegistry'
import { PLATFORM_PAGES } from '../platformCatalogue'
import { blockStoryTitle, componentStoryTitle, docsIdForTitle, sanitizeStoryPart } from '../storybookLinks'

const ROOT = join(__dirname, '../../../apps/storybook/stories')
const files = [
  ...readdirSync(ROOT).filter((f) => f.endsWith('.stories.tsx')).map((f) => join(ROOT, f)),
  ...readdirSync(join(ROOT, 'blocks')).filter((f) => f.endsWith('.stories.tsx')).map((f) => join(ROOT, 'blocks', f)),
]

/** Titles whose Storybook has a docs page: at least one story file with that
 *  title and no '!autodocs' in its meta tags. */
const DOCS_TITLES = new Set<string>()
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const meta = /title:\s*'([^']+)',?\s*\n(?:[\s\S]*?)tags:\s*\[([^\]]*)\]/.exec(src)
  const title = /^\s{2}title:\s*'([^']+)'/m.exec(src)?.[1]
  if (!title) continue
  const tags = meta && meta[1] === title ? meta[2] : ''
  if (!tags.includes("'!autodocs'")) DOCS_TITLES.add(title)
}

describe('Storybook links', () => {
  it('sanitises titles like Storybook does', () => {
    expect(docsIdForTitle('Content & Surfaces/Accordion')).toBe('content-surfaces-accordion--documentation')
    expect(docsIdForTitle('Blocks/Auth/SignIn')).toBe('blocks-auth-signin--documentation')
    expect(sanitizeStoryPart('Buttons/IconButton')).toBe('buttons-iconbutton')
  })

  it('every component page and part opens its family docs page, which exists', () => {
    expect(PLATFORM_PAGES.length).toBeGreaterThan(0)
    for (const c of PLATFORM_PAGES) {
      const title = componentStoryTitle(c.key)
      expect(title, `${c.key} has no Storybook title`).not.toBeNull()
      expect(DOCS_TITLES.has(title!), `${c.key} → ${title} has no docs page`).toBe(true)
    }
  })

  it('a part opens its family, not a page of its own', () => {
    expect(componentStoryTitle('CalendarDay')).toBe('Forms/Calendar')
  })

  it('every block opens its docs page, which exists', () => {
    expect(BLOCKS.length).toBeGreaterThan(0)
    for (const b of BLOCKS) {
      const title = blockStoryTitle(b.id)
      expect(DOCS_TITLES.has(title), `${b.id} → ${title} has no docs page`).toBe(true)
    }
  })
})
