// Design skills — the designer-facing half of the agent package (Figma first).
// See design-plans/design-skills-package.md.
//
// Nothing here is written per system. Every name comes from the payload
// (`TokenJSON`), the component recipes (the table the web stylesheet and the
// Figma plugin both read) or the audit's own pair list, and the drift tests in
// agentContextAudit.test.ts fail the moment a skill cites a name that does not
// exist.

import { COMPONENTS, COMPONENT_KEYS, selectedComponentKeys } from '../componentCatalogue'
import { roleCssVar, roleFigmaName } from '../roleNames'
import { COMPONENT_RECIPES, cssVarOf, refFn, refFnCss, recipeColorRoles, type ComponentRecipe, type SlotMap } from '../componentRecipes'
import { RADIUS_GROUPS } from '../layoutTokens'
import { recipeCss, recipeCssVars } from '../recipeStyles'
import { componentFileName, componentImportLine } from '../componentFiles'
import { CONTRACT_SCHEMA, FIGMA_FILE_KEY, contractCore, type ContractCore } from '../contractCore'
import { SCREEN_PATTERNS } from './screenPatterns'
import { mdCell } from '../utils.js'
import {
  FIGMA_PROP_LABEL, figmaLayerName, figmaRefsFor, isFigmaProp, isPseudoSlot, semanticRoleIds, type FigmaRef,
} from './figmaRefs'
import { figmaPrimitiveName, figmaSemanticName, webCodeSyntax } from './names'
import { inkPairings, intentFloors } from './productSkills'
import type { AgentBundleFile, TokenJSON } from './types'
import { SOCIAL_BRANDS } from '../socialBrands.js'

const F = figmaSemanticName

function projectOf(json: TokenJSON): string {
  return json.project?.trim() || 'Design system'
}

function slugOf(project: string): string {
  return project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'
}

/** Every catalogue component with a recipe — the whole catalogue. Which ones
 *  the system selected is marked, not filtered (`selectedComponentKeys`). */
export function designSkillComponents(): string[] {
  return COMPONENT_KEYS.filter((k) => COMPONENT_RECIPES[k])
}

export function componentBuildPath(key: string): string {
  return `skills/component-build/components/${key.replace(/[^A-Za-z0-9]+/g, '')}.md`
}

export function componentReactPath(key: string): string {
  return `skills/component-build/react/${key.replace(/[^A-Za-z0-9]+/g, '')}.md`
}

export const RECIPES_CSS_PATH = 'skills/component-build/react/recipes.css'

export function buildDesignSkillFiles(json: TokenJSON): AgentBundleFile[] {
  const project = projectOf(json)
  const slug = slugOf(project)
  const keys = designSkillComponents()
  const selected = new Set(selectedComponentKeys(json.atoms))
  return [
    { path: 'skills/component-build/SKILL.md', text: componentBuildSkill(project, slug, keys, selected) },
    ...keys.map((key) => ({ path: componentBuildPath(key), text: componentBuildFile(json, key) })),
    ...keys.map((key) => ({ path: componentReactPath(key), text: componentReactFile(key) })),
    { path: RECIPES_CSS_PATH, text: recipesCss(keys) },
    { path: 'skills/screen-compose/SKILL.md', text: screenComposeSkill(json, project, slug, keys) },
    { path: 'skills/design-review/SKILL.md', text: designReviewSkill(json, project, slug) },
    { path: 'skills/handoff-spec/SKILL.md', text: handoffSkill(json, project, slug, keys) },
    ...keys.map((key) => ({ path: packageContractPath(key), text: json2(packageContract(key)) })),
    { path: PACKAGE_CONTRACTS_INDEX, text: json2(packageContractIndex(keys, selected)) },
  ]
}

// ── contracts/ — the machine contract per component ────────────────────────

export const PACKAGE_CONTRACTS_INDEX = 'contracts/index.json'

export function packageContractPath(key: string): string {
  return `contracts/${key.replace(/[^A-Za-z0-9]+/g, '')}.json`
}

const json2 = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

/** `spec/contracts/<Key>.json` as the package can build it: the pure core (`contractCore.ts`) with the
 *  repo-only fields null — the Figma snapshot (page, set, axes, node), the story and the repo's files
 *  and their ARIA scan. Same schema, same key order; `code.import` is the product's own path. */
