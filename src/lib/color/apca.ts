/**
 * APCA — Advanced Perceptual Contrast Algorithm (APCA-W3, version 0.1.9).
 *
 * WHY THIS EXISTS ALONGSIDE `checkContrast` (WCAG 2.x)
 * ─────────────────────────────────────────────────────────────────────────────
 * WCAG 2.x contrast is a ratio of relative luminances. It is the legal
 * compliance metric and it is not going away, so `colorUtils.checkContrast`
 * stays. But it has two properties that make it a poor GENERATION target:
 *
 *   1. It is symmetric. `contrast(a, b) === contrast(b, a)`. Real perception is
 *      not: dark text on a light page and light text on a dark page of the same
 *      luminance ratio do not read as equally legible.
 *   2. It systematically overrates light-on-dark pairs, which is exactly the
 *      case every dark theme is made of.
 *
 * APCA returns a signed **Lc** ("lightness contrast") value, roughly −108…+106:
 *   · POSITIVE Lc = dark text on a light background (normal polarity)
 *   · NEGATIVE Lc = light text on a dark background (reverse polarity)
 * The magnitude is what you threshold against; the sign tells you the polarity.
 *
 * APCA is DIRECTIONAL: `apcaLc(text, bg)` is not `apcaLc(bg, text)`. Always
 * pass the foreground first.
 *
 * Reference: https://github.com/Myndex/apca-w3 (W3 draft, 0.1.9 constants).
 * These constants are frozen for 0.1.9 — do not "tune" them.
 */

// ── 0.1.9 constant set ───────────────────────────────────────────────────────
const MAIN_TRC = 2.4

const R_CO = 0.2126729
const G_CO = 0.7151522
const B_CO = 0.072175

const NORM_BG = 0.56
const NORM_TXT = 0.57
const REV_TXT = 0.62
const REV_BG = 0.65

const BLK_THRS = 0.022
const BLK_CLMP = 1.414
const SCALE_BOW = 1.14
const SCALE_WOB = 1.14
const LO_BOW_OFFSET = 0.027
const LO_WOB_OFFSET = 0.027
const DELTA_Y_MIN = 0.0005
const LO_CLIP = 0.1

/** sRGB hex (`#rgb`, `#rrggbb`, `#rrggbbaa`) → [r, g, b] in 0–255. */
function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('')
  if (h.length === 8) h = h.slice(0, 6)
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`apca: not an sRGB hex color: "${hex}"`)
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/**
 * APCA's screen luminance Y. NOTE: this is APCA's own estimator, NOT the WCAG
 * relative luminance — it uses a simple 2.4 power curve with no linear toe,
 * which is deliberate. Do not substitute WCAG's `luminance()` here.
 */
export function apcaY(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return (
    R_CO * Math.pow(r / 255, MAIN_TRC) +
    G_CO * Math.pow(g / 255, MAIN_TRC) +
    B_CO * Math.pow(b / 255, MAIN_TRC)
  )
}

/** Soft clamp near black — models the loss of perceived contrast in deep shadow. */
function softClampBlack(y: number): number {
  return y > BLK_THRS ? y : y + Math.pow(BLK_THRS - y, BLK_CLMP)
}

/**
 * Signed Lc for `text` on `background`. Positive = dark-on-light, negative =
 * light-on-dark. Returns exactly 0 when the pair is below the reportable floor
 * (APCA does not report noise as contrast).
 */
export function apcaLc(text: string, background: string): number {
  const yTxt = softClampBlack(apcaY(text))
  const yBg = softClampBlack(apcaY(background))

  if (Math.abs(yBg - yTxt) < DELTA_Y_MIN) return 0

  let sapc: number
  let output: number

  if (yBg > yTxt) {
    // Normal polarity: dark text on a light background.
    sapc = (Math.pow(yBg, NORM_BG) - Math.pow(yTxt, NORM_TXT)) * SCALE_BOW
    output = sapc < LO_CLIP ? 0 : sapc - LO_BOW_OFFSET
  } else {
    // Reverse polarity: light text on a dark background.
    sapc = (Math.pow(yBg, REV_BG) - Math.pow(yTxt, REV_TXT)) * SCALE_WOB
    output = sapc > -LO_CLIP ? 0 : sapc + LO_WOB_OFFSET
  }

  return output * 100
}

/** Magnitude only — what you threshold against. */
export function apcaLcAbs(text: string, background: string): number {
  return Math.abs(apcaLc(text, background))
}

// ── Intent classes ───────────────────────────────────────────────────────────
/**
 * APCA has no single "pass" number the way WCAG has 4.5:1 — the required Lc
 * depends on font size and weight. These are the practical thresholds distilled
 * from the APCA Bronze conformance lookup, expressed as the token INTENTS
 * Escala actually ships. Each role in the semantic layer must declare one.
 *
 *   body-text     — paragraph copy, ≈14–16px regular. The strictest text case.
 *   large-text    — ≥24px, or ≥18.66px bold. Headings.
 *   ui-component  — non-text: borders, icons, focus rings, control outlines.
 *                   WCAG 1.4.11 asks 3:1; APCA's equivalent floor is Lc 45.
 *   decorative    — no legibility requirement (dividers, subtle fills).
 *   surface       — a background; contrast is judged from whatever sits ON it,
 *                   not against the page. Never audited as a foreground.
 */
export type IntentClass =
  | 'body-text'
  | 'large-text'
  | 'ui-component'
  | 'decorative'
  | 'surface'

export type Thresholds = { wcag: number | null; apcaLc: number | null }

export const INTENT_THRESHOLDS: Record<IntentClass, Thresholds> = {
  'body-text':    { wcag: 4.5, apcaLc: 75 },
  'large-text':   { wcag: 3.0, apcaLc: 60 },
  'ui-component': { wcag: 3.0, apcaLc: 45 },
  decorative:     { wcag: null, apcaLc: null },
  surface:        { wcag: null, apcaLc: null },
}

/** WCAG 2.x relative luminance — kept here so the report can compute both
 *  metrics without importing the whole of `colorUtils`. */
export function wcagLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  const ch = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/** WCAG 2.x contrast ratio, 1…21. Symmetric. */
export function wcagRatio(a: string, b: string): number {
  const la = wcagLuminance(a)
  const lb = wcagLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export type ContrastVerdict = {
  wcag: number
  apcaLc: number
  intent: IntentClass
  passesWcag: boolean
  passesApca: boolean
  pass: boolean
}

/** The dual readout. `fg` is the foreground — order matters for APCA. */
export function evaluate(fg: string, bg: string, intent: IntentClass): ContrastVerdict {
  const t = INTENT_THRESHOLDS[intent]
  const wcag = wcagRatio(fg, bg)
  const lc = apcaLc(fg, bg)
  const passesWcag = t.wcag === null ? true : wcag >= t.wcag
  const passesApca = t.apcaLc === null ? true : Math.abs(lc) >= t.apcaLc
  return {
    wcag,
    apcaLc: lc,
    intent,
    passesWcag,
    passesApca,
    // A pair passes only if BOTH agree. WCAG is the compliance floor; APCA is
    // the perceptual floor. Shipping a pair that clears one and fails the other
    // is exactly the class of bug this module exists to surface.
    pass: passesWcag && passesApca,
  }
}
