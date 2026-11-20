import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPONENT_KEYS } from '../componentCatalogue'
import { COMPONENT_RECIPES, resolveRecipe } from '../componentRecipes'
import { CONTRACT_SCHEMA, exportToIdPart, storybookSanitize } from '../componentContracts'
import { CONTRACTS_DIR, contractFiles } from '../../../scripts/gen-component-contracts'

describe('component contracts (spec/contracts/)', () => {
  const built = contractFiles()

  it('the committed files are exactly what `npm run gen:contracts` builds', () => {
    const committed = readdirSync(CONTRACTS_DIR).sort()
    expect(committed).toEqual(Object.keys(built).sort())
    for (const [name, body] of Object.entries(built)) {
      expect(readFileSync(join(CONTRACTS_DIR, name), 'utf8'), `${name} drifted — run npm run gen:contracts`).toBe(body)
    }
  })

  it('every catalogue component has one contract', () => {
    for (const key of COMPONENT_KEYS) expect(existsSync(join(CONTRACTS_DIR, `${key}.json`)), key).toBe(true)
  })

  it('every contract lists the tokens its recipe consumes, and only real token refs', () => {
    for (const key of COMPONENT_KEYS) {
      const c = JSON.parse(built[`${key}.json`])
      const refs = Object.values(c.tokens as Record<string, string[]>).flat()
      expect(refs.length, key).toBeGreaterThan(0)
      for (const ref of refs) expect(ref, `${key}: ${ref}`).toMatch(/^[a-z]+\.[a-z0-9.\-_]+$/)
    }
  })

  it('v2: every contract carries the agent sections', () => {
    for (const key of COMPONENT_KEYS) {
      const c = JSON.parse(built[`${key}.json`])
      expect(c.$schema, key).toBe(CONTRACT_SCHEMA)
      for (const k of ['names', 'bindings', 'motion', 'behaviour']) expect(k in c, `${key}.${k}`).toBe(true)
      expect(c.code.import, `${key} has no export`).not.toBeNull()
      expect(existsSync(join(CONTRACTS_DIR, '../..', `${c.code.import.module}.tsx`)) || existsSync(join(CONTRACTS_DIR, '../..', `${c.code.import.module}.ts`)), key).toBe(true)
      // every token ref has its CSS name
      for (const ref of Object.values(c.tokens as Record<string, string[]>).flat()) expect(c.names[ref]?.css, `${key}: ${ref}`).toMatch(/^--/)
    }
  })

  it('bindings resolve exactly like the recipe (an agent can trust them)', () => {
    const c = JSON.parse(built['Button.json'])
    const v = { Variant: 'critical', Appearance: 'outline', Size: 'sm', State: 'Hover' }
    const merged: Record<string, Record<string, string>> = {}
    for (const part of c.bindings as { axes: string[]; values: Record<string, Record<string, Record<string, string>>> }[]) {
      const entry = part.values[part.axes.map((a) => (v as Record<string, string>)[a] ?? c.api.defaults[a] ?? '').join('|')]
      for (const [slot, props] of Object.entries(entry ?? {})) merged[slot] = { ...merged[slot], ...props }
    }
    expect(merged).toEqual(resolveRecipe(COMPONENT_RECIPES.Button, v))
  })

  it('blocks are in the index and point at a real block contract', () => {
    const index = JSON.parse(built['index.json']) as { kind: string; key: string; file: string }[]
    const blocks = index.filter((e) => e.kind === 'block')
    expect(blocks.length).toBeGreaterThan(0)
    for (const b of blocks) expect(existsSync(join(CONTRACTS_DIR, '../..', b.file)), b.key).toBe(true)
    expect(new Set(index.map((e) => e.key)).size, 'a key is both a component and a block').toBe(index.length)
  })

  it('story ids follow Storybook’s own id rule', () => {
    expect(storybookSanitize('Content & Surfaces/Sheet')).toBe('content-surfaces-sheet')
    expect(exportToIdPart('CalendarDayPlayground')).toBe('calendar-day-playground')
    expect(exportToIdPart('Playground')).toBe('playground')
  })
})
