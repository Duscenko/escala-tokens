// Per-section export — turns one foundation's tokens into CSS / Tailwind / JSON /
// Markdown so designers can copy a single slice into an AI prompt or codebase.
// Whole-system exports live in tokenGenerator.ts + exporters.ts; this is scoped.

import chroma from 'chroma-js'
import { toneLabel } from './colorUtils'
import { fontStack } from './fonts'
import { getIconAiSource, iconAiContext } from './iconLibraries'
import { generateTokenJSON, themeContextFromStore } from './tokenGenerator'
import { useDesignStore } from '../store/useDesignStore'
import { mdCell } from './utils'
import {
  buildArchitectureView,
  CATEGORICAL_ROLE_COMMENTS,
  type ArchTokenValue,
} from './semanticArchitectures'

type Store = ReturnType<typeof useDesignStore.getState>

export type SectionKey =
  | 'color' | 'typography' | 'radius' | 'spacing'
  | 'shadow' | 'grid' | 'sizes' | 'icons'

// Order used when assembling the full-system ("all") export.
export const ALL_SECTIONS: SectionKey[] = ['color', 'typography', 'spacing', 'radius', 'shadow', 'grid', 'sizes', 'icons']

export type ExportFormat = 'css' | 'tailwind' | 'tokens' | 'md'
export type ColorFormat = 'hex' | 'rgba' | 'hsl' | 'oklch'

export const EXPORT_FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'tokens', label: 'JSON' },
  { key: 'css', label: 'CSS' },
  { key: 'tailwind', label: 'Tailwind' },
  { key: 'md', label: 'MD' },
]

export const COLOR_FORMATS: { key: ColorFormat; label: string }[] = [
  { key: 'hex', label: 'HEX' },
  { key: 'rgba', label: 'RGBA' },
  { key: 'hsl', label: 'HSL' },
  { key: 'oklch', label: 'OKLCH' },
]

