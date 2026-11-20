import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ComponentContract } from '../componentContracts'
import { mergeFindings, type GovernanceFinding } from '../contractGates'
import { BINDINGS_SOURCE, encode, expectationOf, findingsOf, PART_LAYER, prepare } from '../../../scripts/figma-bindings'

/** Phase 5 (2/2) of design-plans/agent-ready-contracts.md: Figma per-state bindings vs `bindings`. */
const ROOT = join(__dirname, '../../..')
const load = (key: string): ComponentContract => JSON.parse(readFileSync(join(ROOT, `spec/contracts/${key}.json`), 'utf8'))
const button = load('Button')
const TEMPLATE = readFileSync(join(ROOT, 'scripts/figma/bindings-check.figma.js'), 'utf8')

type Paint = { type: string; visible?: boolean; opacity?: number; boundVariables?: { color?: { id: string } } }
const solid = (id: string | null, opacity = 1): Paint => ({ type: 'SOLID', opacity, ...(id ? { boundVariables: { color: { id } } } : {}) })
interface FakeNode { id: string; name: string; type: string; fills?: Paint[]; strokes?: Paint[]; children?: FakeNode[]; visible?: boolean }

/** Runs the Figma script on a fake file: variables by id → name (+ alpha), nodes by id. */
async function runTemplate(expect: unknown, nodes: FakeNode[], vars: Record<string, { name: string; a?: number }>) {
  const byId = new Map<string, FakeNode>()
  const index = (n: FakeNode) => { byId.set(n.id, n); n.children?.forEach(index) }
  nodes.forEach(index)
  const figma = {
    getNodeByIdAsync: async (id: string) => byId.get(id) ?? null,
    variables: {
      getVariableByIdAsync: async (id: string) => vars[id]
        ? { name: vars[id].name, resolveForConsumer: () => ({ value: { r: 0, g: 0, b: 0, a: vars[id].a ?? 1 } }) }
        : null,
    },
  }
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
  return new AsyncFunction('figma', 'EXPECT', TEMPLATE)(figma, expect) as Promise<{ checked: Record<string, unknown[]>; diffs: unknown[][] }>
}

