// ── Export wizard (Source → Where → Export) ────────────────────────────────
// The guided whole-system export behind Variables' "Export" pill: pick WHAT
// ships (collections + semantic modes), WHERE it goes (Figma / GitHub / code / AI),
// then download/copy the result.
//
// Four destinations, not a pile of file formats. Figma → `escala`, Code →
// `w3c`, AI → `agent-bundle` (Skill zip is a nested "Figma Make only" toggle),
// and GitHub reuses the repository exporter instead of creating a fourth file
// generator. Markdown left the wizard — it already lives in Save (`README.md`)
// and Copy context.
// CSS / SCSS / Tailwind stay on Save (`variables.css`), not a fourth destination.
// The old Categorical-AI JSON is folded into the Skill slice of the AI zip.
//
// Everything derives from ONE call to `generateTokenJSON()` — the same payload
// the Figma plugin imports — so wizard output can never disagree with
// tokens.json: primitives arrive pre-flattened (`accent-500`, `neutral-dark-300`),
// themes pre-normalized onto their source ramps.

import { generateTokenJSON, flattenScale } from './tokenGenerator'
import { buildSectionExport, type ColorFormat, type SectionKey } from './sectionExport'
import { useDesignStore } from '../store/useDesignStore'
import { buildAgentProductExport, buildSkillExport } from './skillExport'
import { LAYOUT_ROLES, mergeLayoutRoles, mergeGridFrame, extractBreakpoints, BREAKPOINT_STEPS, type LayoutFamily } from './layoutTokens'

export type WizardCollection =
  | 'primitives' | 'semantics' | 'gradients' | 'typography' | 'spacing'
  | 'radius' | 'shadow' | 'grid' | 'sizes' | 'stroke' | 'icons'

/** Every collection, in export order — also the "share the whole system" preset. */
export const ALL_WIZARD_COLLECTIONS: WizardCollection[] = [
  'primitives', 'semantics', 'gradients', 'typography', 'spacing',
  'radius', 'shadow', 'grid', 'sizes', 'stroke', 'icons',
]

export type WizardFormat = 'w3c' | 'escala' | 'md' | 'skill' | 'agent-bundle'
export type WizardDestination = Exclude<WizardFormat, 'md' | 'skill'> | 'github'
export type WizardStructure = 'single' | 'per-collection'

/** The `sectionExport` slice each collection maps onto — Tailwind and Markdown
 *  reuse those builders rather than growing a second renderer per format.
 *  Primitives and semantics are one 'color' section there, hence the dedupe. */
const SECTION_OF: Record<WizardCollection, SectionKey> = {
  primitives: 'color', semantics: 'color', gradients: 'gradients', typography: 'typography',
  spacing: 'spacing', radius: 'radius',
  shadow: 'shadow', grid: 'grid', sizes: 'sizes', stroke: 'stroke', icons: 'icons',
}

export interface WizardSelection {
  collections: WizardCollection[]
  /** Primitive color families to ship (`accent`, `neutral`, a custom key…) —
   *  a subset of `primitiveFamilyMeta()`. Ignored unless 'primitives' is
   *  selected. `undefined` means "every family", so a caller that doesn't care
   *  about family scoping keeps the pre-existing whole-palette behaviour.
   *  Primitives' per-family quick export is just this field pre-filled with
   *  one key — there's no second export path behind that icon. */
  primitiveFamilies?: string[]
  /** Which appearance of those families ships — `undefined` = both ramps
   *  (`accent-*` AND `accent-dark-*`), which is what a normal export does.
   *  Primitives' per-column quick export sets it, since that icon sits in the
   *  light or the dark column and can only honestly ship that one. */
  primitiveAppearance?: 'light' | 'dark'
  /** Semantic themes to ship (subset of themeOrder). Ignored unless 'semantics' is selected. */
  modes: string[]
  format: WizardFormat
  structure: WizardStructure
  colorFormat: ColorFormat
  /** W3C only — semantic values that sit on a primitive tone ship as `{color.accent.600}` references. */
  includeAliases: boolean
  /** Escala JSON only — whether `atoms` ships at all (which components, per
   *  `useDesignStore`'s `selectedComponents` — the SAME list the Components
   *  tab edits, so there's no second, divergent "which components" list).
   *  Other formats have no component representation and ignore this. */
  includeComponents: boolean
}

