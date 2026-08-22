import { figmaPrimitiveName, figmaSemanticName, figmaSpacingName, webCodeSyntax } from './names'
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
export function buildCheckerFile(json: TokenJSON): AgentBundleFile {
  const project = json.project?.trim() || 'Design system'
  const entries = collectEntries(json)
  const payload = JSON.stringify(entries, null, 2)
  const text = `#!/usr/bin/env node
// token-lint — generated for ${project}. Do not hand-edit the MAP.
// Usage: node checkers/token-lint.mjs [file ...]
// Reads stdin if no files given. Flags hex/px that already have a token.

const MAP = ${payload}

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

const files = process.argv.slice(2)
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
