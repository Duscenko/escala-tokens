// Multi-brand agent context (PLAN-multibrand-foundations.md, F5). A system with
// two or more brands ships one Figma file and one CSS file where TOKEN NAMES
// ARE THE SAME IN EVERY BRAND and only the values change:
//   Figma — a `Brand` collection, one mode per brand; Color Semantics (Light ·
//           Dark), Dimension Semantics and Typography alias it where brands
//           differ (the plugin's `importVariables`).
//   Code  — every brand's variables.css in one file, `[data-brand="<slug>"]`
//           picks the brand (`cssCut.combineBrandCss`).
// The risk for an agent is inventing per-brand names or mixing two brands'
// values. So the paste lists what every brand shares ONCE and then a "By brand"
// table with only the tokens that differ, one column per brand.
//
// Every value is still a cut of the one renderer (`buildSystemContext`): each
// brand is rendered flat (`narrowToBrand`) and the rows are compared, so the
// paste can never name a token the plugin does not write.
//
// Pure (no store), so the Figma plugin's bundle (`EscalaAgent`) carries it.

import { buildSystemContext, splitMarkdown, type ContextDetail, type ContextScope } from '../contextRequest'
import { brandSlug } from '../cssCut'
import { brandLabelOf, brandOfKey, brandSlugsOf, cap, table } from './names'
import type { TokenJSON } from './types'

export type BrandAppearance = 'light' | 'dark' | 'both'

export interface ContextBrand {
  /** The brand's key in the payload (`hola` in `hola::light`). */
  slug: string
  /** Its name — the Brand collection's mode name. */
  label: string
  /** Its Color Semantics columns, in payload order. */
  keys: string[]
  appearance: BrandAppearance
  /** The `data-brand` value its CSS answers to (`combineBrandCss`). */
  dataBrand: string
}

function appearanceOfColumn(key: string): 'light' | 'dark' {
  return key.split('::')[1] === 'dark' ? 'dark' : 'light'
}

export function appearanceLabel(a: BrandAppearance): string {
  return a === 'both' ? 'Light + Dark' : a === 'dark' ? 'Dark only' : 'Light only'
}

/** The brands of a payload, in column order. Empty for a system with one
 *  brand (or plain `light` / `dark` columns): those keep today's context. */
export function contextBrands(json: TokenJSON): ContextBrand[] {
  const ctx = { themeOrder: json.colors.themeOrder, themeLabels: json.colors.themeLabels, studioThemes: json.studioThemes }
  const slugs = brandSlugsOf(ctx)
  if (slugs.length < 2) return []
  const taken = new Set<string>()
  return slugs.map((slug) => {
    const keys = (json.colors.themeOrder ?? []).filter((k) => brandOfKey(k) === slug)
    const looks = new Set(keys.map(appearanceOfColumn))
    const label = brandLabelOf(slug, ctx)
    return {
      slug,
      label,
      keys,
      appearance: looks.size > 1 ? 'both' : looks.has('dark') ? 'dark' : 'light',
      dataBrand: brandSlug(label, taken),
    }
  })
}

// ── One brand, flat ──────────────────────────────────────────────────────────

/** Foundation fields a brand may set for itself (decision 4 of the plan):
 *  radius, spacing (paddings and gaps) and — inside typography — the two
 *  families. Everything else is the system's, whatever the brand's own
 *  `foundationsByTheme` entry happens to carry, because that is what Figma and
 *  the CSS ship. */
const BRAND_FIELDS = ['spacing', 'spacingRoles', 'spacingRoleRefs', 'padding', 'radius', 'radiusRoles', 'radiusRoleViewports'] as const
const BRAND_DIMENSION_REFS = ['spacing', 'padding', 'radius']

type Foundations = NonNullable<TokenJSON['foundationsByTheme']>[string] & { padding?: Record<string, string> }

