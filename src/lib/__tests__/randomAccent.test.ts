import { describe, expect, it } from 'vitest'
import { hexToOklch } from '../color/gamut'
import { readHuePosition } from '../colorUtils'
import {
  hueDelta,
  MIN_HUE_DELTA,
  RANDOM_MIN_SATURATION,
  randomAccent,
} from '../randomAccent'

function sequence(seed: number): () => number {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0x100000000
  }
}

const VIVID = '#9522e9'
const SLATE = '#6c737f'

describe('randomAccent', () => {
  it('is deterministic for a given rng', () => {
    expect(randomAccent(VIVID, sequence(1))).toBe(randomAccent(VIVID, sequence(1)))
  })

  it('never lands within MIN_HUE_DELTA of the seed', () => {
    const { hue } = readHuePosition(VIVID)
    for (let i = 0; i < 40; i++) {
      const next = randomAccent(VIVID, sequence(i + 3))
      expect(hueDelta(hue, readHuePosition(next).hue)).toBeGreaterThanOrEqual(MIN_HUE_DELTA)
      expect(next.toLowerCase()).not.toBe(VIVID.toLowerCase())
    }
  })

  it('keeps a vivid seed vivid — relative sat, not a ratchet', () => {
    const { position } = readHuePosition(VIVID)
    const next = randomAccent(VIVID, sequence(11))
    expect(readHuePosition(next).position.saturation).toBeGreaterThanOrEqual(position.saturation - 0.02)
  })

  it('turns a near-grey seed into a chromatic accent', () => {
    expect(readHuePosition(SLATE).position.saturation).toBeLessThan(RANDOM_MIN_SATURATION)
    const next = randomAccent(SLATE, sequence(7))
    expect(hexToOklch(next).c).toBeGreaterThan(hexToOklch(SLATE).c)
    expect(readHuePosition(next).position.saturation).toBeGreaterThanOrEqual(RANDOM_MIN_SATURATION - 0.02)
  })
})
