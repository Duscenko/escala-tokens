// Contracts are published read-only for agents (`docs/agent-native/contracts/`).
// 1. Every contract the index lists ships as an asset, byte for byte.
// 2. The agent routers point at the public URL, so an agent can find it.

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTRACTS_PUBLIC_DIR, CONTRACTS_PUBLIC_URL, contractAssets } from '../../../scripts/contracts-publish'

const repoRoot = resolve(__dirname, '../../..')
const specDir = join(repoRoot, 'spec/contracts')

describe('contracts publish', () => {
  const assets = contractAssets(specDir)
  const byName = new Map(assets.map((a) => [a.fileName, a.source]))

  it('ships the index and every contract it lists, unchanged', () => {
    const index = JSON.parse(readFileSync(join(specDir, 'index.json'), 'utf8')) as { key: string; file: string }[]
    expect(byName.get(`${CONTRACTS_PUBLIC_DIR}/index.json`)).toBe(readFileSync(join(specDir, 'index.json'), 'utf8'))
    expect(index.length).toBeGreaterThan(0)
    for (const entry of index) {
      const file = entry.file.split('/').pop()!
      expect(byName.get(`${CONTRACTS_PUBLIC_DIR}/${file}`), entry.key).toBe(readFileSync(join(repoRoot, entry.file), 'utf8'))
    }
  })

  it('llms.txt and AGENTS.md name the public URL', () => {
    for (const f of ['llms.txt', 'AGENTS.md']) {
      expect(readFileSync(join(repoRoot, f), 'utf8'), f).toContain(CONTRACTS_PUBLIC_URL)
    }
  })
})
