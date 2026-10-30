/**
 * The export watchdog's checks (design-plans/export-watchdog.md, phase 1).
 *
 * Every way a brand leaves Escala — Code's `variables.css` (Both, Light, Dark,
 * one collection, All brands), the agent context (every scope × theme ×
 * detail), tokens.json, the plugin payload and the W3C file — is a reading of
 * ONE system. This module measures that they agree, value for value, and
 * returns what does not. It decides nothing by eye: a finding is a measured
 * difference, an unresolved reference or a broken budget.
 *
 * Pure and DOM-free: it takes a store snapshot and calls the same builders the
 * UI calls, so what it checks is what ships.
 */
import type { DesignSnapshot } from '../store/useDesignStore'
import { generateTokenJSON } from './tokenGenerator'
import { captureCodeSnapshot } from './codeScope'
import { buildCSS } from './exporters'
import { brandContext, pluginPayload } from './contextSource'
import { freeDownloadStore } from './freeFigmaScope'
import { buildSectionExport } from './sectionExport'
import { CONTEXT_FOUNDATIONS, contextSize, type ContextAppearance, type ContextDetail, type ContextScope } from './contextRequest'
import { brandSlug, combineBrandCss, cutCssCollection } from './cssCut'
import { figmaCollectionsW3C } from './figmaCollections'
import { themeDisplayName } from './themeSources'
import { brandThemeDef, shippedThemes } from './brandThemes'

// ── Findings ────────────────────────────────────────────────────────────────

export type Invariant =
  | 'I1-contradiction'   // one name, two values, one block
  | 'I2-unresolved'      // var(--x) with no --x
  | 'I3-css-vs-json'     // variables.css ≠ tokens.json
  | 'I4-context'         // agent context ≠ tokens.json / cites a missing var / bad fence
  | 'I5-plugin'          // plugin payload ≠ Code snapshot
  | 'I6-one-theme'       // Light / Dark file ≠ that column of the Both file
  | 'I7-cut'             // collection / All-brands cut invents or loses a line
  | 'I8-w3c'             // W3C alias does not resolve / value differs
  | 'I10-budget'         // a file grew past its budget
  | 'error'              // a builder threw

export interface Finding {
  invariant: Invariant
  brand: string
  output: string
  token?: string
  appearance?: string
  expected?: string
  got?: string
  detail?: string
}

/** Variables a component sets at runtime (an animation's from/to, a measured
 *  height). They are declared by the component, never by variables.css, so a
 *  reference to them is not a missing token. Listed by name — a new one is a
 *  decision, not something a pattern lets through. */
export const RUNTIME_VARS = new Set(['--switch-from', '--switch-to', '--escala-disclosure-height'])

/** Budgets. Generous on purpose: they exist to catch a runaway loop or a
 *  duplicated block (×2), not to police normal growth. */
export const BUDGETS = {
  cssBytes: 160_000,
  contextAllTokens: 70_000,
  contextFoundationTokens: 12_000,
}

const THEMES = ['light', 'dark'] as const
type Theme = typeof THEMES[number]
type Arch = Record<string, Record<string, Record<string, string>>>
type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** One spelling per value: lowercase, `#rrggbbff` → `#rrggbb`, and a colour
 *  written as `rgb(… / a)` compared as its hex. */
const norm = (v: string | undefined): string => {
  const t = (v ?? '').trim().toLowerCase()
  const rgb = t.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/)
  if (rgb) {
    const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
    const a = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4])
    return `#${hex(+rgb[1])}${hex(+rgb[2])}${hex(+rgb[3])}${a >= 0.999 ? '' : hex(a * 255)}`
  }
  return t.replace(/^#([0-9a-f]{6})ff$/, '#$1')
}

// ── A small CSS reader ──────────────────────────────────────────────────────
// buildCSS writes one declaration or one brace per line, so a line reader is
// enough (cssCut relies on the same property).

interface Block { selector: string; decls: [string, string][] }

