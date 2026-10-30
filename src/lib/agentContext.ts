// Markdown an agent can paste as the full brief for one catalogue page.
// Copy context is this string. A component with a recipe (all of them today)
// carries only what IS that component: what it is, when to use it, every part
// × property → token (CSS, Figma, live value), its Figma sets and its React
// parts — the same content as the Design skills package's
// `component-build` files, so a component copied alone is self-contained and
// never disagrees with the package. A key with no recipe falls back to the
// whole foundation tables.

import { COMPONENTS, type ComponentDef } from './componentCatalogue'
import { figmaRefsFor, isFigmaProp, semanticRoleIds } from './agentBundle/figmaRefs'
import { componentReactFile } from './agentBundle/productDesignSkills'
import type { TokenJSON } from './agentBundle/types'
import { mdCell } from './utils'
import { buildSectionExport, cssExcerpt } from './sectionExport'
import { COLOR_FIELD_INFO, type PreviewColorField } from './previewColorFields'
import { COMPONENT_RECIPES, cssVarOf, refFn, refFnCss, refFnPx, resolveRecipe, type ComponentRecipe, type RecipePart } from './componentRecipes'
import {
  LAYOUT_ROLES,
  RADIUS_STEPS,
  STROKE_STANDARD,
  defaultLayoutRoles,
  mergeLayoutRoles,
  resolveLayoutRole,
  layoutValueCss,
  type LayoutFamily,
} from './layoutTokens'

export interface AgentFoundationTokens extends Partial<Record<PreviewColorField, string>> {
  /** Resolved Categorical roles of the previewed mode (`PreviewTokens.archTokens`). */
  archTokens?: Record<string, string>
  radius: Record<string, string>
  spacing: Record<string, string>
  sizes?: Record<string, string>
  selector?: Record<string, string>
  padding?: Record<string, string>
  stroke?: Record<string, string>
  radiusRoles?: Record<string, string>
  spacingRoles?: Record<string, string>
  sizeRoles?: Record<string, string>
  selectorRoles?: Record<string, string>
  strokeRoles?: Record<string, string>
  typography?: {
    fontFamily: string
    headingFontFamily?: string
    sizes: Record<string, string>
    weights: Record<string, number>
  }
  shadows?: Record<string, string>
}

const RADIUS_ORDER = [...RADIUS_STEPS]
const SIZE_ORDER = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
const PADDING_ORDER = ['top', 'right', 'bottom', 'left']

export { componentFileName, componentImportLine } from './componentFiles'
import { componentFileName, componentImportLine } from './componentFiles'

