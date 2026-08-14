// ── Export wizard (Source → Format → Export) ────────────────────────────────
// The guided whole-system export behind Variables' "Export" pill: pick WHAT
// ships (collections + semantic modes), HOW (W3C DTCG · Escala JSON · CSS ·
// SCSS, single or per-collection files), then download/copy the result.
//
// Everything derives from ONE call to `generateTokenJSON()` — the same payload
// the Figma plugin imports — so wizard output can never disagree with
// tokens.json: primitives arrive pre-flattened (`accent-500`, `neutral-dark-300`),
// themes pre-normalized onto their source ramps.

import { generateTokenJSON, flattenScale } from './tokenGenerator'
import { buildSectionExport, formatColor, type ColorFormat, type SectionKey } from './sectionExport'
import { useDesignStore } from '../store/useDesignStore'

export type WizardCollection =
  | 'primitives' | 'semantics' | 'typography' | 'spacing'
  | 'radius' | 'shadow' | 'grid' | 'sizes' | 'icons'

/** Every collection, in export order — also the "share the whole system" preset. */
export const ALL_WIZARD_COLLECTIONS: WizardCollection[] = [
  'primitives', 'semantics', 'typography', 'spacing',
  'radius', 'shadow', 'grid', 'sizes', 'icons',
]

export type WizardFormat = 'w3c' | 'escala' | 'css' | 'scss' | 'tailwind' | 'md'
export type WizardStructure = 'single' | 'per-collection'

/** The `sectionExport` slice each collection maps onto — Tailwind and Markdown
 *  reuse those builders rather than growing a second renderer per format.
 *  Primitives and semantics are one 'color' section there, hence the dedupe. */
const SECTION_OF: Record<WizardCollection, SectionKey> = {
  primitives: 'color', semantics: 'color', typography: 'typography',
  spacing: 'spacing', radius: 'radius',
  shadow: 'shadow', grid: 'grid', sizes: 'sizes', icons: 'icons',
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
  language: 'json' | 'css' | 'scss' | 'js' | 'md'
}

type TokenJSON = ReturnType<typeof generateTokenJSON>

export const WIZARD_FORMATS: { key: WizardFormat; label: string; hint: string }[] = [
  { key: 'w3c', label: 'W3C Design Tokens', hint: 'Standard format with $value, $type' },
  { key: 'escala', label: 'Escala JSON', hint: 'The exact tokens.json the Figma plugin imports' },
  // Markdown sits right after Escala JSON, not at the bottom of the list —
  // it's the other format most people reach for here (design context to hand
  // an AI assistant), so it shouldn't read as an afterthought below three
  // CSS-flavoured formats it has nothing to do with.
  { key: 'md', label: 'Markdown', hint: 'Readable tables — design context for AI' },
  { key: 'css', label: 'CSS Custom Properties', hint: '--token-name: value' },
  { key: 'scss', label: 'SCSS Variables', hint: '$token-name: value' },
  { key: 'tailwind', label: 'Tailwind config', hint: 'theme.extend snippet' },
]

