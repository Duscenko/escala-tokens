import { INTENT_THRESHOLDS, type IntentClass } from '../color/apca'
import { CURATED_PAIRINGS, type Pairing } from '../color/audit'
import { semanticRoleIds } from './figmaRefs'
import { figmaSemanticName, webCodeSyntax } from './names'
import type { AgentBundleFile, TokenJSON } from './types'

const F = figmaSemanticName

/** The audited pairs of the Categorical contract this payload ships, both
 *  roles present — the same list `color/audit.ts` measures. */
export function shippedPairings(json: TokenJSON): Pairing[] {
  const roles = semanticRoleIds(json)
  const listed = (CURATED_PAIRINGS.categorical ?? []).filter((p) => roles.has(p.fg) && roles.has(p.bg))
  // Every severity's solid fill carries its own solved ink (`action-label`),
  // the same shape for all four. Added from the roles so a severity the audit
  // list spells differently is still taught.
  const solids: Pairing[] = []
  for (const id of roles) {
    const m = /^status\.([a-z]+)\.surface-solid$/.exec(id)
    const ink = m && `status.${m[1]}.on-solid`
    if (ink && roles.has(ink) && !listed.some((p) => p.fg === ink && p.bg === id)) solids.push({ fg: ink, bg: id, intent: 'action-label' })
  }
  return [...listed, ...solids]
}

/** The pairs whose foreground is INK (text or icon), not a stroke. */
export function inkPairings(json: TokenJSON): Pairing[] {
  return shippedPairings(json).filter((p) => p.fg.startsWith('content.') || /\.(content|on-solid)$/.test(p.fg))
}

/** `body-text WCAG 4.5 / Lc 75; …` — every intent that carries a floor. */
export function intentFloors(): string {
  return (Object.entries(INTENT_THRESHOLDS) as [IntentClass, { wcag: number | null; apcaLc: number | null }][])
    .filter(([, t]) => t.wcag !== null || t.apcaLc !== null)
    .map(([k, t]) => `${k} ${t.wcag !== null ? `WCAG ${t.wcag.toFixed(1)}` : 'no WCAG floor'} / ${t.apcaLc !== null ? `Lc ${t.apcaLc}` : 'no APCA floor'}`)
    .join('; ')
}

export function buildTaskSkillFiles(json: TokenJSON): AgentBundleFile[] {
  const project = json.project?.trim() || 'Design system'
  const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'
  return [
    { path: 'skills/code/SKILL.md', text: codeSkill(project, slug) },
    { path: 'skills/a11y-audit/SKILL.md', text: a11ySkill(project, json) },
    { path: 'skills/migrate/SKILL.md', text: migrateSkill(project) },
  ]
}

function codeSkill(project: string, slug: string): string {
  return `---
name: ${slug}-code
description: "Implement UI for ${project} using semantic CSS variables. Use when building or restyling components so they match this design system."
---

# ${project} — implement in code

Load \`AGENTS.md\` first. Do not invent token names.

## Rules

1. Color from semantics only: \`${webCodeSyntax('action.primary.default')}\`, not \`#hex\`, not primitive ramps.
2. Radius / spacing / size from foundations (\`var(--radius-md)\`, \`var(--spacing-4)\`, \`var(--size-md)\`). If a role alias exists (\`var(--radius-action)\`), prefer it.
3. Start from \`templates/component/\` when a scaffold exists. Keep the token bindings.
4. Icons: only the package named in \`AGENTS.md\` / \`SKILL.md\`.

## Pairings (do not mix)

- \`${F('action.primary.default')}\` → \`${F('content.on-action')}\`
- Status surface → matching status content (\`${F('status.critical.surface')}\` → \`${F('status.critical.content')}\`)
- Input: \`${F('surface.input')}\` + \`${F('border.control')}\` (hover \`${F('border.control-hover')}\`); focus \`${F('border.focus')}\`

## After generating

Run \`node checkers/token-lint.mjs\` on the files you touched.
`
}

function a11ySkill(project: string, json: TokenJSON): string {
  const pairs = shippedPairings(json).filter((p) => INTENT_THRESHOLDS[p.intent].wcag !== null || INTENT_THRESHOLDS[p.intent].apcaLc !== null)
  return `---
name: ${project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'}-a11y
description: "Audit ${project} UI contrast using WCAG 2.1 and APCA together. Use when checking text or controls on a surface."
---

# ${project} — accessibility

WCAG is the compliance floor. APCA Lc is what people perceive. A pair that clears one and fails the other is a finding.

## Rules

1. Check the **semantic pair**, not a random hex. Resolve names in \`references/semantic-contract.md\`.
2. APCA is directional: foreground first (text/icon), then background.
3. Intent floors: ${intentFloors()}.
4. A label on a solid fill (button, chip, destructive action) is \`action-label\`, not \`body-text\`.
5. Do not reimplement contrast math. Compare against the hex tables in \`references/tokens.md\`.

## Pairs this system is audited on

| Foreground | Background | Intent |
|---|---|---|
${pairs.map((p) => `| \`${F(p.fg)}\` | \`${F(p.bg)}\` | \`${p.intent}\` |`).join('\n')}
`
}

function migrateSkill(project: string): string {
  return `---
name: ${project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'}-migrate
description: "Replace hardcoded hex and px in ${project} with design tokens. Use when migrating existing UI onto this system."
---

# ${project} — migrate to tokens

1. Read \`references/tokens.md\` and \`references/foundations.md\`. Those values are the map.
2. For a hex, find the **semantic** role that carries it in the current theme. Do not alias a primitive if a role exists.
3. For a px, find the spacing / radius / size step. Prefer a role (\`radius-action\`) when the catalog has one.
4. Run \`node checkers/token-lint.mjs <files>\` — it only knows **this** system's tokens. A hit is a leftover hardcoded value.
5. Unknown hex/px: ask which existing role to use. Do not add a new token in code.
`
}