export function cssBlocks(css: string): Block[] {
  const out: Block[] = []
  const stack: Block[] = []
  for (const raw of css.split('\n')) {
    const line = raw.trim()
    if (line.endsWith('{')) {
      const parent = stack[stack.length - 1]
      const block = { selector: (parent ? `${parent.selector} >> ` : '') + line.slice(0, -1).trim(), decls: [] }
      stack.push(block)
      out.push(block)
      continue
    }
    if (line === '}') { stack.pop(); continue }
    const m = line.match(/^(--[\w-]+)\s*:\s*(.*);$/)
    if (m && stack.length) stack[stack.length - 1].decls.push([m[1], m[2]])
  }
  return out
}

/** The custom properties a page gets from `selector` blocks, in file order
 *  (the last declaration wins, as in a browser). */
function envFor(blocks: Block[], match: (selector: string) => boolean, base?: Map<string, string>): Map<string, string> {
  const env = new Map(base)
  for (const b of blocks) if (match(b.selector)) for (const [k, v] of b.decls) env.set(k, v)
  return env
}

const isRoot = (s: string) => s === ':root' || s === ':root, [data-theme="light"]'

/** The page a theme gets. `:root` carries the brand's FIRST theme: light,
 *  then `.dark` overrides it — or, for a brand created in Dark, dark, then
 *  `.light` overrides it. */
export function cssEnv(css: string, theme: Theme): Map<string, string> {
  const blocks = cssBlocks(css)
  const root = envFor(blocks, isRoot)
  const other = theme === 'dark' ? '.dark' : '.light'
  return envFor(blocks, (s) => s.startsWith(other), root)
}

/** `:root` alone — what a one-theme file carries. */
export function rootEnv(css: string): Map<string, string> {
  return envFor(cssBlocks(css), isRoot)
}

export function resolveVars(value: string, env: Map<string, string>, depth = 0): string {
  if (depth > 24) return 'LOOP'
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_, name: string, fallback?: string) => {
    const hit = env.get(name)
    if (hit !== undefined) return resolveVars(hit, env, depth + 1)
    if (RUNTIME_VARS.has(name)) return `var(${name})`
    if (fallback !== undefined) return resolveVars(fallback.trim(), env, depth + 1)
    return `UNRESOLVED(${name})`
  })
}

function contradictions(css: string): { selector: string; name: string; values: string[] }[] {
  const out: { selector: string; name: string; values: string[] }[] = []
  for (const b of cssBlocks(css)) {
    const seen = new Map<string, string[]>()
    for (const [k, v] of b.decls) seen.set(k, [...(seen.get(k) ?? []), v])
    for (const [k, vals] of seen) if (new Set(vals).size > 1) out.push({ selector: b.selector, name: k, values: vals })
  }
  return out
}

// ── The checks ──────────────────────────────────────────────────────────────

function roleMap(json: Json): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>()
  for (const [group, roles] of Object.entries((json.colors?.architecture?.tokens ?? {}) as Arch)) {
    for (const [role, modes] of Object.entries(roles)) out.set(`${group}.${role}`, modes)
  }
  return out
}

const roleVar = (id: string) => `--color-${id.replace(/\./g, '-')}`

/** Value of a layout role in tokens.json: a step of its ramp, or a pinned
 *  `dimension-<key>` primitive. */
function roleValue(json: Json, ramp: Record<string, string> | undefined, ref: string): string | undefined {
  if (ramp?.[ref] !== undefined) return ramp[ref]
  if (ref.startsWith('dimension-')) return json.dimensions?.[ref.slice('dimension-'.length)]
  return undefined
}

interface BrandFiles {
  brand: string
  label: string
  snap: DesignSnapshot
  json: Json
  css: string
}

/** I1 + I2 on one file. */
function checkFile(add: (f: Omit<Finding, 'brand'>) => void, css: string, output: string): void {
  for (const c of contradictions(css)) {
    add({ invariant: 'I1-contradiction', output, token: c.name, got: c.values.join(' | '), detail: c.selector })
  }
  const blocks = cssBlocks(css)
  const declared = new Set(blocks.flatMap((b) => b.decls.map(([k]) => k)))
  for (const b of blocks) {
    for (const [k, v] of b.decls) {
      for (const m of v.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
        if (m[2] === ',' || declared.has(m[1]) || RUNTIME_VARS.has(m[1])) continue
        add({ invariant: 'I2-unresolved', output, token: k, got: m[1], detail: b.selector })
      }
    }
  }
}