/** The brand's own foundations — any of its columns carries them. */
export function brandFoundations(json: TokenJSON, slug: string): Foundations | undefined {
  for (const key of json.colors.themeOrder ?? []) {
    if (brandOfKey(key) !== slug) continue
    const f = json.foundationsByTheme?.[key]
    if (f) return f as Foundations
  }
  return json.foundationsByTheme?.[slug] as Foundations | undefined
}

/** `escala-error-dark` → `escala-error`: the family a theme source names. */
function familyBase(family: string): string {
  let base = family
  if (base.endsWith('-dark')) base = base.slice(0, -5)
  if (base.endsWith('-a') && base !== 'black-a' && base !== 'white-a') base = base.slice(0, -2)
  return base
}

function pickKeys<T>(map: Record<string, T> | undefined, keep: (k: string) => boolean): Record<string, T> | undefined {
  if (!map) return map
  return Object.fromEntries(Object.entries(map).filter(([k]) => keep(k)))
}

/**
 * The payload as if the system had ONE brand: its columns, its colour ramps
 * (plus the families no brand owns), and its own radius, spacing and font
 * families promoted to the root fields every renderer reads. Imports as a
 * one-brand system.
 */
export function narrowToBrand(json: TokenJSON, slug: string): TokenJSON {
  const order = json.colors.themeOrder ?? []
  const keys = order.filter((k) => brandOfKey(k) === slug)
  if (!keys.length) return json
  const mine = (k: string) => brandOfKey(k) === slug

  // Ramps: a family belongs to the brands whose columns name it.
  const owners = new Map<string, Set<string>>()
  for (const [col, slots] of Object.entries(json.colors.themeSources ?? {})) {
    for (const fam of Object.values(slots ?? {})) {
      if (!fam) continue
      const set = owners.get(fam) ?? new Set<string>()
      set.add(brandOfKey(col))
      owners.set(fam, set)
    }
  }
  const keepPrimitive = (key: string) => {
    const dash = key.lastIndexOf('-')
    const fam = familyBase(dash === -1 ? key : key.slice(0, dash))
    const who = owners.get(fam)
    return !who || who.has(slug)
  }

  const arch = json.colors.architecture
  const tokens = arch?.tokens
    ? Object.fromEntries(Object.entries(arch.tokens).map(([group, roles]) => [
        group,
        Object.fromEntries(Object.entries(roles).map(([role, byMode]) => [role, pickKeys(byMode, (k) => !k.includes('::') || mine(k)) ?? {}])),
      ]))
    : undefined

  const colors = json.colors as TokenJSON['colors'] & { themeModes?: Record<string, unknown> }
  const out: TokenJSON & Record<string, unknown> = {
    ...json,
    colors: {
      ...json.colors,
      themeOrder: keys,
      primitive: pickKeys(json.colors.primitive, keepPrimitive) ?? {},
      primitiveAlpha: pickKeys(json.colors.primitiveAlpha, keepPrimitive),
      ...(json.colors.themes ? { themes: pickKeys(json.colors.themes, mine) } : {}),
      ...(json.colors.themeSources ? { themeSources: pickKeys(json.colors.themeSources, mine) } : {}),
      ...(json.colors.themeLabels ? { themeLabels: pickKeys(json.colors.themeLabels, mine) } : {}),
      ...(colors.themeModes ? { themeModes: pickKeys(colors.themeModes, (k) => k === slug) } : {}),
      activeTheme: json.colors.activeTheme && keys.includes(json.colors.activeTheme) ? json.colors.activeTheme : keys[0],
      ...(arch ? { architecture: { ...arch, tokens } } : {}),
    } as TokenJSON['colors'],
  }

  const f = brandFoundations(json, slug)
  if (f) {
    const root = out as unknown as Record<string, unknown>
    for (const field of BRAND_FIELDS) {
      const v = (f as Record<string, unknown>)[field]
      if (v !== undefined) root[field] = v
    }
    if (f.typography) {
      out.typography = {
        ...json.typography,
        fontFamily: f.typography.fontFamily || json.typography.fontFamily,
        ...(f.typography.headingFontFamily ? { headingFontFamily: f.typography.headingFontFamily } : {}),
      }
    }
    if (f.dimensionRefs) {
      out.dimensionRefs = { ...json.dimensionRefs }
      for (const cat of BRAND_DIMENSION_REFS) if (f.dimensionRefs[cat]) out.dimensionRefs[cat] = f.dimensionRefs[cat]
    }
  }
  if (json.foundationsByTheme) out.foundationsByTheme = pickKeys(json.foundationsByTheme, mine)
  const extra = json as unknown as Record<string, unknown>
  for (const m of ['gradientsByTheme', 'themeKeys']) {
    const map = extra[m] as Record<string, unknown> | undefined
    if (map) out[m] = pickKeys(map, (k) => brandOfKey(k) === slug)
  }
  if (json.studioThemes) {
    out.studioThemes = pickKeys(json.studioThemes, (k) => k === slug)
    if (json.studioThemes[slug]) out.studio = json.studioThemes[slug]
  }
  if (json.brandCss) out.brandCss = json.brandCss.filter((b) => brandOfKey(b.key) === slug)
  return out
}

