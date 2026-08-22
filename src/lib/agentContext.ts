// Markdown an agent can paste as the full brief for one catalogue page.
// Copy context is this string: identity, live foundation tokens (radius,
// spacing, padding, size, type), Figma bindings, and a CSS recipe. Input OTP
// is the first page with a full reconstruction spec; other keys get the shared
// token tables plus a shorter characteristics block.

import { COMPONENTS, type ComponentDef } from './componentCatalogue'
import { mdCell } from './utils'
import {
  LAYOUT_ROLES,
  STROKE_STANDARD,
  defaultLayoutRoles,
  mergeLayoutRoles,
  resolveLayoutRole,
  type LayoutFamily,
} from './layoutTokens'

export interface AgentFoundationTokens {
  radius: Record<string, string>
  spacing: Record<string, string>
  sizes?: Record<string, string>
  padding?: Record<string, string>
  stroke?: Record<string, string>
  radiusRoles?: Record<string, string>
  spacingRoles?: Record<string, string>
  sizeRoles?: Record<string, string>
  strokeRoles?: Record<string, string>
  typography?: {
    fontFamily: string
    headingFontFamily?: string
    sizes: Record<string, string>
    weights: Record<string, number>
  }
  shadows?: Record<string, string>
}

const RADIUS_ORDER = ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full']
const SIZE_ORDER = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
const PADDING_ORDER = ['top', 'right', 'bottom', 'left']

function fileNameFor(def: ComponentDef): string {
  return `${def.key.toLowerCase().replace(/\s+/g, '-')}.tsx`
}

function variantCount(def: ComponentDef): number {
  return def.axes.reduce((n, a) => n * a.values.length, 1)
}

function relatedLabels(def: ComponentDef): string[] {
  return COMPONENTS.filter((c) => c.category === def.category && c.key !== def.key)
    .slice(0, 4)
    .map((c) => c.label)
}

function figmaVar(catalogId: string): string {
  const [group, ...rest] = catalogId.split('.')
  return [group.charAt(0).toUpperCase() + group.slice(1), ...rest].join('/')
}

function cssColor(catalogId: string): string {
  return `var(--color-${catalogId.replace(/\./g, '-')})`
}

function figmaSpacing(key: string): string {
  return /^\d/.test(key) ? `step/${key}` : key
}

function primitivesOf(t: AgentFoundationTokens, family: LayoutFamily): Record<string, string> {
  if (family === 'radius') return t.radius
  if (family === 'spacing') return t.spacing
  if (family === 'size') return t.sizes ?? {}
  return t.stroke ?? STROKE_STANDARD
}

function rolesOf(t: AgentFoundationTokens, family: LayoutFamily): Record<string, string> {
  const stored = family === 'radius' ? t.radiusRoles
    : family === 'spacing' ? t.spacingRoles
    : family === 'size' ? t.sizeRoles
    : t.strokeRoles
  return mergeLayoutRoles(family, stored ?? defaultLayoutRoles(family))
}

function roleVal(t: AgentFoundationTokens, family: LayoutFamily, key: string, fallback = '—'): string {
  return resolveLayoutRole(family, rolesOf(t, family), primitivesOf(t, family), key, fallback)
}

function semanticTable(t: AgentFoundationTokens, family: LayoutFamily, title: string): string[] {
  const roles = rolesOf(t, family)
  const lines = [
    `### ${title} (semantics)`,
    '',
    'Intent aliases. Bind these in components — they point at a primitive step, never a new px.',
    '',
    '| Role | CSS | Aliases | Live |',
    '|---|---|---|---|',
  ]
  for (const role of LAYOUT_ROLES[family]) {
    const step = roles[role.key]
    lines.push(
      `| \`${role.key}\` | \`--${family}-${role.key}\` | \`var(--${family}-${step})\` | \`${roleVal(t, family, role.key)}\` |`,
    )
  }
  lines.push('')
  return lines
}

