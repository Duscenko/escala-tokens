import chroma from 'chroma-js'
// The contrast formulas live in ONE place. `colorUtils` owns ramp construction;
// `color/apca` owns the metrics. Do not reintroduce `chroma.contrast` here.
import { wcagRatio, apcaLc } from './color/apca'
// Every EMITTED hex goes through gamut mapping. `chroma.oklch(...).hex()` clips
// per channel, which shifts hue (measured: up to 10°) and lightness (up to 0.06)
// for out-of-gamut steps — see docs/color/P0-BASELINE.md, defect H6.
import { oklchToHex, hexToOklch, maxChromaSrgb, srgbCusp } from './color/gamut'

// ── Color-scale algorithms ───────────────────────────────────────────────────
// Each algorithm builds a 12-tone ramp (light → dark) in OKLCH following the
// Radix Colors taxonomy: 1–2 backgrounds · 3–5 interactive fills · 6–8 borders
// · 9–10 solid fills · 11–12 text. The base color anchors tone 9 (the solid),
// and the light run (1–8) eases toward white so backgrounds and borders stay
// pastel — that's what keeps borders soft. The dark run (10–12) eases in so 10
// reads as the solid's hover and 11–12 reach text-grade darkness. Lightness is
// interpolated in two monotonic halves so the ramp never reverses around the
// anchor regardless of the base color's own lightness. `contrastShift`
// (≈ −1…+1) widens (or narrows) the lightness range — more tone separation.

export type ColorAlgorithm =
  | 'default'
  | 'tailwind'
  | 'radix'
  | 'ant'
  | 'lightness'
  | 'saturation'
  | 'hueShift'
  | 'monochromatic'
  | 'analogous'
  | 'complementary'

type AlgoSpec = {
  label: string
  lightL: number // target OKLCH lightness at tone 1
  darkL: number // target OKLCH lightness at tone 12
  lightCmul: number // chroma multiplier at the light extreme
  darkCmul: number // chroma multiplier at the dark extreme
  /** Hue offset by position: frac −1 (lightest) … 0 (base) … +1 (darkest). */
  hueShift?: (frac: number) => number
}

const TONES = 12
/** Tone pinned to the base color exactly — the Radix "solid" step. */
export const BASE_TONE = 9

/**
 * Which END of the ramp the page background anchors. Both appearances keep the
 * same 1→12 light-to-dark orientation; they differ only in which extreme grows
 * out of the page. See `buildScale` for the full rationale.
 */
export type ScaleAppearance = 'light' | 'dark'

/**
 * What a colour the user hands us actually IS, so the generator knows how to
 * build from it rather than assuming light-mode solid:
 *
 *  · 'light' — the light-theme solid (step 9 of the light ramp). Dark derived.
 *  · 'dark'  — the dark-theme solid. The light ramp is derived from it instead.
 *  · 'alpha' — a translucent value, not a solid. It's composited over the page
 *              first to recover the solid it renders as, then treated normally.
 */
export type SeedKind = 'light' | 'dark' | 'alpha'

/**
 * Best guess at what a pasted colour is, used to preselect the choice rather
 * than assume. An 8-digit hex carrying real transparency is an alpha value; a
 * hex darker than the midpoint between the two pages reads as a dark-theme
 * value; otherwise light.
 */
