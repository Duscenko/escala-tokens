import { describe, expect, it } from 'vitest'
import { COMPONENTS } from '../componentCatalogue'
import index from '../../../spec/contracts/index.json'

// design-plans/component-box-classification.md §4.1 / §4.5: no unclassified component ships.
describe('component box classification', () => {
  it('every catalogue entry has a box', () => {
    for (const c of COMPONENTS) expect(['black', 'gray', 'white'], c.key).toContain(c.box)
  })

  it('Black boxes lock shape, size, hit and motion', () => {
    for (const c of COMPONENTS.filter((d) => d.box === 'black')) {
      for (const lock of ['shape', 'size', 'hit', 'motion'] as const) expect(c.locks, c.key).toContain(lock)
    }
  })

  it('Gray boxes lock size, hit and motion but never shape', () => {
    for (const c of COMPONENTS.filter((d) => d.box === 'gray')) {
      for (const lock of ['size', 'hit', 'motion'] as const) expect(c.locks, c.key).toContain(lock)
      expect(c.locks, c.key).not.toContain('shape')
    }
  })

  it('White boxes lock nothing of their content', () => {
    for (const c of COMPONENTS.filter((d) => d.box === 'white')) expect(c.locks, c.key).toEqual([])
  })

  it('the classic Black boxes stay Black', () => {
    const box = (k: string) => COMPONENTS.find((c) => c.key === k)?.box
    for (const k of ['Checkbox', 'RadioGroup', 'Switch', 'Spinner']) expect(box(k), k).toBe('black')
    for (const k of ['Button', 'Input', 'Badge', 'Avatar']) expect(box(k), k).toBe('gray')
    for (const k of ['Card', 'Modal', 'Popover']) expect(box(k), k).toBe('white')
  })

  it('the contracts index carries box and locks', () => {
    // Blocks are compositions: no box, no locks.
    for (const e of index.filter((x: { kind?: string }) => x.kind !== 'block')) {
      const c = COMPONENTS.find((d) => d.key === e.key)
      expect(e.box, e.key).toBe(c?.box)
      expect(e.locks, e.key).toEqual(c?.locks)
    }
  })
})
