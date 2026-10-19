// SHARED FILE — byte-identical copy in ../escala-figma-plugin/src/w3cTree.ts.
// `figmaCollectionsParity.test.ts` fails the moment the two copies differ, so
// change both or neither.
//
// The W3C (DTCG) export is the Figma file, written down: ONE document whose
// top-level groups are the five collections the plugin creates, each mode a
// group under its collection, and every alias a reference to the variable it
// points at in Figma. The web builds the variable snapshot from tokens.json
// (`fromTokens.ts`), the plugin reads it from the file's real variables; both
// hand it to `snapshotToW3C`, so the two downloads have one shape.
//
//   { "Color Primitives":     { "Default": { "Accents": { "Accent": { "09": { "$type": "color", "$value": "#9522e9" } } } } },
//     "Color Semantics":      { "Light":   { "Action": { "primary": { "default": { "$type": "color", "$value": "{Color Primitives.Default.Accents.Accent.09}" } } } } },
//     "Dimension Primitives": { "Default": { "16": { "$type": "dimension", "$value": "16px" } } },
//     "Dimension Semantics":  { "Desktop": { "Radius": { "role": { "container": { "$type": "dimension", "$value": "{Dimension Primitives.Default.16}" } } } } },
//     "Typography":           { "Desktop": { "role": { "body": { "size": { "$type": "dimension", "$value": "{Typography.Desktop.size.text-md}" } } } } } }
//
// A collection whose only mode still carries Figma's generic label ("Mode 1" —
// the two primitive collections) names it `Default`; every other mode keeps
// the name it has in Figma (`Light`, `Desktop`…).

export type SnapScalar = string | number | boolean
export interface SnapAlias { alias: { collection: string; name: string } }
export type SnapValue = SnapScalar | SnapAlias
export type SnapType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'

export interface SnapVariable {
  /** The Figma variable name, `/`-separated (`Action/primary/default`). */
  name: string
  type: SnapType
  /** Mode NAME → value or alias. */
  values: Record<string, SnapValue>
  description?: string
}

export interface SnapCollection {
  name: string
  modes: string[]
  variables: SnapVariable[]
}

export interface CollectionsSnapshot {
  collections: SnapCollection[]
}

export const FIGMA_COLLECTION_ORDER = [
  'Color Primitives',
  'Color Semantics',
  'Dimension Primitives',
  'Dimension Semantics',
  'Typography',
] as const

export const SINGLE_MODE_NAME = 'Default'

export interface W3CMeta {
  project?: string
  source: 'escala-web' | 'escala-figma-plugin'
}

type W3CLeaf = { $type: string; $value: unknown; $description?: string }
type W3CGroup = { [key: string]: W3CGroup | W3CLeaf | unknown }

export function isSnapAlias(v: SnapValue | undefined): v is SnapAlias {
  return typeof v === 'object' && v !== null && 'alias' in v
}

/** Figma path → DTCG path segments. A `.` would split a DTCG reference, so it
 *  becomes `_` (Figma names never carry one — the plugin turns dots into `/`). */
function segmentsOf(name: string): string[] {
  return name.split('/').map((s) => s.trim().replace(/\./g, '_')).filter(Boolean)
}

const GENERIC_MODE = /^Mode(\s+\d+)?$/i

/** The name a mode is written under in the document. */
function displayMode(col: SnapCollection, mode: string): string {
  return col.modes.length === 1 && GENERIC_MODE.test(mode) ? SINGLE_MODE_NAME : mode
}
function modeNamesOf(col: SnapCollection): string[] {
  return col.modes.map((m) => displayMode(col, m))
}

/** The mode a reference lands on: the same mode when the target collection
 *  has it, otherwise the target's first mode — the rule Figma itself follows
 *  when an alias crosses collections. */
function targetMode(target: SnapCollection, mode: string): string {
  const modes = modeNamesOf(target)
  return modes.includes(mode) ? mode : modes[0]
}

function w3cTypeOf(col: string, v: SnapVariable): string {
  if (v.type === 'COLOR') return 'color'
  if (v.type === 'BOOLEAN') return 'boolean'
  const segs = segmentsOf(v.name)
  if (v.type === 'STRING') return col === 'Typography' && segs.some((s) => /family/.test(s)) ? 'fontFamily' : 'string'
  if (col === 'Typography' && segs.some((s) => s === 'weight')) return 'fontWeight'
  if (segs[0] === 'columns' || segs[segs.length - 1] === 'columns') return 'number'
  return 'dimension'
}

