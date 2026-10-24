import { afterEach, describe, expect, it, vi } from 'vitest'
import { HAPTIC_PATTERNS, haptic, hapticEngine, hapticsEnabled, setHapticsEnabled } from '../haptics'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v) },
    removeItem: (k: string) => { map.delete(k) },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('haptics', () => {
  it('is on by default, and when storage is missing or blocked', () => {
    expect(hapticsEnabled()).toBe(true)
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') } })
    expect(hapticsEnabled()).toBe(true)
  })

  it('remembers off and on', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    setHapticsEnabled(false)
    expect(hapticsEnabled()).toBe(false)
    setHapticsEnabled(true)
    expect(hapticsEnabled()).toBe(true)
  })

  it('vibrates the kind pattern where the Vibration API exists', () => {
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate })
    vi.stubGlobal('localStorage', memoryStorage())
    expect(hapticEngine()).toBe('vibrate')
    haptic('success')
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.success)
  })

  it('stays silent when turned off', () => {
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate })
    vi.stubGlobal('localStorage', memoryStorage())
    setHapticsEnabled(false)
    haptic('tick')
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('does nothing, and does not throw, without any engine', () => {
    vi.stubGlobal('navigator', {})
    expect(hapticEngine()).toBe(null)
    expect(() => haptic('tap')).not.toThrow()
  })

  it('keeps every pattern short (a tick, not a buzz)', () => {
    for (const p of Object.values(HAPTIC_PATTERNS)) {
      const total = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p
      expect(total).toBeLessThanOrEqual(120)
    }
  })
})
