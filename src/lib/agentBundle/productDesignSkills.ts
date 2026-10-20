// Design skills — the designer-facing half of the agent package (Figma first).
// See design-plans/design-skills-package.md.
//
// Nothing here is written per system. Every name comes from the payload
// (`TokenJSON`), the component recipes (the table the web stylesheet and the
// Figma plugin both read) or the audit's own pair list, and the drift tests in
// agentContextAudit.test.ts fail the moment a skill cites a name that does not
// exist.

import { COMPONENTS, ESSENTIAL_COMPONENT_KEYS } from '../componentCatalogue'
import { COMPONENT_RECIPES, cssVarOf, recipeColorRoles, type ComponentRecipe, type SlotMap } from '../componentRecipes'
import { RADIUS_GROUPS } from '../layoutTokens'
import { mdCell } from '../utils.js'
import {
  FIGMA_PROP_LABEL, figmaLayerName, figmaRefsFor, isFigmaProp, isPseudoSlot, semanticRoleIds, type FigmaRef,
} from './figmaRefs'
import { figmaPrimitiveName, figmaSemanticName, webCodeSyntax } from './names'
import { inkPairings, intentFloors } from './productSkills'
import type { AgentBundleFile, TokenJSON } from './types'

const F = figmaSemanticName

function projectOf(json: TokenJSON): string {
  return json.project?.trim() || 'Design system'
}

function slugOf(project: string): string {
  return project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'
}

/** Same rule as the code templates: the selected components, else the essentials. */
export function designSkillComponents(json: TokenJSON): string[] {
  const atoms = (json.atoms ?? []).filter((k) => COMPONENT_RECIPES[k])
  return atoms.length ? atoms : ESSENTIAL_COMPONENT_KEYS.filter((k) => COMPONENT_RECIPES[k])
}

export function componentBuildPath(key: string): string {
  return `skills/component-build/components/${key.replace(/[^A-Za-z0-9]+/g, '')}.md`
}

export function buildDesignSkillFiles(json: TokenJSON): AgentBundleFile[] {
  const project = projectOf(json)
  const slug = slugOf(project)
  const keys = designSkillComponents(json)
  return [
    { path: 'skills/component-build/SKILL.md', text: componentBuildSkill(project, slug, keys) },
    ...keys.map((key) => ({ path: componentBuildPath(key), text: componentBuildFile(json, key) })),
    { path: 'skills/design-review/SKILL.md', text: designReviewSkill(json, project, slug) },
    { path: 'skills/handoff-spec/SKILL.md', text: handoffSkill(json, project, slug, keys) },
  ]
}

// ── Shared cells ───────────────────────────────────────────────────────────

/** `Bind to` and `Collection` cells for one reference, in the same order. */
function bindCells(ref: string, json: TokenJSON, roles: Set<string>): [string, string, string] {
  const refs: FigmaRef[] | null = figmaRefsFor(ref, json, roles)
  const css = ref.split('+').map((r) => `\`${cssVarOf(r, 'font-size').replace(/-font-size$/, '-*')}\``).join(' + ')
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

function componentBuildSkill(project: string, slug: string, keys: string[]): string {
  const index = keys.map((key) => {
    const def = COMPONENTS.find((c) => c.key === key)
    const recipe = COMPONENT_RECIPES[key]
    const layers = figmaSlotsOf(recipe).map((s) => `\`${figmaLayerName(s)}\``).join(' · ')
    return `| ${mdCell(def?.label ?? key)} | ${def?.figmaSets.length ? def.figmaSets.map((s) => `\`${s}\``).join(', ') : '—'} | ${layers} | [${key}](${componentBuildPath(key).replace('skills/component-build/', '')}) |`
  })
  return `---
name: ${slug}-component-build
description: "Build or dress ${project} components in Figma: which variable goes on each layer, with layers named after the recipe slots. Use when creating, rebuilding or checking a component set in Figma."
---

# ${project} — build a component in Figma

Design skills · Figma. Load \`AGENTS.md\` and \`SKILL.md\` first.

Every component is ONE recipe: the same table paints the web component and the Figma component set. The Escala plugin builds the sets for you (sync from Escala). Use this skill when you build one by hand, extend one, or check one.

## Rules

1. **Name each layer after its slot.** The component itself is \`root\`. A part is its slot name (\`label\`, \`icon\`, \`thumb\`). A second copy of a part takes a suffix (\`icon-leading\`, \`icon-trailing\`). A data state is a suffix too (\`item-highlighted\`, \`cell-active\`).
2. **Bind, never type a value.** Each property in the component's file names the variable or style to bind. No hex, no px, no primitive colour ramp.
3. **Variants come from the variant properties** listed per component. A Hover / Focused / Disabled look is a variant of \`State\`, painted from its own row, not an override on an instance.
4. **A sum has no single variable** (\`Selector/role/control\` + \`2\`): set the resulting length and leave a note; do not bind one of the terms alone.
5. **"Not published in this system"** means the recipe asks for a token this system does not ship. Do not invent one: report it.
6. Text layers take a text style \`Type/<role>\` (a text style listed on \`root\` goes on the component's text layers); shadows take an effect style \`Shadow/<step>\`.

## Components

| Component | Figma sets | Layers | Spec |
|---|---|---|---|
${index.join('\n')}
`
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
    `| ${g.label} | ${g.hint} | ${g.roles.filter((r) => json.radiusRoles?.[r] !== undefined).map((r) => `\`Radius/role/${r}\``).join(', ')} | ${g.roles.map((r) => radiusPx(json, r)).join(', ')} |`)
  const ring = roles.has('border.ring.default') ? ` The halo around it is \`${F('border.ring.default')}\`.` : ''

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
- Circles (avatar, switch track, badge) use \`Radius/role/pill\`.
- A flush nested shape (a chip inside a field, a card filling a modal) has a smaller radius than its parent. A button floating with padding inside a card is not nested.

## 4. Spacing on the scale

- Padding and gaps resolve to the spacing scale: ${spacingScale(json)} px. Anything else is off-scale.
- Prefer the role: ${spacingRoles.map((r) => `\`Spacing/role/${r}\``).join(' · ')}.

## 5. Field outline

- The resting edge of every field-like control is \`${F('border.control')}\` (hover \`${F('border.control-hover')}\`), never \`${F('border.strong')}\` or \`${F('border.default')}\`. In this system: ${fieldLike.join(', ')}.
- Focus is \`${F('border.focus')}\`, never \`${F('border.accent')}\`.${ring}
- An error field strokes \`${F('status.critical.border-strong')}\`.

## Report

| Layer | Property | Found | Should bind | Rule |
|---|---|---|---|---|
| \`card/root\` | Corner radius | \`8\` (unbound) | \`Radius/role/container\` | 3 |
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
    Object.keys((json[field] as unknown as Record<string, string> | undefined) ?? {}).map((r) => `| \`${group}/role/${r}\` | \`var(${cssVarOf(`${ns}.${r}`)})\` |`))
  const iconRows = Object.keys(json.icons?.sizes?.roles ?? {}).map((r) => `| \`Icon/role/${r}\` | \`var(--icon-${r})\` |`)
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