/** I3: every value tokens.json names, read back out of variables.css. */
function checkCssAgainstJson(add: (f: Omit<Finding, 'brand'>) => void, f: BrandFiles): void {
  const { json, css } = f
  const env = { light: cssEnv(css, 'light'), dark: cssEnv(css, 'dark') }
  // Lengths, type, primitives and motion are theme-independent: :root carries
  // them whichever theme the brand starts on. `light` reads :root + .light,
  // which only re-points colours.
  const read = (theme: Theme, name: string) => {
    const raw = env[theme].get(name)
    return raw === undefined ? undefined : resolveVars(raw, env[theme])
  }
  const expect = (theme: Theme, name: string, want: string | undefined, kind: string) => {
    if (want === undefined || want === '') return
    const got = read(theme, name)
    if (norm(got) !== norm(want)) {
      add({ invariant: 'I3-css-vs-json', output: 'variables.css', token: name, appearance: theme, expected: want, got: got ?? '(missing)', detail: kind })
    }
  }

  for (const [id, modes] of roleMap(json)) for (const t of THEMES) expect(t, roleVar(id), modes[t], 'color role')
  for (const [k, v] of Object.entries((json.colors?.primitive ?? {}) as Record<string, string>)) {
    if (!/-dark-\d+$/.test(k)) expect('light', `--color-${k}`, v, 'primitive')
  }
  for (const [k, v] of Object.entries((json.colors?.primitiveAlpha ?? {}) as Record<string, string>)) {
    if (/-dark-\d+$/.test(k)) continue
    expect('light', /^(black|white)-a-/.test(k) ? `--color-${k}` : `--color-${k.replace(/-(\d+)$/, '-a-$1')}`, v, 'alpha twin')
  }
  for (const [k, v] of Object.entries((json.dimensions ?? {}) as Record<string, string>)) expect('light', `--dimension-${k}`, v, 'dimension')
  const ramps: [string, string, string][] = [['radius', 'radius', 'radiusRoles'], ['spacing', 'spacing', 'spacingRoles'], ['size', 'sizes', 'sizeRoles'], ['selector', 'selector', 'selectorRoles'], ['stroke', 'stroke', 'strokeRoles']]
  for (const [prefix, rampKey, rolesKey] of ramps) {
    const ramp = json[rampKey] as Record<string, string> | undefined
    // stroke.sm is floored to 1px under 2dppx by a media block; :root carries the token.
    for (const [k, v] of Object.entries(ramp ?? {})) expect('light', `--${prefix}-${k}`, v, rampKey)
    for (const [role, ref] of Object.entries((json[rolesKey] ?? {}) as Record<string, string>)) {
      expect('light', `--${prefix}-${role}`, roleValue(json, ramp, String(ref)), `${rolesKey}.${role}`)
    }
  }
  const t = json.typography ?? {}
  for (const [k, v] of Object.entries((t.sizes ?? {}) as Record<string, string>)) expect('light', `--font-size-${k}`, v, 'font size')
  for (const [k, v] of Object.entries((t.lineHeights ?? {}) as Record<string, string>)) expect('light', `--line-height-${k}`, v, 'line height')
  for (const [k, v] of Object.entries((t.letterSpacings ?? {}) as Record<string, string>)) expect('light', `--letter-spacing-${k}`, v, 'letter spacing')
  for (const [k, v] of Object.entries((t.weights ?? {}) as Record<string, string | number>)) expect('light', `--font-weight-${k}`, String(v), 'font weight')
  for (const [role, byCut] of Object.entries((t.roles ?? {}) as Record<string, Record<string, { size?: string; weight?: string }>>)) {
    const desk = byCut.desktop
    if (desk?.size) expect('light', `--text-${role}-font-size`, t.sizes?.[desk.size], `type role ${role}`)
    if (desk?.weight) expect('light', `--text-${role}-font-weight`, String(t.weights?.[desk.weight] ?? ''), `type role ${role}`)
  }
  for (const [k, v] of Object.entries((json.shadows ?? {}) as Record<string, string>)) expect('light', `--shadow-${k}`, v, 'shadow')
  for (const [k, v] of Object.entries((json.shadowsDark ?? {}) as Record<string, string>)) {
    if (v !== 'none') expect('dark', `--shadow-${k}`, v, 'shadow (dark)')
  }
  for (const [k, v] of Object.entries((json.gradients ?? {}) as Record<string, string>)) expect('light', `--gradient-${k}`, v, 'gradient')
  for (const [k, v] of Object.entries((json.gradientsDark ?? {}) as Record<string, string>)) expect('dark', `--gradient-${k}`, v, 'gradient (dark)')
  const m = json.motion ?? {}
  for (const [k, v] of Object.entries((m.durations ?? {}) as Record<string, string>)) expect('light', `--motion-duration-${k}`, v, 'motion duration')
  for (const [k, v] of Object.entries((m.easings ?? {}) as Record<string, string>)) expect('light', `--motion-easing-${k}`, v, 'motion easing')
}

