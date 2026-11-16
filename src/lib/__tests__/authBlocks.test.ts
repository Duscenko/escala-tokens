import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Auth blocks (Queue C): the contract ↔ the code ↔ the Figma snapshot. Rendering lives in Storybook; here the shape.
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const contract = JSON.parse(readFileSync(join(root, 'src/components/escala-ui/blocks/auth.contract.json'), 'utf8')) as {
  blocks: { name: string; axes: Record<string, string>; variants: number; nests: string[]; motion: { role: string }[] }[]
}
const source = readFileSync(join(root, 'src/components/escala-ui/blocks/auth.tsx'), 'utf8')
const snapshot = JSON.parse(readFileSync(join(root, 'spec/figma-components.json'), 'utf8')) as { pages: { page: string; sets: { name: string; variants: number; axes?: Record<string, string> }[] }[] }
const figmaAuth = snapshot.pages.find((p) => p.page === 'Auth')!.sets

describe('Auth blocks', () => {
  it('every Figma Auth set has a contract entry with its axes, and the code exports it', () => {
    expect(contract.blocks.map((b) => b.name).sort()).toEqual(figmaAuth.map((s) => s.name).sort())
    for (const block of contract.blocks) {
      const set = figmaAuth.find((s) => s.name === block.name)!
      expect(block.axes, block.name).toEqual(set.axes ?? {})
      expect(block.variants, block.name).toBe(set.variants)
      expect(source, block.name).toContain(`export function ${block.name}(`)
    }
  })

  it('draws only escala-ui components and role tokens: no hex, no px, no motion duration of its own', () => {
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/\b\d+(\.\d+)?px\b/)
    expect(source).not.toMatch(/\d+ms\b|duration-|ease-|transition-/)
    // every component named in a contract is imported by the block file
    for (const name of new Set(contract.blocks.flatMap((b) => b.nests))) expect(source, name).toContain(`<${name}`)
  })

  it('every block declares its motion (none counts) and only uses the existing roles', () => {
    const ROLES = /^(use-page-transition|use-disclosure-in \/ use-disclosure-out|popover-enter \/ popover-exit|use-celebration|none)$/
    for (const block of contract.blocks) {
      expect(block.motion.length, block.name).toBeGreaterThan(0)
      for (const m of block.motion) expect(m.role, block.name).toMatch(ROLES)
    }
  })
})
