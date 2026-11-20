import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Auth setup blocks (AuthPasskeySetup, AuthTwoFactorSetup and the parts their pages keep): the contract ↔ the code ↔ the
// Figma snapshot. Rendering lives in Storybook; here the shape.
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const contract = JSON.parse(readFileSync(join(root, 'src/components/escala-ui/blocks/authSetup.contract.json'), 'utf8')) as {
  figma: { pages: Record<string, string> }
  blocks: { name: string; page: string; axes: Record<string, string>; variants: number; nests: string[]; parts?: string[]; motion: { role: string }[] }[]
}
const source = readFileSync(join(root, 'src/components/escala-ui/blocks/authSetup.tsx'), 'utf8')
const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
const snapshot = JSON.parse(readFileSync(join(root, 'spec/figma-components.json'), 'utf8')) as { pages: { page: string; id: string; sets: { name: string; variants: number; axes?: Record<string, string> }[] }[] }
const pages = snapshot.pages.filter((p) => p.page in contract.figma.pages)

describe('Auth setup blocks', () => {
  it('every Figma set of the two pages has a contract entry with its axes, and the code exports it', () => {
    expect(pages.map((p) => [p.page, p.id])).toEqual(Object.entries(contract.figma.pages))
    const figma = pages.flatMap((p) => p.sets.map((s) => ({ ...s, page: p.page })))
    expect(contract.blocks.map((b) => b.name).sort()).toEqual(figma.map((s) => s.name).sort())
    for (const block of contract.blocks) {
      const set = figma.find((s) => s.name === block.name)!
      expect(block.page, block.name).toBe(set.page)
      expect(block.axes, block.name).toEqual(set.axes ?? {})
      expect(block.variants, block.name).toBe(set.variants)
      expect(source, block.name).toContain(`export function ${block.name}(`)
      // The two blocks name themselves through the shared shell (`block=`), the parts on their own root (`data-block=`).
      expect(source, block.name).toContain(`block="${block.name}"`)
    }
  })

  it('draws only escala-ui components and role tokens: no hex, no px, no opacity, no motion duration of its own', () => {
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(code).not.toMatch(/\b\d+(\.\d+)?px\b/)
    expect(code).not.toMatch(/\d+ms\b|duration-|ease-|transition-/)
    expect(code).not.toMatch(/rgba?\(|hsla?\(/)
    // The one colour that is not a role: the QR's black on white (accepted exception, EXC-2026-11-19-003).
    expect([...code.matchAll(/=\s*'(white|black)'/g)].map((m) => m[1]).sort()).toEqual(['black', 'white'])
    // every component named in a contract is drawn by the block file
    for (const name of new Set(contract.blocks.flatMap((b) => b.nests))) expect(source, name).toContain(`<${name}`)
    for (const name of new Set(contract.blocks.flatMap((b) => b.parts ?? []))) expect(source, name).toContain(`data-block="${name}"`)
  })

  it('every block declares its motion (none counts) and only uses the existing roles', () => {
    const ROLES = /^(use-page-transition|use-disclosure-in|use-emphasis-in|use-loop|use-progress|use-hover|none)$/
    for (const block of contract.blocks) {
      expect(block.motion.length, block.name).toBeGreaterThan(0)
      for (const m of block.motion) expect(m.role, block.name).toMatch(ROLES)
    }
  })

  it('the QR carries the sample account as an otpauth link', async () => {
    const { AUTH_TWO_FACTOR_SETUP_URI, AUTH_TWO_FACTOR_SETUP_SECRET, AUTH_TWO_FACTOR_SETUP_CODES } = await import('../../components/escala-ui/blocks/authSetup')
    expect(AUTH_TWO_FACTOR_SETUP_URI).toBe('otpauth://totp/Ohmewn:ines%40ohmewn.app?secret=QK7MR2XD5LVNA3WE&issuer=Ohmewn')
    expect(AUTH_TWO_FACTOR_SETUP_SECRET).toMatch(/^[A-Z2-7]{16}$/)
    expect(AUTH_TWO_FACTOR_SETUP_CODES).toHaveLength(8)
  })
})