export interface WizardFile {
  name: string
  content: string
  language: 'json' | 'css' | 'scss' | 'js' | 'md' | 'zip'
  /** When set, download this instead of `content` (Skill zip). */
  binary?: Uint8Array
}

type TokenJSON = ReturnType<typeof generateTokenJSON>

export interface FormatOption {
  key: WizardFormat
  label: string
  hint: string
}

export interface DestinationOption {
  key: WizardDestination
  label: string
  hint: string
}

/** Wizard step 2 — where the system is going, not what the file is called. */
export const WIZARD_DESTINATIONS: DestinationOption[] = [
  { key: 'escala', label: 'Figma', hint: 'Escala plugin — variables land in the file you design in' },
  { key: 'github', label: 'GitHub repository', hint: 'Version tokens, CSS and documentation in your product repo' },
  { key: 'w3c', label: 'Code & other tools', hint: 'W3C JSON for Style Dictionary, Tokens Studio, Figma native import' },
  { key: 'agent-bundle', label: 'AI assistant', hint: 'Full context for Cursor & Claude so the agent stops inventing hex' },
]

/** Generated-format subset of the destination list. GitHub is an outbound
 * repository flow, not a format, so consumers that need a WizardFormat cannot
 * accidentally treat it like a downloadable file. */
export const WIZARD_FORMATS = WIZARD_DESTINATIONS.filter(
  (destination) => destination.key !== 'github',
)

/** Per-column primitive export (ColorPrimitives). Markdown stays here — it is a
 *  paste into a prompt, not a competing wizard destination. Skill does not:
 *  a single Accent ramp is not a Skill package. */
export const FAMILY_FORMAT_OPTIONS: FormatOption[] = [
  { key: 'w3c', label: 'W3C Design Tokens', hint: 'Standard format with $value, $type' },
  { key: 'escala', label: 'Escala JSON', hint: 'The exact tokens.json the Figma plugin imports' },
  { key: 'md', label: 'Markdown', hint: 'Readable tables — paste into a chat' },
]

export const FAMILY_EXPORT_FORMATS: WizardFormat[] = FAMILY_FORMAT_OPTIONS.map((f) => f.key)

export function isAiFormat(format: WizardFormat): boolean {
  return format === 'agent-bundle' || format === 'skill'
}

export function wizardFormatLabel(format: WizardFormat): string {
  if (format === 'skill') return 'AI assistant · Figma Make'
  return WIZARD_DESTINATIONS.find((d) => d.key === format)?.label
    ?? FAMILY_FORMAT_OPTIONS.find((d) => d.key === format)?.label
    ?? format
}

// Badge next to a destination in the wizard. Figma is the one this app is
// built around (filled). Code and AI are informational (outline).
export const WIZARD_FORMAT_BADGE: Partial<Record<WizardFormat, string>> = {
  escala: 'Plugin',
  w3c: 'W3C JSON',
  'agent-bundle': 'Cursor · Claude',
  skill: 'Figma Make',
}

// ── Primitive families ───────────────────────────────────────────────────────
// `colors.primitive` is FLAT (`accent-9`, `accent-dark-9`, `teal-3`), so a
// "family" here is the exported prefix minus its tone and minus the `-dark`
// twin marker: picking Accent ships BOTH appearances, exactly like the
// Primitives table shows one family as a light + dark pair of columns. Keyed
// off the real payload rather than the store, so a family can't be offered
// that the export doesn't actually contain.

/** `accent-9` → `accent` · `neutral-dark-3` → `neutral`. */
export function primitiveFamilyOf(tokenName: string): string {
  return splitFlat(tokenName)[0].replace(/-dark$/, '')
}

export interface PrimitiveFamilyMeta {
  key: string
  label: string
  count: number
}

/** Every primitive family in the payload, in export order, with its variable
 *  count (light + dark ramps together). */