export interface PackageContract extends Omit<ContractCore, 'authored'> {
  $comment: string
  figma: {
    file: string; page: null; pageNodeId: null; set: null; variants: null; axes: null; properties: null
    catalogueSets: string[]; url: null; setNodeId: null; setUrl: null
  }
  behaviour: { primitives: null; roles: null; ariaAttributes: null; authored: ContractCore['authored'] }
  code: { files: null; import: { name: string; module: string; exports: string[] }; story: null }
  docs: { humanContract: null; readable: string }
}

export function packageContract(key: string): PackageContract {
  const def = COMPONENTS.find((c) => c.key === key)
  if (!def) throw new Error(`packageContract: no catalogue component ${key}`)
  const core = contractCore(def)
  const name = key.replace(/\s+/g, '')
  return {
    $schema: core.$schema,
    $comment: 'GENERATED by Escala from the catalogue and the recipe (the same core as the repo\'s spec/contracts/). Fields null here are read from the Escala repo only (Figma snapshot, story, source files).',
    key: core.key,
    label: core.label,
    category: core.category,
    box: core.box,
    locks: core.locks,
    description: core.description,
    owners: core.owners,
    figma: {
      file: FIGMA_FILE_KEY, page: null, pageNodeId: null, set: null, variants: null, axes: null, properties: null,
      catalogueSets: def.figmaSets, url: null, setNodeId: null, setUrl: null,
    },
    api: core.api,
    anatomy: core.anatomy,
    tokens: core.tokens,
    names: core.names,
    bindings: core.bindings,
    motion: core.motion,
    behaviour: { primitives: null, roles: null, ariaAttributes: null, authored: core.authored },
    usage: core.usage,
    accessibility: core.accessibility,
    code: { files: null, import: { name, module: `@/components/ui/${componentFileName(key).replace(/\.tsx?$/, '')}`, exports: [name] }, story: null },
    docs: { humanContract: null, readable: componentBuildPath(key) },
  }
}

export interface PackageContractIndexEntry {
  kind: 'component'
  key: string
  label: string
  category: string
  box: ContractCore['box']
  locks: ContractCore['locks']
  file: string
  /** Selected in this system (its Figma library builds it). */
  selected: boolean
  /** The catalogue's Figma set names — match an instance's main component set against them. */
  figmaSets: string[]
  tokens: number
  motion: 'declared' | null
}

export function packageContractIndex(keys: string[], selected: Set<string>): { $schema: string; components: PackageContractIndexEntry[] } {
  return {
    $schema: CONTRACT_SCHEMA,
    components: keys.map((key) => {
      const c = packageContract(key)
      return {
        kind: 'component' as const,
        key: c.key,
        label: c.label,
        category: c.category,
        box: c.box,
        locks: c.locks,
        file: packageContractPath(key),
        selected: selected.has(key),
        figmaSets: c.figma.catalogueSets,
        tokens: Object.values(c.tokens).reduce((n, list) => n + list.length, 0),
        motion: c.motion ? 'declared' as const : null,
      }
    }),
  }
}

// ── Shared cells ───────────────────────────────────────────────────────────

/** `Bind to` and `Collection` cells for one reference, in the same order. */
function bindCells(ref: string, json: TokenJSON, roles: Set<string>): [string, string, string] {
  // A third-party brand role: `social.google.action.default` → `Google/Action/default` in `Social Media Brands`.
  if (ref.startsWith('social.')) {
    const [, id, group, ...rest] = ref.split('.')
    const brand = SOCIAL_BRANDS[id]
    if (brand) return [`\`${brand.label}/${group[0].toUpperCase()}${group.slice(1)}/${rest.join('.')}\``, 'Social Media Brands', `\`${cssVarOf(ref)}\``]
  }
  const refs: FigmaRef[] | null = figmaRefsFor(ref, json, roles)
  const f = refFn(ref)
  const css = f ? `\`${refFnCss(f, (r) => cssVarOf(r))}\`` : ref.split('+').map((r) => `\`${cssVarOf(r, 'font-size').replace(/-font-size$/, '-*')}\``).join(' + ')
  if (!refs) return [`not published in this system (\`${ref}\`)`, '—', css]
  return [
    refs.map((r) => `\`${r.name}\``).join(' + '),
    refs.map((r) => r.collection).join(' + '),
    css,
  ]
}

/** Every (non-pseudo) slot a recipe paints, recipe order first, data states after. */
export function figmaSlotsOf(recipe: ComponentRecipe): string[] {
  const seen: string[] = []
  const add = (s: string) => { if (!isPseudoSlot(s) && !seen.includes(s)) seen.push(s) }
  recipe.slots.forEach(add)
  for (const p of recipe.parts) for (const sm of Object.values(p.values)) Object.keys(sm).forEach(add)
  return seen
}

