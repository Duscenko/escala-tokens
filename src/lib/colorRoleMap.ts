// COLOUR ROLE MAP — one colour of the brand, read forward: the families it
// owns → the semantic roles that resolve to them in the theme on screen → the
// components whose recipes paint with those roles. The board draws it when a
// colour row's ramp is open (design-plans/color-role-map.md).
//
// Pure and DOM-free. It resolves nothing itself: roles come from
// `resolveSystemRoles` (the Variables table's own projection) and components
// from `tokenMapping` (the recipes), so the map can never disagree with the
// table, the inspector or `ColorVariableMap`, which reads the same rows the
// other way round.
//
// THE SCOPING RULE: a role belongs to a colour when the primitive it resolves
// to IN THIS THEME is one of that colour's families. Refs always name the SLOT
// family (`accent`, `error-a`, `neutral-dark`) — a brand's private families are
// reached through it — so the rule holds for every System Style untouched.
// `black-a` / `white-a`, the fixed ladders, belong to no hue: Neutral carries
// them as its "fixed" band, since washes, scrims and every border read them.

import type { ColorRoleId } from './colorRoles'
import { COMPONENTS } from './componentCatalogue'
import { categoricalSolvedRoles } from './semanticArchitectures'
import { tokenMapping, type SystemRoles } from './systemDashboard'
import type { ThemeAppearance } from './themeModes'

/** The families each colour owns on its own ramp. */
export const COLOUR_FAMILIES: Record<ColorRoleId, string[]> = {
  accent: ['accent', 'accent-a'],
  neutral: ['neutral', 'neutral-dark', 'neutral-a'],
  success: ['success', 'success-a'],
  error: ['error', 'error-a'],
  warning: ['warning', 'warning-a'],
  info: ['info', 'info-a'],
}

/** The fixed alpha ladders — no hue, carried by Neutral. */
export const FIXED_FAMILIES = ['black-a', 'white-a']

/** Where a role sits on its colour: its own ramp, or a fixed ladder. */
export type MapBand = 'ramp' | 'fixed'

export interface MappedComponent {
  key: string
  label: string
  /** What the role paints on it — the recipe's slot · property. */
  paints: string[]
}

export interface MappedRole {
  /** `category.key`, e.g. `action.primary.default`. */
  id: string
  group: string
  /** The id without its group, as the table names it (`primary.default`). */
  name: string
  /** The primitive it reads in this theme (`accent.11`, `black-a.3`). */
  label: string
  family: string
  tone: number
  css: string
  band: MapBand
  /** Its tone is solved (moves with the hue), not pinned to a step. */
  solved: boolean
  /** Re-pointed by hand in at least one theme. */
  edited: boolean
  /** The other appearances where it reads a DIFFERENT primitive. */
  elsewhere: { mode: string; appearance: ThemeAppearance; label: string }[]
  components: MappedComponent[]
}

export interface MapGroup {
  key: string
  label: string
  roles: MappedRole[]
}

export interface ColorRoleMap {
  colour: ColorRoleId
  mode: string
  appearance: ThemeAppearance
  /** Every group of the architecture, in its order — possibly empty, so the
   *  column reads the same for every colour. */
  groups: MapGroup[]
  /** Tone → ids of the roles reading it, on the colour's own ramp (solid and
   *  alpha twin share a step number: `accent.3` and `accent-a.3` are tone 3). */
  tones: Record<number, string[]>
  /** Roles reading a fixed ladder (Neutral only). */
  fixed: MappedRole[]
  /** Distinct components across every role. */
  componentCount: number
}

const LABEL_RE = /^([a-z-]+)\.(\d+)$/

/** The colour a primitive label belongs to, `'fixed'` for a fixed ladder, or
 *  null for a value that is not on any ramp (a literal). */
export function ownerOfLabel(label: string): ColorRoleId | 'fixed' | null {
  const m = LABEL_RE.exec(label)
  if (!m) return null
  if (FIXED_FAMILIES.includes(m[1])) return 'fixed'
  for (const [colour, families] of Object.entries(COLOUR_FAMILIES) as [ColorRoleId, string[]][]) {
    if (families.includes(m[1])) return colour
  }
  return null
}

let componentsCache: Map<string, MappedComponent[]> | null = null

/** Role id → the components whose recipe reads it, catalogue-wide. Recipes
 *  are static data, so this is built once. */
export function componentsReadingRoles(): Map<string, MappedComponent[]> {
  if (componentsCache) return componentsCache
  const out = new Map<string, Map<string, MappedComponent>>()
  for (const row of tokenMapping(COMPONENTS.map((c) => c.key))) {
    if (!row.role) continue
    const byKey = out.get(row.role) ?? new Map<string, MappedComponent>()
    const hit = byKey.get(row.component) ?? { key: row.component, label: row.componentLabel, paints: [] }
    if (!hit.paints.includes(row.property)) hit.paints.push(row.property)
    byKey.set(row.component, hit)
    out.set(row.role, byKey)
  }
  componentsCache = new Map([...out].map(([role, byKey]) => [role, [...byKey.values()]]))
  return componentsCache
}

