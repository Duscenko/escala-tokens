import { describe, expect, it } from 'vitest'
import { nextTourStep } from '../boardTour'

describe('board tour', () => {
  it('walks roll → inspect → ship → done, each on its own action', () => {
    expect(nextTourStep('roll', 'rolled')).toBe('inspect')
    expect(nextTourStep('inspect', 'inspected')).toBe('ship')
    expect(nextTourStep('ship', 'shipped')).toBe('done')
  })

  it('ignores actions out of order', () => {
    expect(nextTourStep('roll', 'inspected')).toBe('roll')
    expect(nextTourStep('roll', 'shipped')).toBe('roll')
    expect(nextTourStep('inspect', 'rolled')).toBe('inspect')
    expect(nextTourStep('ship', 'rolled')).toBe('ship')
  })

  it('skip ends it from any step, and done stays done', () => {
    for (const s of ['roll', 'inspect', 'ship'] as const) expect(nextTourStep(s, 'skip')).toBe('done')
    expect(nextTourStep('done', 'rolled')).toBe('done')
  })
})
