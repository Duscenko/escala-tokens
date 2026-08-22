// ─── Semantic architectures ──────────────────────────────────────────────────
// The flat 89-role catalogue (semanticRoles.ts) stays the single editing model;
// this module PROJECTS it into alternative token shapes the user can pick in
// the Alias/Semantics tab. Pure data + math — no store imports, so it's shared
// by the picker UI, the token export and the README without cycles.
//
//   flat        — the existing shape (colors.semantic / colors.themes)
//   categorical — LIGHTWEIGHT: a fixed 39-role catalogue (Content · Action ·
//                 Surface · Status · Border), light/dark primitive refs inside
//                 each token (DTCG-style) — deliberately NOT the 89 flat roles
//   vibrancy    — Apple HIG roles: labels/fills/separators as alpha layers over
//                 RGB channel primitives + opaque WCAG fallbacks + materials
//   tonal       — Material 3: 0–100 tonal palettes derived from the accent,
//                 paired on-colors, light↔dark as a tone inversion (40↔80…)
import chroma from 'chroma-js'
import type { GlobalScales } from './semanticRoles'
import { accessibleSolidTone, solidInkPair, checkContrast, WCAG_AA } from './colorUtils'
import { apcaLc, INTENT_THRESHOLDS } from './color/apca'

/** APCA body-text floor — the same constant the audit and the ramp use. */
const APCA_BODY_TEXT = INTENT_THRESHOLDS['body-text'].apcaLc ?? 75
import { hexToOklch, oklchToHex } from './color/gamut'
import { CARBON_TOKENS } from './color/carbonReference'
import { Hct, TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities'
import type { ThemePalette } from '../store/useDesignStore'

export type SemanticArchitecture = 'flat' | 'astryx' | 'shadcn' | 'categorical' | 'vibrancy' | 'tonal' | 'carbon'

// 'flat' stays a valid value (the underlying editing model every architecture
// projects from, see the header comment above) but is no longer offered as a
// picker card — Astryx replaced it as the visible "one alias per role" choice.
// Old persisted systems migrate 'flat' → 'astryx' (useDesignStore.ts v43→v44).
/** Visible in the UI — Categorical only. Other projections (Astryx, shadcn,
 *  Vibrancy, Carbon, Tonal) remain in code for tests and legacy exports. */
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
}

// ── Solid fills and the ink that sits on them ────────────────────────────────
// Every curated architecture (Categorical · Astryx · shadcn) has the same two
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
//     Astryx table already hand-patched exactly that with `on-warning:
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
 * A curated role table resolved for ONE theme, against that theme's OWN ramps.
 *
 * Three markers are substituted here, and only here:
 *  · `{accent.solid}`    → `{accent.<tone>}`, the accessible fill step
 *  · `{on:<fam>.<tone>}` → whichever INK_REF actually passes on that fill
 *    (`{on:accent.solid}` resolves the fill's tone first)
 *  · `{ink:<fam>.<tone>}` → the same family's tone that reads on that tint
 *
 * All three collapse to a plain `{family.tone}` here, which is what makes the
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
      // Astryx pinned its status fills to `{error.9}` while its accent used
      // `{accent.solid}` — same table, two conventions. Tone 9 of a red ramp
      // cannot carry white OR near-black ink at AA (measured worst: 3.55), so
      // the pinned form was unfixable by choosing a better ink. Solving the
      // FILL tone is what Categorical already does.
      .replace(/\{(on:)?([a-z-]+)\.solid\}/g, (_m, on: string | undefined, fam: string) =>
        `{${on ?? ''}${fam}.${solidToneFor(fam)}}`)
      .replace(/\{on:([a-z-]+)\.(\d+)\}/g, (_m, fam: string, tone: string) =>
        inkRefFor(look(fam, Number(tone)), look))
      .replace(/\{ink:([a-z-]+)\.(\d+)\}/g, (_m, fam: string, tone: string) =>
        tintInkRef(fam, Number(tone), look))
      // `{chart.N}` is a computed series colour, not a ramp step — it resolves
      // to a literal, which `refToView` passes through unchanged.
      .replace(/\{chart\.(\d)\}/g, (_m, n: string) => chartSlots[Number(n) - 1] ?? '')
      // `{visited.N}` — the accent ramp rotated onto a distinct hue, for
      // Carbon's visited-link and caution-undefined tokens. L and C are the
      // accent ramp's, so the visited ramp inherits its contrast behaviour and
      // only the hue differs. See CARBON_VISITED_HUE_OFFSET.
      .replace(/\{visited\.(\d+)\}/g, (_m, tone: string) => {
        const base = look('accent', Number(tone))
        if (!base) return ''
        const { l, c, h } = hexToOklch(base)
        return oklchToHex(l, c, (h + CARBON_VISITED_HUE_OFFSET) % 360)
      })
    return { group: r.group, key: r.key, ref }
  })
}

