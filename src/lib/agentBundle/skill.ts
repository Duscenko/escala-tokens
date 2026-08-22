import { CATEGORICAL_ROLE_COMMENTS } from '../semanticArchitectures'
import { iconAiContext } from '../iconLibraries'
import { zipStore } from '../zipStore'
import {
  GROUP_LABEL,
  GROUP_ORDER,
  cap,
  figmaPrimitiveName,
  figmaSemanticName,
  figmaSpacingName,
  scopesFor,
  skillName,
  table,
  webCodeSyntax,
  yamlQuote,
  type SemanticGroup,
} from './names'
import type { AgentBundleFile, AgentBundleOptions, SkillPackage, TokenJSON } from './types'

function rolesInGroup(group: SemanticGroup): string[] {
  return Object.keys(CATEGORICAL_ROLE_COMMENTS).filter((id) => id === group || id.startsWith(`${group}.`))
}

function catalogLines(iconKey?: string): string[] {
  const icons = iconAiContext(iconKey)
  const lines: string[] = [
    '## Token catalog',
    '',
    'This catalog **is** the token list for this product. Do not search the repo, do not invent names, and do not skip a group because a `references/` file is missing — Figma often loads only this SKILL.md. Hex values live in `references/tokens.md` when that file is in context; names below are enough to create and bind variables.',
    '',
    '### Collections (exact Figma names)',
    '',
    '| Collection | Modes | What it holds |',
    '|---|---|---|',
    '| `Color Primitives` | 1 | Raw ramps: `Accent/*`, `Neutral/*`, `State/{Error,Success,Warning,Info}/*` and dark twins. Designers do not pick these. |',
    '| `Color Semantics` | one per theme (`Light`, `Dark`, …) | Categorical roles in five groups: **Content · Action · Surface · Status · Border**. |',
    '| `Typography` | Desktop · Mobile | Primitives (`family`, `size/*`, `weight/*`, `line-height/*`) plus semantic text styles `text-{role}` (label, placeholder, heading, …) that alias those primitives. |',
    '| `Spacing` | 1 | Scale steps `step/{n}` plus `padding/{top,right,bottom,left}` |',
    '| `Radius` | 1 | Corner radii (`none`, `sm`, `md`, `lg`, `full`) |',
    '| `Size` | 1 | Control heights (`xs`–`2xl`) |',
    '| `Grid` | 1 | `columns`, `gutter`, `margin`, `container`, `breakpoint-*` |',
    '',
    'Paint styles (gradients) and effect styles (shadows) are **styles**, not variables — Figma has no gradient/shadow variable type.',
    '',
    '### Icons',
    '',
    icons.instruction,
    '',
    `- **Set:** ${icons.source.label}`,
    `- **Repo:** ${icons.source.repo}`,
    `- **Package:** \`${icons.source.npm}\``,
    '- Import per-icon from that package. Do not invent glyphs from another family.',
    '',
  ]

  lines.push('### Color Semantics — every role (Figma name)')
  lines.push('')
  lines.push('Nested ids use `/`, never `.`. `action.primary.default` in the catalog is `Action/primary/default` in Figma.')
  lines.push('')
  for (const group of GROUP_ORDER) {
    const label = GROUP_LABEL[group]
    const ids = rolesInGroup(group)
    lines.push(`#### ${label}`)
    lines.push('')
    for (const id of ids) {
      const comment = CATEGORICAL_ROLE_COMMENTS[id] ?? ''
      const role = comment.match(/^\[ROLE: ([^\]]+)\]/)?.[1] ?? ''
      lines.push(`- \`${figmaSemanticName(id)}\`${role ? ` — ${role}` : ''} (\`${id}\`)`)
    }
    lines.push('')
  }

  lines.push('Pair fills with their contracted ink. Do not mix:')
  lines.push('- `Action/primary/default` → `Content/on-action`')
  lines.push('- `Action/secondary/*` → `Content/primary`')
  lines.push('- `Status/*/surface` → `Status/*/content`')
  lines.push('- `Status/critical/surface-solid` → `Status/critical/on-solid`')
  lines.push('- `Surface/inverse` → `Content/inverse`')
  lines.push('- Inputs: `Surface/input` + `Border/strong`. Focus: `Border/focus`, never `Border/accent`.')
  lines.push('')
  return lines
}

