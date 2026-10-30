/**
 * Cuts of `variables.css` — one collection, one brand, or every brand in one
 * file. Pure and DOM-free.
 *
 * Every output here is a CUT of what `buildCSS` already wrote, never a second
 * renderer: the same rule `contextRequest` follows for the agent paste. So a
 * Radius-only file and the full file can't disagree about a value — they are
 * the same lines.
 *
 * Multi-brand protocol (`combineBrandCss`):
 * - `<html data-brand="<slug>">` picks the brand.
 * - `.dark` (or `data-theme="dark"`) picks the appearance, exactly as in a
 *   one-brand file. The two attributes compose on the same element.
 * - The FIRST brand also answers bare `:root` / `.dark`, so a page without
 *   `data-brand` still gets a complete system.
 * - Each brand's blocks follow the previous brand's, so a brand's own rules
 *   win over the default's at equal specificity.
 */
import { CONTEXT_FOUNDATIONS, type ContextFoundation, type ContextScope } from './contextRequest'

/** The `--<prefix>-…` families each collection owns in variables.css. */
const COLLECTION_PREFIXES: Record<ContextFoundation, string[]> = {
  color: ['color', 'panel'],
  typography: ['font', 'text', 'line-height', 'letter-spacing'],
  dimensions: ['dimension'],
  spacing: ['spacing', 'padding'],
  radius: ['radius'],
  stroke: ['stroke'],
  sizes: ['size', 'selector'],
  grid: ['grid', 'breakpoint'],
  shadow: ['shadow'],
  gradients: ['gradient'],
  icons: ['icon'],
  motion: ['motion'],
}

export function cssCollectionOf(varName: string): ContextFoundation | null {
  const bare = varName.replace(/^--/, '')
  let best: ContextFoundation | null = null
  let bestLength = 0
  for (const [key, prefixes] of Object.entries(COLLECTION_PREFIXES) as [ContextFoundation, string[]][]) {
    for (const prefix of prefixes) {
      if ((bare === prefix || bare.startsWith(`${prefix}-`)) && prefix.length > bestLength) {
        best = key
        bestLength = prefix.length
      }
    }
  }
  return best
}

// ── A tiny tree of the file ─────────────────────────────────────────────────
// buildCSS writes one declaration or one brace per line, so a line parser is
// enough; it does not need to understand CSS in general.

type Node =
  | { kind: 'decl'; name: string | null; lines: string[] }
  | { kind: 'comment'; lines: string[] }
  | { kind: 'blank' }
  | { kind: 'at'; line: string }
  | { kind: 'block'; header: string; indent: string; children: Node[]; close: string }

const DECL = /^\s*(--[\w-]+)\s*:/

function parse(lines: string[], start = 0, depth = 0): { nodes: Node[]; end: number } {
  const nodes: Node[] = []
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed === '}') {
      if (depth > 0) return { nodes, end: i }
      i += 1
      continue
    }
    if (!trimmed) { nodes.push({ kind: 'blank' }); i += 1; continue }
    if (trimmed.startsWith('/*')) {
      const comment: string[] = [line]
      while (!lines[i].includes('*/') && i + 1 < lines.length) { i += 1; comment.push(lines[i]) }
      nodes.push({ kind: 'comment', lines: comment })
      i += 1
      continue
    }
    if (trimmed.endsWith('{')) {
      const inner = parse(lines, i + 1, depth + 1)
      nodes.push({
        kind: 'block',
        header: trimmed.slice(0, -1).trim(),
        indent: line.slice(0, line.length - line.trimStart().length),
        children: inner.nodes,
        close: lines[inner.end] ?? '}',
      })
      i = inner.end + 1
      continue
    }
    if (trimmed.startsWith('@') && trimmed.endsWith(';')) { nodes.push({ kind: 'at', line }); i += 1; continue }
    // A declaration, possibly running over several lines until its `;`.
    const decl: string[] = [line]
    while (!lines[i].trimEnd().endsWith(';') && i + 1 < lines.length && !lines[i + 1].trim().endsWith('{') && lines[i + 1].trim() !== '}') {
      i += 1
      decl.push(lines[i])
    }
    nodes.push({ kind: 'decl', name: DECL.exec(line)?.[1] ?? null, lines: decl })
    i += 1
  }
  return { nodes, end: i }
}

