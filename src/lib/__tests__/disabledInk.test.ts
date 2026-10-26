import { describe, expect, it } from 'vitest'
import { SEEDS, buildSystem, auditCurated, CURATED_PAIRINGS } from '../color/audit'

/**
 * `content.disabled` — WCAG 1.4.3 exempts inactive controls, so this is a
 * legibility floor, not AA (`disabled-text`: 3:1). In light it holds 3:1 on
 * the page; on the disabled wash the warm-tinted neutrals have no tone between
 * ~2.5:1 and the secondary ink, so the floor there is 2.5:1 (was 1.35:1). In
 * both themes the label must stay dimmer than `content.secondary`, or a
 * disabled button reads as enabled.
 */
function measure(pairs: { fg: string; bg: string }[]) {
  const orig = CURATED_PAIRINGS.categorical!
  CURATED_PAIRINGS.categorical = pairs.map((p) => ({ ...p, intent: 'disabled-text' as const }))
  try {
    return SEEDS.flatMap(([n, hex]) => auditCurated(buildSystem(n, hex, 'radix'), 'categorical'))
  } finally {
    CURATED_PAIRINGS.categorical = orig
  }
}

describe('content.disabled', () => {
  it('in light: 3:1 on the page, 2.5:1 on the disabled wash', () => {
    const bad = measure([
      { fg: 'content.disabled', bg: 'surface.page' },
      { fg: 'content.disabled', bg: 'action.disabled.default' },
    ]).filter((f) => f.theme === 'light' && f.wcag < (f.against === 'surface.page' ? 3 : 2.5))
    expect(bad.map((f) => `${f.system} on ${f.against}: ${f.wcag}:1`)).toEqual([])
  })

  it('in dark: ~3:1 on the disabled wash (was 2.5:1 on white-a.3)', () => {
    // The dark wash is white-a.2. Tone 10 on it lands 2.97–3.03:1 — the ramp
    // has no step between 10 and the secondary ink, so this is the ceiling.
    const bad = measure([{ fg: 'content.disabled', bg: 'action.disabled.default' }])
      .filter((f) => f.theme === 'dark' && f.wcag < 2.95)
    expect(bad.map((f) => `${f.system}: ${f.wcag}:1`)).toEqual([])
  })

  it('stays dimmer than content.secondary in both themes', () => {
    const rows = measure([
      { fg: 'content.disabled', bg: 'surface.page' },
      { fg: 'content.secondary', bg: 'surface.page' },
    ])
    const by = (role: string, sys: string, theme: string) => rows.find((r) => r.role === role && r.system === sys && r.theme === theme)!.wcag
    const bad = rows.filter((r) => r.role === 'content.disabled' && r.wcag >= by('content.secondary', r.system, r.theme))
    expect(bad.map((r) => `${r.system} ${r.theme}`)).toEqual([])
  })
})
