import { describe, expect, it } from 'vitest'
import { FREE_EDIT_LIMIT, freeAgentContextBlocked } from '../freeEditBudget'

describe('free edit budget', () => {
  it('allows the agent context while changes remain', () => {
    expect(freeAgentContextBlocked(FREE_EDIT_LIMIT - 1, true)).toBe(false)
    expect(freeAgentContextBlocked(0, true)).toBe(false)
  })

  it('asks for Pro once the ten changes are spent', () => {
    expect(freeAgentContextBlocked(FREE_EDIT_LIMIT, true)).toBe(true)
    expect(freeAgentContextBlocked(FREE_EDIT_LIMIT + 4, true)).toBe(true)
  })

  it('does not apply to Pro, a signed-out visitor, or accounts that are off', () => {
    expect(freeAgentContextBlocked(FREE_EDIT_LIMIT, false)).toBe(false)
  })
})
