import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPONENT_BEHAVIOUR } from '../componentBehaviour'
import type { ComponentContract } from '../componentContracts'

/** Phase 3 of design-plans/agent-ready-contracts.md: authored behaviour points at real code and stories. */
const ROOT = join(__dirname, '../../..')
const contract = (key: string): ComponentContract | null => {
  const f = join(ROOT, 'spec/contracts', `${key}.json`)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null
}

describe('componentBehaviour.ts', () => {
  it('every entry names a contract, a file that draws it and a story export it has', () => {
    for (const [key, b] of Object.entries(COMPONENT_BEHAVIOUR)) {
      const c = contract(key)
      expect(c, `${key} is not a contract`).not.toBeNull()
      const file = b.source.split(' · ')[0]
      expect(c!.code.files, `${key}: ${file}`).toContain(file)
      expect(c!.code.story, `${key} has no story`).not.toBeNull()
      const story = readFileSync(join(ROOT, c!.code.story!.file), 'utf8')
      expect(story, `${key}: export ${b.story}`).toMatch(new RegExp(`export const ${b.story}\\b`))
      expect(c!.behaviour.authored, `${key}: run npm run gen:contracts`).toEqual(b)
    }
  })

  it('a component file that handles keys itself has its behaviour authored', () => {
    const dir = join(ROOT, 'src/components/escala-ui')
    const authoredFiles = new Set(Object.values(COMPONENT_BEHAVIOUR).map((b) => b.source.split(' · ')[0]))
    const missing = readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && /\b(?:e|event)\.key\b/.test(readFileSync(join(dir, f), 'utf8')))
      .map((f) => `src/components/escala-ui/${f}`)
      .filter((f) => !authoredFiles.has(f))
    expect(missing, 'add its keys to src/lib/componentBehaviour.ts').toEqual([])
  })
})
