#!/usr/bin/env node
// Parity check (refactor D3): every component name the library draws — a `data-escala="Name"` under
// src/components/escala-ui, `_skeleton/` excluded — has a Storybook story (apps/storybook/stories/<Name>.stories.tsx, or a
// story whose `title` ends in `/<Name>`). Names with no story are listed and the process exits 1: that is the check.
//
//   node scripts/check-story-parity.mjs            human list
//   node scripts/check-story-parity.mjs --json     { names, missing } for tooling
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const uiDir = join(root, 'src/components/escala-ui')
const storyDir = join(root, 'apps/storybook/stories')

/** `data-escala="Name"` (JSX) or `'data-escala': 'Name'` (a props object). A dynamic `data-escala={x}` is not a name. */
const NAME_RE = /data-escala(?:=|['"]?\s*:\s*)\s*['"]([A-Za-z][A-Za-z0-9]*)['"]/g

const names = new Map() // name → files that draw it
for (const file of readdirSync(uiDir).filter((f) => /\.tsx?$/.test(f))) {
  for (const m of readFileSync(join(uiDir, file), 'utf8').matchAll(NAME_RE)) {
    if (!names.has(m[1])) names.set(m[1], new Set())
    names.get(m[1]).add(file)
  }
}

const covered = new Set()
for (const file of readdirSync(storyDir).filter((f) => f.endsWith('.stories.tsx'))) {
  covered.add(file.replace(/\.stories\.tsx$/, ''))
  const title = /title:\s*['"]([^'"]+)['"]/.exec(readFileSync(join(storyDir, file), 'utf8'))?.[1]
  if (title) covered.add(title.split('/').pop())
}

const missing = [...names.keys()].filter((n) => !covered.has(n)).sort()

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ names: [...names.keys()].sort(), missing }, null, 2))
} else if (missing.length) {
  console.error(`✗ ${missing.length} of ${names.size} components have no Storybook story:\n`)
  for (const n of missing) console.error(`  - ${n}  (${[...names.get(n)].join(', ')})`)
  console.error('\nAdd apps/storybook/stories/<Name>.stories.tsx, or move the file to escala-ui/_skeleton/.')
} else {
  console.log(`✓ all ${names.size} components have a story`)
}
process.exit(missing.length ? 1 : 0)
