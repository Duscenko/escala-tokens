#!/usr/bin/env node
// Writes the Storybook family structure (spec/storybook-families.json) into the story files.
// Plan: design-plans/storybook-families.md. Idempotent: run it after editing the manifest or after adding a story.
//
//   node scripts/storybook/apply-families.mjs           write, and print the story ids that changed
//   node scripts/storybook/apply-families.mjs --check   change nothing; exit 1 if a file is out of step
//
// What it writes, per component set with a story file `apps/storybook/stories/<Set>.stories.tsx`:
//   - `title: '<folder>/<family>'` — a part shares its family's title, so Storybook merges it into the family's
//     sidebar entry (verified on Storybook 10.6: same-title CSF files merge);
//   - a part gets `tags: ['!autodocs', 'part']` (one Documentation per family; `part` is hidden in the sidebar by
//     default, see .storybook/main.ts) and its exports are prefixed with its set name (`Playground` →
//     `CalendarDayPlayground`, shown as `CalendarDay · Playground`) so they never collide with the root's ids.
// Story ids that change are rewritten wherever the repo names them (checks, governance).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toId, storyNameFromExport } from 'storybook/internal/csf'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const STORIES = join(ROOT, 'apps/storybook/stories')
const CHECK = process.argv.includes('--check')
const manifest = JSON.parse(readFileSync(join(ROOT, 'spec/storybook-families.json'), 'utf8'))

/** Every set (and composed root) with its family title and role. */
export function familyPlan(m = manifest) {
  const plan = []
  for (const f of m.families) {
    const title = `${f.folder}/${f.id}`
    plan.push({ set: f.root ?? f.id, title, role: 'root', family: f.id, composed: !f.root })
    for (const p of f.parts) plan.push({ set: p, title, role: 'part', family: f.id })
  }
  return plan
}

