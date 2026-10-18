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

/** Figma variable · CSS · Value · Primitive for one category of lengths. */
function lengthTable(json: TokenJSON, category: string, map: Record<string, string>, name: (k: string) => string, cssPrefix: string): string {
  return table(
    ['Figma variable', 'CSS', 'Value', 'Primitive'],
    Object.entries(map).map(([k, v]) => [`\`${name(k)}\``, `\`var(--${cssPrefix}-${k})\``, `\`${v}\``, primitiveOf(json, category, k)]),
  )
}

/** A role's stored value → what it points at and the px it resolves to.
 *  A value is a step of the family's scale or a pinned `dimension-<key>`. */
function roleTarget(value: string, steps: Record<string, string>): [string, string] {
  const pinned = /^dimension-(.+)$/.exec(value)
  if (pinned) return [`\`dimension.${pinned[1]}\``, `\`${Number(pinned[1].replace('_', '.'))}px\``]
  return [`\`${value}\``, steps[value] ? `\`${steps[value]}\`` : '—']
}

/** Figma variable · CSS · Step · Value for one family's roles. */
function roleTable(group: string, cssPrefix: string, roles: Record<string, string> | undefined, steps: Record<string, string>): string[] {
  const entries = Object.entries(roles ?? {})
  if (!entries.length) return []
  return [
    `### ${group} roles — bind these, not the steps`,
    '',
    table(
      ['Figma variable', 'CSS', 'Step', 'Value'],
      entries.map(([k, v]) => [`\`${figmaDimensionName(group, `role/${k}`)}\``, `\`var(--${cssPrefix}-${k})\``, ...roleTarget(v, steps)]),
    ),
    '',
  ]
}

/** Token · desktop step · tablet/mobile steps for a responsive map. */
function responsiveTable(map: Record<string, Record<string, string>> | undefined, label: string): string[] {
  const entries = Object.entries(map ?? {})
  if (!entries.length) return []
  return [
    `### ${label}`,
    '',
    'Each token reads a static step per viewport. Roles on one of these step down with it. Edit one viewport at a time in Variables (Platform switch).',
    '',
    table(
      ['Token', 'Desktop', 'Tablet · Mobile'],
      entries.map(([k, v]) => [
        `\`${k}\``,
        `\`${v.desktop ?? '—'}\``,
        `\`${v.tablet ?? '—'}\` · \`${v.mobile ?? '—'}\``,
      ]),
    ),
    '',
  ]
}

function px(n: number | undefined): string {
  return n == null ? '—' : `\`${n}px\``
}

/** Responsive spacing token → its Desktop px, so a role on one shows a value. */
function responsiveDesktop(json: TokenJSON): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [token, by] of Object.entries(json.spacingResponsive ?? {})) {
    const value = json.spacing[by.desktop]
    if (value) out[token] = value
  }
  return out
}

/** Same text the Skill zip ships as `references/foundations.md`.
 *
 *  Figma names are the ones the Escala plugin WRITES (`code.ts`): text styles
 *  exist for the type ROLES only (`Type/<role>`, plus `(Tablet)` / `(Mobile)`
 *  twins), shadows are `Shadow/<step>` with a `(Dark)` twin, gradients
 *  `Gradient/<slug>` with a `(Dark)` twin when the stops differ. None of them
 *  carries the project name. The two family variables are
 *  `font-family-body` / `font-family-display`.
 *
 *  `appearance` is set when the payload was narrowed to one appearance
 *  (`contextSource.onlyAppearance`): shadows and gradients then show that
 *  appearance's values under its own label. */