/** Render a hex in the requested CSS color format. */
export function formatColor(hex: string, fmt: ColorFormat): string {
  let c: chroma.Color
  try { c = chroma(hex) } catch { return hex }
  switch (fmt) {
    case 'rgba': { const [r, g, b] = c.rgb(); return `rgba(${r}, ${g}, ${b}, 1)` }
    case 'hsl': { const [h, s, l] = c.hsl(); return `hsl(${Math.round(h || 0)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)` }
    case 'oklch': { const [l, ch, h] = c.oklch(); return `oklch(${l.toFixed(3)} ${ch.toFixed(3)} ${Number.isNaN(h) ? 0 : Math.round(h)})` }
    default: return c.hex()
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Code language for the rendered block (labels / future highlighting).
export function exportLanguage(format: ExportFormat): string {
  return format === 'css' ? 'css' : format === 'tailwind' ? 'js' : format === 'tokens' ? 'json' : 'markdown'
}

// ── Section token sources ───────────────────────────────────────────────────

/** Per-call export scoping. Today only the color section reads it: the export
 *  wizard lets a run ship a SUBSET of the primitive families (Primitives' own
 *  per-family quick export is that same path, pre-scoped to one family), so
 *  every renderer here has to honour the same filter or the Tailwind/Markdown
 *  slices would silently ship families the summary said were excluded. */
export interface SectionExportOptions {
  /** Family keys to keep (`accent`, `neutral`, a custom family's key…).
   *  Omitted = every family, i.e. the pre-existing behaviour. */
  families?: string[]
  /** Which appearance's ramps ship. Omitted = the light ones (what this module
   *  has always exported). 'dark' swaps in each family's dark twin under its
   *  EXPORTED name (`accent-dark-*`), matching tokenGenerator — a per-column
   *  quick export from the Primitives table ships exactly one appearance. */
  appearance?: 'light' | 'dark'
  /** Whether the semantic block ships alongside the primitives. Omitted = yes.
   *  The wizard passes `false` when the run picked Primitives but not
   *  Semantics — those are two separate collections there, and the color
   *  section used to ship both regardless of which one was checked. */
  includeSemantics?: boolean
  /** Which theme keys' semantic tokens ship, in order — the wizard's own
   *  Semantics mode picker (`sel.modes`, a subset of `store.themeOrder`).
   *  Omitted = `['light']` only. This existed nowhere until a real bug: the
   *  wizard's Summary step counts variables across every CHECKED mode (so
   *  "light, dark" ships as 222 variables), but `mdFor`'s color section read
   *  `store.themes.light` as a literal — dark (and any custom theme) was
   *  silently dropped from the Markdown file regardless of what Step 1 said
   *  was included. Threaded through so the promised count and the actual file
   *  agree, the same rule `families` already exists to keep for Primitives. */
  modes?: string[]
}

/** Ordered color families present in the system: [name, scale].
 *  Family names match tokens.json (`accent`/`neutral` — the plugin contract),
 *  so every export surface speaks the same vocabulary. */
function colorFamilies(store: Store, opts: SectionExportOptions = {}): [string, Record<number, string>][] {
  const dark = opts.appearance === 'dark'
  // Name and scale move together: the dark twin exports as `accent-dark-*`,
  // exactly what tokenGenerator emits, so a scoped slice still names the same
  // tokens as tokens.json. `families` always matches on the FAMILY (`accent`),
  // never on the suffixed name.
  const fams: [string, string, Record<number, string> | undefined][] = [
    ['accent', 'accent-dark', dark ? store.primaryDarkScale : store.primaryScale],
    ['neutral', 'neutral-dark', dark ? store.grayDarkScale : store.grayLightScale],
    ['error', 'error-dark', dark ? store.errorDarkScale : store.errorScale],
    ['warning', 'warning-dark', dark ? store.warningDarkScale : store.warningScale],
    ['success', 'success-dark', dark ? store.successDarkScale : store.successScale],
    ['info', 'info-dark', dark ? store.infoDarkScale : store.infoScale],
    ...store.customColors.map((c): [string, string, Record<number, string> | undefined] =>
      [c.key, `${c.key}-dark`, dark ? c.darkScale : c.scale]),
  ]
  return fams
    .filter(([family, , scale]) => scale && Object.keys(scale).length && (!opts.families || opts.families.includes(family)))
    .map(([family, darkName, scale]) => [dark ? darkName : family, scale!])
}

const sortedEntries = (o: Record<string, string>) =>
  Object.entries(o).sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b))

// Simple key→value sections share one code path.
const SIMPLE: Partial<Record<SectionKey, { prefix: string; tailwind: string; get: (s: Store) => Record<string, string> }>> = {
  spacing: { prefix: 'spacing', tailwind: 'spacing', get: (s) => s.spacing },
  radius: { prefix: 'radius', tailwind: 'borderRadius', get: (s) => s.radius },
  shadow: { prefix: 'shadow', tailwind: 'boxShadow', get: (s) => s.shadows },
  grid: { prefix: 'grid', tailwind: 'grid', get: (s) => s.grid },
  sizes: { prefix: 'size', tailwind: 'height', get: (s) => s.sizes },
}

// ── CSS ──────────────────────────────────────────────────────────────────────