export function primitiveFamilyMeta(full: TokenJSON = generateTokenJSON()): PrimitiveFamilyMeta[] {
  const counts = new Map<string, number>()
  for (const name of Object.keys(full.colors.primitive)) {
    const key = primitiveFamilyOf(name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const labels = new Map(useDesignStore.getState().customColors.map((c) => [c.key, c.label]))
  return [...counts].map(([key, count]) => ({
    key,
    label: labels.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1),
    count,
  }))
}

/** Is this flat token name a DARK-twin one (`accent-dark-9`)? */
const isDarkToken = (name: string) => splitFlat(name)[0].endsWith('-dark')

/** The primitive slice a selection ships — every family, both ramps, when
 *  unscoped. */
function pickedPrimitives(
  full: TokenJSON,
  families?: string[],
  appearance?: 'light' | 'dark',
): Record<string, string> {
  if (!families && !appearance) return full.colors.primitive
  return Object.fromEntries(
    Object.entries(full.colors.primitive).filter(([name]) =>
      (!families || families.includes(primitiveFamilyOf(name)))
      && (!appearance || isDarkToken(name) === (appearance === 'dark')),
    ),
  )
}

// ── Collection metadata (labels + live variable counts) ──────────────────────

export interface CollectionMeta {
  key: WizardCollection
  label: string
  count: number
  /** Present on 'semantics' — the theme columns available as modes. */
  modes?: string[]
}

export function collectionMeta(full: TokenJSON = generateTokenJSON()): CollectionMeta[] {
  const t = full.typography
  const typeRoleCount = Object.keys(t.roles ?? {}).length
  const typographyCount =
    2 + Object.keys(t.sizes).length + Object.keys(t.lineHeights ?? {}).length + Object.keys(t.weights).length + typeRoleCount
  const themeNames = full.colors.themeOrder
  const roleCount = Object.keys(full.colors.themes[themeNames[0]] ?? {}).length
  return [
    { key: 'primitives', label: 'Color · Primitives', count: Object.keys(full.colors.primitive).length },
    { key: 'semantics', label: 'Color · Semantics', count: roleCount * themeNames.length, modes: themeNames },
    { key: 'gradients', label: 'Gradients', count: Object.keys(full.gradients).length + Object.keys(full.gradientsDark).length },
    { key: 'typography', label: 'Typography', count: typographyCount },
    { key: 'spacing', label: 'Spacing', count: Object.keys(full.spacing).length + Object.keys(full.spacingRoles ?? {}).length },
    { key: 'radius', label: 'Radius', count: Object.keys(full.radius).length + Object.keys(full.radiusRoles ?? {}).length },
    { key: 'shadow', label: 'Shadow', count: Object.keys(full.shadows).length },
    { key: 'grid', label: 'Grid', count: Object.keys(full.grid).length + Object.keys(full.breakpointRoles ?? {}).length + 8 },
    { key: 'sizes', label: 'Sizes', count: Object.keys(full.sizes).length + Object.keys(full.sizeRoles ?? {}).length + Object.keys(full.selector ?? {}).length + Object.keys(full.selectorRoles ?? {}).length },
    { key: 'stroke', label: 'Stroke', count: Object.keys(full.stroke ?? {}).length + Object.keys(full.strokeRoles ?? {}).length },
    { key: 'icons', label: 'Icons', count: 1 + (full.icons.custom?.length ?? 0) },
  ]
}

/** Variables the current selection ships — the summary's headline number. */
export function selectionCount(
  sel: Pick<WizardSelection, 'collections' | 'modes' | 'primitiveFamilies' | 'primitiveAppearance'>,
  full: TokenJSON = generateTokenJSON(),
): number {
  const meta = collectionMeta(full)
  return sel.collections.reduce((sum, key) => {
    const m = meta.find((x) => x.key === key)
    if (!m) return sum
    // Family-scoped primitives count only the families actually shipping —
    // the headline number has to match the file, family filter included.
    if (key === 'primitives') return sum + Object.keys(pickedPrimitives(full, sel.primitiveFamilies, sel.primitiveAppearance)).length
    if (key === 'semantics') {
      const perMode = m.modes?.length ? m.count / m.modes.length : m.count
      return sum + Math.round(perMode * sel.modes.length)
    }
    return sum + m.count
  }, 0)
}

// ── W3C DTCG ─────────────────────────────────────────────────────────────────

type W3CNode = { [k: string]: W3CNode } | { $value: unknown; $type: string }

const token = (value: unknown, type: string): W3CNode => ({ $value: value, $type: type })

// `accent-500` → ['accent', '500'] · `neutral-dark-300` → ['neutral-dark', '300'].
const splitFlat = (name: string): [string, string] => {
  const i = name.lastIndexOf('-')
  return i < 0 ? [name, name] : [name.slice(0, i), name.slice(i + 1)]
}

function w3cPrimitives(full: TokenJSON, families?: string[], appearance?: 'light' | 'dark'): W3CNode {
  const out: Record<string, Record<string, W3CNode>> = {}
  for (const [name, hex] of Object.entries(pickedPrimitives(full, families, appearance))) {
    const [family, tone] = splitFlat(name)
    ;(out[family] ??= {})[tone] = token(hex, 'color')
  }
  return out as W3CNode
}

/** hex → `{color.<family>.<tone>}` over the exported primitives (first hit wins).
 *  Scoped to the families actually shipping, so an alias can never reference a
 *  token this file left out. */
function aliasMap(full: TokenJSON, families?: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const [name, hex] of Object.entries(pickedPrimitives(full, families))) {
    const [family, tone] = splitFlat(name)
    const key = hex.toLowerCase()
    if (!map.has(key)) map.set(key, `{color.${family}.${tone}}`)
  }
  return map
}