function bindingRows(sm: SlotMap, json: TokenJSON, roles: Set<string>, when?: string): string[] {
  const rows: string[] = []
  for (const [slot, props] of Object.entries(sm)) {
    if (isPseudoSlot(slot)) continue
    for (const [prop, ref] of Object.entries(props)) {
      if (!ref || ref === 'none' || !isFigmaProp(prop)) continue
      const [bind, collection, css] = bindCells(ref, json, roles)
      const head = when === undefined ? [] : [when]
      rows.push(`| ${[...head, `\`${figmaLayerName(slot)}\``, FIGMA_PROP_LABEL[prop] ?? prop, bind, collection, css].join(' | ')} |`)
    }
  }
  return rows
}

// ── component-build ────────────────────────────────────────────────────────

function componentBuildSkill(project: string, slug: string, keys: string[], selected: Set<string>): string {
  const index = keys.map((key) => {
    const def = COMPONENTS.find((c) => c.key === key)
    const recipe = COMPONENT_RECIPES[key]
    const layers = figmaSlotsOf(recipe).map((s) => `\`${figmaLayerName(s)}\``).join(' · ')
    const rel = (p: string) => p.replace('skills/component-build/', '')
    return `| ${mdCell(def?.label ?? key)} | ${selected.has(key) ? 'Yes' : '—'} | ${def?.figmaSets.length ? def.figmaSets.map((s) => `\`${s}\``).join(', ') : '—'} | ${layers} | [Figma](${rel(componentBuildPath(key))}) · [React](${rel(componentReactPath(key))}) |`
  })
  return `---
name: ${slug}-component-build
description: "Build ${project} components in Figma or in React: which variable goes on each Figma layer, and which data attributes and CSS variables the React component carries. Layers and parts are named after the recipe slots. Use when creating, rebuilding or checking a component."
---

# ${project} — build a component

Design skills. Load \`AGENTS.md\` and \`SKILL.md\` first.

Every component is ONE recipe: the same table paints the Figma component set and the web component. The Escala plugin builds the core kit's sets for you (sync from Escala); every other set is in the Escala Design System Figma file. Use this skill when you build one by hand, extend one, or check one.

## Figma rules

1. **Name each layer after its slot.** The component itself is \`root\`. A part is its slot name (\`label\`, \`icon\`, \`thumb\`). A second copy of a part takes a suffix (\`icon-leading\`, \`icon-trailing\`). A data state is a suffix too (\`item-highlighted\`, \`cell-active\`).
2. **Bind, never type a value.** Each property in the component's file names the variable or style to bind. No hex, no px, no primitive colour ramp.
3. **Variants come from the variant properties** listed per component. A Hover / Focused / Disabled look is a variant of \`State\`, painted from its own row, not an override on an instance.
4. **A sum has no single variable** (\`Size/selector-md\` + \`2\`): set the resulting length and leave a note; do not bind one of the terms alone.
5. **"Not published in this system"** means the recipe asks for a token this system does not ship. Do not invent one: report it.
6. Text layers take a text style \`Type/<role>\` (a text style listed on \`root\` goes on the component's text layers); shadows take an effect style \`Shadow/<step>\`.

## React rules

1. **Use the component file if the repo has it** (\`components/ui/<name>.tsx\`, shadcn's skeleton, from Escala). It already sets the attributes the stylesheet reads. Otherwise start from \`templates/component/\` and add them.
2. **Load the styles once, in this order:** \`variables.css\` (the tokens), then [\`react/recipes.css\`](react/recipes.css) (every component below, painted only with \`var()\`). Copy both into the app's styles.
3. **The stylesheet paints by attribute, never by class**: the root carries \`data-escala="<Component>"\` and one \`data-<axis>\` per variant property; every other part carries \`data-part="<Component>.<slot>"\`. States come from the real element: \`:hover\`, \`:active\`, \`:focus-visible\`, \`aria-disabled="true"\`, \`aria-invalid="true"\`. \`data-force-state\` pins a state for docs only.
4. **No colour, length or font in \`className\` or \`style\`.** An override uses the same \`var()\` the recipe uses for that part.
5. Run \`node checkers/token-lint.mjs\` and \`node checkers/binding-lint.mjs\` on the files you touched: the first catches a raw value that has a token, the second a token on the wrong state (a Hover painted with the Default role).

## Machine contracts

\`contracts/index.json\` lists every component; \`contracts/<Component>.json\` is its contract (schema \`${CONTRACT_SCHEMA}\`): \`bindings\` = the token each slot paints per variant and state (merge every part whose \`axes\` match, in order; \`api.defaults\` fill the gaps), \`names\` = each token's CSS variable and Figma variable, \`motion\`, \`behaviour.authored\` and \`code.import\`. Read it instead of re-deriving a state's role.

## Components

The whole catalogue (${keys.length}). **In this system** = selected in Escala, so the Figma library builds it; every other one is fully specified here and can be added in Escala.

| Component | In this system | Figma sets | Layers | Spec |
|---|---|---|---|---|
${index.join('\n')}
`
}

