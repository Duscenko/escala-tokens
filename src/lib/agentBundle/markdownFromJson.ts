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