function w3cSemantics(full: TokenJSON, modes: string[], aliases: boolean, families?: string[]): W3CNode {
  const refs = aliases ? aliasMap(full, families) : null
  const out: Record<string, Record<string, W3CNode>> = {}
  for (const mode of modes) {
    const theme = full.colors.themes[mode]
    if (!theme) continue
    out[mode] = {}
    for (const [role, hex] of Object.entries(theme)) {
      if (!hex) continue
      out[mode][role] = token(refs?.get(hex.toLowerCase()) ?? hex, 'color')
    }
  }
  return out as W3CNode
}

const isPx = (v: string) => /(px|rem|em|%)$/.test(v)

function dimWithRoles(
  family: LayoutFamily,
  primitives: Record<string, string>,
  roles: Record<string, string> | undefined,
  /** Dotted path this group sits at, when it isn't the tree's own root — an
   *  alias has to name the full path or no DTCG importer can follow it. Same
   *  reason breakpoints alias `{grid.breakpoint.md}` rather than `{breakpoint.md}`. */
  refRoot?: string,
): W3CNode {
  const dim = (o: Record<string, string>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, token(v, isPx(v) ? 'dimension' : 'number')])) as Record<string, W3CNode>
  const out = dim(primitives)
  const map = mergeLayoutRoles(family, roles)
  const root = refRoot ?? (family === 'size' ? 'size' : family)
  for (const role of LAYOUT_ROLES[family]) {
    out[role.key] = token(`{${root}.${map[role.key]}}`, 'dimension')
  }
  return out as W3CNode
}

