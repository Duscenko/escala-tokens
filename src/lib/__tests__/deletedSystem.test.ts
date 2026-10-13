import { describe, expect, it } from 'vitest'
import { DELETED_MARK, deletedPayload, isDeletedSystem } from '../deletedSystem'

describe('a deleted published system', () => {
  it('is recognised by its marker and nothing else', () => {
    expect(isDeletedSystem(deletedPayload(new Date('2026-10-14T10:00:00Z')))).toBe(true)
    expect(isDeletedSystem({ colors: { primitive: {} } })).toBe(false)
    expect(isDeletedSystem(null)).toBe(false)
    expect(isDeletedSystem([])).toBe(false)
    expect(isDeletedSystem({ [DELETED_MARK]: true })).toBe(false)
  })

  it('carries no tokens, so no consumer can read it as a system', () => {
    const payload = deletedPayload()
    expect(Object.keys(payload)).toEqual([DELETED_MARK])
    expect('colors' in payload).toBe(false)
  })
})
