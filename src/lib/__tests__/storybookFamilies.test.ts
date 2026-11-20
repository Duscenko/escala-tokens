// The Storybook is organised by FAMILY (design-plans/storybook-families.md): one Figma page = one sidebar entry and
// one Documentation page; its anatomy sets are parts merged into that entry. spec/storybook-families.json says which
// set is which; scripts/storybook/apply-families.mjs writes it into the story files. This test holds the three together.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { toId, storyNameFromExport } from 'storybook/internal/csf'

const ROOT = join(__dirname, '..', '..', '..')
const STORIES = join(ROOT, 'apps/storybook/stories')
const BLOCK_PAGES = new Set(['Auth', 'AuthSignInPhone', 'Overlay', 'HeaderNavigation', 'SidebarNavigation', 'Marketing', 'UserMenu & MorphNav (PRO)', 'Dashboard (PRO)', 'MediaPlayer & NowPlaying (PRO)', 'CardStack (PRO)', 'AuthPasskeySetup (PRO)', 'AuthTwoFactorSetup (PRO)'])

interface Family { id: string; page: string | null; folder: string; root: string | null; parts: string[] }
const manifest = JSON.parse(readFileSync(join(ROOT, 'spec/storybook-families.json'), 'utf8')) as {
  folders: string[]; families: Family[]; noStory: Record<string, string>
}
const inventory = JSON.parse(readFileSync(join(ROOT, 'spec/figma-components.json'), 'utf8')) as {
  pages: { page: string; sets: { name: string }[] }[]
}

/** set → { family, role }. A composed root (a family with no root set) is keyed by the family id. */
const plan = new Map<string, { family: Family; role: 'root' | 'part' }>()
for (const f of manifest.families) {
  plan.set(f.root ?? f.id, { family: f, role: 'root' })
  for (const p of f.parts) plan.set(p, { family: f, role: 'part' })
}
const titleOf = (f: Family) => `${f.folder}/${f.id}`

const storyFiles = readdirSync(STORIES).filter((n) => n.endsWith('.stories.tsx'))
const read = (set: string) => readFileSync(join(STORIES, `${set}.stories.tsx`), 'utf8')
const metaTitle = (src: string) => src.match(/^\s*title:\s*'([^']+)'/m)?.[1]
const exportsOf = (src: string) => [...src.matchAll(/^export const ([A-Za-z0-9_]+): Story\b/gm)].map((m) => m[1])

describe('Storybook families', () => {
  it('every Figma component set belongs to exactly one family, on the page it lives on', () => {
    const seen = new Map<string, string>()
    for (const f of manifest.families) for (const s of [f.root, ...f.parts].filter(Boolean) as string[]) {
      expect(seen.has(s), `${s} is in ${seen.get(s)} and ${f.id}`).toBe(false)
      seen.set(s, f.id)
    }
    for (const page of inventory.pages) {
      if (BLOCK_PAGES.has(page.page)) continue
      for (const { name } of page.sets) {
        const entry = plan.get(name)
        expect(entry, `Figma set ${name} (page "${page.page}") has no family in spec/storybook-families.json`).toBeDefined()
        expect(entry!.family.page, `${name}: family ${entry!.family.id} names another page`).toBe(page.page)
      }
    }
  })

  it('a family that is not in the Figma inventory yet says so (page: null)', () => {
    const inInventory = new Set(inventory.pages.flatMap((p) => p.sets.map((s) => s.name)))
    for (const f of manifest.families) {
      if (f.page !== null) continue
      for (const s of [f.root, ...f.parts].filter(Boolean) as string[]) expect(inInventory.has(s), `${s} is in the inventory now: give ${f.id} its page`).toBe(false)
    }
  })

  it('every set has one story file, or a reason it has none', () => {
    for (const [set] of plan) {
      const has = existsSync(join(STORIES, `${set}.stories.tsx`))
      if (manifest.noStory[set]) expect(has, `${set} has a story now: remove it from noStory`).toBe(false)
      else expect(has, `${set} has no story file (apps/storybook/stories/${set}.stories.tsx)`).toBe(true)
    }
  })

  it('every component story file belongs to the manifest', () => {
    const orphans = storyFiles.map((n) => n.replace('.stories.tsx', '')).filter((s) => !plan.has(s))
    expect(orphans, 'story files with no family: add them to spec/storybook-families.json').toEqual([])
  })

  it('titles and tags are the manifest’s (run scripts/storybook/apply-families.mjs)', () => {
    for (const [set, { family, role }] of plan) {
      if (manifest.noStory[set]) continue
      const src = read(set)
      expect(metaTitle(src), `${set}.stories.tsx title`).toBe(titleOf(family))
      const isPart = /tags:\s*\[[^\]]*'part'/.test(src)
      expect(isPart, `${set}: a ${role} ${role === 'part' ? 'needs' : 'must not have'} the part tag`).toBe(role === 'part')
      if (role === 'part') expect(src, `${set}: a part has no Documentation of its own`).toMatch(/'!autodocs'/)
    }
  })

  it('a family’s files never produce the same story id twice, and every root opens on a Playground', () => {
    for (const f of manifest.families) {
      const ids = new Map<string, string>()
      for (const set of [f.root ?? f.id, ...f.parts]) {
        if (manifest.noStory[set]) continue
        const exps = exportsOf(read(set))
        if (set === (f.root ?? f.id)) expect(exps[0], `${f.id}: the root's first story`).toBe('Playground')
        else for (const e of exps) expect(e.startsWith(set), `${set}: export ${e} must be prefixed with ${set}`).toBe(true)
        for (const e of exps) {
          const id = toId(titleOf(f), storyNameFromExport(e))
          expect(ids.has(id), `${id} is exported by ${ids.get(id)} and ${set}`).toBe(false)
          ids.set(id, set)
        }
      }
    }
  })

  it('story names follow one vocabulary: “All Combinations” is the full matrix, every other set is named by its axis', () => {
    // `AllSizes` / `AllTypes` / `AllVariants` were four names for two ideas: the matrix is All Combinations, a sweep
    // of one axis is that axis' plural (Sizes, Types, Layouts).
    for (const [set] of plan) {
      if (manifest.noStory[set]) continue
      for (const e of exportsOf(read(set))) {
        const local = e.startsWith(set) && e !== set ? e.slice(set.length) : e
        expect(/^All(?!Combinations$)[A-Z]/.test(local), `${set}: ${e} — use AllCombinations or the axis name`).toBe(false)
      }
    }
  })

  it('folders come from the manifest, in the sidebar’s order', () => {
    for (const f of manifest.families) expect(manifest.folders, `${f.id}: folder ${f.folder}`).toContain(f.folder)
    const preview = readFileSync(join(ROOT, 'apps/storybook/.storybook/preview.tsx'), 'utf8')
    // storySort is a literal (Storybook evaluates it on its own), so it is checked rather than derived.
    const NOT_COMPONENT_FOLDERS = new Set(['Getting started', 'Introduction', 'Variables', 'Blocks',
      'Color', 'Font', 'Radius', 'Spacing', 'Shadow', 'Grid', 'Sizes', 'Stroke', 'Icons', 'Motion'])
    const order = preview.match(/order:\s*\[(.*)\]/)?.[1] ?? ''
    const folders = [...order.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((n) => !NOT_COMPONENT_FOLDERS.has(n))
    expect(folders, 'preview.tsx storySort order').toEqual(manifest.folders)
  })
})