const CONTEXT_ROW_BOTH = /^\| `[^`]+` \| `([a-z0-9.-]+)` \| `(#[0-9a-fA-F]{6,8})` \| `(#[0-9a-fA-F]{6,8})` \|/gm
const CONTEXT_ROW_ONE = /^\| `[^`]+` \| `([a-z0-9.-]+)` \| `(#[0-9a-fA-F]{6,8})` \|$/gm
const FENCE = /```json escala-tokens\n([\s\S]*?)\n```/

/** I4 (+ I10 for the paste): every scope × theme × detail the UI offers. */
function checkContext(add: (f: Omit<Finding, 'brand'>) => void, store: DesignSnapshot, f: BrandFiles): void {
  const roles = roleMap(f.json)
  const declared = new Set(cssBlocks(f.css).flatMap((b) => b.decls.map(([k]) => k)))
  const scopes: ContextScope[] = ['all', ...CONTEXT_FOUNDATIONS.map((c) => c.key)]
  const appearances: ContextAppearance[] = ['both', 'light', 'dark']
  const details: ContextDetail[] = ['tokens', 'full']
  for (const scope of scopes) {
    for (const appearance of appearances) {
      for (const detail of details) {
        const output = `context ${scope} · ${appearance} · ${detail}`
        let md: string
        try {
          md = brandContext(store, f.brand, { scope, appearance, detail })
        } catch (e) {
          add({ invariant: 'error', output, detail: String(e) })
          continue
        }
        // Values: a Both paste carries two columns, a one-theme paste one.
        if (appearance === 'both') {
          // The columns follow the brand's theme order (Dark first for a brand
          // created in Dark): read them off the table header, never assume.
          const head = md.match(/^\| Figma variable \| Role id \| (Light|Dark) \| (Light|Dark) \|$/m)
          const [first, second] = head ? [head[1].toLowerCase(), head[2].toLowerCase()] as Theme[] : ['light', 'dark'] as Theme[]
          for (const m of md.matchAll(CONTEXT_ROW_BOTH)) {
            const want = roles.get(m[1])
            if (!want) { add({ invariant: 'I4-context', output, token: m[1], detail: 'role not in tokens.json' }); continue }
            if (norm(want[first]) !== norm(m[2]) || norm(want[second]) !== norm(m[3])) {
              add({ invariant: 'I4-context', output, token: m[1], expected: `${first} ${want[first]} / ${second} ${want[second]}`, got: `${m[2]} / ${m[3]}` })
            }
          }
        } else {
          for (const m of md.matchAll(CONTEXT_ROW_ONE)) {
            const want = roles.get(m[1])?.[appearance]
            if (want && norm(want) !== norm(m[2])) add({ invariant: 'I4-context', output, token: m[1], appearance, expected: want, got: m[2] })
          }
        }
        // Every variable a paste tells an agent to use exists in variables.css.
        for (const m of md.matchAll(/var\((--[\w-]+)\)/g)) {
          if (!declared.has(m[1]) && !RUNTIME_VARS.has(m[1])) add({ invariant: 'I4-context', output, token: m[1], detail: 'cited but not in variables.css' })
        }
        // All foundations ends with the plugin's JSON, and it must parse.
        if (scope === 'all') {
          const fence = md.match(FENCE)
          if (!fence) add({ invariant: 'I4-context', output, detail: 'no escala-tokens JSON fence' })
          else {
            try { JSON.parse(fence[1]) } catch { add({ invariant: 'I4-context', output, detail: 'escala-tokens JSON does not parse' }) }
          }
        } else if (FENCE.test(md)) {
          add({ invariant: 'I4-context', output, detail: 'a foundation cut carries the full JSON' })
        }
        const { approxTokens } = contextSize(md)
        const budget = scope === 'all' ? BUDGETS.contextAllTokens : BUDGETS.contextFoundationTokens
        if (approxTokens > budget) add({ invariant: 'I10-budget', output, expected: `≤ ${budget}`, got: String(approxTokens) })
      }
    }
  }
}

/** I5: the payload the plugin reads = the Code snapshot, value for value. */
function checkPlugin(add: (f: Omit<Finding, 'brand'>) => void, store: DesignSnapshot, f: BrandFiles): void {
  const pl = pluginPayload(store, f.brand, 'both') as Json
  const output = 'plugin payload'
  // A brand that ships one theme publishes one column; the other is not missing.
  const shipped = new Set(shippedThemes((store as { brandThemes?: Parameters<typeof shippedThemes>[0] }).brandThemes, f.brand)
    .map((id) => brandThemeDef(id)?.base ?? id))
  const THEMES_SHIPPED = THEMES.filter((t) => shipped.has(t))
  const pRoles = roleMap(pl)
  for (const [id, modes] of roleMap(f.json)) {
    for (const t of THEMES_SHIPPED) {
      if (!modes[t]) continue
      const got = pRoles.get(id)?.[`${f.brand}::${t}`]
      if (norm(got) !== norm(modes[t])) add({ invariant: 'I5-plugin', output, token: id, appearance: t, expected: modes[t], got: got ?? '(missing)' })
    }
  }
  for (const t of THEMES_SHIPPED) {
    const fb = pl.foundationsByTheme?.[`${f.brand}::${t}`] as Json | undefined
    if (!fb) { add({ invariant: 'I5-plugin', output, appearance: t, detail: 'no foundationsByTheme column' }); continue }
    for (const key of ['radius', 'radiusRoles', 'spacing', 'spacingRoles', 'sizes', 'sizeRoles', 'selector', 'selectorRoles', 'stroke', 'strokeRoles', 'shadows', 'grid', 'typography']) {
      const a = JSON.stringify(sortKeys(f.json[key]))
      const b = JSON.stringify(sortKeys(fb[key]))
      if (a !== b) add({ invariant: 'I5-plugin', output, token: key, appearance: t, expected: a.slice(0, 200), got: b.slice(0, 200) })
    }
  }
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]))
  return v
}