function buildSkillMarkdown(name: string, project: string, description: string, iconKey?: string): string {
  const icons = iconAiContext(iconKey)
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
    'When creating or updating a Figma library (variables, components, docs pages), also load `figma-generate-library` and follow its phases. Use **this** skill as the token plan for Phase 0–1 — do not invent a second vocabulary.',
    '',
    '## When to use',
    '',
    '- Creating or updating **Figma variables, modes, or a design-system library** for this product',
    '- Generating screens or components in Figma that must follow this system\'s tokens',
    '- Binding fills, strokes, text, radius, or spacing to variables instead of hardcoded hex/px',
    '- Applying **foundations**: typography, spacing, radius, size, grid, shadow effect styles, gradient paint styles',
    '- Picking **icons** — only the repository named under Icons, never a mixed set',
    '- Implementing UI in code that must match this product (CSS variables, components)',
    '- Choosing a color, type, spacing, or radius token by **role** (`Content/primary`, not a raw ramp step)',
    '',
    'Do not use this skill for a different product, or for Figma work that is not this design system (FigJam boards, slides, one-off illustrations).',
    '',
    '## Instructions',
    '',
    '1. Load `figma-use`. If the task is a library (collections, components, docs pages), also load `figma-generate-library`. Pass both names in `skillNames` on every `use_figma` call.',
    '2. Read **Token catalog** in this file before creating anything. That list is complete. `references/tokens.md` and `references/foundations.md` have resolved values — load them if present; if they are not in context, still use the catalog names. Do not invent token names, hex values, extra groups, or extra modes. Do not fall back to exploring the Figma file for names unless the user asked you to audit an existing import.',
    '3. Use the **exact collection names** in the catalog (`Color Primitives`, `Color Semantics`, `Typography`, `Spacing`, `Radius`, `Size`, `Grid`). Semantics groups are Content, Action, Surface, Status, Border — all five, always.',
    '4. **Primitives:** `scopes = []` (hidden from pickers). Designers pick semantics only. Alias semantic COLOR variables to the primitive that carries the same opaque hex — do not duplicate raw color.',
    '5. **Semantics:** targeted scopes, never `ALL_SCOPES`. Content / on-solid / status ink → `TEXT_FILL`. Action / surface / status fills → `FRAME_FILL`, `SHAPE_FILL`. Border → `STROKE_COLOR`. Full map: [references/semantic-contract.md](references/semantic-contract.md).',
    '6. Set **WEB code syntax** on every variable to the CSS form with a `var()` wrapper — without `var()`, Dev Mode shows hex. Dots in a role id become hyphens in CSS: `content.link.default` → `var(--color-content-link-default)`. The Figma name uses `/` (`Content/link/default`).',
    '7. Foundations: spacing steps are `step/{n}` (a Figma name cannot start with a digit). Text **primitives** are `{project}/Type/{size}`. Text **roles** are `{project}/Type/{role}` with Desktop and Mobile (alias the size/weight/family primitives — do not duplicate px). Shadows are effect styles `{project}/Shadow/{xs…2xl}`. Gradients are paint styles `{project}/Gradient/{slug}`. See [references/foundations.md](references/foundations.md).',
    `8. **Icons:** ${icons.instruction}`,
    '9. Bind components to **semantic** variables only. Never hardcode hex or px when a token exists. Work in small `use_figma` calls; `return` every created/mutated node id; convert hex to `{r,g,b,a}` in 0–1.',
    '',
    ...catalogLines(iconKey),
    '## Examples',
    '',
    '**Request:** “Apply this design system as Figma variables.”',
    '',
    '**Expected:** `Color Primitives` (one mode) and `Color Semantics` (modes Light/Dark, **all five groups** Content · Action · Surface · Status · Border). Plus Typography, Spacing (`step/*`), Radius, Size, Grid, shadow effect styles, gradient paint styles. Each semantic COLOR aliases a primitive, has targeted scopes, and WEB code syntax `var(--color-…)`. No second “tokens” collection. No `ALL_SCOPES`.',
    '',
    '**Request:** “Build a primary button in Figma that matches this system.”',
    '',
    '**Expected:** Fill bound to `Action/primary/default`, label fill bound to `Content/on-action`, radius from the Radius collection, hover/pressed variants bound to `Action/primary/hover` and `Action/primary/pressed`. `figma-use` loaded first.',
    '',
    '## Common edge cases',
    '',
    '- **`references/tokens.md` not found.** Use the Token catalog in this SKILL.md. Do not stop, and do not invent a parallel vocabulary from the Figma file.',
    '- **Escala plugin already imported this file.** Update values on the existing collections (`Color Primitives`, `Color Semantics`, …). Do not create a parallel set with different names.',
    '- **Figma plan mode cap** (Free = 1 mode per collection). Skip extra themes, report which columns were omitted, and do not flatten dark into the light column.',
    '- **Nested role ids.** Figma name = `Group/path/with/slashes` (`Action/primary/default`). CSS = hyphens (`var(--color-action-primary-default)`). Dots in Figma variable names throw and abort the rest of the import.',
    '- **`use_figma` without `figma-use`.** Stop. Load `figma-use`, then retry. Colors are 0–1, not 0–255.',
    '- **Unknown token.** If it is not in the Token catalog, do not invent one. Ask which existing role to use, or that a new role must be added in the configurator first.',
    '- **Wrong icon family.** If the Icons section names a GitHub repo, use that package only. Mixing Lucide/Heroicons/Tabler/Mage in one screen is a token violation.',
    '',
    '## Additional resources',
    '',
    '- Resolved color values: [references/tokens.md](references/tokens.md)',
    '- Spacing, type, radius, size, grid, shadows, gradients: [references/foundations.md](references/foundations.md)',
    '- Role comments, Figma names, scopes, code syntax: [references/semantic-contract.md](references/semantic-contract.md)',
    '',
  ].join('\n')
}