/** The catalogue's own "when to use / when not" line, so an agent picks the
 *  right component (Dialog or Sheet, Badge or Chip) before it builds one. */
function whenToUse(def: { usage?: string } | undefined): string[] {
  return def?.usage?.trim() ? ['## When to use', '', def.usage.trim(), ''] : []
}

export function componentBuildFile(json: TokenJSON, key: string): string {
  const recipe = COMPONENT_RECIPES[key]
  const def = COMPONENTS.find((c) => c.key === key)
  const roles = semanticRoleIds(json)
  const label = def?.label ?? key
  const detached = new Set(recipe.detachedSlots ?? [])
  const pseudo = recipe.pseudoSlots ?? {}

  const layerRows = figmaSlotsOf(recipe).map((slot, i) => {
    const note = i === 0 ? 'The component itself'
      : detached.has(slot) ? 'Detached: a sibling of the component (portal), not a child'
      : pseudo[slot] ? `The ${slot} text layer (web: \`${pseudo[slot].of}${pseudo[slot].pseudo}\`)`
      : slot.includes('[') ? `Data state of \`${slot.replace(/\[.*$/, '')}\``
      : 'Child layer'
    return `| \`${figmaLayerName(slot)}\` | \`${slot}\` | ${note} |`
  })

  const always: string[] = []
  const byVariant: string[] = []
  for (const part of recipe.parts) {
    for (const [combo, sm] of Object.entries(part.values)) {
      if (part.axes.length === 0) { always.push(...bindingRows(sm, json, roles)); continue }
      const values = combo.split('|')
      const when = part.axes.map((a, i) => `${a}=${values[i]}`).join(', ')
      byVariant.push(...bindingRows(sm, json, roles, when))
    }
  }

  const axes = def?.axes ?? []
  return [
    `# ${label} — Figma`,
    '',
    def?.description ?? '',
    '',
    ...whenToUse(def),
    def?.figmaSets.length ? `Component sets: ${def.figmaSets.map((s) => `\`${s}\``).join(', ')}.` : 'Not in the Figma library yet: build it from this spec.',
    '',
    '## Variant properties',
    '',
    axes.length
      ? axes.map((a) => `- \`${a.name}\`: ${a.values.map((v) => (v === recipe.defaults[a.name] ? `**${v}**` : v)).join(' · ')}`).join('\n')
      : '- None: a single component.',
    '',
    '## Layers',
    '',
    '| Layer | Slot | Note |',
    '|---|---|---|',
    ...layerRows,
    '',
    '## Every variant',
    '',
    ...(always.length
      ? ['| Layer | Property | Bind to | Collection | CSS |', '|---|---|---|---|---|', ...always]
      : ['Nothing is bound on every variant: see By variant.']),
    '',
    ...(byVariant.length ? [
      '## By variant',
      '',
      'A later row overrides an earlier one for the same layer and property.',
      '',
      '| When | Layer | Property | Bind to | Collection | CSS |',
      '|---|---|---|---|---|---|',
      ...byVariant,
      '',
    ] : []),
  ].join('\n')
}

// ── design-review ──────────────────────────────────────────────────────────

function radiusPx(json: TokenJSON, role: string): string {
  const step = json.radiusRoles?.[role]
  if (!step) return '—'
  const pinned = /^dimension-(.+)$/.exec(step)
  if (pinned) return `${pinned[1].replace('_', '.')}px`
  const v = json.radius?.[step]
  return v ? `${v} (\`${step}\`)` : step
}

function spacingScale(json: TokenJSON): string {
  const px = [...new Set(Object.values(json.spacing ?? {}).map((v) => parseFloat(v)).filter((n) => Number.isFinite(n)))]
  return px.sort((a, b) => a - b).map((n) => `${n}`).join(' · ')
}

