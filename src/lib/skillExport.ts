// Agent Skill package that matches Figma MCP skill requirements
// (developers.figma.com/docs/figma-mcp-server/create-skills) and the open
// Agent Skills spec (agentskills.io). Figma reads a folder whose name equals
// the YAML `name`, with SKILL.md (When to use · Instructions · Examples ·
// Common edge cases) plus optional `references/` for token tables.

import { CATEGORICAL_ROLE_COMMENTS } from './semanticArchitectures'
import { buildSectionExport, type ColorFormat } from './sectionExport'
import { zipStore } from './zipStore'
import { slugify } from './utils'
import { useDesignStore } from '../store/useDesignStore'

export interface SkillPackage {
  name: string
  /** SKILL.md — preview/copy payload. */
  skillMd: string
  zip: Uint8Array
}

const GROUP_ORDER = ['content', 'action', 'surface', 'status', 'border'] as const
const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  content: 'Content',
  action: 'Action',
  surface: 'Surface',
  status: 'Status',
  border: 'Border',
}

function skillName(project: string): string {
  const slug = slugify(project) || 'design-system'
  const base = slug.endsWith('-design-system') ? slug : `${slug}-design-system`
  return base.replace(/^-+/, '').slice(0, 64).replace(/-+$/, '') || 'design-system'
}

function yamlQuote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Categorical id → Figma variable in Color Semantics (`Content/primary`). */
function figmaSemanticName(id: string): string {
  const [group, ...rest] = id.split('.')
  const label = GROUP_LABEL[group as (typeof GROUP_ORDER)[number]]
    ?? (group ? group.charAt(0).toUpperCase() + group.slice(1) : id)
  return rest.length ? `${label}/${rest.join('.')}` : label
}

/** Categorical id → WEB code syntax Figma Dev Mode expects. */
function webCodeSyntax(id: string): string {
  return `var(--color-${id.replace(/\./g, '-')})`
}

function scopesFor(id: string): string {
  if (id.startsWith('content.')) return '`TEXT_FILL`'
  if (id.startsWith('action.') || id.startsWith('surface.')) return '`FRAME_FILL`, `SHAPE_FILL`'
  if (id.endsWith('.content') || id.endsWith('.on-solid')) return '`TEXT_FILL`'
  if (id.startsWith('status.')) return '`FRAME_FILL`, `SHAPE_FILL`'
  if (id.startsWith('border.')) return '`STROKE_COLOR`'
  return '`FRAME_FILL`'
}

