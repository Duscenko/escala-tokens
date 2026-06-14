// Per-section export — turns one foundation's tokens into CSS / Tailwind / JSON /
// Markdown so designers can copy a single slice into an AI prompt or codebase.
// Whole-system exports live in tokenGenerator.ts + exporters.ts; this is scoped.

import chroma from 'chroma-js'
import { toneLabel } from './colorUtils'
import { fontStack } from './fonts'
import { getIconLibrary } from './iconLibraries'
import { useDesignStore } from '../store/useDesignStore'

type Store = ReturnType<typeof useDesignStore.getState>

export type SectionKey =
  | 'color' | 'typography' | 'radius' | 'spacing'
  | 'opacity' | 'shadow' | 'grid' | 'sizes' | 'icons'

// Order used when assembling the full-system ("all") export.
export const ALL_SECTIONS: SectionKey[] = ['color', 'typography', 'spacing', 'radius', 'opacity', 'shadow', 'grid', 'sizes', 'icons']

export type ExportFormat = 'css' | 'tailwind' | 'tokens' | 'md'
export type ColorFormat = 'hex' | 'rgba' | 'hsl' | 'oklch'

export const EXPORT_FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'css', label: 'CSS' },
  { key: 'tailwind', label: 'Tailwind' },
  { key: 'tokens', label: 'Tokens' },
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

/** Ordered color families present in the system: [name, scale]. */
function colorFamilies(store: Store): [string, Record<number, string>][] {
  const fams: [string, Record<number, string>][] = [
    ['brand', store.primaryScale],
    ['gray', store.grayLightScale],
  ]
  if (Object.keys(store.errorScale).length) fams.push(['error', store.errorScale])
  if (Object.keys(store.warningScale).length) fams.push(['warning', store.warningScale])
  if (Object.keys(store.successScale).length) fams.push(['success', store.successScale])
  if (Object.keys(store.infoScale).length) fams.push(['info', store.infoScale])
  store.customColors.forEach((c) => fams.push([c.key, c.scale]))
  return fams
}

const sortedEntries = (o: Record<string, string>) =>
  Object.entries(o).sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b))

// Simple key→value sections share one code path.
const SIMPLE: Partial<Record<SectionKey, { prefix: string; tokenKey: string; tailwind: string; get: (s: Store) => Record<string, string> }>> = {
  spacing: { prefix: 'spacing', tokenKey: 'spacing', tailwind: 'spacing', get: (s) => s.spacing },
  radius: { prefix: 'radius', tokenKey: 'radius', tailwind: 'borderRadius', get: (s) => s.radius },
  opacity: { prefix: 'opacity', tokenKey: 'opacity', tailwind: 'opacity', get: (s) => s.opacity },
  shadow: { prefix: 'shadow', tokenKey: 'shadows', tailwind: 'boxShadow', get: (s) => s.shadows },
  grid: { prefix: 'grid', tokenKey: 'grid', tailwind: 'grid', get: (s) => s.grid },
  sizes: { prefix: 'size', tokenKey: 'sizes', tailwind: 'height', get: (s) => s.sizes },
}

// ── CSS ──────────────────────────────────────────────────────────────────────

// Inner :root declarations (un-indented) for a section — composable for "all".
function cssLines(section: SectionKey, store: Store, cf: ColorFormat): string[] {
  if (section === 'color') {
    const lines: string[] = []
    colorFamilies(store).forEach(([name, scale]) => {
      lines.push(`/* ${cap(name)} */`)
      sortedEntries(scale).forEach(([k, v]) => lines.push(`--color-${name}-${toneLabel(store.colorNaming, Number(k))}: ${formatColor(v, cf)};`))
    })
    lines.push('/* Semantic — light */')
    Object.entries(store.themes.light ?? {}).forEach(([k, v]) => { if (v) lines.push(`--color-${k}: ${formatColor(v, cf)};`) })
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
    const lib = getIconLibrary(store.iconLibrary)
    const lines = [`/* Icon library — ${lib?.label ?? store.iconLibrary}${lib?.npm ? ` · ${lib.npm}` : ''} */`]
    if (lib?.npm) lines.push(`/* Install: npm i ${lib.npm} */`)
    if (store.customIcons.length) lines.push(`/* Custom icons: ${store.customIcons.map((i) => i.name).join(', ')} */`)
    return lines
  }
  const simple = SIMPLE[section]!
  return Object.entries(simple.get(store)).map(([k, v]) => `--${simple.prefix}-${k}: ${v};`)
}

function wrapRoot(lines: string[]): string {
  return `:root {\n${lines.map((l) => (l ? `  ${l}` : '')).join('\n')}\n}`
}

function cssFor(section: SectionKey, store: Store, cf: ColorFormat): string {
  return wrapRoot(cssLines(section, store, cf))
}

// ── Tailwind (theme.extend snippet) ──────────────────────────────────────────

// Wrap a theme.extend object as a copy-pasteable tailwind.config.js snippet.
function twConfig(extend: Record<string, unknown>): string {
  const body = JSON.stringify(extend, null, 2).replace(/\n/g, '\n    ')
  return `/** @type {import('tailwindcss').Config} */\nexport default {\n  theme: {\n    extend: ${body},\n  },\n}`
}