function designReviewSkill(json: TokenJSON, project: string, slug: string): string {
  const roles = semanticRoleIds(json)
  const pairs = inkPairings(json).filter((p) => p.bg !== 'surface.page')
  const pageInks = inkPairings(json).filter((p) => p.bg === 'surface.page')
  const fieldLike = Object.values(COMPONENT_RECIPES)
    .filter((r) => recipeColorRoles(r).includes('border.control'))
    .map((r) => COMPONENTS.find((c) => c.key === r.key)?.label ?? r.key)
  const spacingRoles = Object.keys(json.spacingRoles ?? {}).filter((r) => !/-(top|right|bottom|left)$/.test(r))
  const typeRoles = Object.keys(json.typography?.roles ?? {})
  const radiusRows = RADIUS_GROUPS.map((g) =>
    `| ${g.label} | ${g.hint} | ${g.roles.filter((r) => json.radiusRoles?.[r] !== undefined).map((r) => `\`${roleFigmaName('radius', r)}\``).join(', ')} | ${g.roles.map((r) => radiusPx(json, r)).join(', ')} |`)
  const ring = roles.has('border.ring.default') ? ` Outside it sits the ring \`${F('border.ring.default')}\`; on a solid button that ring is the only focus mark.` : ''

  return `---
name: ${slug}-design-review
description: "Review a Figma frame against the ${project} design system: detached values, fill/ink pairs, radius axes, off-scale spacing, field outlines. Use when asked to check, audit or QA a design before handoff."
---

# ${project} — review a Figma frame

Design skills · Figma. Load \`AGENTS.md\` and \`SKILL.md\` first. Walk the frame layer by layer and report every finding in the table at the end. Do not fix silently: say what is wrong and what it should bind to.

## 1. Detached values

- Every fill, stroke and text fill is bound to a \`Color Semantics\` variable. A raw hex, a style that is not the system's, or a \`Color Primitives\` ramp step (\`${figmaPrimitiveName('accent-9', json.colors)}\`) is a finding.
- Every padding, gap, corner radius and stroke weight is bound to \`Dimension Semantics\` (a \`role/*\` first) or to a \`Dimension Primitives\` length. An unbound number is a finding.
- Text uses a text style: ${typeRoles.map((r) => `\`Type/${r}\``).join(' · ')}.
- Shadows use an effect style: ${Object.keys(json.shadows ?? {}).map((s) => `\`Shadow/${s}\``).join(' · ')}.
- A component instance with its paint overridden is a finding: change the variant instead.

## 2. Fill and ink travel together

Text on the page: ${pageInks.map((p) => `\`${F(p.fg)}\``).join(', ')} on \`${F('surface.page')}\`.

A text or icon on any other fill must be the ink audited for that fill:

| Fill | Ink | Intent |
|---|---|---|
${pairs.map((p) => `| \`${F(p.bg)}\` | \`${F(p.fg)}\` | \`${p.intent}\` |`).join('\n')}

Any other pairing is a finding, even if it looks readable: it was not audited. Floors: ${intentFloors()}.

## 3. Radius: three axes, never mixed

| Axis | Used by | Bind | Resolves to |
|---|---|---|---|
${radiusRows.join('\n')}

- A card corner on a Fields radius (or a checkbox on a Boxes radius) is a finding, even when the px happens to match: change the axis and the two drift apart.
- Circles (avatar, switch track, badge) use \`Radius/full\`.
- A flush nested shape (a chip inside a field, a card filling a modal) has a smaller radius than its parent. A button floating with padding inside a card is not nested.

## 4. Spacing on the scale

- Padding and gaps resolve to the spacing scale: ${spacingScale(json)} px. Anything else is off-scale.
- Prefer the role: ${spacingRoles.map((r) => `\`Spacing/${r}\``).join(' · ')}.

## 5. Field outline

- The resting edge of every field-like control is \`${F('border.control')}\` (hover \`${F('border.control-hover')}\`), never \`${F('border.strong')}\` or \`${F('border.default')}\`. In this system: ${fieldLike.join(', ')}.
- Focus is \`${F('border.focus')}\`, never \`${F('border.accent')}\`.${ring}
- An error field strokes \`${F('status.critical.border-strong')}\`.

## Report

| Layer | Property | Found | Should bind | Rule |
|---|---|---|---|---|
| \`card/root\` | Corner radius | \`8\` (unbound) | \`Radius/container\` | 3 |
`
}

// ── handoff-spec ───────────────────────────────────────────────────────────

const DIM_CSS: [string, keyof TokenJSON, string][] = [
  ['Radius', 'radiusRoles', 'radius'],
  ['Spacing', 'spacingRoles', 'spacing'],
  ['Size', 'sizeRoles', 'size'],
  ['Selector', 'selectorRoles', 'selector'],
  ['Stroke', 'strokeRoles', 'stroke'],
]

