#!/usr/bin/env node
/**
 * `npm run gen:phosphor-icons`
 *
 * Reads the pinned `@phosphor-icons/core` package and writes:
 *   - `src/generated/phosphor-icons.ts`      — the icon INDEX (name + slug) plus
 *     `PHOSPHOR_CORE_BODIES`, the ~30 concept glyphs specimens render inline.
 *     This is the only file the app always bundles; it is tiny.
 *   - `src/generated/phosphor-body-<w>.ts`   — one file per weight, each a full
 *     `{ slug: innerMarkup }` map, lazy-loaded by the browser on demand.
 *   - `src/generated/phosphor-component-icons.ts` — the COMPONENT icon set
 *     (`src/lib/componentIcons.json`: eye, close, check, flag…) with its bodies
 *     in all six weights. Small and self-contained, so the Figma plugin bundles
 *     it too (`escala-figma-plugin/src/code.ts` imports it) and needs no network.
 *
 * Unlike the old Untitled catalog these files are COMMITTED — Phosphor is MIT,
 * so redistributing the glyphs is fine. The npm package stays the source of
 * truth; this script is the only way the glyphs enter the repo.
 *
 * Skips regeneration when the output already matches the installed version.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src/generated')
const indexFile = join(outDir, 'phosphor-icons.ts')

const WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone']

// The component icon set — Escala name → Phosphor slug. Its slugs are also the
// CORE bodies inlined (regular weight) in the small always-bundled index, so
// specimens render them synchronously; `PHOSPHOR_CORE` in `lib/iconLibraries.ts`
// reads the same list (a test asserts every one resolves to a body).
const componentListPath = join(root, 'src/lib/componentIcons.json')
const componentListRaw = readFileSync(componentListPath, 'utf8')
const COMPONENT_ICONS = JSON.parse(componentListRaw).icons
const componentHash = createHash('sha256').update(componentListRaw).digest('hex').slice(0, 12)
const CORE_SLUGS = [...new Set(COMPONENT_ICONS.map((i) => i.slug))]
const componentFile = join(outDir, 'phosphor-component-icons.ts')

const pkgDir = join(root, 'node_modules/@phosphor-icons/core')
const pkgPath = join(pkgDir, 'package.json')
if (!existsSync(pkgPath)) {
  throw new Error('Install @phosphor-icons/core first: npm i -D @phosphor-icons/core')
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const assetsDir = join(pkgDir, 'assets')

if (existsSync(indexFile)) {
  const prev = readFileSync(indexFile, 'utf8')
  const ver = /PHOSPHOR_ICONS_VERSION = ["']([^"']+)["']/.exec(prev)?.[1]
  const count = /PHOSPHOR_ICONS_COUNT = (\d+)/.exec(prev)?.[1]
  const missingCore = CORE_SLUGS.some((s) => !prev.includes(`"${s}":`))
  const componentUpToDate = existsSync(componentFile) &&
    readFileSync(componentFile, 'utf8').includes(`COMPONENT_ICONS_HASH = "${componentHash}"`)
  if (
    ver === pkg.version && count && Number(count) > 1000 && !missingCore && componentUpToDate &&
    WEIGHTS.every((w) => existsSync(join(outDir, `phosphor-body-${w}.ts`)))
  ) {
    console.log(`phosphor-icons catalog up to date (${pkg.version}, ${count} icons)`)
    process.exit(0)
  }
}

/** `address-book-tabs` → `AddressBookTabs`, `x` → `X`, `gear-six` → `GearSix`. */
function toName(slug) {
  return slug.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}

/** Inner markup between `<svg …>` and `</svg>` — paths verbatim, colour left to
 *  the wrapper (`fill="currentColor"` on the outer svg). */
function innerMarkup(svg, file) {
  const m = /<svg[^>]*>([\s\S]*)<\/svg>\s*$/.exec(svg)
  if (!m) throw new Error(`unparseable svg: ${file}`)
  return m[1].trim()
}

/** For a weight dir, `{ slug: innerMarkup }`. The file name carries the weight
 *  as a suffix for every weight except `regular` (`x-thin.svg`, `x.svg`). */