function fileNameFor(def: ComponentDef): string {
  return `${componentFileName(def.key)}.tsx`
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

/** Figma variable name inside `Dimension Semantics`: the group, then the step
 *  (`Radius/lg`, `Spacing/4`). Every step aliases a `Dimension Primitives`
 *  variable named by its value. */
function figmaDim(group: string, key: string): string {
  return `${group}/${key}`
}

function primitivesOf(t: AgentFoundationTokens, family: LayoutFamily): Record<string, string> {
  if (family === 'radius') return t.radius
  if (family === 'spacing') return t.spacing
  if (family === 'size') return t.sizes ?? {}
  if (family === 'selector') return t.selector ?? {}
  return t.stroke ?? STROKE_STANDARD
}

function rolesOf(t: AgentFoundationTokens, family: LayoutFamily): Record<string, string> {
  const stored = family === 'radius' ? t.radiusRoles
    : family === 'spacing' ? t.spacingRoles
    : family === 'size' ? t.sizeRoles
    : family === 'selector' ? t.selectorRoles
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
    'Intent aliases. Bind these in components — each points at a Dimension primitive, never a new px.',
    '',
    '| Role | CSS | Aliases | Live |',
    '|---|---|---|---|',
  ]
  for (const role of LAYOUT_ROLES[family]) {
    lines.push(
      `| \`${role.key}\` | \`--${family}-${role.key}\` | \`${layoutValueCss(family, roles[role.key], primitivesOf(t, family))}\` | \`${roleVal(t, family, role.key)}\` |`,
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

/** When a recipe row applies, from the axis combinations it was found in:
 *  `always`, `State: Hover`, `Variant: default, secondary · State: Hover`, or
 *  — when the combinations are not a clean product — each one spelled out. */
function whenText(part: RecipePart, keys: string[]): string {
  const all = Object.keys(part.values)
  if (!part.axes.length || keys.length === all.length) return 'always'
  const valuesAt = (list: string[], i: number) => [...new Set(list.map((k) => k.split('|')[i]))]
  const picked = part.axes.map((_, i) => valuesAt(keys, i))
  const product = picked.reduce((n, v) => n * v.length, 1)
  if (product === keys.length) {
    return part.axes
      .map((axis, i) => (picked[i].length === valuesAt(all, i).length ? null : `${axis}: ${picked[i].join(', ')}`))
      .filter(Boolean)
      .join(' · ')
  }
  return keys.map((k) => part.axes.map((axis, i) => `${axis}: ${k.split('|')[i]}`).join(', ')).join('; ')
}

/** Rows of a recipe, one per (slot, property, token) of each part, with the
 *  axis combinations it applies to. Deduplicating ACROSS variants without
 *  saying which one a row belongs to read as "a Button's height is 40, 24, 32
 *  and 48 at once". */
function recipeRowsWithWhen(recipe: ComponentRecipe): { slot: string; prop: string; ref: string; when: string }[] {
  const out: { slot: string; prop: string; ref: string; when: string }[] = []
  for (const part of recipe.parts) {
    const seen = new Map<string, { slot: string; prop: string; ref: string; keys: string[] }>()
    for (const [key, slots] of Object.entries(part.values)) {
      for (const [slot, props] of Object.entries(slots)) {
        for (const [prop, ref] of Object.entries(props)) {
          if (!ref || ref === 'none') continue
          const id = `${slot}|${prop}|${ref}`
          const row = seen.get(id) ?? { slot, prop, ref, keys: [] }
          row.keys.push(key)
          seen.set(id, row)
        }
      }
    }
    for (const row of seen.values()) out.push({ slot: row.slot, prop: row.prop, ref: row.ref, when: whenText(part, row.keys) })
  }
  return out
}

const LIVE_FAMILY: Record<string, LayoutFamily> = {
  size: 'size', radius: 'radius', spacing: 'spacing', stroke: 'stroke', selector: 'selector',
}

/** The live value of a non-colour reference (`size.control` → `40px`). A sum
 *  (`selector.control+spacing.1`) lists each term; a type role has no single
 *  value and stays `—`. */
function liveDimension(ref: string, t: AgentFoundationTokens): string {
  const one = (term: string): string => {
    const [ns, name] = [term.slice(0, term.indexOf('.')), term.slice(term.indexOf('.') + 1)]
    if (ns === 'shadow') return t.shadows?.[name] ?? '—'
    const family = LIVE_FAMILY[ns]
    if (!family) return '—'
    const isRole = LAYOUT_ROLES[family].some((r) => r.key === name)
    return isRole ? roleVal(t, family, name) : (primitivesOf(t, family)[name] ?? '—')
  }
  const f = refFn(ref)
  if (f) {
    const vals = f.terms.map(one)
    const nums = vals.map((v) => parseFloat(v))
    return nums.every(Number.isFinite) ? `${refFnPx(f.fn, nums)}px` : vals[0]
  }
  const terms = ref.split('+').map(one)
  return terms.every((v) => v === '—') ? '—' : terms.join(' + ')
}

/** Color, live and resolved. A component on the shadcn skeleton lists its tokens
 *  BY PART from its recipe (the same table the web stylesheet and the Figma
 *  component read), each with the variants it applies to and its live value;
 *  anything without a recipe falls back to the full palette via
 *  `buildSectionExport('color', 'css')` — the same renderer Export and the
 *  foundation pages' "Use it" pane use, truncated the same way
 *  (`CSS_PREVIEW_LINES`) so a ~90-role dump doesn't bury the tables below it. */
function colorSection(def: ComponentDef, t: AgentFoundationTokens, json?: TokenJSON): string[] {
  const recipe = COMPONENT_RECIPES[def.key]
  const roles = json ? semanticRoleIds(json) : undefined
  if (recipe) {
    const lines = [
      '### Tokens by part (the component recipe)',
      '',
      `${def.label} is built on the shadcn skeleton. Each row is one part, one property and the token it binds; **When** says which variant or state it applies to (\`always\` = every render, a later row overrides an earlier one for the same part and property). The web stylesheet and the Figma component read the same table (\`componentRecipes\` in tokens.json). Bind by name; never hardcode a hex or a px.`,
      '',
      '| Part | Property | When | Token | CSS | Figma | Live |',
      '|---|---|---|---|---|---|---|',
    ]
    for (const row of recipeRowsWithWhen(recipe)) {
      const isColor = row.ref.startsWith('color.')
      const id = row.ref.slice(row.ref.indexOf('.') + 1)
      const css = row.ref.startsWith('type.')
        ? `\`${cssVarOf(row.ref, 'font-size')}\` …`
        : refFn(row.ref)
          ? `\`${refFnCss(refFn(row.ref)!, (r) => `var(${cssVarOf(r)})`)}\``
        : row.ref.includes('+')
          ? row.ref.split('+').map((r) => `\`${cssVarOf(r)}\``).join(' + ')
          : `\`${cssVarOf(row.ref)}\``
      // With the payload, every row names what the plugin binds (the package's
      // own resolver); without it only colours have a name to give.
      const inFigma = !json || isFigmaProp(row.prop)
      const refs = json && inFigma ? figmaRefsFor(row.ref, json, roles) : undefined
      const figma = json && !inFigma ? '—'
        : refs ? refs.map((r) => `\`${r.name}\``).join(' + ')
        : refs === null ? 'not published'
        : isColor ? `\`${figmaVar(id)}\`` : '—'
      const liveValue = isColor ? (t.archTokens?.[id] ?? '—') : liveDimension(row.ref, t)
      const live = liveValue === '—' ? '—' : `\`${liveValue}\``
      lines.push(`| ${mdCell(row.slot)} | ${row.prop} | ${mdCell(row.when)} | \`${row.ref}\` | ${css} | ${figma} | ${live} |`)
    }
    lines.push('')
    return lines
  }
  return [
    '### Color (`Color` collection)',
    '',
    'Resolved primitives + semantic roles from **this** system — the same values `variables.css` ships. Bind by semantic name (e.g. `--color-content-primary`, `--color-action-primary-default`). Never hardcode a hex when a token exists.',
    '',
    '```css',
    cssExcerpt(buildSectionExport('color', 'css')),
    '```',
    '',
  ]
}

function tokenTables(def: ComponentDef, t: AgentFoundationTokens, json?: TokenJSON): string[] {
  const head = [
    '## Design tokens (live)',
    '',
    'Resolved values from **this** system. Use the CSS custom property in code and the Figma variable in the file. **Never hardcode px, rem, or hex when a token exists. Never invent a parallel name.**',
    '',
    ...colorSection(def, t, json),
  ]
  // A recipe names every token the component reads: the whole ramps would only
  // be noise (a Button has no use for the selector scale).
  if (COMPONENT_RECIPES[def.key]) return head
  const lines = [
    ...head,
    '### Dimension primitives (`Dimension Primitives` collection)',
    '',
    'Every length below aliases one variable here, named by its value (`16`, `-4`, `9999`, `3_5` = 3.5px). One mode — a theme changes which primitive a step points at, never a primitive. The steps and roles live in `Dimension Semantics`, grouped `Spacing/`, `Radius/`, `Stroke/`, `Size/`, `Selector/`, `Grid/`.',
    '',
    '### Radius (`Dimension Semantics` → `Radius/`)',
    '',
    '| Step | CSS | Figma | Value |',
    '|---|---|---|---|',
  ]
  ordered(t.radius, RADIUS_ORDER).forEach(([k, v]) =>
    lines.push(`| \`${k}\` | \`--radius-${k}\` | \`${figmaDim('Radius', k)}\` | \`${v}\` |`),
  )
  lines.push('', ...semanticTable(t, 'radius', 'Radius roles'))
  lines.push(
    '### Spacing (`Dimension Semantics` → `Spacing/`)',
    '',
    '| Step | CSS | Figma | Value |',
    '|---|---|---|---|',
  )
  Object.entries(t.spacing)
    .sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b))
    .forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--spacing-${k}\` | \`${figmaDim('Spacing', k)}\` | \`${v}\` |`),
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
      lines.push(`| \`${k}\` | \`--padding-${k}\` | \`${figmaDim('Spacing', `padding/${k}`)}\` | \`${v}\` |`),
    )
  }

  lines.push(...semanticTable(t, 'spacing', 'Spacing roles'))

  if (t.sizes && Object.keys(t.sizes).length) {
    lines.push(
      '',
      '### Control height (`Dimension Semantics` → `Size/`)',
      '',
      '| Step | CSS | Figma | Value |',
      '|---|---|---|---|',
    )
    ordered(t.sizes, SIZE_ORDER).forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--size-${k}\` | \`${figmaDim('Size', k)}\` | \`${v}\` |`),
    )
    lines.push('', ...semanticTable(t, 'size', 'Size roles'))
  }

  if (t.selector && Object.keys(t.selector).length) {
    lines.push(
      '',
      '### Selector glyph (`Dimension Semantics` → `Selector/`)',
      '',
      'The square a checkbox, radio or switch knob is drawn in — a glyph, not a',
      'control height. Below 24px pair it with a transparent hit area',
      '(`--size-hit`) for WCAG 2.2 target size; do not grow the glyph instead.',
      '',
      '| Step | CSS | Figma | Value |',
      '|---|---|---|---|',
    )
    ordered(t.selector, ['xs', 'sm', 'md', 'lg', 'xl']).forEach(([k, v]) =>
      lines.push(`| \`${k}\` | \`--selector-${k}\` | \`${figmaDim('Selector', k)}\` | \`${v}\` |`),
    )
    lines.push('', ...semanticTable(t, 'selector', 'Selector roles'))
  }

  lines.push(
    '### Stroke (`Dimension Semantics` → `Stroke/`)',
    '',
    'Line weight — not paint. Color stays on `border.*`.',
    '',
    '| Step | CSS | Figma | Value |',
    '|---|---|---|---|',
  )
  ordered(primitivesOf(t, 'stroke'), ['none', 'sm', 'md', 'lg']).forEach(([k, v]) =>
    lines.push(`| \`${k}\` | \`--stroke-${k}\` | \`${figmaDim('Stroke', k)}\` | \`${v}\` |`),
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
  if (!axis) return []
  const lines = [
    '## Characteristics',
    '',
    'Bind layout to foundations. The height of each Size value is the one its recipe binds (a Size role or a step).',
    '',
    '| Size variant | Height CSS | Height Figma | Live |',
    '|---|---|---|---|',
  ]
  const recipe = COMPONENT_RECIPES[def.key]
  axis.values.forEach((v) => {
    const ref = recipe ? resolveRecipe(recipe, { Size: v })[recipe.slots[0]]?.height : undefined
    const name = ref ? ref.split('.')[1] : v.toLowerCase()
    const isRole = LAYOUT_ROLES.size.some((r) => r.key === name)
    const live = isRole && t ? roleVal(t, 'size', name) : val(t?.sizes, name)
    const figma = figmaDim('Size', isRole ? `role/${name}` : name)
    lines.push(`| \`${v}\` | \`var(${ref ? cssVarOf(ref) : `--size-${name}`})\` | \`${figma}\` | \`${live}\` |`)
  })
  lines.push(
    '',
    'Control corners: `border-radius: var(--radius-action)` (`' + roleVal(t ?? { radius: {}, spacing: {} }, 'radius', 'action') + '`). Gaps: `var(--spacing-gap-*)`. Inset: `var(--spacing-inset-control)` / `var(--spacing-inset-surface)`. Stroke: `var(--stroke-control)` · focus ring: `var(--stroke-focus)`.',
    '',
  )
  return lines
}

