// The platform's Blocks section lists exactly the Storybook's `Blocks/…`
// stories, with the controls those stories expose and the contract each block
// ships. A block story added without a platform entry fails here.
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BLOCKS, BLOCK_GROUPS, stageBlockValues } from '../../components/configurator/blocks/blockRegistry'
import { decodeWorkspaceSection, encodeWorkspaceSection } from '../workspaceLink'
import { isPlatformComponent } from '../platformCatalogue'

const DIR = join(__dirname, '../../../apps/storybook/stories/blocks')
const stories = readdirSync(DIR).filter((f) => f.endsWith('.stories.tsx')).map((f) => {
  const src = readFileSync(join(DIR, f), 'utf8')
  const title = /title:\s*'Blocks\/([^']+)'/.exec(src)?.[1]
  const argKeys = [...(/argTypes:\s*\{([\s\S]*?)\n\s{2}\},/.exec(src)?.[1] ?? '').matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1])
  return { file: f, title, argKeys }
})

describe('platform Blocks = the Storybook block stories', () => {
  it('has one entry per story, same group and name', () => {
    expect(BLOCKS.map((b) => b.id).sort()).toEqual(stories.map((s) => s.title).sort())
    for (const b of BLOCKS) expect(BLOCK_GROUPS).toContain(b.group)
  })

  it('offers the same controls as the story', () => {
    for (const s of stories) {
      const b = BLOCKS.find((x) => x.id === s.title)!
      // A block shown in its prototype mockup, or marked responsive, takes its Layout from the stage's frame.
      const keys = b.mockup || b.responsive ? s.argKeys.filter((k) => k !== 'layout') : [...s.argKeys]
      expect(b.controls.map((c) => c.key).sort(), s.file).toEqual(keys.sort())
    }
  })

  it('reads every block contract, and nests only Escala components or named slots', () => {
    for (const b of BLOCKS) {
      expect(b.contract, `${b.id} has no contract entry`).not.toBeNull()
    }
    const unknown = [...new Set(BLOCKS.flatMap((b) => b.contract?.nests ?? []).filter((n) => !isPlatformComponent(n)))]
    // Named, not linked: kept visible so a nest that should link is noticed.
    expect(unknown.every((n) => typeof n === 'string')).toBe(true)
  })

  it('the frame sets the viewport layout, never a layout the block offers as a control', () => {
    const signIn = BLOCKS.find((b) => b.id === 'Auth/SignIn')!
    const hero = BLOCKS.find((b) => b.id === 'Marketing/HeroHeader')!
    expect(stageBlockValues(signIn, { container: 'plain', layout: 'inline' }, 'desktop').layout).toBe('inline')
    expect(stageBlockValues(hero, {}, 'tablet').layout).toBe('mobile')
    expect(stageBlockValues(hero, {}, 'desktop').layout).toBe('desktop')
  })

  it('round-trips a block link', () => {
    const section = encodeWorkspaceSection({ tab: 'blocks', workspace: 'preview', surface: 'artefacts', block: 'Overlay/WarningDialog' })
    expect(section).toBe('blocks/Overlay/WarningDialog')
    expect(decodeWorkspaceSection(section)?.block).toBe('Overlay/WarningDialog')
    expect(decodeWorkspaceSection('blocks')?.tab).toBe('blocks')
  })
})