/** The map of `colour` in theme `mode` of the brand `roles` was resolved for. */
export function buildColorRoleMap(roles: SystemRoles, colour: ColorRoleId, mode: string): ColorRoleMap {
  const appearance = roles.appearanceOf[mode] ?? 'light'
  const solvedById = categoricalSolvedRoles()
  const readers = componentsReadingRoles()

  const groups: MapGroup[] = []
  const groupOf = new Map<string, MapGroup>()
  for (const role of roles.roles) {
    if (groupOf.has(role.category)) continue
    const group = { key: role.category, label: role.categoryLabel, roles: [] }
    groupOf.set(role.category, group)
    groups.push(group)
  }

  const tones: Record<number, string[]> = {}
  const fixed: MappedRole[] = []
  const seen = new Set<string>()

  for (const role of roles.roles) {
    const value = role.modes[mode]
    if (!value) continue
    const owner = ownerOfLabel(value.label)
    const band: MapBand | null = owner === colour ? 'ramp'
      : owner === 'fixed' && colour === 'neutral' ? 'fixed'
        : null
    if (!band) continue
    const [, family, tone] = LABEL_RE.exec(value.label)!
    const mapped: MappedRole = {
      id: role.id,
      group: role.category,
      name: role.id.slice(role.category.length + 1),
      label: value.label,
      family,
      tone: Number(tone),
      css: value.css,
      band,
      solved: solvedById[role.id]?.[appearance] ?? false,
      edited: role.edited,
      elsewhere: roles.modeKeys
        .filter((other) => other !== mode && roles.appearanceOf[other] !== appearance)
        .flatMap((other) => {
          const there = role.modes[other]?.label
          return there && there !== value.label
            ? [{ mode: other, appearance: roles.appearanceOf[other], label: there }]
            : []
        }),
      components: readers.get(role.id) ?? [],
    }
    groupOf.get(role.category)!.roles.push(mapped)
    if (band === 'ramp') (tones[mapped.tone] ??= []).push(role.id)
    else fixed.push(mapped)
    for (const c of mapped.components) seen.add(c.key)
  }

  return { colour, mode, appearance, groups, tones, fixed, componentCount: seen.size }
}

// ── Focus: what lights a path through the map ───────────────────────────────

/** What the pointer is on — in the map (a group, a role, a component) or on
 *  the rail's ramp (a tone). One value, so the map and the ramp light the
 *  same roles whichever side the pointer is on. */
export type MapFocus = { kind: 'group' | 'role' | 'component' | 'tone'; id: string } | null

/** The roles a focus lights, among `groups` (the ones on screen). */
export function focusedRoleIds(groups: readonly MapGroup[], focus: MapFocus): ReadonlySet<string> | null {
  if (!focus) return null
  const roles = groups.flatMap((g) => g.roles)
  switch (focus.kind) {
    case 'group': return new Set(groups.find((g) => g.key === focus.id)?.roles.map((r) => r.id) ?? [])
    case 'role': return new Set(roles.some((r) => r.id === focus.id) ? [focus.id] : [])
    case 'component': return new Set(roles.filter((r) => r.components.some((c) => c.key === focus.id)).map((r) => r.id))
    case 'tone': return new Set(roles.filter((r) => r.band === 'ramp' && r.tone === Number(focus.id)).map((r) => r.id))
  }
}

/** One step of the colour's ramp, as the legend reads it. */
export interface ToneUse {
  /** Roles reading this step, solid or alpha twin. */
  roles: string[]
  /** Every one of them reads the alpha twin (`accent-a.3`), none the solid. */
  alphaOnly: boolean
}

/** Step → its use, for the steps any role reads on the colour's own ramp
 *  (the fixed ladders have no step on it). */
export function toneLegend(groups: readonly MapGroup[]): Record<number, ToneUse> {
  const out: Record<number, ToneUse> = {}
  for (const role of groups.flatMap((g) => g.roles)) {
    if (role.band !== 'ramp') continue
    const use = (out[role.tone] ??= { roles: [], alphaOnly: true })
    use.roles.push(role.id)
    if (!role.family.endsWith('-a')) use.alphaOnly = false
  }
  return out
}

/** The steps the given roles read, on the colour's own ramp. */
export function tonesOfRoles(groups: readonly MapGroup[], ids: ReadonlySet<string> | null): ReadonlySet<number> {
  const out = new Set<number>()
  if (!ids) return out
  for (const role of groups.flatMap((g) => g.roles)) {
    if (role.band === 'ramp' && ids.has(role.id)) out.add(role.tone)
  }
  return out
}

/** The groups on screen: every one with a role, or only the filtered one. */
export function visibleGroups(map: ColorRoleMap, filter: string | null): MapGroup[] {
  const active = filter && map.groups.find((g) => g.key === filter)?.roles.length ? filter : null
  return map.groups.filter((g) => g.roles.length && (!active || g.key === active))
}

/** The theme of `roles` in `appearance` — the board shows one at a time. */
export function modeForAppearance(roles: SystemRoles, appearance: ThemeAppearance): string {
  return roles.modeKeys.find((mode) => roles.appearanceOf[mode] === appearance) ?? roles.modeKeys[0]
}
