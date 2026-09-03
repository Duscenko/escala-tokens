// Descriptions for Figma variables — same catalogues the Semantics table and
// agent Skill already read. Emitted under `descriptions` on tokens.json so the
// plugin can set Variable.description on sync (additive; older plugins ignore).
import { ALL_ROLES } from './semanticRoles'
import { CATEGORICAL_ROLE_COMMENTS } from './semanticArchitectures'
import { LAYOUT_ROLES, type LayoutFamily } from './layoutTokens'
import { TYPE_ROLES } from './typeRoles'
import { figmaSemanticName } from './agentBundle/names'

/** Figma collection name → variable name → description. */
export type VariableDescriptions = Record<string, Record<string, string>>

const COLL = {
  semantics: 'Color Semantics',
  typography: 'Typography',
  spacing: 'Spacing',
  radius: 'Radius',
  border: 'Border',
  size: 'Size',
  selector: 'Selector',
  grid: 'Grid',
} as const

/** Flat catalogue key → Figma name (`content-primary` → `content/primary`). */
function flatSemanticName(key: string): string {
  const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase()
  const dash = kebab.indexOf('-')
  return dash === -1 ? kebab : `${kebab.slice(0, dash)}/${kebab.slice(dash + 1)}`
}

const LAYOUT_COLL: Record<LayoutFamily, string> = {
  radius: COLL.radius,
  spacing: COLL.spacing,
  size: COLL.size,
  selector: COLL.selector,
  stroke: COLL.border,
  breakpoint: COLL.grid,
}

export function buildVariableDescriptions(): VariableDescriptions {
  const out: VariableDescriptions = {}
  const put = (collection: string, name: string, description: string) => {
    if (!description) return
    ;(out[collection] ??= {})[name] = description
  }

  // Flat 39-role catalogue (compat slice when architecture is flat).
  for (const role of ALL_ROLES) {
    put(COLL.semantics, flatSemanticName(role.key), role.description)
  }

  // Categorical nested roles (`content.primary` → `Content/primary`).
  for (const [id, comment] of Object.entries(CATEGORICAL_ROLE_COMMENTS)) {
    put(COLL.semantics, figmaSemanticName(id), comment)
  }

  for (const family of Object.keys(LAYOUT_COLL) as LayoutFamily[]) {
    const coll = LAYOUT_COLL[family]
    for (const role of LAYOUT_ROLES[family]) {
      put(coll, `role/${role.key}`, role.description)
    }
  }

  // Type roles: same copy on size / weight / family aliases.
  for (const role of TYPE_ROLES) {
    for (const part of ['size', 'weight', 'family'] as const) {
      put(COLL.typography, `role/${role.key}/${part}`, role.description)
    }
  }

  return out
}
