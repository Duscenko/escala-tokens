/**
 * Platform chrome, resolved from the PLATFORM'S OWN design system — the
 * "Flow" foundations exported from Escala itself (`platformFoundations.json`,
 * Categorical roles, Light + Dark). The workspace speaks `bg-app` /
 * `bg-side-panel` / `text-fg` / `border-line` (~2,200 call sites); those
 * classes resolve through the variables below, and this module is the ONE
 * place that says which semantic role each variable is.
 *
 * Elevation, as the foundations define it:
 *   surface.page     the frame behind everything (`--app`, `--nav`)
 *   surface.layer-2  a PANEL (`--side-panel`, `--elevated`) + `border.subtle`
 *   surface.layer-1  a ROW / control inside a panel (`--surface`, chips, tabs)
 *   surface.input    a text field (`--input-bg`)
 *
 * Regenerated into `chromeTheme.generated.css` by `scripts/gen-chrome-theme.ts`.
 * Never hand-edit the generated file; to change the chrome, re-export the
 * platform system from Escala over `platformFoundations.json` and regenerate.
 *
 * `--fg-faint` is deliberately absent: `content.subtle` is a watermark role
 * (and in this export it resolves darker than `content.primary` in light),
 * not a third readable ink. It stays hand-tuned in `index.css`.
 */

import foundations from './platformFoundations.json'

type RoleValue = { light: string; dark: string }
const ROLES = foundations.roles as Record<string, RoleValue>

/** The platform's brand anchor (tone 9). The shell derives the chrome accent ramp from it. */
export const PLATFORM_ACCENT: string = foundations.accent

/** CSS custom property → Categorical role id (`group.key`). Order = declaration order. */
export const CHROME_ROLES = {
  '--app': 'surface.page',
  '--nav': 'surface.page',
  '--surface': 'surface.layer-1',
  '--tab-bar': 'surface.layer-1',
  '--rail-section': 'surface.layer-1',
  '--panel': 'surface.layer-1',
  '--chip-rest': 'surface.layer-1',
  '--elevated': 'surface.layer-2',
  /**
   * The raised panel (inspector, Components directory). Dark lifts it one
   * step toward the viewer (layer-2). Light must NOT: its ladder steps DOWN
   * (page → layer-1 → layer-2 get darker), so layer-2 painted the whole
   * inspector mid-grey. In light the panel sits on the page level and its
   * hairline separates it, exactly like the canvas card beside it (`bg-app`).
   */
  '--side-panel': { light: 'surface.page', dark: 'surface.layer-2' },
  '--input-bg': 'surface.input',
  '--fg': 'content.primary',
  '--fg-muted': 'content.secondary',
  '--line': 'border.subtle',
  '--line-strong': 'border.default',
  /** A selected row's edge (the open colour role) — the one stroke meant to be seen. */
  '--line-emphasis': 'border.control-hover',
  /** A secondary control on a row: the selected role's swatch + hex pill, "Show". */
  /**
   * Dark raises the control one step over its row. Light's
   * action.secondary.default is a button FILL (mid-grey), and as the label
   * well of a picker it left `--fg-muted` under 3:1. In light a control on a
   * grey row is the page-white chip (the segmented-control convention).
   */
  '--chrome-control': { light: 'surface.page', dark: 'action.secondary.default' },
  /** The selected segment of a segmented control. */
  '--chrome-control-pressed': 'action.secondary.pressed',
  '--status-danger': 'status.critical.content',
  '--status-success': 'status.success.content',
  '--status-warning': 'status.warning.content',
  '--status-info': 'status.info.content',
} as const

export type ChromeVar = keyof typeof CHROME_ROLES
type ChromeRole = string | { light: string; dark: string }

/** The role a chrome var reads in one appearance. */
export function chromeRoleFor(cssVar: ChromeVar, appearance: ChromeAppearance): string {
  const role: ChromeRole = CHROME_ROLES[cssVar]
  return typeof role === 'string' ? role : role[appearance]
}
export type ChromeAppearance = 'light' | 'dark'

export type ChromeTheme = {
  vars: Record<ChromeAppearance, Record<string, string>>
  labels: Record<ChromeAppearance, Record<string, string>>
}

export function resolveChromeTheme(): ChromeTheme {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  const labels: Record<ChromeAppearance, Record<string, string>> = { light: {}, dark: {} }
  const vars = { light, dark }
  for (const cssVar of Object.keys(CHROME_ROLES) as ChromeVar[]) {
    for (const a of ['light', 'dark'] as const) {
      const role = chromeRoleFor(cssVar, a)
      const value = ROLES[role]?.[a]
      if (!value) throw new Error(`chrome role ${role} (${a}) is not in platformFoundations.json`)
      vars[a][cssVar] = value
      labels[a][cssVar] = role
    }
  }
  // `--line-alpha` is the same structural hairline as `--line`.
  light['--line-alpha'] = light['--line']
  dark['--line-alpha'] = dark['--line']
  labels.light['--line-alpha'] = 'tracks --line'
  labels.dark['--line-alpha'] = 'tracks --line'
  return { vars, labels }
}

function block(selector: string, vars: Record<string, string>, labels: Record<string, string>): string {
  const lines = Object.keys(vars).map((name) => `  ${name}: ${vars[name]}; /* ${labels[name]} */`)
  return `${selector} {\n${lines.join('\n')}\n}`
}

/** Source of the committed `chromeTheme.generated.css`. */
export function renderChromeThemeCss(): string {
  const theme = resolveChromeTheme()
  return `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with \`npx tsx scripts/gen-chrome-theme.ts\`.
 *
 * Platform chrome resolved from the platform's own foundations
 * (\`src/lib/platformFoundations.json\`, accent ${PLATFORM_ACCENT}).
 * \`--fg-faint\` is not generated: it stays hand-tuned in index.css.
 * See \`src/lib/chromeTheme.ts\`.
 */

${block(':root, .light', theme.vars.light, theme.labels.light)}

${block('.dark', theme.vars.dark, theme.labels.dark)}
`
}
