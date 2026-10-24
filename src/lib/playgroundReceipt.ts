// The phone playground's two proofs, as pure functions (the component feeds
// them; plan: `design-plans/mobile-shuffle-playground.md`):
//
//   - the RECEIPT: after a shuffle, which tokens moved, by their real CSS
//     variable, and which parts of the card read each one. It is the lesson
//     Escala exists to teach — one variable, many components — so it lists
//     what the trace says the card reads, never a hand-picked showcase.
//   - the CONTRAST line: the same audit the System dashboard runs
//     (`auditResolvedRoles` over `CURATED_PAIRINGS.categorical`, scored by
//     `contrastSummary`), in light AND dark. One implementation, no second
//     checker.

import { auditResolvedRoles, CURATED_PAIRINGS } from './color/audit'
import { contrastSummary, type ContrastSummary } from './systemDashboard'
import type { TraceKind } from './tokenTrace'

/** One token the card reads, as the trace resolved it. */
export interface ReceiptRow {
  cssVar: string
  label: string
  kind: TraceKind
  value: string
  /** Type rows only: the family, which the summary value leaves out. */
  family?: string
  /** The parts (`data-demo` ids) that read this token. */
  parts: string[]
}

export interface ReceiptChange {
  cssVar: string
  label: string
  kind: TraceKind
  before: string
  after: string
  parts: string[]
}

/** Display order, and the round-robin the receipt deals from: one of each
 *  kind before a second of any, so four lines show four decisions. */
const KIND_ORDER: TraceKind[] = ['color', 'type', 'radius', 'spacing', 'size', 'shadow', 'stroke']

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** What a row says, the way a designer reads it: a type row by its family
 *  when the family is what moved, otherwise by its value. */
function shown(before: ReceiptRow, after: ReceiptRow): [string, string] {
  if (after.kind === 'type' && before.family && after.family && !same(before.family, after.family)) {
    return [before.family, after.family]
  }
  return [before.value, after.value]
}

const rgb = (hex: string) => {
  const m = /^#([0-9a-f]{6})/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** How far a value moved, comparable within one kind: sRGB distance for a
 *  colour (a ranking, not a contrast measure), the log of the ratio for a
 *  length, and a family swap over a size change for type. */
export function changeSize(kind: TraceKind, before: string, after: string): number {
  if (kind === 'color') {
    const a = rgb(before), b = rgb(after)
    return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 0
  }
  const x = parseFloat(before), y = parseFloat(after)
  if (Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0) return Math.abs(Math.log(y / x))
  return 1
}

/** Every token whose value changed: by kind, then the biggest move first,
 *  then the token the most parts read. */
export function diffReceipt(before: ReadonlyMap<string, ReceiptRow>, after: ReadonlyMap<string, ReceiptRow>): ReceiptChange[] {
  const out: ReceiptChange[] = []
  for (const [cssVar, next] of after) {
    const prev = before.get(cssVar)
    if (!prev) continue
    const [from, to] = shown(prev, next)
    if (same(from, to) && same(prev.family ?? '', next.family ?? '')) continue
    out.push({ cssVar, label: next.label, kind: next.kind, before: from, after: to, parts: next.parts })
  }
  const size = new Map(out.map((c) => [c.cssVar, changeSize(c.kind, c.before, c.after)]))
  return out.sort((a, b) =>
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    || size.get(b.cssVar)! - size.get(a.cssVar)!
    || b.parts.length - a.parts.length,
  )
}

/** The lines the receipt shows: round-robin over kinds, up to `max`. */
export function pickReceipt(changes: readonly ReceiptChange[], max = 4): ReceiptChange[] {
  const byKind = KIND_ORDER.map((kind) => changes.filter((c) => c.kind === kind))
  const out: ReceiptChange[] = []
  for (let round = 0; out.length < max; round++) {
    const dealt = byKind.map((list) => list[round]).filter(Boolean) as ReceiptChange[]
    if (!dealt.length) break
    out.push(...dealt.slice(0, max - out.length))
  }
  return out
}

/** The categorical audit over a system's resolved roles in both appearances
 *  (role id → css, per appearance). */
export function playgroundContrast(roles: { light: Record<string, string>; dark: Record<string, string> }): ContrastSummary {
  const resolved = new Map<string, Record<string, string>>()
  for (const mode of ['light', 'dark'] as const) {
    for (const [id, css] of Object.entries(roles[mode])) {
      const entry = resolved.get(id) ?? {}
      entry[mode] = css
      resolved.set(id, entry)
    }
  }
  const findings = auditResolvedRoles(resolved, ['light', 'dark'], CURATED_PAIRINGS.categorical ?? [], {
    system: 'playground',
    architecture: 'categorical',
    lenient: true,
  })
  return contrastSummary(findings)
}