function buildSemanticContractMd(): string {
  const rows = GROUP_ORDER.flatMap((group) =>
    rolesInGroup(group).map((id) =>
      `| \`${id}\` | \`${figmaSemanticName(id)}\` | \`${webCodeSyntax(id)}\` | ${scopesFor(id)} | ${CATEGORICAL_ROLE_COMMENTS[id] ?? ''} |`),
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

function buildTokensMd(json: TokenJSON): string {
  const themes = json.colors.themeOrder?.length
    ? json.colors.themeOrder
    : Object.keys(json.colors.themes ?? { light: {} })
  const arch = json.colors.architecture

  const parts: string[] = [
    `# ${json.project} — color tokens`,
    '',
    'Figma names as the Escala plugin writes them. Semantic groups are Content, Action, Surface, Status, Border — all five.',
    '',
    `**Architecture:** ${arch?.kind ?? json.colors.semanticArchitecture ?? 'categorical'}`,
    `**Modes (Color Semantics columns):** ${themes.map((t) => `\`${cap(t)}\``).join(', ')}`,
    '',
    '## Color Primitives (`Color Primitives`, 1 mode)',
    '',
    'Hidden from pickers (`scopes = []`). Semantic tokens alias these by hex.',
    '',
  ]

  const byGroup = new Map<string, [string, string][]>()
  for (const [key, hex] of Object.entries(json.colors.primitive ?? {})) {
    if (!hex) continue
    const name = figmaPrimitiveName(key)
    const group = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : name
    const list = byGroup.get(group) ?? []
    list.push([name, hex])
    byGroup.set(group, list)
  }
  for (const [group, rows] of byGroup) {
    parts.push(`### ${group}`, '')
    parts.push(table(['Figma variable', 'Hex'], rows.map(([n, h]) => [`\`${n}\``, `\`${h}\``])))
    parts.push('')
  }

  parts.push('## Color Semantics (`Color Semantics`)', '')
  if (arch?.tokens) {
    for (const group of GROUP_ORDER) {
      const byKey = arch.tokens[group]
      if (!byKey) continue
      parts.push(`### ${GROUP_LABEL[group]}`, '')
      const headers = ['Figma variable', 'Role id', ...themes.map((t) => cap(t))]
      const rows = Object.entries(byKey).map(([key, byTheme]) => [
        `\`${figmaSemanticName(`${group}.${key}`)}\``,
        `\`${group}.${key}\``,
        ...themes.map((t) => {
          const v = byTheme[t]
          return v ? `\`${v}\`` : '—'
        }),
      ])
      parts.push(table(headers, rows), '')
    }
  } else {
    parts.push('_No `colors.architecture` in this payload — use the flat `colors.themes` roles._', '')
  }

  return parts.join('\n')
}