/** Every curated architecture projects identically — table in, per-theme refs
 *  out — so they share one loop instead of three copies that can drift. */
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
    const look = scaleLookup(input.scales, input.themePalettes[t], kind)
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
  // Disabled ink — tone 7, matching Astryx's own `text.disabled`. Categorical
  // used to have none at all (a fixed tone here would need re-verifying per
  // custom accent, same trap as everything else in this file), and the preview
  // panel fell back to Astryx's value for this slot; adopting the same tone
  // natively means that fallback is no longer needed.
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
  // Hover/pressed on the primary fill — fixed one/two steps past the solid,
  // matching the flat catalogue's own `background-brand-solid-hover` (9→10)
  // convention. Known, accepted simplification: unlike `action.primary.default`
  // itself these are fixed tones, not re-solved from `accent.solid`'s resolved step —
  // for the rare accent whose solid lands above tone 9 (see `solidInkPair`),
  // hover could read lighter than default. Not fixed here; same class of
  // residual this file already accepts elsewhere for simple fixed-step roles.
  { group: 'action', key: 'primary.hover',   light: '{accent.10}', dark: '{accent.10}' },
  // Dark pressed is a recessed step (6), not a lighter one — measured by eye
  // on a dark layout, {accent.11} read as a hover-again, not as "down".
  { group: 'action', key: 'primary.pressed', light: '{accent.11}', dark: '{accent.6}' },
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
  { group: 'surface', key: 'selected', light: '{accent.3}', dark: '{accent.3}' },
  // Inverse surface is dark-on-light and light-on-dark by definition — but
  // dark does NOT take the ramp's lightest step. `{neutral-dark.12}` flashes
  // near-white on a dark page; `{neutral.4}` (the light ramp's quiet gray) is
  // the muted inverse chip that actually reads as "inverted" in a layout.
  { group: 'surface', key: 'inverse', light: '{neutral.12}', dark: '{neutral.4}' },
  // Scrim — stays dark in BOTH appearances (it dims, it doesn't invert).
  { group: 'surface', key: 'overlay', light: '{neutral.12}', dark: '{neutral-dark.1}' }, // pair with opacity.60
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
  { group: 'status', key: 'critical.surface', light: '{error.3}',        dark: '{error.3}' },
  { group: 'status', key: 'critical.content', light: '{error.11}',       dark: '{error.11}' },
  { group: 'status', key: 'warning.surface',  light: '{warning.3}',      dark: '{warning.3}' },
  { group: 'status', key: 'warning.content',  light: '{warning.11}',     dark: '{warning.11}' },
  { group: 'status', key: 'success.surface',  light: '{success.3}',      dark: '{success.3}' },
  { group: 'status', key: 'success.content',  light: '{success.11}',     dark: '{success.11}' },
  // Solid critical fill (badges, destructive buttons). Light solves the fill
  // (`{error.solid}`). Dark uses the ramp's light end so a destructive solid
  // still reads as coloured on a dark page; ink is solved against that step.
  { group: 'status', key: 'critical.surface-solid', light: '{error.solid}',     dark: '{error.12}' },
  { group: 'status', key: 'critical.on-solid',       light: '{on:error.solid}', dark: '{on:error.12}' },
  // Border — strokes. `default` is tone 5, the same step Astryx's own
  // `border.default` resolves to, so the two namings agree on what a default
  // stroke IS. That also fixes an ordering this file used to carry and flag:
  // `subtle` sat on a HIGHER tone (5) than `default` (3), i.e. the "subtle"
  // stroke was the heavier one. `subtle` takes over the 3 `default` vacated, so
  // the pair now reads in the right order and no tone leaves the palette.
  // DECORATIVE by intent: card edges, dividers, table rules. No contrast floor.
  // Do NOT use it as the visible boundary of a control — see `strong`.
  { group: 'border', key: 'default',  light: '{neutral.5}', dark: '{neutral-dark.5}' },
  // The control boundary — WCAG 1.4.11 (≥3:1) AND APCA Lc 45. Use it wherever
  // the stroke is the only thing saying "there is an input here": text fields,
  // checkboxes, radios, selects, unfilled buttons.
  //
  // The light/dark tones are DELIBERATELY not the same step, which breaks the
  // system's usual identity rule. Light `{neutral.9}` is the 1.4.11 control
  // boundary. Dark used to jump to `{neutral-dark.11}` for the same floor —
  // on a dark layout that stroke reads as a second text colour. `{neutral-dark.6}`
  // is the quiet grouping edge that matches the rest of the dark page; use
  // `border.focus` when the stroke is the only thing saying "this is a control".
  { group: 'border', key: 'strong',   light: '{neutral.9}', dark: '{neutral-dark.6}' },
  // DECORATIVE brand emphasis — a tinted card edge or a grouping stroke. It is
  // NOT a state indicator: anything that says "this control is selected /
  // focused / active" conveys information and falls under WCAG 1.4.11, so it
  // must use `border.active` (solved to clear 3:1 and Lc 45 in both themes).
  // Splitting the two by NAME is what keeps that checkable — `border.accent`
  // at {accent.8} reads 1.97:1 in dark, which is correct for emphasis and
  // wrong for state.
  { group: 'border', key: 'accent',   light: '{accent.8}',  dark: '{accent.8}' },
  { group: 'border', key: 'subtle',   light: '{neutral.3}', dark: '{neutral-dark.4}' },
  // Focus ring — WCAG 1.4.11 wants ≥3:1 against the page, and APCA wants Lc 45.
  // Light `{accent.9}` clears both (WCAG 3.14–7.45, Lc 57–85). Dark used to be
  // `{accent.8}` and cleared NEITHER (WCAG 1.97–4.00, Lc 9.5–28.5). Measured
  // across six seeds, the dark accent tones give:
  //     .8  → WCAG 1.97..4.00   Lc  9.5..28.5   fails both
  //     .9  → WCAG 2.52..6.01   Lc 15.3..42.9   fails both
  //     .10 → WCAG 3.04..7.21   Lc 20.2..50.1   WCAG only — the blind spot
  //     .11 → WCAG 11.83..11.90 Lc 75.0..75.3   clears both
  // `.10` is the trap: it satisfies the letter of 1.4.11 while remaining hard
  // to see, which is exactly what the dual-metric rule exists to catch.
  { group: 'border', key: 'focus',   light: '{accent.9}',  dark: '{accent.11}' },
  { group: 'border', key: 'critical', light: '{error.9}',   dark: '{error.11}' },
  // Warning/success ramps are lighter than error at tone 9 — measured worst
  // case across seeds: .9 reads 2.29:1 / Lc 44.4 on the page, .10 still under
  // 3:1. Tone 11 is the first step that clears both floors in light AND dark.
  { group: 'border', key: 'warning',  light: '{warning.11}', dark: '{warning.11}' },
  { group: 'border', key: 'success',  light: '{success.11}', dark: '{success.11}' },
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
  'surface.overlay': '[ROLE: Scrim] Semi-transparent layer over surface.page to focus attention on modals (layer-2 surfaces). Ships at alpha 0.5.',
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
  'action.primary.hover': '[ROLE: Primary CTA Hover] Interactive hover state — one primitive step darker (light) or lighter (dark) than action.primary.default.',
  'action.primary.pressed': '[ROLE: Primary CTA Pressed] Active/pressed state. Light {accent.11} (one step past hover). Dark {accent.6} — recessed, darker than the solid, so press reads as down not as a second hover.',
  'action.secondary.default': '[ROLE: Secondary CTA Default] Neutral subtle button fill. Label text must be content.primary, not content.on-action.',
  'action.secondary.accent': '[ROLE: Secondary Accent Fill] Accent-tinted secondary button background. Pair with content.primary for the label.',
  'action.disabled': '[ROLE: Disabled Action Fill] Disabled button/control background. No contrast floor — communicates inactive state visually.',
  'status.critical.surface': "[ROLE: Feedback Background Subtle] Tinted background for error alerts and banners. Pair with status.critical.content — never a fixed ink on the bg alone.",
  'status.critical.surface-solid': "[ROLE: Feedback Background Solid] Solid fill for destructive badges and buttons. Pair with status.critical.on-solid. Light solves {error.solid}; dark uses {error.12} so the fill still reads as coloured on a dark page.",
  'status.critical.content': '[ROLE: Feedback Text] Error message ink on status.critical.surface. Both themes {error.11} — chromatic severity, not the near-white {error.12} in dark.',
  'status.critical.on-solid': "[ROLE: Feedback Inverted Text] Label ink on status.critical.surface-solid. Solved per theme against that fill.",
  'status.warning.surface': '[ROLE: Feedback Background Subtle] Tinted background for warning alerts. Pair with status.warning.content.',
  'status.warning.content': '[ROLE: Feedback Text] Warning message ink on status.warning.surface. Light and dark both {warning.11} — chromatic severity, not the near-white {warning.12} in dark.',
  'status.success.surface': '[ROLE: Feedback Background Subtle] Tinted background for success alerts. Pair with status.success.content.',
  'status.success.content': '[ROLE: Feedback Text] Success message ink on status.success.surface. Light and dark both {success.11} — chromatic severity, not the near-white {success.12} in dark.',
  'border.subtle': '[ROLE: Structural Border] Aesthetic dividers (hr, table rules). Light {neutral.3}, dark {neutral-dark.4}. Not critical for accessibility.',
  'border.strong': '[ROLE: Component Border] Default layout stroke for cards and grouping. Light {neutral.9}. Dark {neutral-dark.6} so the edge stays quiet on a dark page — use border.focus when the stroke is the only control affordance (WCAG 1.4.11).',
  'border.focus': '[ROLE: A11y Focus Ring] Keyboard focus-visible ring. Must contrast strongly against backgrounds — solved per theme (light {accent.9}, dark {accent.11}).',
  'border.default': '[ROLE: Structural Border Default] Decorative card edges and dividers. No contrast floor — not for control boundaries.',
  'border.accent': '[ROLE: Decorative Brand Border] Brand-tinted grouping stroke. NOT a state indicator — use border.focus for focus/selected/active.',
  'border.critical': '[ROLE: Critical Border] Validation stroke for inputs in an error state.',
  'border.warning': '[ROLE: Warning Border] Validation stroke for inputs in a warning state.',
  'border.success': '[ROLE: Success Border] Validation stroke for inputs in a success/valid state.',
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

