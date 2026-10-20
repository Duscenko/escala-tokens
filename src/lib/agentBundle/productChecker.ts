import { figmaPrimitiveName, figmaSemanticName, figmaSpacingName, webCodeSyntax } from './names'
import { cssExpectations, type PackageStamp } from './stamp'
import type { AgentBundleFile, TokenJSON } from './types'

interface LintEntry {
  needle: string
  token: string
  css: string
}

function collectEntries(json: TokenJSON): LintEntry[] {
  const out: LintEntry[] = []
  const seen = new Set<string>()
  const add = (needle: string, token: string, css: string) => {
    const key = needle.toLowerCase()
    if (!needle || seen.has(key)) return
    seen.add(key)
    out.push({ needle, token, css })
  }

  const arch = json.colors.architecture?.tokens
  if (arch) {
    for (const [group, byKey] of Object.entries(arch)) {
      for (const [key, byTheme] of Object.entries(byKey)) {
        const id = `${group}.${key}`
        for (const hex of Object.values(byTheme)) {
          if (hex && !hex.startsWith('{')) add(hex, figmaSemanticName(id), webCodeSyntax(id))
        }
      }
    }
  }

  for (const roles of Object.values(json.colors.themes ?? {})) {
    for (const [id, hex] of Object.entries(roles)) {
      if (hex) add(hex, id, `var(--color-${id.replace(/\./g, '-')})`)
    }
  }

  for (const [key, hex] of Object.entries(json.colors.primitive ?? {})) {
    if (hex) add(hex, key, `var(--color-${key})`)
  }

  for (const [k, v] of Object.entries(json.spacing ?? {})) {
    add(v, figmaSpacingName(k), `var(--spacing-${k})`)
  }
  for (const [k, v] of Object.entries(json.radius ?? {})) {
    add(v, k, `var(--radius-${k})`)
  }
  for (const [k, v] of Object.entries(json.sizes ?? {})) {
    add(v, k, `var(--size-${k})`)
  }

  return out
}

/** Dependency-free Node checker generated from THIS system's tokens. */
export function buildCheckerFile(json: TokenJSON, stamp?: PackageStamp): AgentBundleFile {
  const project = json.project?.trim() || 'Design system'
  const entries = collectEntries(json)
  const payload = JSON.stringify(entries, null, 2)
  const text = `#!/usr/bin/env node
// token-lint — generated for ${project}. Do not hand-edit the MAP.
// Usage: node checkers/token-lint.mjs [file ...]        flag hex/px that already have a token (stdin if no files)
//        node checkers/token-lint.mjs --check-version [--css path/to/variables.css]
//                                                       is this package the system variables.css ships?
// Linting also warns (without failing) when the repo's variables.css is another version.

const MAP = ${payload}

const STAMP = ${JSON.stringify(stamp ?? null)}

// The values variables.css resolves on :root for the system this package was generated from.
const EXPECT = ${JSON.stringify(cssExpectations(json), null, 2)}

const HEX = /#(?:[0-9a-fA-F]{3,8})\\b/g
const PX = /\\b\\d+px\\b/g

function lookup(raw) {
  const needle = raw.toLowerCase()
  return MAP.find((e) => e.needle.toLowerCase() === needle)
}

function lint(source, label) {
  const hits = []
  for (const re of [HEX, PX]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(source))) {
      const entry = lookup(m[0])
      if (entry) hits.push({ value: m[0], token: entry.token, css: entry.css, index: m.index })
    }
  }
  for (const h of hits) {
    console.log(label + ':' + h.index + '  ' + h.value + '  →  ' + h.css + '  (' + h.token + ')')
  }
  return hits.length
}

async function read(path) {
  const { readFile } = await import('node:fs/promises')
  return readFile(path, 'utf8')
}

// ── Version check ──────────────────────────────────────────────────────────

const CSS_CANDIDATES = ['variables.css', 'src/variables.css', 'src/styles/variables.css', 'styles/variables.css', 'app/variables.css']

function rootDeclarations(css) {
  const start = css.indexOf(':root {')
  if (start < 0) return {}
  const body = css.slice(start, css.indexOf('\\n}', start)).replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
  const out = {}
  for (const m of body.matchAll(/(--[\\w-]+)\\s*:\\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

function resolve(decls, name) {
  let value = decls[name]
  for (let i = 0; i < 8 && value; i++) {
    const m = /^var\\((--[\\w-]+)(?:\\s*,[^)]*)?\\)$/.exec(value)
    if (!m) break
    value = decls[m[1]]
  }
  return value === undefined ? undefined : value.toLowerCase()
}

/** Tokens whose value in this variables.css is not the one the package was written for. */
export function versionDrift(css) {
  const decls = rootDeclarations(css)
  const drift = []
  for (const [name, want] of Object.entries(EXPECT)) {
    const got = resolve(decls, name)
    if (got !== want) drift.push({ name, want, got: got ?? 'missing' })
  }
  return drift
}

async function findCss(explicit) {
  const { existsSync } = await import('node:fs')
  if (explicit) return existsSync(explicit) ? explicit : null
  return CSS_CANDIDATES.find((p) => existsSync(p)) ?? null
}

async function checkVersion(explicit, loud) {
  const path = await findCss(explicit)
  if (!path) {
    if (loud) console.error('No variables.css found. Pass --css <path>.')
    return loud ? 2 : 0
  }
  const drift = versionDrift(await read(path))
  const stamp = STAMP ? ' (generated ' + STAMP.generated + ', fingerprint ' + STAMP.fingerprint + ')' : ''
  if (!drift.length) {
    if (loud) console.log(path + ' matches this package' + stamp + '.')
    return 0
  }
  console.error('This package is from another version of ${project} than ' + path + stamp + ': ' + drift.length + ' token(s) differ.')
  for (const d of drift.slice(0, loud ? 50 : 5)) console.error('  ' + d.name + '  package ' + d.want + '  css ' + d.got)
  console.error('Export the package again from Escala (or push to GitHub) so it matches.')
  return 1
}

const args = process.argv.slice(2)
const cssAt = args.indexOf('--css')
const cssPath = cssAt >= 0 ? args[cssAt + 1] : undefined
const files = args.filter((a, i) => !a.startsWith('--') && (cssAt < 0 || i !== cssAt + 1))
if (args.includes('--check-version')) process.exit(await checkVersion(cssPath, true))
await checkVersion(cssPath, false)
let total = 0
if (files.length === 0) {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  total += lint(chunks.join(''), 'stdin')
} else {
  for (const f of files) total += lint(await read(f), f)
}
if (total) {
  console.error(total + ' leftover value(s) already have a token in ${project}.')
  process.exit(1)
}
`
  return { path: 'checkers/token-lint.mjs', text }
}

export function lintEntriesForTest(json: TokenJSON): LintEntry[] {
  return collectEntries(json)
}
