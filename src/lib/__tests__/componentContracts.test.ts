import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPONENT_KEYS } from '../componentCatalogue'
import { exportToIdPart, storybookSanitize } from '../componentContracts'
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

  it('story ids follow Storybook’s own id rule', () => {
    expect(storybookSanitize('Content & Surfaces/Sheet')).toBe('content-surfaces-sheet')
    expect(exportToIdPart('CalendarDayPlayground')).toBe('calendar-day-playground')
    expect(exportToIdPart('Playground')).toBe('playground')
  })
})
