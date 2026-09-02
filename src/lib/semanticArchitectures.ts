// ─── Semantic architecture ───────────────────────────────────────────────────
// The flat 89-role catalogue (semanticRoles.ts) stays the single editing model;
// this module PROJECTS it into the shipped token shape. Pure data + math — no
// store imports, so it's shared by the picker UI, the token export and the
// README without cycles.
//
//   flat        — the underlying editing model (colors.semantic / colors.themes).
//                 Still a valid `SemanticArchitecture` value and still what
//                 `themes[theme]` holds; it is simply not a projection.
//   categorical — the ONE shipped architecture: a fixed 41-role catalogue
//                 (Content · Action · Surface · Status · Border) with the
//                 light/dark primitive ref inside each token (DTCG-style),
//                 deliberately NOT the 89 flat roles.
//
// Astryx, shadcn/ui, Apple-HIG Vibrancy, Material-3 Tonal and IBM Carbon were
// each implemented here as alternative projections and have all been REMOVED —
// they were retired from the picker in store v50 and deleted outright after.
// Don't reintroduce one as a second projection: `projectCurated` +
// `CATEGORICAL_ROLES` is the single table, and the marker vocabulary below
// ({fam.solid}, {on:…}, {ink:…}, {ui:…}, {ui+:…}, {step:…}) is where a new idea
// belongs instead.
import chroma from 'chroma-js'
import type { GlobalScales } from './semanticRoles'
import { accessibleSolidTone, solidInkPair, checkContrast, WCAG_AA, BLACK_ALPHA_SCALE, WHITE_ALPHA_SCALE, generateAlphaScale } from './colorUtils'
import { apcaLc, INTENT_THRESHOLDS } from './color/apca'

/** APCA body-text floor — the same constant the audit and the ramp use. */
const APCA_BODY_TEXT = INTENT_THRESHOLDS['body-text'].apcaLc ?? 75
/** WCAG 1.4.11 + APCA floor for a non-text UI boundary (borders, focus rings,
 *  control outlines) — `checkContrast`/`apcaLc` dual-metric, `ui-component`
 *  intent. Shared by the focus-ring solver below. */
const WCAG_UI = INTENT_THRESHOLDS['ui-component'].wcag ?? 3
const APCA_UI = INTENT_THRESHOLDS['ui-component'].apcaLc ?? 45
import { hexToOklch, oklchToHex } from './color/gamut'
import type { ThemePalette } from '../store/useDesignStore'

export type SemanticArchitecture = 'flat' | 'categorical'

/** The picker's cards. Categorical is the only projection; 'flat' stays a
 *  valid TYPE value (it's the underlying editing model `themes[theme]` holds)
 *  but is not a card, and `projectArchitecture` returns null for it. */
export const ARCHITECTURE_OPTIONS: {
  key: SemanticArchitecture
  label: string
  desc: string
  /** Educational tooltip — when to reach for this system. */
  tip: string
}[] = [
  {
    key: 'categorical',
    label: 'Categorical Semantic',
    desc: 'Lightweight — 39 curated roles, light/dark built in.',
    tip: 'A minimal, fixed catalogue of 39 roles grouped by function — Content, Action, Surface, Status, Border — with the light and dark primitive reference inside each token. Best when you want a lean system that tooling walks as a token tree (DTCG, Style Dictionary, Figma modes).',
  },
]

export function architectureLabel(kind: SemanticArchitecture): string {
  return ARCHITECTURE_OPTIONS.find((o) => o.key === kind)?.label ?? kind
}

// Everything a projection needs, resolved by the caller (store or export).
export type ProjectionInput = {
  themes: Record<string, Record<string, string>>
  themeKinds: Record<string, 'light' | 'dark'>
  themePalettes: Record<string, ThemePalette>
  scales: GlobalScales
  accent: string
  /** Needed to solve a family's ALPHA twin on demand (`{<fam>-a.N}` refs,
   *  see `scaleLookup`) — an alpha value is composited against a real page,
   *  it has no meaning without one. Optional: a caller that never resolves
   *  an alpha ref (most tests) doesn't need to supply them, and omitting
   *  them just means those refs resolve `undefined` → 'transparent' in
   *  `refToView`, same as any other unresolved ref. */
  pageBackground?: string
  darkBackground?: string
}

// ── Solid fills and the ink that sits on them ────────────────────────────────
// The curated architecture has two roles that move together:
// roles: a solid brand fill and the ink ON it. Both used to be static — the
// fill's tone came from one `accessibleSolidTone(scales.brand)` call and the
// ink was hardcoded `{neutral.1}` — and that produced measurably inaccessible
// pairs, for two independent reasons:
//
//  1. **The tone was solved on the wrong ramp.** One index was computed from
//     the LIGHT accent ramp and then reused in every theme's column, where
//     `{accent.N}` resolves against THAT theme's ramp (`scaleLookup`'s dark
//     twin, or a custom family). Same number, different colour, no guarantee.
//     Measured with accent `#c76aff`: 4.60:1 light, 4.07:1 dark — one column
//     passes AA and the other doesn't, from a single shared index. Worse for a
//     ramp whose high tones are the near-WHITE end (every dark twin): the
//     search "walks up until white passes" lands on 11–12, which in a dark
//     ramp is nearly white — white ink on it is unreadable.
//  2. **The ink was assumed, never checked.** `accessibleSolidTone` searches
//     against literal `#ffffff`, but the shipped ink is `{neutral.1}` — the
//     page, a hair darker. Accent `#fff3b0` measured 4.44:1 in light: the
//     search believed it had passed. And for a mid-lightness ramp (yellow,
//     lime) near-white may never be the right answer at any tone — the
//     A hand-patched table used to spell exactly that out as `on-warning:
//     {neutral.12}`, which is the general rule written once as a special case.
//
// Both are now solved TOGETHER, per theme, against real hexes:
// `solidInkPair` walks that theme's own ramp and scores each step against the
// real ink candidates via WCAG's `C = (L_max + 0.05) / (L_min + 0.05)`,
// returning the first pair that clears AA (or the ramp's best if none can).
//
// Target is **AA (4.5:1)**, not AAA — deliberately. It's the threshold the
// rest of the system already guarantees (ramp step 11 is generated to ≈4.5,
// `chromeAccent` walks to 4.5), and demanding 7:1 would push almost every
// brand button to step 12, i.e. near-black, discarding the user's colour.
//
// The refs that SHIP are still plain `{neutral.1}` / `{neutral.12}` — the
// `{on:…}` marker below never escapes this module, so the export contract and
// `refToView`'s `{family.tone}` grammar are unchanged.

type Look = (fam: string, tone: number) => string | undefined

/** Ink candidates for a solid fill, in preference order. Near-white first: on
 *  a tie the light ink is the conventional read for a brand button. */
const INK_REFS = ['{neutral.1}', '{neutral.12}'] as const

const REF_RE = /^\{([a-z-]+)\.(\d+)\}$/

/** Every step of a family, as the ramp `solidInkPair` walks. */
function rampOf(look: Look, fam: string): Record<number, string> {
  const out: Record<number, string> = {}
  for (let t = 1; t <= 12; t++) {
    const hex = look(fam, t)
    if (hex) out[t] = hex
  }
  return out
}

/** Resolve INK_REFS to the hexes they carry in this theme. */
function inkHexes(look: Look): string[] {
  return INK_REFS.map((r) => {
    const m = REF_RE.exec(r)!
    return look(m[1], Number(m[2])) ?? (m[2] === '1' ? '#ffffff' : '#000000')
  })
}

/** Which ink ref is legible on an already-resolved fill. */
function inkRefFor(fill: string | undefined, look: Look): string {
  if (!fill) return INK_REFS[0]
  // A one-step "ramp": there's nothing to search, only the ink to choose.
  return INK_REFS[solidInkPair({ 1: fill }, inkHexes(look), 1).ink]
}

/**
 * The tone of a family that reads as TEXT on that same family's own tint —
 * `{ink:error.3}` is "the error tone that's legible on error.3".
 *
 * Distinct from `{on:…}` on purpose. `{on:…}` picks between INK_REFS
 * (near-white / near-black), which is right for a SOLID fill but would strip
 * the tint off a status message: `status.critical-fg` is meant to be dark red
 * on pale red, not plain black on pale red. This keeps the family and solves
 * only the step.
 *
 * Walks UP and takes the FIRST tone clearing BOTH metrics — the subtlest ink
 * that still passes, so the text keeps as much of the family's character as
 * contrast allows. Falls back to the ramp's best step when nothing clears,
 * mirroring `solidInkPair` rather than hardcoding 12 (on a mid-lightness family
 * the argmax can beat the endpoint). The body below has the measurements.
 *
 * Why solve it at all instead of pinning 12 as before: 12 is only correct for
 * the tone-3 tint the schema ships. The moment the `-bg` is re-pointed, a fixed
 * ink stops tracking it — measured on a hand-edited pair (bg error.5 / fg
 * error.9) that combination read 3.30:1, under AA and invisible-ish, with
 * nothing in the system objecting.
 */
/** Radix's dedicated high-contrast TEXT step. Reaching it is what turns a
 *  status message from tinted to near-black, so it's the thing being avoided —
 *  not the AA guarantee itself. */
const TEXT_END_TONE = 12

