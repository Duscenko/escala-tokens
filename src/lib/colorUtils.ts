import chroma from 'chroma-js'

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
 * Lightness (OKLCH) that hits `target` WCAG contrast against `bg`, searched in
 * the direction that moves AWAY from the page: darker for a light theme,
 * lighter for a dark one. Steps 11–12 are defined by their contrast, not by an
 * arbitrary lightness offset — that's what makes text legible on a tinted or
 * near-black page instead of only on pure white.
 */
function lightnessForContrast(target: number, hue: number, chromaC: number, bg: string, towardDark: boolean): string {
  const bgL = chroma(bg).oklch()[0]
  let lo = towardDark ? 0 : bgL
  let hi = towardDark ? bgL : 1
  let best = chroma.oklch(towardDark ? 0 : 1, chromaC, hue).hex()
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const candidate = chroma.oklch(mid, chromaC, hue)
    const ratio = chroma.contrast(candidate, bg)
    if (ratio >= target) {
      best = candidate.hex()
      // Enough contrast — ease back toward the page for the subtler value.
      if (towardDark) lo = mid
      else hi = mid
    } else if (towardDark) hi = mid
    else lo = mid
  }
  // The search runs in continuous OKLCH but the result is quantised to an 8-bit
  // hex, which can shave the ratio just under target (4.49 instead of 4.50).
  // Nudge until the ACTUAL exported value clears it — the token has to pass,
  // not the float behind it.
  let guardL = chroma(best).oklch()[0]
  for (let i = 0; i < 12 && chroma.contrast(best, bg) < target; i++) {
    guardL = clamp01(guardL + (towardDark ? -0.01 : 0.01))
    best = chroma.oklch(guardL, chromaC, hue).hex()
  }
  return best
}

function buildScale(
  baseHex: string,
  spec: AlgoSpec,
  shift: number,
  background?: string,
  appearance: ScaleAppearance = 'light',
): string[] {
  const [baseL, baseC, baseHraw] = chroma(baseHex).oklch()
  const baseH = Number.isNaN(baseHraw) ? 0 : baseHraw

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
      const C = baseC * (spec.lightCmul * 0.25 + (1 - spec.lightCmul * 0.25) * Math.pow(w, 1.15))
      const H = baseH + (spec.hueShift?.(-(1 - w)) ?? 0)
      out.push(chroma.oklch(clamp01(L), Math.max(0, C), H).hex())
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
      out.push(chroma.oklch(clamp01(baseL + dir * step), baseC * spec.darkCmul, H).hex())
      continue
    }

    // ── 11–12: text, defined by CONTRAST rather than a lightness offset, so it
    // stays legible on a tinted or near-black page instead of only on white.
    // 11 targets WCAG AA (4.5:1); 12 goes near-max for high-contrast copy.
    //
    // The gain is ASYMMETRIC on purpose. Dialing contrast UP should be able to
    // reach AAA, but dialing it DOWN must not quietly ship unreadable text, so
    // the negative side is much gentler: step 11 bottoms out at 3.5:1 (still
    // AA-large) instead of the 3.4:1 the old symmetric 0.25 gain allowed, and
    // tops out at 6.5:1. Step 12's gain is smaller again — its 12:1 baseline is
    // already near the ceiling, and a target the search can't reach just clamps
    // (which is what made the old +0.25 end of this slider a no-op).
    const isMaxTone = i === TONES
    const textGain = shift >= 0 ? (isMaxTone ? 0.18 : 0.45) : (isMaxTone ? 0.15 : 0.22)
    const target = (isMaxTone ? 12 : 4.5) * (1 + shift * textGain)
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
): Record<number, string> {
  const spec = SPECS[algorithm] ?? SPECS.default
  const colors = buildScale(baseHex, spec, contrastShift, background, appearance)
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
}[] = [
  { key: 'pure',   label: 'Pure',   hint: 'Radix Gray — no hue at all',
    light: { l: 0.995, mul: 0, cap: 0 },         dark: { l: 0.17,  mul: 0, cap: 0 },        brandSat: 0 },
  { key: 'subtle', label: 'Subtle', hint: 'Radix Mauve / Slate — a whisper of the hue',
    light: { l: 0.995, mul: 0.12, cap: 0.006 },  dark: { l: 0.17,  mul: 0.35, cap: 0.022 }, brandSat: 0.08 },
  { key: 'tinted', label: 'Tinted', hint: 'Radix Sage / Sand — visibly warm or cool',
    light: { l: 0.985, mul: 0.35, cap: 0.018 },  dark: { l: 0.19,  mul: 0.60, cap: 0.040 }, brandSat: 0.16 },
  { key: 'vivid',  label: 'Vivid',  hint: 'Beyond Radix — a clearly coloured paper',
    light: { l: 0.972, mul: 0.70, cap: 0.042 },  dark: { l: 0.215, mul: 1.00, cap: 0.075 }, brandSat: 0.28 },
]

