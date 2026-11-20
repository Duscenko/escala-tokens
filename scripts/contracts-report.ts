/**
 * Contract completeness report → governance/findings/latest.json
 *
 *   npm run contracts:report
 *
 * Reads spec/contracts/ (generated) and spec/contract-gates.baseline.json and writes, per component:
 * - DOC-001 (warn)  the agent-facing sections its contract still lacks;
 * - MOT-002 (error) it changes state or opens and has no motion decision;
 * - PAR-001 (error) its story controls differ from the contract (the baseline the CI gate allows).
 * Only entries marked `source: "contracts:report"` are touched (see mergeFindings in
 * src/lib/contractGates.ts); every other finding in the file is kept as it is.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ComponentContract, ContractIndexEntry } from '../src/lib/componentContracts'
import {
  REPORT_SOURCE, emptySections, mergeFindings, motionGap,
  type ContractGateBaseline, type GovernanceFinding,
} from '../src/lib/contractGates'
import { ROOT } from './gen-component-contracts'

const FINDINGS = join(ROOT, 'governance/findings/latest.json')
const GITHUB = 'https://github.com/Duscenko/escala-tokens/blob/main'

function links(c: ComponentContract): Record<string, string> {
  const out: Record<string, string> = { contract: `${GITHUB}/spec/contracts/${c.key}.json` }
  if (c.figma.setUrl ?? c.figma.url) out.figma = (c.figma.setUrl ?? c.figma.url)!
  if (c.code.story?.url) out.storybook = c.code.story.url
  return out
}

function finding(c: ComponentContract, rule: string, id: string, severity: GovernanceFinding['severity'], side: GovernanceFinding['side'], evidence: string): GovernanceFinding {
  return { id, rule, severity, side, entity: c.key, evidence, status: 'Open', resolution: null, firstSeen: '', lastSeen: '', regression: false, source: REPORT_SOURCE, links: links(c) }
}

export function computeFindings(root = ROOT): GovernanceFinding[] {
  const index: ContractIndexEntry[] = JSON.parse(readFileSync(join(root, 'spec/contracts/index.json'), 'utf8'))
  const baseline: ContractGateBaseline = JSON.parse(readFileSync(join(root, 'spec/contract-gates.baseline.json'), 'utf8'))
  const out: GovernanceFinding[] = []
  for (const e of index) {
    if (e.kind !== 'component') continue
    const c: ComponentContract = JSON.parse(readFileSync(join(root, e.file), 'utf8'))
    const empty = emptySections(c)
    if (empty.length) out.push(finding(c, 'DOC-001', `DOC-001:${c.key}:contract`, 'warn', 'code', `contract lacks: ${empty.join(', ')}`))
    const gap = motionGap(c)
    if (gap) out.push(finding(c, 'MOT-002', `MOT-002:${c.key}`, 'error', 'code', gap))
    for (const axis of baseline['PAR-001'][c.key] ?? []) {
      out.push(finding(c, 'PAR-001', `PAR-001:${c.key}:story/${axis}`, 'error', 'code',
        `Storybook control ${axis} differs from the contract axis (${c.api.axes.find((a) => a.name === axis)?.values.join(' · ') ?? '?'}); details: npx vitest run contractGates`))
    }
  }
  return out
}

function main() {
  const today = new Date().toISOString().slice(0, 10)
  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()
  const file = JSON.parse(readFileSync(FINDINGS, 'utf8')) as { generated: string; findings: GovernanceFinding[] }
  const computed = computeFindings()
  const findings = mergeFindings(file.findings, computed, today, sha)
  writeFileSync(FINDINGS, `${JSON.stringify({ ...file, generated: today, findings }, null, 2)}\n`)
  const by = (rule: string) => computed.filter((f) => f.rule === rule).length
  process.stdout.write(`contracts:report → ${FINDINGS}\n  DOC-001 ${by('DOC-001')} · MOT-002 ${by('MOT-002')} · PAR-001 ${by('PAR-001')} open (of ${findings.length} findings in the file)\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
