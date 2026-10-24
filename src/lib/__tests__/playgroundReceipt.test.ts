import { describe, expect, it } from 'vitest'
import { diffReceipt, pickReceipt, playgroundContrast, type ReceiptChange, type ReceiptRow } from '../playgroundReceipt'

const row = (cssVar: string, kind: ReceiptRow['kind'], value: string, parts: string[] = ['card'], family?: string): [string, ReceiptRow] =>
  [cssVar, { cssVar, label: cssVar, kind, value, parts, family }]

describe('diffReceipt', () => {
  it('lists only the tokens whose value moved, ignoring hex case', () => {
    const before = new Map([
      row('--color-action-primary-default', 'color', '#2970FF', ['upgrade']),
      row('--color-content-primary', 'color', '#111111'),
      row('--radius-action', 'radius', '8px', ['upgrade', 'cancel']),
    ])
    const after = new Map([
      row('--color-action-primary-default', 'color', '#ff4405', ['upgrade']),
      row('--color-content-primary', 'color', '#111111'),
      row('--radius-action', 'radius', '8PX', ['upgrade', 'cancel']),
    ])
    const out = diffReceipt(before, after)
    expect(out.map((c) => c.cssVar)).toEqual(['--color-action-primary-default'])
    expect(out[0]).toMatchObject({ before: '#2970FF', after: '#ff4405', parts: ['upgrade'] })
  })

  it('names a type row by its family when the family is what moved', () => {
    const before = new Map([row('--text-button-*', 'type', '14px / 20px · 500', ['upgrade'], 'Inter')])
    const after = new Map([row('--text-button-*', 'type', '14px / 20px · 500', ['upgrade'], 'Courier Prime')])
    expect(diffReceipt(before, after)[0]).toMatchObject({ before: 'Inter', after: 'Courier Prime' })
  })

  it('within a kind, puts the biggest move first', () => {
    const before = new Map([
      row('--color-content-primary', 'color', '#d1e7ff', ['card', 'alert', 'badge', 'avatar']),
      row('--color-action-primary-default', 'color', '#2970ff', ['upgrade']),
    ])
    const after = new Map([
      row('--color-content-primary', 'color', '#bdedfd', ['card', 'alert', 'badge', 'avatar']),
      row('--color-action-primary-default', 'color', '#ff4405', ['upgrade']),
    ])
    expect(diffReceipt(before, after)[0].cssVar).toBe('--color-action-primary-default')
  })

  it('puts colour first and, for an equal move, the token most parts read', () => {
    const before = new Map([
      row('--radius-a', 'radius', '4px', ['card']),
      row('--radius-b', 'radius', '4px', ['card', 'alert', 'upgrade']),
      row('--color-x', 'color', '#000000'),
    ])
    const after = new Map([
      row('--radius-a', 'radius', '8px', ['card']),
      row('--radius-b', 'radius', '8px', ['card', 'alert', 'upgrade']),
      row('--color-x', 'color', '#ffffff'),
    ])
    expect(diffReceipt(before, after).map((c) => c.cssVar)).toEqual(['--color-x', '--radius-b', '--radius-a'])
  })
})

describe('pickReceipt', () => {
  const change = (cssVar: string, kind: ReceiptChange['kind']): ReceiptChange =>
    ({ cssVar, label: cssVar, kind, before: 'a', after: 'b', parts: ['card'] })

  it('deals one of each kind before a second of any', () => {
    const changes = [
      change('c1', 'color'), change('c2', 'color'), change('c3', 'color'),
      change('t1', 'type'), change('r1', 'radius'),
    ]
    expect(pickReceipt(changes, 4).map((c) => c.cssVar)).toEqual(['c1', 't1', 'r1', 'c2'])
  })

  it('stops when it runs out', () => {
    expect(pickReceipt([change('c1', 'color')], 4)).toHaveLength(1)
    expect(pickReceipt([], 4)).toEqual([])
  })
})

describe('playgroundContrast', () => {
  it('scores a readable pair as passing and an unreadable one as failing, per appearance', () => {
    const ok = playgroundContrast({
      light: { 'content.primary': '#111111', 'surface.page': '#ffffff' },
      dark: { 'content.primary': '#f5f5f5', 'surface.page': '#0c0e12' },
    })
    expect(ok.measured).toBe(2)
    expect(ok.failing).toEqual([])

    const bad = playgroundContrast({
      light: { 'content.primary': '#cccccc', 'surface.page': '#ffffff' },
      dark: { 'content.primary': '#f5f5f5', 'surface.page': '#0c0e12' },
    })
    expect(bad.failing.map((f) => f.theme)).toEqual(['light'])
  })
})