function ordered(map: Record<string, string> | undefined, order: string[]): [string, string][] {
  if (!map) return []
  const rest = Object.keys(map).filter((k) => !order.includes(k)).sort()
  return [...order.filter((k) => k in map), ...rest].map((k) => [k, map[k]])
}

function val(map: Record<string, string> | undefined, key: string, fallback = '—'): string {
  return map?.[key] || fallback
}

function tokenTables(t: AgentFoundationTokens): string[] {
  const lines = [
    '## Design tokens (live)',
    '',
    'Resolved values from **this** system. Use the CSS custom property in code and the Figma variable in the file. **Never hardcode px, rem, or hex when a token exists. Never invent a parallel name.**',
    '',
    '### Radius (`Radius` collection)',
    '',
    '| Step | CSS | Figma | Value |',
    '|---|---|---|---|',
  ]
  ordered(t.radius, RADIUS_ORDER).forEach(([k, v]) =>
    lines.push(`| \`${k}\` | \`--radius-${k}\` | \`${k}\` | \`${v}\` |`),
  )
  lines.push('', ...semanticTable(t, 'radius', 'Radius roles'))
  lines.push(
    '### Spacing (`Spacing` collection)',
    '',
    'Figma names nest under `step/` — a variable cannot start with a digit.',
    '',
    '| Step | CSS | Figma | Value |',
    '|---|---|---|---|',
  )
  Object.entries(t.spacing)
    .sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b))
    .forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--spacing-${k}\` | \`${figmaSpacing(k)}\` | \`${v}\` |`),
    )

  if (t.padding && Object.keys(t.padding).length) {
    lines.push(
      '',
      '### Surface padding',
      '',
      'Per-side inset for padded surfaces (cards, panels). Not cell padding.',
      '',
      '| Side | CSS | Figma | Value |',
      '|---|---|---|---|',
    )
    ordered(t.padding, PADDING_ORDER).forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--padding-${k}\` | \`padding/${k}\` | \`${v}\` |`),
    )
  }

  lines.push(...semanticTable(t, 'spacing', 'Spacing roles'))

  if (t.sizes && Object.keys(t.sizes).length) {
    lines.push(
      '',
      '### Control height (`Size` collection)',
      '',
      '| Step | CSS | Figma | Value |',
      '|---|---|---|---|',
    )
    ordered(t.sizes, SIZE_ORDER).forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--size-${k}\` | \`${k}\` | \`${v}\` |`),
    )
    lines.push('', ...semanticTable(t, 'size', 'Size roles'))
  }

  lines.push(
    '### Stroke (`Stroke` collection)',
    '',
    'Line weight — not paint. Color stays on `border.*`.',
    '',
    '| Step | CSS | Figma | Value |',
    '|---|---|---|---|',
  )
  ordered(primitivesOf(t, 'stroke'), ['none', 'sm', 'md', 'lg']).forEach(([k, v]) =>
    lines.push(`| \`${k}\` | \`--stroke-${k}\` | \`${k}\` | \`${v}\` |`),
  )
  lines.push('', ...semanticTable(t, 'stroke', 'Stroke roles'))

  if (t.typography) {
    const ty = t.typography
    lines.push(
      '',
      '### Type (`Typography` collection)',
      '',
      `- Body family: \`${ty.fontFamily}\` → \`--font-family-body\``,
      `- Heading family: \`${ty.headingFontFamily ?? ty.fontFamily}\` → \`--font-family-heading\``,
      '',
      '| Weight | CSS | Value |',
      '|---|---|---|',
    )
    Object.entries(ty.weights).forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--font-weight-${k}\` | \`${v}\` |`),
    )
    lines.push('', '| Size | CSS | Figma | Value |', '|---|---|---|---|')
    Object.entries(ty.sizes).forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--font-size-${k}\` | \`size/${k}\` | \`${v}\` |`),
    )
  }

  if (t.shadows && Object.keys(t.shadows).length) {
    lines.push('', '### Shadow', '', '| Step | CSS | Value |', '|---|---|---|')
    Object.entries(t.shadows).forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--shadow-${k}\` | \`${mdCell(v)}\` |`),
    )
  }

  lines.push('')
  return lines
}