/** The React half of the package's `component-build` file (attributes and
 *  parts), headings demoted under `## React`. The stylesheet itself is NOT
 *  inlined: it restates the parts table in CSS (3.6k tokens for Button alone)
 *  and ships whole as `recipes.css` in Design skills. */
function reactSection(def: ComponentDef): string[] {
  if (!COMPONENT_RECIPES[def.key]) return []
  const file = componentReactFile(def.key)
  const from = file.indexOf('## Attributes')
  const to = file.indexOf('## Variables it reads')
  const body = file.slice(from, to < 0 ? undefined : to).trim().replace(/^## /gm, '### ')
  return [
    '## React',
    '',
    'Each part is the element with that `data-part`. Style it from the **Tokens by part** table (the CSS column), or load `recipes.css` from Design skills after `variables.css`.',
    '',
    body,
    '',
  ]
}

/** Portable agent brief for one component article. `snippet` is the
 *  default-variant usage from `snippetFor`; `json` (the brand's tokens.json)
 *  lets the parts table name the Figma variable of every length, not only of
 *  colours. */
export function agentContextMarkdown(def: ComponentDef, snippet: string, tokens?: AgentFoundationTokens, json?: TokenJSON): string {
  const importLine = componentImportLine(def.key)
  const related = relatedLabels(def)

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

  if (tokens) lines.push(...tokenTables(def, tokens, json))

  lines.push(...figmaSection(def))
  // The parts table already gives each Size its height.
  if (tokens && !COMPONENT_RECIPES[def.key]) lines.push(...sizeAxisMap(def, tokens))
  lines.push(...reactSection(def))

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