export function detectSeedKind(hex: string, _lightBg = '#ffffff', darkBg = '#111111'): SeedKind {
  try {
    const c = chroma(hex)
    if (c.alpha() < 0.99) return 'alpha'
    const l = c.oklch()[0]
    // Only a value sitting NEAR the dark page reads as a dark-theme seed. The
    // midpoint between the two pages is far too eager — a brand solid is
    // mid-lightness by nature (#7f56d9 is L .52) and would be misread as dark.
    return l < chroma(darkBg).oklch()[0] + 0.18 ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** The solid a seed represents, resolving an alpha value against its page. */
export function solidFromSeed(hex: string, kind: SeedKind, lightBg: string, darkBg: string): string {
  if (kind !== 'alpha') return hex
  try {
    const c = chroma(hex)
    // Composite over whichever page the overlay was sampled against.
    const page = c.oklch()[0] < 0.5 ? darkBg : lightBg
    return compositeOver(hex, page)
  } catch {
    return hex
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

// ── Radix role model ─────────────────────────────────────────────────────────
// Radix scales are ordered by ROLE, not by lightness. Every step has a fixed
// job and the colour is tuned to satisfy it — which is why a scale is never a
// linear white→base→black sweep:
//
//   1–2   app background        (near-page, hue kept, chroma a whisper)
//   3–5   component background  (normal / hover / active)
//   6–8   border               (subtle / normal / hover)
//   9     SOLID — the base hex, verbatim. The one hard value.
//   10    solid hover          (a step further from the page than 9)
//   11    low-contrast text    (≈4.5:1 on the page — WCAG AA)
//   12    high-contrast text   (near-max contrast)
//
// The two appearances are mirror images: light runs page(light)→base→dark text,
// dark runs page(dark)→base→light text. Both keep step numbers meaning the same
// thing, so a semantic role reads the SAME step in either theme and simply gets
// the value tuned for that page.
export const STEP_ROLES: string[] = [
  'App background', 'Subtle background',
  'Component background', 'Component hover', 'Component active',
  'Subtle border', 'Border', 'Border hover',
  'Solid', 'Solid hover',
  'Low-contrast text', 'High-contrast text',
]

// How far each of steps 1–8 sits between the page and the solid. Front-loaded
// so 1–2 hug the page (backgrounds must read as "the page, tinted") and the
// border band 6–8 lands mid-way rather than nearly at the solid.
const BG_WEIGHTS = [0, 0.03, 0.08, 0.16, 0.25, 0.35, 0.49, 0.63, 0.79]

/**
 * The contrast a text step must achieve, in BOTH metrics.
 *
 * WCAG 2.x is the compliance floor — it is what an accessibility audit checks,
 * and it is not negotiable. APCA `Lc` is the perceptual floor — it is what a
 * reader actually experiences, and it is the one WCAG gets wrong on dark pages.
 * A step must clear both; whichever binds first is the one that shapes it.
 */
export type TextContrastTarget = { wcag: number; apcaLc: number }

/**
 * Lightness (OKLCH) whose EMITTED hex hits `target` against `bg`, searched in
 * the direction that moves AWAY from the page: darker for a light theme,
 * lighter for a dark one. Steps 11–12 are defined by their contrast, not by an
 * arbitrary lightness offset — that's what makes text legible on a tinted or
 * near-black page instead of only on pure white.
 *
 * The predicate is evaluated on the gamut-mapped 8-bit hex, i.e. on the value
 * that actually ships. This used to be a continuous-precision WCAG search
 * followed by a separate quantisation guard loop, because a float that cleared
 * 4.50 could round to a hex at 4.49. Measuring what we emit removes the whole
 * class of problem and the guard loop with it — quantisation makes the
 * predicate a step function, which bisection handles perfectly well.
 */
function lightnessForContrast(
  target: TextContrastTarget,
  hue: number,
  chromaC: number,
  bg: string,
  towardDark: boolean,
): string {
  const meets = (hex: string) =>
    wcagRatio(hex, bg) >= target.wcag && Math.abs(apcaLc(hex, bg)) >= target.apcaLc

  const bgL = chroma(bg).oklch()[0]
  let lo = towardDark ? 0 : bgL
  let hi = towardDark ? bgL : 1
  // Seed with the extreme — the most contrast this hue and chroma can deliver.
  // If even that misses the target (a pale hue on a pale page), the search
  // clamps here rather than returning something arbitrary.
  let best = oklchToHex(towardDark ? 0 : 1, chromaC, hue)
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const hex = oklchToHex(mid, chromaC, hue)
    if (meets(hex)) {
      best = hex
      // Enough contrast — ease back toward the page for the subtler value.
      if (towardDark) lo = mid
      else hi = mid
    } else if (towardDark) hi = mid
    else lo = mid
  }
  return best
}

function buildScale(
  baseHex: string,
  spec: AlgoSpec,
  shift: number,
  background?: string,
  appearance: ScaleAppearance = 'light',
  tint: NeutralTint = DEFAULT_NEUTRAL_TINT,
): string[] {
  const [baseL, baseC, baseHraw] = chroma(baseHex).oklch()
  const baseH = Number.isNaN(baseHraw) ? 0 : baseHraw
  // See NEUTRAL_TINTS.chromaLink. 0 for pure/subtle — and 0 makes the blend
  // below collapse to the original expression exactly, so the default value of
  // this parameter is also its no-op value: a call site that never learns about
  // tints keeps rendering what it rendered before.
  const chromaLink = neutralTintSpec(tint).chromaLink

  // The page this ramp is built to sit on. Steps 1–8 grow OUT of it and steps
  // 11–12 are contrast-tuned AGAINST it, so it anchors both ends of the scale.
  const fallbackBg = appearance === 'dark' ? '#111111' : '#ffffff'
  let page = fallbackBg
  if (background) {
    try {
      const bgL = chroma(background).oklch()[0]
      // Ignore a page that contradicts the appearance (a white "dark" page).
      if (appearance === 'dark' ? bgL <= 0.5 : bgL > 0.5) page = chroma(background).hex()
    } catch { /* invalid background — keep the fallback */ }
  }
  const pageL = chroma(page).oklch()[0]
  const pageC = chroma(page).oklch()[1]
  // Light themes put text BELOW the page in lightness; dark themes above it.
  const towardDark = appearance === 'light'
  const dir = towardDark ? -1 : 1

  // ── Contrast shift ────────────────────────────────────────────────────────
  // `shift` (−1…1) reshapes how far the ramp travels from the page. It used to
  // touch ONLY steps 10–12, leaving steps 1–8 — two thirds of the scale, and
  // every background/fill/border in it — provably invariant, which is why the
  // control read as doing nothing.
  //
  // Steps 2–8 now apply it as a GAMMA on the page→solid interpolation
  // parameter: w' = w ** gamma. That's the right shape for this because it
  // preserves both endpoints by construction (0**g = 0, 1**g = 1), stays
  // monotonic in both w and shift, and needs no clamping — so step 1 is still
  // the page verbatim and step 8 can never overshoot the solid.
  //   shift > 0 → gamma < 1 → w' > w → steps sit further from the page (more
  //   contrast); shift < 0 → the reverse.
  //
  // Every coefficient below is chosen so shift = 0 is an exact no-op: gamma
  // becomes 1 and each target keeps its original constant, so existing systems
  // regenerate byte-identical ramps.
  const gamma = 1 - shift * 0.35

  const out: string[] = []
  for (let i = 1; i <= TONES; i++) {
    // ── 9: the solid. The base hex verbatim — the one hard value in the scale.
    if (i === BASE_TONE) { out.push(chroma(baseHex).hex()); continue }

    // ── 1–8: backgrounds, component fills and borders. Interpolate from the
    // page toward the solid, keeping the hue and letting chroma climb from a
    // whisper (1–2 must read as the page, tinted) to nearly the solid at 8.
    if (i < BASE_TONE) {
      // Step 1 IS the app background — the page hex verbatim, so a brand
      // background like #111522 round-trips into --neutral-1 exactly.
      if (i === 1) { out.push(page); continue }
      // Chroma and hue read the SHIFTED position too, not the raw weight — a
      // step that moved closer to the solid in lightness should carry more of
      // its colour, or the ramp desaturates as contrast climbs.
      const w = Math.pow(BG_WEIGHTS[i], gamma)
      const L = pageL + (baseL - pageL) * w
      // `lightCmul` keeps each algorithm's feel at the page end: Radix wants
      // almost no chroma in 1–2, saturation-led ramps want more.
      const shapedC = baseC * (spec.lightCmul * 0.25 + (1 - spec.lightCmul * 0.25) * Math.pow(w, 1.15))
      // The page-continuous alternative: start at the page's OWN chroma and
      // lerp to the base's, so step 2 picks up where step 1 (the page, emitted
      // verbatim) left off instead of dropping to gray. Uses the same weight
      // the lightness lerp above already uses, so the two travel together.
      // When the page and the base carry equal chroma — which is what `vivid`
      // produces once the anchor is floored to the page — this is CONSTANT
      // across 1–8: one tint, lightness climbing, no band reading as a
      // different family.
      const linkedC = pageC + (baseC - pageC) * Math.pow(w, 1.15)
      const C = shapedC + (linkedC - shapedC) * chromaLink
      const H = baseH + (spec.hueShift?.(-(1 - w)) ?? 0)
      out.push(oklchToHex(clamp01(L), Math.max(0, C), H))
      continue
    }

    // ── 10: solid hover — one step further from the page than the solid.
    if (i === BASE_TONE + 1) {
      // Gain is 0.6, not 1: at the old full gain a shift of −1 drove `step` to
      // exactly 0, collapsing the hover tone onto the solid it's supposed to
      // be distinguishable from. Capped this way it stays a real step (0.018
      // at the floor) across the whole slider.
      const step = 0.045 * (1 + shift * 0.6)
      const H = baseH + (spec.hueShift?.(0.2) ?? 0)
      out.push(oklchToHex(clamp01(baseL + dir * step), baseC * spec.darkCmul, H))
      continue
    }

    // ── 11–12: text, defined by CONTRAST rather than a lightness offset, so it
    // stays legible on a tinted or near-black page instead of only on white.
    //
    // Each step carries a WCAG target AND an APCA target, and must clear both.
    // Step 11 used to target WCAG 4.5 alone — and landed there to two decimals,
    // which is exactly the problem: on a dark page 4.50:1 is around Lc 32,
    // less than half the Lc 75 that body copy needs. Every semantic role that
    // points at ".11" inherited that. (docs/color/IMPLEMENTATION-LOG.md, H5.)
    //
    //   11 → WCAG 4.5 (AA) + Lc 75 (APCA body text)
    //   12 → WCAG 12 (near-max) + Lc 90 (APCA preferred body text)
    //
    // The gain is ASYMMETRIC on purpose. Dialing contrast UP should be able to
    // reach AAA, but dialing it DOWN must not quietly ship unreadable text, so
    // the negative side is much gentler. The APCA target is additionally
    // FLOORED, so no slider position can take step 11 below large-text grade
    // (Lc 60) or step 12 below body-text grade (Lc 75) — a WCAG-only slider had
    // no way to express that, because 3.5:1 sounds survivable and Lc 20 is not.
    const isMaxTone = i === TONES
    const textGain = shift >= 0 ? (isMaxTone ? 0.18 : 0.45) : (isMaxTone ? 0.15 : 0.22)
    const gain = 1 + shift * textGain
    const target: TextContrastTarget = isMaxTone
      ? { wcag: 12 * gain, apcaLc: Math.max(75, 90 * gain) }
      : { wcag: 4.5 * gain, apcaLc: Math.max(60, 75 * gain) }
    const C = baseC * (i === TONES ? 0.42 : 0.72)
    const H = baseH + (spec.hueShift?.(i === TONES ? 1 : 0.6) ?? 0)
    out.push(lightnessForContrast(target, H, Math.max(0, C), page, towardDark))
  }
  return out
}

const SPECS: Record<ColorAlgorithm, AlgoSpec> = {
  // Legacy / neutral lightness ramp — the default feel.
  default:       { label: 'Lightness Scale', lightL: 0.97, darkL: 0.20, lightCmul: 0.35, darkCmul: 0.90 },
  lightness:     { label: 'Lightness Scale', lightL: 0.97, darkL: 0.20, lightCmul: 0.35, darkCmul: 0.90 },
  monochromatic: { label: 'Monochromatic',   lightL: 0.97, darkL: 0.20, lightCmul: 0.45, darkCmul: 0.95 },
  // System-flavored ramps — distinct light/dark extremes + chroma feel.
  tailwind:      { label: 'Tailwind CSS',    lightL: 0.97, darkL: 0.18, lightCmul: 0.40, darkCmul: 1.00 },
  // Radix's light steps 1–2 are near-white with almost no chroma (app/subtle
  // backgrounds) — hence the very low light-end chroma multiplier.
  radix:         { label: 'Radix UI',        lightL: 0.995, darkL: 0.24, lightCmul: 0.04, darkCmul: 0.85 },
  ant:           { label: 'Ant Design',      lightL: 0.96, darkL: 0.20, lightCmul: 0.45, darkCmul: 0.95 },
  // Chroma fans wide from pale tints to saturated shades.
  saturation:    { label: 'Saturation Scale', lightL: 0.92, darkL: 0.30, lightCmul: 0.15, darkCmul: 1.45 },
  // Hue-relationship variants.
  hueShift:      { label: 'Hue Shift Scale', lightL: 0.97, darkL: 0.20, lightCmul: 0.35, darkCmul: 0.90, hueShift: (f) => f * 25 },
  analogous:     { label: 'Analogous',       lightL: 0.97, darkL: 0.20, lightCmul: 0.40, darkCmul: 0.95, hueShift: (f) => f * 30 },
  // Tints rotate toward the complement; shades hold the base hue.
  complementary: { label: 'Complementary',   lightL: 0.97, darkL: 0.20, lightCmul: 0.40, darkCmul: 0.95, hueShift: (f) => (f < 0 ? -f * 180 : 0) },
}

export const ALGORITHM_OPTIONS: { key: ColorAlgorithm; label: string }[] = (
  ['radix', 'lightness', 'tailwind', 'ant', 'saturation', 'hueShift', 'monochromatic', 'analogous', 'complementary'] as ColorAlgorithm[]
).map((key) => ({ key, label: SPECS[key].label }))

// The recommended (default) algorithm — surfaced with a badge in the UI.
export const RECOMMENDED_ALGORITHM: ColorAlgorithm = 'radix'

// ── Token naming schemes ─────────────────────────────────────────────────────
// How the 12 primitive tones are named in the export (tokens.json / CSS / README).
// On-screen swatch labels stay positional (1–12); this only renames the output.
export type ColorNaming = 'numeric' | 'hundreds' | 'tens'

export const NAMING_SCHEMES: { key: ColorNaming; label: string; labels: string[] }[] = [
  { key: 'numeric',  label: '1, 2, 3…',     labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
  // Canonical Untitled-UI / Tailwind ramp: 25 (lightest) … 950 (darkest). The
  // semantic catalogue's tone→label mapping is built against this (tone 11 = 900,
  // tone 12 = 950), so exported references read gray.900 / gray.950 etc.
  { key: 'hundreds', label: '25, 50, 100…', labels: ['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] },
  { key: 'tens',     label: '10, 20, 30…',  labels: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110', '120'] },
]

/** Exported name for a 1-based tone under the active naming scheme. */
export function toneLabel(naming: ColorNaming, tone: number): string {
  const scheme = NAMING_SCHEMES.find((s) => s.key === naming) ?? NAMING_SCHEMES[0]
  return scheme.labels[tone - 1] ?? String(tone)
}

export function generateColorScale(
  baseHex: string,
  algorithm: ColorAlgorithm = 'default',
  contrastShift = 0,
  background?: string,
  appearance: ScaleAppearance = 'light',
  /** Only affects steps 2–8's chroma continuity (see NEUTRAL_TINTS.chromaLink).
   *  Defaults to the no-op level, so omitting it is safe — it just means "keep
   *  the Radix curve", which is right for every ramp that isn't grown on a
   *  deliberately coloured page. */
  tint: NeutralTint = DEFAULT_NEUTRAL_TINT,
): Record<number, string> {
  const spec = SPECS[algorithm] ?? SPECS.default
  const colors = buildScale(baseHex, spec, contrastShift, background, appearance, tint)
  const scale: Record<number, string> = {}
  colors.forEach((color, i) => {
    scale[i + 1] = color
  })
  return scale
}

/**
 * The page background DERIVED from the base neutral — HeroUI's model: you pick
 * one base and the surfaces every element sits on are computed from it, instead
 * of the page being a second, independent choice that can drift out of step
 * with the ramps grown against it.
 *
 * It keeps the base's hue and a trace of its chroma, so the page carries the
 * same tint as the neutral ramp. Light lands just under pure white; dark lands
 * at L 0.17 — the same lightness `generateDarkColorScale` assumes when no dark
 * page is given, so the derived page and its ramp agree by construction.
 */
// ── How much of the Neutral's colour survives into the page ─────────────────
// The page is DERIVED from the Neutral (`backgroundFromBase`), and the derivation
// used to clamp chroma to 0.006 in light — so a deliberately vivid Neutral still
// produced a white page. Making the clamp a CHOICE is the Radix-faithful fix:
// Radix never exposes a background colour either, it ships six hue-matched grays
// (Gray · Mauve · Slate · Sage · Olive · Sand) and the page IS that gray's step 1.
// The tint level is a property of the neutral, not a second input — which is
// exactly what keeps "Base drives the page" true and page/ramp drift impossible.
//
// `l` is the page lightness, `mul`/`cap` how much of the base's chroma reaches
// it. Because tone 1 is emitted verbatim as the page, the whole neutral ramp (and
// every ramp anchored to it) inherits the tint with no second code path — and
// steps 11–12 are solved BY contrast against that page, so text self-corrects as
// the page gets more colourful.
//
// The ceiling is a TINTED PAGE, not a coloured surface: `vivid` still lands at
// L≈0.97 light / 0.215 dark — a perceptible cream/lavender that reads as paper.
// Going further (L≈0.92) would push steps 11–12 much darker and break the chrome
// tints (`bg-elevated`, active rows) that assume a near-neutral page.
export type NeutralTint = 'pure' | 'subtle' | 'tinted' | 'vivid'

export const NEUTRAL_TINTS: {
  key: NeutralTint
  label: string
  /** Radix's own gray families, as the reference point for the level. */
  hint: string
  light: { l: number; mul: number; cap: number }
  dark: { l: number; mul: number; cap: number }
  /** Saturation `neutralFromBrand` gives the linked neutral at this level. */
  brandSat: number
  /**
   * How much steps 2–8 inherit the PAGE's chroma instead of restarting from ~0.
   *
   * Radix's curve ramps chroma from almost nothing at step 2 up to the base's at
   * step 9 — correct when the page is near-neutral (its own chroma is ~0, so
   * starting there IS continuous). Once the page carries real colour that same
   * curve tears: measured on a green neutral at `vivid`, step 1 (the page) sits
   * at chroma 0.0655 and step 2 drops to 0.0025 — a 26× collapse, so the page
   * reads green and the very next surface reads gray. The lightness curve is
   * smooth right through it; the discontinuity is 100% chroma.
   *
   * 0 = today's behaviour, exactly. 1 = step 2 starts at the page's own chroma
   * and lerps to the base's, so the whole ramp stays one family. Held at 0 for
   * `pure`/`subtle` so every system that predates this renders byte-identically
   * — those two are also provably never pathological (their page multipliers,
   * 0 and 0.35, are both below the 0.5 the dark neutral's anchor uses, so their
   * page can't out-saturate the ramp it seeds).
   */
  chromaLink: number
}[] = [
  { key: 'pure',   label: 'Pure',   hint: 'Radix Gray — no hue at all',
    light: { l: 0.995, mul: 0, cap: 0 },         dark: { l: 0.17,  mul: 0, cap: 0 },        brandSat: 0,    chromaLink: 0 },
  { key: 'subtle', label: 'Subtle', hint: 'Radix Mauve / Slate — a whisper of the hue',
    light: { l: 0.995, mul: 0.12, cap: 0.006 },  dark: { l: 0.17,  mul: 0.35, cap: 0.022 }, brandSat: 0.08, chromaLink: 0 },
  { key: 'tinted', label: 'Tinted', hint: 'Radix Sage / Sand — visibly warm or cool',
    light: { l: 0.985, mul: 0.35, cap: 0.018 },  dark: { l: 0.19,  mul: 0.60, cap: 0.040 }, brandSat: 0.16, chromaLink: 0.7 },
  { key: 'vivid',  label: 'Vivid',  hint: 'Beyond Radix — a clearly coloured paper',
    light: { l: 0.972, mul: 0.70, cap: 0.042 },  dark: { l: 0.215, mul: 1.00, cap: 0.075 }, brandSat: 0.28, chromaLink: 1 },
]

export const DEFAULT_NEUTRAL_TINT: NeutralTint = 'subtle'

export function neutralTintSpec(tint: NeutralTint = DEFAULT_NEUTRAL_TINT) {
  return NEUTRAL_TINTS.find((t) => t.key === tint) ?? NEUTRAL_TINTS[1]
}

/**
 * A low-saturation neutral carrying the accent's HUE — the "linked neutral".
 * Analogous, not complementary: the greys should read as belonging to the same
 * world as the brand (Radix/HeroUI's model), which a 180° rotation would break.
 * How much hue survives is the tint's `brandSat` (0 at `pure` — a linked
 * neutral is a true grey there, by definition, not a bug).
 *
 * Lives here, not in `colorControls`, because it is pure colour math with no
 * component dependency AND the store's migration needs it to detect whether a
 * persisted neutral was hand-picked or link-derived. It used to be duplicated
 * in `tokenImport/materialize.ts` for exactly that "stay free of component
 * imports" reason — that copy is gone; there is one implementation now.
 */
export function neutralFromBrand(hex: string, tint: NeutralTint = DEFAULT_NEUTRAL_TINT): string {
  try {
    return chroma(hex).set('hsl.s', neutralTintSpec(tint).brandSat).set('hsl.l', 0.46).hex()
  } catch {
    return hex
  }
}

const NEUTRAL_CURATED_LABELS = ['Surface', 'Soft', 'Muted', 'Stone', 'Graphite', 'Deep'] as const
const NEUTRAL_CURATED_STEPS = [1, 3, 5, 7, 9, 11] as const
const NEUTRAL_CURATED_FALLBACK: { label: string; hex: string }[] = [
  { label: 'Surface', hex: '#f0f0f3' },
  { label: 'Soft', hex: '#e0e1e6' },
  { label: 'Muted', hex: '#cdced6' },
  { label: 'Stone', hex: '#8b8d98' },
  { label: 'Graphite', hex: '#80838d' },
  { label: 'Deep', hex: '#60646c' },
]

/** Vivid anchor for `neutralCuratedPalette` — hue from the picker's spectrum
 *  slider, saturation/lightness from the neutral tint spec (same target as
 *  `neutralFromBrand`). Keeps the curated bar tied to the hue the user is
 *  pointing at even when the field value is still a low-chroma grey. */
export function neutralHueAnchorFromSpectrum(
  hueDegrees: number,
  tint: NeutralTint = DEFAULT_NEUTRAL_TINT,
): string {
  try {
    const h = Number.isNaN(hueDegrees) ? 0 : hueDegrees
    return chroma.hsl(h, neutralTintSpec(tint).brandSat, 0.46).hex()
  } catch {
    return '#80838d'
  }
}

/** Six-step neutral ramp harmonized with a brand/spectrum hue — for the Curated
 *  palette bar while editing accent or neutral. Recomputes when the picker
 *  colour moves so the strip always matches what's on the spectrum. */
export function neutralCuratedPalette(
  hueSourceHex: string,
  tint: NeutralTint = DEFAULT_NEUTRAL_TINT,
  appearance: ScaleAppearance = 'light',
): { label: string; hex: string }[] {
  try {
    const anchor = neutralFromBrand(hueSourceHex, tint)
    const page = backgroundFromBase(anchor, appearance, tint)
    const scale = appearance === 'dark'
      ? generateDarkColorScale(anchor, 'radix', 0, page, tint)
      : generateColorScale(anchor, 'radix', 0, page, appearance, tint)
    return NEUTRAL_CURATED_STEPS.map((step, i) => ({
      label: NEUTRAL_CURATED_LABELS[i],
      hex: scale[step] ?? anchor,
    }))
  } catch {
    return NEUTRAL_CURATED_FALLBACK
  }
}

export function backgroundFromBase(
  baseHex: string,
  appearance: ScaleAppearance = 'light',
  // Defaults to `subtle`, whose numbers are the pre-tint constants verbatim —
  // so every existing call site and every stored system regenerates the exact
  // same page it had before this control existed.
  tint: NeutralTint = DEFAULT_NEUTRAL_TINT,
): string {
  try {
    const [, c, hRaw] = chroma(baseHex).oklch()
    const h = Number.isNaN(hRaw) ? 0 : hRaw
    const spec = neutralTintSpec(tint)[appearance === 'dark' ? 'dark' : 'light']
    return oklchToHex(spec.l, Math.min(c * spec.mul, spec.cap), h)
  } catch {
    return appearance === 'dark' ? '#0c0e12' : '#ffffff'
  }
}

/**
 * Dark-appearance ramp for a COLOURED family (brand / status / custom) — the
 * Radix model: every colour ships two scales, and the dark one is its own set
 * of values rather than the light ramp re-read. Same step meanings in both
 * (`accent-25` is the subtlest background either way), so the base stays pinned
 * at tone 9 and only the ends move: tones 10–12 grow out of `darkBackground`
 * instead of easing toward a light page.
 *
 * Why it matters: a role like `surface-brand-subtle` resolves to tone 11 in
 * dark (recDarkTone: subtle tints deepen). Read from the LIGHT ramp that's a
 * dark brand tone mixed toward white; read from this one it's the same hue
 * sitting on the actual dark page — which is what the theme renders on.
 *
 * Unlike `generateDarkColorScale` the base is NOT re-derived: a neutral needs
 * its mid-gray pulled dark or tones 9–10 read as blown-out surfaces, but a
 * brand colour must stay recognisably itself.
 */
export function generateFamilyDarkScale(
  baseHex: string,
  algorithm: ColorAlgorithm = 'default',
  contrastShift = 0,
  darkBackground?: string,
): Record<number, string> {
  return generateColorScale(baseHex, algorithm, contrastShift, darkBackground, 'dark')
}

/**
 * Dark-appearance neutral ramp — the ramp gray roles resolve from in dark
 * themes, where recDarkTone inverts the hierarchy (surface-0 → tone 12,
 * surface-1 → 11, surface-2 → 10, text-primary → 1).
 *
 * Two things make this different from just calling `generateColorScale` with a
 * dark background:
 *
 *  1. Tone 12 grows out of `darkBackground` (appearance: 'dark'), so the chosen
 *     dark page IS the dark surface.
 *  2. The ramp's BASE (tone 9) is re-derived as a *dark* neutral sitting just
 *     above the page, instead of being pinned to `neutralHex` — a mid-gray base
 *     would leave tones 9–10 (surface-3 / surface-2) as light grays, which in a
 *     dark theme read as blown-out surfaces. It keeps the neutral's hue (which
 *     itself derives from the accent), so the whole dark ramp carries the
 *     accent's tint.
 */
export function generateDarkColorScale(
  neutralHex: string,
  algorithm: ColorAlgorithm = 'default',
  contrastShift = 0,
  darkBackground?: string,
  /** The system's `neutralTint`. Omitting it keeps the pre-tint ramp exactly,
   *  so this is safe to leave off — but any call site that owns the SYSTEM's
   *  neutral must pass it, or that ramp silently keeps the washed-out curve
   *  while the page it sits on is fully tinted. */
  tint: NeutralTint = DEFAULT_NEUTRAL_TINT,
): Record<number, string> {
  let base = neutralHex
  try {
    const [, nC, nHraw] = chroma(neutralHex).oklch()
    const nH = Number.isNaN(nHraw) ? 0 : nHraw
    // Step 9 is the SOLID, so a dark neutral needs a MID gray there — steps
    // 10–12 climb to light text above it and 1–8 descend to the page below.
    // Deriving it near the page (the old behaviour) left the solid unusable
    // and squashed the whole upper half of the ramp.
    const baseL = 0.5
    // Halving the neutral's chroma was written when the page was always
    // near-neutral. On a tinted page it inverts the ramp: measured on a green
    // neutral at `vivid`, the page lands at chroma 0.075 while this anchor sat
    // at 0.039 — the PAGE became the most saturated thing in the ramp, so the
    // scale it seeds could only ever look washed-out next to it. Flooring the
    // anchor at the page's own chroma is what lets 1–9 hold one tint.
    // Provably inert for pure/subtle: their page multipliers (0 and 0.35) are
    // both below the 0.5 used here, so `max` can never pick the page there.
    const pageC = darkBackground ? chroma(darkBackground).oklch()[1] : 0
    const linked = neutralTintSpec(tint).chromaLink > 0
    const baseC = linked ? Math.max(nC * 0.5, pageC) : nC * 0.5
    base = oklchToHex(baseL, baseC, nH)
  } catch { /* invalid neutral — fall back to the raw hex */ }
  return generateColorScale(base, algorithm, contrastShift, darkBackground, 'dark', tint)
}

// ── Alpha ramps (Radix custom-palette architecture) ─────────────────────────
// Radix ships every scale twice: solid AND alpha, where each alpha step is the
// most-transparent overlay that reproduces the solid when composited over the
// page background — `solid = background×(1−α) + overlay×α`, solved for α and
// the overlay channels. Alpha tokens are therefore background-DEPENDENT: they
// only exist relative to a declared page background, which is why the
// background is a primitive input here, not a cosmetic choice.

/**
 * The translucent overlay that reproduces `targetHex` when composited over
 * `backgroundHex` — alpha compositing solved for the overlay:
 *
 *     solid = α·overlay + (1−α)·background          (per channel)
 *     α     = (solid − background) / (overlay − background)
 *
 * The overlay direction is fixed BY APPEARANCE, not per colour: a dark theme
 * layers white over its page, a light theme layers black over its page. α is the
 * MAX of the three channel solutions so no channel overshoots, then the overlay
 * is re-solved per channel at that α:
 *
 *     overlay = (solid − (1−α)·background) / α
 *
 * That last step is what preserves the tint — pure white/black at the same α
 * would wash the hue out. Step 1 of a scale IS the page, so it lands on α = 0.
 */
export function alphaColorOver(
  targetHex: string,
  backgroundHex: string,
  appearance: ScaleAppearance = 'light',
): string {
  const [tr, tg, tb] = chroma(targetHex).rgb()
  const [br, bg, bb] = chroma(backgroundHex).rgb()
  // Dark themes lighten with white; light themes darken with black.
  const overlay = appearance === 'dark' ? 255 : 0

  const alphaFor = (t: number, b: number) => (overlay === b ? 0 : (t - b) / (overlay - b))
  const raw = Math.max(alphaFor(tr, br), alphaFor(tg, bg), alphaFor(tb, bb))
  // Two decimals, rounded UP: rounding down would demand an overlay outside
  // 0–255 to hit the target, which then clamps and breaks the reconstruction.
  let a = Math.min(1, Math.max(0, Math.ceil(raw * 100) / 100))
  if (a <= 0) return chroma.rgb(overlay, overlay, overlay).alpha(0).hex()

  const exact = (t: number, b: number, alpha: number) => (t - (1 - alpha) * b) / alpha
  const channels: [number, number][] = [[tr, br], [tg, bg], [tb, bb]]
  // A channel sitting on the far side of the page from the overlay (a solid
  // whose blue dips BELOW a dark page, layered with white) can't be reached at
  // the max-channel α — the exact overlay would fall outside 0–255 and clamp,
  // which is what silently broke the reconstruction. Raise α until every
  // channel is solvable in gamut; α = 1 always is, so this terminates.
  while (a < 1 && channels.some(([c, b]) => { const v = exact(c, b, a); return v < -0.5 || v > 255.5 })) {
    a = Math.min(1, Math.round((a + 0.01) * 100) / 100)
  }
  const solve = (c: number, b: number) => Math.min(255, Math.max(0, Math.round(exact(c, b, a))))
  return chroma.rgb(solve(tr, br), solve(tg, bg), solve(tb, bb)).alpha(a).hex()
}

/**
 * Composites an overlay back over a background — the inverse of
 * `alphaColorOver`, used to verify a derived alpha reproduces its solid.
 */
export function compositeOver(overlayHex: string, backgroundHex: string): string {
  const c = chroma(overlayHex)
  const a = c.alpha()
  const [orr, og, ob] = c.rgb()
  const [br, bg, bb] = chroma(backgroundHex).rgb()
  const mix = (o: number, b: number) => Math.round(a * o + (1 - a) * b)
  return chroma.rgb(mix(orr, br), mix(og, bg), mix(ob, bb)).hex()
}

/** Alpha twin of a 1–12 solid scale, derived against its own page. */
export function generateAlphaScale(
  scale: Record<number, string>,
  backgroundHex: string,
  appearance: ScaleAppearance = 'light',
): Record<number, string> {
  const out: Record<number, string> = {}
  for (const [k, hex] of Object.entries(scale)) {
    if (!hex) continue
    try { out[Number(k)] = alphaColorOver(hex, backgroundHex, appearance) } catch { out[Number(k)] = hex }
  }
  return out
}

// ── Neutral alpha primitives (black-a / white-a) ────────────────────────────
// A DIFFERENT contract from `generateAlphaScale` above, on purpose — see
// design-plans/alpha-primitives.md. `accent-a`/`error-a`/etc. are SOLVED: tone
// N reproduces that family's own solid N when composited over ITS OWN page,
// so the scale isn't monotonic in opacity (it can't be — that's not what it's
// for) and step 1 is 0% (fully transparent). Black/white alpha are the other
// half of the dilemma: a FIXED opacity ladder, agnostic to any background,
// for washes/scrims/rims that have to work over a surface the token itself
// doesn't know about (a modal scrim, a hover wash on an arbitrary card, the
// light rim `darkShadow` already paints ad hoc). Values are the published
// Radix `blackA`/`whiteA` scale (`@radix-ui/colors`), not invented — same
// precedent as `radixReference.ts` reusing upstream data rather than
// re-deriving it. These are CONSTANTS, not derived from any store field, so
// they carry no migration and aren't part of `DesignSnapshot`.
export const BLACK_ALPHA_SCALE: Record<number, string> = {
  1: '#0000000d', 2: '#0000001a', 3: '#00000026', 4: '#00000033',
  5: '#0000004d', 6: '#00000066', 7: '#00000080', 8: '#00000099',
  9: '#000000b3', 10: '#000000cc', 11: '#000000e6', 12: '#000000f2',
}
export const WHITE_ALPHA_SCALE: Record<number, string> = {
  1: '#ffffff0d', 2: '#ffffff1a', 3: '#ffffff26', 4: '#ffffff33',
  5: '#ffffff4d', 6: '#ffffff66', 7: '#ffffff80', 8: '#ffffff99',
  9: '#ffffffb3', 10: '#ffffffcc', 11: '#ffffffe6', 12: '#fffffff2',
}

// Canonical hues for the four state roles (recognizable red / amber / green /
// blue). recommendStateColors keeps these hues + lightness but pulls each
// toward the brand's chroma, so the state set feels cohesive with the brand.
const STATE_CANONICAL = {
  error: '#f04438',
  warning: '#f79009',
  success: '#17b26a',
  info: '#2e90fa',
} as const

export type StateColors = { error: string; warning: string; success: string; info: string }

export function recommendStateColors(brandHex: string): StateColors {
  let brandC = 0.13
  try { brandC = chroma(brandHex).oklch()[1] } catch { /* keep fallback */ }
  const out = {} as StateColors
  for (const [key, hex] of Object.entries(STATE_CANONICAL)) {
    const [l, c, h] = chroma(hex).oklch()
    // Blend the state's own chroma with the brand's so the whole set shares a
    // saturation character without losing each role's recognizable hue.
    const blended = (c + brandC) / 2
    out[key as keyof StateColors] = oklchToHex(l, blended, Number.isNaN(h) ? 0 : h)
  }
  return out
}

/** What Neutral + States become for an accent — the same math `useApplyAccentColor`
 *  runs when both links are on. Pages are appearance-split; state hues stay put. */
export interface HarmonyPreview {
  accent: string
  neutral: string
  pageLight: string
  pageDark: string
  states: StateColors
}

export function previewHarmony(accentHex: string, tint: NeutralTint = DEFAULT_NEUTRAL_TINT): HarmonyPreview {
  const neutral = neutralFromBrand(accentHex, tint)
  return {
    accent: accentHex,
    neutral,
    pageLight: backgroundFromBase(neutral, 'light', tint),
    pageDark: backgroundFromBase(neutral, 'dark', tint),
    states: recommendStateColors(accentHex),
  }
}

/**
 * WCAG 2.x contrast ratio.
 *
 * SINGLE SOURCE OF TRUTH: the formula lives in `./color/apca.ts` and nowhere
 * else. This used to call `chroma.contrast` directly, which meant the codebase
 * carried two independent implementations of the same standard — provably
 * identical today (verified bit-for-bit over 5 000 random pairs in
 * `__tests__/no-duplication.test.ts`) but free to drift the moment either
 * chroma-js or our own module changed.
 *
 * The wrapper stays because the name carries meaning at its ~18 call sites.
 * It is an alias, not a second implementation.
 */
export function checkContrast(fg: string, bg: string): number {
  return wcagRatio(fg, bg)
}

export function isAccessible(fg: string, bg: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const contrast = checkContrast(fg, bg)
  return level === 'AA' ? contrast >= WCAG_AA : contrast >= WCAG_AAA
}

/** WCAG 2.x thresholds for `C = (L_max + 0.05) / (L_min + 0.05)`. */
export const WCAG_AA = 4.5
export const WCAG_AAA = 7

// Lightest brand tone (>= start) whose WHITE text passes WCAG AA (4.5:1).
// Keeps the solid brand button accessible even for bright hues where the design
// system's solid tone (9) is too light for white text. Falls back to 12.
//
// TWO ASSUMPTIONS LIVE IN HERE, and both break for the curated architectures:
// the ink is literally `#ffffff` (theirs is `{neutral.1}`, the page — a hair
// darker), and the ramp passed in is the one the tone will be READ from (they
// resolve the same index against a theme's own ramp, which is a different
// colour). Use `solidInkPair` when either can't be guaranteed; this stays for
// the flat catalogue, which does resolve per-ramp.
export function accessibleSolidTone(scale: Record<number, string>, start = BASE_TONE): number {
  // The tone NEAREST the anchor whose white label clears BOTH floors.
  //
  // This used to walk UP from `start` and stop at the first pass, which encodes
  // "higher index = darker fill". That is only true of a LIGHT ramp. In a dark
  // ramp the tones get LIGHTER with index, so the walk never passed and fell
  // through to 12 — the lightest tone in the scale, i.e. the single worst
  // choice. Measured: a teal dark solid resolved to #c3ede6, white-on-white at
  // 1.27:1.
  //
  // Searching outward from the anchor is orientation-independent: it finds the
  // deeper tone in a light ramp and the darker (lower) tone in a dark one,
  // without either the function or its callers having to know which they hold.
  const ok = (t: number): boolean => {
    const hex = scale[t]
    return !!hex && checkContrast('#ffffff', hex) >= WCAG_AA && Math.abs(apcaLc('#ffffff', hex)) >= 75
  }
  if (ok(start)) return start
  for (let d = 1; d <= 11; d++) {
    if (start + d <= 12 && ok(start + d)) return start + d
    if (start - d >= 1 && ok(start - d)) return start - d
  }
  // Nothing in the ramp carries white. Return the anchor rather than an
  // arbitrary extreme — the ink solver is what picks black in that case.
  return start
}

/** A solid fill and the ink that is actually legible on it. */
export interface SolidInkPair {
  /** Ramp step for the fill. */
  tone: number
  /** Index into the `inks` array passed in — the caller owns what that means. */
  ink: number
  /** The achieved ratio. Below `target` means NOTHING in the ramp cleared it. */
  contrast: number
}

/**
 * Solve fill and ink TOGETHER: walk the ramp from `start` and take the first
 * tone where the best of `inks` clears `target`; if no tone does, take the
 * highest-contrast pair available rather than a fixed fallback.
 *
 * This is `accessibleSolidTone` generalized along the two axes that actually
 * vary — a real ink set instead of hardcoded white, and whichever ramp the
 * tone will be read from — so the guarantee holds per theme instead of only
 * for the light ramp with white text on it. The comparison is plain WCAG:
 * `C = (L_max + 0.05) / (L_min + 0.05)` (chroma's `contrast`).
 *
 * Returning the argmax on failure matters: a mid-lightness ramp (yellow, lime)
 * can have NO step where either near-white or near-black clears 4.5, and
 * silently falling back to step 12 there picked a worse pair than the ramp's
 * own best.
 */
export function solidInkPair(
  scale: Record<number, string>,
  inks: string[],
  start = BASE_TONE,
  target: number | TextContrastTarget = WCAG_AA,
): SolidInkPair {
  // Accepts a bare WCAG number for the ~dozen legacy call sites, or the dual
  // target. A number is promoted to "WCAG n + APCA body-text", because that is
  // what the caller meant: every one of these solves ink for a LABEL sitting on
  // a fill. Solving to WCAG alone is what left `on-error` at 3.55 and several
  // `on-*` roles clearing AA at Lc 44 — legible on paper, not on screen.
  const t: TextContrastTarget =
    typeof target === 'number' ? { wcag: target, apcaLc: 75 } : target

  let best: SolidInkPair = { tone: start, ink: 0, contrast: -1 }
  // Rank candidates by how far they are from BOTH floors, so a pair that clears
  // WCAG while failing APCA never outranks one that is closer to satisfying
  // both. Without this the fallback (when nothing clears) picks the highest
  // WCAG ratio, which on a dark fill is exactly the wrong choice.
  let bestScore = -Infinity

  for (let tone = start; tone <= 12; tone++) {
    const fill = scale[tone]
    if (!fill) continue
    for (let i = 0; i < inks.length; i++) {
      let w: number
      let lc: number
      try {
        w = checkContrast(inks[i], fill)
        lc = Math.abs(apcaLc(inks[i], fill))
      } catch { continue }

      const score = Math.min(w / t.wcag, lc / t.apcaLc)
      if (score > bestScore) {
        bestScore = score
        best = { tone, ink: i, contrast: w }
      }
      // First tone that clears BOTH bars wins — walking further only darkens
      // the fill for no accessibility gain, and the ramp's anchor (9) is the
      // tone the system is actually built around.
      if (w >= t.wcag && lc >= t.apcaLc) return { tone, ink: i, contrast: w }
    }
  }
  return best
}

/**
 * WCAG AA plus APCA's large/bold row — the target for a LABEL SITTING ON A
 * SOLID FILL. Mirrors `INTENT_THRESHOLDS['action-label']`; see that entry for
 * why a button label is neither `body-text` nor `large-text`.
 */
export const ACTION_LABEL_TARGET: TextContrastTarget = { wcag: WCAG_AA, apcaLc: 60 }

/**
 * The brand fill: the tone NEAREST THE ANCHOR whose ink clears `target`,
 * tie-broken toward the more chromatic side.
 *
 * `solidInkPair` walks `start → 12` and takes the first pass, which encodes
 * "higher index = a better fill". That is only true of a LIGHT ramp. On a dark
 * one the tones get LIGHTER with index, so the walk runs away from the brand
 * and stops at the near-white end — the same orientation bug `accessibleSolidTone`
 * documents and fixed for itself, still present in the function that superseded
 * it. Measured over the 29-seed brand spectrum × both appearances: 30 of 58
 * solids sat on tone 11–12, so every dark theme's primary button was a pastel
 * with the brand bleached out of it, and all six shipped styles converged on
 * near-identical washed-out CTAs.
 *
 * Searching OUTWARD from the anchor is orientation-independent — it finds the
 * deeper tone in a light ramp and the darker one in a dark ramp without either
 * this function or its callers knowing which they hold. The chroma tie-break
 * settles the symmetric case (|9−7| = |9−11|), and settles it toward the tone
 * that still looks like the user's colour.
 *
 * Measured against the previous walk: chroma gained on 30 seeds, lost on 0, and
 * no pair drops below WCAG AA. Many hues land back on the literal anchor — the
 * brand hex itself as the button — which is what the old comment on
 * `solidInkPair` always claimed ("keeps the fill ON the anchor") but could only
 * deliver on a light ramp.
 *
 * Falls back to `solidInkPair`'s argmax when nothing in the ramp clears, so the
 * no-solution case behaves exactly as before.
 */
export function brandSolidPair(
  scale: Record<number, string>,
  inks: string[],
  anchor = BASE_TONE,
  target: number | TextContrastTarget = ACTION_LABEL_TARGET,
): SolidInkPair {
  const t: TextContrastTarget =
    typeof target === 'number' ? { wcag: target, apcaLc: 75 } : target

  const tones = Object.keys(scale)
    .map(Number)
    .filter((n) => Number.isFinite(n) && scale[n])
    .sort((a, b) => {
      const d = Math.abs(a - anchor) - Math.abs(b - anchor)
      if (d !== 0) return d
      // Symmetric distance: prefer whichever side keeps more of the brand.
      return chromaOf(scale[b]) - chromaOf(scale[a])
    })

  for (const tone of tones) {
    for (let i = 0; i < inks.length; i++) {
      let w: number
      let lc: number
      try {
        w = checkContrast(inks[i], scale[tone])
        lc = Math.abs(apcaLc(inks[i], scale[tone]))
      } catch { continue }
      if (w >= t.wcag && lc >= t.apcaLc) return { tone, ink: i, contrast: w }
    }
  }
  return solidInkPair(scale, inks, anchor, t)
}

/** OKLCH chroma, 0 for anything unparseable — a tie-break must never throw. */
function chromaOf(hex: string): number {
  try {
    return hexToOklch(hex).c
  } catch {
    return 0
  }
}

// ── The app chrome's own accent, as INK ─────────────────────────────────────
// `--accent-ui` tracks the user's accent for everything READ AGAINST THE PAGE:
// `text-accent-ui` section titles, links, active nav, plus the small graphical
// marks (modified dots, tab underlines, connector rules) that need to be
// visible on the chrome — hence the 4.5:1-vs-page walk below. Otherwise a light
// accent like #c76aff renders 3.0:1 titles.
//
// It is NOT the accent used for a solid FILL any more. That's `--accent-solid`
// (see Configurator), solved with `solidInkPair` so it equals the brand solid
// every architecture's `{accent.solid}` resolves to. The two used to be one
// value doing both jobs, which meant a fill inherited a page-contrast rule it
// doesn't have and came out visibly desaturated — measured on accent #a317e6
// in dark chrome, the chrome fill landed on dark-ramp tone 11 (#a557d7) while
// the Color preview's Primary button rendered the anchor #a317e6.
//
// Works for BOTH appearances with one upward walk, because that's the Radix
// model: every ramp's HIGH tones are its accessible-text end — 11–12 are
// near-black on a light ramp and near-white on a dark one. So "walk up from
// the anchor until it clears the page" deepens a light accent on white chrome
// and brightens it on dark chrome, with no branch.
export function chromeAccent(
  scale: Record<number, string> | undefined,
  page: string,
  fallback: string,
): string {
  const seed = scale?.[BASE_TONE] ?? fallback
  if (!scale) return readableAccent(seed, page)
  for (let t = BASE_TONE; t <= 12; t++) {
    const hex = scale[t]
    if (hex && checkContrast(hex, page) >= 4.5) return hex
  }
  // No tone clears it (a ramp generated against a very different page) — nudge
  // the anchor itself rather than shipping the failing tone.
  return readableAccent(seed, page)
}

/** Where the dark chrome's brand wash sits in OKLab L. Measured, not chosen:
 *  the reference this was tuned against (`#3B0600`) reads L 0.229. */
const CHROME_WASH_L = 0.229

/**
 * The brand-tinted stop of the dark chrome's Layer-0 background gradient —
 * **constant depth, maximum chroma at that depth**, taken from the accent's HUE
 * only.
 *
 * This replaced reading a ramp tone (`primaryDarkScale[6]`), which is a
 * *lightness*-driven pick and therefore lands wherever that hue's ramp happens
 * to put it. Measured, the default accent's tone 6 (`#49266c`) sits at L 0.352
 * carrying only **63 % of the chroma available at that lightness** — which is
 * exactly what reads as muddy: mid-dark and under-saturated is brown, not
 * brand. The reference target (`#3B0600`) sits at L 0.229 at **100 %** of the
 * wall.
 *
 * So: pin L to `CHROME_WASH_L` and take `maxChromaSrgb` at that L for the hue.
 *  - Hue-adaptive by construction — the hue is the only input that varies.
 *  - Can never leave sRGB: `maxChromaSrgb` IS the gamut wall, so there's no
 *    mapping step to overshoot (see the "never emit a colour by clipping"
 *    rule).
 *  - Constant DEPTH across hues, so the chrome carries the same visual weight
 *    for any brand; only the hue changes. Reproduces the reference exactly for
 *    a red seed (`#3b0600`) and gives the default violet `#2a0048`.
 *
 * Light chrome is deliberately NOT routed through this: its gradient runs
 * pale-tint → white and has no depth problem to solve.
 */
export function darkChromeWash(seedHex: string, fallback = '#1c1c1c'): string {
  try {
    const { h } = hexToOklch(seedHex)
    return oklchToHex(CHROME_WASH_L, maxChromaSrgb(CHROME_WASH_L, h), h)
  } catch {
    return fallback
  }
}

// Accent ink for app chrome (rail labels, section titles): brand tone 9 is tuned
// for white surfaces, so over the dark theme it can dip below readable contrast.
// Brightens the hue in steps until it clears 4.5:1 on the given background.
export function readableAccent(hex: string, bg: string): string {
  try {
    let c = chroma(hex)
    // CONTINUOUS-PRECISION contrast — the one remaining site. `c` is a
    // chroma.Color being brightened in place, not an emitted token value, so
    // there is no 8-bit hex to measure yet. (`lightnessForContrast` used to be
    // the other one; it now measures the emitted hex directly.)
    for (let i = 0; i < 8 && chroma.contrast(c, bg) < 4.5; i++) c = c.brighten(0.4)
    return c.hex()
  } catch {
    return hex
  }
}

// Ink (light or dark) that reads best ON a filled surface — picks whichever of
// the two candidates has the higher WCAG contrast against `bg`. Used for labels
// that sit on the brand/status solid fills, so a light accent gets dark ink and
// a dark accent gets light ink automatically, in both light and dark themes.
export function readableInk(bg: string, darkInk = '#0a0d12', lightInk = '#ffffff'): string {
  try {
    return checkContrast(lightInk, bg) >= checkContrast(darkInk, bg) ? lightInk : darkInk
  } catch {
    return lightInk
  }
}

// ── Curated, contrast-tuned alternatives to a hand-picked colour ─────────────
// Designers reach for the colour they SEE, which is routinely a bright, highly
// saturated hue whose anchor (tone 9 — the solid fill, emitted verbatim) can't
// carry white ink at AA. The ramp then compensates by walking the fill down to
// 11–12 (`accessibleSolidTone`), i.e. the button ships noticeably darker than
// the colour that was picked. Offering four tuned versions of the SAME hue up
// front is the cheaper fix: pick one and the anchor itself already passes.
//
// The criterion is white ink on the fill (4.5:1 / 7:1), the same guarantee
// ── Moving a colour along the HUE axis ──────────────────────────────────────
//
// Changing hue while holding L and C ABSOLUTE is wrong twice over, and both
// failures were measured on the shipped accent (#9522e9, L .547 C .265 H 304):
//
//  1. It RATCHETS. sRGB's chroma ceiling is hue-dependent, so the first sweep
//     through a narrow hue clamps the chroma and every later hue inherits the
//     clamp. Sweeping 304° → 200° → 120° → 60° → back to 304° left C at .094
//     where that hue allows .258 — a one-way slide into mud that no amount of
//     dragging undoes.
//  2. It reads as MUD. At a fixed L = .48 the ceiling swings .082 (cyan) to
//     .256 (magenta). A hue strip drawn at one lightness is only as vivid as
//     its dullest hue.
//
// The fix is to carry what the colour MEANS relative to its own hue, not its
// absolute coordinates: how far toward the gamut wall it sits (`saturation`),
// and where it sits relative to the lightness at which that hue peaks
// (`lightness`, 0.5 == exactly at the cusp). Both are hue-independent, so a
// round trip is lossless and a vivid colour stays vivid at every angle.
//
// Hue is the only thing the caller changes. The ramp generator is untouched —
// this only picks the anchor hex that lands on tone 9.

export interface HuePosition {
  /** 0–1, chroma as a fraction of what this hue can reach at that lightness. */
  saturation: number
  /** 0–1, lightness relative to the hue's cusp. 0.5 sits exactly on it. */
  lightness: number
}

export function readHuePosition(hex: string): { hue: number; position: HuePosition } {
  let l = 0.6
  let c = 0.15
  let hue = 0
  try {
    const ok = hexToOklch(hex)
    l = ok.l
    c = ok.c
    hue = Number.isNaN(ok.h) ? 0 : ok.h
  } catch { /* an unparseable value still yields a usable position */ }
  const cusp = srgbCusp(hue)
  const ceiling = maxChromaSrgb(l, hue)
  return {
    hue,
    position: {
      saturation: ceiling > 0 ? Math.min(1, c / ceiling) : 0,
      lightness: l <= cusp.l
        ? (cusp.l > 0 ? 0.5 * (l / cusp.l) : 0.5)
        : 0.5 + 0.5 * ((l - cusp.l) / Math.max(1e-6, 1 - cusp.l)),
    },
  }
}

export function colorAtHue(position: HuePosition, hue: number): string {
  const h = ((hue % 360) + 360) % 360
  const cusp = srgbCusp(h)
  const t = Math.min(1, Math.max(0, position.lightness))
  // Piecewise-linear through the cusp, so "a dark version of this hue" stays a
  // dark version — the cusp just moves to wherever this hue can be vivid.
  const l = t <= 0.5
    ? cusp.l * (t / 0.5)
    : cusp.l + (1 - cusp.l) * ((t - 0.5) / 0.5)
  const safeL = Math.min(0.98, Math.max(0.04, l))
  return oklchToHex(safeL, maxChromaSrgb(safeL, h) * Math.min(1, Math.max(0, position.saturation)), h)
}

// `accessibleSolidTone` walks the ramp for — NOT contrast against the page.
// Hue is never touched; only lightness (searched, not offset) and chroma, so
// every suggestion still reads as the user's colour.
export interface ColorSuggestion {
  hex: string
  label: string
  /** One-line rationale, used as the swatch's tooltip. */
  note: string
  /** Achieved ratio of white ink on this fill. */
  contrast: number
}

export function accessibleVariants(hex: string, limit = 4): ColorSuggestion[] {
  let baseL = 0.6
  let baseC = 0.14
  let baseH = 0
  try {
    const [l, c, h] = chroma(hex).oklch()
    baseL = l
    baseC = c
    baseH = Number.isNaN(h) ? 0 : h
  } catch {
    return []
  }
  // A suggestion may only DARKEN. `lightnessForContrast` returns the subtlest
  // tone that still clears the target — which, for a colour that already clears
  // it comfortably, means a LIGHTER one. Handing a user who picked a safe 5.7:1
  // purple a barely-passing 4.5:1 purple under the heading "Accessible" is the
  // opposite of the advice this block exists to give, so the base lightness is
  // kept whenever it already satisfies the target at that chroma.
  const build = (target: number, c: number, label: string, note: string): ColorSuggestion => {
    const chromaC = Math.max(0, c)
    const atBase = oklchToHex(baseL, chromaC, baseH)
    const out = checkContrast('#ffffff', atBase) >= target
      ? atBase
      // `accessibleVariants` suggests a BRAND colour that white text sits on,
      // not a text step — so the APCA floor here is the label's, and it rides
      // along with whatever WCAG target the caller asked for.
      : lightnessForContrast({ wcag: target, apcaLc: 75 }, baseH, chromaC, '#ffffff', true)
    return { hex: out, label, note, contrast: checkContrast('#ffffff', out) }
  }
  const seeds: ColorSuggestion[] = [
    build(WCAG_AA, baseC, 'Accessible', 'Closest tone to yours that carries white text at AA (4.5:1)'),
    build(WCAG_AA, baseC * 0.6, 'Muted', 'Same hue, calmer saturation — still AA with white text'),
    // Chroma is capped, not just scaled: past ~0.31 OKLCH most hues fall out of
    // sRGB and chroma-js clips, so a "vivid" variant would quietly land on the
    // same hex as `Accessible`.
    build(WCAG_AA, Math.min(baseC * 1.3, 0.31), 'Vivid', 'Punchier saturation at the same accessible lightness'),
    build(WCAG_AAA, baseC * 0.95, 'High contrast', 'Deeper tone — white text clears AAA (7:1)'),
    // Fifth seed, shown only when an earlier one collapsed — which is exactly
    // the already-accessible case, where "Accessible" IS the current colour and
    // drops out. Keeps the block at four options without ever repeating a hex.
    build(5.5, baseC, 'Balanced', 'A little deeper than yours, comfortably above AA'),
  ]
  // Drop anything that collapsed onto the current colour or onto an earlier
  // suggestion (a chroma tweak can round to the same 8-bit hex).
  const seen = new Set([hex.toLowerCase().slice(0, 7)])
  const out: ColorSuggestion[] = []
  for (const s of seeds) {
    const k = s.hex.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
    if (out.length === limit) break
  }
  return out
}

// Applies alpha transparency to a hex color — used for the translucent panel
// background treatment (Radix `panelBackground="translucent"` equivalent).
export function withAlpha(hex: string, alpha: number): string {
  try {
    return chroma(hex).alpha(alpha).css()
  } catch {
    return hex
  }
}

// ── Dark-appearance shadows ─────────────────────────────────────────────────
/**
 * The dark twin of a CSS box-shadow — same geometry, colours re-solved for a
 * dark page. Same model the rest of the system already uses (every colour
 * family ships a dark twin, every linked gradient stop resolves a `darkColor`);
 * shadows were the one foundation still shipping ONE value for both
 * appearances, and on a dark page that value renders as nothing at all.
 *
 * **The bug this exists to fix, measured.** The default ramp's shadow colour is
 * `rgba(10,13,18,·)` — "near-black", chosen against a WHITE page. The dark page
 * is `#0c0e12` = `rgb(12,14,18)`. The shadow colour *is* the page. Composited,
 * the largest step moved the pixel by **0.36 of one 8-bit level** — it rounds
 * to the background, so every elevation in dark was mathematically invisible,
 * not merely subtle. (Light mode, for reference, delivers an OKLab ΔL of
 * 0.036–0.132 across the ramp; dark was delivering 0.0003–0.0009.)
 *
 * Two corrections, because one isn't enough:
 *
 *  1. **Black, and much more of it.** The colour goes to pure black (on a
 *     near-black page there is no darker hue to reach for) and the alpha is
 *     remapped `1 − (1 − a)^DARK_ALPHA_GAIN`. That curve is used rather than a
 *     multiplier because a multiplier clamps: the Strong preset's 0.32 × 6
 *     saturates at 1 and flattens the top of the ramp, while this form
 *     approaches 1 asymptotically and so keeps every step ordered.
 *  2. **A light rim, which is what actually makes it read.** Below a near-black
 *     page only ~5% of the luminance range exists, so a black shadow CANNOT
 *     match light-mode elevation however hard it is pushed — measured, even at
 *     gain 8 the largest step reaches ΔL 0.068 against light's 0.132. Up is the
 *     only direction with range left, which is why every dark UI that reads as
 *     elevated (Material's surface tint, Linear/Vercel/GitHub's hairline)
 *     spends light rather than dark. One 1px white rim at α 0.06 buys ΔL
 *     +0.059 — as much as the entire 48px black shadow — so the pair together
 *     lands in the same perceptual range as light mode.
 *
 * The rim is listed FIRST because box-shadow paints earlier layers on top: last
 * would put it under the blurred layers, which is what dulls it back out.
 */
const DARK_ALPHA_GAIN = 6
/** Matches `rgb()`/`rgba()` and 3–8 digit hex. Anything else (a named colour,
 *  `currentColor`) is left untouched rather than guessed at — it still gets the
 *  rim, so an unparseable shadow degrades to "less visible", never to broken. */
const SHADOW_COLOR_RE = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g

const round2 = (n: number) => Math.round(n * 1000) / 1000

export function darkShadow(css: string, opts: { rim?: boolean } = {}): string {
  const value = (css ?? '').trim()
  if (!value || value === 'none') return 'none'
  const withRim = opts.rim !== false

  let maxAlpha = 0
  // One pass over every colour in the string — no need to split the
  // comma-separated layers (which would mean a paren-aware splitter, since
  // `rgba(…)` contains commas of its own).
  const recolored = value.replace(SHADOW_COLOR_RE, (match) => {
    let a: number
    try {
      a = chroma(match).alpha()
    } catch {
      return match
    }
    maxAlpha = Math.max(maxAlpha, a)
    return `rgba(0,0,0,${round2(1 - Math.pow(1 - a, DARK_ALPHA_GAIN))})`
  })
  if (!withRim) return recolored

  // Scaled with the shadow's own weight so the rim reads as part of the same
  // ramp — an xs whisper and a 2xl lift shouldn't share one outline.
  const rimAlpha = round2(Math.min(0.12, Math.max(0.03, 0.03 + 0.35 * maxAlpha)))
  return `0 0 0 1px rgba(255,255,255,${rimAlpha}), ${recolored}`
}

/** `darkShadow` across a whole ramp — the shape the export and preview want. */
export function darkShadowMap(shadows: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(shadows).map(([k, v]) => [k, darkShadow(v)]))
}
