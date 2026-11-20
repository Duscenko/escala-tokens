/**
 * The contract gates (design-plans/agent-ready-contracts.md, Phase 2): pure checks over a component
 * contract (`spec/contracts/<Key>.json`), shared by `contractGates.test.ts` (CI) and
 * `npm run contracts:report` (governance findings).
 *
 * - PAR-001 · the Storybook playground's controls equal the contract's `api.axes`: one control per
 *   axis, named as the axis, offering exactly its values, defaulting to `api.defaults`.
 * - MOT-002 · a component that changes state (a State axis), opens / closes or expands / collapses
 *   carries a motion decision (`motion` not null).
 * - DOC-001 · which agent-facing sections of a contract are still empty.
 *
 * Today's debt lives in `spec/contract-gates.baseline.json`: the gate fails on anything new, and on a
 * baseline entry that is no longer needed (so the list only shrinks).
 */
import type { ComponentContract } from './componentContracts'

/** What a story module's default export (CSF meta) carries that the gate reads. */
export interface StoryMetaLike {
  args?: Record<string, unknown>
  argTypes?: Record<string, { name?: string; options?: readonly unknown[]; control?: unknown } | undefined>
}

export interface ParIssue {
  key: string
  axis: string
  problem: 'missing' | 'values' | 'default'
  evidence: string
}

const BOOLEAN_VALUES = new Set(['false', 'true'])

function controlType(control: unknown): string | null {
  if (typeof control === 'string') return control
  if (control && typeof control === 'object' && 'type' in control) return String((control as { type: unknown }).type)
  return null
}

/** PAR-001: every contract axis has a story control with the same name, values and default. */
export function storyAxisIssues(contract: Pick<ComponentContract, 'key' | 'api'>, meta: StoryMetaLike): ParIssue[] {
  const issues: ParIssue[] = []
  const byName = new Map<string, { argKey: string; options?: readonly unknown[]; control?: unknown }>()
  for (const [argKey, t] of Object.entries(meta.argTypes ?? {})) {
    if (!t) continue
    byName.set(String(t.name ?? argKey), { argKey, options: t.options, control: t.control })
  }
  for (const axis of contract.api.axes) {
    const at = byName.get(axis.name)
    const key = contract.key
    if (!at) {
      issues.push({ key, axis: axis.name, problem: 'missing', evidence: `no story control named ${axis.name} (contract values ${axis.values.join(' · ')})` })
      continue
    }
    const want = [...axis.values].map(String).sort()
    const type = controlType(at.control)
    let ok: boolean
    let got: string
    if (at.options) {
      const have = [...at.options].map(String).sort()
      ok = have.join('\u0000') === want.join('\u0000')
      got = have.join(' · ')
    } else if (type === 'boolean') {
      ok = want.length === 2 && want.every((v) => BOOLEAN_VALUES.has(v))
      got = 'boolean'
    } else if (type === 'range' || type === 'number') {
      const c = at.control as { min?: number; max?: number; step?: number }
      const nums = want.map(Number)
      ok = nums.every((n) => Number.isFinite(n)
        && (c.min === undefined || n >= c.min) && (c.max === undefined || n <= c.max)
        && (!c.step || Math.abs(((n - (c.min ?? 0)) / c.step) - Math.round((n - (c.min ?? 0)) / c.step)) < 1e-9))
      got = `${type} ${c.min ?? ''}..${c.max ?? ''} step ${c.step ?? 1}`
    } else {
      ok = false
      got = `control ${type ?? 'none'} with no options`
    }
    if (!ok) {
      issues.push({ key, axis: axis.name, problem: 'values', evidence: `${axis.name}: contract ${axis.values.join(' · ')} ≠ story ${got}` })
      continue
    }
    const def = contract.api.defaults[axis.name]
    const storyDef = meta.args?.[at.argKey]
    if (def !== undefined && storyDef !== undefined && String(storyDef) !== String(def)) {
      issues.push({ key, axis: axis.name, problem: 'default', evidence: `${axis.name}: contract default ${def} ≠ story default ${String(storyDef)}` })
    }
  }
  return issues
}

/** Axis names that mean the component moves between visual states or opens / collapses. */
const MOVING_AXES = new Set(['State', 'Open', 'Expanded', 'Collapsed'])
const OPEN_PROPS = new Set(['open', 'defaultOpen', 'onOpenChange', 'expanded', 'collapsed', 'onCollapsedChange'])
/** WAI-ARIA patterns whose own component opens or expands (an Accordion's items carry its motion; a Dialog's header or footer is a part, not the mover). */
const MOVING_PATTERNS = new Set(['disclosure'])