export const DEFAULT_NEUTRAL_TINT: NeutralTint = 'subtle'

export function neutralTintSpec(tint: NeutralTint = DEFAULT_NEUTRAL_TINT) {
  return NEUTRAL_TINTS.find((t) => t.key === tint) ?? NEUTRAL_TINTS[1]
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
    return chroma.oklch(spec.l, Math.min(c * spec.mul, spec.cap), h).hex()
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
    base = chroma.oklch(baseL, nC * 0.5, nH).hex()
  } catch { /* invalid neutral — fall back to the raw hex */ }
  return generateColorScale(base, algorithm, contrastShift, darkBackground, 'dark')
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
    out[key as keyof StateColors] = chroma.oklch(l, blended, Number.isNaN(h) ? 0 : h).hex()
  }
  return out
}

export function checkContrast(fg: string, bg: string): number {
  return chroma.contrast(fg, bg)
}

export function isAccessible(fg: string, bg: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const contrast = checkContrast(fg, bg)
  return level === 'AA' ? contrast >= 4.5 : contrast >= 7
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
  for (let t = start; t <= 12; t++) {
    const hex = scale[t]
    if (hex && checkContrast('#ffffff', hex) >= WCAG_AA) return t
  }
  return 12
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
  target = WCAG_AA,
): SolidInkPair {
  let best: SolidInkPair = { tone: start, ink: 0, contrast: -1 }
  for (let t = start; t <= 12; t++) {
    const fill = scale[t]
    if (!fill) continue
    for (let i = 0; i < inks.length; i++) {
      let c: number
      try { c = checkContrast(inks[i], fill) } catch { continue }
      if (c > best.contrast) best = { tone: t, ink: i, contrast: c }
      // First tone that clears the bar wins — walking further only darkens the
      // fill for no accessibility gain, and the ramp's anchor (9) is the tone
      // the system is actually built around.
      if (c >= target) return { tone: t, ink: i, contrast: c }
    }
  }
  return best
}

// ── The app chrome's own accent ────────────────────────────────────────────
// The chrome (`--accent-ui`) tracks the user's accent, and it is used BOTH as
// ink (`text-accent-ui` on section titles, links, active nav) and as a fill
// (`bg-accent-ui` on primary buttons, step dots, active pills). One value, two
// jobs, so it has to clear 4.5:1 against the chrome page — otherwise a light
// accent like #c76aff renders 3.0:1 titles and 3.0:1 white-on-fill buttons,
// while the Color preview right beside them shows a correctly-darkened button,
// because the token side already anchors `action-primary` to
// `accessibleSolidTone`. This is that same anchor, resolved against the chrome
// page instead of pure white.
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

// Accent ink for app chrome (rail labels, section titles): brand tone 9 is tuned
// for white surfaces, so over the dark theme it can dip below readable contrast.
// Brightens the hue in steps until it clears 4.5:1 on the given background.
export function readableAccent(hex: string, bg: string): string {
  try {
    let c = chroma(hex)
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
    return chroma.contrast(lightInk, bg) >= chroma.contrast(darkInk, bg) ? lightInk : darkInk
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
    const atBase = chroma.oklch(baseL, chromaC, baseH).hex()
    const out = checkContrast('#ffffff', atBase) >= target
      ? atBase
      : lightnessForContrast(target, baseH, chromaC, '#ffffff', true)
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