// ── Astryx ───────────────────────────────────────────────────────────────────
// The Astryx design-token color contract (@astryxdesign/core `defineTheme`):
// one alias per role, one hop to a primitive — same shape/math as Categorical,
// just grouped and named the way Astryx themes are (color-accent,
// color-background-surface, color-text-primary…). Curated, not a projection
// of the 39 flat roles — deliberately scoped to the roles that map cleanly
// onto Escala's primitive model (accent/neutral/error/warning/success); the
// chromatic swatch families (blue/cyan/green/…) and syntax-highlight tokens an
// Astryx theme file may also carry are out of scope for a semantic
// architecture — they're app-specific extras, not part of the alias layer.
const ASTRYX_ROLES: { group: string; key: string; light: string; dark: string }[] = [
  // Accent — the brand color and how to sit on top of it
  { group: 'accent', key: 'solid',    light: '{accent.solid}', dark: '{accent.solid}' },
  { group: 'accent', key: 'on-solid', light: '{on:accent.solid}', dark: '{on:accent.solid}' },
  { group: 'accent', key: 'muted',    light: '{accent.3}',     dark: '{accent.3}' },
  // Background — page canvas through elevated surfaces
  { group: 'background', key: 'body',     light: '{neutral.1}',  dark: '{neutral-dark.1}' },
  { group: 'background', key: 'surface',  light: '{neutral.2}',  dark: '{neutral-dark.2}' },
  // `background-card` is in the published contract (`--color-background-card`)
  // and was missing here. Cards sit one step off the body, like `surface`, but
  // Astryx keeps them separate so a card inside a surface can still be told
  // apart.
  { group: 'background', key: 'card',     light: '{neutral.2}',  dark: '{neutral-dark.2}' },
  { group: 'background', key: 'muted',    light: '{neutral.3}',  dark: '{neutral-dark.3}' },
  { group: 'background', key: 'popover',  light: '{neutral.2}',  dark: '{neutral-dark.2}' },
  // Deliberately inverted — an inverted surface is dark on a light page and
  // light on a dark one, by definition (same pattern as Categorical's
  // `surface.inverse`).
  { group: 'background', key: 'inverted', light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // `--color-background-error-inverted` — the solid error surface that carries
  // `on-error` ink. Solved rather than pinned, same as every other solid fill.
  { group: 'background', key: 'error-inverted', light: '{error.solid}', dark: '{error.solid}' },
  // Text — foreground ink
  { group: 'text', key: 'primary',   light: '{neutral.12}', dark: '{neutral-dark.12}' },
  { group: 'text', key: 'secondary', light: '{neutral.11}', dark: '{neutral-dark.11}' },
  { group: 'text', key: 'disabled',  light: '{neutral.7}',  dark: '{neutral-dark.7}' },
  { group: 'text', key: 'accent',    light: '{accent.11}',  dark: '{accent.11}' },
  // Icon — same hierarchy as Text, one step lighter (icons read lighter than type)
  { group: 'icon', key: 'primary',   light: '{neutral.11}', dark: '{neutral-dark.11}' },
  // Icons are non-text UI: WCAG 1.4.11 applies whenever they carry meaning, and
  // "secondary" promises a second VISIBLE level, not a hidden one. Light
  // `{neutral.9}` clears it (Lc 68); dark `{neutral-dark.9}` measured Lc 21 —
  // invisible. Promoted to 11 in dark, which does make it equal to
  // `icon.primary` there. That is the honest trade: the dark ramp has no step
  // between Lc 27 and Lc 75, so a second visible icon weight does not exist.
  // An invisible icon is a defect; two icons at one weight is a limitation.
  { group: 'icon', key: 'secondary', light: '{neutral.9}',  dark: '{neutral-dark.11}' },
  { group: 'icon', key: 'disabled',  light: '{neutral.7}',  dark: '{neutral-dark.7}' },
  // Same rule as `icon.secondary`: an icon that carries meaning is non-text UI
  // under WCAG 1.4.11. Light `{accent.9}` clears it (3.14:1, Lc 57); dark
  // measured 2.52:1 at Lc 15.3 — below the floor in both metrics. `{accent.11}`
  // is the only dark accent tone clearing both (11.83:1, Lc 75).
  { group: 'icon', key: 'accent',    light: '{accent.9}',   dark: '{accent.11}' },
  // Status — feedback fg/bg/on triads per severity
  { group: 'status', key: 'success',       light: '{success.solid}',  dark: '{success.solid}' },
  { group: 'status', key: 'success-muted', light: '{success.3}',  dark: '{success.3}' },
  { group: 'status', key: 'on-success',    light: '{on:success.solid}', dark: '{on:success.solid}' },
  { group: 'status', key: 'error',         light: '{error.solid}',    dark: '{error.solid}' },
  { group: 'status', key: 'error-muted',   light: '{error.3}',    dark: '{error.3}' },
  { group: 'status', key: 'on-error',      light: '{on:error.solid}',   dark: '{on:error.solid}' },
  { group: 'status', key: 'warning',       light: '{warning.solid}',  dark: '{warning.solid}' },
  { group: 'status', key: 'warning-muted', light: '{warning.3}',  dark: '{warning.3}' },
  // Warning yellow stays light in both appearances, so its "on" ink comes out
  // dark — solved, not hardcoded: that hand-patched {neutral.12} was the
  // general rule (pick the ink by contrast) written once as a special case.
  { group: 'status', key: 'on-warning',    light: '{on:warning.solid}', dark: '{on:warning.solid}' },
  // Border — strokes. `emphasized` was `{neutral.7}` — tone 7 sits deep
  // enough into the ramp that it read as a heavy, near-solid stroke rather
  // than an emphasized-but-still-subtle border (reported as "muy fuerte").
  // Pinned to `{neutral.5}`, the same tone `default` already resolves to —
  // deliberately: the user's own hand-edit (an `architectureOverrides` entry
  // on `border.emphasized.light`) had already landed there, so this makes
  // that the SCHEMA's own answer instead of a personal override sitting on
  // top of a heavier one. Both border roles reading the same primitive today
  // isn't a bug — nothing requires them to diverge, and they still can later
  // (a future override, or a future schema change, re-splits them).
  // ── Utility ───────────────────────────────────────────────────────────────
  // The remainder of the published contract. These were absent, which meant an
  // Astryx codebase consuming this export still had to hand-write them —
  // defeating the point of shipping the architecture rather than a subset.
  { group: 'utility', key: 'overlay',         light: '{neutral.12}', dark: '{neutral-dark.12}' },
  { group: 'utility', key: 'overlay-hover',   light: '{neutral.3}',  dark: '{neutral-dark.3}' },
  { group: 'utility', key: 'overlay-pressed', light: '{neutral.4}',  dark: '{neutral-dark.4}' },
  { group: 'utility', key: 'skeleton',        light: '{neutral.4}',  dark: '{neutral-dark.4}' },
  { group: 'utility', key: 'track',           light: '{neutral.4}',  dark: '{neutral-dark.4}' },
  { group: 'utility', key: 'neutral',         light: '{neutral.5}',  dark: '{neutral-dark.5}' },
  // `on-dark` / `on-light` are absolute by definition — the ink for a surface
  // whose polarity is known regardless of theme, which is why neither flips.
  { group: 'utility', key: 'on-dark',         light: '{neutral.1}',  dark: '{neutral-dark.12}' },
  { group: 'utility', key: 'on-light',        light: '{neutral.12}', dark: '{neutral-dark.1}' },

  { group: 'border', key: 'default',    light: '{neutral.5}', dark: '{neutral-dark.5}' },
  { group: 'border', key: 'emphasized', light: '{neutral.5}', dark: '{neutral-dark.5}' },
  // Control boundary — same reasoning as Categorical's `border.strong`.
  { group: 'border', key: 'strong',     light: '{neutral.9}', dark: '{neutral-dark.11}' },
]

/** Astryx resolved across every theme in `themeOrder`: group → token → themeKey → ref. */
export function projectAstryx(
  input: ProjectionInput,
  themeOrder: string[] = ['light', 'dark'],
): Record<string, Record<string, Record<string, string>>> {
  return projectCurated(ASTRYX_ROLES, input, themeOrder)
}

// ── shadcn/ui ────────────────────────────────────────────────────────────────
// The shadcn/ui CSS-variable contract (--background, --card, --primary,
// --sidebar-*…): same one-hop-per-role shape/math as Astryx and Categorical,
// named the way a shadcn `:root`/`.dark` block is. Curated to the roles shadcn
// itself ships as COLOR variables — `--radius` isn't a color and `--chart-1`
// … `--chart-5` are a data-viz palette with no equivalent primitive in
// Escala's model (they're independent hues, not tones of any existing ramp),
// so both are out of scope here, same call as dropping Astryx's chromatic/
// syntax extras above.
const SHADCN_ROLES: { group: string; key: string; light: string; dark: string }[] = [
  // Base — page canvas and default ink
  { group: 'base', key: 'background', light: '{neutral.1}',  dark: '{neutral-dark.1}' },
  { group: 'base', key: 'foreground', light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // Card — the default raised panel
  { group: 'card', key: 'fill',       light: '{neutral.2}',  dark: '{neutral-dark.2}' },
  { group: 'card', key: 'foreground', light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // Popover — floating surfaces (menus, dropdowns, tooltips)
  { group: 'popover', key: 'fill',       light: '{neutral.2}',  dark: '{neutral-dark.2}' },
  { group: 'popover', key: 'foreground', light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // Primary — the brand action color
  { group: 'primary', key: 'fill',       light: '{accent.solid}', dark: '{accent.solid}' },
  { group: 'primary', key: 'foreground', light: '{on:accent.solid}', dark: '{on:accent.solid}' },
  // Secondary — a lower-emphasis fill (secondary buttons, chips)
  { group: 'secondary', key: 'fill',       light: '{neutral.3}',  dark: '{neutral-dark.3}' },
  { group: 'secondary', key: 'foreground', light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // Muted — subtle backgrounds (disabled states, quiet panels). `bg-muted
  // text-muted-foreground` is a real shadcn pairing, so the ink has to read on
  // the fill. It was tone 9 in both, which is the SOLID step, not a text step —
  // fine on the light ramp (3.86:1, near AA) and broken on the dark one, where
  // tone 9 is a mid-grey sitting on a barely-lighter tone 3: 2.89:1 measured.
  // Tone 11 is the designated low-contrast TEXT step, and puts this pair in
  // line with the rest of the system (flat's own `content-primary` on
  // `background-secondary` measures 4.06 light / 4.47 dark — text on a step-2/3
  // surface runs a little under 4.5 system-wide, because tone 11 is solved
  // against the PAGE). Tone 12 would clear AA outright but is `foreground`'s
  // own tone, which would erase the muted/default distinction shadcn's
  // contract exists to draw.
  { group: 'muted', key: 'fill',       light: '{neutral.3}',  dark: '{neutral-dark.3}' },
  { group: 'muted', key: 'foreground', light: '{neutral.11}', dark: '{neutral-dark.11}' },
  // Accent — shadcn overloads this name for a subtle interactive-hover tint,
  // NOT the brand color (that's Primary) — kept faithful to the source contract.
  { group: 'accent', key: 'fill',       light: '{neutral.3}',  dark: '{neutral-dark.3}' },
  { group: 'accent', key: 'foreground', light: '{neutral.12}', dark: '{neutral-dark.12}' },
  // Destructive — the one severity color shadcn's base contract ships (no
  // paired "-foreground" in the source variables, so none is added here)
  // Solved, not pinned to 9 — a bright error hue at tone 9 cannot carry a label
  // (measured 3.55:1 elsewhere in this codebase). `--destructive-foreground` was
  // missing entirely; shadcn's own contract ships it.
  { group: 'destructive', key: 'fill',       light: '{error.solid}', dark: '{error.solid}' },
  { group: 'destructive', key: 'foreground', light: '{on:error.solid}', dark: '{on:error.solid}' },
  // Border / Input / Ring — strokes and focus rings
  { group: 'border', key: 'default', light: '{neutral.5}', dark: '{neutral-dark.5}' },
  { group: 'border', key: 'input',   light: '{neutral.5}', dark: '{neutral-dark.6}' },
  // ── Charts ────────────────────────────────────────────────────────────────
  // `--chart-1` … `--chart-5` are part of shadcn's published contract and were
  // missing entirely, so any consumer had to hand-write them.
  //
  // These are a CATEGORICAL palette — identity, not magnitude — so the rule is
  // that adjacent slots must stay separable, including under colour-vision
  // deficiency. Evenly spaced hues FAIL that: a 72° split puts green next to
  // amber, which measures ΔE 5.9 under deuteranopia. The offsets below
  // (0/70/160/230/300 from the brand hue at L 0.62, C 0.15) were found by
  // search and verified with the dataviz validator: worst adjacent pair ΔE 9.2
  // protan, 15.5 normal vision, every slot ≥3:1 on both surfaces, in BOTH light
  // and dark. See `__tests__/shadcn.test.ts`, which re-runs the checks.
  { group: 'chart', key: 'chart-1', light: '{chart.1}', dark: '{chart.1}' },
  { group: 'chart', key: 'chart-2', light: '{chart.2}', dark: '{chart.2}' },
  { group: 'chart', key: 'chart-3', light: '{chart.3}', dark: '{chart.3}' },
  { group: 'chart', key: 'chart-4', light: '{chart.4}', dark: '{chart.4}' },
  { group: 'chart', key: 'chart-5', light: '{chart.5}', dark: '{chart.5}' },
  // `--ring` is the FOCUS indicator, so WCAG 1.4.11 applies: it needs ≥3:1
  // against the page. Neutral tone 6 reads 1.90:1 in light and 1.57:1 in dark —
  // the same trap `border.active` and Carbon's `focus` hit. Bound to the accent,
  // which is also what shadcn's own default theme does.
  { group: 'border', key: 'ring',    light: '{accent.solid}', dark: '{accent.11}' },
  // Sidebar — a parallel surface set for nav rails/dashboards
  { group: 'sidebar', key: 'background',          light: '{neutral.2}',   dark: '{neutral-dark.2}' },
  { group: 'sidebar', key: 'foreground',          light: '{neutral.12}',  dark: '{neutral-dark.12}' },
  { group: 'sidebar', key: 'primary',             light: '{accent.solid}', dark: '{accent.solid}' },
  { group: 'sidebar', key: 'primary-foreground',  light: '{on:accent.solid}', dark: '{on:accent.solid}' },
  { group: 'sidebar', key: 'accent',              light: '{neutral.3}',   dark: '{neutral-dark.3}' },
  { group: 'sidebar', key: 'accent-foreground',   light: '{neutral.12}',  dark: '{neutral-dark.12}' },
  { group: 'sidebar', key: 'border',               light: '{neutral.5}',  dark: '{neutral-dark.5}' },
  { group: 'sidebar', key: 'ring',                light: '{neutral.6}',   dark: '{neutral-dark.6}' },
]

/** shadcn resolved across every theme in `themeOrder`: group → token → themeKey → ref. */
export function projectShadcn(
  input: ProjectionInput,
  themeOrder: string[] = ['light', 'dark'],
): Record<string, Record<string, Record<string, string>>> {
  return projectCurated(SHADCN_ROLES, input, themeOrder)
}

// ── Vibrancy ─────────────────────────────────────────────────────────────────
// Apple HIG opacity tiers (labels 100/60/30/18 · fills 20/16/12/8 · separator
// 36). Alpha roles reference RGB channel primitives; every text-grade role
// ships an opaque fallback resolved to the nearest AA-safe ramp tone.
const rgbOf = (hex: string): string => {
  try { return chroma(hex).rgb().map(Math.round).join(' ') } catch { return '0 0 0' }
}

type VibrancyMode = {
  channels: Record<string, string>
  labels: Record<string, string>
  labelFallbacks: Record<string, string>
  backgrounds: Record<string, string>
  fills: Record<string, string>
  separators: Record<string, string>
  tint: string
  materials: Record<string, string>
}

export function projectVibrancy(input: ProjectionInput): { light: VibrancyMode; dark: VibrancyMode; blur: string } {
  const gray = input.scales.gray
  const grayDark = input.scales.grayDark ?? gray
  const solidTone = accessibleSolidTone(input.scales.brand)
  const solidBrand = input.scales.brand[solidTone] ?? input.accent

  const mode = (
    scale: Record<number, string>, fam: 'neutral' | 'neutral-dark',
    pageTone: number, inkTone: number, bg2Tone: number, bg3Tone: number, sepTone: number,
    // Opaque fallback refs — mode-specific: the nearest solid tone to what the
    // alpha label composites to over the page (secondary must stay AA-safe).
    secondaryFb: number, tertiaryFb: number,
  ): VibrancyMode => {
    const page = scale[pageTone] ?? '#ffffff'
    const ink = scale[inkTone] ?? '#000000'
    return {
      channels: {
        [`rgb-${fam}-${pageTone}`]: rgbOf(page),
        [`rgb-${fam}-${inkTone}`]: rgbOf(ink),
        'rgb-accent-solid': rgbOf(solidBrand),
      },
      labels: {
        primary: `rgb(${rgbOf(ink)} / 1)`,
        secondary: `rgb(${rgbOf(ink)} / 0.60)`,
        tertiary: `rgb(${rgbOf(ink)} / 0.30)`,   // non-text use only
        quaternary: `rgb(${rgbOf(ink)} / 0.18)`, // decorative only
      },
      labelFallbacks: {
        primary: `{${fam}.${inkTone}}`,
        secondary: `{${fam}.${secondaryFb}}`, // nearest AA-safe solid tone
        tertiary: `{${fam}.${tertiaryFb}}`,   // appearance match — not for text
      },
      // System background stack — opaque by design, so pure primitive refs (R1).
      backgrounds: {
        primary: `{${fam}.${pageTone}}`,
        secondary: `{${fam}.${bg2Tone}}`,
        tertiary: `{${fam}.${bg3Tone}}`,
      },
      fills: {
        primary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.20)`,
        secondary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.16)`,
        tertiary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.12)`,
        quaternary: `rgb(${rgbOf(scale[8] ?? '#636468')} / 0.08)`,
      },
      separators: {
        default: `rgb(${rgbOf(scale[sepTone] ?? '#919396')} / 0.36)`,
        opaque: `{${fam}.${bg3Tone}}`,
      },
      tint: `rgb(${rgbOf(solidBrand)} / 1)`,
      materials: {
        thick: `rgb(${rgbOf(page)} / 0.93)`,
        regular: `rgb(${rgbOf(page)} / 0.80)`,
        thin: `rgb(${rgbOf(page)} / 0.60)`,
      },
    }
  }

  return {
    // light: page grows from tone 1, ink is tone 12.
    light: mode(gray, 'neutral', 1, 12, 2, 3, 6, 8, 5),
    // dark: the hierarchy inverts — page IS tone 12 of the dark ramp.
    dark: mode(grayDark, 'neutral-dark', 12, 1, 11, 10, 6, 5, 9),
    blur: 'blur(20px) saturate(1.8)',
  }
}

/** Composite an alpha ink over a base — what an alpha role effectively reads as. */
export function compositeOver(inkHex: string, alpha: number, baseHex: string): string {
  try { return chroma.mix(baseHex, inkHex, alpha, 'rgb').hex() } catch { return inkHex }
}

// ── Tonal (Material 3) ───────────────────────────────────────────────────────
// REAL HCT, via Google's own `@material/material-color-utilities`.
//
// This replaces a fabrication (defect C2). The previous implementation set
// OKLCH `L = tone / 100` and tapered chroma with `sin(π·t)`, with a comment
// claiming that was "the same behavior HCT tonal palettes exhibit". Both halves
// were wrong:
//
//  · **Tone is CIE `L*`, not OKLab `L`.** They are different functions:
//    `L* 40` ≈ OKLab `L 0.48`, not 0.40, and the error is non-linear — largest
//    in the mid tones, which is exactly where M3's contrast guarantees live.
//    Tone pairs like 40-on-100 and 80-on-20 therefore did NOT deliver the
//    contrast the scheme promises, so every `on-*` role was unverified.
//  · **HCT does not taper chroma smoothly.** It holds hue constant and takes
//    the MAXIMUM chroma available in gamut at each tone — a jagged,
//    hue-dependent envelope. A sine has no relationship to it.
//
// CAM16 (which HCT is built on) is ~400 lines of dense appearance-model maths
// where a transposed coefficient is invisible in review and wrong in output.
// Porting it by hand would be the least defensible option available; depending
// on the reference implementation IS the faithful choice here.
//
// The palette PARAMETERS come from `SchemeTonalSpot`, M3's default scheme, so
// the chroma values below are Google's, not ours.

/** Hue/chroma per palette, read from `SchemeTonalSpot` rather than invented. */
const TONAL_SPOT = {
  primary: { hueShift: 0, chroma: 36 },
  secondary: { hueShift: 0, chroma: 16 },
  tertiary: { hueShift: 60, chroma: 24 },
  neutral: { hueShift: 0, chroma: 6 },
  'neutral-variant': { hueShift: 0, chroma: 8 },
} as const

const TONAL_STOPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100]
const TONAL_STOPS_NEUTRAL = [0, 4, 6, 10, 12, 17, 20, 22, 24, 30, 40, 50, 60, 70, 80, 87, 90, 92, 94, 95, 96, 98, 99, 100]

/**
 * A Material 3 tonal palette: the seed's HCT hue at a fixed chroma, sampled at
 * the requested tones. `chroma` is HCT chroma (roughly 0–120), NOT OKLCH chroma
 * (0–0.37) — the two are not interchangeable, which is why the call sites below
 * carry M3's own numbers rather than the old OKLCH constants.
 */
export function tonalPalette(
  seedHex: string,
  opts: { hueShift?: number; chroma?: number; chromaMul?: number; stops?: number[] } = {},
): Record<number, string> {
  let hue = 0
  let seedChroma = 36
  try {
    const src = Hct.fromInt(argbFromHex(seedHex))
    hue = src.hue
    seedChroma = src.chroma
  } catch { /* keep fallbacks */ }

  const chroma = opts.chroma ?? seedChroma * (opts.chromaMul ?? 1)
  const palette = TonalPalette.fromHueAndChroma(hue + (opts.hueShift ?? 0), chroma)

  const out: Record<number, string> = {}
  for (const t of opts.stops ?? TONAL_STOPS) {
    try { out[t] = hexFromArgb(palette.tone(t)) } catch { out[t] = t >= 50 ? '#ffffff' : '#000000' }
  }
  return out
}

export function tonalPalettes(accent: string, errorSeed: string): Record<string, Record<number, string>> {
  const p = TONAL_SPOT
  return {
    primary: tonalPalette(accent, { chroma: p.primary.chroma }),
    secondary: tonalPalette(accent, { chroma: p.secondary.chroma }),
    tertiary: tonalPalette(accent, { hueShift: p.tertiary.hueShift, chroma: p.tertiary.chroma }),
    // M3 pins the error palette to its own hue/chroma rather than deriving it
    // from the seed — but Escala lets the user choose an error colour, so the
    // seed's hue is kept and only the chroma follows the scheme.
    error: tonalPalette(errorSeed, { chroma: 84 }),
    neutral: tonalPalette(accent, { chroma: p.neutral.chroma, stops: TONAL_STOPS_NEUTRAL }),
    'neutral-variant': tonalPalette(accent, { chroma: p['neutral-variant'].chroma, stops: TONAL_STOPS_NEUTRAL }),
  }
}

// The strict M3 scheme: light 40/100/90/10 ↔ dark 80/20/30/90, surfaces on the
// extended neutral stops, outlines on neutral-variant.
export const TONAL_SCHEME: { group: string; role: string; palette: string; light: number; dark: number }[] = [
  { group: 'core', role: 'primary', palette: 'primary', light: 40, dark: 80 },
  { group: 'core', role: 'on-primary', palette: 'primary', light: 100, dark: 20 },
  { group: 'core', role: 'primary-container', palette: 'primary', light: 90, dark: 30 },
  { group: 'core', role: 'on-primary-container', palette: 'primary', light: 10, dark: 90 },
  { group: 'core', role: 'inverse-primary', palette: 'primary', light: 80, dark: 40 },
  { group: 'secondary', role: 'secondary', palette: 'secondary', light: 40, dark: 80 },
  { group: 'secondary', role: 'on-secondary', palette: 'secondary', light: 100, dark: 20 },
  { group: 'secondary', role: 'secondary-container', palette: 'secondary', light: 90, dark: 30 },
  { group: 'secondary', role: 'on-secondary-container', palette: 'secondary', light: 10, dark: 90 },
  { group: 'tertiary', role: 'tertiary', palette: 'tertiary', light: 40, dark: 80 },
  { group: 'tertiary', role: 'on-tertiary', palette: 'tertiary', light: 100, dark: 20 },
  { group: 'tertiary', role: 'tertiary-container', palette: 'tertiary', light: 90, dark: 30 },
  { group: 'tertiary', role: 'on-tertiary-container', palette: 'tertiary', light: 10, dark: 90 },
  { group: 'error', role: 'error', palette: 'error', light: 40, dark: 80 },
  { group: 'error', role: 'on-error', palette: 'error', light: 100, dark: 20 },
  { group: 'error', role: 'error-container', palette: 'error', light: 90, dark: 30 },
  { group: 'error', role: 'on-error-container', palette: 'error', light: 10, dark: 90 },
  { group: 'surfaces', role: 'surface', palette: 'neutral', light: 98, dark: 6 },
  { group: 'surfaces', role: 'on-surface', palette: 'neutral', light: 10, dark: 90 },
  { group: 'surfaces', role: 'surface-variant', palette: 'neutral-variant', light: 90, dark: 30 },
  { group: 'surfaces', role: 'on-surface-variant', palette: 'neutral-variant', light: 30, dark: 80 },
  { group: 'surfaces', role: 'surface-container-lowest', palette: 'neutral', light: 100, dark: 4 },
  { group: 'surfaces', role: 'surface-container-low', palette: 'neutral', light: 96, dark: 10 },
  { group: 'surfaces', role: 'surface-container', palette: 'neutral', light: 94, dark: 12 },
  { group: 'surfaces', role: 'surface-container-high', palette: 'neutral', light: 92, dark: 17 },
  { group: 'surfaces', role: 'surface-container-highest', palette: 'neutral', light: 90, dark: 22 },
  { group: 'surfaces', role: 'inverse-surface', palette: 'neutral', light: 20, dark: 90 },
  { group: 'surfaces', role: 'inverse-on-surface', palette: 'neutral', light: 95, dark: 20 },
  { group: 'outlines', role: 'outline', palette: 'neutral-variant', light: 50, dark: 60 },
  { group: 'outlines', role: 'outline-variant', palette: 'neutral-variant', light: 80, dark: 30 },
]

export function projectTonal(input: ProjectionInput, errorSeed: string): {
  palettes: Record<string, Record<number, string>>
  scheme: Record<string, Record<string, { light: string; dark: string }>>
} {
  const palettes = tonalPalettes(input.accent, errorSeed)
  const scheme: Record<string, Record<string, { light: string; dark: string }>> = {}
  for (const e of TONAL_SCHEME) {
    scheme[e.group] ??= {}
    scheme[e.group][e.role] = { light: `{${e.palette}.${e.light}}`, dark: `{${e.palette}.${e.dark}}` }
  }
  return { palettes, scheme }
}


// ── IBM Carbon ───────────────────────────────────────────────────────────────
// Carbon's own contract, with the user's colours in it. Two things make it
// structurally different from every other architecture here, and both are
// preserved rather than flattened:
//
//  1. **Four themes, not light/dark.** White · Gray 10 · Gray 90 · Gray 100.
//     Two are light and two are dark, but they are four distinct products —
//     `g10` is not "light mode with a tweak", it is the theme whose page is one
//     step off white so that layers can alternate DOWN as well as up.
//
//  2. **Surfaces resolve by nesting DEPTH.** A component asks for `layer`, and
//     which of `layer-01/02/03` it gets depends on how deeply it is wrapped.
//     Flattening that into a background/surface pair loses the whole idea.
//
// The layer progression follows Carbon's own shape, verified against
// `@carbon/themes` in `__tests__/carbon.test.ts`:
//
//     white  page → +1 → page → +1     (ALTERNATES — no headroom above white)
//     g10    page → −1 → page → −1     (alternates the other way)
//     g90    page → +1 → +2 → +3       (ascends — dark has headroom)
//     g100   page → +1 → +2 → +3
//
// Encoding "each layer is lighter than the last" would be wrong for half of
// them. See `color/carbon.ts` for the measurement.

/** Carbon's four themes, in Carbon's own order. */
export const CARBON_MODES = ['white', 'g10', 'g90', 'g100'] as const
export type CarbonMode = (typeof CARBON_MODES)[number]

const CARBON_MODE_KIND: Record<CarbonMode, 'light' | 'dark'> = {
  white: 'light', g10: 'light', g90: 'dark', g100: 'dark',
}

/**
 * IBM's own names for the four themes. Carbon's mode keys are the only ones in
 * the system that are not already readable — `light`/`dark` say what they are,
 * `g90` does not — so the table has to translate them or it shows the reader
 * internal keys.
 */
const CARBON_MODE_LABEL: Record<CarbonMode, string> = {
  white: 'White', g10: 'Gray 10', g90: 'Gray 90', g100: 'Gray 100',
}

/**
 * Display name for one of an architecture's `modeKeys`.
 *
 * Per-theme architectures resolve their columns against user-named themes, so
 * the UI resolves those itself; this covers the FIXED mode sets that belong to
 * the architecture rather than to the project.
 */
export function architectureModeLabel(kind: SemanticArchitecture, mode: string): string {
  if (kind === 'carbon') return CARBON_MODE_LABEL[mode as CarbonMode] ?? mode
  return mode
}

/**
 * IBM stop → Escala ramp tone.
 *
 * THIS IS THE ONLY THING ESCALA SUPPLIES. Every Carbon token's family and stop
 * comes from `CARBON_TOKENS`, generated from `@carbon/themes` — so the token
 * list, and which stop each theme uses, are IBM's by construction and cannot
 * drift. What has to be translated is the LADDER ITSELF.
 *
 * Carbon walks a 10-step neutral ladder that is evenly spaced by lightness.
 * Escala walks a 12-step Radix ramp whose steps are ROLES: 1–2 page surfaces,
 * 3–5 component surfaces, 6–8 borders, 9 solid, 10 hovered solid, 11 low-
 * contrast text, 12 high-contrast text. The mapping is therefore by role, not
 * by lightness — matching `gray-70` to whichever Escala tone happens to share
 * its L would put secondary text on a border step.
 *
 * TWO COLLAPSES ARE UNAVOIDABLE, and they are the honest cost of the model:
 *
 *   light: gray-80, gray-90, gray-100 and black all land on tone 12
 *   dark:  gray-10, gray-20 and white all land on tone 12
 *
 * A Radix-shaped ramp has exactly ONE step at the far end of the page; Carbon
 * has three. `backgroundInverse` (gray-80) and `textPrimary` (gray-100) are
 * distinct in Carbon and identical here. Widening the ramp to fix that would
 * change every other architecture, so the collapse is recorded rather than
 * hidden — `__tests__/carbon.test.ts` asserts exactly which tokens collide.
 */
const CARBON_NEUTRAL_TONE: Record<'light' | 'dark', Record<number, number>> = {
  //         10  20  30  40  50  60  70  80  90 100
  light: { 10: 2, 20: 3, 30: 4, 40: 6, 50: 8, 60: 9, 70: 11, 80: 12, 90: 12, 100: 12 },
  dark:  { 10: 12, 20: 12, 30: 11, 40: 11, 50: 9, 60: 7, 70: 5, 80: 3, 90: 2, 100: 1 },
}

/**
 * The same translation for a CHROMATIC ladder, where Radix's step 9 is the
 * solid and the meaning of "higher" flips between appearances.
 *
 * Carbon anchors brand identity at stop 60 (`blue-60` IS IBM Blue), so 60 → 9
 * in both. Above 60 Carbon goes darker; in a light ramp that is 11–12 (text
 * steps) and in a dark ramp it is 3–5 (surface steps). Below 60 Carbon goes
 * lighter, and the two appearances mirror again.
 */
/**
 * Chromatic stops are mapped by their OFFSET FROM THE FAMILY'S ANCHOR, not by
 * their absolute number.
 *
 * Carbon's chromatic ramps are not lightness-aligned with each other. `blue-60`
 * is IBM Blue; the equivalent saturated step of the yellow ramp is `yellow-30`,
 * because a yellow dark enough to sit at stop 60 has stopped being yellow.
 * Mapping absolute stops through one table put `supportWarning` (yellow-30) on
 * tone 4 — a pale tint where IBM has a vivid signal colour.
 *
 * So each family declares which stop plays the solid role, and the ladder is
 * indexed by distance from it.
 */
const CARBON_FAMILY_ANCHOR: Record<string, number> = {
  blue: 60, red: 60, purple: 60, magenta: 60, teal: 60, cyan: 60,
  green: 50, orange: 40, yellow: 30,
}

/**
 * Offset from the anchor → Escala tone. Offset 0 is the solid (step 9); the
 * two appearances mirror, because "one stop darker than the brand colour" is a
 * text step in a light ramp and a surface step in a dark one.
 *
 * In dark, offsets −1 and −2 BOTH land on 11, and that is a measured decision
 * rather than an oversight. A Radix dark ramp has two bright steps above the
 * solid (11, 12); Carbon uses three (`blue-30/40/50`). Sending −1 to tone 10
 * keeps them distinct and puts `border-interactive` at 2.91:1 on the g90 page —
 * under WCAG 1.4.11. Collapsing costs one gradation and buys the 3:1.
 */
const CARBON_CHROMA_TONE: Record<'light' | 'dark', Record<number, number>> = {
  light: { '-4': 3, '-3': 4, '-2': 6, '-1': 8, 0: 9, 1: 11, 2: 12, 3: 12, 4: 12 },
  dark:  { '-4': 12, '-3': 12, '-2': 11, '-1': 11, 0: 9, 1: 5, 2: 3, 3: 2, 4: 1 },
}

/**
 * The same offsets for a CHROMATIC token that sits on the INVERSE surface.
 *
 * `linkInverse`, `focusInverse` and the `support*Inverse` pairs are painted on
 * the inverse bar, which is dark in a light theme and light in a dark one. BOTH
 * appearances therefore run backwards relative to the ordinary ladder, and the
 * anchor sits well away from the solid in each.
 *
 * The light table is not just "the pale end". The inverse bar in a light theme
 * is `{neutral.12}` — around `#37343c`, which is dark but not black — and APCA
 * punishes a mid-pale foreground on it hard: tone 6 measures WCAG 6.08 and
 * **Lc 56.9**, comfortably AA and nowhere near the Lc 75 body text needs. Tone
 * 3 clears it. That gap between the two metrics is the whole reason the system
 * reports both.
 *
 * Measured on this codebase's dark violet ramp against the inverse bar
 * (`#e5e4e8`): tone 9 reads **3.92:1** and tone 8 reads 3.77:1 at Lc 57 —
 * both under what a link needs. Tone 6 clears it for most seeds and the amber
 * ramp still misses at Lc 74.5, so the anchor lands on **5** — the first step
 * that clears Lc 75 for every seed while still reading as the brand.
 *
 * Without this table the teal seed produced `link-inverse` at **1.00:1**: the
 * solved `{accent.solid}` on a dark ramp is the pale `#c3ede6`, painted onto a
 * near-white bar.
 */
const CARBON_CHROMA_TONE_INVERSE: Record<'light' | 'dark', Record<number, number>> = {
  light: { '-4': 2, '-3': 2, '-2': 3, '-1': 3, 0: 4, 1: 6, 2: 8, 3: 9, 4: 11 },
  dark:  { '-4': 7, '-3': 7, '-2': 6, '-1': 6, 0: 5, 1: 4, 2: 3, 3: 2, 4: 1 },
}

/** Stops, ordered, so an offset is a distance in ladder steps. */
const CARBON_STOP_LADDER = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

/**
 * The few places Escala deliberately does NOT reproduce IBM's value, each with
 * the measurement that forced it.
 *
 * The rule for adding to this table: an override is only legitimate when IBM's
 * own token fails an accessibility floor that the token's role requires. It is
 * not for taste. Every entry names the floor and the number.
 */
const CARBON_MIN_TONE: Record<string, { light: number; dark: number }> = {
  /**
   * `border-strong-*` is the CONTROL BOUNDARY — the outline of an input or a
   * button — so WCAG 1.4.11 applies at 3:1 against the surface it sits on.
   *
   * IBM uses `gray-50` for it, which reads **3.19:1 on white and 2.93:1 on
   * gray-10** — IBM's own g10 theme misses the floor. Transposed onto a Radix
   * ramp it lands on step 8, a decorative border step, and measures 2.69–2.96
   * in the light themes and 1.79–2.84 in the dark ones.
   *
   * The dark floor is 11, and the reason is a genuine property of the ramp
   * rather than a conservative choice. Measured on the dark neutral ramp
   * against every layer it can sit on:
   *
   *   tone  9  →  WCAG 2.39–3.17  ·  APCA Lc 17.8–21.2
   *   tone 10  →  WCAG 2.89–3.84  ·  APCA Lc 23.4–26.7
   *   tone 11  →  WCAG 9.01–11.95 ·  APCA Lc 72.0–75.3
   *
   * **There is nothing between Lc 27 and Lc 75.** A Radix dark ramp jumps
   * straight from its border steps to its text steps, so a dark control
   * boundary is either below the Lc 45 the `ui-component` intent requires, or
   * it is bright. Tone 10 passes WCAG and fails APCA — precisely the blind spot
   * the dual metric exists to expose, and the reason this floor is 11 and not
   * the 10 that WCAG alone would have accepted.
   *
   * Because this is a FLOOR and not a fixed value, Carbon's per-depth gradation
   * in the dark themes (`gray-50` → `40` → `30` as depth increases) survives
   * wherever it already clears.
   */
  'border-strong-01': { light: 9, dark: 11 },
  'border-strong-02': { light: 9, dark: 11 },
  'border-strong-03': { light: 9, dark: 11 },
  /**
   * The toggle track. Same `gray-50`, same job — it is the visible boundary of
   * a control — and the same measurements: 2.69 light, 1.79–2.84 dark.
   */
  'toggle-off': { light: 9, dark: 11 },
  /**
   * Links are BODY COPY, so 4.5:1 and Lc 75 apply, not the 3:1 a fill needs.
   *
   * IBM uses `blue-60` for `linkPrimary`, which is its text-grade blue — 5.16:1
   * on white. Transposed onto an arbitrary brand ramp, the equivalent step is
   * the solid, and a solid is only guaranteed to CARRY ink, not to BE ink:
   * this codebase's violet solid measures **4.29:1 at Lc 63.5** on the page.
   *
   * The floor is 12, not the 11 a text step suggests, and Carbon is the
   * architecture that proved why. `{accent.11}` is solved against the PAGE and
   * lands on Lc 75.1 — the body-text threshold exactly, with no margin. Carbon
   * is the only architecture with a SECOND surface, and one step in is enough
   * to spend it: the same colour reads **Lc 68.0 on the g10 page** and
   * **Lc 74.6 on g90**. Tone 12 is the ramp's high-contrast text step and
   * carries the headroom the layer model requires.
   */
  'link-primary': { light: 12, dark: 12 },
  'link-primary-hover': { light: 12, dark: 12 },
  'link-secondary': { light: 12, dark: 12 },
  'link-visited': { light: 12, dark: 12 },
  /**
   * `textError` is body copy, so the same floor applies. IBM uses `red-60`,
   * which is its text-grade red; on an arbitrary error ramp the solid measures
   * 4.72:1 at Lc 67.9 — WCAG AA, APCA short.
   */
  'text-error': { light: 12, dark: 12 },
}

/**
 * Does this token sit on the inverse surface rather than on the page?
 *
 * Neutral inverse tokens (`background-inverse`, `text-inverse`) need no special
 * handling — the ordinary ladder already puts them at the far end of the ramp,
 * which IS the inverse surface and its ink. Only the CHROMATIC ones do, via
 * `CARBON_CHROMA_TONE_INVERSE`.
 */
const isCarbonInverseToken = (token: string): boolean => /inverse/.test(token)

/**
 * Tokens whose whole job is "be legible on that fill", so they are SOLVED
 * against it rather than pinned.
 *
 * IBM pins `textOnColor` and `iconOnColor` to pure white in all four themes.
 * On IBM's own `blue-50` that is 3.18:1 — already under AA, and only defensible
 * because a button label is large text. Transposed onto an arbitrary brand
 * ramp it is worse: on this codebase's violet it measured **2.09:1**, which
 * fails even the large-text floor.
 *
 * A pinned ink cannot be right for an unknown brand hue. `{on:…}` picks the
 * near-white or near-black that actually wins on the resolved fill, which is
 * the same solver `accent.on-solid` uses everywhere else in the system.
 */
const CARBON_SOLVED_INK: Record<string, string> = {
  'text-on-color': 'interactive',
  'icon-on-color': 'interactive',
}

/**
 * IBM palette family → Escala family.
 *
 * `purple` is the interesting one. Carbon uses it for visited links and for
 * "caution, undefined" — a hue Escala's palette does not carry. Rather than
 * drop those tokens (incomplete) or fold them into the accent (wrong meaning),
 * they are emitted on a hue ROTATED off the accent by the same angle that
 * separates Carbon's own purple from its own blue: **+33° in OKLCH**, measured
 * on `purple-60` vs `blue-60`. The relationship is IBM's; only the starting hue
 * is the user's. Same technique as `chartPalette`.
 */
const CARBON_VISITED_HUE_OFFSET = 33

const CARBON_FAMILY: Record<string, string> = {
  blue: 'accent',
  red: 'error',
  green: 'success',
  yellow: 'warning',
  orange: 'warning',
}

/**
 * Carbon uses BLUE for two different jobs — the brand (`interactive`,
 * `linkPrimary`, `focus`) and the informational status (`supportInfo`) — because
 * IBM's brand IS blue. Escala separates `accent` from `info`, so the split has
 * to be made explicit or every "info" token comes out brand-coloured.
 */
const carbonFamilyFor = (token: string, ibmFamily: string): string =>
  ibmFamily === 'blue' && token.startsWith('support-info') ? 'info' : CARBON_FAMILY[ibmFamily]

/** Which UI group a Carbon token belongs to, longest prefix first. */
const CARBON_GROUP_RULES: [RegExp, string][] = [
  [/^layer|^background/, 'layer'],
  [/^field/, 'field'],
  [/^border/, 'border'],
  [/^text/, 'text'],
  [/^icon/, 'icon'],
  [/^link/, 'link'],
  [/^support/, 'support'],
  [/^focus|^interactive|^highlight/, 'interactive'],
]
const CARBON_FALLBACK_GROUP = 'utility'

const carbonGroupOf = (token: string): string =>
  CARBON_GROUP_RULES.find(([re]) => re.test(token))?.[1] ?? CARBON_FALLBACK_GROUP

/** Group order and copy for the table. */
export const CARBON_GROUP_META: Record<string, [string, string]> = {
  layer: ['Layer', 'The page and the three nesting depths — the layer model'],
  field: ['Field', 'Input surfaces, one per depth'],
  text: ['Text', 'Foreground ink'],
  icon: ['Icon', 'Icon ink — mirrors Text'],
  border: ['Border', 'Subtle (per depth), strong (control boundaries) and interactive'],
  link: ['Link', 'Links, including the inverse and visited variants'],
  interactive: ['Interactive', 'Brand fill, focus and highlight'],
  support: ['Support', "Carbon's status family, plus its inverse pairs"],
  utility: ['Utility', 'Overlay, skeleton and toggle'],
}
const CARBON_GROUP_ORDER = Object.keys(CARBON_GROUP_META)

type CarbonRow = { group: string; key: string; refs: Record<CarbonMode, string> }

const perMode = (fn: (m: CarbonMode) => string): Record<CarbonMode, string> =>
  Object.fromEntries(CARBON_MODES.map((m) => [m, fn(m)])) as Record<CarbonMode, string>

/**
 * One Carbon token, in one theme, as an Escala ref.
 *
 * `white`/`black` are not palette stops — they are the ends of the ladder — so
 * they resolve to whichever ramp end sits AWAY FROM THE PAGE in that
 * appearance. That is what Carbon means by them: `textOnColor: white` in the
 * white theme and `focus: white` in g100 are both "the extreme, opposite the
 * surface".
 */
function carbonRef(mode: CarbonMode, token: string, ref: { family: string; stop: number }): string {
  const kind = CARBON_MODE_KIND[mode]
  const neutral = kind === 'dark' ? 'neutral-dark' : 'neutral'
  const inverse = isCarbonInverseToken(token)

  // Solved inks resolve against the token they have to be legible on, which
  // means resolving THAT token first. One level deep, and the target is always
  // a plain ref — no cycle is possible.
  const inkTarget = CARBON_SOLVED_INK[token]
  if (inkTarget) {
    const fill = carbonRef(mode, inkTarget, CARBON_TOKENS[mode][inkTarget])
    return `{on:${fill.slice(1, -1)}}`
  }

  const floor = CARBON_MIN_TONE[token]?.[kind]
  const atLeast = (t: number) => (floor === undefined ? t : Math.max(t, floor))

  // `white`/`black` are ladder ENDS, not stops: whichever extreme sits away
  // from the surface in this appearance.
  if (ref.family === 'white') return `{${neutral}.${atLeast(kind === 'dark' ? 12 : 1)}}`
  if (ref.family === 'black') return `{${neutral}.${atLeast(kind === 'dark' ? 1 : 12)}}`

  if (ref.family === 'gray' || ref.family === 'coolGray' || ref.family === 'warmGray') {
    return `{${neutral}.${atLeast(CARBON_NEUTRAL_TONE[kind][ref.stop])}}`
  }

  const anchor = CARBON_FAMILY_ANCHOR[ref.family]
  if (anchor === undefined) throw new Error(`carbon: no anchor for family "${ref.family}"`)
  const offset = CARBON_STOP_LADDER.indexOf(ref.stop) - CARBON_STOP_LADDER.indexOf(anchor)
  const clamped = Math.max(-4, Math.min(4, offset))
  const ladder = inverse ? CARBON_CHROMA_TONE_INVERSE : CARBON_CHROMA_TONE
  const tone = atLeast(ladder[kind][clamped])

  if (ref.family === 'purple') return `{visited.${tone}}`

  const family = carbonFamilyFor(token, ref.family)
  if (!family) throw new Error(`carbon: no Escala family for "${ref.family}"`)
  // The anchor stop IS the brand solid, and `{fam.solid}` is the SOLVED solid —
  // the tone that actually clears contrast on this user's ramp, not a fixed 9.
  // An INVERSE token never takes it: `solid` is solved against the appearance's
  // own page, which is the opposite of the surface an inverse token sits on.
  return tone === 9 && !inverse ? `{${family}.solid}` : `{${family}.${tone}}`
}

/**
 * Carbon's token set, resolved against the user's ramps.
 *
 * Token KEYS are Carbon's own, kebab-cased for export (`layer-01`,
 * `border-subtle-00`, `text-primary`) so a Carbon codebase can consume the
 * output without a rename step — which is the whole point of shipping an
 * architecture rather than an approximation of one.
 */
function carbonRows(): CarbonRow[] {
  const names = Object.keys(CARBON_TOKENS[CARBON_MODES[0]]).sort()
  const rows = names.map((key) => ({
    group: carbonGroupOf(key),
    key,
    refs: perMode((m) => carbonRef(m, key, CARBON_TOKENS[m][key])),
  }))
  // Group order is the table's, not the alphabet's; within a group Carbon's
  // own names sort sensibly (`layer-01` before `layer-02`, `border-subtle-00`
  // before `border-subtle-01`).
  return rows.sort((a, b) =>
    CARBON_GROUP_ORDER.indexOf(a.group) - CARBON_GROUP_ORDER.indexOf(b.group) ||
    a.key.localeCompare(b.key))
}

/** Carbon resolved across its four themes: group → token → mode → ref. */
export function projectCarbon(
  input: ProjectionInput,
): Record<string, Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, Record<string, string>>> = {}
  const lookByMode = Object.fromEntries(
    CARBON_MODES.map((m) => [m, scaleLookup(input.scales, undefined, CARBON_MODE_KIND[m])]),
  ) as Record<CarbonMode, Look>

  for (const mode of CARBON_MODES) {
    const look = lookByMode[mode]
    for (const row of carbonRows()) {
      const resolved = curatedRefs(
        [{ group: row.group, key: row.key, light: row.refs[mode], dark: row.refs[mode] }],
        CARBON_MODE_KIND[mode],
        look,
        input.accent,
      )[0]
      out[row.group] ??= {}
      out[row.group][row.key] ??= {}
      out[row.group][row.key][mode] = resolved.ref
    }
  }
  return out
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
): (fam: string, tone: number) => string | undefined {
  const darkTwin = (fam: 'brand' | 'error' | 'warning' | 'success' | 'info') =>
    kind === 'dark' ? scales.dark?.[fam] : undefined
  const fams: Record<string, Record<number, string> | undefined> = {
    neutral: palette?.gray ?? scales.gray,
    'neutral-dark': palette?.gray ?? (scales.grayDark ?? scales.gray),
    accent: palette?.brand ?? darkTwin('brand') ?? scales.brand,
    error: palette?.error ?? darkTwin('error') ?? scales.error,
    warning: palette?.warning ?? darkTwin('warning') ?? scales.warning,
    success: palette?.success ?? darkTwin('success') ?? scales.success,
    info: palette?.info ?? darkTwin('info') ?? scales.info,
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
        // OWN default moved onto that value (e.g. Astryx's `border.default`,
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
      Object.fromEntries(themeOrder.map((t) => [t, scaleLookup(input.scales, input.themePalettes[t], input.themeKinds[t] ?? 'light')]))
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

  if (kind === 'carbon') {
    // Carbon ships its OWN four modes, so `themeOrder` is ignored the same way
    // Vibrancy and Tonal ignore it — adding a theme cannot extend a contract
    // whose modes are part of the contract.
    const tokens = projectCarbon(input)
    const lookByMode: Record<string, (fam: string, tone: number) => string | undefined> =
      Object.fromEntries(CARBON_MODES.map((m) => [m, scaleLookup(input.scales, undefined, CARBON_MODE_KIND[m])]))
    // Group copy comes from CARBON_GROUP_META — the same table `carbonRows`
    // orders by, so a group can never appear in the projection without a label.
    const categories = Object.entries(tokens).map(([key, group]) => ({
      key,
      label: CARBON_GROUP_META[key]?.[0] ?? key,
      description: CARBON_GROUP_META[key]?.[1] ?? '',
      tokens: Object.entries(group).map(([k, byMode]) => ({
        key: k,
        modes: Object.fromEntries(
          CARBON_MODES.map((m) => [m, refToView(byMode[m] ?? '', lookByMode[m])]),
        ),
      })),
    }))
    const edited = applyOverrides(categories, overrides, lookByMode)
    return { categories: edited, total: edited.reduce((n, c) => n + c.tokens.length, 0), modeKeys: [...CARBON_MODES] }
  }

  if (kind === 'astryx') {
    const tokens = projectAstryx(input, themeOrder)
    // Same per-theme resolution as Categorical — each theme's refs resolve
    // against ITS OWN palette, not one shared lookup.
    const lookByTheme: Record<string, (fam: string, tone: number) => string | undefined> =
      Object.fromEntries(themeOrder.map((t) => [t, scaleLookup(input.scales, input.themePalettes[t], input.themeKinds[t] ?? 'light')]))
    const META: Record<string, [string, string]> = {
      accent: ['Accent', 'The brand color and its on-fill ink'],
      background: ['Background', 'Page canvas through elevated surfaces'],
      text: ['Text', 'Foreground ink — primary to disabled'],
      icon: ['Icon', 'Icon ink — mirrors Text one step lighter'],
      status: ['Status', 'Feedback fg/bg/on triads per severity'],
      utility: ['Utility', 'Overlays, skeletons, tracks and polarity inks'],
      border: ['Border', 'Strokes — default, emphasized and the control boundary'],
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
    const edited = applyOverrides(categories, overrides, lookByTheme)
    return { categories: edited, total: edited.reduce((n, c) => n + c.tokens.length, 0), modeKeys: themeOrder }
  }

  if (kind === 'shadcn') {
    const tokens = projectShadcn(input, themeOrder)
    // Same per-theme resolution as Categorical/Astryx — each theme's refs
    // resolve against ITS OWN palette, not one shared lookup.
    const lookByTheme: Record<string, (fam: string, tone: number) => string | undefined> =
      Object.fromEntries(themeOrder.map((t) => [t, scaleLookup(input.scales, input.themePalettes[t], input.themeKinds[t] ?? 'light')]))
    const META: Record<string, [string, string]> = {
      base: ['Base', 'Page background and default foreground ink'],
      card: ['Card', 'The default raised panel'],
      popover: ['Popover', 'Floating surfaces — menus, dropdowns, tooltips'],
      primary: ['Primary', 'The brand action color and its on-fill ink'],
      secondary: ['Secondary', 'A lower-emphasis fill — secondary buttons, chips'],
      muted: ['Muted', 'Subtle backgrounds — disabled states, quiet panels'],
      accent: ['Accent', 'Subtle interactive-hover tint (not the brand color)'],
      chart: ['Chart', 'Categorical series colours — CVD-verified'],
      destructive: ['Destructive', 'The severity color for dangerous actions'],
      border: ['Border', 'Strokes, inputs and focus rings'],
      sidebar: ['Sidebar', 'A parallel surface set for nav rails/dashboards'],
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
    const edited = applyOverrides(categories, overrides, lookByTheme)
    return { categories: edited, total: edited.reduce((n, c) => n + c.tokens.length, 0), modeKeys: themeOrder }
  }

  if (kind === 'vibrancy') {
    const v = projectVibrancy(input)
    const look = scaleLookup(input.scales)
    // The HIG grouping is strictly labels · backgrounds · fills · separators ·
    // materials. Fallbacks aren't a group of their own — each label carries its
    // opaque alias as metadata (rendered as a badge on the row). `tint` stays
    // export-only.
    const labelTokens = pairViews(Object.keys(v.light.labels), v.light.labels, v.dark.labels, look).map((t) => {
      const fbL = v.light.labelFallbacks[t.key]
      const fbD = v.dark.labelFallbacks[t.key]
      return fbL && fbD
        ? { ...t, fallback: { light: refToView(fbL, look), dark: refToView(fbD, look) } }
        : t
    })
    const categories: ArchCategoryView[] = [
      { key: 'labels', label: 'Labels', description: 'One ink, hierarchy through opacity (100/60/30/18) — each text label carries its opaque WCAG fallback', tokens: labelTokens },
      { key: 'backgrounds', label: 'Backgrounds', description: 'System background stack — opaque by design', tokens: pairViews(Object.keys(v.light.backgrounds), v.light.backgrounds, v.dark.backgrounds, look) },
      { key: 'fills', label: 'Fills', description: 'Thin control washes over any content', tokens: pairViews(Object.keys(v.light.fills), v.light.fills, v.dark.fills, look) },
      { key: 'separators', label: 'Separators', description: 'Hairlines — alpha default + opaque twin', tokens: pairViews(Object.keys(v.light.separators), v.light.separators, v.dark.separators, look) },
      { key: 'materials', label: 'Materials', description: 'Translucent panels — pair with backdrop blur', tokens: pairViews(Object.keys(v.light.materials), v.light.materials, v.dark.materials, look) },
    ]
    const edited = applyOverrides(categories, overrides, look)
    // Fixed light/dark by construction — Vibrancy's math has no per-theme
    // concept, so adding a theme doesn't add a column here (see modeKeys doc).
    return { categories: edited, total: edited.reduce((n, c) => n + c.tokens.length, 0), modeKeys: ['light', 'dark'] }
  }

  // tonal
  const { palettes, scheme } = projectTonal(input, errorSeed)
  const look = (fam: string, tone: number) => palettes[fam]?.[tone]
  const META: Record<string, [string, string]> = {
    core: ['Core', 'Primary roles + paired on-colors'],
    secondary: ['Secondary', 'Muted companion palette (chroma ÷3)'],
    tertiary: ['Tertiary', 'Contrast accent (hue +60°)'],
    error: ['Error', 'Error roles + paired on-colors'],
    surfaces: ['Surfaces', 'Neutral surface stack + containers'],
    outlines: ['Outlines', 'Borders on the neutral-variant palette'],
  }
  const categories = Object.entries(scheme).map(([key, group]) => ({
    key,
    label: META[key]?.[0] ?? key,
    description: META[key]?.[1] ?? '',
    tokens: Object.entries(group).map(([k, v]) => ({
      key: k,
      modes: { light: refToView(v.light, look), dark: refToView(v.dark, look) },
    })),
  }))
  const editedTonal = applyOverrides(categories, overrides, look)
  // Fixed light/dark by construction — Tonal's dark is a tone-inversion of the
  // one accent (40↔80, 90↔30…), with no per-theme concept to extend either.
  return { categories: editedTonal, total: editedTonal.reduce((n, c) => n + c.tokens.length, 0), modeKeys: ['light', 'dark'] }
}

// ── Export dispatcher ────────────────────────────────────────────────────────

/**
 * Export-only: resolves every plain `{family.tone}` ref in a CURATED
 * projection (Astryx/shadcn/Categorical) into this THEME's actual hex, using
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
      [t, scaleLookup(input.scales, input.themePalettes[t], input.themeKinds[t] ?? 'light')]))
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
    case 'astryx': {
      const tokens = projectAstryx(input, themeOrder)
      applyArchTokenOverrides(tokens, overrides)
      return { kind, tokens: resolveCuratedForExport(tokens, input, themeOrder) }
    }
    case 'shadcn': {
      const tokens = projectShadcn(input, themeOrder)
      applyArchTokenOverrides(tokens, overrides)
      return { kind, tokens: resolveCuratedForExport(tokens, input, themeOrder) }
    }
    case 'carbon': {
      const tokens = projectCarbon(input)
      applyArchTokenOverrides(tokens, overrides)
      return { kind, tokens }
    }
    case 'vibrancy':
      return { kind, tokens: projectVibrancy(input) }
    case 'tonal':
      return { kind, ...projectTonal(input, errorSeed) }
    default:
      return null
  }
}