// Inner :root declarations (un-indented) for a section — composable for "all".
function cssLines(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string[] {
  if (section === 'color') {
    const lines: string[] = []
    colorFamilies(store, opts).forEach(([name, scale]) => {
      lines.push(`/* ${cap(name)} */`)
      sortedEntries(scale).forEach(([k, v]) => lines.push(`--color-${name}-${toneLabel(store.colorNaming, Number(k))}: ${formatColor(v, cf)};`))
    })
    if (opts.includeSemantics !== false) {
      lines.push('/* Semantic — light */')
      Object.entries(store.themes.light ?? {}).forEach(([k, v]) => { if (v) lines.push(`--color-${k}: ${formatColor(v, cf)};`) })
    }
    return lines
  }
  if (section === 'typography') {
    const t = store.typography
    const lines = [
      `--font-family-heading: ${fontStack(t.headingFontFamily ?? t.fontFamily)};`,
      `--font-family-body: ${fontStack(t.fontFamily)};`,
    ]
    Object.entries(t.sizes).forEach(([k, v]) => lines.push(`--font-size-${k}: ${v};`))
    Object.entries(t.lineHeights ?? {}).forEach(([k, v]) => lines.push(`--line-height-${k}: ${v};`))
    Object.entries(t.weights).forEach(([k, v]) => lines.push(`--font-weight-${k}: ${v};`))
    return lines
  }
  if (section === 'icons') {
    const ai = getIconAiSource(store.iconAiSource)
    const lines = [
      `/* Icons — ${ai.label} · ${ai.repo} */`,
      `/* Install: npm i ${ai.npm} */`,
    ]
    if (store.customIcons.length) lines.push(`/* Custom icons: ${store.customIcons.map((i) => i.name).join(', ')} */`)
    return lines
  }
  const simple = SIMPLE[section]!
  return Object.entries(simple.get(store)).map(([k, v]) => `--${simple.prefix}-${k}: ${v};`)
}

function wrapRoot(lines: string[]): string {
  return `:root {\n${lines.map((l) => (l ? `  ${l}` : '')).join('\n')}\n}`
}

function cssFor(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  return wrapRoot(cssLines(section, store, cf, opts))
}

// ── Tailwind (theme.extend snippet) ──────────────────────────────────────────

// Wrap a theme.extend object as a copy-pasteable tailwind.config.js snippet.
function twConfig(extend: Record<string, unknown>): string {
  const body = JSON.stringify(extend, null, 2).replace(/\n/g, '\n    ')
  return `/** @type {import('tailwindcss').Config} */\nexport default {\n  theme: {\n    extend: ${body},\n  },\n}`
}

// The theme.extend slice for a section — composable for "all".
function twExtend(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): Record<string, unknown> {
  if (section === 'color') {
    const colors: Record<string, unknown> = {}
    colorFamilies(store, opts).forEach(([name, scale]) => {
      const obj: Record<string, string> = {}
      sortedEntries(scale).forEach(([k, v]) => { obj[toneLabel(store.colorNaming, Number(k))] = formatColor(v, cf) })
      colors[name] = obj
    })
    if (opts.includeSemantics !== false) {
      Object.entries(store.themes.light ?? {}).forEach(([k, v]) => { if (v) colors[k] = formatColor(v, cf) })
    }
    return { colors }
  }
  if (section === 'typography') {
    const t = store.typography
    return {
      fontFamily: { heading: [t.headingFontFamily ?? t.fontFamily], body: [t.fontFamily] },
      fontSize: t.sizes,
      lineHeight: t.lineHeights ?? {},
      fontWeight: t.weights,
    }
  }
  if (section === 'icons') return {}
  const simple = SIMPLE[section]!
  return { [simple.tailwind]: simple.get(store) }
}

function tailwindFor(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  if (section === 'icons') {
    const ai = getIconAiSource(store.iconAiSource)
    return `// Icons aren't a Tailwind theme key — install the set named in the Skill/README.\n// ${ai.label}  ·  ${ai.repo}\n// npm i ${ai.npm}`
  }
  return twConfig(twExtend(section, store, cf, opts))
}

// ── Tokens (exact tokens.json slices) ────────────────────────────────────────
// The Tokens format is NOT a re-render: it slices the real `generateTokenJSON()`
// payload (the contract the Figma plugin imports), so keys and values are always
// byte-identical to the full tokens.json. Canonical hex — the color-format
// toggle doesn't apply here (the modal hides it).

function tokensFor(section: SectionKey): unknown {
  const full = generateTokenJSON()
  switch (section) {
    case 'color': return { colors: full.colors }
    case 'typography': return { typography: full.typography }
    case 'spacing': return { spacing: full.spacing }
    case 'radius': return { radius: full.radius }
    case 'shadow': return { shadows: full.shadows }
    case 'grid': return { grid: full.grid }
    case 'sizes': return { sizes: full.sizes }
    case 'icons': return { icons: full.icons }
  }
}

// ── Markdown ──────────────────────────────────────────────────────────────────

// Cells are escaped here, once, rather than at every call site — a value that
// looks safe today (a hex, a token name) is one custom-font-name or
// custom-color-label field away from carrying a literal `|` that would
// silently misalign the row it lands in.
function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.map(mdCell).join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`),
  ].join('\n')
}

function categoricalRoleLabel(comment: string): string {
  return comment.match(/^\[ROLE: ([^\]]+)\]/)?.[1] ?? ''
}

function modeValue(
  modes: Record<string, ArchTokenValue>,
  mode: string,
  cf: ColorFormat,
): [string, string] {
  const v = modes[mode]
  if (!v) return ['—', '—']
  return [`\`${v.label}\``, `\`${formatColor(v.css, cf)}\``]
}

