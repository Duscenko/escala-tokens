/**
 * Contrast status for semantic token rows — same pairings and scoring as the
 * system dashboard (`auditResolvedRoles` + `CURATED_PAIRINGS.categorical`).
 */

import {
  CURATED_PAIRINGS,
  auditResolvedRoles,
  type Pairing,
  type ResolvedFinding,
} from './color/audit'
import { evaluate, INTENT_THRESHOLDS, type IntentClass } from './color/apca'
import type { ArchitectureView } from './semanticArchitectures'
import { ALL_ROLES, type Role } from './semanticRoles'

export type ContrastStatus = 'pass' | 'warn' | 'fail' | 'none'

/** WCAG 2.x text/UI tiers from the measured ratio and intent (not APCA). */
export type WcagGrade = 'AAA' | 'AA' | 'fail'

export type ContrastStatusResult = {
  status: ContrastStatus
  title: string
  /** Worst scored WCAG ratio, or null when there is no pair. */
  wcag: number | null
  /** WCAG AA/AAA tier for `wcag`, when a pair exists. */
  grade: WcagGrade | null
  intent: IntentClass | null
}

const NONE: ContrastStatusResult = {
  status: 'none',
  title: 'No contrast pair to measure',
  wcag: null,
  grade: null,
  intent: null,
}

/** Map a WCAG ratio to AA / AAA for the role's intent (WCAG 2.x thresholds). */
export function wcagGradeFromRatio(ratio: number, intent: IntentClass): WcagGrade {
  if (intent === 'body-text' || intent === 'action-label') {
    if (ratio >= 7) return 'AAA'
    if (ratio >= 4.5) return 'AA'
    return 'fail'
  }
  if (intent === 'large-text') {
    if (ratio >= 4.5) return 'AAA'
    if (ratio >= 3) return 'AA'
    return 'fail'
  }
  if (intent === 'ui-component') {
    if (ratio >= 3) return 'AA'
    return 'fail'
  }
  return 'fail'
}

export function contrastGradeLabel(result: ContrastStatusResult): string | null {
  if (result.grade == null || result.wcag == null) return null
  if (result.grade === 'fail') return 'Fail'
  return result.grade
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
  const grade = wcagGradeFromRatio(f.wcag, f.intent)
  const gradeNote =
    grade === 'AAA' ? ' · WCAG AAA'
      : grade === 'AA' ? ' · WCAG AA'
        : ' · below WCAG AA'
  if (!f.passesWcag) {
    const min = INTENT_THRESHOLDS[f.intent].wcag ?? 0
    return {
      status: 'fail',
      title: `${f.wcag}:1 on ${f.against} (needs ${min}:1 for ${f.intent})${gradeNote}`,
      wcag: f.wcag,
      grade,
      intent: f.intent,
    }
  }
  if (!f.passesApca) {
    const minLc = INTENT_THRESHOLDS[f.intent].apcaLc
    return {
      status: 'warn',
      title: `WCAG ${f.wcag}:1${gradeNote}; APCA Lc ${Math.abs(f.apcaLc).toFixed(0)} below ${minLc ?? 'target'} (${f.intent} on ${f.against})`,
      wcag: f.wcag,
      grade,
      intent: f.intent,
    }
  }
  return {
    status: 'pass',
    title: `Contrast ${f.wcag}:1 on ${f.against}${gradeNote}`,
    wcag: f.wcag,
    grade,
    intent: f.intent,
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

/** Semantics-table only — ink on the pressed status wash. Omitted from
 *  `CURATED_PAIRINGS` so the seed matrix stays at zero APCA misses; the
 *  pressed tint is often vivid enough for WCAG large-text but under Lc 60. */
const SEMANTICS_TABLE_EXTRA_PAIRINGS: readonly Pairing[] = [
  { fg: 'status.critical.content', bg: 'status.critical.surface-pressed', intent: 'large-text' },
  { fg: 'status.warning.content',  bg: 'status.warning.surface-pressed',  intent: 'large-text' },
  { fg: 'status.success.content',  bg: 'status.success.surface-pressed',  intent: 'large-text' },
  { fg: 'status.info.content',     bg: 'status.info.surface-pressed',     intent: 'large-text' },
]

export function auditCategoricalView(view: ArchitectureView, systemName: string): ResolvedFinding[] {
  const pairings = [...(CURATED_PAIRINGS.categorical ?? []), ...SEMANTICS_TABLE_EXTRA_PAIRINGS]
  return auditResolvedRoles(
    resolvedMapFromArchView(view),
    view.modeKeys,
    pairings,
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