function tintInkRef(fam: string, bgTone: number, look: Look): string {
  const bg = look(fam, bgTone)
  const ramp = rampOf(look, fam)
  if (!bg) return `{${fam}.${TEXT_END_TONE}}`

  // Status text on a status tint, solved against BOTH metrics.
  //
  // This used to walk up to the first tone clearing STATUS_INK_TARGET (3:1) and
  // stop, on the stated grounds that "nothing but tone 12 ever clears AA on a
  // light ramp, and tone 12 means snapping to near-black". Both halves of that
  // are now false:
  //
  //  · The first half predates the APCA retarget of steps 11–12. Re-measured
  //    across six seeds, tone 12 on tone 3 clears AA AND Lc 75 in every family
  //    and both appearances (WCAG 10.04–13.00, Lc 84.4–88.6).
  //  · The second half was never true. Tone 12 keeps 42 % of the family's
  //    chroma — error.12 is #5c241d, warning.12 #522c06, success.12 #0c3d22.
  //    Dark red, dark amber, dark green. Not black.
  //
  // Step-11-or-12 text on a step-3 background is Radix's own canonical pairing,
  // so this is the taxonomy's answer rather than a compromise. The subtlest
  // tone clearing both wins, which keeps the ink as light as it legitimately
  // can be instead of always jumping to the end of the ramp.
  let fallback = TEXT_END_TONE
  let bestScore = -Infinity

  for (let t = 1; t <= TEXT_END_TONE; t++) {
    const hex = ramp[t]
    if (!hex) continue
    const w = checkContrast(hex, bg)
    const lc = Math.abs(apcaLc(hex, bg))
    if (w >= WCAG_AA && lc >= APCA_BODY_TEXT) return `{${fam}.${t}}`
    // Rank by distance from BOTH floors, so the fallback is the tone closest to
    // satisfying the pair rather than the one with the biggest WCAG number.
    const score = Math.min(w / WCAG_AA, lc / APCA_BODY_TEXT)
    if (score > bestScore) { bestScore = score; fallback = t }
  }
  return `{${fam}.${fallback}}`
}

/**
 * The tone of `fam`'s ramp that works as a NON-TEXT UI boundary against the
 * page — a focus ring, a control outline. Solved rather than pinned, because
 * every ramp this is asked about is tinted by a hue the USER supplies, so its
 * luminance is outside this system's control and a fixed tone cannot honestly
 * promise a floor.
 *
 * Walks UP from `start` and returns the FIRST tone clearing both WCAG 1.4.11
 * (3:1) and APCA Lc 45 — the `ui-component` intent. Falls back to the
 * closest-to-passing tone rather than a hardcoded step, mirroring
 * `solidInkPair`/`tintInkRef`.
 *
 * Both callers were pinned tones that measurably failed:
 *  · `border.focus` (start 9) was `{accent.9}` with a comment claiming it
 *    "clears both" — 5 of 8 accent hues fell under 3:1 (yellow 1.53).
 *  · `border.default` (start 8) was pinned to `{neutral.8}` by the border
 *    realignment, which holds for most systems and misses on a neutral tinted
 *    by certain accents — the contrast matrix caught teal/radix at 2.96 and
 *    green/radix at 2.98, i.e. the SAME defect the focus-ring fix existed to
 *    remove, one notch milder. Starting the walk at 8 keeps every passing
 *    system on 8 and lifts only the ones that need it.
 */
function uiBoundaryRef(fam: string, start: number, kind: 'light' | 'dark', look: Look): string {
  const page = look(kind === 'dark' ? 'neutral-dark' : 'neutral', 1)
  if (!page) return `{${fam}.${start}}`
  const ramp = rampOf(look, fam)
  let fallback = start
  let bestScore = -Infinity
  for (let t = start; t <= 12; t++) {
    const hex = ramp[t]
    if (!hex) continue
    const w = checkContrast(hex, page)
    const lc = Math.abs(apcaLc(hex, page))
    if (w >= WCAG_UI && lc >= APCA_UI) return `{${fam}.${t}}`
    const score = Math.min(w / WCAG_UI, lc / APCA_UI)
    if (score > bestScore) { bestScore = score; fallback = t }
  }
  return `{${fam}.${fallback}}`
}

/** The tone number `uiBoundaryRef` resolved to — for a role that must sit a
 *  step ABOVE the boundary (`border.strong`) and would otherwise collapse onto
 *  it whenever the boundary itself had to walk up. */
function uiBoundaryTone(fam: string, start: number, kind: 'light' | 'dark', look: Look): number {
  return Number(REF_RE.exec(uiBoundaryRef(fam, start, kind, look))?.[2] ?? start)
}

/**
 * A hover/pressed tone `offset` steps past the RESOLVED solid, re-verified
 * through `solidInkPair` rather than assumed — pinning hover/pressed to fixed
 * tones (the old `{accent.10}`/`{accent.11}`) silently breaks the moment the
 * solid itself isn't 9, which `{accent.solid}` guarantees for any hue whose
 * anchor can't carry white-or-near-black ink at Lc 75 (measured: 8 of 12
 * seeded hues resolve the solid to 11, not 9).
 *
 * `solidTone` is passed in rather than recomputed — `curatedRefs` already
 * memoises it per family via `solidToneFor`, and reusing that value is what
 * guarantees `{step:accent+1}` can never disagree with what `{accent.solid}`
 * itself resolved to for the SAME theme.
 *
 * Clamped to 12 before the walk: `solidInkPair`'s loop runs `start..12`, so an
 * unclamped `start` past 12 would never enter it and return the out-of-range
 * start verbatim (`{accent.13}`, which resolves to nothing).
 *
 * When the solid is already at 11 (one step of ramp headroom left), both
 * `+1` and `+2` land on 12 — a real, legible pressed state, just not distinct
 * from hover. Verified: no hue in the audited set has ANY tone past 12 that
 * still carries the label, so this is a property of the ramp, not a solver
 * shortfall — see the design plan's two negative results (pure-black ink,
 * relaxed Lc 60 target) for what was ruled out before accepting it.
 */
function solidStepRef(fam: string, offset: number, solidTone: number, look: Look): string {
  const ramp = rampOf(look, fam)
  const start = Math.min(solidTone + offset, 12)
  const { tone } = solidInkPair(ramp, inkHexes(look), start)
  return `{${fam}.${tone}}`
}

/**
 * A curated role table resolved for ONE theme, against that theme's OWN ramps.
 *
 * Five markers are substituted here, and only here:
 *  · `{accent.solid}`    → `{accent.<tone>}`, the accessible fill step
 *  · `{on:<fam>.<tone>}` → whichever INK_REF actually passes on that fill
 *    (`{on:accent.solid}` resolves the fill's tone first)
 *  · `{ink:<fam>.<tone>}` → the same family's tone that reads on that tint
 *  · `{ui:<fam>.<start>}`  → the first tone from `start` that works as a
 *    non-text UI boundary against the page (see `uiBoundaryRef`)
 *  · `{ui+:<fam>.<start>}` → one step past whatever `{ui:…}` resolved to —
 *    the emphasis stroke, which must not collapse onto the boundary
 *  · `{step:<fam>+<n>}`    → `<n>` tones past the RESOLVED solid, re-verified
 *    (see `solidStepRef`)
 *
 * All five collapse to a plain `{family.tone}` here, which is what makes the
 * result editable: `architectureOverrides` are applied AFTER this, so the
 * system assigns a sensible value by default and a hand-picked one still wins.
 */
function curatedRefs(
  roles: { group: string; key: string; light: string; dark: string }[],
  kind: 'light' | 'dark',
  look: Look,
  /** Brand seed — only needed to derive `{chart.N}` series colours. */
  accentHex = '#000000',
): { group: string; key: string; ref: string }[] {
  const chartSlots = chartPalette(accentHex)
  // Memoised per family — each `{fam.solid}` resolves to the lightest tone of
  // that ramp whose label still clears both contrast floors.
  const solidTones = new Map<string, number>()
  const solidToneFor = (fam: string): number => {
    let t = solidTones.get(fam)
    if (t === undefined) {
      t = solidInkPair(rampOf(look, fam), inkHexes(look)).tone
      solidTones.set(fam, t)
    }
    return t
  }
  return roles.map((r) => {
    const ref = (kind === 'dark' ? r.dark : r.light)
      // Handles both `{accent.solid}` and `{on:accent.solid}` in one pass.
      // `{fam.solid}` and `{on:fam.solid}` for ANY family, not just accent.
      // Status fills used to be pinned to `{error.9}` while the accent used
      // `{accent.solid}` — one table, two conventions. Tone 9 of a red ramp
      // cannot carry white OR near-black ink at AA (measured worst: 3.55), so
      // the pinned form was unfixable by choosing a better ink. Solving the
      // FILL tone is what Categorical already does.
      .replace(/\{(on:)?([a-z-]+)\.solid\}/g, (_m, on: string | undefined, fam: string) =>
        `{${on ?? ''}${fam}.${solidToneFor(fam)}}`)
      .replace(/\{on:([a-z-]+)\.(\d+)\}/g, (_m, fam: string, tone: string) =>
        inkRefFor(look(fam, Number(tone)), look))
      .replace(/\{ink:([a-z-]+)\.(\d+)\}/g, (_m, fam: string, tone: string) =>
        tintInkRef(fam, Number(tone), look))
      // `{ui:<fam>.<start>}` — the control boundary / focus ring, solved from
      // `start`. `{ui+:…}` is the EMPHASIS step: one past whatever the
      // boundary actually resolved to, so it can never collapse onto it when
      // the boundary itself had to walk up (which is exactly what a pinned
      // `border.strong` would have done on a teal or green tinted neutral).
      .replace(/\{ui\+:([a-z-]+)\.(\d+)\}/g, (_m, fam: string, start: string) =>
        uiBoundaryRef(fam, Math.min(uiBoundaryTone(fam, Number(start), kind, look) + 1, 12), kind, look))
      .replace(/\{ui:([a-z-]+)\.(\d+)\}/g, (_m, fam: string, start: string) =>
        uiBoundaryRef(fam, Number(start), kind, look))
      .replace(/\{step:([a-z-]+)\+(\d+)\}/g, (_m, fam: string, n: string) =>
        solidStepRef(fam, Number(n), solidToneFor(fam), look))
      // `{chart.N}` is a computed series colour, not a ramp step — it resolves
      // to a literal, which `refToView` passes through unchanged.
      .replace(/\{chart\.(\d)\}/g, (_m, n: string) => chartSlots[Number(n) - 1] ?? '')
    return { group: r.group, key: r.key, ref }
  })
}

/** The curated role table → per-theme refs. Categorical is the only
 *  architecture now; this stays a generic loop over a role table rather than
 *  being inlined into `projectCategorical`, because the marker substitution
 *  above is the part worth keeping separable from any one catalogue. */