function buildSkillMarkdown(name: string, project: string, description: string): string {
  return [
    '---',
    `name: ${name}`,
    `description: ${yamlQuote(description)}`,
    'compatibility: Requires the figma-use skill to be installed alongside this skill. Pair with figma-generate-library when creating or updating a Figma variable library or components.',
    'metadata:',
    '  mcp-server: figma',
    '---',
    '',
    `# ${project} design system`,
    '',
    'Source of truth for this product\'s tokens in Figma and in code. It does not replace Figma\'s workflow skills — it tells them **which collections, variable names, modes, scopes, and values** to use.',
    '',
    '**You MUST invoke the `figma-use` skill before every `use_figma` call.** It contains Plugin API rules (color range 0–1, font loading, page reset, `return` IDs). Never call `use_figma` without it.',
    '',
    'When creating or updating a Figma library (variables, components, foundation pages), also load `figma-generate-library` and follow its phases. Use **this** skill as the token plan for Phase 0–1 — do not invent a second vocabulary.',
    '',
    '## When to use',
    '',
    '- Creating or updating **Figma variables, modes, or a design-system library** for this product',
    '- Generating screens or components in Figma that must follow this system\'s tokens',
    '- Binding fills, strokes, text, radius, or spacing to variables instead of hardcoded hex/px',
    '- Implementing UI in code that must match this product (CSS variables, components)',
    '- Choosing a color, type, spacing, or radius token by **role** (`content.primary`, not a raw ramp step)',
    '',
    'Do not use this skill for a different product, or for Figma work that is not this design system (FigJam boards, slides, one-off illustrations).',
    '',
    '## Instructions',
    '',
    '1. Load `figma-use`. If the task is a library (collections, components, docs pages), also load `figma-generate-library`. Pass both names in `skillNames` on every `use_figma` call.',
    '2. Read [references/tokens.md](references/tokens.md) before creating anything. Those tables are the resolved values. Do not invent token names, hex values, or extra modes.',
    '3. Use these **exact collection names** (same as the Escala Figma plugin):',
    '   - `Color Primitives` — 12-step ramps. One mode. Names like `Accent/09`, `Neutral/12`, `State/Error/11`. Pad single-digit tones (`01`…`09`) so the panel sorts numerically.',
    '   - `Color Semantics` — categorical roles. **One mode per theme** (`Light`, `Dark`, …). Names `{Group}/{key}` — `Content/primary`, `Action/primary.default`, `Status/critical.content`.',
    '   - `Typography`, `Spacing`, `Radius`, `Size`, `Grid` — matching tables in `references/tokens.md`.',
    '4. **Primitives:** `scopes = []` (hidden from pickers). Designers pick semantics only. Alias semantic COLOR variables to the primitive that carries the same opaque hex — do not duplicate raw color.',
    '5. **Semantics:** targeted scopes, never `ALL_SCOPES`. Content / on-solid / status ink → `TEXT_FILL`. Action / surface / status fills → `FRAME_FILL`, `SHAPE_FILL`. Border → `STROKE_COLOR`. Full map: [references/semantic-contract.md](references/semantic-contract.md).',
    '6. Set **WEB code syntax** on every variable to the CSS form with a `var()` wrapper — without `var()`, Dev Mode shows hex. Dots in a role id become hyphens: `content.link.default` → `var(--color-content-link-default)`. The Figma name keeps the dotted key (`Content/link.default`).',
    '7. Pair fills with their contracted ink. Do not mix:',
    '   - `Action/primary.default` → `Content/on-action`',
    '   - `Action/secondary.*` → `Content/primary`',
    '   - `Status/*/surface` → `Status/*/content`',
    '   - `Status/critical.surface-solid` → `Status/critical.on-solid`',
    '   - `Surface/inverse` → `Content/inverse`',
    '   - Inputs: `Surface/input` + `Border/strong`. Focus: `Border/focus`, never `Border/accent`.',
    '8. Bind components to **semantic** variables only. Never hardcode hex or px when a token exists. Work in small `use_figma` calls; `return` every created/mutated node id; convert hex to `{r,g,b,a}` in 0–1.',
    '',
    '## Examples',
    '',
    '**Request:** “Apply this design system as Figma variables.”',
    '',
    '**Expected:** `Color Primitives` (one mode, ramps from `references/tokens.md`) and `Color Semantics` (modes Light/Dark, every categorical role). Each semantic variable aliases a primitive, has targeted scopes, and WEB code syntax `var(--color-…)`. No second “tokens” collection. No `ALL_SCOPES`.',
    '',
    '**Request:** “Build a primary button in Figma that matches this system.”',
    '',
    '**Expected:** Fill bound to `Action/primary.default`, label fill bound to `Content/on-action`, radius from the Radius collection, hover/pressed variants bound to `Action/primary.hover` and `Action/primary.pressed`. `figma-use` loaded first.',
    '',
    '## Common edge cases',
    '',
    '- **Escala plugin already imported this file.** Update values on the existing `Color Primitives` / `Color Semantics` collections. Do not create a parallel set with different names.',
    '- **Figma plan mode cap** (Free = 1 mode per collection). Skip extra themes, report which columns were omitted, and do not flatten dark into the light column.',
    '- **Nested role ids.** Figma name = `Group/key.with.dots` (`Action/primary.default`). CSS / code syntax = hyphens (`var(--color-action-primary-default)`). Do not rename `link.default` to `link-default` in Figma — the plugin keeps the dot.',
    '- **`use_figma` without `figma-use`.** Stop. Load `figma-use`, then retry. Colors are 0–1, not 0–255.',
    '- **Unknown token.** If `references/tokens.md` has no row, do not invent one. Ask which existing role to use, or that a new role must be added in the configurator first.',
    '',
    '## Additional resources',
    '',
    '- Resolved ramps and tables: [references/tokens.md](references/tokens.md)',
    '- Role comments, Figma names, scopes, code syntax: [references/semantic-contract.md](references/semantic-contract.md)',
    '',
  ].join('\n')
}

function buildSemanticContractMd(): string {
  const rows = GROUP_ORDER.flatMap((group) =>
    Object.entries(CATEGORICAL_ROLE_COMMENTS)
      .filter(([id]) => id === group || id.startsWith(`${group}.`))
      .map(([id, comment]) =>
        `| \`${id}\` | \`${figmaSemanticName(id)}\` | \`${webCodeSyntax(id)}\` | ${scopesFor(id)} | ${comment} |`),
  )
  return [
    '# Semantic contract',
    '',
    'Categorical roles for this system. Figma names match the Escala plugin (`Color Semantics`). WEB code syntax must include the `var()` wrapper.',
    '',
    '| Token | Figma variable | WEB code syntax | Scopes | Role |',
    '|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n')
}

export function buildSkillExport(colorFormat: ColorFormat = 'hex'): SkillPackage {
  const store = useDesignStore.getState()
  const project = store.projectName?.trim() || 'Design system'
  const name = skillName(project)
  const modes = store.themeOrder.filter((t) => store.themes[t])
  const description = [
    `Applies the ${project} design system in Figma and in code: Color Primitives and Color Semantics variable collections (content, action, surface, status, border), typography, spacing, radius, size, and grid.`,
    'Use when creating or updating Figma variables, modes, or a design-system library; when generating screens or components that must follow this product; or when implementing UI with these tokens.',
    'Requires figma-use before any use_figma call.',
  ].join(' ')

  const skillMd = buildSkillMarkdown(name, project, description)
  const tokensMd = buildSectionExport('all', 'md', colorFormat, {
    modes: modes.length ? modes : ['light'],
  })
  const contractMd = buildSemanticContractMd()

  const encoder = new TextEncoder()
  const zip = zipStore([
    { path: `${name}/SKILL.md`, data: encoder.encode(skillMd) },
    { path: `${name}/references/tokens.md`, data: encoder.encode(tokensMd) },
    { path: `${name}/references/semantic-contract.md`, data: encoder.encode(contractMd) },
  ])

  return { name, skillMd, zip }
}
