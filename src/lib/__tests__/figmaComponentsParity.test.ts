/**
 * The Figma file is the ground truth for COMPONENTS (CLAUDE.md, 2026-11-12):
 * a component in code must carry the Figma component set's name and variant axes,
 * value for value. This test holds the code catalogue against the committed
 * snapshot of the file (`spec/figma-components.json`) through a ledger of what is
 * not done yet (`spec/figma-components.status.json`).
 *
 * It does not ask that everything match today. It asks that the distance only ever
 * SHRINKS and that the ledger never lies:
 *  - every Figma component either matches the catalogue or is listed as pending;
 *  - a pending component that now matches must leave the ledger (no stale debt);
 *  - the ledger names only components the snapshot has;
 *  - no catalogue component appears outside Figma unless it is frozen as `codeOnly`
 *    (nothing new gets built on shadcn's vocabulary).
 *
 * Refresh the snapshot: design-plans/figma-components-inventory.md §5.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMPONENTS } from '../componentCatalogue'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

interface FigmaSet { name: string; variants: number; axes?: Record<string, string>; props?: string }
interface FigmaPage { page: string; stable: boolean; id: string; sets: FigmaSet[] }
type Pending =
  | { status: 'rebuild' | 'new' }
  | { status: 'rename'; code: string }
  | { status: 'part'; of: string }
  | { status: 'block'; page: string }

const snapshot = JSON.parse(readFileSync(join(root, 'spec/figma-components.json'), 'utf8')) as {
  checksum: string
  pages: FigmaPage[]
}
const ledger = JSON.parse(readFileSync(join(root, 'spec/figma-components.status.json'), 'utf8')) as {
  pending: Record<string, Pending>
  codeOnly: string[]
}

const figmaSets = snapshot.pages.flatMap((p) => p.sets)
const figmaNames = new Set(figmaSets.map((s) => s.name))
const catalogue = new Map(COMPONENTS.map((c) => [c.key, c]))

/** Axis name → sorted values, so order in Figma or code does not matter. */
function axisKey(axes: Record<string, string[]>): string {
  return JSON.stringify(Object.keys(axes).sort().map((k) => [k, [...axes[k]].sort()]))
}
function figmaAxes(s: FigmaSet): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(s.axes ?? {})) out[k] = v.split('|')
  return out
}
function matches(s: FigmaSet): boolean {
  const c = catalogue.get(s.name)
  if (!c) return false
  return axisKey(Object.fromEntries(c.axes.map((a) => [a.name, a.values]))) === axisKey(figmaAxes(s))
}

describe('code catalogue ↔ Figma file (spec/figma-components.json)', () => {
  it('the snapshot is the one Figma exported (not edited by hand)', () => {
    let h = 0x811c9dc5
    const s = JSON.stringify(snapshot.pages)
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    expect(('00000000' + h.toString(16)).slice(-8)).toBe(snapshot.checksum)
  })

  it('every Figma component matches the catalogue or is pending in the ledger', () => {
    const unaccounted = figmaSets.filter((s) => !matches(s) && !ledger.pending[s.name]).map((s) => s.name)
    expect(unaccounted, 'add them to spec/figma-components.status.json, or build them').toEqual([])
  })

  it('a component that now matches Figma has left the ledger', () => {
    const done = figmaSets.filter((s) => matches(s) && ledger.pending[s.name]).map((s) => s.name)
    expect(done, 'remove them from `pending` — they are done').toEqual([])
  })

  it('the ledger names only components the Figma file has', () => {
    const stale = Object.keys(ledger.pending).filter((n) => !figmaNames.has(n))
    expect(stale).toEqual([])
  })

  it('a rename points at a catalogue component that still exists', () => {
    const broken = Object.entries(ledger.pending)
      .filter(([, p]) => p.status === 'rename' && !catalogue.has((p as { code: string }).code))
      .map(([n]) => n)
    expect(broken).toEqual([])
  })

  it('no catalogue component lives outside Figma unless frozen as codeOnly', () => {
    const renamed = new Set(
      Object.values(ledger.pending).flatMap((p) => (p.status === 'rename' ? [p.code] : [])),
    )
    const outside = [...catalogue.keys()].filter(
      (k) => !figmaNames.has(k) && !renamed.has(k) && !ledger.codeOnly.includes(k),
    )
    expect(outside, 'a new component must exist in Figma first').toEqual([])
  })

  it('codeOnly lists only components that really are outside Figma and in the catalogue', () => {
    expect(ledger.codeOnly.filter((k) => figmaNames.has(k) || !catalogue.has(k))).toEqual([])
  })
})