const TAGS_LINE = "  tags: ['!autodocs', 'part'],"
const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function transform(src, entry) {
  const ids = []
  const oldTitle = src.match(/^\s*title:\s*'([^']+)'/m)?.[1]
  if (!oldTitle) throw new Error(`${entry.set}: no static title`)
  let out = src.replace(/^(\s*title:\s*)'[^']+'/m, `$1${quote(entry.title)}`)

  if (entry.role === 'part') {
    if (!out.includes(TAGS_LINE)) out = out.replace(/^(\s*title:\s*'[^']+',?)$/m, `$1\n${TAGS_LINE}`)
    const lines = out.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^export const ([A-Za-z0-9_]+): Story = (\{.*\}|\{)(.*)$/)
      if (!m) continue
      const [, exp, open, rest] = m
      const prefixed = exp.startsWith(entry.set) && exp !== entry.set
      const newExp = prefixed ? exp : `${entry.set}${exp}`
      const base = prefixed ? exp.slice(entry.set.length) : exp
      const label = quote(`${entry.set} · ${storyNameFromExport(base)}`)
      if (open !== '{') {
        // A one-line object: `{}` or `{ args: … }`.
        const body = open.slice(1, -1).trim()
        const named = /(^|,\s*)name:/.test(body)
        lines[i] = `export const ${newExp}: Story = ${named ? open : body ? `{ name: ${label}, ${body} }` : `{ name: ${label} }`}${rest}`
      } else {
        // A block: prefix an existing story-level `name:`, else add one.
        let j = i + 1, named = -1
        for (; j < lines.length && !/^\}/.test(lines[j]); j++) if (/^  name: '/.test(lines[j])) named = j
        if (named >= 0) {
          lines[named] = lines[named].replace(/^  name: '(.*)',$/, (_, n) => n.startsWith(`${entry.set} · `) ? `  name: '${n}',` : `  name: ${quote(`${entry.set} · ${n.replace(/\\'/g, "'")}`)},`)
        } else {
          lines.splice(i + 1, 0, `  name: ${quote(`${entry.set} · ${storyNameFromExport(base)}`)},`)
        }
        lines[i] = `export const ${newExp}: Story = ${open}${rest}`
      }
      if (newExp !== exp || oldTitle !== entry.title) ids.push([toId(oldTitle, storyNameFromExport(exp)), toId(entry.title, storyNameFromExport(newExp))])
    }
    out = lines.join('\n')
  } else if (oldTitle !== entry.title) {
    for (const m of src.matchAll(/^export const ([A-Za-z0-9_]+): Story\b/gm)) ids.push([toId(oldTitle, storyNameFromExport(m[1])), toId(entry.title, storyNameFromExport(m[1]))])
    ids.push([toId(oldTitle, 'Documentation'), toId(entry.title, 'Documentation')])
  }
  return { out, ids }
}

function walk(dir, exts) {
  const found = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) found.push(...walk(p, exts))
    else if (exts.some((e) => name.endsWith(e))) found.push(p)
  }
  return found
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = [], idMap = []
  for (const entry of familyPlan()) {
    const file = join(STORIES, `${entry.set}.stories.tsx`)
    if (!existsSync(file)) continue
    const src = readFileSync(file, 'utf8')
    const { out, ids } = transform(src, entry)
    if (out !== src) { changed.push(entry.set); if (!CHECK) writeFileSync(file, out) }
    idMap.push(...ids)
  }
  if (CHECK) {
    if (changed.length) { console.error(`Out of step with spec/storybook-families.json: ${changed.join(', ')}\nRun: node scripts/storybook/apply-families.mjs`); process.exit(1) }
    console.log('Story files match spec/storybook-families.json.')
    process.exit(0)
  }
  // Rewrite references to the ids that moved — in this run, and every id a set had before families existed
  // (`<folder>/<Set>` titles, `Form Controls/Input`), so a branch written against the old ids is fixed by a re-run.
  const legacy = []
  const OLD_FOLDERS = [...manifest.folders, 'Form Controls']
  for (const entry of familyPlan()) {
    const file = join(STORIES, `${entry.set}.stories.tsx`)
    if (!existsSync(file)) continue
    const exps = [...readFileSync(file, 'utf8').matchAll(/^export const ([A-Za-z0-9_]+): Story\b/gm)].map((m) => m[1])
    for (const folder of OLD_FOLDERS) {
      const oldTitle = `${folder}/${entry.set}`
      if (oldTitle === entry.title) continue
      for (const e of exps) {
        const local = entry.role === 'part' && e.startsWith(entry.set) && e !== entry.set ? e.slice(entry.set.length) : e
        legacy.push([toId(oldTitle, storyNameFromExport(local)), toId(entry.title, storyNameFromExport(e))])
      }
      legacy.push([toId(oldTitle, 'Documentation'), toId(entry.title, 'Documentation')])
    }
  }
  // Stories renamed or folded in the same change (F3/F4 of the plan): their old ids point at the survivor.
  const RETIRED = [
    ['form-controls-input--all-types', 'forms-input--types'], ['forms-input--all-types', 'forms-input--types'],
    ['buttons-fabgroup--all-layouts', 'buttons-fabbutton--fab-group-layouts'],
    ['forms-comboboxgrouplabel--all-sizes', 'forms-combobox--combobox-group-label-sizes'],
    ['content-surfaces-accordion--all-variants', 'content-surfaces-accordion--all-combinations'],
    ['forms-datepickerpopover--opens-from-trigger', 'forms-datepicker--playground'],
    ['content-surfaces-tableparts--playground', 'content-surfaces-table--table-caption-playground'],
    ['content-surfaces-tableparts--in-a-table', 'content-surfaces-table--table-empty-playground'],
    ['content-surfaces-tableparts--documentation', 'content-surfaces-table--documentation'],
  ]
  const moved = [...RETIRED, ...idMap, ...legacy].filter(([a, b]) => a !== b)
  const refFiles = [...walk(join(ROOT, 'scripts/storybook-checks'), ['.mjs']), ...walk(join(ROOT, 'governance'), ['.json', '.md', '.yaml'])]
  for (const f of refFiles) {
    const src = readFileSync(f, 'utf8')
    let out = src
    for (const [a, b] of moved) out = out.replace(new RegExp(`(?<![a-z0-9-])${a}(?![a-z0-9-])`, 'g'), b)
    if (out !== src) { writeFileSync(f, out); console.log(`refs: ${f.slice(ROOT.length + 1)}`) }
  }
  console.log(`${changed.length} story files written, ${moved.length} story ids moved.`)
  if (process.argv.includes('--ids')) for (const [a, b] of moved) console.log(`${a} → ${b}`)
}