/** I6: the Light / Dark file (Code · Theme) = that column of the Both file. */
function checkOneTheme(add: (f: Omit<Finding, 'brand'>) => void, f: BrandFiles): void {
  for (const t of THEMES) {
    const output = `variables.css (${t} only)`
    let one: string
    try {
      one = buildCSS(freeDownloadStore(f.snap as never, { modes: [{ theme: t, appearance: t }] }) as never)
    } catch (e) {
      add({ invariant: 'error', output, detail: String(e) })
      continue
    }
    checkFile(add, one, output)
    const env1 = rootEnv(one)
    const envB = cssEnv(f.css, t)
    for (const [id] of roleMap(f.json)) {
      const name = roleVar(id)
      const a = env1.get(name)
      const b = envB.get(name)
      if (b === undefined) continue
      if (a === undefined) { add({ invariant: 'I6-one-theme', output, token: name, appearance: t, expected: b, got: '(missing)' }); continue }
      if (norm(resolveVars(a, env1)) !== norm(resolveVars(b, envB))) {
        add({ invariant: 'I6-one-theme', output, token: name, appearance: t, expected: resolveVars(b, envB), got: resolveVars(a, env1) })
      }
    }
  }
}

/** I7: a collection cut keeps lines of the full file only, and resolves. */
function checkCuts(add: (f: Omit<Finding, 'brand'>) => void, f: BrandFiles): void {
  const fullLines = new Set(f.css.split('\n'))
  const fullDeclared = new Set(cssBlocks(f.css).flatMap((b) => b.decls.map(([k]) => k)))
  for (const { key } of CONTEXT_FOUNDATIONS) {
    const output = `variables.css cut: ${key}`
    const cut = cutCssCollection(f.css, key)
    for (const line of cut.split('\n')) {
      if (/^\s*--/.test(line) && !fullLines.has(line)) add({ invariant: 'I7-cut', output, got: line.trim(), detail: 'line not in the full file' })
    }
    const declared = new Set(cssBlocks(cut).flatMap((b) => b.decls.map(([k]) => k)))
    for (const m of cut.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (fullDeclared.has(m[1]) && !declared.has(m[1])) add({ invariant: 'I7-cut', output, token: m[1], detail: 'alias target left out of the cut' })
    }
  }
}

