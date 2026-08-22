import { COMPONENTS, ESSENTIAL_COMPONENT_KEYS, type ComponentDef } from '../componentCatalogue'

const ESSENTIAL = new Set<string>(ESSENTIAL_COMPONENT_KEYS)

export function listComponents(category?: string) {
  const rows = COMPONENTS.filter((c) => !category || c.category === category)
  return rows.map((c) => ({
    key: c.key,
    label: c.label,
    category: c.category,
    axes: c.axes,
    figmaSets: c.figmaSets,
    essential: ESSENTIAL.has(c.key),
  }))
}

export function getComponent(key: string): ComponentDef | null {
  return COMPONENTS.find((c) => c.key.toLowerCase() === key.trim().toLowerCase()) ?? null
}
