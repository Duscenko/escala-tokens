/**
 * The contrast matrix — the ENGINE, with no rendering and no assertions.
 *
 * Builds a full design system for a matrix of brand seeds, resolves every
 * semantic role in every theme, and scores every foreground/background pair in
 * WCAG 2.1 AND APCA.
 *
 * Two consumers, one implementation — that is the point of this file living
 * here rather than inside the script:
 *   · `scripts/color-report.ts`            renders it for a human
 *   · `__tests__/contrast-matrix.test.ts`  asserts on it in CI
 *
 * A second copy of this logic is how the two would drift, and the whole colour
 * layer is under a no-duplication rule (see Conventions in CLAUDE.md).
 */

import {
  generateColorScale,
  generateFamilyDarkScale,
  generateDarkColorScale,
  backgroundFromBase,
  neutralFromBrand,
  recommendStateColors,
  DEFAULT_NEUTRAL_TINT,
  type ColorAlgorithm,
} from '../colorUtils'
import {
  ALL_ROLES, ROLE_GROUPS, sourceScaleFor, recHexFor, recToneFor,
  type Role, type GlobalScales,
} from '../semanticRoles'
import {
  buildArchitectureView, type SemanticArchitecture, type ProjectionInput,
} from '../semanticArchitectures'
import { evaluate, type IntentClass } from './apca'

// ── Intent ───────────────────────────────────────────────────────────────────
// Intent is now a REQUIRED field on Role (P2b) rather than being guessed here.
// The heuristic this replaces is what let `content-secondary` sit at 3:1 while
// nothing complained: the report inferred an intent, so the role never had to
// declare one, so no test could hold it to anything.
const CATEGORY = new Map<string, string>()
for (const g of ROLE_GROUPS) for (const r of g.roles) CATEGORY.set(r.key, g.category)

const intent = (role: Role): IntentClass => role.intent

// ── System construction — mirrors what the store does ────────────────────────
export type System = { name: string; scales: GlobalScales; lightBg: string; darkBg: string; accent: string; errorSeed: string }

export function buildSystem(name: string, brand: string, algorithm: ColorAlgorithm): System {
  const tint = DEFAULT_NEUTRAL_TINT
  const neutral = neutralFromBrand(brand, tint)
  const lightBg = backgroundFromBase(neutral, 'light', tint)
  const darkBg = backgroundFromBase(neutral, 'dark', tint)
  const states = recommendStateColors(brand)

  const light = (hex: string) => generateColorScale(hex, algorithm, 0, lightBg, 'light', tint)
  const dark = (hex: string) => generateFamilyDarkScale(hex, algorithm, 0, darkBg)

  const scales: GlobalScales = {
    gray: generateColorScale(neutral, algorithm, 0, lightBg, 'light', tint),
    grayDark: generateDarkColorScale(neutral, algorithm, 0, darkBg, tint),
    brand: light(brand),
    error: light(states.error),
    warning: light(states.warning),
    success: light(states.success),
    info: light(states.info),
    dark: {
      gray: generateDarkColorScale(neutral, algorithm, 0, darkBg, tint),
      brand: dark(brand),
      error: dark(states.error),
      warning: dark(states.warning),
      success: dark(states.success),
      info: dark(states.info),
    },
  }
  return { name, scales, lightBg, darkBg, accent: brand, errorSeed: states.error }
}

// ── Audit ────────────────────────────────────────────────────────────────────
export type Finding = {
  system: string
  theme: 'light' | 'dark'
  role: string
  against: string
  intent: IntentClass
  fg: string
  bg: string
  tone: number
  wcag: number
  apcaLc: number
  passesWcag: boolean
  passesApca: boolean
}

const roleByKey = new Map(ALL_ROLES.map((r) => [r.key, r]))

function resolve1(role: Role, theme: 'light' | 'dark', sys: System) {
  const scale = sourceScaleFor(role, theme, sys.scales)
  return { hex: recHexFor(role, theme, scale), tone: recToneFor(role, theme, scale) }
}