function w3cSection(key: WizardCollection, full: TokenJSON): W3CNode {
  const dim = (o: Record<string, string>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, token(v, isPx(v) ? 'dimension' : 'number')])) as W3CNode
  switch (key) {
    case 'typography': {
      const t = full.typography
      const roles = t.roles ?? {}
      const roleNode: W3CNode = {}
      for (const [key, modes] of Object.entries(roles)) {
        const pack = (alias: { family: string; size: string; weight: string }): W3CNode => ({
          fontFamily: token(`{typography.fontFamily.${alias.family === 'display' ? 'heading' : 'body'}}`, 'fontFamily'),
          fontSize: token(`{typography.size.${alias.size}}`, 'dimension'),
          fontWeight: token(`{typography.weight.${alias.weight}}`, 'fontWeight'),
          lineHeight: token(`{typography.lineHeight.${alias.size}}`, 'dimension'),
        })
        ;(roleNode as Record<string, W3CNode>)[key] = {
          desktop: pack(modes.desktop),
          mobile: pack(modes.mobile),
        }
      }
      return {
        fontFamily: {
          heading: token(t.headingFontFamily ?? t.fontFamily, 'fontFamily'),
          body: token(t.fontFamily, 'fontFamily'),
        },
        size: dim(t.sizes),
        lineHeight: dim(t.lineHeights ?? {}),
        weight: Object.fromEntries(Object.entries(t.weights).map(([k, v]) => [k, token(v, 'fontWeight')])) as W3CNode,
        role: roleNode,
      }
    }
    case 'spacing': return dimWithRoles('spacing', full.spacing, full.spacingRoles)
    case 'radius': return dimWithRoles('radius', full.radius, full.radiusRoles)
    // Selector nests under the `size` root as its own group — one collection,
    // one W3C root, same shape breakpoints already take under `grid`.
    case 'sizes': return {
      ...dimWithRoles('size', full.sizes, full.sizeRoles),
      selector: dimWithRoles('selector', full.selector ?? {}, full.selectorRoles, 'size.selector'),
    } as W3CNode
    case 'stroke': return dimWithRoles('stroke', full.stroke ?? {}, full.strokeRoles)
    case 'grid': {
      const bps = extractBreakpoints(full.grid)
      const cuts = mergeLayoutRoles('breakpoint', full.breakpointRoles)
      const frame = mergeGridFrame(full.gridFrame)
      const breakpoint: Record<string, W3CNode> = {}
      for (const step of BREAKPOINT_STEPS) {
        breakpoint[step] = token(bps[step], 'dimension')
      }
      breakpoint.desktop = token(`{grid.breakpoint.${cuts.desktop}}`, 'dimension')
      breakpoint.mobile = token(`{grid.breakpoint.${cuts.mobile}}`, 'dimension')
      const pack = (alias: { columns: string; gutter: string; margin: string; container: string }): W3CNode => ({
        columns: token(Number(alias.columns), 'number'),
        gutter: token(`{spacing.${alias.gutter}}`, 'dimension'),
        margin: token(`{spacing.${alias.margin}}`, 'dimension'),
        container: alias.container === 'none'
          ? token('none', 'string')
          : token(`{grid.breakpoint.${alias.container}}`, 'dimension'),
      })
      return {
        breakpoint,
        frame: {
          desktop: pack(frame.desktop),
          mobile: pack(frame.mobile),
        },
      }
    }
    case 'shadow':
      return Object.fromEntries(Object.entries(full.shadows).map(([k, v]) => [k, token(v, 'shadow')])) as W3CNode
    case 'gradients': {
      const node: Record<string, W3CNode> = {}
      for (const [slug, css] of Object.entries(full.gradients)) {
        const darkCss = full.gradientsDark[slug]
        node[slug] = darkCss && darkCss !== css
          ? { light: token(css, 'gradient'), dark: token(darkCss, 'gradient') }
          : token(css, 'gradient')
      }
      return node as W3CNode
    }
    case 'icons': {
      const node: Record<string, W3CNode> = {
        library: token(full.icons.name, 'string'),
      }
      if (full.icons.package) node.package = token(full.icons.package, 'string')
      if (full.icons.repo) node.repo = token(full.icons.repo, 'string')
      const ai = full.icons.aiSource
      if (ai?.repo) {
        node.aiSource = token(ai.repo, 'string')
        node.aiPackage = token(ai.npm, 'string')
      }
      return node as W3CNode
    }
    default: return {}
  }
}

// Root keys per collection in the W3C tree (also the per-collection filenames).
const W3C_ROOT: Record<WizardCollection, string> = {
  primitives: 'color', semantics: 'semantic', gradients: 'gradient', typography: 'typography',
  spacing: 'spacing', radius: 'radius',
  shadow: 'shadow', grid: 'grid', sizes: 'size', stroke: 'stroke', icons: 'icon',
}