// Badge shown next to a format's label in the full wizard's Format step
// (ExportWizard). Only the formats where "why would I pick this one" isn't
// obvious from the hint alone get one:
// - Escala JSON is the one the app itself is built around, so it's marked
//   RECOMMENDED — but naming the plugin "Figma plugin" here reads as "the
//   Figma plugin" (as in, Figma's own), when it's actually Escala's plugin
//   FOR Figma. Same badge text problem `ColumnExportMenu`'s "Figma plugin"
//   avoids because a badge in a table cell has no room to be misread as an
//   entity name — this one, sitting right next to "Recommended", does.
// - W3C is the interoperable choice — it needs to say so, or "Recommended"
//   sitting on the row above it silently outranks the one format that isn't
//   locked to this app at all.
// - Markdown's audience isn't a tool that IMPORTS it, it's an AI assistant
//   reading it as context — naming the assistants makes that concrete instead
//   of leaving "design context for AI" to mean nothing more specific.
export const WIZARD_FORMAT_BADGE: Partial<Record<WizardFormat, string>> = {
  escala: 'Recommended · Escala Plugin',
  w3c: 'Compatible with other plugins & Figma',
  md: 'Claude · Codex',
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
  const typographyCount =
    2 + Object.keys(t.sizes).length + Object.keys(t.lineHeights ?? {}).length + Object.keys(t.weights).length
  const themeNames = full.colors.themeOrder
  const roleCount = Object.keys(full.colors.themes[themeNames[0]] ?? {}).length
  return [
    { key: 'primitives', label: 'Color · Primitives', count: Object.keys(full.colors.primitive).length },
    { key: 'semantics', label: 'Color · Semantics', count: roleCount * themeNames.length, modes: themeNames },
    { key: 'typography', label: 'Typography', count: typographyCount },
    { key: 'spacing', label: 'Spacing', count: Object.keys(full.spacing).length },
    { key: 'radius', label: 'Radius', count: Object.keys(full.radius).length },
    { key: 'shadow', label: 'Shadow', count: Object.keys(full.shadows).length },
    { key: 'grid', label: 'Grid', count: Object.keys(full.grid).length },
    { key: 'sizes', label: 'Sizes', count: Object.keys(full.sizes).length },
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

function w3cSection(key: WizardCollection, full: TokenJSON): W3CNode {
  const dim = (o: Record<string, string>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, token(v, isPx(v) ? 'dimension' : 'number')])) as W3CNode
  switch (key) {
    case 'typography': {
      const t = full.typography
      return {
        fontFamily: {
          heading: token(t.headingFontFamily ?? t.fontFamily, 'fontFamily'),
          body: token(t.fontFamily, 'fontFamily'),
        },
        size: dim(t.sizes),
        lineHeight: dim(t.lineHeights ?? {}),
        weight: Object.fromEntries(Object.entries(t.weights).map(([k, v]) => [k, token(v, 'fontWeight')])) as W3CNode,
      }
    }
    case 'spacing': return dim(full.spacing)
    case 'radius': return dim(full.radius)
    case 'sizes': return dim(full.sizes)
    case 'grid': return dim(full.grid)
    case 'shadow':
      return Object.fromEntries(Object.entries(full.shadows).map(([k, v]) => [k, token(v, 'shadow')])) as W3CNode
    case 'icons': {
      const node: Record<string, W3CNode> = {
        library: token(full.icons.name, 'string'),
      }
      if (full.icons.package) node.package = token(full.icons.package, 'string')
      return node as W3CNode
    }
    default: return {}
  }
}

