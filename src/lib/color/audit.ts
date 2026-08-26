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
  compositeOver,
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



// ── Curated architecture ─────────────────────────────────────────────────────
// The flat ROLE_GROUPS catalogue is the underlying editing model; Categorical
// is the curated role table shipped on top of it, with explicit
// {family.tone} refs. Auditing only the flat one would miss the fact that the
// two can disagree — which is finding H3, and the whole reason for P2.
// (Astryx / shadcn / Carbon / Vibrancy / Tonal were retired — Categorical is
// the only architecture, so this map has one entry rather than five.)
//
// Each entry: foreground token, the background it is READ ON, and its intent.
// `group.key` addressing matches the projection tables.
// `backdrop` is what a TRANSLUCENT `bg` composites over before it's measured
// — a wash has no colour of its own until something is behind it. Defaults to
// `surface.page` (a status banner or selected row sits on the page unless
// stated otherwise); name a different role for one that lives inside a card.
// Ignored when `bg` is opaque, so every pre-alpha pairing is untouched.
type Pairing = { fg: string; bg: string; intent: IntentClass; backdrop?: string }

const OPAQUE_HEX = /^#[0-9a-f]{6}$/i
const TRANSLUCENT_HEX = /^#[0-9a-f]{8}$/i

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
    // `ui-component`, and it MUST pass — `border.default` is the control
    // boundary now (the border roles were split by job: decoration has no
    // floor, the boundary targets WCAG 1.4.11 + APCA Lc 45). This entry used
    // to be `decorative` with a note claiming "the architecture currently has
    // NO 1.4.11-compliant border role at all"; that was true when `default`
    // was a tone-5 hairline and is false now — light {neutral.8} = 3.26/Lc60,
    // dark {neutral-dark.11} = 11.99/Lc75.
    { fg: 'border.default',    bg: 'surface.page',    intent: 'ui-component' },
    // Emphasis, one step past the boundary — audited as `ui-component` too,
    // since anything heavier than a passing boundary passes by construction.
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
    { fg: 'status.info.content',     bg: 'status.info.surface',     intent: 'large-text' },
  ],
}

function projectionInputFor(sys: System): ProjectionInput {
  return {
    themes: { light: {}, dark: {} },
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {},
    scales: sys.scales,
    accent: sys.accent,
    pageBackground: sys.lightBg,
    darkBackground: sys.darkBg,
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
      const rawBg = resolved.get(p.bg)?.[theme]
      if (!fg || !rawBg) continue

      // COMPOSITE before measuring. A translucent background used to hit the
      // `continue` below and vanish from the matrix entirely — a silent hole
      // that would have grown with every alpha-backed role. Now a wash is
      // resolved against its declared backdrop and audited like any other
      // colour; only a genuinely unresolvable value is skipped.
      let bg = rawBg
      if (TRANSLUCENT_HEX.test(rawBg)) {
        const backdropRole = p.backdrop ?? 'surface.page'
        const backdrop = resolved.get(backdropRole)?.[theme]
        if (!backdrop || !OPAQUE_HEX.test(backdrop)) {
          throw new Error(
            `audit: ${p.bg} is translucent in ${theme} and its backdrop "${backdropRole}" did not resolve to an opaque colour — a wash cannot be measured without one.`,
          )
        }
        bg = compositeOver(rawBg, backdrop)
      }
      // A translucent FOREGROUND is always a modelling error: ink is never a
      // wash. Loud, because the alternative is a contrast number scored
      // against a colour nothing will ever render.
      if (!OPAQUE_HEX.test(fg)) {
        if (TRANSLUCENT_HEX.test(fg)) {
          throw new Error(`audit: ${p.fg} resolved translucent (${fg}) in ${theme} — a foreground must be opaque.`)
        }
        continue
      }
      if (!OPAQUE_HEX.test(bg)) continue
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

