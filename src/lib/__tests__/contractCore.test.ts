import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTRACT_SHARED_FIELDS } from '../contractCore'
import {
  PACKAGE_CONTRACTS_INDEX, buildDesignSkillFiles, designSkillComponents, packageContract, packageContractPath,
} from '../agentBundle/productDesignSkills'
import type { TokenJSON } from '../agentBundle/types'

const CONTRACTS_DIR = join(__dirname, '../../../spec/contracts')
const committed = (key: string) => JSON.parse(readFileSync(join(CONTRACTS_DIR, `${key}.json`), 'utf8'))

describe('agent package contracts = spec/contracts on the shared core', () => {
  const keys = designSkillComponents()

  it('ships one contract per package component', () => {
    expect(keys.length).toBeGreaterThan(100)
  })

  it.each(keys)('%s: every shared field is the repo contract\'s, value for value', (key) => {
    const pkg = packageContract(key) as unknown as Record<string, unknown>
    const repo = committed(key)
    for (const field of CONTRACT_SHARED_FIELDS) expect(pkg[field], `${key}.${field}`).toEqual(repo[field])
    expect(pkg.behaviour && (pkg.behaviour as { authored: unknown }).authored, `${key}.behaviour.authored`).toEqual(repo.behaviour.authored)
    expect((pkg.figma as { catalogueSets: unknown }).catalogueSets).toEqual(repo.figma.catalogueSets)
  })

  it('same keys in the same order at every level an agent reads; repo-only fields are null', () => {
    for (const key of keys) {
      const pkg = packageContract(key)
      const repo = committed(key)
      expect(Object.keys(pkg), key).toEqual(Object.keys(repo))
      for (const section of ['figma', 'behaviour', 'code', 'docs'] as const) expect(Object.keys(pkg[section]), `${key}.${section}`).toEqual(Object.keys(repo[section]))
      expect([pkg.figma.set, pkg.figma.page, pkg.code.story, pkg.code.files, pkg.behaviour.primitives]).toEqual([null, null, null, null, null])
    }
  })

  it('buildDesignSkillFiles writes contracts/<Key>.json and contracts/index.json', () => {
    const json = { project: 'Test', colors: { primitive: {}, themeOrder: ['light'] }, atoms: ['Button'] } as unknown as TokenJSON
    const files = buildDesignSkillFiles(json)
    const index = JSON.parse(files.find((f) => f.path === PACKAGE_CONTRACTS_INDEX)!.text)
    expect(index.components.map((e: { key: string }) => e.key)).toEqual(keys)
    expect(index.components.find((e: { key: string }) => e.key === 'Button').selected).toBe(true)
    for (const key of keys) {
      const file = files.find((f) => f.path === packageContractPath(key))
      expect(file, key).toBeTruthy()
      expect(JSON.parse(file!.text).bindings).toEqual(committed(key).bindings)
    }
  })
})