export function auditSystem(sys: System): Finding[] {
  const out: Finding[] = []
  for (const theme of ['light', 'dark'] as const) {
    for (const role of ALL_ROLES) {
      if (!role.contrastAgainst) continue
      const bgRole = roleByKey.get(role.contrastAgainst)
      if (!bgRole) continue

      const fg = resolve1(role, theme, sys)
      const bg = resolve1(bgRole, theme, sys)
      if (!fg.hex || !bg.hex) continue

      const it = intent(role)
      const v = evaluate(fg.hex, bg.hex, it)
      out.push({
        system: sys.name, theme, role: role.key, against: bgRole.key, intent: it,
        fg: fg.hex, bg: bg.hex, tone: fg.tone,
        wcag: Number(v.wcag.toFixed(2)), apcaLc: Number(v.apcaLc.toFixed(1)),
        passesWcag: v.passesWcag, passesApca: v.passesApca,
      })
    }
  }
  return out
}

// ── Seed matrix ──────────────────────────────────────────────────────────────
export const SEEDS: [name: string, hex: string][] = [
  ['violet', '#7f56d9'], ['blue', '#2563eb'], ['teal', '#0d9488'],
  ['green', '#16a34a'], ['amber', '#d97706'], ['red', '#dc2626'],
  ['pink', '#db2777'], ['indigo', '#4f46e5'], ['slate', '#475569'],
  ['vivid-magenta', '#ff0055'],
]
export const ALGORITHMS: ColorAlgorithm[] = ['radix', 'tailwind', 'ant', 'default']



// ── Curated architectures ────────────────────────────────────────────────────
// The flat ROLE_GROUPS catalogue is only one of the tables in play. Categorical,
// Astryx and shadcn/ui each carry their OWN curated role table with explicit
// {family.tone} refs. Auditing only the flat one would miss the fact that the
// two disagree — which is finding H3, and the whole reason for P2.
//
// Each entry: foreground token, the background it is READ ON, and its intent.
// `group.key` addressing matches the projection tables.
type Pairing = { fg: string; bg: string; intent: IntentClass }

