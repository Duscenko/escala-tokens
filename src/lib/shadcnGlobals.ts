/**
 * shadcn/ui's ~30 theme variables, answered by Escala's Categorical roles
 * (E4 in design-plans/shadcn-component-skeleton.md).
 *
 * This is an OUTPUT FORMAT, not an architecture. The shadcn semantic
 * architecture was deleted on purpose; nothing here projects or stores a second
 * set of roles. Each shadcn variable is a NAME for one Categorical role, read
 * from the published `tokens.json`, so a stock shadcn component (or any code
 * that reads `bg-primary`) paints with the system. What shadcn cannot say —
 * resolved hover / pressed, warning / success / info, the alpha layer — stays
 * in `variables.css` and the recipe sheet, which use every role.
 *
 * Imported by `api/registry.ts` (Node ESM): relative imports carry `.js`.
 */
import type { TokenJSON } from './agentBundle/types.js'
import { chartPalette } from './chartPalette.js'
import { cssVarValues, roleColor, systemModes, type Appearance } from './registry/systemValues.js'

/** shadcn variable → the Categorical role that answers it. Order is shadcn's. */
export const SHADCN_ROLE_MAP: ReadonlyArray<readonly [string, string]> = [
  ['background', 'surface.page'],
  ['foreground', 'content.primary'],
  ['card', 'surface.layer-1'],
  ['card-foreground', 'content.primary'],
  // Escala has no "raised" role: a popover is a layer-1 surface with shadow lg.
  ['popover', 'surface.layer-1'],
  ['popover-foreground', 'content.primary'],
  ['primary', 'action.primary.default'],
  ['primary-foreground', 'content.on-action'],
  ['secondary', 'action.secondary.default'],
  ['secondary-foreground', 'content.accent'],
  ['muted', 'surface.layer-2'],
  ['muted-foreground', 'content.secondary'],
  // shadcn's "accent" is the menu-row hover, not a brand colour.
  ['accent', 'action.ghost.hover'],
  ['accent-foreground', 'content.primary'],
  ['destructive', 'status.critical.surface-solid'],
  ['destructive-foreground', 'status.critical.on-solid'],
  // Decorative hairline vs the control boundary (WCAG 1.4.11): shadcn draws
  // inputs with `border-input`, so that one is the boundary.
  ['border', 'border.default'],
  ['input', 'border.strong'],
  ['ring', 'border.focus'],
  ['sidebar', 'surface.layer-1'],
  ['sidebar-foreground', 'content.primary'],
  ['sidebar-primary', 'action.primary.default'],
  ['sidebar-primary-foreground', 'content.on-action'],
  ['sidebar-accent', 'action.ghost.hover'],
  ['sidebar-accent-foreground', 'content.primary'],
  ['sidebar-border', 'border.default'],
  ['sidebar-ring', 'border.focus'],
]

/** shadcn's `--radius` is the base its `rounded-md/lg/xl` derive from: the
 *  FIELDS axis (buttons, inputs), Escala's `radius.action`. */
export const SHADCN_RADIUS_ROLE = 'radius.action'

export const SHADCN_CHART_VARS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const

/** One column's shadcn variables (names without `--`). Unanswerable ones are left out. */
export function shadcnVars(json: TokenJSON, mode: string, appearance: Appearance): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, role] of SHADCN_ROLE_MAP) {
    const value = roleColor(json, role, mode)
    if (value) out[name] = value
  }
  // The series derive from the brand hue (L and C fixed, CVD-validated offsets).
  const brand = roleColor(json, 'action.primary.default', mode)
  if (brand) chartPalette(brand.slice(0, 7)).forEach((hex, i) => { out[SHADCN_CHART_VARS[i]] = hex })
  const radius = cssVarValues(json, ['--radius-action'], mode, appearance)['--radius-action']
  if (radius) out.radius = radius
  return out
}

export interface ShadcnTheme { light: Record<string, string>; dark: Record<string, string> | null; brand: string | null }

export function shadcnTheme(json: TokenJSON, brand?: string | null): ShadcnTheme {
  const modes = systemModes(json, brand)
  const light = shadcnVars(json, modes.light, 'light')
  const dark = modes.dark ? shadcnVars(json, modes.dark, 'dark') : null
  if (dark) delete dark.radius // a length does not change with the appearance
  return { light, dark, brand: modes.brand }
}

/** The `@theme inline` block shadcn's `globals.css` carries (Tailwind v4). */
function themeInline(vars: Record<string, string>): string[] {
  const lines = Object.keys(vars).filter((k) => k !== 'radius').map((k) => `  --color-${k}: var(--${k});`)
  if ('radius' in vars) {
    lines.push(
      '  --radius-sm: calc(var(--radius) - 4px);',
      '  --radius-md: calc(var(--radius) - 2px);',
      '  --radius-lg: var(--radius);',
      '  --radius-xl: calc(var(--radius) + 4px);',
    )
  }
  return lines
}

/**
 * A drop-in shadcn `globals.css` (Tailwind v4 shape): `:root` = the brand's
 * Light theme, `.dark` = its Dark theme, every value resolved from the system.
 */
export function buildShadcnGlobalsCss(json: TokenJSON, opts: { brand?: string | null; project?: string } = {}): string {
  const theme = shadcnTheme(json, opts.brand)
  const block = (sel: string, vars: Record<string, string>) =>
    [`${sel} {`, ...Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`), '}']
  const name = opts.project ?? (json as { project?: string }).project ?? 'Escala'
  return [
    `/* shadcn/ui globals.css — generated by Escala from "${name}"${theme.brand ? ` (brand: ${theme.brand})` : ''}.`,
    ' * Each variable names one of the system\'s Categorical roles (primary =',
    ' * action.primary.default, input = border.strong …). Hover, pressed, warning /',
    ' * success / info and the alpha layer have no shadcn variable: they ship in',
    ' * variables.css. Components: npx shadcn add <origin>/r/<name>.json?project=<id> */',
    '@import "tailwindcss";',
    '',
    '@custom-variant dark (&:is(.dark *));',
    '',
    ...block(':root', theme.light),
    ...(theme.dark ? ['', ...block('.dark', theme.dark)] : []),
    '',
    '@theme inline {',
    ...themeInline(theme.light),
    '}',
    '',
    '@layer base {',
    '  * {',
    '    @apply border-border outline-ring/50;',
    '  }',
    '  body {',
    '    @apply bg-background text-foreground;',
    '  }',
    '}',
    '',
  ].join('\n')
}
