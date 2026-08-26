import { describe, expect, it } from 'vitest'
import { runAudit } from '../color/audit'
import { ALL_ROLES } from '../semanticRoles'
import { INTENT_THRESHOLDS } from '../color/apca'

/**
 * THE CONTRAST MATRIX — the regression net for the whole semantic layer.
 *
 * Every semantic role, in every theme, across 10 brand seeds × 4 ramp
 * algorithms, scored in WCAG 2.1 AND APCA against its declared intent class.
 * 1 480 pairs.
 *
 * At the P0 baseline this was 498 WCAG failures (62.3 %) and 708 APCA failures
 * (88.5 %). It is now zero, and this file is what keeps it there: a role whose
 * tone drifts, or a new role added without thinking about what it sits on,
 * fails here rather than in someone's shipped product.
 *
 * It shares its engine with `npm run color:report` — one implementation, two
 * consumers. The report tells you WHERE; this tells you WHETHER.
 *
 * If this fails, do not relax the threshold. Either the tone is wrong or the
 * intent is wrong; both are answerable questions.
 */

const { flat, curated } = runAudit()

describe('flat catalogue — every role pair clears its intent', () => {
  it('audits a non-trivial number of pairs (guards against a silent no-op)', () => {
    // A refactor that quietly stopped resolving roles would make every
    // assertion below vacuously true. This is the canary.
    expect(flat.length).toBeGreaterThan(800)
  })

  it('has zero WCAG 2.1 failures', () => {
    const bad = flat.filter((f) => !f.passesWcag)
    expect(bad.map((f) => `${f.system} ${f.theme} ${f.role} on ${f.against}: ${f.wcag}:1 (${f.intent})`)).toEqual([])
  })

  it('has zero APCA failures', () => {
    const bad = flat.filter((f) => !f.passesApca)
    expect(bad.map((f) => `${f.system} ${f.theme} ${f.role} on ${f.against}: Lc ${f.apcaLc} (${f.intent})`)).toEqual([])
  })
})

describe('curated architectures — every role pair clears its intent', () => {
  it('audits a non-trivial number of pairs', () => {
    expect(curated.length).toBeGreaterThan(400)
  })

  it('has zero WCAG 2.1 failures', () => {
    const bad = curated.filter((f) => !f.passesWcag)
    expect(bad.map((f) => `${f.architecture} ${f.theme} ${f.role} on ${f.against}: ${f.wcag}:1 (${f.intent})`)).toEqual([])
  })

  it('has zero APCA failures', () => {
    const bad = curated.filter((f) => !f.passesApca)
    expect(bad.map((f) => `${f.architecture} ${f.theme} ${f.role} on ${f.against}: Lc ${f.apcaLc} (${f.intent})`)).toEqual([])
  })
})

describe('the governance rule', () => {
  it('every role declares an intent class', () => {
    // `intent` is a required field, so this cannot fail at runtime — but it
    // documents the rule at the place someone will look, and catches a role
    // smuggled in with a cast.
    for (const role of ALL_ROLES) {
      expect(Object.keys(INTENT_THRESHOLDS), `role ${role.key}`).toContain(role.intent)
    }
  })

  it('no role is classified `decorative` while its description promises readable text', () => {
    // The failure mode this system already lived through: a token described as
    // "supporting / paragraph text" sitting two steps below anything readable.
    // Downgrading the INTENT without correcting the DESCRIPTION would hide the
    // problem instead of resolving it, so the two must agree.
    const promisesReading = /\b(body|paragraph|supporting|caption|heading|label|metadata)\b/i
    const exempt = /NON-ESSENTIAL/
    for (const role of ALL_ROLES) {
      if (role.intent !== 'decorative') continue
      if (exempt.test(role.description)) continue
      expect(promisesReading.test(role.description), `${role.key}: "${role.description}"`).toBe(false)
    }
  })

  it('every foreground role names what it sits on', () => {
    // A role with no `contrastAgainst` is a role nothing can check.
    for (const role of ALL_ROLES) {
      if (role.intent === 'surface' || role.intent === 'decorative') continue
      expect(role.contrastAgainst, `${role.key} has no contrastAgainst`).toBeTruthy()
    }
  })
})
