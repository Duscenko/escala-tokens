/**
 * Contrast status for semantic token rows — same pairings and scoring as the
 * system dashboard (`auditResolvedRoles` + `CURATED_PAIRINGS.categorical`).
 */

import {
  CURATED_PAIRINGS,
  auditResolvedRoles,
  type ResolvedFinding,
} from './color/audit'
import { evaluate, INTENT_THRESHOLDS, type IntentClass } from './color/apca'
import type { ArchitectureView } from './semanticArchitectures'
import { ALL_ROLES, type Role } from './semanticRoles'

export type ContrastStatus = 'pass' | 'warn' | 'fail' | 'none'

export type ContrastStatusResult = {
  status: ContrastStatus
  title: string
  /** Worst scored WCAG ratio, or null when there is no pair. */
  wcag: number | null
}

const NONE: ContrastStatusResult = {
  status: 'none',
  title: 'No contrast pair to measure',
  wcag: null,
}

/** Visible cell label — the ratio is the identifier; colour is secondary. */
export function contrastStatusLabel(result: ContrastStatusResult): string {
  if (result.status === 'none' || result.wcag == null) return '—'
  return `${result.wcag.toFixed(1)}:1`
}

const SCORED = new Set<IntentClass>(['body-text', 'large-text', 'ui-component', 'action-label'])

function isScored(intent: IntentClass): boolean {
  return SCORED.has(intent)
}

const STATUS_RANK: Record<ContrastStatus, number> = { none: 0, pass: 1, warn: 2, fail: 3 }

function pickWorse(a: ContrastStatusResult, b: ContrastStatusResult): ContrastStatusResult {
  return STATUS_RANK[b.status] > STATUS_RANK[a.status] ? b : a
}

function fromFinding(f: ResolvedFinding): ContrastStatusResult {
  if (!f.passesWcag) {
    const min = INTENT_THRESHOLDS[f.intent].wcag ?? 0
    return {
      status: 'fail',
      title: `${f.wcag}:1 on ${f.against} (needs ${min}:1 for ${f.intent})`,
      wcag: f.wcag,
    }
  }
  if (!f.passesApca) {
    const minLc = INTENT_THRESHOLDS[f.intent].apcaLc
    return {
      status: 'warn',
      title: `WCAG ${f.wcag}:1 passes; APCA Lc ${Math.abs(f.apcaLc).toFixed(0)} below ${minLc ?? 'target'} (${f.intent} on ${f.against})`,
      wcag: f.wcag,
    }
  }
  return {
    status: 'pass',
    title: `Contrast ${f.wcag}:1 on ${f.against}`,
    wcag: f.wcag,
  }
}

export function resolvedMapFromArchView(view: ArchitectureView): Map<string, Record<string, string>> {
  const resolved = new Map<string, Record<string, string>>()
  for (const cat of view.categories) {
    for (const tok of cat.tokens) {
      const modes: Record<string, string> = {}
      for (const [mode, v] of Object.entries(tok.modes)) modes[mode] = v.css
      resolved.set(`${cat.key}.${tok.key}`, modes)
    }
  }
  return resolved
}

export function auditCategoricalView(view: ArchitectureView, systemName: string): ResolvedFinding[] {
  return auditResolvedRoles(
    resolvedMapFromArchView(view),
    view.modeKeys,
    CURATED_PAIRINGS.categorical ?? [],
    { system: systemName, architecture: 'categorical', lenient: true },
  )
}

/** Worst scored pairing where this token is foreground or background. */
export function contrastStatusForToken(
  tokenId: string,
  findings: readonly ResolvedFinding[],
): ContrastStatusResult {
  const pool = findings.filter(
    (f) => isScored(f.intent) && (f.role === tokenId || f.against === tokenId),
  )
  if (pool.length === 0) return NONE
  let result: ContrastStatusResult = NONE
  for (const f of pool) {
    result = pickWorse(result, fromFinding(f))
  }
  return result
}

const roleByKey = new Map(ALL_ROLES.map((r) => [r.key, r]))

function statusFromHexPair(fg: string, bg: string, intent: IntentClass, against: string): ContrastStatusResult {
  if (!fg || !bg) return NONE
  const v = evaluate(fg, bg, intent)
  return fromFinding({
    system: '',
    architecture: 'flat',
    theme: '',
    role: '',
    against,
    intent,
    fg,
    bg,
    tone: 0,
    wcag: Number(v.wcag.toFixed(2)),
    apcaLc: Number(v.apcaLc.toFixed(1)),
    passesWcag: v.passesWcag,
    passesApca: v.passesApca,
  })
}

/** Flat catalogue: measure declared fg/bg pairs per appearance column. */
export function contrastStatusForFlatRole(
  role: Role,
  appearances: readonly string[],
  semanticsByAppearance: Record<string, Record<string, string> | undefined>,
): ContrastStatusResult {
  if (!role.contrastAgainst) return NONE
  let result: ContrastStatusResult = NONE
  for (const appearance of appearances) {
    const map = semanticsByAppearance[appearance]
    if (!map) continue
    const fg = map[role.key]
    const bg = map[role.contrastAgainst]
    result = pickWorse(result, statusFromHexPair(fg, bg, role.intent, role.contrastAgainst))
  }
  return result
}

export function contrastStatusForFlatKey(
  roleKey: string,
  appearances: readonly string[],
  semanticsByAppearance: Record<string, Record<string, string> | undefined>,
): ContrastStatusResult {
  const role = roleByKey.get(roleKey)
  if (!role) return NONE
  return contrastStatusForFlatRole(role, appearances, semanticsByAppearance)
}