/** Categorical semantic tables — same projection the Color preview and Semantics
 *  table render, grouped Content · Action · Surface · Status · Border. */
function categoricalSemanticsMd(store: Store, cf: ColorFormat, modes: string[]): string {
  const { themeNames, globalScales, resolvedPalettes } = themeContextFromStore(store)
  const modeKeys = (modes.length ? modes : themeNames).filter((m) => store.themes[m])
  if (!modeKeys.length) return ''

  const view = buildArchitectureView(
    'categorical',
    {
      themes: store.themes,
      themeKinds: store.themeKinds ?? {},
      themePalettes: resolvedPalettes,
      scales: globalScales,
      accent: store.primaryColor,
    },
    store.errorColor,
    store.architectureOverrides?.categorical ?? {},
    modeKeys,
  )
  if (!view) return ''

  const parts = [
    '\n### Semantic (Categorical)\n',
    '_Nested role contract — matches the Color preview and Semantics table. Designs reference these roles; roles alias the primitive ramps per theme._\n',
  ]

  const lightDark = modeKeys.length === 2 && modeKeys.includes('light') && modeKeys.includes('dark')

  for (const cat of view.categories) {
    parts.push(`\n#### ${cat.label}\n`)
    if (cat.description) parts.push(`_${cat.description}_\n`)

    if (lightDark) {
      parts.push(table(
        ['Token', 'Role', 'Primitive · light', 'Hex · light', 'Primitive · dark', 'Hex · dark'],
        cat.tokens.map((tk) => {
          const id = `${cat.key}.${tk.key}`
          const [lRef, lHex] = modeValue(tk.modes, 'light', cf)
          const [dRef, dHex] = modeValue(tk.modes, 'dark', cf)
          return [
            `\`${id}\``,
            categoricalRoleLabel(CATEGORICAL_ROLE_COMMENTS[id] ?? ''),
            lRef,
            lHex,
            dRef,
            dHex,
          ]
        }),
      ))
      continue
    }

    for (const mode of modeKeys) {
      parts.push(`\n**${cap(mode)}**\n`)
      parts.push(table(
        ['Token', 'Role', 'Primitive', 'Hex'],
        cat.tokens.map((tk) => {
          const id = `${cat.key}.${tk.key}`
          const [ref, hex] = modeValue(tk.modes, mode, cf)
          return [
            `\`${id}\``,
            categoricalRoleLabel(CATEGORICAL_ROLE_COMMENTS[id] ?? ''),
            ref,
            hex,
          ]
        }),
      ))
    }
  }

  return parts.join('\n')
}

