/**
 * `npm run color:report` — the human-readable view over `lib/color/audit.ts`.
 *
 * A REPORT, not a test: it asserts nothing. `__tests__/contrast-matrix.test.ts`
 * is what holds the numbers to zero in CI; this is what tells you WHERE.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runAudit, SEEDS, ALGORITHMS } from '../src/lib/color/audit'

const { flat: findings, curated } = runAudit()

// ── Summary ──────────────────────────────────────────────────────────────────
const total = findings.length
const failWcag = findings.filter((f) => !f.passesWcag)
const failApca = findings.filter((f) => !f.passesApca)
const failBoth = findings.filter((f) => !f.passesWcag && !f.passesApca)
const wcagOnlyPass = findings.filter((f) => f.passesWcag && !f.passesApca)

const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`

console.log(`\n  Escala colour audit — ${SEEDS.length} seeds × ${ALGORITHMS.length} algorithms × 2 themes`)
console.log(`  ${total} audited role pairs\n`)
console.log(`  WCAG 2.1 failures      ${String(failWcag.length).padStart(5)}  ${pct(failWcag.length)}`)
console.log(`  APCA failures          ${String(failApca.length).padStart(5)}  ${pct(failApca.length)}`)
console.log(`  Fail both              ${String(failBoth.length).padStart(5)}  ${pct(failBoth.length)}`)
console.log(`  Pass WCAG, fail APCA   ${String(wcagOnlyPass.length).padStart(5)}  ${pct(wcagOnlyPass.length)}   ← the blind spot\n`)

// Per-role failure rate — this is the actionable view.
type Row = { role: string; intent: string; n: number; wcagFail: number; apcaFail: number; worstWcag: number; worstApca: number; tones: Set<number> }
const byRole = new Map<string, Row>()
for (const f of findings) {
  const key = `${f.role}·${f.theme}`
  let r = byRole.get(key)
  if (!r) {
    r = { role: key, intent: f.intent, n: 0, wcagFail: 0, apcaFail: 0, worstWcag: Infinity, worstApca: Infinity, tones: new Set() }
    byRole.set(key, r)
  }
  r.n++
  if (!f.passesWcag) r.wcagFail++
  if (!f.passesApca) r.apcaFail++
  r.worstWcag = Math.min(r.worstWcag, f.wcag)
  r.worstApca = Math.min(r.worstApca, Math.abs(f.apcaLc))
  r.tones.add(f.tone)
}

const rows = [...byRole.values()].sort((a, b) => (b.wcagFail + b.apcaFail) - (a.wcagFail + a.apcaFail))
console.log('  role · theme                       intent        tone   WCAG fail   APCA fail   worst WCAG   worst Lc')
console.log('  ' + '─'.repeat(103))
for (const r of rows) {
  const flag = r.wcagFail > 0 ? '✗' : r.apcaFail > 0 ? '!' : ' '
  console.log(
    `  ${flag} ${r.role.padEnd(32)} ${r.intent.padEnd(13)} ${[...r.tones].join('/').padEnd(6)} ` +
    `${`${r.wcagFail}/${r.n}`.padStart(9)}   ${`${r.apcaFail}/${r.n}`.padStart(9)}   ` +
    `${r.worstWcag.toFixed(2).padStart(10)}   ${r.worstApca.toFixed(1).padStart(8)}`,
  )
}
console.log()

// ── Curated-architecture summary — the H3 evidence ───────────────────────────
console.log('  ── Curated architectures (own role tables, radix ramps) ──\n')
console.log('  architecture · token            on                     intent        WCAG fail   APCA fail   worst WCAG   worst Lc')
console.log('  ' + '─'.repeat(115))

type CRow = { k: string; intent: string; n: number; w: number; a: number; ww: number; wa: number }
const byPair = new Map<string, CRow>()
for (const f of curated) {
  const k = `${f.architecture} · ${f.role} · ${f.theme}`
  let r = byPair.get(k)
  if (!r) { r = { k, intent: f.intent, n: 0, w: 0, a: 0, ww: Infinity, wa: Infinity }; byPair.set(k, r) }
  r.n++
  if (!f.passesWcag) r.w++
  if (!f.passesApca) r.a++
  r.ww = Math.min(r.ww, f.wcag)
  r.wa = Math.min(r.wa, Math.abs(f.apcaLc))
}
const crows = [...byPair.values()].sort((a, b) => (b.w + b.a) - (a.w + a.a))
for (const r of crows) {
  const flag = r.w > 0 ? '✗' : r.a > 0 ? '!' : ' '
  const on = curated.find((f) => `${f.architecture} · ${f.role} · ${f.theme}` === r.k)?.against ?? ''
  console.log(
    `  ${flag} ${r.k.padEnd(38)} ${on.padEnd(22)} ${r.intent.padEnd(13)} ` +
    `${`${r.w}/${r.n}`.padStart(9)}   ${`${r.a}/${r.n}`.padStart(9)}   ` +
    `${r.ww.toFixed(2).padStart(10)}   ${r.wa.toFixed(1).padStart(8)}`,
  )
}

const cTotal = curated.length
const cWcag = curated.filter((f) => !f.passesWcag).length
const cApca = curated.filter((f) => !f.passesApca).length
console.log(`\n  curated: ${cTotal} pairs · WCAG fail ${cWcag} (${((cWcag / cTotal) * 100).toFixed(1)}%) · APCA fail ${cApca} (${((cApca / cTotal) * 100).toFixed(1)}%)`)
console.log(`  flat catalogue for comparison: ${total} pairs · WCAG fail ${failWcag.length} (${pct(failWcag.length)}) · APCA fail ${failApca.length} (${pct(failApca.length)})\n`)

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../reports')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'color-audit.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  seeds: SEEDS, algorithms: ALGORITHMS,
  summary: {
    flat: { total, failWcag: failWcag.length, failApca: failApca.length, failBoth: failBoth.length, wcagOnlyPass: wcagOnlyPass.length },
    curated: { total: cTotal, failWcag: cWcag, failApca: cApca },
  },
  findings,
  curated,
}, null, 2))
console.log(`  → reports/color-audit.json (${total} flat + ${cTotal} curated rows)\n`)