describe('figma bindings check', () => {
  it('builds the expected Figma roles per state from the contract', () => {
    const names: string[] = []
    const e = expectationOf(button, names)!
    expect(e).toMatchObject({ key: 'Button', id: button.figma.setNodeId })
    const rule = e.rules.find((r) => r.a.join() === 'Variant,Appearance,State')!
    expect(names[rule.v['default|solid|Hover'].root.f!]).toBe('Action/primary/hover')
    expect(names[rule.v['default|solid|Hover'].root.t!]).toBe('Content/on-action')
    expect(rule.v['default|solid|Hover'].root.s).toBe(-1) // `none`
  })

  it('every prepared batch fits a use_figma call', () => {
    for (const file of prepare(ROOT)) expect(readFileSync(file, 'utf8').length).toBeLessThan(50_000)
  })

  it('the Figma script reports a wrong role, ignores Figma mirroring a role alpha into paint.opacity', async () => {
    const names: string[] = []
    const e = expectationOf(button, names)!
    const wire = encode({ names, sets: [e] })
    const vars = { v1: { name: 'Action/primary/hover' }, v2: { name: 'Content/on-action' }, v3: { name: 'Action/primary/default' }, v4: { name: 'Action/ghost/hover', a: 0.05 }, v5: { name: 'Border/accent' }, v6: { name: 'Content/accent' } }
    const label = (id: string, v: string): FakeNode => ({ id, name: 'label', type: 'TEXT', fills: [solid(v)] })
    const set: FakeNode = {
      id: button.figma.setNodeId!, name: 'Button', type: 'COMPONENT_SET', children: [
        { id: '1:1', name: 'Variant=default, Appearance=solid, Size=default, State=Hover', type: 'COMPONENT', fills: [solid('v1')], strokes: [], children: [label('1:2', 'v2')] },
        { id: '1:3', name: 'Variant=default, Appearance=solid, Size=sm, State=Hover', type: 'COMPONENT', fills: [solid('v3')], strokes: [], children: [label('1:4', 'v2')] },
        { id: '1:5', name: 'Variant=default, Appearance=outline, Size=default, State=Hover', type: 'COMPONENT', fills: [solid('v4', 0.05)], strokes: [solid('v5')], children: [label('1:6', 'v6')] },
      ],
    }
    const out = await runTemplate(wire, [set], vars)
    expect(out.checked.Button[0]).toBe(3)
    expect(out.diffs).toEqual([['Button', 'r', 'root', 'f', 'Action/primary/hover', 'Action/primary/default', 1, '1:3']])
  })

  it('writes PAR-001 findings and closes only what the run checked', () => {
    const byKey = new Map([['Button', button]])
    const found = findingsOf([{ checked: { Button: [1, 1] }, notChecked: [], diffs: [['Button', 'r', 'root', 'f', 'Action/primary/hover', 'Action/primary/default', 4, '1:3']] }], byKey)
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ id: 'PAR-001:Button:root.fill=Action/primary/hover', rule: 'PAR-001', side: 'both', source: BINDINGS_SOURCE })
    expect(found[0].links?.figma).toContain('node-id=1-3')
    const old = (entity: string): GovernanceFinding => ({ ...found[0], id: `PAR-001:${entity}:root.fill=x`, entity, firstSeen: '2026-11-19', lastSeen: '2026-11-19' })
    const out = mergeFindings([old('Badge'), old('Button')], found, '2026-11-20', 'r', { source: BINDINGS_SOURCE, scope: new Set(['Button']) })
    const by = Object.fromEntries(out.map((f) => [f.id, f]))
    expect(by['PAR-001:Badge:root.fill=x'].status).toBe('Open') // not checked this run: kept
    expect(by['PAR-001:Button:root.fill=x'].status).toBe('Fixed')
  })

  it('Phase 6: reads a stacked fill, the focus edge as the stroke, and Figma layer names', () => {
    const names: string[] = []
    const close = expectationOf(load('CloseButton'), names)!
    const v = close.rules.find((r) => r.a.join() === 'Variant,Appearance,State')!.v
    expect(names[v['default|solid|Pressed'].root.f!]).toBe('Surface/inverse + Surface/inverse-muted + Surface/inverse-muted')
    expect(names[v['default|outline|Focused'].root.s!]).toBe('Border/strong') // `focus` repaints the border
    expect(close.ax?.Variant).toEqual(['default', 'inverse'])
    const group = expectationOf(load('AvatarGroup'), names)!
    expect(Object.keys(group.rules[0].v['']).sort()).toContain(PART_LAYER.AvatarGroup.action)
  })

  it('Phase 6: the Figma script matches a paint stack and skips a variant value the contract lacks', async () => {
    const names: string[] = []
    const e = expectationOf(load('CloseButton'), names)!
    const wire = encode({ names, sets: [e] })
    const vars = { a: { name: 'Surface/inverse' }, b: { name: 'Surface/inverse-muted', a: 0.2 }, c: { name: 'Content/inverse' } }
    const icon = (id: string): FakeNode => ({ id, name: 'label', type: 'TEXT', fills: [solid('c')] })
    const set: FakeNode = {
      id: e.id, name: 'CloseButton', type: 'COMPONENT_SET', children: [
        { id: '2:1', name: 'Appearance=solid, Shape=rounded, Size=sm, State=Hover, Variant=default', type: 'COMPONENT', fills: [solid('a'), solid('b', 0.2)], strokes: [], children: [icon('2:2')] },
        { id: '2:3', name: 'Appearance=solid, Shape=rounded, Size=sm, State=Hover, Variant=brand', type: 'COMPONENT', fills: [solid('a')], strokes: [], children: [icon('2:4')] },
      ],
    }
    const out = await runTemplate(wire, [set], vars)
    expect(out.diffs).toEqual([])
    expect(out.checked.CloseButton).toContain('Variant=brand not in the contract')
  })
})
