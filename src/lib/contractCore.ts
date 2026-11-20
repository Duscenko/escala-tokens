/**
 * The pure core of a component contract: every field derivable from the catalogue
 * (`componentCatalogue.ts`), the recipe (`componentRecipes.ts`) and the two authored
 * tables (`recipes/motion.ts` via the recipe, `componentBehaviour.ts`) — nothing read
 * from the repo's files.
 *
 * Two callers, one answer (design-plans/agent-ready-contracts.md, Phase 4 item 2):
 *  - `componentContracts.ts` (`npm run gen:contracts` → `spec/contracts/<Key>.json`) adds what
 *    only the repo knows: the Figma snapshot, the component and story sources, design-plans/.
 *  - the agent package (`agentBundle/productDesignSkills.ts` → `contracts/<Key>.json`) runs in the
 *    browser, so it ships this core with the repo-only fields null.
 * `contractCore.test.ts` holds the two equal on `CONTRACT_SHARED_FIELDS`.
 *
 * Pure: no store, no DOM, no file reads.
 */
import type { ComponentBox, ComponentDef, ComponentLock } from './componentCatalogue'
import { COMPONENT_RECIPES, cssVarOf, recipeTokenRefs, splitRef, type ComponentRecipe } from './componentRecipes'
import type { RecipeMotion, SlotMap } from './recipes/helpers'
import { figmaSemanticName } from './agentBundle/names'
import { roleFigmaName } from './roleNames'
import { COMPONENT_BEHAVIOUR, type AuthoredBehaviour } from './componentBehaviour'

/** v2 (2026-11-20) is additive over v1: bindings, names, motion, behaviour, code.import. */
export const CONTRACT_SCHEMA = 'escala-component-contract/2'
export const FIGMA_FILE_KEY = '7j5zukN5HpihGVJMmyjA20'

/** What the generator and the agent package both write, value for value. */
export interface ContractCore {
  $schema: string
  key: string
  label: string
  category: string
  box: ComponentBox
  locks: ComponentLock[]
  description: string
  owners: { anatomy: 'figma'; foundations: 'figma'; behaviour: 'storybook' }
  api: {
    axes: { name: string; values: string[] }[]
    defaults: Record<string, string>
    props: { name: string; type: string; description: string }[]
  }
  anatomy: { slots: string[] }
  tokens: Record<string, string[]>
  /** Every token ref above → its CSS variable and its Figma variable or style (null where Figma has none). */
  names: Record<string, { css: string; figma: string | null }>
  /** The recipe parts: which axes each part reads and, per combination (values joined by `|`, `''` when
   *  it reads none), the token each slot paints. Merge every matching part, in order, to resolve a render. */
  bindings: { axes: string[]; values: Record<string, SlotMap> }[]
  /** How it moves: motion roles and choreographies by name (`src/lib/recipes/motion.ts`). null = no decision yet (MOT-002). */
  motion: RecipeMotion | null
  /** Keys and focus the component's own source adds (`componentBehaviour.ts`); null = not authored yet. */
  authored: AuthoredBehaviour | null
  usage: string
  accessibility: string
}

/** Top-level contract keys whose value is the core's, in both outputs (`behaviour.authored` is checked on its own). */
export const CONTRACT_SHARED_FIELDS = [
  '$schema', 'key', 'label', 'category', 'box', 'locks', 'description', 'owners', 'api', 'anatomy',
  'tokens', 'names', 'bindings', 'motion', 'usage', 'accessibility',
] as const

export function kebab(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase()
}

function groupTokens(refs: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const ref of refs) {
    const kind = ref.split('.')[0]
    ;(out[kind] ??= []).push(ref)
  }
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].sort()
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

/** `color.action.primary.hover` → `Action/primary/hover`; dimension roles by their Figma path; type roles are text styles. */
export function figmaNameOf(ref: string): string | null {
  const [ns, name] = splitRef(ref)
  if (ns === 'color') return figmaSemanticName(name)
  if (ns === 'type') return /^(text|display)-(xs|sm|md|lg|xl|2xl)$/.test(name) ? null : `Type/${name}`
  if (ns === 'icon' || ns === 'selector' || ns === 'size' || ns === 'spacing' || ns === 'radius' || ns === 'stroke') return roleFigmaName(ns, name)
  return null
}

function namesOf(refs: string[]): ContractCore['names'] {
  return Object.fromEntries(refs.map((ref) => [ref, { css: cssVarOf(ref), figma: figmaNameOf(ref) }]))
}

function bindingsOf(recipe: ComponentRecipe | undefined): ContractCore['bindings'] {
  return recipe ? recipe.parts.map((p) => ({ axes: p.axes, values: p.values })) : []
}

export function contractCore(def: ComponentDef): ContractCore {
  const recipe = COMPONENT_RECIPES[def.key]
  return {
    $schema: CONTRACT_SCHEMA,
    key: def.key,
    label: def.label,
    category: def.category,
    box: def.box,
    locks: def.locks,
    description: def.description,
    owners: { anatomy: 'figma', foundations: 'figma', behaviour: 'storybook' },
    api: { axes: def.axes, defaults: recipe?.defaults ?? {}, props: def.props },
    anatomy: { slots: recipe?.slots ?? [] },
    tokens: recipe ? groupTokens(recipeTokenRefs(recipe)) : {},
    names: recipe ? namesOf(recipeTokenRefs(recipe)) : {},
    bindings: bindingsOf(recipe),
    motion: recipe?.motion ?? null,
    authored: COMPONENT_BEHAVIOUR[def.key] ?? null,
    usage: def.usage,
    accessibility: def.accessibility,
  }
}