function handoffSkill(json: TokenJSON, project: string, slug: string, keys: string[]): string {
  const roles = semanticRoleIds(json)
  const colorRows = [...roles].map((id) => `| \`${F(id)}\` | \`${webCodeSyntax(id)}\` |`)
  const dimRows = DIM_CSS.flatMap(([group, field, ns]) =>
    Object.keys((json[field] as unknown as Record<string, string> | undefined) ?? {}).map((r) => `| \`${roleFigmaName(ns, r) ?? `${group}/${r}`}\` | \`var(${cssVarOf(`${ns}.${r}`)})\` |`))
  const iconRows = Object.keys(json.icons?.sizes?.roles ?? {}).map((r) => `| \`${roleFigmaName('icon', r)}\` | \`var(${roleCssVar('icon', r)})\` |`)
  const typeRows = Object.keys(json.typography?.roles ?? {}).map((r) =>
    `| \`Type/${r}\` | \`var(${cssVarOf(`type.${r}`, 'font-size')})\`, \`-line-height\`, \`-font-weight\`, \`-font-family\`, \`-letter-spacing\` |`)
  const shadowRows = Object.keys(json.shadows ?? {}).map((s) => `| \`Shadow/${s}\` | \`var(--shadow-${s})\` |`)

  return `---
name: ${slug}-handoff-spec
description: "Write a handoff spec for a ${project} Figma frame: each layer, the variable or style it binds, and the CSS custom property an engineer uses. Use when preparing a design for implementation."
---

# ${project} — handoff spec

Design skills · Figma → code. Load \`AGENTS.md\` first. Run \`skills/design-review/SKILL.md\` before writing the spec: a detached value has no CSS to hand off.

## How to write it

1. One table per component instance or frame section.
2. One row per layer and property: the bound Figma variable (or style), its CSS custom property from the tables below, and the variant it belongs to.
3. A component from the library is named by its catalogue name and variant (\`Button · variant=outline · size=sm\`). Its layers are its recipe slots; in code each slot is the element with \`data-slot\` of that name. Per-component layers: \`skills/component-build/components/\` (${keys.map((k) => `\`${k}\``).join(', ')}).
4. Never hand off a hex or a px. If a layer is unbound, the spec says "unbound" and the design goes back.

## Template

| Layer | Variant | Property | Figma | CSS |
|---|---|---|---|---|
| \`root\` | variant=default | Fill | \`${F('action.primary.default')}\` | \`${webCodeSyntax('action.primary.default')}\` |
| \`label\` | variant=default | Text fill | \`${F('content.on-action')}\` | \`${webCodeSyntax('content.on-action')}\` |

## Color — Figma variable → CSS

| Figma (\`Color Semantics\`) | CSS |
|---|---|
${colorRows.join('\n')}

## Lengths — Figma variable → CSS

\`Dimension Semantics\` follows the viewport (Desktop · Tablet · Mobile); the CSS custom property steps down in the same media blocks. A \`Dimension Primitives\` length (\`16\`) is a raw length: hand it off as \`var(--dimension-16)\` and ask whether a role fits.

| Figma | CSS |
|---|---|
${[...dimRows, ...iconRows].join('\n')}

## Text and effect styles → CSS

| Figma style | CSS |
|---|---|
${[...typeRows, ...shadowRows].join('\n')}
`
}

// ── component-build: React ─────────────────────────────────────────────────

/** Axes the stylesheet reads from an attribute (every axis a part depends on, but State). */
export function recipeAttributeAxes(recipe: ComponentRecipe): string[] {
  const axes: string[] = []
  for (const p of recipe.parts) for (const a of p.axes) if (a !== 'State' && !axes.includes(a)) axes.push(a)
  return axes
}

function axisValues(recipe: ComponentRecipe, axis: string): string[] {
  const values: string[] = []
  for (const p of recipe.parts) {
    const i = p.axes.indexOf(axis)
    if (i < 0) continue
    for (const combo of Object.keys(p.values)) {
      const v = combo.split('|')[i]
      if (!values.includes(v)) values.push(v)
    }
  }
  return values
}

/** The DOM a slot is painted on: `data-part="<Key>.<base>"` plus its own state. */
export function slotDomSelector(recipe: ComponentRecipe, slot: string): string {
  const dom = recipe.dom?.slots?.[slot]
  if (dom) return dom
  const pseudo = recipe.pseudoSlots?.[slot]
  if (pseudo) return `${slotDomSelector(recipe, pseudo.of)}${pseudo.pseudo}`
  const m = /^([A-Za-z-]+)(.*)$/.exec(slot)
  const base = m?.[1] ?? slot
  const rest = m?.[2] ?? ''
  if (base === recipe.slots[0]) return `${recipe.dom?.root ?? `[data-escala="${recipe.key}"]`}${rest}`
  return `${recipe.dom?.slots?.[base] ?? `[data-part="${recipe.key}.${base}"]`}${rest}`
}