/** One brand flat, then cut to one appearance when it ships it. */
export function brandColumn(brand: ContextBrand, appearance: 'light' | 'dark' | 'all'): string | undefined {
  if (appearance === 'all') return undefined
  return brand.keys.find((k) => appearanceOfColumn(k) === appearance)
}

// ── Markdown rows ────────────────────────────────────────────────────────────

/** Column headers that name a token rather than hold its value. */
const NAME_COLUMNS = new Set(['Figma variable', 'CSS', 'Role id', 'Token', 'Style', 'CSS custom property'])

/** A brand-column header (`Hola::light`) as the appearance it is. Only for a
 *  flat brand, where the column can only be that brand's. */
export function relabelBrandColumns(md: string, keys: string[]): string {
  const names = new Map(keys.map((k) => [cap(k), appearanceOfColumn(k) === 'dark' ? 'Dark' : 'Light']))
  return md.split('\n').map((line) => {
    if (line.startsWith('**Modes (Color Semantics columns):**')) {
      return `**Modes (Color Semantics columns):** ${keys.map((k) => `\`${names.get(cap(k))}\``).join(', ')}`
    }
    if (!line.startsWith('| ')) return line
    return line.replace(/\| ([^|`]+?) (?=\|)/g, (m, cell: string) => (names.has(cell) ? `| ${names.get(cell)} ` : m))
  }).join('\n')
}

interface Row {
  /** `## Radius › ### Radius roles › Radius/role/action` */
  id: string
  /** The `## ` and `### ` headings the row sits under. */
  section: string
  sub: string
  name: string
  /** Value column header → cell. */
  values: Map<string, string>
}

function splitRow(line: string): string[] {
  return line.replace(/^\|\s?/, '').replace(/\s?\|$/, '').split(/\s\|\s/).map((c) => c.trim())
}

/** Every token row of a reference markdown: table rows and `- \`name\` = …`
 *  bullets. Fenced code and the Color Primitives section are skipped (the
 *  primitives are one global collection, named per brand already). */
