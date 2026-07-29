// ── Export wizard (Source → Format → Export) ────────────────────────────────
// The guided whole-system export behind Variables' "Export" pill: pick WHAT
// ships (collections + semantic modes), HOW (W3C DTCG · Escala JSON · CSS ·
// SCSS, single or per-collection files), then download/copy the result.
//
// Everything derives from ONE call to `generateTokenJSON()` — the same payload
// the Figma plugin imports — so wizard output can never disagree with
// tokens.json: primitives arrive pre-flattened (`accent-500`, `neutral-dark-300`),
// themes pre-normalized onto their source ramps.

import { generateTokenJSON } from './tokenGenerator'
import { buildSectionExport, formatColor, type ColorFormat, type SectionKey } from './sectionExport'
import { useDesignStore } from '../store/useDesignStore'

export type WizardCollection =
  | 'primitives' | 'semantics' | 'typography' | 'spacing'
  | 'radius' | 'opacity' | 'shadow' | 'grid' | 'sizes' | 'icons'

/** Every collection, in export order — also the "share the whole system" preset. */
export const ALL_WIZARD_COLLECTIONS: WizardCollection[] = [
  'primitives', 'semantics', 'typography', 'spacing',
  'radius', 'opacity', 'shadow', 'grid', 'sizes', 'icons',
]

export type WizardFormat = 'w3c' | 'escala' | 'css' | 'scss' | 'tailwind' | 'md'
export type WizardStructure = 'single' | 'per-collection'

/** The `sectionExport` slice each collection maps onto — Tailwind and Markdown
 *  reuse those builders rather than growing a second renderer per format.
 *  Primitives and semantics are one 'color' section there, hence the dedupe. */
const SECTION_OF: Record<WizardCollection, SectionKey> = {
  primitives: 'color', semantics: 'color', typography: 'typography',
  spacing: 'spacing', radius: 'radius', opacity: 'opacity',
  shadow: 'shadow', grid: 'grid', sizes: 'sizes', icons: 'icons',
}

/** Distinct sections behind the collections — when all of them are picked the
 *  Tailwind/MD export uses the whole-system builder (which adds the intro). */
const ALL_SECTION_COUNT = new Set(Object.values(SECTION_OF)).size

export interface WizardSelection {
  collections: WizardCollection[]
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
  { key: 'css', label: 'CSS Custom Properties', hint: '--token-name: value' },
  { key: 'scss', label: 'SCSS Variables', hint: '$token-name: value' },
  { key: 'tailwind', label: 'Tailwind config', hint: 'theme.extend snippet' },
  { key: 'md', label: 'Markdown', hint: 'Readable tables — design context for AI' },
]

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
    { key: 'opacity', label: 'Opacity', count: Object.keys(full.opacity).length },
    { key: 'shadow', label: 'Shadow', count: Object.keys(full.shadows).length },
    { key: 'grid', label: 'Grid', count: Object.keys(full.grid).length },
    { key: 'sizes', label: 'Sizes', count: Object.keys(full.sizes).length },
    { key: 'icons', label: 'Icons', count: 1 + (full.icons.custom?.length ?? 0) },
  ]
}

/** Variables the current selection ships — the summary's headline number. */
export function selectionCount(sel: Pick<WizardSelection, 'collections' | 'modes'>, full: TokenJSON = generateTokenJSON()): number {
  const meta = collectionMeta(full)
  return sel.collections.reduce((sum, key) => {
    const m = meta.find((x) => x.key === key)
    if (!m) return sum
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

function w3cPrimitives(full: TokenJSON): W3CNode {
  const out: Record<string, Record<string, W3CNode>> = {}
  for (const [name, hex] of Object.entries(full.colors.primitive)) {
    const [family, tone] = splitFlat(name)
    ;(out[family] ??= {})[tone] = token(hex, 'color')
  }
  return out as W3CNode
}

/** hex → `{color.<family>.<tone>}` over the exported primitives (first hit wins). */
function aliasMap(full: TokenJSON): Map<string, string> {
  const map = new Map<string, string>()
  for (const [name, hex] of Object.entries(full.colors.primitive)) {
    const [family, tone] = splitFlat(name)
    const key = hex.toLowerCase()
    if (!map.has(key)) map.set(key, `{color.${family}.${tone}}`)
  }
  return map
}

function w3cSemantics(full: TokenJSON, modes: string[], aliases: boolean): W3CNode {
  const refs = aliases ? aliasMap(full) : null
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
    case 'opacity':
      return Object.fromEntries(
        Object.entries(full.opacity).map(([k, v]) => [k, token(parseFloat(v) / 100, 'number')]),
      ) as W3CNode
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
  spacing: 'spacing', radius: 'radius', opacity: 'opacity',
  shadow: 'shadow', grid: 'grid', sizes: 'size', icons: 'icon',
}

function w3cTreeFor(key: WizardCollection, sel: WizardSelection, full: TokenJSON): W3CNode {
  if (key === 'primitives') return w3cPrimitives(full)
  if (key === 'semantics') return w3cSemantics(full, sel.modes, sel.includeAliases)
  return w3cSection(key, full)
}

// ── CSS / SCSS ───────────────────────────────────────────────────────────────

// Flat `name: value` lines per collection; CSS and SCSS differ only in sigil.
function varLines(key: WizardCollection, sel: WizardSelection, full: TokenJSON): [string, string][] {
  const cf = sel.colorFormat
  switch (key) {
    case 'primitives':
      return Object.entries(full.colors.primitive).map(([n, v]) => [`color-${n}`, formatColor(v, cf)])
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
    case 'opacity': return Object.entries(full.opacity).map(([k, v]) => [`opacity-${k}`, v])
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
    if (sel.structure === 'per-collection') {
      return sections
        .map((s) => ({
          name: `${s}.${ext}`,
          content: buildSectionExport(s, sel.format as 'tailwind' | 'md', sel.colorFormat),
          language: ext as 'js' | 'md',
        }))
        .filter((f) => f.content.trim().length > 0)
    }
    // Whole-system when every section is in play, otherwise stitch the picked ones.
    const isAll = sections.length === ALL_SECTION_COUNT
    const content = isAll
      ? buildSectionExport('all', sel.format, sel.colorFormat)
      : sections.map((s) => buildSectionExport(s, sel.format as 'tailwind' | 'md', sel.colorFormat)).join(
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
