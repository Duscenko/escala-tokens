/**
 * Figma ↔ contract bindings check (governance §4.5.2), read-only on the Figma library.
 *
 *   npm run figma:bindings:prepare [-- --only=Button,Checkbox]   writes reports/figma-bindings/batch-<n>.figma.js
 *   (run each batch with `use_figma` on 7j5zukN5HpihGVJMmyjA20; save each returned JSON as a file)
 *   npm run figma:bindings:report -- <result.json>…   → governance/findings/latest.json
 *
 * `prepare` embeds, per component with a Figma set (`figma.setNodeId`), the colour roles its
 * contract binds per state (`bindings`: fill · stroke · text, root and named parts) under their
 * Figma names, into `scripts/figma/bindings-check.figma.js`. The Figma script returns only the
 * differences. `report` writes them as findings with `source: "figma:bindings"`:
 * - PAR-001 (error) Figma binds another role than the contract at that state (side `decide`:
 *   Figma owns anatomy, so normally Storybook copies it; the owner confirms which side moved);
 * - TOK-004 (error) the role is right but the paint carries an opacity (code copies the role only);
 * - TOK-001 (error) a paint where the contract binds a role is not bound to any variable.
 * Only components the run checked are closed when a difference is gone, so a partial run never
 * marks unchecked work as fixed.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ComponentContract, ContractIndexEntry } from '../src/lib/componentContracts'
import { mergeFindings, type GovernanceFinding } from '../src/lib/contractGates'
import { ROOT } from './gen-component-contracts'

export const BINDINGS_SOURCE = 'figma:bindings'
const FINDINGS = join(ROOT, 'governance/findings/latest.json')
const OUT_DIR = join(ROOT, 'reports/figma-bindings')
const TEMPLATE = join(ROOT, 'scripts/figma/bindings-check.figma.js')
const GITHUB = 'https://github.com/Duscenko/escala-tokens/blob/main'
/** `use_figma` accepts 50 000 characters of code; leave room for the template. */
const BATCH_BUDGET = 42_000
const SLOT = { fill: 'f', stroke: 's', text: 't' } as const

interface Rule { a: string[]; v: Record<string, Record<string, Partial<Record<'f' | 's' | 't', number>>>> }
interface SetExpectation { key: string; id: string; rules: Rule[]; ax?: Record<string, string[]> }

function contracts(root = ROOT): ComponentContract[] {
  const index: ContractIndexEntry[] = JSON.parse(readFileSync(join(root, 'spec/contracts/index.json'), 'utf8'))
  return index.filter((e) => e.kind === 'component').map((e) => JSON.parse(readFileSync(join(root, e.file), 'utf8')))
}

/**
 * Where the code's part name and the Figma layer name differ for the same layer (layers are not
 * mapped to code by name; Figma owns the layer name). Checked 2026-11-20 on the library: the
 * CalendarPresets rail label, the ComboboxPopover empty state and the AvatarGroup +N tile (code
 * wraps it in an `item` ring, Figma names the ring `action` and the tile `action-surface`).
 */
export const PART_LAYER: Record<string, Record<string, string>> = {
  CalendarPresets: { label: 'rail-label' },
  ComboboxPopover: { empty: 'empty-state' },
  AvatarGroup: { action: 'action-surface' },
  // The code's `content` is the Sheet panel, which Figma draws on the variant itself; Figma's `Content` slot is the code's `body`.
  Sheet: { content: 'root', body: 'content' },
}