function figmaSection(def: ComponentDef): string[] {
  const lines = ['## Figma', '']
  if (def.figmaSets.length === 0) {
    lines.push(
      'Not in the Figma library yet — documented and exported here; the component set is on the plugin roadmap.',
      'Do not invent a parallel set name. When the plugin lands it, `figmaSets` will be filled in.',
      '',
    )
    return lines
  }
  lines.push(
    'The Escala sync plugin generates these component sets. Names are exact — do not rename.',
    '',
    ...def.figmaSets.map((s) => `- \`${s}\``),
    '',
    `Variant matrix: **${variantCount(def)}** combination${variantCount(def) === 1 ? '' : 's'} (row-major, first value of each axis is the plugin default).`,
    '',
    'Every fill, stroke and radius on the set is bound **component → semantic → primitive**. Bind Figma paints to **semantic** variables only.',
    '',
  )
  if (def.axes.length) {
    lines.push(
      '### Variant properties',
      '',
      'These are Figma VARIANT properties. Property names and values match the catalogue axes exactly (including casing).',
      '',
      '| Property | Values | Default |',
      '|---|---|---|',
    )
    def.axes.forEach((a) =>
      lines.push(`| \`${mdCell(a.name)}\` | ${mdCell(a.values.map((v) => `\`${v}\``).join(', '))} | \`${mdCell(a.values[0])}\` |`),
    )
    lines.push('')
  }
  return lines
}

function sizeAxisMap(def: ComponentDef, t?: AgentFoundationTokens): string[] {
  const axis = def.axes.find((a) => a.name === 'Size')
  if (!axis || def.key === 'InputOTP') return []
  const lines = [
    '## Characteristics',
    '',
    'Bind layout to foundations. Size axis values are uppercase in Figma; CSS size tokens are lowercase.',
    '',
    '| Size variant | Height CSS | Height Figma | Live |',
    '|---|---|---|---|',
  ]
  axis.values.forEach((v) => {
    const key = v.toLowerCase()
    lines.push(`| \`${v}\` | \`var(--size-${key})\` | \`${key}\` | \`${val(t?.sizes, key)}\` |`)
  })
  lines.push(
    '',
    'Control corners: `border-radius: var(--radius-action)` (`' + roleVal(t ?? { radius: {}, spacing: {} }, 'radius', 'action') + '`). Gaps: `var(--spacing-gap-*)`. Inset: `var(--spacing-inset-control)` / `var(--spacing-inset-surface)`. Stroke: `var(--stroke-control)` · focus ring: `var(--stroke-focus)`.',
    '',
  )
  return lines
}