/** Note on a part the sheet has no rule for: it inherits from the root. */
export const UNPAINTED = 'no rule of its own: inherits from the root'

/** The attribute and pseudo pieces of a selector, each one the sheet must write. */
export function selectorPieces(selector: string): string[] {
  return selector.match(/\[[^\]]+\]|::?[a-z-]+(?:\([^)]*\))?/g) ?? []
}

export function componentReactFile(key: string): string {
  const recipe = COMPONENT_RECIPES[key]
  const def = COMPONENTS.find((c) => c.key === key)
  const label = def?.label ?? key
  const attrs = recipeAttributeAxes(recipe)
  const hasState = recipe.parts.some((p) => p.axes.includes('State'))
  const detached = new Set(recipe.detachedSlots ?? [])
  const css = recipeCss(recipe)
  const vars = recipeCssVars(css).filter((v) => !v.startsWith('--escala-'))

  return [
    `# ${label} — React`,
    '',
    def?.description ?? '',
    '',
    ...whenToUse(def),
    `File: \`components/ui/${componentFileName(key)}.tsx\` (shadcn skeleton).`,
    '',
    '```tsx',
    componentImportLine(key),
    '```',
    '',
    `Styles: the \`/* ${key} */\` block of [\`recipes.css\`](recipes.css), after \`variables.css\`.`,
    '',
    '## Attributes',
    '',
    '| Attribute | On | Values |',
    '|---|---|---|',
    `| \`data-escala="${key}"\` | root | — |`,
    ...attrs.map((a) => `| \`data-${a.toLowerCase()}\` | root | ${axisValues(recipe, a).map((v) => (v === recipe.defaults[a] ? `**${v}**` : v)).join(' · ')} |`),
    ...(hasState ? [`| \`data-force-state\` | root | ${axisValues(recipe, 'State').join(' · ')} (docs only; product code uses the real state) |`] : []),
    '',
    ...(recipe.dom ? [`The DOM of this component comes from a library: its root is \`${recipe.dom.root}\`.`, ''] : []),
    '## Parts',
    '',
    '| Slot | Selector | Note |',
    '|---|---|---|',
    ...figmaSlotsOf(recipe).map((slot, i) => {
      const selector = slotDomSelector(recipe, slot)
      const notes = [
        i === 0 ? 'root' : detached.has(slot) ? 'rendered outside the root (portal)' : recipe.pseudoSlots?.[slot] ? 'pseudo-element' : '',
        selectorPieces(selector).every((piece) => css.includes(piece)) ? '' : UNPAINTED,
      ].filter(Boolean)
      return `| \`${slot}\` | \`${selector}\` | ${notes.join('; ')} |`
    }),
    '',
    '## Variables it reads',
    '',
    vars.map((v) => `\`${v}\``).join(' · '),
    '',
  ].join('\n')
}

function recipesCss(keys: string[]): string {
  return [
    '/* Component styles generated by Escala from the component recipes.',
    ' * Every value is a var() from variables.css: load that file first.',
    ' * Painted by attribute: data-escala, data-<axis>, data-part. */',
    '',
    ...keys.map((key) => `/* ${key} */\n${recipeCss(COMPONENT_RECIPES[key]).trim()}\n`),
  ].join('\n')
}

// ── screen-compose ─────────────────────────────────────────────────────────

function stepPx(json: TokenJSON, step: string | undefined): number | null {
  if (!step) return null
  const pinned = /^dimension-(-?[\d_]+)$/.exec(step)
  if (pinned) return Number(pinned[1].replace('_', '.'))
  const n = parseFloat(json.spacing?.[step] ?? '')
  return Number.isFinite(n) ? n : null
}

/** A spacing role's px per viewport (Desktop · Tablet · Mobile). */
export function spacingRolePx(json: TokenJSON, role: string): [number | null, number | null, number | null] {
  const ref = json.spacingRoleRefs?.[role] ?? json.spacingRoles?.[role]
  const responsive = ref ? json.spacingResponsive?.[ref] : undefined
  if (responsive) return [stepPx(json, responsive.desktop), stepPx(json, responsive.tablet ?? responsive.desktop), stepPx(json, responsive.mobile)]
  const one = stepPx(json, ref)
  return [one, one, one]
}