export const CURATED_PAIRINGS: Partial<Record<SemanticArchitecture, Pairing[]>> = {
  categorical: [
    { fg: 'content.primary',   bg: 'surface.page',    intent: 'body-text' },
    { fg: 'content.secondary', bg: 'surface.page',    intent: 'body-text' },
    // De-emphasis tier — see the note on CATEGORICAL_ROLES content.subtle.
    { fg: 'content.subtle',    bg: 'surface.page',    intent: 'decorative' },
    { fg: 'content.accent',    bg: 'surface.page',    intent: 'body-text' },
    { fg: 'content.disabled',  bg: 'surface.page',    intent: 'decorative' },
    { fg: 'content.link.default', bg: 'surface.page', intent: 'body-text' },
    { fg: 'content.link.hover',   bg: 'surface.page', intent: 'body-text' },
    { fg: 'content.on-action', bg: 'action.primary.default',  intent: 'body-text' },
    { fg: 'content.primary',   bg: 'surface.layer-1', intent: 'body-text' },
    { fg: 'content.primary',   bg: 'surface.layer-2', intent: 'body-text' },
    { fg: 'content.primary',   bg: 'surface.input',   intent: 'body-text' },
    { fg: 'content.primary',   bg: 'surface.selected', intent: 'body-text' },
    { fg: 'content.inverse',   bg: 'surface.inverse', intent: 'body-text' },
    { fg: 'status.critical-on-solid', bg: 'status.critical.surface-solid', intent: 'body-text' },
    // `decorative`, not `ui-component` — deliberately. NO tone in the Radix
    // border band (6–8) reaches WCAG 3:1 against the page in either appearance
    // (light tops out at 3.36 on tone 8; dark at 2.39). That is structural:
    // Radix 6–8 are subtle separators, not control boundaries. The architecture
    // currently has NO 1.4.11-compliant border role at all — auditing this one
    // as `ui-component` reports a failure against a job it was never given.
    // See the "missing role" note in docs/color/IMPLEMENTATION-LOG.md.
    { fg: 'border.default',    bg: 'surface.page',    intent: 'decorative' },
    { fg: 'border.strong',     bg: 'surface.page',    intent: 'ui-component' },
    { fg: 'border.focus',     bg: 'surface.page',    intent: 'ui-component' },
    // DECORATIVE by decision — brand emphasis, not a state indicator. Anything
    // signalling selected/focused/active must use border.focus, which is
    // solved to clear both floors. See the note on CATEGORICAL_ROLES.
    { fg: 'border.accent',     bg: 'surface.page',    intent: 'decorative' },
    { fg: 'border.subtle',     bg: 'surface.page',    intent: 'decorative' },
    { fg: 'border.critical',   bg: 'surface.input',   intent: 'ui-component' },
    { fg: 'border.warning',    bg: 'surface.input',   intent: 'ui-component' },
    { fg: 'border.success',    bg: 'surface.input',   intent: 'ui-component' },
    { fg: 'status.critical.content', bg: 'status.critical.surface', intent: 'large-text' },
    { fg: 'status.warning.content',  bg: 'status.warning.surface',  intent: 'large-text' },
    { fg: 'status.success.content',  bg: 'status.success.surface',  intent: 'large-text' },
  ],
  carbon: [
    // Carbon's whole point: a component does not know which surface it landed
    // on, so every foreground has to clear ALL FOUR depths. The other
    // architectures cannot express this pairing — they have one background.
    { fg: 'text.text-primary',   bg: 'layer.background', intent: 'body-text' },
    { fg: 'text.text-primary',   bg: 'layer.layer-01',   intent: 'body-text' },
    { fg: 'text.text-primary',   bg: 'layer.layer-02',   intent: 'body-text' },
    { fg: 'text.text-primary',   bg: 'layer.layer-03',   intent: 'body-text' },
    { fg: 'text.text-secondary', bg: 'layer.background', intent: 'large-text' },
    { fg: 'text.text-secondary', bg: 'layer.layer-01',   intent: 'large-text' },
    { fg: 'text.text-secondary', bg: 'layer.layer-02',   intent: 'large-text' },
    { fg: 'text.text-secondary', bg: 'layer.layer-03',   intent: 'large-text' },
    // The non-essential tier — same rule as the flat catalogue.
    { fg: 'text.text-placeholder', bg: 'layer.layer-01', intent: 'decorative' },
    { fg: 'text.text-disabled',    bg: 'layer.layer-01', intent: 'decorative' },
    { fg: 'icon.icon-primary',   bg: 'layer.background', intent: 'ui-component' },
    { fg: 'icon.icon-primary',   bg: 'layer.layer-03',   intent: 'ui-component' },
    { fg: 'icon.icon-secondary', bg: 'layer.layer-03',   intent: 'ui-component' },
    // Control boundaries, at every depth.
    { fg: 'border.border-strong-01', bg: 'layer.layer-01', intent: 'ui-component' },
    { fg: 'border.border-strong-02', bg: 'layer.layer-02', intent: 'ui-component' },
    { fg: 'border.border-strong-03', bg: 'layer.layer-03', intent: 'ui-component' },
    { fg: 'border.border-interactive', bg: 'layer.background', intent: 'ui-component' },
    { fg: 'interactive.focus',   bg: 'layer.background', intent: 'ui-component' },
    // Subtle borders are separators, not control boundaries.
    { fg: 'border.border-subtle-00', bg: 'layer.background', intent: 'decorative' },
    { fg: 'border.border-subtle-01', bg: 'layer.layer-01',   intent: 'decorative' },
    // `large-text`, and the reasoning is worth keeping. A button label on a
    // LIGHT accent fill (which is what Carbon uses in its dark themes) cannot
    // reach APCA body grade: the best ink available measures WCAG 7.53 at
    // Lc 68.1. That is a ceiling of the fill, not a solver failure — and APCA's
    // Bronze table does lower the bar for bold text, which button labels are.
    //
    // For scale: IBM's own dark `textOnColor` is #ffffff on blue-50, about
    // 3.1:1. Ours is 7.53:1. The token is better than the reference and still
    // honestly classified.
    { fg: 'text.text-on-color',  bg: 'interactive.interactive', intent: 'large-text' },
    { fg: 'icon.icon-on-color',  bg: 'interactive.interactive', intent: 'ui-component' },

    // ── The rest of Carbon's core contract ────────────────────────────────
    // Added when the architecture went from a 42-token subset to IBM's full
    // 103-token core set. Every token below carries a real legibility
    // obligation; the purely decorative surfaces are covered transitively by
    // the text pairs that sit on them.
    { fg: 'text.text-helper',    bg: 'layer.layer-01',   intent: 'large-text' },
    { fg: 'text.text-error',     bg: 'layer.layer-01',   intent: 'body-text' },
    { fg: 'text.text-inverse',   bg: 'layer.background-inverse', intent: 'body-text' },
    { fg: 'icon.icon-inverse',   bg: 'layer.background-inverse', intent: 'ui-component' },
    { fg: 'icon.icon-interactive', bg: 'layer.layer-01', intent: 'ui-component' },
    // Text has to stay readable on the SELECTED and ACCENT surfaces too — the
    // ones a component lands on when it is in a state, which is exactly where
    // a depth-indexed system tends to lose contrast.
    { fg: 'text.text-primary',   bg: 'layer.layer-selected-01', intent: 'body-text' },
    { fg: 'text.text-primary',   bg: 'layer.layer-accent-01',   intent: 'body-text' },
    { fg: 'text.text-primary',   bg: 'layer.layer-hover-01',    intent: 'body-text' },
    { fg: 'text.text-primary',   bg: 'field.field-01',   intent: 'body-text' },
    { fg: 'text.text-placeholder', bg: 'field.field-01', intent: 'decorative' },
    { fg: 'text.text-primary',   bg: 'field.field-03',   intent: 'body-text' },
    // Links: primary and secondary are body copy, visited included — Carbon
    // distinguishes it by hue, and a hue-only distinction still has to be
    // legible on its own.
    { fg: 'link.link-primary',   bg: 'layer.background', intent: 'body-text' },
    { fg: 'link.link-primary',   bg: 'layer.layer-01',   intent: 'body-text' },
    { fg: 'link.link-secondary', bg: 'layer.background', intent: 'body-text' },
    { fg: 'link.link-visited',   bg: 'layer.background', intent: 'body-text' },
    { fg: 'link.link-inverse',   bg: 'layer.background-inverse', intent: 'body-text' },
    // Status indicators are non-text UI, so 3:1 / Lc 45.
    { fg: 'support.support-error',   bg: 'layer.layer-01', intent: 'ui-component' },
    { fg: 'support.support-success', bg: 'layer.layer-01', intent: 'ui-component' },
    { fg: 'support.support-warning', bg: 'layer.layer-01', intent: 'ui-component' },
    { fg: 'support.support-info',    bg: 'layer.layer-01', intent: 'ui-component' },
    { fg: 'interactive.focus-inverse', bg: 'layer.background-inverse', intent: 'ui-component' },
    { fg: 'utility.toggle-off',  bg: 'layer.layer-01',   intent: 'ui-component' },
    { fg: 'border.border-tile-01', bg: 'layer.layer-01', intent: 'decorative' },
    { fg: 'border.border-subtle-selected-01', bg: 'layer.layer-01', intent: 'decorative' },
  ],
  astryx: [
    { fg: 'text.primary',    bg: 'background.body',     intent: 'body-text' },
    { fg: 'text.secondary',  bg: 'background.body',     intent: 'body-text' },
    { fg: 'text.accent',     bg: 'background.body',     intent: 'body-text' },
    { fg: 'text.disabled',   bg: 'background.body',     intent: 'decorative' },
    { fg: 'text.primary',    bg: 'background.surface',  intent: 'body-text' },
    { fg: 'icon.primary',    bg: 'background.body',     intent: 'ui-component' },
    { fg: 'icon.secondary',  bg: 'background.body',     intent: 'ui-component' },
    { fg: 'icon.accent',     bg: 'background.body',     intent: 'ui-component' },
    { fg: 'accent.on-solid', bg: 'accent.solid',        intent: 'body-text' },
    { fg: 'status.on-success', bg: 'status.success',    intent: 'body-text' },
    { fg: 'status.on-error',   bg: 'status.error',      intent: 'body-text' },
    { fg: 'status.on-warning', bg: 'status.warning',    intent: 'body-text' },
    // Same reasoning as Categorical's border.default — see the note there.
    { fg: 'border.default',    bg: 'background.body',   intent: 'decorative' },
    { fg: 'border.emphasized', bg: 'background.body',   intent: 'decorative' },
    { fg: 'border.strong',     bg: 'background.body',   intent: 'ui-component' },
  ],
}

