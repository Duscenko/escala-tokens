// CSS and Figma names of the dimension roles — the Escala Figma file's code
// syntax (spec: escala-figma-plugin/spec/figma-variables.txt).
//
// The role IDS do not change (`size.hit`, `radius.pill`, `selector.control`,
// `icon.small` — tokens.json, recipes, agents). Their names follow the
// property they control, then `<object>-<size>`:
//
//   size.hit … fab        → `--size-control-xs … xl`   · `Size/control-xs … xl`
//   size.target-min       → `--size-target-min`         · `Size/target-min`
//   selector.control|compact → `--size-selector-md|sm`  · `Size/selector-md|sm`
//   icon.small|medium|large  → `--size-icon-sm|md|lg`   · `Size/icon-sm|md|lg`
//   radius.pill           → `--radius-full`             · `Radius/full`
//   anything else         → `--<family>-<key>`          · `<Family>/<key>`
//
// No imports: componentRecipes (Node-ESM `.js` imports) and layoutTokens both
// read it.

const ROLE_PATH: Record<string, Record<string, string>> = {
  size: { hit: 'size/control-xs', compact: 'size/control-sm', control: 'size/control-md', touch: 'size/control-lg', fab: 'size/control-xl', 'target-min': 'size/target-min' },
  selector: { control: 'size/selector-md', compact: 'size/selector-sm' },
  icon: { small: 'size/icon-sm', medium: 'size/icon-md', large: 'size/icon-lg' },
  radius: { pill: 'radius/full' },
}
const FIGMA_GROUP: Record<string, string> = { spacing: 'Spacing', radius: 'Radius', stroke: 'Stroke', size: 'Size' }

/** True when `key` is a ROLE of `family` with a renamed path (not a scale step). */
export function hasRoleName(family: string, key: string): boolean {
  return Boolean(ROLE_PATH[family]?.[key])
}

/** `size.hit` → `--size-control-xs`, `radius.pill` → `--radius-full`,
 *  `icon.small` → `--size-icon-sm`, `spacing.gap-group` → `--spacing-gap-group`. */
export function roleCssVar(family: string, key: string): string {
  return `--${(ROLE_PATH[family]?.[key] ?? `${family}/${key}`).replace('/', '-')}`
}

/** The role's variable in Figma `Dimension Semantics` (`Size/control-xs`,
 *  `Radius/full`, `Spacing/gap-group`), or null when the file has none
 *  (breakpoints are CSS only). */
export function roleFigmaName(family: string, key: string): string | null {
  const path = ROLE_PATH[family]?.[key] ?? `${family}/${key}`
  const slash = path.indexOf('/')
  const group = FIGMA_GROUP[path.slice(0, slash)]
  return group ? `${group}/${path.slice(slash + 1)}` : null
}

/** The other way: `size-control-xs` / `Size/control-xs` → `size.hit`,
 *  `radius-full` → `radius.pill`, `size-icon-sm` → `icon.small`. Null for a
 *  name that is not a renamed role (it keeps its plain `<family>.<key>`). */
export function roleIdFromName(name: string): string | null {
  const path = name.replace(/^var\(--|\)$/g, '').replace(/^--/, '').trim().toLowerCase()
  for (const [family, map] of Object.entries(ROLE_PATH)) {
    for (const [key, target] of Object.entries(map)) {
      if (path === target || path === target.replace('/', '-')) return `${family}.${key}`
    }
  }
  return null
}