function buildFoundationsMd(json: TokenJSON): string {
  const prefix = json.project || 'SD'
  const t = json.typography
  const parts: string[] = [
    `# ${json.project} — foundations`,
    '',
    'Everything that is not a color role: type, spacing, radius, size, grid, shadows, gradients. Names match the Escala Figma plugin.',
    '',
    '## Typography (`Typography` collection)',
    '',
    `- \`family\` = \`${t.fontFamily}\``,
    `- \`heading-family\` = \`${t.headingFontFamily ?? t.fontFamily}\``,
    '',
    '### Sizes → also text styles `{project}/Type/{key}`',
    '',
    table(
      ['Figma variable', 'Text style', 'Size', 'Line height'],
      Object.entries(t.sizes).map(([k, v]) => [
        `\`size/${k}\``,
        `\`${prefix}/Type/${k}\``,
        `\`${v}\``,
        `\`${t.lineHeights?.[k] ?? 'AUTO'}\``,
      ]),
    ),
    '',
    '### Weights',
    '',
    table(['Figma variable', 'Value'], Object.entries(t.weights).map(([k, v]) => [`\`weight/${k}\``, `\`${v}\``])),
    '',
    '### Text roles → `{project}/Type/{role}` (Desktop / Mobile)',
    '',
    'Each role aliases primitive size, weight and family. Do not store a second px.',
    '',
    table(
      ['Role', 'Desktop', 'Mobile'],
      Object.entries(t.roles ?? {}).map(([k, m]) => [
        `\`${prefix}/Type/${k}\``,
        `\`${m.desktop.size}\` · ${m.desktop.weight} · ${m.desktop.family}`,
        `\`${m.mobile.size}\` · ${m.mobile.weight} · ${m.mobile.family}`,
      ]),
    ),
    '',
    '## Spacing (`Spacing` collection)',
    '',
    'Numeric steps cannot be a Figma variable name on their own — they nest under `step/`.',
    '',
    table(
      ['Figma variable', 'Value'],
      Object.entries(json.spacing).map(([k, v]) => [`\`${figmaSpacingName(k)}\``, `\`${v}\``]),
    ),
    '',
  ]

  if (json.padding && Object.keys(json.padding).length) {
    parts.push('### Padding', '')
    parts.push(table(
      ['Figma variable', 'Value'],
      Object.entries(json.padding).map(([k, v]) => [`\`padding/${k}\``, `\`${v}\``]),
    ), '')
  }

  parts.push(
    '## Radius (`Radius` collection)',
    '',
    table(['Figma variable', 'Value'], Object.entries(json.radius).map(([k, v]) => [`\`${k}\``, `\`${v}\``])),
    '',
    '## Size (`Size` collection)',
    '',
    table(['Figma variable', 'Value'], Object.entries(json.sizes ?? {}).map(([k, v]) => [`\`${k}\``, `\`${v}\``])),
    '',
    '## Grid (`Grid` collection)',
    '',
    table(['Figma variable', 'Value'], Object.entries(json.grid ?? {}).map(([k, v]) => [`\`${k}\``, `\`${v}\``])),
    '',
    '## Shadows (effect styles — not variables)',
    '',
    table(
      ['Figma style', 'CSS'],
      Object.entries(json.shadows ?? {}).map(([k, v]) => [`\`${prefix}/Shadow/${k}\``, `\`${v}\``]),
    ),
    '',
  )

  const gradients = json.gradients ?? {}
  if (Object.keys(gradients).length) {
    const assigned = json.gradientAssignments ?? {}
    parts.push(
      '## Gradients (paint styles — not variables)',
      '',
      table(
        ['Figma style', 'CSS', 'Assigned to'],
        Object.entries(gradients).map(([slug, css]) => {
          const tags = (['cover', 'avatar'] as const).filter((s) => assigned[s] === slug).join(', ')
          return [`\`${prefix}/Gradient/${slug}\``, `\`${css}\``, tags || '—']
        }),
      ),
      '',
    )
  }

  const ai = json.icons?.aiSource
  if (ai?.repo) {
    parts.push(
      '## Icons',
      '',
      `When generating UI for this product, use icons from ${ai.repo} (${ai.label}, \`${ai.npm}\`). Do not mix another icon family.`,
      '',
      `- **Set:** ${ai.label}`,
      `- **Repo:** ${ai.repo}`,
      `- **Package:** \`${ai.npm}\``,
      '',
    )
  }

  return parts.join('\n')
}