function projectCurated(
  roles: { group: string; key: string; light: string; dark: string }[],
  input: ProjectionInput,
  themeOrder: string[],
): Record<string, Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, Record<string, string>>> = {}
  for (const t of themeOrder) {
    const kind = input.themeKinds[t] ?? 'light'
    // The SAME lookup `buildArchitectureView` renders with, so the tone this
    // solves for is scored against the exact hex the table will show.
    const look = scaleLookup(input.scales, input.themePalettes[t], kind, input.pageBackground, input.darkBackground)
    for (const r of curatedRefs(roles, kind, look, input.accent)) {
      out[r.group] ??= {}
      out[r.group][r.key] ??= {}
      out[r.group][r.key][t] = r.ref
    }
  }
  return out
}

// ── Categorical ──────────────────────────────────────────────────────────────
// LIGHTWEIGHT by contract: a fixed, curated 39-role catalogue — NOT a
// projection of the 89 flat roles. Content · Action · Surface · Status ·
// Border, every leaf carrying its light + dark primitive reference. Tones
// follow the same math the flat catalogue uses (gray hierarchy inverts onto
// neutral-dark, subtle tints deepen 2→11, text band mirrors 11→7, solid brand
// fills hold their tone), so both architectures always agree on what a role
// looks like.
// NOTE ON THE DARK COLUMN: `neutral-dark` runs 1 = darkest (tone 1 IS
// `darkBackground`, emitted verbatim) → 12 = lightest, exactly like the light
// ramp runs 1 = page → 12 = highest-contrast text. So a dark ref uses the SAME
// step number as its light counterpart, not a mirrored one. This table
// originally mirrored them (page → `{neutral-dark.12}`), which rendered the
// whole dark column as a light theme — the same leftover pre-Radix inversion
// that had to be removed from the flat catalogue's `darkTone`s. Keep the steps
// aligned; if you find yourself writing `13 − n` here, that's the bug.
const CATEGORICAL_ROLES: { group: string; key: string; light: string; dark: string }[] = [
  // Content — text & icon ink
  { group: 'content', key: 'primary',   light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // Sits on action.primary, so its ink is SOLVED against that fill per theme
  // (see curatedRefs) — never assumed white. Ships as {neutral.1} or {neutral.12}.
  { group: 'content', key: 'on-action', light: '{on:accent.solid}', dark: '{on:accent.solid}' },
  { group: 'content', key: 'secondary', light: '{neutral.11}', dark: '{neutral-dark.11}' },
  // DE-EMPHASIS tier, not a third readable level. `primary` (12) and
  // `secondary` (11) are the two perceivable text levels this system can
  // deliver; in dark mode step 9 measures Lc 21 against the page. Use it for
  // placeholders and watermarks, never for information.
  { group: 'content', key: 'subtle',    light: '{neutral.9}',  dark: '{neutral-dark.9}' },
  { group: 'content', key: 'inverse',   light: '{neutral.1}',  dark: '{neutral-dark.1}' }, // ink on surface.inverse
  { group: 'content', key: 'accent',    light: '{accent.11}',  dark: '{accent.11}' },
  // Disabled ink — tone 7. Categorical used to have no disabled ink at all and
  // the preview panel fell back to another scheme's value for the slot;
  // adopting the tone natively means that fallback is no longer needed.
  { group: 'content', key: 'disabled', light: '{neutral.7}', dark: '{neutral-dark.7}' },
  // Link ink + its hover step. NOT the user-proposed {accent.10}/{accent.11} —
  // tone 10 is the ramp's "solid hover" FILL step, not a text step, and isn't
  // solved for AA as text (same bug class as shadcn's `muted.foreground` fix
  // below). 11/12 are the ramp's two genuine text steps, same as `content.accent`.
  { group: 'content', key: 'link.default', light: '{accent.11}', dark: '{accent.11}' },
  { group: 'content', key: 'link.hover',   light: '{accent.12}', dark: '{accent.12}' },
  // Action — interactive fills ('{accent.solid}' resolves to accessibleSolidTone)
  { group: 'action', key: 'primary.default', light: '{accent.solid}', dark: '{accent.solid}' },
  { group: 'action', key: 'secondary.default', light: '{neutral.3}',    dark: '{neutral-dark.3}' },
  { group: 'action', key: 'secondary.accent', light: '{accent.3}',     dark: '{accent.3}' },
  { group: 'action', key: 'disabled',  light: '{neutral.2}',    dark: '{neutral-dark.2}' },
  // Hover/pressed on the primary fill — SOLVED `n` steps past the RESOLVED
  // solid (`{step:accent+n}`), not pinned. This used to be fixed one/two steps
  // past tone 9, on the stated assumption that the solid always lands there —
  // false for 8 of 12 seeded hues, whose solid resolves to 11 (see
  // `solidInkPair`). Measured under the old pin: light hover fell to 1.78:1 on
  // yellow (fails AA), and light pressed at a FIXED 11 was identical to
  // default for every one of those 8 hues — no pressed state at all. Dark
  // pressed was worse: `{accent.6}`, "measured by eye… read as a hover-again,
  // not as 'down'" against an assumed solid of 9, measured Lc 0–24 across
  // every hue once the solid actually resolves to 11.
  //
  // `{step:accent+1}`/`+2` re-verify through the SAME `solidInkPair` search
  // `{accent.solid}` uses, so a cool/saturated accent (solid stays at 9) keeps
  // resolving to exactly `accent.10`/`accent.11` — byte-identical to before.
  // When the solid is already 11, both land on 12: the ramp's last tone that
  // can carry the label at all (verified — pure-black ink and a relaxed Lc 60
  // target were both tried and neither recovers a distinct third step; see
  // design-plans/action-states-and-info-status.md). Pressed and hover then
  // share a tone, which is still a real, legible state — unlike the fixed-11
  // pin it replaces, which wasn't a state at all for those hues.
  { group: 'action', key: 'primary.hover',   light: '{step:accent+1}', dark: '{step:accent+1}' },
  { group: 'action', key: 'primary.pressed', light: '{step:accent+2}', dark: '{step:accent+2}' },
  // Ghost / tertiary fill — a borderless button's hover/pressed wash. This is
  // the first role backed by a COLOURED alpha primitive (`{accent-a.N}`,
  // resolved by `scaleLookup` against the real page/dark background — see
  // design-plans/alpha-primitives.md). A solid tint (`{accent.3}`, what
  // `action.secondary.accent` uses) is the wrong tool here: a ghost button
  // has no fill of its own, so its hover/pressed state has to be a WASH over
  // whatever it's sitting on, which the alpha twin is the one thing in this
  // system built to do correctly regardless of backdrop. Two steps, same
  // relationship as primary's hover/pressed: tone 3 then tone 5 on the same
  // ramp `{accent.solid}` already reads from.
  // Split by INTENT, matching Button's own `Color` axis (Brand / Danger /
  // Neutral) — a ghost button's wash has to carry the same meaning its label
  // does, and one unqualified `ghost.hover` could only ever serve one of the
  // three. NEUTRAL is the one that flips ink per appearance: black over a
  // light page, white over a dark one, which is precisely the job
  // `black-a`/`white-a` exist for (nothing else in the system can wash a
  // surface DOWN in light and UP in dark using one role).
  { group: 'action', key: 'ghost.neutral.hover',   light: '{black-a.1}', dark: '{white-a.1}' },
  { group: 'action', key: 'ghost.neutral.pressed', light: '{black-a.2}', dark: '{white-a.2}' },
  { group: 'action', key: 'ghost.brand.hover',     light: '{accent-a.3}', dark: '{accent-a.3}' },
  { group: 'action', key: 'ghost.brand.pressed',   light: '{accent-a.5}', dark: '{accent-a.5}' },
  { group: 'action', key: 'ghost.danger.hover',    light: '{error-a.3}',  dark: '{error-a.3}' },
  { group: 'action', key: 'ghost.danger.pressed',  light: '{error-a.5}',  dark: '{error-a.5}' },
  // Surface — elevation levels
  { group: 'surface', key: 'page',    light: '{neutral.1}',  dark: '{neutral-dark.1}' },
  { group: 'surface', key: 'layer-1', light: '{neutral.2}',  dark: '{neutral-dark.2}' },
  { group: 'surface', key: 'layer-2', light: '{neutral.3}',  dark: '{neutral-dark.3}' },
  { group: 'surface', key: 'accent',  light: '{accent.2}',   dark: '{accent.2}' },
  // Form background — same tone as the page, named separately so a form field
  // has its own token to point at rather than reusing "page" by coincidence.
  { group: 'surface', key: 'input', light: '{neutral.1}', dark: '{neutral-dark.1}' },
  // Accent-tinted row/item selection — one step up from `surface.accent`,
  // the same tone `action.secondary` already uses for a component-level fill.
  // A selected row is the textbook alpha case: it can sit on the page OR on a
  // card, and a SOLID tint only looks right on one of them. Was `{accent.3}`;
  // `{accent-a.3}` composites to the same colour over the page and keeps its
  // tint over any other surface. Everything reading text on it composites
  // first — see `audit.ts`'s `backdrop`.
  { group: 'surface', key: 'selected', light: '{accent-a.3}', dark: '{accent-a.3}' },
  // Inverse surface is dark-on-light and light-on-dark by definition — but
  // dark does NOT take the ramp's lightest step. `{neutral-dark.12}` flashes
  // near-white on a dark page; `{neutral.4}` (the light ramp's quiet gray) is
  // the muted inverse chip that actually reads as "inverted" in a layout.
  { group: 'surface', key: 'inverse', light: '{neutral.12}', dark: '{neutral.4}' },
  // Scrim — stays dark in BOTH appearances (it dims, it doesn't invert).
  // `{black-a.8}` (60% — Radix blackA8) is a genuine translucent overlay: the
  // pre-alpha-primitives value here was `{neutral.12}` / `{neutral-dark.1}`,
  // both fully OPAQUE, with a `// pair with opacity.60` comment pointing at a
  // token that was never wired up (and the `opacity` foundation is retired —
  // see design-plans/alpha-primitives.md). An opaque scrim doesn't dim the
  // page behind a modal, it erases it.
  { group: 'surface', key: 'overlay', light: '{black-a.8}', dark: '{black-a.8}' },
  // Status — feedback fg/bg pairs (critical = error family). The fg's ONLY job
  // is to sit on its own -bg, so the pair is solved as a pair:
  //
  //  • **Identity across appearances, not a mirror.** The dark column used to
  //    read `bg {error.11} / fg {error.7}` — a leftover `13 − n` flip of the
  //    light row, the exact bug the file header and `recDarkTone` both warn
  //    about. Measured on the default error/warning/success seeds it produced
  //    1.76 / 1.09 / 1.29 : 1 — a mid-tone ink on a near-text-tone fill, i.e.
  //    invisible. Same tone in both columns now; `scaleLookup` already swaps in
  //    the dark twin, so tone 2 is "the subtle tint of this page" in both.
  //
  //  • **Light fg is tone 11, not the solved tone 12.** `{ink:*.3}` collapses
  //    to 12 — maximum contrast (~11:1) but reads as near-black on a pale tint,
  //    not as an error/warning/success message. Tone 11 is Radix's semantic-text
  //    step: still clears WCAG AA against the tone-3 tint (~4.5–4.7:1 measured
  //    across seeds) while keeping the severity hue visible. Deliberate product
  //    choice — chromatic legibility over contrast headroom.
  //  • **Dark fg is a chromatic step too** — tone 11, not tone 12. Tone 12 on a
  //    dark tint reads as near-white ink and loses the severity hue; 11 keeps
  //    the colour visible in a dark layout.
  //
  //    Critical used to read 10 here, on the reasoning that a lower step holds
  //    more hue. Measured across the audit's 10 seeds it gave |Lc| 42.2–43.3
  //    against its own tone-3 tint — short of the 60 `large-text` floor by ~17,
  //    while warning/success on 11 sat at ~73. One step is worth ~30 Lc on the
  //    dark ramp, so 10 was not a hue-vs-contrast trade, just a miss: 11 still
  //    reads as red, and all three severities now agree on the same step.
  { group: 'status', key: 'critical.surface', light: '{error-a.3}',   dark: '{error-a.3}' },
  { group: 'status', key: 'critical.content', light: '{error.11}',       dark: '{error.11}' },
  { group: 'status', key: 'warning.surface',  light: '{warning-a.3}', dark: '{warning-a.3}' },
  { group: 'status', key: 'warning.content',  light: '{warning.11}',     dark: '{warning.11}' },
  { group: 'status', key: 'success.surface',  light: '{success-a.3}', dark: '{success-a.3}' },
  { group: 'status', key: 'success.content',  light: '{success.11}',     dark: '{success.11}' },
  // Info — same shape as the three severities above, added because the Info
  // primitive (seeded, generated, exported to tokens.json) had NO semantic
  // role referencing it at all; a designer retinting Info saw nothing move.
  // Tone 11 for content, not `{ink:info.3}` — this table deliberately pins
  // critical/warning/success to 11 rather than the solved-to-12 `{ink:…}`
  // marker (see the comment above critical.surface: 12 "reads as near-black…
  // and loses the severity hue," 11 is Radix's own chromatic-text step).
  // Info follows the identical rule rather than a different mechanism for
  // one severity: measured on the live system's seed, info.11 on info.3
  // clears WCAG 4.35 / Lc 63.8 in light and 10.21 / Lc 73.6 in dark — the
  // same range critical/warning/success already accept (critical's own
  // residual is Lc ~42, short of the 60 floor, and was kept anyway).
  { group: 'status', key: 'info.surface',     light: '{info-a.3}',    dark: '{info-a.3}' },
  { group: 'status', key: 'info.content',     light: '{info.11}',       dark: '{info.11}' },
  // ── The STROKE of a status surface, one role per severity.
  //
  // Added because both renderers were painting it from a magic number and
  // DISAGREEING about it: the Figma plugin drew `fillP(k.solid, 0.4)` while
  // `StatusSpecimen` drew `` `${c}33` `` — 40% in Figma, 20% in the preview,
  // on the same component. That is exactly the drift the "every specimen is a
  // catalogue renderer" rule exists to prevent, and nothing caught it because
  // neither side read a token.
  //
  // `{fam-a.6}` is the same step `border.ring.*` already uses for its halo,
  // and for the same reason: it IS 40% on the black/white ladder and ~37% on a
  // solved colour twin, so the shipped Figma look is unchanged while the
  // preview stops under-painting it. Alpha, not a solid tone, because the tint
  // it sits on is itself alpha (`status.*.surface` is `{fam-a.3}`) — a solid
  // stroke over a translucent fill composites against a different backdrop
  // than the fill does and the two drift apart on any non-page surface.
  //
  // NOT measured for WCAG 1.4.11: this is the edge of a MESSAGE, not a control
  // boundary. The severity is carried by `status.*.content` (the text) and the
  // glyph; the stroke is what separates the tint from the page. A status role
  // that does bear a boundary obligation already exists — `border.critical` /
  // `border.warning` / `border.success`, solved per theme.
  { group: 'status', key: 'critical.border', light: '{error-a.6}',   dark: '{error-a.6}' },
  { group: 'status', key: 'warning.border',  light: '{warning-a.6}', dark: '{warning-a.6}' },
  { group: 'status', key: 'success.border',  light: '{success-a.6}', dark: '{success-a.6}' },
  { group: 'status', key: 'info.border',     light: '{info-a.6}',    dark: '{info-a.6}' },
  // ── Solid fills (badges, destructive buttons, status dots).
  //
  // Light solves the fill (`{fam.solid}`). Dark uses the ramp's light end so a
  // solid still reads as coloured on a dark page; ink is solved against that
  // step in both.
  //
  // Critical was the ONLY severity with a solid pair, and this file's own note
  // said adding one for a second severity alone "would make it the second-best-
  // equipped severity while warning/success still have none — one decision
  // across all four, not an info-only addition." That decision is taken here,
  // for all four, prompted by a real failure: the Figma plugin's `statusInfo`
  // had nothing to bind to, so InlineAlert Info shipped its hardcoded fallback
  // `#1570ef` on a `#131c2a` fill — both literals verified byte-for-byte
  // against `code.ts`, not inferred.
  { group: 'status', key: 'critical.surface-solid', light: '{error.solid}',     dark: '{error.12}' },
  { group: 'status', key: 'critical.on-solid',       light: '{on:error.solid}', dark: '{on:error.12}' },
  { group: 'status', key: 'warning.surface-solid',  light: '{warning.solid}',     dark: '{warning.12}' },
  { group: 'status', key: 'warning.on-solid',        light: '{on:warning.solid}', dark: '{on:warning.12}' },
  { group: 'status', key: 'success.surface-solid',  light: '{success.solid}',     dark: '{success.12}' },
  { group: 'status', key: 'success.on-solid',        light: '{on:success.solid}', dark: '{on:success.12}' },
  { group: 'status', key: 'info.surface-solid',     light: '{info.solid}',        dark: '{info.12}' },
  { group: 'status', key: 'info.on-solid',           light: '{on:info.solid}',    dark: '{on:info.12}' },
  // Border — strokes, split by JOB rather than by weight: decoration (no
  // floor) vs. the control boundary (WCAG 1.4.11 ≥3:1 AND APCA Lc ≥45, the
  // `ui-component` intent, via `{ui:…}` — see `uiBoundaryRef`). `default` used
  // to be pinned to tone 5 (1.61:1, decorative weight) while ALSO being the
  // name inputs were expected to reach for — shipping either an invisible
  // input or, if you wanted a real boundary, forcing `strong`'s tone-9 weight
  // (4.78:1, past Radix's own 6–8 stroke band) onto every field. `default` now
  // IS the accessible control boundary, so "the input border" and "the
  // accessible tone" are the same answer.
  //
  // SOLVED from start 8, not pinned there — a fixed tone 8 measured under 3:1
  // (2.96 / 2.98) on a neutral ramp tinted by certain accents (`neutralFromBrand`
  // links the neutral to the accent hue). Dark starts the SAME walk at 8, not
  // tone-for-tone with light: this ramp's dark tones 8–10 either miss WCAG or
  // pass it while failing APCA (Lc 21.4 / 27.0 at 9/10 — "there is nothing
  // between Lc ~27 and Lc ~75" on this ramp's dark stroke band, the same gap a
  // deleted IBM Carbon projection once proved for a sibling architecture's own
  // border-strong), so the walk lands on 11 (11.99/75.2) for the default seed.
  //
  // ── SUPERSEDED by design-plans/foundations-geometry-and-strokes.md phase 1.
  // Everything above is still true about the CONTROL BOUNDARY — it just isn't
  // called `border.default` any more. Measured against the HeroUI DTCG export,
  // the neutral strokes here used TWO of the six rungs the ramp generates and
  // skipped the four in between (ΔL to the light page: subtle 0.072, then
  // nothing until default at 0.352 — a 4.9x jump). The reference's whole
  // border ladder — separator 0.080, border 0.099, separator-2 0.121,
  // separator-3 0.151 — fits inside that gap, and neutral tones 5 and 6 were
  // referenced by no role at all, in any theme.
  //
  // The fix is NOT to soften the boundary: that would drop a real 1.4.11
  // guarantee to chase a look. It is to stop making one name do two jobs.
  // DECORATION (separates regions, carries no state, no contrast floor) is
  // `subtle` / `default` / `strong`; the CONTROL BOUNDARY (the stroke IS the
  // control, so WCAG 1.4.11 + APCA Lc 45 apply) is `control` / `control-hover`,
  // which inherit the `{ui:…}` / `{ui+:…}` solvers verbatim from the roles that
  // used to be called `default` / `strong`. Not a single measured value moved;
  // two names appeared and two changed meaning.
  { group: 'border', key: 'default',  light: '{neutral.4}', dark: '{neutral-dark.5}' },
  // Emphasis — one step past whatever `default` RESOLVED to (`{ui+:…}`),
  // never a fixed tone: pinning it to 9 would collapse onto the boundary on
  // exactly the tinted-neutral systems where the boundary itself walks to 9.
  // Reserve for grouping strokes that need to outrank a plain control
  // boundary (e.g. a selected card's own edge); it is NOT where a resting
  // input should point — that's `default`, immediately above.
  { group: 'border', key: 'strong',   light: '{neutral.5}', dark: '{neutral-dark.6}' },
  // ── The control boundary, moved here intact from `default`/`strong` above.
  //
  // `control` is what a resting input, select, checkbox or unfilled button
  // binds to — anywhere the stroke is the only sign that a control is there.
  // `control-hover` is its hover/emphasis step, and it has to be SOLVED one
  // past whatever `control` actually resolved to (`{ui+:…}`) rather than
  // pinned: on a neutral ramp tinted by certain accents the boundary itself
  // walks to 9, and a pinned 9 would collapse hover onto rest — no state at
  // all, the same defect `action.primary.pressed` had.
  //
  // `control-hover` is not a nicety: the Figma plugin already drew every
  // control's hover stroke from `border.strong` (20+ call sites), on the old
  // reading where `strong` WAS the emphasis boundary. Leaving those pointing
  // at the new decorative `strong` would make hover LIGHTER than rest — the
  // stroke receding on hover. The concept keeps a name; only the name changed.
  { group: 'border', key: 'control',       light: '{ui:neutral.8}',  dark: '{ui:neutral-dark.8}' },
  { group: 'border', key: 'control-hover', light: '{ui+:neutral.8}', dark: '{ui+:neutral-dark.8}' },
  // DECORATIVE brand emphasis — a tinted card edge or a grouping stroke. It is
  // NOT a state indicator: anything that says "this control is selected /
  // focused / active" conveys information and falls under WCAG 1.4.11, so it
  // must use `border.active` (solved to clear 3:1 and Lc 45 in both themes).
  // Splitting the two by NAME is what keeps that checkable — `border.accent`
  // at {accent.8} reads 1.97:1 in dark, which is correct for emphasis and
  // wrong for state.
  { group: 'border', key: 'accent',   light: '{accent.8}',  dark: '{accent.8}' },
  { group: 'border', key: 'subtle',   light: '{neutral.3}', dark: '{neutral-dark.4}' },
  // Focus ring — SOLVED, not pinned. `{ui:accent.9}` (resolved in
  // `curatedRefs` via `uiBoundaryRef`, below) walks the accent ramp up from
  // tone 9 until a tone clears WCAG ≥3:1 AND APCA Lc ≥45 against the page,
  // falling back to the closest-to-passing tone if none does — same
  // no-fixed-fallback shape as `solidInkPair`/`tintInkRef`.
  //
  // This role used to be pinned to `{accent.9}` with a comment claiming it
  // "clears both (WCAG 3.14-7.45)" — measured across 8 accent hues, 5 of 8
  // fail: sky 2.77, cyan 2.43, amber 2.15, lime 1.98, yellow 1.53. Tone 9 is
  // the user's raw brand hex, so its luminance is entirely outside this
  // system's control; a pinned tone cannot honestly promise a floor here.
  // The solver lands on 9 for a cool/saturated accent (unchanged output for
  // the common case) and walks up to 10 or 11 for anything warmer or paler.
  //
  // Dark stays pinned at `{accent.11}` — its own six-seed search already
  // showed dark ramps have no equivalent blind spot worth walking around
  // (tone 11 clears both for every seed tried: WCAG 11.83–11.90, Lc 75.0–75.3).
  { group: 'border', key: 'focus',   light: '{ui:accent.9}',  dark: '{ui:accent.9}' },
  // ── Focus RING (the translucent halo), distinct from `border.focus` (the
  // solid boundary). Two roles, not one, because they do different jobs: the
  // boundary must clear WCAG 1.4.11 as a UI component (hence the `{ui:…}`
  // solver above), while the halo is a soft glow OUTSIDE it that must never be
  // measured as a boundary — it's decoration that widens the target visually.
  // `specimens.tsx`'s `focusRing()` already painted exactly this at a
  // hardcoded 40% (`withAlpha(accent, alphaOf(t, '40', 0.4))`); these give it
  // a token. `{fam-a.6}` IS 40% on the black/white ladder and ~37% on a
  // solved colour twin, so the shipped look is unchanged.
  //
  // NOTE — this does NOT reverse the documented "no border.focus.critical"
  // decision: that one is about the solid BOUNDARY staying accent-coloured
  // for every severity, which it still does. A halo matching the field's own
  // error/success border is a separate, additive affordance.
  { group: 'border', key: 'ring.default',  light: '{accent-a.6}',  dark: '{accent-a.6}' },
  { group: 'border', key: 'ring.critical', light: '{error-a.6}',   dark: '{error-a.6}' },
  { group: 'border', key: 'ring.success',  light: '{success-a.6}', dark: '{success-a.6}' },
  // The 1px light rim `darkShadow()` paints on every dark-mode elevation —
  // until now a bare `rgba(255,255,255,…)` computed inside that function with
  // no token anywhere. This does NOT change what `darkShadow` emits (its alpha
  // is a continuous function of the shadow's own weight, deliberately — see
  // design-plans/alpha-primitives.md); it gives the CONCEPT a name so a
  // consumer building elevation by hand has the same rim available, and so
  // `white-a` stops being a family the export ships that no role references.
  { group: 'border', key: 'rim-highlight', light: '{white-a.1}', dark: '{white-a.1}' },
  // Already the minimum tone clearing both metrics — verified, not changed.
  // Light error.9 = 3.76/64 (passes). Dark error.9 = 5.14 WCAG but Lc 37.6
  // (fails APCA — the same blind spot `default` above hits); error.10 is
  // 44.2, still short of the Lc 45 floor; error.11 is the first to clear both
  // (11.94/75.0).
  { group: 'border', key: 'critical', light: '{error.9}',   dark: '{error.11}' },
  // Also already minimal: warning has NO tone below 11 that clears WCAG in
  // light (tone 9 = 2.35, tone 10 = 2.75 — both fail; tone 11 = 5.14 passes).
  { group: 'border', key: 'warning',  light: '{warning.11}', dark: '{warning.11}' },
  // Success has one step of headroom warning doesn't: tone 10 clears BOTH
  // metrics in both themes (light 3.31/60.0, dark 8.22/55.7), one step
  // lighter than the previous tone-11 pin.
  { group: 'border', key: 'success',  light: '{success.10}', dark: '{success.10}' },
]

/**
 * Categorical resolved across every theme in `themeOrder`: group → token →
 * themeKey → ref. The schema is theme-count-independent — "surface.page is
 * neutral.1 for a light-kind theme, neutral-dark.1 for a dark-kind one" — so
 * what varies per THEME is which primitive family each ref resolves against,
 * plus the solid-fill/ink pair, both handled by `projectCurated`.
 */
export function projectCategorical(
  input: ProjectionInput,
  themeOrder: string[] = ['light', 'dark'],
): Record<string, Record<string, Record<string, string>>> {
  return projectCurated(CATEGORICAL_ROLES, input, themeOrder)
}

/**
 * One `[ROLE: ...]` guidance line per `CATEGORICAL_ROLES` entry, keyed
 * `"group.key"`. Hand-authored, not extracted from the source comments above
 * (those are prose for a future maintainer; these are usage/restriction text
 * for a consumer of the export). Feeds the "Categorical Semantic (AI-Guided)"
 * export format — see `exportWizard.ts`. Every value quotes the REAL ref this
 * file resolves to, so the guidance can never claim a tone the token doesn't
 * actually ship.
 */
export const CATEGORICAL_ROLE_COMMENTS: Record<string, string> = {
  'surface.page': '[ROLE: Base Background] Elevation level 0. Root application background. content.primary and content.secondary must maintain WCAG AA (4.5:1) against this token.',
  'surface.layer-1': '[ROLE: Container Background] Elevation level 1. Cards, panels, grouped content. Must read slightly distinct from surface.page.',
  'surface.layer-2': '[ROLE: Elevated Background] Elevation level 2. Popovers, dropdowns, modals. Pair with box-shadow in CSS — the color step alone does not convey floating.',
  'surface.input': "[ROLE: Form Background] Background for interactive data-entry fields. Ensures content.primary typed by the user stays legible. Same tone as surface.page by design — named separately so forms have their own token.",
  'surface.selected': '[ROLE: Active State Background] Subtle fill for mutual selection (e.g. a selected table row). Must guarantee 4.5:1 against content.primary on top.',
  'surface.inverse': "[ROLE: Inverted Background] High-contrast background for tooltips and snackbars. Always pair with content.inverse. Light {neutral.12}; dark {neutral.4} — a muted inverse chip, not the dark ramp's near-white step.",
  'surface.overlay': '[ROLE: Scrim] Semi-transparent layer over surface.page to focus attention on modals (layer-2 surfaces). Ships at 60% black alpha (`{black-a.8}`), same in both themes.',
  'surface.accent': '[ROLE: Accent Wash] Ambient brand-tinted background — a section that leans brand without being an interactive fill.',
  'content.primary': '[ROLE: High Contrast Text] Main body and headings. STRICT: must pass WCAG AA (4.5:1) against surface.page and surface.layer-1.',
  'content.secondary': '[ROLE: Medium Contrast Text] Supporting copy and descriptions. STRICT: WCAG AA (4.5:1) against standard surface backgrounds.',
  'content.subtle': '[ROLE: Low Contrast Text] Placeholders and decorative de-emphasis only — not a third readable body tier. Minimum ~3:1; do not convey information.',
  'content.disabled': '[ROLE: Inactive Text] Disabled controls and copy. Exempt from strict WCAG rules — must communicate inactivity, not full legibility.',
  'content.inverse': "[ROLE: Inverted Text] Required when the background is surface.inverse or any dark/solid fill outside the accent.",
  'content.on-action': "[ROLE: Button Text] Label ink used ONLY on action.primary.default. Solved per theme against that fill — never assume white. Must exceed 4.5:1 against the button fill.",
  'content.accent': '[ROLE: Accent Text] Brand-tinted emphasis — active nav, non-link accent copy. Low-contrast text step (~4.5:1 AA against the page).',
  'content.link.default': '[ROLE: Interactive Text Default] Actionable link text. Must contrast with the background (4.5:1) and remain distinguishable from adjacent content.primary (~3:1). Uses the ramp text step, not a fill-hover step.',
  'content.link.hover': '[ROLE: Interactive Text Hover] Hover/focus variation of content.link.default — one ramp step for visible feedback while staying accessible.',
  'action.primary.default': "[ROLE: Primary CTA Default] Primary call-to-action fill. Inner text must always be content.on-action. Solved per theme — not pinned to a fixed accent step.",
  'action.primary.hover': '[ROLE: Primary CTA Hover] Interactive hover state. SOLVED one tone past the RESOLVED action.primary.default, re-verified for label contrast — not a fixed accent step. A pinned {accent.10} measured under WCAG AA (as low as 1.78:1) for any hue whose solid resolves above tone 9.',
  'action.primary.pressed': '[ROLE: Primary CTA Pressed] Active/pressed state. SOLVED two tones past the RESOLVED default, same reasoning as hover. Replaces a fixed dark {accent.6} that measured APCA Lc 0-24 (illegible) once the solid resolves above tone 9, which it does for most hues.',
  'action.secondary.default': '[ROLE: Secondary CTA Default] Neutral subtle button fill. Label text must be content.primary, not content.on-action.',
  'action.secondary.accent': '[ROLE: Secondary Accent Fill] Accent-tinted secondary button background. Pair with content.primary for the label.',
  'action.disabled': '[ROLE: Disabled Action Fill] Disabled button/control background. No contrast floor — communicates inactive state visually.',
  'action.ghost.neutral.hover': '[ROLE: Ghost Neutral Hover] Hover wash for a borderless button with no brand intent (toolbar icons, close buttons, menu items). Flips ink per appearance — {black-a.1} in light, {white-a.1} in dark — because a neutral wash has to darken a light page and lighten a dark one.',
  'action.ghost.neutral.pressed': '[ROLE: Ghost Neutral Pressed] Pressed wash for a neutral borderless button. One step deeper than the hover, same black/white flip.',
  'action.ghost.brand.hover': '[ROLE: Ghost Brand Hover] Hover wash for a borderless button carrying brand intent (tertiary CTA). An ALPHA primitive, not a solid tint — a ghost button has no fill of its own, so its hover has to composite over whatever surface it sits on.',
  'action.ghost.brand.pressed': '[ROLE: Ghost Brand Pressed] Pressed wash for a brand ghost button. One step deeper than action.ghost.brand.hover on the same alpha ramp.',
  'action.ghost.danger.hover': '[ROLE: Ghost Danger Hover] Hover wash for a borderless destructive action (a Delete in a row menu). Error family so the intent reads before the click, not after.',
  'action.ghost.danger.pressed': '[ROLE: Ghost Danger Pressed] Pressed wash for a destructive borderless action.',
  'status.critical.surface': "[ROLE: Feedback Background Subtle] Tinted background for error alerts and banners. Pair with status.critical.content — never a fixed ink on the bg alone.",
  'status.critical.surface-solid': "[ROLE: Feedback Background Solid] Solid fill for destructive badges and buttons. Pair with status.critical.on-solid. Light solves {error.solid}; dark uses {error.12} so the fill still reads as coloured on a dark page.",
  'status.critical.content': '[ROLE: Feedback Text] Error message ink on status.critical.surface. Both themes {error.11} — chromatic severity, not the near-white {error.12} in dark.',
  'status.critical.on-solid': "[ROLE: Feedback Inverted Text] Label ink on status.critical.surface-solid. Solved per theme against that fill.",
  'status.warning.surface': '[ROLE: Feedback Background Subtle] Tinted background for warning alerts. Pair with status.warning.content.',
  'status.warning.content': '[ROLE: Feedback Text] Warning message ink on status.warning.surface. Light and dark both {warning.11} — chromatic severity, not the near-white {warning.12} in dark.',
  'status.success.surface': '[ROLE: Feedback Background Subtle] Tinted background for success alerts. Pair with status.success.content.',
  'status.success.content': '[ROLE: Feedback Text] Success message ink on status.success.surface. Light and dark both {success.11} — chromatic severity, not the near-white {success.12} in dark.',
  'status.info.surface': '[ROLE: Feedback Background Subtle] Tinted background for informational alerts and banners. Pair with status.info.content — never a fixed ink on the bg alone.',
  'status.info.content': '[ROLE: Feedback Text] Info message ink on status.info.surface. Both themes {info.11} — same chromatic-severity rule as critical/warning/success, not the near-white {info.12}.',
  'status.warning.surface-solid': "[ROLE: Feedback Background Solid] Solid fill for warning badges and pills. Pair with status.warning.on-solid. Light solves {warning.solid}; dark uses {warning.12} so the fill still reads as coloured on a dark page.",
  'status.warning.on-solid': '[ROLE: Feedback Inverted Text] Label ink on status.warning.surface-solid. Solved per theme against that fill, never assumed white — a warning solid is usually light enough to need dark ink.',
  'status.success.surface-solid': "[ROLE: Feedback Background Solid] Solid fill for success badges and pills. Pair with status.success.on-solid. Light solves {success.solid}; dark uses {success.12}.",
  'status.success.on-solid': '[ROLE: Feedback Inverted Text] Label ink on status.success.surface-solid. Solved per theme against that fill.',
  'status.info.surface-solid': "[ROLE: Feedback Background Solid] Solid fill for info badges and pills. Pair with status.info.on-solid. Light solves {info.solid}; dark uses {info.12}.",
  'status.info.on-solid': '[ROLE: Feedback Inverted Text] Label ink on status.info.surface-solid. Solved per theme against that fill.',
  'status.critical.border': '[ROLE: Feedback Border] The stroke around a critical alert or banner — the edge of a MESSAGE, not a control boundary, so it is not measured for WCAG 1.4.11 (the severity is carried by status.critical.content and the glyph). An alpha primitive, {error-a.6}, because the tint it sits on is alpha too: a solid stroke over a translucent fill composites against a different backdrop than the fill and the two drift apart on any non-page surface. For a stroke that DOES bear a boundary obligation — an invalid input — use border.critical.',
  'status.warning.border': '[ROLE: Feedback Border] The stroke around a warning alert or banner. {warning-a.6}. See status.critical.border for why it is alpha and why it carries no contrast floor.',
  'status.success.border': '[ROLE: Feedback Border] The stroke around a success alert or banner. {success-a.6}. See status.critical.border.',
  'status.info.border': '[ROLE: Feedback Border] The stroke around an informational alert or banner. {info-a.6}. See status.critical.border.',
  'border.subtle': '[ROLE: Decorative Border 1/3] The lightest neutral stroke — hairline dividers, table rules, the edge of a quiet grouping. Light {neutral.3} (ΔL 0.072 from the page), dark {neutral-dark.4}. DECORATION: it separates regions and carries no state, so it has no contrast floor. If the stroke is the only thing telling the user a control is there, that is border.control, not this.',
  'border.default': '[ROLE: Decorative Border 2/3] The default neutral outline — a card edge, a panel boundary, a grouping box. Light {neutral.4} (ΔL 0.112), dark {neutral-dark.5}. DECORATION, no contrast floor. NOTE: this role changed meaning — it used to BE the control boundary. That job is border.control now; the neutral ramp generates six rungs in this band and the old split used two of them, so a designer reaching for a visible-but-quiet outline had nothing between 0.072 and 0.352.',
  'border.strong': '[ROLE: Decorative Border 3/3] The heaviest neutral outline that is still decoration — a grouping that needs to read before its neighbours. Light {neutral.5} (ΔL 0.156), dark {neutral-dark.6}. Anything that says "this control is selected / focused / active" conveys state and falls under WCAG 1.4.11: use border.focus or border.control-hover, not this.',
  'border.control': '[ROLE: Control Boundary] The resting border for inputs, selects, checkboxes, unfilled buttons — anywhere the stroke is the only sign of a control. WCAG 1.4.11 + APCA Lc 45 against the page. SOLVED from tone 8, not pinned there: a fixed tone 8 measured 2.96-2.98:1 on a neutral ramp tinted by certain accents. Light lands on {neutral.8} = 3.26:1/Lc60 for the default seed. Dark starts the same walk at 8 and lands on {neutral-dark.11} = 11.99:1/Lc75 — not tone-for-tone with light; this ramp\'s dark tones 9-10 pass WCAG but fail APCA (Lc 21-27). Carries the guarantee border.default used to.',
  'border.control-hover': '[ROLE: Control Boundary Hover] The hover and emphasis step of border.control — one step past whatever that role RESOLVED to ({ui+:...}), never a fixed tone: pinning it to 9 would collapse it onto the boundary on exactly the tinted-neutral systems where the boundary itself walks to 9, leaving no hover state at all. Light {neutral.9} = 4.78:1, dark {neutral-dark.12} = 15.19:1 for the default seed. This is what border.strong used to mean.',
  'border.focus': '[ROLE: A11y Focus Ring] Keyboard focus-visible ring. SOLVED per theme, not pinned — the ring is always the user\'s own accent hue, so a fixed tone cannot promise a floor. Light walks the accent ramp from tone 9 until WCAG 1.4.11 + APCA Lc 45 clear (lands on 9-11 depending on hue). Dark stays {accent.11}. Deliberate scope: this is the ONLY focus ring, incl. on an invalid/critical field — focus wins over the error colour rather than a separate border.focus.critical, matching Material/Carbon (WCAG does not require an error-coloured ring) and keeping one ring token instead of one per severity. That scope covers the solid BOUNDARY only — the translucent halo around it is border.ring.*, which does vary by severity.',
  'border.ring.default': '[ROLE: Focus Halo] Translucent glow outside border.focus. Decoration, NOT a boundary — never measured for WCAG 1.4.11; border.focus is the contrast-bearing part. Replaces a hardcoded 40% alpha in the preview specimens.',
  'border.ring.critical': '[ROLE: Focus Halo Critical] Focus halo on a field already showing border.critical, so the glow matches the field rather than fighting it. The solid focus boundary stays accent — see border.focus.',
  'border.ring.success': '[ROLE: Focus Halo Success] Focus halo on a field showing a success/validated border.',
  'border.rim-highlight': '[ROLE: Elevation Rim] 1px light rim along the top of an elevated surface in dark mode. Below a near-black page only ~5% of the luminance range is left to spend downward, so elevation has to be bought with light, not shadow — this is the token for the rim darkShadow() already paints.',
  'border.accent': '[ROLE: Decorative Brand Border] Brand-tinted grouping stroke. NOT a state indicator — use border.focus for focus/selected/active.',
  'border.critical': '[ROLE: Critical Border] Validation stroke for inputs in an error state. Light {error.9} = 3.76:1. Dark {error.11} = 11.94:1 — error.9/10 fail APCA in dark (Lc 37.6/44.2), same blind spot as border.default.',
  'border.warning': '[ROLE: Warning Border] Validation stroke for inputs in a warning state. {warning.11} — the minimum tone that clears WCAG in light (tone 9 = 2.35, tone 10 = 2.75, both fail).',
  'border.success': '[ROLE: Success Border] Validation stroke for inputs in a success/valid state. {success.10} — one step lighter than warning/critical; this ramp clears both metrics a full step earlier (3.31:1/Lc60 light, 8.22:1/Lc56 dark).',
}

/** Flat role id → nested export path segments. `content.link.default` → ['content','link','default']. */
export function categoricalNestedPath(group: string, key: string): string[] {
  return [group, ...key.split('.')]
}

/** Legacy flat ids from pre-contract overrides → current role ids (v50→v51). */
export const CATEGORICAL_ROLE_RENAME: Record<string, string> = {
  'content.link-default': 'content.link.default',
  'content.link-hover': 'content.link.hover',
  'action.primary': 'action.primary.default',
  'action.primary-hover': 'action.primary.hover',
  'action.primary-pressed': 'action.primary.pressed',
  'action.neutral': 'action.secondary.default',
  'action.secondary': 'action.secondary.accent',
  'status.critical-bg': 'status.critical.surface',
  'status.critical-fg': 'status.critical.content',
  'status.critical-surface-solid': 'status.critical.surface-solid',
  'status.critical-on-solid': 'status.critical.on-solid',
  'status.warning-bg': 'status.warning.surface',
  'status.warning-fg': 'status.warning.content',
  'status.success-bg': 'status.success.surface',
  'status.success-fg': 'status.success.content',
  'border.active': 'border.focus',
}

// ── Categorical chart palette ────────────────────────────────────────────────
/**
 * Five series colours derived from the brand hue, for shadcn's `--chart-1…5`.
 *
 * Categorical means IDENTITY, not magnitude, so the constraint is that adjacent
 * slots stay separable — including for a reader with colour-vision deficiency.
 *
 * Evenly spaced hues fail that. A 72° split puts green next to amber at ΔE 6.4
 * under deuteranopia — inside the 6–8 band that is legal only with a second
 * encoding (direct labels, gaps, texture) which a shadcn chart does not
 * guarantee. The offsets here were found by search and verified against
 * `color/cvd.ts`:
 *
 *   worst adjacent pair  ΔE 9.0 protan · 15.3 normal vision — clears the target
 *   every slot ≥ 3:1 against the surface, in BOTH light and dark
 *
 * L and C are fixed across the five so no series reads as "more important" than
 * another — rank is not identity. `__tests__/shadcn.test.ts` re-runs the checks
 * rather than trusting this comment, INCLUDING the even split, so the reason
 * these numbers look arbitrary stays executable.
 */
export const CHART_HUE_OFFSETS = [0, 70, 160, 230, 300] as const
const CHART_L = 0.62
const CHART_C = 0.15

/**
 * `offsets` is a parameter only so the test can demonstrate the rejected even
 * split against the real generator. Production always takes the default.
 */
export function chartPalette(
  accentHex: string,
  offsets: readonly number[] = CHART_HUE_OFFSETS,
): string[] {
  let hue = 0
  try {
    hue = hexToOklch(accentHex).h
  } catch { /* an unparseable accent falls back to hue 0 rather than crashing */ }
  return offsets.map((d) => oklchToHex(CHART_L, CHART_C, (hue + d) % 360))
}

// ── UI view model (Alias/Semantics matrix) ──────────────────────────────────
// What the Semantic editor renders for a NON-flat architecture: the sidebar
// categories, per-category token lists and resolved swatches all derive from
// the SAME projection the export emits, so the view is always schema-faithful.
export type ArchTokenValue = { css: string; label: string }
export type ArchTokenView = {
  key: string
  /** One value per MODE this token's architecture ships, keyed by theme key.
   *  Vibrancy and Tonal always carry exactly `{light, dark}` — their math is a
   *  fixed binary transform of the global primitives with no per-theme
   *  concept, so adding a theme can't extend them (see `buildArchitectureView`).
   *  Categorical carries one entry per theme passed in `themeOrder`, since its
   *  refs resolve per-theme the same way the flat catalogue's roles do. */
  modes: Record<string, ArchTokenValue>
  /** Which modes the user re-pointed — drives the "edited" affordance. */
  edited?: Record<string, boolean>
  /** Vibrancy labels only: the opaque WCAG fallback alias, per mode — shown as
   *  a badge so the safety net for missing backdrop-filter stays visible. */
  fallback?: Record<string, ArchTokenValue>
}
export type ArchCategoryView = { key: string; label: string; description: string; tokens: ArchTokenView[] }
/** `modeKeys` is the AUTHORITATIVE column list for the table to render — every
 *  token's `modes` map has exactly these keys. Categorical: `themeOrder`
 *  (as many columns as themes exist). Vibrancy/Tonal: always `['light','dark']`,
 *  regardless of `themeOrder` — their math has no per-theme concept to extend. */
export type ArchitectureView = { categories: ArchCategoryView[]; total: number; modeKeys: string[] }

/** `{family.tone}` ref → swatch color + display label; raw CSS values pass through. */
function refToView(ref: string, lookup: (fam: string, tone: number) => string | undefined): ArchTokenValue {
  const m = /^\{([a-z-]+)\.(\d+)\}$/.exec(ref)
  if (m) return { css: lookup(m[1], Number(m[2])) ?? 'transparent', label: `${m[1]}.${m[2]}` }
  return { css: ref, label: ref }
}

// `palette`, when given, is a THEME's own resolved families (`resolveThemePalette`
// — already picked for that theme's kind, so `palette.gray` is the right-appearance
// ramp regardless of whether the caller asks for 'neutral' or 'neutral-dark'; only
// one of those two ever actually gets read for a given theme, since a role's ref
// schema only exposes the half matching that theme's kind). Falls back to the
// GLOBAL scales for the two built-in themes (which carry no `themeSources` entry
// and so resolve `undefined` from `resolveThemePalette`) — identical to today.
// `kind` picks the dark TWIN for a coloured family when there's no palette to
// resolve it from — the built-in 'dark' theme has no `themeSources` entry (so
// `palette` is undefined) but its `action.primary`/etc refs still read
// `{accent.X}`, and without this that resolved the LIGHT accent ramp even in
// dark mode (every coloured ref showed the identical hex across both columns
// — `accent.9` in light and dark both landing on the raw input colour).
// `GlobalScales.dark` already carries these twins (the flat catalogue's
// `sourceScaleFor` reads the exact same field); this was the one caller that
// wasn't consulting it. `kind` defaults to 'light' for callers that never
// need it (Vibrancy's `look` only ever resolves explicit 'neutral'/
// 'neutral-dark' family names, never 'accent'/'error'/etc, so its mode split
// is already handled upstream).
export function scaleLookup(
  scales: GlobalScales,
  palette?: ThemePalette,
  kind: 'light' | 'dark' = 'light',
  /** Only needed to resolve a family's alpha twin (`{<fam>-a.N}`) — see the
   *  block below. Omit them and those refs just resolve `undefined`, same as
   *  any other unresolved ref. */
  pageBackground?: string,
  darkBackground?: string,
): (fam: string, tone: number) => string | undefined {
  const darkTwin = (fam: 'brand' | 'error' | 'warning' | 'success' | 'info') =>
    kind === 'dark' ? scales.dark?.[fam] : undefined
  const neutralSolid = kind === 'dark' ? (palette?.gray ?? (scales.grayDark ?? scales.gray)) : (palette?.gray ?? scales.gray)
  const fams: Record<string, Record<number, string> | undefined> = {
    neutral: palette?.gray ?? scales.gray,
    'neutral-dark': palette?.gray ?? (scales.grayDark ?? scales.gray),
    accent: palette?.brand ?? darkTwin('brand') ?? scales.brand,
    error: palette?.error ?? darkTwin('error') ?? scales.error,
    warning: palette?.warning ?? darkTwin('warning') ?? scales.warning,
    success: palette?.success ?? darkTwin('success') ?? scales.success,
    info: palette?.info ?? darkTwin('info') ?? scales.info,
    // Fixed opacity ladder, agnostic to theme/palette/kind — see
    // design-plans/alpha-primitives.md. Not derived from any family, so
    // there's no lookup chain here, just the constant.
    'black-a': BLACK_ALPHA_SCALE,
    'white-a': WHITE_ALPHA_SCALE,
  }
  // Alpha twins — ONE name per family, kind-aware exactly like `accent`
  // already is: the SAME ref text (`{accent-a.3}`) resolves to the light
  // twin in a light column and the dark twin in a dark one, so a role never
  // needs an `-a-dark` variant of its own ref. `neutral` needed splitting
  // into `neutral`/`neutral-dark` above because BOTH can be addressed
  // explicitly in the SAME role (e.g. `content.inverse`); nothing here needs
  // that for alpha, so one kind-aware name is enough.
  if (pageBackground && darkBackground) {
    const bg = kind === 'dark' ? darkBackground : pageBackground
    const kindCorrectSolid: Record<string, Record<number, string> | undefined> = {
      neutral: neutralSolid, accent: fams.accent, error: fams.error,
      warning: fams.warning, success: fams.success, info: fams.info,
    }
    for (const [fam, solid] of Object.entries(kindCorrectSolid)) {
      if (solid) fams[`${fam}-a`] = generateAlphaScale(solid, bg, kind)
    }
  }
  return (fam, tone) => fams[fam]?.[tone]
}

// Vibrancy/Tonal only — always exactly a light+dark pair (see ArchTokenView).
const pairViews = (
  keys: string[],
  light: Record<string, string>,
  dark: Record<string, string>,
  look: (fam: string, tone: number) => string | undefined,
): ArchTokenView[] =>
  keys.map((key) => ({
    key,
    modes: { light: refToView(light[key] ?? '', look), dark: refToView(dark[key] ?? '', look) },
  }))

/** Edits applied over a projection: `category.token` → mode → primitive ref. */
export type ArchOverrides = Record<string, Record<string, string>>

/** v50→v51 renamed flat ids to nested paths; re-run idempotently so stale
 *  localStorage keys (`status.critical-fg`, …) still reach `applyOverrides`. */
export function normalizeCategoricalOverrides(overrides: ArchOverrides): ArchOverrides {
  if (!Object.keys(overrides).length) return overrides
  const next: ArchOverrides = { ...overrides }
  for (const [oldId, newId] of Object.entries(CATEGORICAL_ROLE_RENAME)) {
    if (next[oldId]) {
      if (!next[newId]) next[newId] = next[oldId]
      delete next[oldId]
    }
  }
  return next
}

/**
 * Re-points a projected token at whatever primitive the user chose. The value
 * is still a REF, so an edited token resolves through the ramps exactly like an
 * unedited one — the projection defines the schema, the override only says
 * which primitive a slot reads.
 */
function applyOverrides(
  categories: ArchCategoryView[],
  overrides: ArchOverrides,
  // Per-MODE lookup — an override on theme "midnight" must resolve against
  // midnight's own palette, not whichever theme happened to supply a shared
  // `look`. Accepts either one shared function (Vibrancy/Tonal, always
  // light/dark over the globals) or a map keyed by mode (Categorical).
  look: ((fam: string, tone: number) => string | undefined) | Record<string, (fam: string, tone: number) => string | undefined>,
): ArchCategoryView[] {
  if (!Object.keys(overrides).length) return categories
  const lookFor = (mode: string) => (typeof look === 'function' ? look : look[mode] ?? Object.values(look)[0])
  return categories.map((c) => ({
    ...c,
    tokens: c.tokens.map((tk) => {
      const ov = overrides[`${c.key}.${tk.key}`]
      if (!ov) return tk
      const modes = { ...tk.modes }
      const edited: Record<string, boolean> = {}
      for (const [mode, ref] of Object.entries(ov)) {
        if (!ref) { edited[mode] = false; continue }
        const view = refToView(ref, lookFor(mode))
        modes[mode] = view
        // "Edited" means the override actually DIFFERS from what the schema
        // already produces — compared by LABEL (`neutral.5`), not the raw ref
        // string, since that's the same equivalence the cell itself displays.
        // An override whose label matches is a no-op that just happens to be
        // sitting in storage — most often stale data from before the schema's
        // OWN default moved onto that value (e.g. a `border.default`
        // pinned to `{neutral.5}` — see CLAUDE.md's border-realignment note).
        // Flagging it as "modified" was a false positive: it painted the same
        // strong accent-ui ring a genuine hand-edit gets, on a row that reads
        // through the schema unchanged. Reported as "the border is too
        // strong" — it wasn't the ring's styling that was wrong, it was firing
        // on rows that were never really edited.
        edited[mode] = view.label !== tk.modes[mode]?.label
      }
      return { ...tk, modes, edited }
    }),
  }))
}

export function buildArchitectureView(
  kind: SemanticArchitecture,
  input: ProjectionInput,
  errorSeed: string,
  overrides: ArchOverrides = {},
  /** Which themes to resolve columns for — CATEGORICAL ONLY. Defaults to the
   *  two built-ins for callers that don't pass one. Vibrancy/Tonal ignore this
   *  entirely (see ArchitectureView.modeKeys). */
  themeOrder: string[] = ['light', 'dark'],
): ArchitectureView | null {
  if (kind === 'flat') return null

  if (kind === 'categorical') {
    const tokens = projectCategorical(input, themeOrder)
    // Each theme resolves refs against ITS OWN palette (custom families a
    // theme references), not one shared lookup — same per-theme resolution
    // the flat catalogue's roles get via `sourceScaleFor`.
    const lookByTheme: Record<string, (fam: string, tone: number) => string | undefined> =
      Object.fromEntries(themeOrder.map((t) => [t, scaleLookup(input.scales, input.themePalettes[t], input.themeKinds[t] ?? 'light', input.pageBackground, input.darkBackground)]))
    const META: Record<string, [string, string]> = {
      content: ['Content', 'Text & icon ink — primary to inverse'],
      action: ['Action', 'Interactive element fills'],
      surface: ['Surface', 'Page and layer backgrounds'],
      status: ['Status', 'Feedback fg/bg pairs per severity'],
      border: ['Border', 'Strokes, focus and severity borders'],
    }
    const categories = Object.entries(tokens).map(([key, group]) => ({
      key,
      label: META[key]?.[0] ?? key,
      description: META[key]?.[1] ?? '',
      tokens: Object.entries(group).map(([k, byTheme]) => ({
        key: k,
        modes: Object.fromEntries(
          themeOrder.map((t) => [t, refToView(byTheme[t] ?? '', lookByTheme[t])]),
        ),
      })),
    }))
    const edited = applyOverrides(categories, normalizeCategoricalOverrides(overrides), lookByTheme)
    return { categories: edited, total: edited.reduce((n, c) => n + c.tokens.length, 0), modeKeys: themeOrder }
  }

  return null
}

// ── Export dispatcher ────────────────────────────────────────────────────────

/**
 * Export-only: resolves every plain `{family.tone}` ref in a CURATED
 * projection (Categorical) into this THEME's actual hex, using
 * that theme's own resolved palette — the exact substitution the table
 * already applies for on-screen DISPLAY (`buildArchitectureView`'s
 * `lookByTheme`, built the same way here), just baked into the exported
 * value instead of left symbolic for a downstream reader to redo.
 *
 * This exists because 'family' in a projected ref is always the GENERIC
 * vocabulary token ('neutral', 'accent'…) — `scaleLookup` is what re-points
 * "neutral" at a custom style theme's own hand-picked family, but that
 * re-pointing only happens inside the `look` CLOSURE at render time. Once
 * `curatedRefs` serializes the ref as the plain string `{neutral.12}`, the
 * fact that THIS theme's "neutral" is actually some other family is gone —
 * a consumer reading tokens.json (the Figma plugin) can only resolve
 * "neutral" against the GLOBAL neutral primitive, which is the wrong colour
 * for a theme that overrides it. Reported as: a style theme (e.g. a custom
 * "Blue-dark") showing plain gray in Figma instead of its own hue, while the
 * web's own table renders it correctly right next to the broken import.
 *
 * Safe for the built-in light/dark case too — resolving to hex loses nothing
 * there. A Figma alias to a primitive variable is already matched BY HEX
 * VALUE (see the plugin's `primByHex`/`archValueRgba`), never by trusting
 * this ref's text, so a literal and a symbolic ref that resolve to the same
 * colour produce an identical Figma variable either way.
 *
 * Left untouched: Carbon (its `look` never consults a theme palette — always
 * the global scales, so its refs were never theme-ambiguous) and
 * Vibrancy/Tonal (no `{family.tone}` ref shape to resolve — see their own
 * projections).
 */
function resolveCuratedForExport(
  tokens: Record<string, Record<string, Record<string, string>>>,
  input: ProjectionInput,
  themeOrder: string[],
): Record<string, Record<string, Record<string, string>>> {
  const lookByTheme: Record<string, (fam: string, tone: number) => string | undefined> =
    Object.fromEntries(themeOrder.map((t) =>
      [t, scaleLookup(input.scales, input.themePalettes[t], input.themeKinds[t] ?? 'light', input.pageBackground, input.darkBackground)]))
  const REF = /^\{([a-z-]+)\.(\d+)\}$/
  const out: typeof tokens = {}
  for (const [group, byKey] of Object.entries(tokens)) {
    out[group] = {}
    for (const [key, byTheme] of Object.entries(byKey)) {
      out[group][key] = {}
      for (const [theme, ref] of Object.entries(byTheme)) {
        const m = REF.exec(ref)
        out[group][key][theme] = m ? (lookByTheme[theme]?.(m[1], Number(m[2])) ?? ref) : ref
      }
    }
  }
  return out
}

/** Split `group.key` so nested ids (`action.primary.default`) keep the remainder
 *  as the token key. `id.split('.')` would truncate those to `primary`. */
function splitOverrideId(id: string): { group: string; key: string } | null {
  const dot = id.indexOf('.')
  if (dot <= 0 || dot === id.length - 1) return null
  return { group: id.slice(0, dot), key: id.slice(dot + 1) }
}

function applyArchTokenOverrides(
  tokens: Record<string, Record<string, Record<string, string>>>,
  overrides: ArchOverrides,
) {
  for (const [id, ov] of Object.entries(overrides)) {
    const parts = splitOverrideId(id)
    if (!parts) continue
    const slot = tokens[parts.group]?.[parts.key]
    if (!slot) continue
    for (const [mode, ref] of Object.entries(ov)) {
      if (ref) slot[mode] = ref
    }
  }
}

/** The additive `colors.architecture` payload for tokens.json (null for flat —
 *  the flat shape already ships as colors.semantic/themes). */
export function projectArchitecture(
  kind: SemanticArchitecture,
  input: ProjectionInput,
  errorSeed: string,
  overrides: ArchOverrides = {},
  /** Themes to ship columns for (Categorical only) — same as buildArchitectureView. */
  themeOrder: string[] = ['light', 'dark'],
): Record<string, unknown> | null {
  switch (kind) {
    case 'categorical': {
      const tokens = projectCategorical(input, themeOrder)
      // Re-point any edited slot so tokens.json matches what the table shows.
      // ADDITIVE by construction: `light`/`dark` keys are always present (any
      // consumer reading `.light`/`.dark` sees identical values to before),
      // extra theme keys only appear when the system actually has them.
      applyArchTokenOverrides(tokens, normalizeCategoricalOverrides(overrides))
      return { kind, tokens: resolveCuratedForExport(tokens, input, themeOrder) }
    }
    default:
      return null
  }
}