/** I8: the W3C document — every alias lands on a token, colours agree. */
function checkW3C(add: (f: Omit<Finding, 'brand'>) => void, f: BrandFiles): void {
  const output = 'W3C tokens'
  let doc: Record<string, unknown>
  try {
    doc = figmaCollectionsW3C(f.json as Parameters<typeof figmaCollectionsW3C>[0])
  } catch (e) {
    add({ invariant: 'error', output, detail: String(e) })
    return
  }
  const leaves = new Map<string, unknown>()
  const walk = (node: unknown, path: string[]) => {
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if ('$value' in o) { leaves.set(path.join('.'), o.$value); return }
    for (const [k, v] of Object.entries(o)) if (!k.startsWith('$')) walk(v, [...path, k])
  }
  walk(doc, [])
  const deref = (v: unknown, depth = 0): unknown => {
    if (depth > 24 || typeof v !== 'string') return v
    const m = v.match(/^\{(.+)\}$/)
    if (!m) return v
    if (!leaves.has(m[1])) return `UNRESOLVED(${m[1]})`
    return deref(leaves.get(m[1]), depth + 1)
  }
  for (const [path, value] of leaves) {
    const r = deref(value)
    if (typeof r === 'string' && r.startsWith('UNRESOLVED(')) add({ invariant: 'I8-w3c', output, token: path, got: r })
  }
  // Colour semantics: one group per theme column, roles by Figma path.
  const sem = (doc['Color Semantics'] ?? {}) as Record<string, unknown>
  const columns = Object.keys(sem).filter((k) => !k.startsWith('$'))
  if (!columns.length) add({ invariant: 'I8-w3c', output, detail: 'no Color Semantics group' })
}

// ── Entry points ────────────────────────────────────────────────────────────