/** The colour roles a contract binds per state, under their Figma names (a table shared per batch). */
export function expectationOf(c: ComponentContract, names: string[]): SetExpectation | null {
  if (!c.figma.setNodeId || !c.bindings?.length) return null
  const at = (figma: string) => { let i = names.indexOf(figma); if (i < 0) { names.push(figma); i = names.length - 1 } return i }
  const figmaOf = (ref: unknown) => (typeof ref === 'string' && ref.startsWith('color.') ? c.names[ref]?.figma ?? null : null)
  const rules: Rule[] = []
  const seen: Record<string, Set<string>> = {}
  for (const b of c.bindings) {
    const v: Rule['v'] = {}
    for (const [combo, parts] of Object.entries(b.values)) {
      combo.split('|').forEach((val, i) => { if (b.axes[i]) (seen[b.axes[i]] ??= new Set()).add(val) })
      for (const [part, props] of Object.entries(parts)) {
        if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(part)) continue // pseudo parts (`root::after`, `root[data-…]`)
        const layer = PART_LAYER[c.key]?.[part] ?? part
        for (const [slot, raw] of Object.entries(props)) {
          if (!(slot in SLOT) || typeof raw !== 'string') continue
          let ref: string = raw
          // A focused control's `focus` edge repaints its border (recipeStyles: border-color + inset),
          // so Figma's stroke at that state is the focus role, not the resting `stroke`.
          if (slot === 'stroke' && typeof props.focus === 'string' && props.focus !== 'none') ref = props.focus
          let idx: number | null = null
          if (slot === 'fill' && typeof props.fillMid === 'string' && typeof props.fillEnd === 'string') {
            // A gradient fill (fill → fillMid → fillEnd): Figma binds each stop.
            const stops = [ref, props.fillMid, props.fillEnd].map(figmaOf)
            if (stops.every(Boolean)) idx = at(stops.join(' → '))
          } else if (slot === 'fill' && (typeof props.overlay === 'string' || typeof props.overlay2 === 'string')) {
            // Translucent fills stacked over the fill (`overlay`, `overlay2`): Figma draws them as a
            // paint stack, read bottom to top.
            const stack = [ref, props.overlay, props.overlay2].filter((r) => typeof r === 'string' && r !== 'none').map(figmaOf)
            if (stack.length && stack.every(Boolean)) idx = at(stack.join(' + '))
          } else if (ref === 'none') idx = -1
          else if (figmaOf(ref)) idx = at(figmaOf(ref)!)
          if (idx == null) continue
          ;((v[combo] ??= {})[layer] ??= {})[SLOT[slot as keyof typeof SLOT]] = idx
        }
      }
    }
    if (Object.keys(v).length) rules.push({ a: b.axes, v })
  }
  // The values the contract knows per axis: a Figma variant with another value (a variant the code
  // has not built yet) is not compared, it is listed as not checked.
  const ax = Object.fromEntries(Object.entries(seen).map(([k, vals]) => [k, [...vals]]))
  return rules.length ? { key: c.key, id: c.figma.setNodeId, rules, ax } : null
}

/** Compact wire form: slot objects deduplicated into a table (`use_figma` takes 50 000 characters). */
interface WireBatch { names: string[]; parts: (string | number | null)[][]; sets: { key: string; id: string; ax?: Record<string, string[]>; rules: { a: string[]; v: Record<string, number[]> }[] }[] }
export function encode(b: { names: string[]; sets: SetExpectation[] }): WireBatch {
  const parts: WireBatch['parts'] = []
  const seen = new Map<string, number>()
  const at = (row: (string | number | null)[]) => {
    const k = JSON.stringify(row)
    if (!seen.has(k)) { seen.set(k, parts.length); parts.push(row) }
    return seen.get(k)!
  }
  return {
    names: b.names,
    parts,
    sets: b.sets.map((st) => ({
      key: st.key, id: st.id, ax: st.ax,
      rules: st.rules.map((r) => ({
        a: r.a,
        v: Object.fromEntries(Object.entries(r.v).map(([combo, ps]) => [combo, Object.entries(ps).map(([part, sl]) => at([part, sl.f ?? null, sl.s ?? null, sl.t ?? null]))])),
      })),
    })),
  }
}