function w3cScalar(type: string, raw: SnapScalar): unknown {
  if (type === 'dimension' && typeof raw === 'number') return `${Math.round(raw * 1000) / 1000}px`
  return raw
}

/** Put `leaf` at `path`. A token and a group cannot share a name in DTCG, so
 *  when they collide the token moves to the group's `$root`. */
function place(tree: W3CGroup, path: string[], leaf: W3CLeaf) {
  let node = tree
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    let next = node[key] as W3CGroup | W3CLeaf | undefined
    if (next && typeof next === 'object' && '$value' in next) {
      next = { $root: next } as W3CGroup
      node[key] = next
    }
    if (!next) { next = {}; node[key] = next }
    node = next as W3CGroup
  }
  const last = path[path.length - 1]
  const existing = node[last] as W3CGroup | W3CLeaf | undefined
  if (existing && typeof existing === 'object' && !('$value' in existing)) (existing as W3CGroup).$root = leaf
  else node[last] = leaf
}

export interface SnapshotToW3COptions {
  /** false: every alias is written as the value it resolves to. */
  aliases?: boolean
  /** Collections to write (all when omitted). An alias into a collection that
   *  is left out is written as its value — a reference must resolve inside
   *  the document that carries it. */
  include?: readonly string[]
}

/** One snapshot → one DTCG document with the five collections as its groups. */
export function snapshotToW3C(snap: CollectionsSnapshot, meta: W3CMeta, opts: SnapshotToW3COptions = {}): Record<string, unknown> {
  const aliases = opts.aliases !== false
  const written = (name: string) => !opts.include || opts.include.includes(name)
  const byName = new Map(snap.collections.map((c) => [c.name, c] as const))
  const varOf = new Map<string, SnapVariable>()
  for (const c of snap.collections) for (const v of c.variables) varOf.set(`${c.name}\u0000${v.name}`, v)

  const realModeOf = (col: SnapCollection, display: string) =>
    col.modes.find((m) => displayMode(col, m) === display) ?? col.modes[0]

  // Follows an alias chain to a value (depth-capped: a circular alias in a
  // hand-edited file must not hang the export).
  const resolve = (value: SnapValue | undefined, col: SnapCollection, mode: string, depth = 0): { value: SnapScalar | undefined; type?: SnapType } => {
    if (!isSnapAlias(value)) return { value }
    const target = byName.get(value.alias.collection)
    const tv = varOf.get(`${value.alias.collection}\u0000${value.alias.name}`)
    if (!target || !tv || depth > 12) return { value: undefined }
    const tMode = targetMode(target, mode)
    return { ...resolve(tv.values[realModeOf(target, tMode)], target, tMode, depth + 1), type: tv.type }
  }

  const out: Record<string, unknown> = {
    $description: 'Figma variable collections, one group per collection and one per mode — the structure the Escala plugin writes.',
    $extensions: { 'com.escala': { format: 'figma-collections', version: 1, source: meta.source, ...(meta.project ? { project: meta.project } : {}) } },
  }
  const ordered = [
    ...FIGMA_COLLECTION_ORDER.map((n) => byName.get(n)).filter((c): c is SnapCollection => !!c),
    ...snap.collections.filter((c) => !(FIGMA_COLLECTION_ORDER as readonly string[]).includes(c.name)),
  ].filter((c) => written(c.name))
  for (const col of ordered) {
    const colNode: W3CGroup = {}
    for (const mode of modeNamesOf(col)) {
      const modeNode: W3CGroup = {}
      for (const v of col.variables) {
        const path = segmentsOf(v.name)
        if (!path.length) continue
        const raw = v.values[realModeOf(col, mode)]
        let leafValue: unknown
        let type = w3cTypeOf(col.name, v)
        if (isSnapAlias(raw) && aliases && written(raw.alias.collection) && byName.has(raw.alias.collection) && varOf.has(`${raw.alias.collection}\u0000${raw.alias.name}`)) {
          const target = byName.get(raw.alias.collection)!
          const tv = varOf.get(`${raw.alias.collection}\u0000${raw.alias.name}`)!
          type = w3cTypeOf(target.name, tv)
          leafValue = `{${[target.name, targetMode(target, mode), ...segmentsOf(tv.name)].join('.')}}`
        } else {
          const r = resolve(raw, col, mode)
          if (r.value === undefined) continue
          leafValue = w3cScalar(type, r.value)
        }
        const leaf: W3CLeaf = { $type: type, $value: leafValue }
        if (v.description) leaf.$description = v.description
        place(modeNode, path, leaf)
      }
      colNode[mode] = modeNode
    }
    out[col.name] = colNode
  }
  return out
}