function w3cTreeFor(key: WizardCollection, sel: WizardSelection, full: TokenJSON): W3CNode {
  if (key === 'primitives') return w3cPrimitives(full, sel.primitiveFamilies, sel.primitiveAppearance)
  if (key === 'semantics') {
    const primitivesShipped = sel.collections.includes('primitives')
    // An alias is only resolvable if the primitives it points at are actually
    // IN this export — a semantics-only run used to alias `{color.accent.9}`
    // unconditionally (`pickedPrimitives` with no family filter falls back to
    // the WHOLE unscoped primitive set), producing a document with references
    // to a `color` tree that was never written anywhere in the output. Every
    // DTCG-aware importer (Tokens Studio, Figma Variables import, Style
    // Dictionary) either throws or silently drops the token on a reference it
    // can't resolve — this is why "W3C export → Figma won't read the file"
    // reproduces reliably on a Semantics-only run with aliases left on (the
    // wizard's default). Falling back to the resolved hex here is what
    // `includeAliases: false` already does deliberately (see the toggle's own
    // "Resolved to hex" label) — reusing that path means a semantics-only
    // export is not a special case, just the same fallback with a different
    // trigger. `ExportWizard.tsx`'s step-3 Summary row mirrors this so the UI
    // never claims "Included" for a file that will actually ship hex.
    const families = primitivesShipped ? sel.primitiveFamilies : undefined
    return w3cSemantics(full, sel.modes, sel.includeAliases && primitivesShipped, families)
  }
  return w3cSection(key, full)
}

// ── Public entry ─────────────────────────────────────────────────────────────

export function buildWizardExport(sel: WizardSelection): WizardFile[] {
  const full = generateTokenJSON()
  const project = useDesignStore.getState().projectName || 'escala'
  const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escala'
  const ordered = ALL_WIZARD_COLLECTIONS.filter((k) => sel.collections.includes(k))

  if (sel.format === 'escala') {
    // NOT sliced by `collections` — this format's whole promise (see its hint
    // in ExportWizard) is "the exact payload the Figma plugin imports", and
    // the plugin requires typography/spacing/radius unconditionally, plus
    // `atoms`/`style` which aren't even collection options here. A collection
    // filter on this format used to produce a file that LOOKED like a valid
    // tokens.json (right name, right shape) but silently dropped required
    // fields — the plugin doesn't degrade gracefully on those, it throws
    // (e.g. missing `typography` crashed importVariables and, because every
    // import phase used to share one try/catch, took Components and
    // Documentation down with it). Ship `full` verbatim, always — EXCEPT
    // `atoms`, the one field Step 1's "Include components" toggle controls:
    // off ships an empty array so the plugin's importComponents phase
    // no-ops, same as unchecking every component individually.
    const payload = sel.includeComponents ? full : { ...full, atoms: [] }
    return [{ name: `${slug}.tokens.json`, content: JSON.stringify(payload, null, 2), language: 'json' }]
  }

  if (sel.format === 'skill') {
    const pack = buildSkillExport(sel.colorFormat)
    return [{
      name: `${pack.name}.zip`,
      content: pack.skillMd,
      language: 'zip',
      binary: pack.zip,
    }]
  }

  if (sel.format === 'agent-bundle') {
    const pack = buildAgentProductExport(sel.colorFormat)
    return [{
      name: `${pack.name}-agent-bundle.zip`,
      content: pack.skillMd,
      language: 'zip',
      binary: pack.zip,
    }]
  }

  if (sel.format === 'w3c') {
    if (sel.structure === 'per-collection') {
      return ordered.map((key) => ({
        name: `${W3C_ROOT[key]}.tokens.json`,
        content: JSON.stringify({ [W3C_ROOT[key]]: w3cTreeFor(key, sel, full) }, null, 2),
        language: 'json' as const,
      }))
    }
    const tree: Record<string, W3CNode> = {}
    for (const key of ordered) tree[W3C_ROOT[key]] = w3cTreeFor(key, sel, full)
    return [{ name: `${slug}.tokens.json`, content: JSON.stringify(tree, null, 2), language: 'json' }]
  }

  // Markdown — delegate to the section builders so a slice reads identically
  // wherever it's taken (preview .MD tab, wizard, Copy Page).
  const sections = [...new Set(ordered.map((k) => SECTION_OF[k]))]
  const colorOpts = {
    families: ordered.includes('primitives') ? sel.primitiveFamilies : [],
    appearance: sel.primitiveAppearance,
    includeSemantics: ordered.includes('semantics'),
    modes: ordered.includes('semantics') ? sel.modes : undefined,
  }
  if (sel.structure === 'per-collection') {
    return sections
      .map((s) => ({
        name: `${s}.md`,
        content: buildSectionExport(s, 'md', sel.colorFormat, colorOpts),
        language: 'md' as const,
      }))
      .filter((f) => f.content.trim().length > 0)
  }
  const isAll = ordered.length === ALL_WIZARD_COLLECTIONS.length && !sel.primitiveFamilies && !sel.primitiveAppearance
  const content = isAll
    ? buildSectionExport('all', 'md', sel.colorFormat, colorOpts)
    : sections.map((s) => buildSectionExport(s, 'md', sel.colorFormat, colorOpts)).join('\n\n---\n\n')
  return [{ name: `${slug}.md`, content, language: 'md' }]
}