/** MOT-002: why this component needs a motion decision, or null when it does not. */
export function motionTrigger(contract: Pick<ComponentContract, 'api' | 'behaviour'>): string | null {
  const axis = contract.api.axes.find((a) => MOVING_AXES.has(a.name))
  if (axis) return `${axis.name} axis (${axis.values.join(' · ')})`
  const prop = contract.api.props.find((p) => OPEN_PROPS.has(p.name))
  if (prop) return `\`${prop.name}\` prop`
  const prim = contract.behaviour.primitives.find((p) => p.pattern && MOVING_PATTERNS.has(p.pattern))
  if (prim) return `${prim.name} (${prim.pattern})`
  return null
}

/** MOT-002: the evidence when the component moves and has no motion decision, else null. */
export function motionGap(contract: Pick<ComponentContract, 'api' | 'behaviour' | 'motion'>): string | null {
  if (contract.motion !== null) return null
  const why = motionTrigger(contract)
  return why ? `${why} and no motion decision in the contract (recipes/motion.ts has no entry)` : null
}

/** DOC-001: the agent-facing sections a contract still lacks. Motion is MOT-002's, not listed here. */
export function emptySections(contract: ComponentContract): string[] {
  const out: string[] = []
  if (!contract.figma.set) out.push('figma set (codeOnly)')
  if (!contract.docs.humanContract) out.push('human contract (design-plans/*-contract.md)')
  if (!contract.code.story) out.push('story')
  if (!contract.code.import) out.push('code.import')
  if (contract.bindings.length === 0) out.push('bindings')
  const b = contract.behaviour
  if (b.primitives.length === 0 && b.roles.length === 0 && b.ariaAttributes.length === 0) out.push('behaviour')
  if (!contract.usage.trim()) out.push('usage')
  if (!contract.accessibility.trim()) out.push('accessibility')
  return out
}

/** The committed baseline of today's gaps (`spec/contract-gates.baseline.json`). */
export interface ContractGateBaseline {
  $comment?: string
  /** `<Key>` → axis names whose story control may differ today. */
  'PAR-001': Record<string, string[]>
  /** Keys that move and have no motion decision yet. */
  'MOT-002': string[]
}

/** A finding as `governance/findings/latest.json` stores it (governance skill §4.5). */
export interface GovernanceFinding {
  id: string
  rule: string
  severity: 'error' | 'warn' | 'info'
  side: 'figma' | 'code' | 'both'
  entity: string
  evidence: string
  status: 'Open' | 'Fixed' | 'Decided' | 'Accepted'
  resolution: { ref: string } | null
  firstSeen: string
  lastSeen: string
  regression: boolean
  source?: string
  links?: Record<string, string>
  [extra: string]: unknown
}

export const REPORT_SOURCE = 'contracts:report'
const RAISE: Record<GovernanceFinding['severity'], GovernanceFinding['severity']> = { info: 'warn', warn: 'error', error: 'error' }

/**
 * Merges the findings this run computed into the file's list. Only entries with
 * `source: contracts:report` are managed: a computed one keeps its firstSeen, status and ticket;
 * a managed Open one no longer computed becomes Fixed (resolution = `ref`); a Fixed one that comes
 * back is Open with `regression: true` and its severity raised one level. Everything else is kept as is.
 */
export function mergeFindings(existing: GovernanceFinding[], computed: GovernanceFinding[], today: string, ref: string): GovernanceFinding[] {
  const now = new Map(computed.map((f) => [f.id, f]))
  const out: GovernanceFinding[] = []
  const seen = new Set<string>()
  for (const old of existing) {
    if (old.source !== REPORT_SOURCE) { out.push(old); continue }
    seen.add(old.id)
    const f = now.get(old.id)
    if (!f) {
      out.push(old.status === 'Open' ? { ...old, status: 'Fixed', resolution: { ref } } : old)
      continue
    }
    const back = old.status === 'Fixed'
    out.push({
      ...old,
      ...f,
      severity: back ? RAISE[f.severity] : f.severity,
      status: back ? 'Open' : old.status,
      resolution: back ? null : old.resolution,
      firstSeen: old.firstSeen,
      lastSeen: today,
      regression: back || old.regression,
    })
  }
  for (const f of computed) if (!seen.has(f.id)) out.push({ ...f, firstSeen: today, lastSeen: today })
  return out
}