function readRows(md: string): Row[] {
  const out: Row[] = []
  let section = ''
  let sub = ''
  let headers: string[] | null = null
  let fenced = false
  const lines = md.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.startsWith('```')) fenced = !fenced
    if (fenced) continue
    if (line.startsWith('## ') || line.startsWith('# ')) { section = line; sub = ''; headers = null; continue }
    if (line.startsWith('### ')) { sub = line; headers = null; continue }
    if (/^## Color Primitives/.test(section)) continue
    if (line.startsWith('|')) {
      if (/^\|[-|\s:]+\|$/.test(line)) continue
      const cells = splitRow(line)
      if (!headers) { headers = cells; continue }
      const name = cells[0] ?? ''
      const values = new Map<string, string>()
      headers.forEach((h, idx) => { if (idx > 0 && !NAME_COLUMNS.has(h)) values.set(h, cells[idx] ?? '') })
      out.push({ id: `${section} › ${sub} › ${headers[0] ?? ''} › ${name}`, section, sub, name, values })
      continue
    }
    headers = null
    const bullet = /^- (`[^`]+`) = (.+?)(?: · CSS .*)?$/.exec(line)
    if (bullet) {
      out.push({ id: `${section} › ${sub} › bullet › ${bullet[1]}`, section, sub, name: bullet[1]!, values: new Map([['Value', bullet[2]!]]) })
    }
  }
  return out
}

const EMPTY = new Set(['', '—', '-'])

/** The rows whose values are not the same in every brand. A brand that ships
 *  one appearance is compared on that appearance only. */
function differingRows(perBrand: Map<string, Row>[]): Set<string> {
  const ids = new Set<string>()
  for (const rows of perBrand) for (const id of rows.keys()) ids.add(id)
  const differ = new Set<string>()
  for (const id of ids) {
    const present = perBrand.map((rows) => rows.get(id))
    if (present.some((r) => !r)) { differ.add(id); continue }
    const headers = new Set<string>()
    for (const r of present) for (const h of r!.values.keys()) headers.add(h)
    for (const h of headers) {
      const vals = present.map((r) => r!.values.get(h)).filter((v): v is string => v != null && !EMPTY.has(v))
      if (new Set(vals).size > 1) { differ.add(id); break }
    }
  }
  return differ
}

/** Drops the rows in `drop` from the markdown. A table left with no rows says
 *  where its values went. */
function withoutRows(md: string, drop: Set<string>): string {
  const keep = new Set(readRows(md).filter((r) => !drop.has(r.id)).map((r) => r.id))
  const out: string[] = []
  let section = ''
  let sub = ''
  let headers: string[] | null = null
  let tableStart = -1
  let kept = 0
  let dropped = 0
  let fenced = false
  const closeTable = () => {
    if (tableStart >= 0 && kept === 0 && dropped > 0) {
      out.splice(tableStart, 2, '_Every value here differs by brand — see **By brand**._')
    }
    tableStart = -1; kept = 0; dropped = 0
  }
  for (const line of md.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced
    if (fenced) { out.push(line); continue }
    if (!line.startsWith('|')) { if (headers) closeTable(); headers = null }
    if (line.startsWith('## ') || line.startsWith('# ')) { section = line; sub = '' }
    else if (line.startsWith('### ')) sub = line
    if (/^## Color Primitives/.test(section)) { out.push(line); continue }
    if (line.startsWith('|')) {
      if (/^\|[-|\s:]+\|$/.test(line)) { out.push(line); continue }
      const cells = splitRow(line)
      if (!headers) { headers = cells; tableStart = out.length; out.push(line); continue }
      const id = `${section} › ${sub} › ${headers[0] ?? ''} › ${cells[0] ?? ''}`
      if (keep.has(id)) { out.push(line); kept++ } else dropped++
      continue
    }
    const bullet = /^- (`[^`]+`) = /.exec(line)
    if (bullet && !keep.has(`${section} › ${sub} › bullet › ${bullet[1]}`)) {
      out.push(`- ${bullet[1]} — differs by brand, see **By brand**`)
      continue
    }
    out.push(line)
  }
  if (headers) closeTable()
  return out.join('\n')
}

// ── All brands ───────────────────────────────────────────────────────────────

export interface BrandsContextRequest {
  scope: ContextScope
  detail: ContextDetail
  /** `all`, or one appearance: each brand that ships it is cut to it. */
  appearance: 'light' | 'dark' | 'all'
}