// Root keys per collection in the W3C tree (also the per-collection filenames).
const W3C_ROOT: Record<WizardCollection, string> = {
  primitives: 'color', semantics: 'semantic', typography: 'typography',
  spacing: 'spacing', radius: 'radius',
  shadow: 'shadow', grid: 'grid', sizes: 'size', icons: 'icon',
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

// ── CSS / SCSS ───────────────────────────────────────────────────────────────

// Flat `name: value` lines per collection; CSS and SCSS differ only in sigil.
function varLines(key: WizardCollection, sel: WizardSelection, full: TokenJSON): [string, string][] {
  const cf = sel.colorFormat
  switch (key) {
    case 'primitives':
      return Object.entries(pickedPrimitives(full, sel.primitiveFamilies, sel.primitiveAppearance)).map(([n, v]) => [`color-${n}`, formatColor(v, cf)])
    case 'typography': {
      const t = full.typography
      return [
        ['font-family-heading', `'${t.headingFontFamily ?? t.fontFamily}'`],
        ['font-family-body', `'${t.fontFamily}'`],
        ...Object.entries(t.sizes).map(([k, v]) => [`font-size-${k}`, v] as [string, string]),
        ...Object.entries(t.lineHeights ?? {}).map(([k, v]) => [`line-height-${k}`, v] as [string, string]),
        ...Object.entries(t.weights).map(([k, v]) => [`font-weight-${k}`, String(v)] as [string, string]),
      ]
    }
    case 'spacing': return Object.entries(full.spacing).map(([k, v]) => [`spacing-${k}`, v])
    case 'radius': return Object.entries(full.radius).map(([k, v]) => [`radius-${k}`, v])
    case 'shadow': return Object.entries(full.shadows).map(([k, v]) => [`shadow-${k}`, v])
    case 'grid': return Object.entries(full.grid).map(([k, v]) => [`grid-${k}`, v])
    case 'sizes': return Object.entries(full.sizes).map(([k, v]) => [`size-${k}`, v])
    case 'icons': return []
    case 'semantics': return [] // handled per-mode below
  }
}

// Semantic modes map onto CSS scopes: light = :root, dark = .dark, custom
// themes = [data-theme="<key>"] — matching how the app itself applies themes.
const modeScope = (mode: string) => (mode === 'light' ? ':root' : mode === 'dark' ? '.dark' : `[data-theme="${mode}"]`)

function cssFor(sel: WizardSelection, collections: WizardCollection[], full: TokenJSON): string {
  const blocks: string[] = []
  const rootLines: string[] = []
  for (const key of collections) {
    if (key === 'semantics') continue
    const lines = varLines(key, sel, full)
    if (!lines.length) continue
    rootLines.push(`/* ${key} */`, ...lines.map(([n, v]) => `--${n}: ${v};`))
  }
  if (collections.includes('semantics')) {
    for (const mode of sel.modes) {
      const theme = full.colors.themes[mode]
      if (!theme) continue
      const lines = Object.entries(theme)
        .filter(([, v]) => v)
        .map(([k, v]) => `--color-${k}: ${formatColor(v, sel.colorFormat)};`)
      if (mode === 'light') rootLines.push('/* semantics — light */', ...lines)
      else blocks.push(`${modeScope(mode)} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}`)
    }
  }
  const root = rootLines.length ? `:root {\n${rootLines.map((l) => `  ${l}`).join('\n')}\n}` : ''
  return [root, ...blocks].filter(Boolean).join('\n\n')
}

function scssFor(sel: WizardSelection, collections: WizardCollection[], full: TokenJSON): string {
  const lines: string[] = []
  for (const key of collections) {
    if (key === 'semantics') continue
    const vars = varLines(key, sel, full)
    if (!vars.length) continue
    lines.push(`// ${key}`, ...vars.map(([n, v]) => `$${n}: ${v};`), '')
  }
  if (collections.includes('semantics')) {
    for (const mode of sel.modes) {
      const theme = full.colors.themes[mode]
      if (!theme) continue
      const prefix = mode === 'light' ? '' : `${mode}-`
      lines.push(
        `// semantics — ${mode}`,
        ...Object.entries(theme)
          .filter(([, v]) => v)
          .map(([k, v]) => `$${prefix}color-${k}: ${formatColor(v, sel.colorFormat)};`),
        '',
      )
    }
  }
  return lines.join('\n').trimEnd()
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

  if (sel.format === 'tailwind' || sel.format === 'md') {
    // Delegate to the section builders — same renderers the per-section export
    // window used, so a Tailwind/MD slice reads identically wherever it's taken.
    const ext = sel.format === 'tailwind' ? 'js' : 'md'
    const sections = [...new Set(ordered.map((k) => SECTION_OF[k]))]
    // Primitives and semantics collapse onto ONE 'color' section here, so the
    // section builders need to be told which half (and which families) this
    // run actually picked — otherwise a primitives-only, Accent-only export
    // would still render every family plus the whole semantic layer.
    // `modes` matters for the identical reason: the Summary step counts
    // variables across every MODE the run checked (light+dark ships as one
    // number), and `mdFor`'s color section used to read the store's light
    // theme as a literal, silently dropping dark (and any custom theme) from
    // the file regardless of what Step 1 said was included — the promised
    // count and the actual file disagreed for Markdown specifically. Omitted
    // when semantics isn't selected; `mdFor` never reads it in that case.
    const colorOpts = {
      families: ordered.includes('primitives') ? sel.primitiveFamilies : [],
      appearance: sel.primitiveAppearance,
      includeSemantics: ordered.includes('semantics'),
      modes: ordered.includes('semantics') ? sel.modes : undefined,
    }
    if (sel.structure === 'per-collection') {
      return sections
        .map((s) => ({
          name: `${s}.${ext}`,
          content: buildSectionExport(s, sel.format as 'tailwind' | 'md', sel.colorFormat, colorOpts),
          language: ext as 'js' | 'md',
        }))
        .filter((f) => f.content.trim().length > 0)
    }
    // Whole-system when every collection is checked, otherwise stitch the
    // picked ones. Checking `ordered.length` against every WizardCollection
    // (not just distinct SECTIONS) matters: Primitives and Semantics both
    // map to 'color', so checking only 9 of the 10 collections — Primitives
    // but not Semantics, say — still covered all 9 distinct sections and
    // used to take this branch too, which ignores `includeSemantics`
    // entirely and would have leaked a semantic table into a run that never
    // asked for one. A family filter still forces the partial path even with
    // all ten checked, for the same reason — an unscoped color section is
    // part of what "every section, unscoped" means.
    const isAll = ordered.length === ALL_WIZARD_COLLECTIONS.length && !sel.primitiveFamilies && !sel.primitiveAppearance
    const content = isAll
      ? buildSectionExport('all', sel.format, sel.colorFormat, colorOpts)
      : sections.map((s) => buildSectionExport(s, sel.format as 'tailwind' | 'md', sel.colorFormat, colorOpts)).join(
          sel.format === 'md' ? '\n\n---\n\n' : '\n\n',
        )
    return [{ name: `${slug}.${ext}`, content, language: ext as 'js' | 'md' }]
  }

  const build = sel.format === 'css' ? cssFor : scssFor
  const ext = sel.format
  if (sel.structure === 'per-collection') {
    return ordered
      .map((key) => ({ name: `${key}.${ext}`, content: build(sel, [key], full), language: ext }))
      .filter((f) => f.content.trim().length > 0)
  }
  return [{ name: `${slug}.${ext}`, content: build(sel, ordered, full), language: ext }]
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
// string>` are offered — see `ALPHA_EXPORT_FORMATS` below. Tailwind and
// Markdown delegate to `sectionExport`'s builders, which have zero concept of
// alpha primitives; faking support there would repeat the exact bug this
// function exists to fix, just in two formats instead of six.
export const ALPHA_EXPORT_FORMATS: WizardFormat[] = ['w3c', 'escala', 'css', 'scss']

export function buildAlphaFamilyExport(
  /** The alpha Family's own `tokenPrefix` (e.g. `accent-a`, `<custom>-a`) —
   *  already the exact prefix `tokenGenerator` flattens `colors.primitiveAlpha`
   *  under, so the output can't disagree with what's already in tokens.json. */
  tokenPrefix: string,
  scale: Record<number, string>,
  format: WizardFormat,
  colorFormat: ColorFormat = 'hex',
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

  // css / scss — same `--color-<name>` / `$color-<name>` naming
  // `varLines`/`exporters.ts` already use for every other primitive, so an
  // alpha ramp's variables read as siblings of the solid ones, not a
  // different convention.
  const lines = Object.entries(flat).map(([n, v]) => [`color-${n}`, formatColor(v, colorFormat)] as const)
  if (format === 'css') {
    const body = lines.map(([n, v]) => `  --${n}: ${v};`).join('\n')
    return [{ name: 'escala.css', content: `:root {\n${body}\n}`, language: 'css' }]
  }
  const body = lines.map(([n, v]) => `$${n}: ${v};`).join('\n')
  return [{ name: 'escala.scss', content: body, language: 'scss' }]
}