function readWeight(weight) {
  const dir = join(assetsDir, weight)
  const suffix = weight === 'regular' ? '' : `-${weight}`
  const out = {}
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.svg')) continue
    let slug = file.slice(0, -4)
    if (suffix && slug.endsWith(suffix)) slug = slug.slice(0, -suffix.length)
    out[slug] = innerMarkup(readFileSync(join(dir, file), 'utf8'), file)
  }
  return out
}

const bodies = Object.fromEntries(WEIGHTS.map((w) => [w, readWeight(w)]))
const slugs = Object.keys(bodies.regular).sort()
if (slugs.length < 1000) {
  throw new Error(`expected 1,500+ Phosphor icons, got ${slugs.length}`)
}

const icons = slugs
  .map((slug) => ({ name: toName(slug), slug }))
  .sort((a, b) => a.name.localeCompare(b.name))

const coreBodies = {}
for (const slug of CORE_SLUGS) {
  if (!bodies.regular[slug]) throw new Error(`core slug not in package: ${slug}`)
  coreBodies[slug] = bodies.regular[slug]
}

const componentList = COMPONENT_ICONS.map((i) => ({
  name: i.name, slug: i.slug, component: toName(i.slug), group: i.group, use: i.use,
}))

mkdirSync(outDir, { recursive: true })
const header = `/* Generated by scripts/fetch-phosphor-icons.mjs from ${pkg.name}@${pkg.version}. Do not edit. */\n`

writeFileSync(
  indexFile,
  header +
    `export const PHOSPHOR_ICONS_PACKAGE = ${JSON.stringify(pkg.name)}\n` +
    `export const PHOSPHOR_ICONS_VERSION = ${JSON.stringify(pkg.version)}\n` +
    `export const PHOSPHOR_ICONS_COUNT = ${icons.length}\n` +
    `export const PHOSPHOR_ICONS: { name: string; slug: string }[] = ${JSON.stringify(icons)}\n` +
    `export const PHOSPHOR_CORE_BODIES: Record<string, string> = ${JSON.stringify(coreBodies)}\n` +
    `/** The component icon set (src/lib/componentIcons.json) — names only; bodies are PHOSPHOR_CORE_BODIES. */\n` +
    `export const PHOSPHOR_COMPONENT_ICONS = ${JSON.stringify(componentList)} as const\n`,
)

for (const weight of WEIGHTS) {
  writeFileSync(
    join(outDir, `phosphor-body-${weight}.ts`),
    header + `export default ${JSON.stringify(bodies[weight])} as Record<string, string>\n`,
  )
}

// Component icon set: list + every weight's body for its slugs.
const componentBodies = Object.fromEntries(WEIGHTS.map((w) => [w, Object.fromEntries(
  CORE_SLUGS.map((slug) => {
    if (!bodies[w][slug]) throw new Error(`component icon "${slug}" has no ${w} body`)
    return [slug, bodies[w][slug]]
  }),
)]))
writeFileSync(
  componentFile,
  header +
    `// The generic icons Escala components embed (src/lib/componentIcons.json), with\n` +
    `// their Phosphor bodies (inner SVG markup, 256×256 viewBox) in all six weights.\n` +
    `// No imports: the Figma plugin bundles this file as is.\n` +
    `export const COMPONENT_ICONS_HASH = ${JSON.stringify(componentHash)}\n` +
    `export type ComponentIconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'\n` +
    `export const COMPONENT_ICON_NAMES = ${JSON.stringify(componentList.map((i) => i.name))} as const\n` +
    `export type ComponentIconName = typeof COMPONENT_ICON_NAMES[number]\n` +
    `export interface ComponentIconDef { name: ComponentIconName; slug: string; component: string; group: string; use: string }\n` +
    `export const COMPONENT_ICONS: ComponentIconDef[] = ${JSON.stringify(componentList, null, 1)}\n` +
    `export const COMPONENT_ICON_BODIES: Record<ComponentIconWeight, Record<string, string>> = ${JSON.stringify(componentBodies)}\n`,
)

console.log(
  `wrote ${componentList.length} component icons (${componentHash})`,
)
console.log(
  `wrote ${icons.length} icons × ${WEIGHTS.length} weights from ${pkg.name}@${pkg.version} → src/generated/ (index + 6 body files)`,
)
