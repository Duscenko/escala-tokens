import { describe, expect, it } from 'vitest'
import { makeDesignDefaults } from '../../store/useDesignStore'
import {
  ESCALA_SYSTEM_FORMAT,
  ESCALA_SYSTEM_PATH,
  parseEscalaSystem,
  serializeEscalaSystem,
} from '../escalaSystem'

describe('escalaSystem file', () => {
  it('round-trips a snapshot and optional publish claim', () => {
    const snapshot = makeDesignDefaults()
    snapshot.projectName = 'Acme'
    const json = serializeEscalaSystem({
      snapshot,
      publishSlug: 'acme',
      publishClaim: 'secret-claim',
      savedAt: '2026-08-22T00:00:00.000Z',
    })
    expect(ESCALA_SYSTEM_PATH).toBe('.escala/system.json')
    const parsed = parseEscalaSystem(JSON.parse(json))
    expect(parsed?.format).toBe(ESCALA_SYSTEM_FORMAT)
    expect(parsed?.publishSlug).toBe('acme')
    expect(parsed?.publishClaim).toBe('secret-claim')
    expect(parsed?.snapshot.projectName).toBe('Acme')
  })

  it('rejects anything that is not this format', () => {
    expect(parseEscalaSystem({ format: 'nope', snapshot: { projectName: 'x' } })).toBe(null)
    expect(parseEscalaSystem({ projectName: 'x' })).toBe(null)
    expect(parseEscalaSystem(null)).toBe(null)
  })

  it('omits an empty claim so a public repo does not get a blank secret field', () => {
    const json = serializeEscalaSystem({
      snapshot: makeDesignDefaults(),
      publishSlug: 'acme',
    })
    expect(JSON.parse(json).publishClaim).toBeUndefined()
  })
})
