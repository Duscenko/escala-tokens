import { afterAll, describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { auditCases, currentStore } from '../exportAuditMatrix'
import { auditSystem, reportMarkdown, summarize, type Finding } from '../exportAudit'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { adoptPreset } from '../adoptPreset'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { captureCodeSnapshot } from '../codeScope'
import { buildCSS } from '../exporters'
import { generateTokenJSON } from '../tokenGenerator'
import { brandContext, pluginPayload } from '../contextSource'

// The export watchdog (design-plans/export-watchdog.md, phase 1). Every way a
// brand leaves Escala must agree with tokens.json, value for value, on every
// System Style, 20 seeded moods and the edge systems in `exportAuditMatrix`.
// A failure prints the report: the brand, the output, the token, what was
// expected and what shipped. `npm run audit:exports` runs this file with
// AUDIT_REPORT=1, which also writes reports/export-audit.{md,json} — inside
// vitest on purpose: it is the environment CI and the build use, and a plain
// `tsx` script loaded the store twice and reported a system it never built.

const all: Finding[] = []
const systems: string[] = []

describe('export audit', () => {
  for (const c of auditCases()) {
    it(c.name, () => {
      const t = Date.now()
      const brands = c.build()
      const findings: Finding[] = auditSystem(currentStore(), brands)
      all.push(...findings)
      systems.push(`${c.name} — ${findings.length ? `**${findings.length} findings**` : 'clean'} (${Date.now() - t} ms)`)
      if (findings.length) {
        expect.fail(reportMarkdown(findings, { systems: [c.name], when: 'vitest' }, 10))
      }
    }, 60_000)
  }

  afterAll(() => {
    if (!process.env.AUDIT_REPORT) return
    const dir = resolve(process.cwd(), 'reports')
    const when = new Date().toISOString()
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, 'export-audit.md'), reportMarkdown(all, { systems, when }))
    writeFileSync(resolve(dir, 'export-audit.json'), JSON.stringify({ when, systems, summary: summarize(all), findings: all }, null, 2))
  })
})

// Golden files: the guest's starting system (Core / Minimalist) exactly as it
// ships. Any change to an export shows up here as a diff to read before it is
// accepted (`vitest -u` only once the diff is the one you meant).
describe('golden exports — Core / Minimalist', () => {
  useDesignStore.setState(makeDesignDefaults())
  const core = THEME_STYLE_PRESETS.find((p) => p.id === 'core-minimal')!
  const r = adoptPreset(core, 'light', { track: false })
  if ('error' in r) throw new Error(r.error)
  const store = useDesignStore.getState()
  const snap = captureCodeSnapshot(store, r.key)

  it('variables.css', async () => {
    await expect(buildCSS(snap as never)).toMatchFileSnapshot('./__snapshots__/golden/variables.css')
  })
  it('tokens.json', async () => {
    await expect(JSON.stringify(generateTokenJSON(snap), null, 2)).toMatchFileSnapshot('./__snapshots__/golden/tokens.json')
  })
  it('agent context (all foundations, both themes, full)', async () => {
    await expect(brandContext(store, r.key, { scope: 'all', appearance: 'both', detail: 'full' })).toMatchFileSnapshot('./__snapshots__/golden/agent-context.md')
  })
  it('plugin payload', async () => {
    await expect(JSON.stringify(pluginPayload(store, r.key, 'both'), null, 2)).toMatchFileSnapshot('./__snapshots__/golden/plugin-payload.json')
  })
})