export function buildFoundationsMd(json: TokenJSON, opts: { appearance?: 'light' | 'dark' } = {}): string {
  const t = json.typography
  const appearance = opts.appearance
  const parts: string[] = [
    `# ${json.project} — foundations`,
    '',
    'Everything that is not a color role: type, spacing, radius, stroke (border width), size, selector, grid, shadows, gradients, icons. Figma names match the Escala plugin; the CSS column is the custom property in `variables.css`.',
    '',
    '## Typography (`Typography` collection)',
    '',
    'Modes are viewports: Desktop · Tablet · Mobile.',
    '',
    `- \`font-family-body\` = \`${t.fontFamily}\` · CSS \`var(--font-family-body)\``,
    `- \`font-family-display\` = \`${t.headingFontFamily ?? t.fontFamily}\` · CSS \`var(--font-family-heading)\``,
    '',
    '### Sizes (primitives — bind a text role, not these)',
    '',
    table(
      ['Figma variable', 'CSS', 'Size', 'Line height', 'Letter spacing'],
      Object.entries(t.sizes).map(([k, v]) => [
        `\`size/${k}\` · \`line-height/${k}\` · \`letter-spacing/${k}\``,
        `\`var(--font-size-${k})\` · \`var(--line-height-${k})\` · \`var(--letter-spacing-${k})\``,
        `\`${v}\``,
        `\`${t.lineHeights?.[k] ?? 'AUTO'}\``,
        `\`${t.letterSpacings?.[k] ?? '0px'}\``,
      ]),
    ),
    '',
    '### Weights',
    '',
    table(['Figma variable', 'CSS', 'Value'], Object.entries(t.weights).map(([k, v]) => [`\`weight/${k}\``, `\`var(--font-weight-${k})\``, `\`${v}\``])),
    '',
    '### Text roles → text styles `Type/{role}` (Desktop / Tablet / Mobile)',
    '',
    'Each role aliases primitive size, weight and family. Do not store a second px. In Figma the role is the variables `role/<role>/size|weight|family` (one value per viewport mode) and the text style `Type/<role>`; `Type/<role> (Tablet)` and `(Mobile)` pin the smaller size. In CSS a role is five properties: `--text-<role>-font-family`, `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing` (the **CSS** column is the prefix), each with a `-tablet` and `-mobile` twin.',
    '',
    table(
      ['Text style', 'CSS', 'Desktop', 'Tablet', 'Mobile'],
      Object.entries(t.roles ?? {}).map(([k, m]) => {
        const cell = (a: { size: string; weight: string; family: string }) => `\`${a.size}\` · ${a.weight} · ${a.family}`
        return [`\`Type/${k}\``, `\`--text-${k}-*\``, cell(m.desktop), cell(m.tablet ?? m.desktop), cell(m.mobile)]
      }),
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
    lengthTable(json, 'spacing', json.spacing, figmaSpacingName, 'spacing'),
    '',
    ...roleTable('Spacing', 'spacing', json.spacingRoleRefs ?? json.spacingRoles, { ...responsiveDesktop(json), ...json.spacing }),
    ...responsiveTable(json.spacingResponsive, 'Responsive spacing (`Spacing/<family>/<size>`, CSS `--spacing-<family>-<size>`)'),
  ]

  if (json.padding && Object.keys(json.padding).length) {
    parts.push('### Padding', '')
    parts.push(lengthTable(json, 'padding', json.padding, (k) => figmaDimensionName('Spacing', `padding/${k}`), 'padding'), '')
  }

  parts.push(
    '## Radius (`Dimension Semantics` → `Radius/`)',
    '',
    lengthTable(json, 'radius', json.radius, (k) => figmaDimensionName('Radius', k), 'radius'),
    '',
    ...roleTable('Radius', 'radius', json.radiusRoles, json.radius),
    ...responsiveTable(json.radiusResponsive, 'Responsive radius (a role on a step follows it per viewport)'),
  )

  if (json.stroke && Object.keys(json.stroke).length) {
    parts.push(
      '## Stroke — border width (`Dimension Semantics` → `Stroke/`)',
      '',
      'Border **width** only. Border **color** is a Color Semantics role (`border.*` in `references/tokens.md`).',
      '',
      lengthTable(json, 'stroke', json.stroke, (k) => figmaDimensionName('Stroke', k), 'stroke'),
      '',
      ...roleTable('Stroke', 'stroke', json.strokeRoles, json.stroke),
    )
  }

  parts.push(
    '## Size — control height (`Dimension Semantics` → `Size/`)',
    '',
    lengthTable(json, 'sizes', json.sizes ?? {}, (k) => figmaDimensionName('Size', k), 'size'),
    '',
    ...roleTable('Size', 'size', json.sizeRoles, json.sizes ?? {}),
  )

  if (json.selector && Object.keys(json.selector).length) {
    parts.push(
      '## Selector — checkbox, radio, switch knob (`Dimension Semantics` → `Selector/`)',
      '',
      lengthTable(json, 'selector', json.selector, (k) => figmaDimensionName('Selector', k), 'selector'),
      '',
      ...roleTable('Selector', 'selector', json.selectorRoles, json.selector),
    )
  }

  parts.push(
    '## Grid (`Dimension Semantics` → `Grid/`)',
    '',
    lengthTable(json, 'grid', json.grid ?? {}, (k) => figmaDimensionName('Grid', k), 'grid'),
    '',
  )

  if (json.gridStyles?.length) {
    parts.push(
      '### Grid styles (Figma layout grid styles `Grid/<name>`)',
      '',
      table(
        ['Style', 'Viewport', 'Columns', 'Column', 'Gutter', 'Margin', 'Width'],
        json.gridStyles.map((g) => [
          `\`Grid/${g.label ?? g.key}\``,
          g.viewport ?? '—',
          String(g.columns ?? '—'),
          px(g.column),
          px(g.gutter),
          px(g.margin),
          g.sidebar ? `${px(g.width)} (sidebar ${px(g.sidebar)})` : px(g.width),
        ]),
      ),
      '',
    )
  }

  // Shadows and gradients: one column per appearance the payload carries. A
  // narrowed payload already holds its own appearance's values in `shadows` /
  // `gradients` (see `onlyAppearance`), so they are labelled with it.
  const single = appearance === 'dark' ? 'Dark' : 'Light'
  const dark = appearance ? {} : json.shadowsDark ?? {}
  const hasDark = Object.keys(dark).length > 0
  const shadowStyle = (k: string) => (appearance === 'dark' ? `\`Shadow/${k} (Dark)\`` : `\`Shadow/${k}\``)
  parts.push(
    '## Shadows (effect styles — not variables)',
    '',
    ...(hasDark ? ['The dark value is the effect style `Shadow/<step> (Dark)`; in CSS `--shadow-<step>` switches inside `.dark`.', ''] : []),
    table(
      ['Figma style', 'CSS', single, ...(hasDark ? ['Dark'] : [])],
      Object.entries(json.shadows ?? {}).map(([k, v]) => [
        shadowStyle(k),
        `\`var(--shadow-${k})\``,
        `\`${v}\``,
        ...(hasDark ? [`\`${dark[k] ?? v}\``] : []),
      ]),
    ),
    '',
  )

  const gradients = json.gradients ?? {}
  if (Object.keys(gradients).length) {
    const assigned = json.gradientAssignments ?? {}
    const gDark = appearance ? {} : json.gradientsDark ?? {}
    const gHasDark = Object.entries(gDark).some(([slug, css]) => css !== gradients[slug])
    parts.push(
      '## Gradients (paint styles — not variables)',
      '',
      ...(gHasDark ? ['A gradient whose dark stops differ also ships `Gradient/<slug> (Dark)`; in CSS `--gradient-<slug>` switches inside `.dark`.', ''] : []),
      table(
        ['Figma style', 'CSS', single, ...(gHasDark ? ['Dark'] : []), 'Assigned to'],
        Object.entries(gradients).map(([slug, css]) => {
          const tags = (['cover', 'avatar'] as const).filter((s) => assigned[s] === slug).join(', ')
          return [
            `\`Gradient/${slug}\``,
            `\`var(--gradient-${slug})\``,
            `\`${css}\``,
            ...(gHasDark ? [`\`${gDark[slug] ?? css}\``] : []),
            tags || '—',
          ]
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
      ...(json.icons?.weight ? [`- **Weight:** \`${json.icons.weight}\``] : []),
      '',
    )
  }

  const iconScale = json.icons?.sizes?.scale ?? {}
  if (Object.keys(iconScale).length) {
    const min = json.icons?.sizes?.minWeight
    parts.push(
      '### Icon sizes (`Dimension Semantics` → `Icon/role/`)',
      '',
      table(['Figma variable', 'CSS', 'Value'], Object.entries(iconScale).map(([k, v]) => [`\`Icon/role/${k}\``, `\`var(--icon-${k})\``, `\`${v}\``])),
      '',
      ...(min?.belowPx && min.weight ? [`Below ${min.belowPx}px a thin or light icon renders \`${min.weight}\`.`, ''] : []),
    )
  }

  return parts.join('\n')
}