function sectionTitle(row: Row): string {
  const h2 = row.section.replace(/^#+ /, '').replace(/\s*\(.*$/, '').trim()
  const h3 = row.sub.replace(/^#+ /, '').replace(/\s*\(.*$/, '').replace(/ — bind these, not the steps$/, '').trim()
  return h3 && h3 !== h2 ? `${h2} — ${h3}` : h2
}

/** How to switch brands, in code and in Figma. */
export function activationLines(brands: ContextBrand[]): string[] {
  const first = brands[0]!
  return [
    '## Activate a brand',
    '',
    `- **Code:** every brand's \`variables.css\` ships in one file, scoped by \`[data-brand="<slug>"]\`. Set it on \`<html>\` (or any subtree): ${brands.map((b) => `\`data-brand="${b.dataBrand}"\``).join(' · ')}. \`.dark\` (or \`data-theme="dark"\`) picks the appearance on the same element. Without \`data-brand\`, ${first.label} applies.`,
    `- **Figma:** pick the brand with the \`Brand\` collection's mode (${brands.map((b) => `\`${b.label}\``).join(' · ')}) on a frame. Light / Dark is the \`Color Semantics\` mode and the viewport is the \`Dimension Semantics\` / \`Typography\` mode — three switches that work together. Bind components to the semantic variables, never to \`Brand/…\` (hidden, unscoped).`,
    '',
  ]
}

/**
 * The paste for every brand at once: what they share, once, then the tokens
 * that differ in one "By brand" table per section, one column per brand.
 */