export function prepare(root = ROOT, only?: Set<string>): string[] {
  // Comments and indentation stripped: the batch travels inside a `use_figma` call.
  const template = readFileSync(TEMPLATE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n')
  const batches: { names: string[]; sets: SetExpectation[] }[] = []
  let cur = { names: [] as string[], sets: [] as SetExpectation[] }
  for (const c of contracts(root)) {
    if (only && !only.has(c.key)) continue
    const trial = { names: [...cur.names], sets: cur.sets }
    const e = expectationOf(c, trial.names)
    if (!e) continue
    if (cur.sets.length && JSON.stringify(encode({ names: trial.names, sets: [...cur.sets, e] })).length > BATCH_BUDGET) {
      batches.push(cur)
      cur = { names: [], sets: [] }
      const fresh = expectationOf(c, cur.names)!
      cur.sets.push(fresh)
    } else {
      cur = { names: trial.names, sets: [...cur.sets, e] }
    }
  }
  if (cur.sets.length) batches.push(cur)
  mkdirSync(OUT_DIR, { recursive: true })
  return batches.map((b, i) => {
    const file = join(OUT_DIR, `batch-${i + 1}.figma.js`)
    writeFileSync(file, `const EXPECT = ${JSON.stringify(encode(b))}\n${template}`)
    return file
  })
}

/** [key, kind (r = role · o = opacity), part, slot (f · s · t), want, got, variants, sample variant id] */
type Diff = [string, 'r' | 'o', string, 'f' | 's' | 't', string, string, number, string]
/** checked: key → [variants, slots compared, …what was skipped and why] */
interface RunResult { checked: Record<string, (number | string)[]>; notChecked: { key: string; why: string }[]; diffs: Diff[] }
const SLOT_NAME = { f: 'fill', s: 'stroke', t: 'text' } as const

const figmaUrl = (id: string) => `https://www.figma.com/design/7j5zukN5HpihGVJMmyjA20/?node-id=${id.replace(':', '-')}`

export function findingsOf(runs: RunResult[], byKey: Map<string, ComponentContract>): GovernanceFinding[] {
  const out: GovernanceFinding[] = []
  for (const run of runs) for (const [key, kind, part, s, want, got, variants, sample] of run.diffs) {
    const c = byKey.get(key)
    const slot = SLOT_NAME[s]
    const rule = kind === 'o' ? 'TOK-004' : got === 'unbound' ? 'TOK-001' : 'PAR-001'
    const links: Record<string, string> = { figma: figmaUrl(sample), contract: `${GITHUB}/spec/contracts/${key}.json` }
    if (c?.figma.setUrl) links.figmaSet = c.figma.setUrl
    if (c?.code.story?.url) links.storybook = c.code.story.url
    out.push({
      id: `${rule}:${key}:${part}.${slot}=${want}`,
      rule,
      severity: 'error',
      side: rule === 'PAR-001' ? 'both' : 'figma',
      entity: key,
      evidence: `${part}.${slot}: Figma ${got}, contract ${want} — ${variants} variant(s), e.g. node ${sample}`,
      status: 'Open', resolution: null, firstSeen: '', lastSeen: '', regression: false,
      source: BINDINGS_SOURCE, links,
    })
  }
  // One finding per fingerprint: several `got` values for the same want are one difference.
  const merged = new Map<string, GovernanceFinding>()
  for (const f of out) {
    const prev = merged.get(f.id)
    merged.set(f.id, prev ? { ...prev, evidence: `${prev.evidence}; ${f.evidence}` } : f)
  }
  return [...merged.values()]
}

function report(files: string[]) {
  const runs: RunResult[] = files.map((f) => JSON.parse(readFileSync(f, 'utf8')))
  const byKey = new Map(contracts().map((c) => [c.key, c]))
  const computed = findingsOf(runs, byKey)
  const checked = new Set(runs.flatMap((r) => Object.keys(r.checked)))
  const today = new Date().toISOString().slice(0, 10)
  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()
  const file = JSON.parse(readFileSync(FINDINGS, 'utf8')) as { generated: string; findings: GovernanceFinding[] }
  const findings = mergeFindings(file.findings, computed, today, `figma-bindings ${sha}`, { source: BINDINGS_SOURCE, scope: checked })
  writeFileSync(FINDINGS, `${JSON.stringify({ ...file, generated: today, findings }, null, 2)}\n`)
  const by = (rule: string) => computed.filter((f) => f.rule === rule).length
  const notChecked = runs.flatMap((r) => r.notChecked)
  process.stdout.write(`figma:bindings:report → ${FINDINGS}\n  ${checked.size} components checked · PAR-001 ${by('PAR-001')} · TOK-004 ${by('TOK-004')} · TOK-001 ${by('TOK-001')} open` +
    `${notChecked.length ? `\n  not checked: ${notChecked.map((n) => `${n.key} (${n.why})`).join(', ')}` : ''}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd === 'prepare') {
    const only = rest.find((a) => a.startsWith('--only='))?.slice(7).split(',')
    const files = prepare(ROOT, only ? new Set(only) : undefined)
    process.stdout.write(`figma:bindings:prepare → ${files.length} batch(es), run each with use_figma (read-only):\n${files.map((f) => `  ${f}`).join('\n')}\n`)
  } else if (cmd === 'report' && rest.length) report(rest)
  else { process.stderr.write('usage: figma-bindings.ts prepare | report <result.json>…\n'); process.exit(2) }
}
