// The web's W3C export: tokens.json → the five Figma collections → DTCG.
// Scoping (which collections, which themes, which primitive families) cuts the
// SNAPSHOT, and any alias into a variable that was cut is written as its value,
// so a scoped document never references a token it does not carry.

import type { generateTokenJSON } from '../tokenGenerator'
import { figmaCollectionsSnapshot, primitiveEntries } from './fromTokens'
import { isSnapAlias, snapshotToW3C, type CollectionsSnapshot, type SnapScalar, type SnapValue } from './w3cTree'

export { figmaCollectionsSnapshot, primitiveEntries } from './fromTokens'
export * from './w3cTree'

type TokenJSON = ReturnType<typeof generateTokenJSON>

export interface FigmaW3COptions {
  /** Collections to write; all five when omitted. */
  include?: readonly string[]
  /** Dimension Semantics groups to keep (`Spacing`, `Radius`, `Stroke`, `Size`,
   *  `Selector`, `Icon`, `Grid`); all when omitted. */
  dimensionGroups?: readonly string[]
  /** Theme keys (themeOrder entries) whose Color Semantics columns ship. */
  semanticModes?: readonly string[]
  /** Keep this primitive? `alpha` is true for a `colors.primitiveAlpha` key. */
  keepPrimitive?: (key: string, alpha: boolean) => boolean
  /** false: aliases are written as their values. */
  aliases?: boolean
  project?: string
}

/** Drops the variables `keep` rejects, writing every alias that pointed at one
 *  as the value it resolved to, mode by mode. */
export function pruneSnapshot(
  snap: CollectionsSnapshot,
  collection: string,
  keep: (name: string) => boolean,
): CollectionsSnapshot {
  const byName = new Map(snap.collections.map((c) => [c.name, c] as const))
  const resolve = (value: SnapValue | undefined, mode: string, depth = 0): SnapScalar | undefined => {
    if (!isSnapAlias(value)) return value
    const target = byName.get(value.alias.collection)
    const tv = target?.variables.find((v) => v.name === value.alias.name)
    if (!target || !tv || depth > 12) return undefined
    const tMode = target.modes.includes(mode) ? mode : target.modes[0]
    return resolve(tv.values[tMode], tMode, depth + 1)
  }
  const cut = (name: string) => !keep(name)
  return {
    collections: snap.collections.map((c) => ({
      ...c,
      variables: c.variables
        .filter((v) => c.name !== collection || keep(v.name))
        .map((v) => {
          let changed = false
          const values: Record<string, SnapValue> = {}
          for (const [mode, raw] of Object.entries(v.values)) {
            if (isSnapAlias(raw) && raw.alias.collection === collection && cut(raw.alias.name)) {
              const r = resolve(raw, mode)
              if (r !== undefined) { values[mode] = r; changed = true; continue }
            }
            values[mode] = raw
          }
          return changed ? { ...v, values } : v
        }),
    })),
  }
}

function primitiveNames(tokens: TokenJSON, keep: (key: string, alpha: boolean) => boolean): Set<string> {
  const names = new Set(primitiveEntries(tokens).filter((p) => keep(p.key, p.alpha)).map((p) => p.name))
  if (keep('Background', false)) names.add('Background')
  return names
}

export function figmaCollectionsW3C(tokens: TokenJSON, opts: FigmaW3COptions = {}): Record<string, unknown> {
  let snap = figmaCollectionsSnapshot(tokens)

  if (opts.keepPrimitive) {
    const keepNames = primitiveNames(tokens, opts.keepPrimitive)
    snap = pruneSnapshot(snap, 'Color Primitives', (n) => keepNames.has(n))
  }
  if (opts.dimensionGroups) {
    const groups = new Set(opts.dimensionGroups)
    snap = pruneSnapshot(snap, 'Dimension Semantics', (n) => groups.has(n.split('/')[0]))
  }
  if (opts.semanticModes) {
    const colors = tokens.colors as unknown as Record<string, any>
    const label = (m: string) => (colors.themeLabels?.[m] as string | undefined)?.trim() || m.charAt(0).toUpperCase() + m.slice(1)
    const wanted = new Set(opts.semanticModes.map(label))
    snap = {
      collections: snap.collections.map((c) => {
        if (c.name !== 'Color Semantics') return c
        const modes = c.modes.filter((m) => wanted.has(m))
        if (!modes.length) return c
        return {
          ...c,
          modes,
          variables: c.variables.map((v) => ({ ...v, values: Object.fromEntries(modes.map((m) => [m, v.values[m]])) })),
        }
      }),
    }
  }
  return snapshotToW3C(snap, { source: 'escala-web', project: opts.project ?? tokens.project }, { aliases: opts.aliases, include: opts.include })
}