function inputOtpRecipe(t: AgentFoundationTokens): string {
  const rAction = roleVal(t, 'radius', 'action', val(t.radius, 'md', '16px'))
  const hSm = val(t.sizes, 'sm', '32px')
  const hMd = val(t.sizes, 'md', '40px')
  const hLg = val(t.sizes, 'lg', '48px')
  const fSm = val(t.typography?.sizes, 'text-md', '16px')
  const fMd = val(t.typography?.sizes, 'text-lg', '18px')
  const fLg = val(t.typography?.sizes, 'text-xl', '20px')
  const gapTight = roleVal(t, 'spacing', 'gap-tight', '4px')
  const gapControl = roleVal(t, 'spacing', 'gap-control', '8px')
  const strokeControl = roleVal(t, 'stroke', 'control', '1px')
  const wSemi = t.typography?.weights?.semibold ?? 600
  const family = t.typography?.fontFamily ?? 'Inter'

  return [
    '### Reconstruct the set',
    '',
    'Component set name: `Input OTP`. Horizontal auto-layout of **6 cells** (`length` default). Cells are presentational; the control is one field.',
    '',
    'Size SM/MD/LG map onto `Size/sm` · `Size/md` · `Size/lg`. Cells are square — width tracks the same Size step as height.',
    '',
    '| Size variant | Width / height | Type token | Gap |',
    '|---|---|---|---|',
    `| \`SM\` | \`var(--size-sm)\` = \`${hSm}\` | \`var(--font-size-text-md)\` = \`${fSm}\` | \`var(--spacing-gap-tight)\` (\`${gapTight}\`) |`,
    `| \`MD\` | \`var(--size-md)\` = \`${hMd}\` | \`var(--font-size-text-lg)\` = \`${fMd}\` | \`var(--spacing-gap-control)\` (\`${gapControl}\`) |`,
    `| \`LG\` | \`var(--size-lg)\` = \`${hLg}\` | \`var(--font-size-text-xl)\` = \`${fLg}\` | \`var(--spacing-gap-control)\` (\`${gapControl}\`) |`,
    '',
    '### Box model (MD default)',
    '',
    '| CSS property | Token | Live |',
    '|---|---|---|',
    '| `display` | — | `flex` (row) |',
    `| \`gap\` | \`var(--spacing-gap-control)\` | \`${gapControl}\` |`,
    `| \`width\` / \`height\` | \`var(--size-md)\` | \`${hMd}\` |`,
    `| \`border-radius\` | \`var(--radius-action)\` | \`${rAction}\` |`,
    `| \`border-width\` | \`var(--stroke-control)\` | \`${strokeControl}\` |`,
    '| `border-style` | — | `solid` |',
    `| \`background\` | \`${cssColor('surface.input')}\` (\`${figmaVar('surface.input')}\`) | semantic |`,
    `| \`color\` (digit) | \`${cssColor('content.primary')}\` (\`${figmaVar('content.primary')}\`) | semantic |`,
    `| \`font-family\` | \`var(--font-family-body)\` | \`${family}\` |`,
    `| \`font-weight\` | \`var(--font-weight-semibold)\` | \`${wSemi}\` |`,
    `| \`font-size\` | \`var(--font-size-text-lg)\` | \`${fMd}\` |`,
    '| `align-items` / `justify-content` | — | `center` |',
    '',
    'This component does **not** use `--padding-*` (that token is surface inset). Cell content is centered; no inner padding token.',
    '',
    '### Color by State',
    '',
    'Stroke weight is `var(--stroke-control)`. Focus ring spread is `var(--stroke-focus)`. Bind paint by **State**, not by painting accent/error hex:',
    '',
    '| State | `border-color` | Extra | Digits |',
    '|---|---|---|---|',
    `| \`Default\` | first cell \`${cssColor('border.focus')}\` (\`${figmaVar('border.focus')}\`); others \`${cssColor('border.strong')}\` | \`box-shadow: 0 0 0 var(--stroke-focus) color-mix(in srgb, ${cssColor('border.focus')} 15%, transparent)\` on the first cell | empty |`,
    `| \`Filled\` | \`${cssColor('border.strong')}\` (\`${figmaVar('border.strong')}\`) | none | six digits, e.g. \`824913\` |`,
    `| \`Error\` | \`${cssColor('border.critical')}\` (\`${figmaVar('border.critical')}\`) | none | six digits |`,
    '',
    'The live preview currently paints the focused cell with `action.primary.default`. In Figma, **prefer `border.focus`** for that stroke and ring. Do not use `border.accent` (decorative) or `status.error` fill (status surface, not an input stroke).',
    '',
    '### CSS (MD · Default) — copy as the implementation contract',
    '',
    '```css',
    '.input-otp {',
    '  display: flex;',
    `  gap: var(--spacing-gap-control); /* ${gapControl} */`,
    '}',
    '.input-otp__cell {',
    '  box-sizing: border-box;',
    `  width: var(--size-md); /* ${hMd} */`,
    `  height: var(--size-md); /* ${hMd} */`,
    `  border-radius: var(--radius-action); /* ${rAction} */`,
    `  border: var(--stroke-control) solid ${cssColor('border.strong')};`,
    `  background: ${cssColor('surface.input')};`,
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-family: var(--font-family-body);',
    '  font-weight: var(--font-weight-semibold);',
    `  font-size: var(--font-size-text-lg); /* ${fMd} */`,
    `  color: ${cssColor('content.primary')};`,
    '}',
    '.input-otp__cell[data-focused] {',
    `  border-color: ${cssColor('border.focus')};`,
    `  box-shadow: 0 0 0 var(--stroke-focus) color-mix(in srgb, ${cssColor('border.focus')} 15%, transparent);`,
    '}',
    '.input-otp__cell[data-error] {',
    `  border-color: ${cssColor('border.critical')};`,
    '}',
    '```',
    '',
    '### Agent rules (Figma)',
    '',
    '- Load `figma-use` before mutating the file. Bind semantics; never primitives or raw hex.',
    '- Corner radius on every cell: `Radius/action` (`--radius-action` → `--radius-md`).',
    '- Stroke: `Stroke/control`. Focus ring spread: `Stroke/focus`. Paint: `Border/focus`.',
    '- Variant property `Size` values are `SM` · `MD` · `LG` (uppercase) and map to `Size/sm` · `Size/md` · `Size/lg`. `State` values are `Default` · `Filled` · `Error`.',
    '- One component set, not six loose components. Auto-layout gap tracks `--spacing-gap-*` above.',
    '- Autocomplete / a11y: `autocomplete="one-time-code"`. Cells are not six separate inputs.',
    '',
  ].join('\n')
}

