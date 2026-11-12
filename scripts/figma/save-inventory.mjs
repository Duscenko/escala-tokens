#!/usr/bin/env node
// Saves the Figma component inventory as spec/figma-components.json.
//
//   node scripts/figma/save-inventory.mjs <raw.json> <checksum>   write the snapshot
//   node scripts/figma/save-inventory.mjs --check                  verify the snapshot
//
// <raw.json> is the `json` string `components-inventory.figma.js` returns, saved as a
// file; <checksum> is the `checksum` it returns next to it. A copy that does not hash
// to the same value is refused, so a snapshot can never be a hand-edited approximation
// of the file. The snapshot stores the pages exactly as Figma returned them, so
// `--check` re-derives the checksum from them.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const out = join(root, 'spec/figma-components.json')

export const FIGMA_FILE = { key: '7j5zukN5HpihGVJMmyjA20', name: 'Escala Design System (Real)' }

function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return ('00000000' + h.toString(16)).slice(-8)
}

const [arg, expected] = process.argv.slice(2)

if (arg === '--check') {
  const snap = JSON.parse(readFileSync(out, 'utf8'))
  const got = fnv1a(JSON.stringify(snap.pages))
  if (got !== snap.checksum) {
    console.error(`✗ spec/figma-components.json was edited by hand: checksum ${got}, recorded ${snap.checksum}`)
    process.exit(1)
  }
  console.log(`✓ spec/figma-components.json matches Figma's export (${snap.checksum})`)
  process.exit(0)
}

if (!arg || !expected) {
  console.error('usage: save-inventory.mjs <raw.json> <checksum> | --check')
  process.exit(2)
}

const raw = readFileSync(arg, 'utf8').replace(/\n$/, '')
const got = fnv1a(raw)
if (got !== expected) {
  console.error(`✗ checksum ${got} ≠ ${expected}: the copy is not what Figma returned`)
  process.exit(1)
}
const pages = JSON.parse(raw)
const snap = {
  $comment: 'GENERATED from the Figma file by scripts/figma/components-inventory.figma.js + save-inventory.mjs. Never edit by hand.',
  file: FIGMA_FILE,
  exportedAt: new Date().toISOString().slice(0, 10),
  checksum: got,
  pages,
}
writeFileSync(out, JSON.stringify(snap, null, 2) + '\n')
console.log(`✓ wrote spec/figma-components.json — ${pages.length} pages, ${pages.reduce((n, p) => n + p.sets.length, 0)} sets (${got})`)