function print(nodes: Node[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    if (node.kind === 'blank') out.push('')
    else if (node.kind === 'at') out.push(node.line)
    else if (node.kind === 'decl' || node.kind === 'comment') out.push(...node.lines)
    else out.push(`${node.indent}${node.header} {`, ...print(node.children), node.close)
  }
  return out
}

/** Tidy blank lines: never two in a row, none at the start or end of a block. */
function tidy(lines: string[]): string {
  const out: string[] = []
  for (const line of lines) {
    const blank = !line.trim()
    const prev = out[out.length - 1]
    if (blank && (prev === undefined || !prev.trim() || prev.trimEnd().endsWith('{'))) continue
    if (line.trim() === '}' && prev !== undefined && !prev.trim()) out.pop()
    out.push(line)
  }
  while (out.length && !out[out.length - 1].trim()) out.pop()
  return out.join('\n')
}

// ── Collection cut ──────────────────────────────────────────────────────────

function walkDecls(nodes: Node[], visit: (decl: Extract<Node, { kind: 'decl' }>) => void) {
  for (const node of nodes) {
    if (node.kind === 'decl') visit(node)
    else if (node.kind === 'block') walkDecls(node.children, visit)
  }
}

/** The names a collection keeps: its own families, plus every variable they
 *  alias (`var(--dimension-16)`), transitively — or the file would point at
 *  values it no longer carries. */
