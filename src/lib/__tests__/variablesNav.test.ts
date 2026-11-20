import { describe, expect, it } from 'vitest'
import { FOUNDATION_KEYS } from '../foundationKeys'
import { VARIABLES_NAV_GROUPS } from '../variablesNav'

describe("Variables' left column", () => {
  const listed = VARIABLES_NAV_GROUPS.flatMap((g) => g.keys)

  it('lists every foundation the Generator edits', () => {
    expect([...listed].sort()).toEqual([...FOUNDATION_KEYS].sort())
  })

  it('lists each foundation once', () => {
    expect(new Set(listed).size).toBe(listed.length)
  })
})