/** One primitive family, one appearance, one format — the payload behind the
 *  per-column export icon in the Primitives table. It is NOT a separate
 *  exporter: it builds a normal `WizardSelection` and runs it through
 *  `buildWizardExport`, so a quick copy of the Accent ramp is byte-identical
 *  to running the full wizard scoped the same way (and to tokens.json).
 *  Escala JSON is the documented exception — it ships the whole document by
 *  contract, scoping or not. */
export function buildFamilyExport(
  family: string,
  appearance: 'light' | 'dark',
  format: WizardFormat,
  colorFormat: ColorFormat = 'hex',
): WizardFile[] {
  return buildWizardExport({
    collections: ['primitives'],
    modes: [],
    format,
    structure: 'single',
    colorFormat,
    includeAliases: false,
    includeComponents: false,
    primitiveFamilies: [family],
    primitiveAppearance: appearance,
  })
}

// ── Alpha ramp export ────────────────────────────────────────────────────────
// The per-column export icon used to be hidden entirely on alpha families
// (Accent-Alpha, a custom family's `-Alpha` twin) — CLAUDE.md's own reasoning
// was "the icon would hand over the solid twin instead", and that was literal:
// alpha values live in `colors.primitiveAlpha`, a bucket `buildFamilyExport`'s
// pipeline (scoped to `colors.primitive` via `primitiveFamilies`) never reads,
// so routing an alpha family through it silently exported nothing or the wrong
// ramp. This is a SEPARATE, minimal builder rather than teaching the whole
// wizard pipeline about a bucket only this one popover needs to reach.
//
// Only the formats that can be built CORRECTLY from a bare `Record<number,
// string>` are offered — see `ALPHA_EXPORT_FORMATS` below. Markdown and Skill
// have no alpha concept in `sectionExport`; faking support there would repeat
// the exact bug this function exists to fix.
export const ALPHA_EXPORT_FORMATS: WizardFormat[] = ['w3c', 'escala']

export function buildAlphaFamilyExport(
  /** The alpha Family's own `tokenPrefix` (e.g. `accent-a`, `<custom>-a`) —
   *  already the exact prefix `tokenGenerator` flattens `colors.primitiveAlpha`
   *  under, so the output can't disagree with what's already in tokens.json. */
  tokenPrefix: string,
  scale: Record<number, string>,
  format: WizardFormat,
  _colorFormat: ColorFormat = 'hex',
): WizardFile[] {
  // Escala JSON is the documented exception for the solid path too — it ships
  // the whole document by contract, and `colors.primitiveAlpha` is already
  // part of it, so no family-specific assembly is needed here at all.
  if (format === 'escala') {
    const project = useDesignStore.getState().projectName || 'escala'
    const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escala'
    return [{ name: `${slug}.tokens.json`, content: JSON.stringify(generateTokenJSON(), null, 2), language: 'json' }]
  }

  const naming = useDesignStore.getState().colorNaming
  // Same flattener `tokenGenerator` uses for `colors.primitiveAlpha` itself —
  // `accent-a-1`…`accent-a-12` (or the naming scheme's own labels) — so a
  // reader can match these names straight back to the real export.
  const flat = flattenScale(tokenPrefix, scale, naming)

  if (format === 'w3c') {
    const family: Record<string, W3CNode> = {}
    for (const [name, hex] of Object.entries(flat)) {
      const [, tone] = splitFlat(name)
      family[tone] = token(hex, 'color')
    }
    const project = useDesignStore.getState().projectName || 'escala'
    const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escala'
    return [{
      name: `${slug}.tokens.json`,
      content: JSON.stringify({ color: { [tokenPrefix]: family } }, null, 2),
      language: 'json',
    }]
  }

  return []
}