function keptNames(nodes: Node[], scope: ContextFoundation): Set<string> {
  const refs = new Map<string, Set<string>>()
  walkDecls(nodes, (decl) => {
    if (!decl.name) return
    const set = refs.get(decl.name) ?? new Set<string>()
    for (const match of decl.lines.join(' ').matchAll(/var\(\s*(--[\w-]+)/g)) set.add(match[1])
    refs.set(decl.name, set)
  })
  const kept = new Set<string>()
  const queue = [...refs.keys()].filter((name) => cssCollectionOf(name) === scope)
  while (queue.length) {
    const name = queue.pop()!
    if (kept.has(name)) continue
    kept.add(name)
    refs.get(name)?.forEach((ref) => { if (!kept.has(ref)) queue.push(ref) })
  }
  return kept
}

function filterNodes(nodes: Node[], keep: (decl: Extract<Node, { kind: 'decl' }>) => boolean, keepBlock: (header: string) => boolean | null): Node[] {
  const out: Node[] = []
  let pendingComment: Node | null = null
  for (const node of nodes) {
    if (node.kind === 'comment') { pendingComment = node; continue }
    if (node.kind === 'blank') { out.push(node); continue }
    if (node.kind === 'at') continue
    if (node.kind === 'decl') {
      if (!keep(node)) continue
      if (pendingComment) { out.push(pendingComment); pendingComment = null }
      out.push(node)
      continue
    }
    const forced = keepBlock(node.header)
    if (forced === false) { pendingComment = null; continue }
    const children = forced === true ? node.children : filterNodes(node.children, keep, keepBlock)
    if (!children.some((child) => child.kind === 'decl' || child.kind === 'block')) { pendingComment = null; continue }
    if (pendingComment) { out.push(pendingComment); pendingComment = null }
    out.push({ ...node, children })
  }
  return out
}

/** `variables.css` narrowed to one collection. `'all'` returns it unchanged. */
export function cutCssCollection(css: string, scope: ContextScope): string {
  if (scope === 'all' || !css) return css
  const { nodes } = parse(css.split('\n'))
  const kept = keptNames(nodes, scope)
  const filtered = filterNodes(
    nodes,
    (decl) => decl.name !== null && kept.has(decl.name),
    // Keyframes are what the motion choreographies play; nothing else uses them.
    (header) => (header.startsWith('@keyframes') ? scope === 'motion' : null),
  )
  const imports = scope === 'typography' ? css.split('\n').filter((line) => line.startsWith('@import')) : []
  const label = CONTEXT_FOUNDATIONS.find((f) => f.key === scope)?.label ?? scope
  const aliases = [...kept].some((name) => cssCollectionOf(name) !== scope)
  const note = `/* ${label} only${aliases ? ', plus the variables it aliases' : ''}. Cut from variables.css. */`
  return tidy([...imports, ...(imports.length ? [''] : []), note, '', ...print(filtered)])
}

// ── Every brand in one file ─────────────────────────────────────────────────

export interface BrandCss {
  /** The `data-brand` value. */
  slug: string
  name: string
  css: string
}

/** One selector of a brand's file, scoped to `[data-brand="<slug>"]`. */
function scopeSelector(selector: string, brand: string, isDefault: boolean): string[] {
  const s = selector.trim()
  if (s === ':root') return isDefault ? [':root', brand] : [brand]
  if (s === '.dark' || s === '.light' || /^\[data-theme="[^"]+"\]$/.test(s)) {
    return isDefault ? [s, `${brand}${s}`] : [`${brand}${s}`]
  }
  return isDefault ? [s, `${brand} ${s}`] : [`${brand} ${s}`]
}

function scopeNodes(nodes: Node[], brand: string, isDefault: boolean): Node[] {
  return nodes.map((node) => {
    if (node.kind !== 'block') return node
    // At-rules keep their condition; the rules inside them are scoped.
    if (node.header.startsWith('@media') || node.header.startsWith('@supports')) {
      return { ...node, children: scopeNodes(node.children, brand, isDefault) }
    }
    if (node.header.startsWith('@')) return node
    const header = node.header.split(',').flatMap((part) => scopeSelector(part, brand, isDefault)).join(', ')
    return { ...node, header }
  })
}

/** Turns a brand name into a `data-brand` value, unique within `taken`. */
export function brandSlug(name: string, taken: Set<string>): string {
  const base = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'brand'
  let slug = base
  let n = 2
  while (taken.has(slug)) slug = `${base}-${n++}`
  taken.add(slug)
  return slug
}

/** Every brand's file in one stylesheet, under the protocol at the top of this
 *  module. Font imports are hoisted (CSS needs them first) and keyframes,
 *  identical for every brand, ship once. */
export function combineBrandCss(project: string, brands: BrandCss[]): string {
  if (!brands.length) return ''
  const imports = new Set<string>()
  const seenStatic = new Set<string>()
  const sections: string[] = []
  brands.forEach((brand, index) => {
    const isDefault = index === 0
    const lines = brand.css.split('\n')
    lines.filter((line) => line.startsWith('@import')).forEach((line) => imports.add(line))
    const { nodes } = parse(lines.filter((line) => !line.startsWith('@import')))
    const scoped = scopeNodes(nodes, `[data-brand="${brand.slug}"]`, isDefault).filter((node) => {
      if (node.kind !== 'block' || !node.header.startsWith('@keyframes')) return true
      const key = print([node]).join('\n')
      if (seenStatic.has(key)) return false
      seenStatic.add(key)
      return true
    })
    sections.push(
      `/* ═══ ${brand.name} — data-brand="${brand.slug}"${isDefault ? ' (default)' : ''} ═══ */`,
      '',
      ...print(scoped),
      '',
    )
  })
  const first = brands[0]
  const header = [
    `/* ${project} — ${brands.length} brands in one file.`,
    ` * <html data-brand="${first.slug}"> picks the brand; .dark (or data-theme="dark") picks the appearance.`,
    ` * Without data-brand, ${first.name} applies.`,
    ` * Brands: ${brands.map((b) => b.slug).join(', ')} */`,
  ]
  return tidy([...imports, ...(imports.size ? [''] : []), ...header, '', ...sections])
}