function reconstructionFor(def: ComponentDef, t?: AgentFoundationTokens): string | null {
  if (def.key === 'InputOTP' && t) return inputOtpRecipe(t)
  if (def.key === 'InputOTP') return inputOtpRecipe({ radius: {}, spacing: {} })
  return null
}

/** Portable agent brief for one component article. `snippet` is the default-variant usage from `snippetFor`. */
export function agentContextMarkdown(def: ComponentDef, snippet: string, tokens?: AgentFoundationTokens): string {
  const importLine = `import { ${def.key.replace(/\s+/g, '')} } from "@/components/ui/${def.key.toLowerCase().replace(/\s+/g, '-')}"`
  const related = relatedLabels(def)
  const extra = reconstructionFor(def, tokens)

  const lines = [
    '---',
    `name: ${def.key.toLowerCase()}`,
    'kind: component',
    `label: ${def.label}`,
    `category: ${def.category}`,
    `figma_sets: ${def.figmaSets.length ? def.figmaSets.join(', ') : '(none yet)'}`,
    '---',
    '',
    `# Agent context — ${def.label}`,
    '',
    'Use this markdown as the source of truth for implementing this component in code or Figma. Prefer these names over exploring the file. Bind paints to semantic variables only. Layout (radius, gap, height, padding, type) comes from the **Design tokens** tables — do not invent px.',
    '',
    '## What it is',
    '',
    def.description,
    '',
    '## When to use',
    '',
    def.usage,
    '',
    `**File:** \`${fileNameFor(def)}\``,
    '',
  ]

  if (tokens) lines.push(...tokenTables(tokens))

  lines.push(...figmaSection(def))
  if (extra) lines.push(extra)
  else if (tokens) lines.push(...sizeAxisMap(def, tokens))

  if (def.props.length) {
    lines.push('## API', '', '| Prop | Type | Description |', '|---|---|---|')
    def.props.forEach((p) =>
      lines.push(`| \`${mdCell(p.name)}\` | \`${mdCell(p.type)}\` | ${mdCell(p.description)} |`),
    )
    lines.push('')
  }

  lines.push('## Accessibility', '', def.accessibility, '')

  lines.push('## Snippet', '', '```tsx', importLine, '', snippet, '```', '')

  if (related.length) {
    lines.push('## Related', '', related.map((l) => `- ${l}`).join('\n'), '')
  }

  return lines.join('\n')
}