function projectionInputFor(sys: System): ProjectionInput {
  return {
    themes: { light: {}, dark: {} },
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {},
    scales: sys.scales,
    accent: sys.accent,
  }
}

export type CuratedFinding = Finding & { architecture: string }

export function auditCurated(sys: System, arch: SemanticArchitecture): CuratedFinding[] {
  const pairings = CURATED_PAIRINGS[arch]
  if (!pairings) return []
  const view = buildArchitectureView(arch, projectionInputFor(sys), sys.errorSeed)
  if (!view) return []

  // group.key → { mode → css }
  const resolved = new Map<string, Record<string, string>>()
  for (const cat of view.categories) {
    for (const tok of cat.tokens) {
      const modes: Record<string, string> = {}
      for (const [mode, v] of Object.entries(tok.modes)) modes[mode] = v.css
      resolved.set(`${cat.key}.${tok.key}`, modes)
    }
  }

  const out: CuratedFinding[] = []
  for (const theme of view.modeKeys as ('light' | 'dark')[]) {
    for (const p of pairings) {
      const fg = resolved.get(p.fg)?.[theme]
      const bg = resolved.get(p.bg)?.[theme]
      if (!fg || !bg || !/^#[0-9a-f]{6}$/i.test(fg) || !/^#[0-9a-f]{6}$/i.test(bg)) continue
      const v = evaluate(fg, bg, p.intent)
      out.push({
        architecture: arch, system: sys.name, theme, role: p.fg, against: p.bg,
        intent: p.intent, fg, bg, tone: -1,
        wcag: Number(v.wcag.toFixed(2)), apcaLc: Number(v.apcaLc.toFixed(1)),
        passesWcag: v.passesWcag, passesApca: v.passesApca,
      })
    }
  }
  return out
}

/** The whole matrix: flat catalogue + every curated architecture. */
export function runAudit(): { flat: Finding[]; curated: CuratedFinding[] } {
  const flat: Finding[] = []
  const curated: CuratedFinding[] = []
  for (const [seedName, hex] of SEEDS) {
    for (const algo of ALGORITHMS) {
      flat.push(...auditSystem(buildSystem(`${seedName}/${algo}`, hex, algo)))
    }
    const sys = buildSystem(`${seedName}/radix`, hex, 'radix')
    for (const arch of Object.keys(CURATED_PAIRINGS) as SemanticArchitecture[]) {
      curated.push(...auditCurated(sys, arch))
    }
  }
  return { flat, curated }
}

