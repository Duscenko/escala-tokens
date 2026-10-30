// `contracts/components/<Key>.json` — one contract per component the system
// ships. Every field comes from the catalogue (`componentCatalogue.ts`), the
// recipes already inside tokens.json (`componentRecipes`), and — when the
// plugin sends it — what the Figma file actually holds. Nothing is written by
// hand here, so the contract cannot drift from the catalogue.

import { COMPONENTS, ESSENTIAL_COMPONENT_KEYS, type ComponentDef } from '../componentCatalogue'
import type { TokenJSON } from '../agentBundle/types'
import type { FigmaComponentEntry, FigmaManifest, RepoFile } from './types'

export const COMPONENT_CONTRACT_FORMAT = 'escala-component-contract/v1' as const
export const CONTRACTS_DIR = 'contracts/components/'

/** Same pick as the agent package's templates: the system's `atoms`, else the essentials. */
export function contractKeys(json: TokenJSON): string[] {
  const atoms = (json.atoms ?? []).filter(Boolean)
  return atoms.length ? atoms : [...ESSENTIAL_COMPONENT_KEYS]
}

export function contractFileName(key: string): string {
  return `${key.replace(/[^A-Za-z0-9]+/g, '')}.json`
}

function inFigma(def: ComponentDef, figma: FigmaManifest | null | undefined): FigmaComponentEntry[] {
  if (!figma) return []
  const names = new Set(def.figmaSets)
  return figma.components.filter((c) => names.has(c.name))
}

function recipeOf(json: TokenJSON, key: string): unknown {
  const recipes = (json as { componentRecipes?: Record<string, unknown> }).componentRecipes
  return recipes && typeof recipes === 'object' ? recipes[key] ?? null : null
}

function json2(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function buildComponentContracts(json: TokenJSON, figma?: FigmaManifest | null): RepoFile[] {
  const byKey = new Map(COMPONENTS.map((c) => [c.key, c] as const))
  const keys = contractKeys(json)
  const known = keys.map((k) => byKey.get(k)).filter((d): d is ComponentDef => !!d)
  const unknown = keys.filter((k) => !byKey.has(k))

  const files: RepoFile[] = known.map((def) => {
    const built = inFigma(def, figma)
    return {
      path: `${CONTRACTS_DIR}${contractFileName(def.key)}`,
      content: json2({
        format: COMPONENT_CONTRACT_FORMAT,
        key: def.key,
        label: def.label,
        category: def.category,
        description: def.description,
        usage: def.usage,
        axes: def.axes,
        props: def.props,
        accessibility: def.accessibility,
        // Which token paints which part, per variant. Same table the plugin binds.
        recipe: recipeOf(json, def.key),
        figma: {
          // The sets the catalogue says this component unlocks…
          sets: def.figmaSets,
          // …and what the plugin found in the file (null = no manifest sent).
          inFile: figma ? built.map(({ name, key, nodeId, page }) => ({ name, key, nodeId, page })) : null,
        },
      }),
    }
  })

  files.push({
    path: 'contracts/components.json',
    content: json2({
      format: 'escala-component-index/v1',
      project: json.project ?? null,
      components: known.map((def) => ({
        key: def.key,
        label: def.label,
        category: def.category,
        file: `components/${contractFileName(def.key)}`,
        inFigma: figma ? inFigma(def, figma).length > 0 : null,
      })),
      // Keys in `atoms` the catalogue does not know (renamed or removed).
      ...(unknown.length ? { unknown } : {}),
    }),
  })
  return files
}
