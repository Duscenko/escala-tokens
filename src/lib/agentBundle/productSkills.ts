import { figmaSemanticName, webCodeSyntax } from './names'
import type { AgentBundleFile, TokenJSON } from './types'

export function buildTaskSkillFiles(json: TokenJSON): AgentBundleFile[] {
  const project = json.project?.trim() || 'Design system'
  const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'
  return [
    { path: 'skills/code/SKILL.md', text: codeSkill(project, slug) },
    { path: 'skills/a11y-audit/SKILL.md', text: a11ySkill(project) },
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

- \`${figmaSemanticName('action.primary.default')}\` → \`${figmaSemanticName('content.on-action')}\`
- Status surface → matching status content
- Input: \`Surface/input\` + \`Border/strong\`; focus \`Border/focus\`

## After generating

Run \`node checkers/token-lint.mjs\` on the files you touched.
`
}

function a11ySkill(project: string): string {
  return `---
name: ${project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'}-a11y
description: "Audit ${project} UI contrast using WCAG 2.1 and APCA together. Use when checking text or controls on a surface."
---

# ${project} — accessibility

WCAG is the compliance floor. APCA Lc is what people perceive. A pair that clears one and fails the other is a finding.

## Rules

1. Check the **semantic pair**, not a random hex. Resolve names in \`references/semantic-contract.md\`.
2. APCA is directional: foreground first (text/icon), then background.
3. Intent floors: body-text WCAG 4.5 / Lc 75; large-text 3.0 / Lc 60; ui-component 3.0 / Lc 45.
4. Do not reimplement contrast math. Use this system's MCP \`check_contrast\` when connected, or compare against the hex tables in \`references/tokens.md\`.

## Pairings to audit first

- Primary button: Action/primary/default on Content/on-action
- Body text: Content/primary on Surface/page (or Surface/0)
- Destructive: Status/critical/surface-solid on Status/critical/on-solid
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