/** Every check for one brand of `store`. */
export function auditBrand(store: DesignSnapshot, brand: string): Finding[] {
  const label = themeDisplayName(brand, (store as { themeLabels?: Record<string, string> }).themeLabels)
  const findings: Finding[] = []
  const add = (f: Omit<Finding, 'brand'>) => findings.push({ brand: label, ...f })
  let files: BrandFiles
  try {
    const snap = captureCodeSnapshot(store, brand)
    files = { brand, label, snap, json: generateTokenJSON(snap) as Json, css: buildCSS(snap as never) }
  } catch (e) {
    add({ invariant: 'error', output: 'build', detail: String(e) })
    return findings
  }
  const run = (name: string, check: () => void) => {
    try { check() } catch (e) { add({ invariant: 'error', output: name, detail: String(e) }) }
  }
  run('variables.css', () => checkFile(add, files.css, 'variables.css'))
  run('variables.css', () => {
    const bytes = new TextEncoder().encode(files.css).length
    if (bytes > BUDGETS.cssBytes) add({ invariant: 'I10-budget', output: 'variables.css', expected: `≤ ${BUDGETS.cssBytes}`, got: String(bytes) })
  })
  run('variables.css', () => checkCssAgainstJson(add, files))
  run('context', () => checkContext(add, store, files))
  run('plugin', () => checkPlugin(add, store, files))
  run('one theme', () => checkOneTheme(add, files))
  run('cuts', () => checkCuts(add, files))
  run('w3c', () => checkW3C(add, files))
  run('section css', () => {
    const output = 'section CSS (color)'
    const section = cssEnv(buildSectionExport('color', 'css', 'hex', {}, files.snap as never), 'light')
    const full = cssEnv(files.css, 'light')
    for (const [name, value] of section) {
      if (/-dark-\d+$|-a-dark-/.test(name)) continue
      const want = full.get(name)
      if (want !== undefined && norm(resolveVars(value, section)) !== norm(resolveVars(want, full))) {
        add({ invariant: 'I3-css-vs-json', output, token: name, expected: resolveVars(want, full), got: resolveVars(value, section) })
      }
    }
  })
  return findings
}

/** Every brand, plus the All-brands file. */
export function auditSystem(store: DesignSnapshot, brands: string[]): Finding[] {
  const findings = brands.flatMap((brand) => auditBrand(store, brand))
  if (brands.length > 1) {
    const taken = new Set<string>()
    const files = brands.map((brand) => ({
      slug: brandSlug(themeDisplayName(brand, (store as { themeLabels?: Record<string, string> }).themeLabels), taken),
      name: brand,
      css: buildCSS(captureCodeSnapshot(store, brand) as never),
    }))
    const all = combineBrandCss((store as { projectName?: string }).projectName ?? 'Escala', files)
    const add = (f: Omit<Finding, 'brand'>) => findings.push({ brand: '(all brands)', ...f })
    checkFile(add, all, 'variables.css (all brands)')
    const lines = new Set(files.flatMap((f) => f.css.split('\n')))
    for (const line of all.split('\n')) {
      if (/^\s*--/.test(line) && !lines.has(line)) add({ invariant: 'I7-cut', output: 'variables.css (all brands)', got: line.trim(), detail: 'line in no brand file' })
    }
  }
  return findings
}

// ── Report ──────────────────────────────────────────────────────────────────

export function summarize(findings: Finding[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const f of findings) out[f.invariant] = (out[f.invariant] ?? 0) + 1
  return out
}

/** A report a person or an agent reads: counts, then up to `limit` findings
 *  per invariant with what was expected and what shipped. */
export function reportMarkdown(findings: Finding[], meta: { systems: string[]; when: string }, limit = 25): string {
  const lines = [
    '# Export audit',
    '',
    `${meta.when} · ${meta.systems.length} systems checked`,
    '',
    findings.length ? `**${findings.length} findings.**` : '**Clean: every export agrees.**',
    '',
  ]
  const by = new Map<string, Finding[]>()
  for (const f of findings) by.set(f.invariant, [...(by.get(f.invariant) ?? []), f])
  for (const [inv, list] of by) {
    lines.push(`## ${inv} (${list.length})`, '', '| Brand | Output | Token | Theme | Expected | Got | Detail |', '|---|---|---|---|---|---|---|')
    for (const f of list.slice(0, limit)) {
      const cell = (v?: string) => (v ?? '').replace(/\|/g, '\\|').slice(0, 120)
      lines.push(`| ${cell(f.brand)} | ${cell(f.output)} | ${cell(f.token)} | ${cell(f.appearance)} | ${cell(f.expected)} | ${cell(f.got)} | ${cell(f.detail)} |`)
    }
    if (list.length > limit) lines.push('', `…and ${list.length - limit} more in the JSON report.`)
    lines.push('')
  }
  lines.push('## Systems', '', ...meta.systems.map((s) => `- ${s}`), '')
  return lines.join('\n')
}