export function buildBrandsContext(json: TokenJSON, brands: ContextBrand[], req: BrandsContextRequest): string {
  const project = json.project?.trim() || 'Design system'
  const flat = brands.map((b) => {
    let j = narrowToBrand(json, b.slug)
    const col = brandColumn(b, req.appearance)
    let appearance: 'light' | 'dark' | undefined
    if (col) {
      appearance = appearanceOfColumn(col)
      j = { ...j, colors: { ...j.colors, themeOrder: [col], activeTheme: col } }
    }
    const keys = j.colors.themeOrder ?? []
    const md = relabelBrandColumns(buildSystemContext(j, { scope: req.scope, detail: req.detail, appearance }), keys)
    return { brand: b, md, rows: new Map(readRows(md).map((r) => [r.id, r])) }
  })
  const differ = differingRows(flat.map((f) => f.rows))

  // The shared part: the first brand that ships every appearance asked for,
  // without the rows that differ. Color Primitives (one global collection)
  // comes from the whole payload, every brand's ramps under their own names.
  const wantBoth = req.appearance === 'all'
  const base = flat.find((f) => !wantBoth || f.brand.appearance === 'both') ?? flat[0]!
  let shared = withoutRows(base.md, differ)
  if (req.scope === 'all' || req.scope === 'color') {
    const all = buildSystemContext(json, { scope: 'color', detail: 'tokens' })
    const prims = splitMarkdown(all).find((c) => /^## Color Primitives/.test(c.heading))
    const chunks = splitMarkdown(shared)
    const at = chunks.findIndex((c) => /^## Color Primitives/.test(c.heading))
    if (prims && at >= 0) {
      chunks[at] = prims
      shared = chunks.map((c) => c.text.trimEnd()).join('\n\n')
    }
  }
  // Its title and mode line describe one brand; the shared part is everyone's.
  shared = shared
    .split('\n')
    .map((line) => line.startsWith('**Modes (Color Semantics columns):**')
      ? `**Modes:** \`Color Semantics\` ${wantBoth ? '`Light` · `Dark`' : `\`${cap(req.appearance)}\``} · \`Brand\` ${brands.map((b) => `\`${b.label}\``).join(' · ')}`
      : line)
    .join('\n')

  // By brand: grouped by the section each row came from, in reading order.
  const order: string[] = []
  const groups = new Map<string, { title: string; multi: string[]; rows: Row[] }>()
  for (const [id, row] of flat[0]!.rows) if (differ.has(id)) order.push(id)
  for (const f of flat) for (const [id] of f.rows) if (differ.has(id) && !order.includes(id)) order.push(id)
  for (const id of order) {
    const row = flat.map((f) => f.rows.get(id)).find(Boolean)!
    const title = sectionTitle(row)
    const g = groups.get(title) ?? { title, multi: [], rows: [] }
    for (const f of flat) for (const h of f.rows.get(id)?.values.keys() ?? []) if (!g.multi.includes(h)) g.multi.push(h)
    g.rows.push(row)
    groups.set(title, g)
  }
  const cell = (r: Row | undefined, headers: string[]) => {
    if (!r) return '—'
    const vals = headers.map((h) => r.values.get(h)).filter((v): v is string => v != null && !EMPTY.has(v))
    return vals.length ? vals.join(' / ') : '—'
  }
  const byBrand: string[] = [
    '## By brand',
    '',
    `Only the tokens whose value is not the same in every brand. Same names in every column; read the column of the brand you are building for.`,
    '',
    table(['', ...brands.map((b) => b.label)], [
      ['Appearance', ...brands.map((b) => appearanceLabel(b.appearance))],
      ['`data-brand`', ...brands.map((b) => `\`${b.dataBrand}\``)],
      ['Figma `Brand` mode', ...brands.map((b) => `\`${b.label}\``)],
    ]),
    '',
  ]
  if (!groups.size) byBrand.push('_Every brand has the same values in this scope; only the brand colours of other scopes differ._', '')
  for (const g of groups.values()) {
    // A value cell joins the value columns of that table (Light / Dark, or
    // Step / Value…); the caption names them once.
    const valueHeaders = g.multi.filter((h) => h !== 'Value' || g.multi.length === 1)
    const shown = g.multi.includes('Value') && g.multi.length > 1 && !g.multi.some((h) => h === 'Light' || h === 'Dark') ? ['Value'] : valueHeaders
    byBrand.push(`### ${g.title}`, '')
    if (shown.length > 1) byBrand.push(`Each cell: ${shown.join(' / ')}.`, '')
    byBrand.push(table(['Token', ...brands.map((b) => b.label)], g.rows.map((row) => {
      const id = order.find((x) => flat.some((f) => f.rows.get(x) === row))!
      return [row.name, ...flat.map((f) => cell(f.rows.get(id), shown))]
    })), '')
  }

  const head = [
    `# ${project} — ${brands.length} brands`,
    '',
    `**Token names are the same in every brand; only the values change.** \`Radius/role/action\`, \`Action/primary/default\` or \`var(--radius-action)\` mean the same thing in ${brands.map((b) => b.label).join(', ')}. Never add a brand to a token name, and never mix values from two brands on one screen.`,
    '',
    table(['Brand', 'Appearance', 'Own foundations'], brands.map((b) => [b.label, appearanceLabel(b.appearance), ownFoundations(json, b, brands[0]!)])),
    '',
    'Below: the values every brand shares, then **By brand** with the ones that differ.',
    '',
    ...activationLines(brands),
  ]
  return [head.join('\n').trimEnd(), shared.trim(), byBrand.join('\n').trimEnd()].join('\n\n---\n\n') + '\n'
}

/** "Font · Radius" — what a brand sets for itself, against the first brand. */
function ownFoundations(json: TokenJSON, brand: ContextBrand, first: ContextBrand): string {
  if (brand.slug === first.slug) return 'The system’s'
  const a = narrowToBrand(json, brand.slug)
  const b = narrowToBrand(json, first.slug)
  const same = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null)
  const own: string[] = []
  if (!same(a.typography.fontFamily, b.typography.fontFamily) || !same(a.typography.headingFontFamily, b.typography.headingFontFamily)) own.push('Font')
  if (!same(a.radius, b.radius) || !same(a.radiusRoles, b.radiusRoles) || !same(a.radiusRoleViewports, b.radiusRoleViewports)) own.push('Radius')
  if (!same(a.spacing, b.spacing) || !same(a.spacingRoles, b.spacingRoles) || !same(a.padding, b.padding) || !same(a.spacingRoleRefs, b.spacingRoleRefs)) own.push('Spacing')
  return own.length ? own.join(' · ') : 'The system’s'
}
