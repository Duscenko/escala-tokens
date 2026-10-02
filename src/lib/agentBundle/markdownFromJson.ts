// Store-free markdown from a published TokenJSON. Skill zip, Get code · Agent,
// and the Figma plugin clipboard all call these — do not hand-write a second
// catalog. Values come from the payload; names use Figma slashes / CSS var().

import {
  GROUP_LABEL,
  GROUP_ORDER,
  cap,
  figmaPrimitiveName,
  figmaSemanticName,
  figmaSpacingName,
  figmaDimensionName,
  table,
} from './names'
import type { TokenJSON } from './types'

/** Same text the Skill zip ships as `references/tokens.md`. */
export function buildTokensMd(json: TokenJSON): string {
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
    const name = figmaPrimitiveName(key, {
      themeSources: json.colors.themeSources,
      themeOrder: json.colors.themeOrder,
      themeLabels: json.colors.themeLabels,
    })
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

/** The Dimension primitive a step aliases, from the payload's own refs. */
function primitiveOf(json: TokenJSON, category: string, key: string): string {
  const ref = json.dimensionRefs?.[category]?.[key]
  return ref ? `\`${ref.replace(/^\{|\}$/g, '')}\`` : '—'
}

/** Figma variable · Value · Primitive for one category of lengths. */
function lengthTable(json: TokenJSON, category: string, map: Record<string, string>, name: (k: string) => string): string {
  return table(['Figma variable', 'Value', 'Primitive'], Object.entries(map).map(([k, v]) => [`\`${name(k)}\``, `\`${v}\``, primitiveOf(json, category, k)]))
}

/** Same text the Skill zip ships as `references/foundations.md`. */
export function buildFoundationsMd(json: TokenJSON): string {
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
    ...(json.dimensions && Object.keys(json.dimensions).length
      ? [
          '## Dimension primitives (`Dimension Primitives` collection)',
          '',
          'One collection of lengths, named by value and identical in every theme (`dimension.16` = 16px, `dimension.3_5` = 3.5px). Every spacing, radius, size, selector, stroke and breakpoint step below aliases one of these — the **Primitive** column says which. Never use a px that is not here.',
          '',
          Object.keys(json.dimensions).map((k) => [k, Number(k.replace('_', '.'))] as const).sort((a, b) => a[1] - b[1]).map(([k]) => `\`${k}\``).join(' · '),
          '',
        ]
      : []),
    '## Spacing (`Dimension Semantics` → `Spacing/`)',
    '',
    lengthTable(json, 'spacing', json.spacing, figmaSpacingName),
    '',
  ]

  if (json.padding && Object.keys(json.padding).length) {
    parts.push('### Padding', '')
    parts.push(lengthTable(json, 'padding', json.padding, (k) => figmaDimensionName('Spacing', `padding/${k}`)), '')
  }

  parts.push(
    '## Radius (`Dimension Semantics` → `Radius/`)',
    '',
    lengthTable(json, 'radius', json.radius, (k) => figmaDimensionName('Radius', k)),
    '',
    '## Size (`Dimension Semantics` → `Size/`)',
    '',
    lengthTable(json, 'sizes', json.sizes ?? {}, (k) => figmaDimensionName('Size', k)),
    '',
    '## Grid (`Dimension Semantics` → `Grid/`)',
    '',
    lengthTable(json, 'grid', json.grid ?? {}, (k) => figmaDimensionName('Grid', k)),
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
