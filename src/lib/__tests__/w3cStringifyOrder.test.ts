import { describe, expect, it } from 'vitest'
import { stringifyW3C } from '../figmaCollections'

describe('stringifyW3C', () => {
  it('writes a 01…12 ramp in tone order, not 10, 11, 12 first', () => {
    const ramp: Record<string, unknown> = {}
    for (let i = 1; i <= 12; i++) ramp[String(i).padStart(2, '0')] = { $type: 'color', $value: `#${i}` }
    // the plain object already lists 10, 11, 12 first — the bug this guards
    expect(Object.keys(ramp).slice(0, 3)).toEqual(['10', '11', '12'])
    const text = stringifyW3C({ Brand: ramp })
    const keys = [...text.matchAll(/^\s{4}"(\d+)": \{/gm)].map((m) => m[1])
    expect(keys).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'])
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify({ Brand: ramp })))
  })

  it('orders 25…950 and half steps numerically, leaves other groups alone', () => {
    const t = JSON.parse(stringifyW3C({ a: { 950: 1, 25: 1, 100: 1 }, b: { z: 1, a: 1 }, c: { '1': 1, '0_5': 1 } }))
    expect(Object.keys(t.a)).toEqual(['25', '100', '950'])
    expect(Object.keys(t.b)).toEqual(['z', 'a'])
    const raw = stringifyW3C({ c: { '1': 1, '0_5': 1 } })
    expect(raw.indexOf('"0_5"')).toBeLessThan(raw.indexOf('"1"'))
  })

  it('matches JSON.stringify formatting for plain data', () => {
    const v = { a: [1, { b: null }], c: 'x', d: {}, e: [] }
    expect(stringifyW3C(v)).toBe(JSON.stringify(v, null, 2))
  })
})