function skillDescription(project: string, iconKey?: string): string {
  return [
    `Applies the ${project} design system in Figma: Color Primitives and Color Semantics (Content, Action, Surface, Status, Border), typography, spacing, radius, size, grid, shadow styles, and gradient styles.`,
    `Icons: ${iconAiContext(iconKey).source.repo}.`,
    'Use when creating or updating Figma variables, modes, or a design-system library; when generating screens or components that must follow this product; or when implementing UI with these tokens.',
    'Requires figma-use before any use_figma call.',
  ].join(' ')
}

/** Markdown files of the Figma Skill package. No zip, no store. */
export function buildAgentSkillFiles(json: TokenJSON, opts: AgentBundleOptions = {}): {
  name: string
  files: AgentBundleFile[]
} {
  const project = json.project?.trim() || opts.projectFallback?.trim() || 'Design system'
  const iconKey = opts.iconKey ?? json.icons?.aiSource?.key
  const name = skillName(project)
  const skillMd = buildSkillMarkdown(name, project, skillDescription(project, iconKey), iconKey)
  return {
    name,
    files: [
      { path: 'SKILL.md', text: skillMd },
      { path: 'references/tokens.md', text: buildTokensMd(json) },
      { path: 'references/foundations.md', text: buildFoundationsMd(json) },
      { path: 'references/semantic-contract.md', text: buildSemanticContractMd() },
    ],
  }
}

/** Skill zip from a TokenJSON payload. Safe to call from Vitest, Vercel, or MCP. */
export function buildAgentBundle(json: TokenJSON, opts: AgentBundleOptions = {}): SkillPackage {
  const { name, files } = buildAgentSkillFiles(json, opts)
  const encoder = new TextEncoder()
  const zip = zipStore(files.map((f) => ({ path: f.path, data: encoder.encode(f.text) })))
  const skillMd = files.find((f) => f.path === 'SKILL.md')?.text ?? ''
  return { name, skillMd, zip }
}