// The theme.extend slice for a section — composable for "all".
function twExtend(section: SectionKey, store: Store, cf: ColorFormat): Record<string, unknown> {
  if (section === 'color') {
    const colors: Record<string, unknown> = {}
    colorFamilies(store).forEach(([name, scale]) => {
      const obj: Record<string, string> = {}
      sortedEntries(scale).forEach(([k, v]) => { obj[toneLabel(store.colorNaming, Number(k))] = formatColor(v, cf) })
      colors[name] = obj
    })
    Object.entries(store.themes.light ?? {}).forEach(([k, v]) => { if (v) colors[k] = formatColor(v, cf) })
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

function tailwindFor(section: SectionKey, store: Store, cf: ColorFormat): string {
  if (section === 'icons') {
    const lib = getIconLibrary(store.iconLibrary)
    return `// Icons aren't a Tailwind theme key — install the set and import per-icon.\n// ${lib?.label ?? store.iconLibrary}${lib?.npm ? `  ·  npm i ${lib.npm}` : ''}`
  }
  return twConfig(twExtend(section, store, cf))
}

// ── Tokens (JSON slice) ───────────────────────────────────────────────────────

function tokensFor(section: SectionKey, store: Store, cf: ColorFormat): unknown {
  if (section === 'color') {
    const primitive: Record<string, string> = {}
    colorFamilies(store).forEach(([name, scale]) => {
      sortedEntries(scale).forEach(([k, v]) => { primitive[`${name}-${toneLabel(store.colorNaming, Number(k))}`] = formatColor(v, cf) })
    })
    const fmt = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([, v]) => v).map(([k, v]) => [k, formatColor(v, cf)]))
    return { colors: { primitive, semantic: fmt(store.themes.light ?? {}), semanticDark: fmt(store.themes.dark ?? {}) } }
  }
  if (section === 'typography') {
    const t = store.typography
    return { typography: { fontFamily: t.fontFamily, headingFontFamily: t.headingFontFamily ?? t.fontFamily, sizes: t.sizes, lineHeights: t.lineHeights, weights: t.weights } }
  }
  if (section === 'icons') {
    const lib = getIconLibrary(store.iconLibrary)
    return { icons: { library: store.iconLibrary, name: lib?.label, package: lib?.npm, custom: store.customIcons } }
  }
  const simple = SIMPLE[section]!
  return { [simple.tokenKey]: simple.get(store) }
}

// ── Markdown ──────────────────────────────────────────────────────────────────

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n')
}

function mdFor(section: SectionKey, store: Store, cf: ColorFormat): string {
  if (section === 'color') {
    const parts = ['## Color']
    colorFamilies(store).forEach(([name, scale]) => {
      parts.push(`\n### ${cap(name)}\n`)
      parts.push(table(['Token', 'Value'], sortedEntries(scale).map(([k, v]) => [`\`${name}-${toneLabel(store.colorNaming, Number(k))}\``, `\`${formatColor(v, cf)}\``])))
    })
    const sem = Object.entries(store.themes.light ?? {}).filter(([, v]) => v)
    if (sem.length) {
      parts.push('\n### Semantic (light)\n')
      parts.push(table(['Token', 'Value'], sem.map(([k, v]) => [`\`${k}\``, `\`${formatColor(v, cf)}\``])))
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
    const lib = getIconLibrary(store.iconLibrary)
    const lines = ['## Icons\n', `- **Library:** ${lib?.label ?? store.iconLibrary}`, lib?.npm ? `- **Package:** \`${lib.npm}\`` : '']
    if (store.customIcons.length) lines.push(`- **Custom:** ${store.customIcons.map((i) => i.name).join(', ')}`)
    return lines.filter(Boolean).join('\n')
  }
  const simple = SIMPLE[section]!
  return `## ${cap(section)}\n\n${table(['Token', 'Value'], Object.entries(simple.get(store)).map(([k, v]) => [`\`--${simple.prefix}-${k}\``, `\`${v}\``]))}`
}

// ── Public entry ──────────────────────────────────────────────────────────────

// Whole-system export — every section assembled into one document. Powers the
// "Get MD" full AI-context window.
function buildFullExport(store: Store, format: ExportFormat, cf: ColorFormat): string {
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
      return JSON.stringify(Object.assign({ project: store.projectName }, ...ALL_SECTIONS.map((s) => tokensFor(s, store, cf))), null, 2)
    case 'md': {
      const desc = store.projectDescription?.trim()
      const header = `# ${store.projectName} — design tokens\n${desc ? `\n${desc}\n` : ''}\n_Personalized design-system context. Use these tokens verbatim; don't invent new values._`
      return `${header}\n\n${ALL_SECTIONS.map((s) => mdFor(s, store, cf)).join('\n\n---\n\n')}`
    }
  }
}

export function buildSectionExport(section: SectionKey | 'all', format: ExportFormat, colorFormat: ColorFormat = 'hex'): string {
  const store = useDesignStore.getState()
  if (section === 'all') return buildFullExport(store, format, colorFormat)
  switch (format) {
    case 'css': return cssFor(section, store, colorFormat)
    case 'tailwind': return tailwindFor(section, store, colorFormat)
    case 'tokens': return JSON.stringify(tokensFor(section, store, colorFormat), null, 2)
    case 'md': return mdFor(section, store, colorFormat)
  }
}