const pxCell = (n: number | null) => (n === null ? '—' : `${n}px`)

function screenComposeSkill(json: TokenJSON, project: string, slug: string, keys: string[]): string {
  const roles = [...new Set(SCREEN_PATTERNS.flatMap((p) => p.spacing.map((s) => s.role)))]
  const spacingRows = roles.filter((r) => json.spacingRoles?.[r] !== undefined).map((r) => {
    const [d, t, m] = spacingRolePx(json, r)
    return `| \`Spacing/${r}\` | \`var(--spacing-${r})\` | ${pxCell(d)} | ${pxCell(t)} | ${pxCell(m)} |`
  })
  const gridRows = (json.gridStyles ?? []).map((g) =>
    `| \`Grid/${g.label ?? g.key}\` | ${g.viewport ?? '—'} | ${g.width ?? '—'} | ${g.columns ?? '—'} | ${g.column ?? '—'} | ${g.gutter ?? '—'} | ${g.margin ?? '—'}${g.sidebar ? ` (sidebar ${g.sidebar})` : ''} |`)
  const typeRoles = [...new Set(SCREEN_PATTERNS.flatMap((p) => p.type.map((t) => t.role)))]
    .filter((r) => json.typography?.roles?.[r])
  const selected = new Set(selectedComponentKeys(json.atoms))
  const link = (key: string) => !keys.includes(key)
    ? key
    : `[${key}](../component-build/components/${key.replace(/[^A-Za-z0-9]+/g, '')}.md)${selected.has(key) ? '' : ' (documented; not in this system\'s Figma selection — add it in Escala)'}`
  const axes = (a?: Record<string, string>) => (a ? ` · ${Object.entries(a).map(([k, v]) => `${k}=${v}`).join(', ')}` : '')

  const patterns = SCREEN_PATTERNS.map((p) => [
    `### ${p.label}`,
    '',
    p.purpose,
    '',
    ...p.parts.map((part, i) => `${i + 1}. ${link(part.key)}${axes(part.axes)}: ${part.use}.`),
    '',
    `- Spacing: ${p.spacing.map((s) => `\`Spacing/${s.role}\` between ${s.between}`).join(' · ')}.`,
    `- Type: ${p.type.map((t) => `\`Type/${t.role}\` for ${t.use}`).join(' · ')}.`,
    ...(p.radius ? [`- Radius: ${p.radius.map((r) => `\`${roleFigmaName('radius', r.role)}\` for ${r.use}`).join(' · ')}.`] : []),
    ...(p.cardShadow ? [`- The card's elevation: \`Shadow/${p.cardShadow}\`.`] : []),
    '',
  ].join('\n'))

  return `---
name: ${slug}-screen-compose
description: "Compose ${project} screens (login, verification, pricing, checkout, settings) from the system's components, spacing roles, type roles and grid styles. Use when designing or building a full screen in Figma or in code."
---

# ${project} — compose a screen

Design skills · Figma and code. Load \`AGENTS.md\` first. A screen is the system's components on the system's grid, spaced by ROLE. It picks no numbers of its own.

## Rules

1. **The page sits on a grid style.** In Figma apply the layout grid style; in code the page inset is \`var(--grid-margin)\` and the content width \`var(--grid-container)\` (both step down per viewport).
2. **Every gap is a spacing role**, from the outside in: \`gap-section\` between blocks, \`gap-group\` between controls of one group, \`gap-control\` inside a row, \`gap-tight\` between a title and its subtitle. Bind the role (\`Spacing/<role>\` / \`var(--spacing-<role>)\`), never its px.
3. **Text uses type roles** (\`Type/<role>\` / \`var(--text-<role>-*)\`).
4. **One primary action per screen**, full width on mobile, \`size=lg\` (it resolves the touch height). A destructive action goes last.
5. **Controls come from \`skills/component-build/\`**, never redrawn.
6. Review the result with \`skills/design-review/SKILL.md\`.

## Grid styles

| Figma style | Viewport | Width | Columns | Column | Gutter | Margin |
|---|---|---|---|---|---|---|
${gridRows.join('\n')}

## Spacing roles

| Figma | CSS | Desktop | Tablet | Mobile |
|---|---|---|---|---|
${spacingRows.join('\n')}

## Type roles

${typeRoles.map((r) => `\`Type/${r}\``).join(' · ')}

## Patterns

These are the screens Escala renders from this system (Artefacts). Follow their structure; change the copy.

${patterns.join('\n')}`
}
