// The `escala-architecture` agent skill must teach the roles that ship.
// 1. The generated references equal what the role tables produce now.
// 2. Every marker the colour table uses is explained in the legend.
// 3. Every role id SKILL.md (hand-written) names exists.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildArchitectureSkillFiles, buildEscalaSkillReferences, COLOR_MARKERS } from '../escalaArchitectureSkill'
import { buildAgentProductFiles } from '../agentBundle/product'
import type { TokenJSON } from '../agentBundle/types'
import { categoricalRoleCatalogue } from '../semanticArchitectures'
import { LAYOUT_ROLES, type LayoutFamily } from '../layoutTokens'
import { ICON_ROLES } from '../iconSizing'
import { TYPE_ROLES } from '../typeRoles'

const SKILL_DIR = resolve(__dirname, '../../../.claude/skills/escala-architecture')

describe('escala-architecture skill', () => {
  it('committed references match the role tables (run `npm run gen:escala-skill`)', () => {
    for (const [path, body] of Object.entries(buildEscalaSkillReferences())) {
      expect(readFileSync(resolve(SKILL_DIR, path), 'utf8'), path).toBe(body)
    }
  })

  it('the marker legend explains every ref form the colour table uses', () => {
    const known = new Set(COLOR_MARKERS.flatMap((m) => m.prefix))
    const used = new Set<string>()
    for (const r of categoricalRoleCatalogue()) {
      for (const ref of [r.light, r.dark]) used.add(/^\{([a-z+-]+):/.exec(ref)?.[1] ?? '')
    }
    expect([...used].filter((p) => !known.has(p))).toEqual([])
  })

  it('every role SKILL.md names exists', () => {
    const color = categoricalRoleCatalogue().map((r) => `${r.group}.${r.key}`)
    const ids = new Set<string>([
      ...color,
      ...(Object.keys(LAYOUT_ROLES) as LayoutFamily[]).flatMap((f) => LAYOUT_ROLES[f].map((r) => `${f === 'size' ? 'size' : f}.${r.key}`)),
      ...ICON_ROLES.map((r) => `icon.${r}`),
      ...TYPE_ROLES.map((r) => `type.${r.key}`),
    ])
    const sevs = ['critical', 'warning', 'success', 'info']
    const md = readFileSync(resolve(SKILL_DIR, 'SKILL.md'), 'utf8').replace(/```[\s\S]*?```/g, '')
    const ROLE = /^(?:color\.)?((?:surface|content|action|status|border|radius|spacing|size|selector|stroke|icon|type)\.[a-z0-9.<>*|-]+)$/
    const missing: string[] = []
    let checked = 0
    for (const [, raw0] of md.matchAll(/`([^`]+)`/g)) {
      const raw = raw0.replace(/\\\|/g, '|')
      for (const piece of raw.split(/\s+\+\s+|\s+/)) {
        const m = ROLE.exec(piece)
        if (!m) continue
        // `a.b.c|d|e` → a.b.c, a.b.d, a.b.e ; `<sev>` → each severity.
        const [head, ...alts] = m[1].split('|')
        const stem = head.slice(0, head.lastIndexOf('.') + 1)
        const names = [head, ...alts.map((a) => (a.includes('.') ? a : stem + a))]
        for (const name of names.flatMap((n) => (n.includes('<sev>') ? sevs.map((s) => n.replace('<sev>', s)) : [n]))) {
          if (name.includes('<')) continue // a placeholder like `type.<role>`
          checked++
          if (name.includes('*')) {
            const re = new RegExp(`^${name.replace(/\./g, '\\.').replace(/\*/g, '.+')}$`)
            if (![...ids].some((id) => re.test(id))) missing.push(name)
          } else if (!ids.has(name)) missing.push(name)
        }
      }
    }
    expect(missing).toEqual([])
    expect(checked).toBeGreaterThan(40)
  })

  describe('brand package (skills/architecture/)', () => {
    const json = JSON.parse(readFileSync(resolve(__dirname, '__snapshots__/golden/tokens.json'), 'utf8')) as TokenJSON
    const files = Object.fromEntries(buildArchitectureSkillFiles(json).map((f) => [f.path, f.text]))

    it('ships in the agent package and AGENTS.md routes to it', () => {
      const pkg = buildAgentProductFiles(json, { generatedAt: '2026-01-01' }).files
      const paths = pkg.map((f) => f.path)
      for (const p of Object.keys(files)) expect(paths).toContain(p)
      expect(pkg.find((f) => f.path === 'AGENTS.md')?.text).toContain('skills/architecture/SKILL.md')
      expect(pkg.find((f) => f.path === 'llms.txt')?.text).toContain('skills/architecture/SKILL.md')
    })

    it('is a valid skill named after the system, with no repo-only section', () => {
      const md = files['skills/architecture/SKILL.md']
      expect(md.startsWith('---\nname: ')).toBe(true)
      expect(md).not.toContain('Working inside this repo')
      expect(md).not.toContain('GENERATED')
    })

    it("fills the catalogue with the brand's own values", () => {
      const arch = json.colors.architecture!.tokens!
      const theme = json.colors.themeOrder![0]
      const hex = arch.action['primary.default'][theme]
      expect(files['skills/architecture/references/color-roles.md']).toContain(`\`${hex}\``)
      const dim = files['skills/architecture/references/dimension-roles.md']
      expect(dim).toContain(`| \`size.control\` | \`--size-control-md\` | \`Size/control-md\` | ${parseFloat(json.sizes![json.sizeRoles!.control])}px |`)
      // Its own Tablet / Mobile value: 24 / 44 / 44.
      expect(dim).toContain('| `size.target-min` | `--size-target-min` | `Size/target-min` | 24px / 44px / 44px |')
      expect(dim).toContain('| `icon.medium` | 20px |')
      expect(dim).not.toMatch(/\| — \| (Cards|Buttons|Default button)/)
      expect(files['skills/architecture/references/type-roles.md']).toContain(json.typography.fontFamily)
    })
  })
})