function mdFor(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  if (section === 'color') {
    const parts = ['## Color']
    colorFamilies(store, opts).forEach(([name, scale]) => {
      parts.push(`\n### ${cap(name)}\n`)
      parts.push(table(['Token', 'Value'], sortedEntries(scale).map(([k, v]) => [`\`${name}-${toneLabel(store.colorNaming, Number(k))}\``, `\`${formatColor(v, cf)}\``])))
    })
    if (opts.includeSemantics !== false) {
      const modes = opts.modes?.length ? opts.modes : ['light']
      if (store.semanticArchitecture === 'categorical') {
        parts.push(categoricalSemanticsMd(store, cf, modes))
      } else {
        // Flat catalogue — one table per selected mode.
        modes.forEach((mode) => {
          const entries = Object.entries(store.themes[mode] ?? {}).filter(([, v]) => v)
          if (!entries.length) return
          parts.push(`\n### Semantic (${cap(mode)})\n`)
          parts.push(table(['Token', 'Value'], entries.map(([k, v]) => [`\`${k}\``, `\`${formatColor(v, cf)}\``])))
        })
      }
    }
    return parts.join('\n')
  }
  if (section === 'typography') {
    const t = store.typography
    return [
      '## Typography\n',
      `- **Heading font:** ${t.headingFontFamily ?? t.fontFamily}`,
      `- **Body font:** ${t.fontFamily}\n`,
      '### Sizes\n',
      table(['Token', 'Size', 'Line height'], Object.keys(t.sizes).map((k) => [`\`${k}\``, `\`${t.sizes[k]}\``, `\`${t.lineHeights?.[k] ?? '—'}\``])),
      '\n### Weights\n',
      table(['Token', 'Weight'], Object.entries(t.weights).map(([k, v]) => [`\`${k}\``, `\`${v}\``])),
    ].join('\n')
  }
  if (section === 'icons') {
    const ctx = iconAiContext(store.iconAiSource)
    const extra = store.customIcons.length
      ? `\n- **Custom:** ${store.customIcons.map((i) => i.name).join(', ')}`
      : ''
    return `${ctx.markdown}${extra}`
  }
  const simple = SIMPLE[section]!
  return `## ${cap(section)}\n\n${table(['Token', 'Value'], Object.entries(simple.get(store)).map(([k, v]) => [`\`--${simple.prefix}-${k}\``, `\`${v}\``]))}`
}

// ── Public entry ──────────────────────────────────────────────────────────────

// Whole-system export — every section assembled into one document. Powers the
// "Get MD" full AI-context window.
function buildFullExport(store: Store, format: ExportFormat, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  switch (format) {
    case 'css': {
      const lines: string[] = []
      ALL_SECTIONS.forEach((s, i) => {
        const body = cssLines(s, store, cf)
        if (!body.length) return
        if (i) lines.push('')
        lines.push(`/* ═══ ${cap(s)} ═══ */`, ...body)
      })
      return wrapRoot(lines)
    }
    case 'tailwind':
      return twConfig(Object.assign({}, ...ALL_SECTIONS.map((s) => twExtend(s, store, cf))))
    case 'tokens':
      // The full Tokens export IS tokens.json — the exact payload the Figma
      // plugin imports (schemaVersion, themes, atoms and all).
      return JSON.stringify(generateTokenJSON(), null, 2)
    case 'md': {
      const desc = store.projectDescription?.trim()
      const header = `# ${store.projectName} — design tokens\n${desc ? `\n${desc}\n` : ''}\n_Personalized design-system context. Use these tokens verbatim; don't invent new values._`
      // `opts` carries `modes` through to the color section, same as the
      // per-collection path — without it the whole-system "Get MD" export hit
      // the identical dropped-dark-theme bug `modes` exists to fix, just via a
      // different call path (this whole-system builder used to take no opts
      // at all).
      return `${header}\n\n${ALL_SECTIONS.map((s) => mdFor(s, store, cf, opts)).join('\n\n---\n\n')}`
    }
  }
}

export function buildSectionExport(
  section: SectionKey | 'all',
  format: ExportFormat,
  colorFormat: ColorFormat = 'hex',
  opts: SectionExportOptions = {},
): string {
  const store = useDesignStore.getState()
  if (section === 'all') return buildFullExport(store, format, colorFormat, opts)
  switch (format) {
    case 'css': return cssFor(section, store, colorFormat, opts)
    case 'tailwind': return tailwindFor(section, store, colorFormat, opts)
    case 'tokens': return JSON.stringify(tokensFor(section), null, 2)
    case 'md': return mdFor(section, store, colorFormat, opts)
  }
}
