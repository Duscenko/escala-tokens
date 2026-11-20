import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ComponentContract, ContractIndexEntry } from '../componentContracts'
import { REPORT_SOURCE, mergeFindings, motionGap, storyAxisIssues, type ContractGateBaseline, type GovernanceFinding, type StoryMetaLike } from '../contractGates'

/** Phase 2 gates of design-plans/agent-ready-contracts.md. Today's debt: spec/contract-gates.baseline.json. */
const ROOT = join(__dirname, '../../..')
const index: ContractIndexEntry[] = JSON.parse(readFileSync(join(ROOT, 'spec/contracts/index.json'), 'utf8'))
const contracts: ComponentContract[] = index
  .filter((e) => e.kind === 'component')
  .map((e) => JSON.parse(readFileSync(join(ROOT, e.file), 'utf8')))
const baseline: ContractGateBaseline = JSON.parse(readFileSync(join(ROOT, 'spec/contract-gates.baseline.json'), 'utf8'))

describe('contract gates', () => {
  it('PAR-001: every story playground has one control per contract axis, with its values and default', async () => {
    const fresh: string[] = []
    const stale: string[] = []
    for (const c of contracts) {
      if (!c.code.story) continue
      const mod = (await import(/* @vite-ignore */ join(ROOT, c.code.story.file))) as { default?: StoryMetaLike }
      const issues = storyAxisIssues(c, mod.default ?? {})
      const allowed = new Set(baseline['PAR-001'][c.key] ?? [])
      for (const i of issues) if (!allowed.has(i.axis)) fresh.push(`${c.key} · ${i.evidence}`)
      for (const axis of allowed) if (!issues.some((i) => i.axis === axis)) stale.push(`${c.key} · ${axis}`)
    }
    expect(fresh, 'story controls differ from the contract: fix the story (Figma owns the axes)').toEqual([])
    expect(stale, 'fixed — delete these from spec/contract-gates.baseline.json').toEqual([])
  }, 120_000)

  it('MOT-002: a component that changes state or opens has a motion decision', () => {
    const allowed = new Set(baseline['MOT-002'])
    const fresh = contracts.filter((c) => motionGap(c) && !allowed.has(c.key)).map((c) => `${c.key} · ${motionGap(c)}`)
    const stale = [...allowed].filter((k) => !contracts.some((c) => c.key === k && motionGap(c)))
    expect(fresh, 'add its entry to src/lib/recipes/motion.ts (motion roles by name)').toEqual([])
    expect(stale, 'decided — delete these from spec/contract-gates.baseline.json').toEqual([])
  })

  it('the baseline only names real contracts', () => {
    const keys = new Set(contracts.map((c) => c.key))
    for (const k of [...Object.keys(baseline['PAR-001']), ...baseline['MOT-002']]) expect(keys.has(k), k).toBe(true)
  })

  it('contracts:report merges findings: keeps history, closes what is gone, flags a regression', () => {
    const f = (id: string, extra: Partial<GovernanceFinding> = {}): GovernanceFinding => ({
      id, rule: id.split(':')[0], severity: 'warn', side: 'code', entity: 'X', evidence: 'e', status: 'Open',
      resolution: null, firstSeen: '2026-11-01', lastSeen: '2026-11-01', regression: false, source: REPORT_SOURCE, ...extra,
    })
    const human = f('COL-002:Border/control', { source: undefined })
    const existing = [human, f('DOC-001:A:contract', { ticket: 7 }), f('DOC-001:B:contract'), f('MOT-002:C', { status: 'Fixed', resolution: { ref: 'abc' } })]
    const computed = [f('DOC-001:A:contract', { evidence: 'new' }), f('MOT-002:C'), f('DOC-001:D:contract')]
    const out = mergeFindings(existing, computed, '2026-11-20', 'sha1')
    const by = Object.fromEntries(out.map((x) => [x.id, x]))
    expect(by['COL-002:Border/control']).toBe(human)
    expect(by['DOC-001:A:contract']).toMatchObject({ evidence: 'new', ticket: 7, firstSeen: '2026-11-01', lastSeen: '2026-11-20', status: 'Open' })
    expect(by['DOC-001:B:contract']).toMatchObject({ status: 'Fixed', resolution: { ref: 'sha1' } })
    expect(by['MOT-002:C']).toMatchObject({ status: 'Open', regression: true, severity: 'error', resolution: null })
    expect(by['DOC-001:D:contract']).toMatchObject({ firstSeen: '2026-11-20', lastSeen: '2026-11-20' })
  })
})
