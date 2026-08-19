#!/usr/bin/env node
import { readFileSync } from 'node:fs'
/**
 * color-science-core — contrast, conversion and gamut-mapping validator.
 *
 * Dependency-free. Node 18+.
 *
 *   node contrast.mjs '#6c737f' '#ffffff'
 *   node contrast.mjs '#6c737f' '#ffffff' body-text
 *   node contrast.mjs --gamut 0.55 0.34 350
 *   node contrast.mjs --oklch '#7f56d9'
 *   node contrast.mjs --audit pairs.json
 *
 * pairs.json: { "content-primary": { "fg": "#111", "bg": "#fff",
 *                                    "intent": "body-text" }, ... }
 */

// ── parsing ──────────────────────────────────────────────────────────────────

function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(c => c + c).join('')
  if (h.length === 8) h = h.slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not an sRGB hex color: "${hex}"`)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// ── WCAG 2.1 ─────────────────────────────────────────────────────────────────

export function wcagLuminance(hex) {
  const [r, g, b] = parseHex(hex)
  const ch = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

export function wcagRatio(a, b) {
  const la = wcagLuminance(a), lb = wcagLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// ── APCA-W3 0.1.9 ────────────────────────────────────────────────────────────

const MAIN_TRC = 2.4
const Rco = 0.2126729, Gco = 0.7151522, Bco = 0.072175
const normBG = 0.56, normTXT = 0.57, revTXT = 0.62, revBG = 0.65
const blkThrs = 0.022, blkClmp = 1.414
const scaleBoW = 1.14, scaleWoB = 1.14
const loBoWoffset = 0.027, loWoBoffset = 0.027
const deltaYmin = 0.0005, loClip = 0.1

export function apcaY(hex) {
  const [r, g, b] = parseHex(hex)
  return Rco * (r / 255) ** MAIN_TRC + Gco * (g / 255) ** MAIN_TRC + Bco * (b / 255) ** MAIN_TRC
}

export function apcaLc(text, background) {
  const soft = y => (y > blkThrs ? y : y + (blkThrs - y) ** blkClmp)
  const yTxt = soft(apcaY(text)), yBg = soft(apcaY(background))
  if (Math.abs(yBg - yTxt) < deltaYmin) return 0
  let s, out
  if (yBg > yTxt) {
    s = (yBg ** normBG - yTxt ** normTXT) * scaleBoW
    out = s < loClip ? 0 : s - loBoWoffset
  } else {
    s = (yBg ** revBG - yTxt ** revTXT) * scaleWoB
    out = s > -loClip ? 0 : s + loWoBoffset
  }
  return out * 100
}

// ── OKLab / OKLCH ────────────────────────────────────────────────────────────

const toLinear = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toGamma = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

export function linearToOklab({ r, g, b }) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

export function oklabToLinear({ l, a, b }) {
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return {
    r: 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    g: -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    b: -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  }
}

const oklchToOklab = ({ l, c, h }) => {
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

const oklabToOklch = ({ l, a, b }) => {
  const c = Math.hypot(a, b)
  return { l, c, h: c < 1e-7 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }
}

export function hexToOklch(hex) {
  const [r, g, b] = parseHex(hex)
  return oklabToOklch(linearToOklab({ r: toLinear(r / 255), g: toLinear(g / 255), b: toLinear(b / 255) }))
}

const byte = v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')

export function oklchToHexClipped(color) {
  const { r, g, b } = oklabToLinear(oklchToOklab(color))
  return `#${byte(toGamma(r))}${byte(toGamma(g))}${byte(toGamma(b))}`
}

// ── CSS Color 4 gamut mapping ────────────────────────────────────────────────

const GAMUT_EPS = 1e-6, JND = 0.02, SEARCH_EPS = 0.0001

export function inSrgbGamut(color) {
  const { r, g, b } = oklabToLinear(oklchToOklab(color))
  return [r, g, b].every(v => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS)
}

export const deltaEOK = (a, b) => Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b)

function clipToOklab(color) {
  const { r, g, b } = oklabToLinear(oklchToOklab(color))
  const cl = v => Math.max(0, Math.min(1, v))
  return linearToOklab({ r: cl(r), g: cl(g), b: cl(b) })
}

export function gamutMapSrgb(color) {
  if (color.l >= 1) return { l: 1, c: 0, h: color.h }
  if (color.l <= 0) return { l: 0, c: 0, h: color.h }
  if (inSrgbGamut(color)) return color

  let min = 0, max = color.c, minInGamut = true
  let current = { ...color }
  let clipped = clipToOklab(current)
  if (deltaEOK(clipped, oklchToOklab(current)) < JND) return oklabToOklch(clipped)

  while (max - min > SEARCH_EPS) {
    const c = (min + max) / 2
    current = { l: color.l, c, h: color.h }
    if (minInGamut && inSrgbGamut(current)) { min = c; continue }
    clipped = clipToOklab(current)
    const e = deltaEOK(clipped, oklchToOklab(current))
    if (e < JND) {
      if (JND - e < SEARCH_EPS) return oklabToOklch(clipped)
      minInGamut = false
      min = c
    } else max = c
  }
  return oklabToOklch(clipped)
}

export const oklchToHex = (l, c, h) =>
  oklchToHexClipped(gamutMapSrgb({ l, c, h: Number.isNaN(h) ? 0 : h }))

// ── Intent classes ───────────────────────────────────────────────────────────

export const INTENT_THRESHOLDS = {
  'body-text':    { wcag: 4.5, apcaLc: 75 },
  'large-text':   { wcag: 3.0, apcaLc: 60 },
  'ui-component': { wcag: 3.0, apcaLc: 45 },
  decorative:     { wcag: null, apcaLc: null },
  surface:        { wcag: null, apcaLc: null },
}

export function evaluate(fg, bg, intent = 'body-text') {
  const t = INTENT_THRESHOLDS[intent]
  if (!t) throw new Error(`unknown intent class: "${intent}"`)
  const wcag = wcagRatio(fg, bg)
  const lc = apcaLc(fg, bg)
  const passesWcag = t.wcag === null || wcag >= t.wcag
  const passesApca = t.apcaLc === null || Math.abs(lc) >= t.apcaLc
  return { wcag, apcaLc: lc, intent, passesWcag, passesApca, pass: passesWcag && passesApca }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const mark = ok => (ok ? '[32mPASS[0m' : '[31mFAIL[0m')

function wcagBadge(r) {
  if (r >= 7) return 'AAA'
  if (r >= 4.5) return 'AA'
  if (r >= 3) return 'AA-large'
  return '—'
}

function main(argv) {
  const args = argv.slice(2)
  if (!args.length || args[0] === '-h' || args[0] === '--help') {
    console.log(`
  contrast.mjs — WCAG 2.1 + APCA dual readout

    contrast.mjs <fg> <bg> [intent]     dual readout, optional pass/fail
    contrast.mjs --oklch <hex>          hex → OKLCH
    contrast.mjs --gamut <L> <C> <H>    gamut-map an OKLCH triple to sRGB
    contrast.mjs --audit <file.json>    audit { name: {fg,bg,intent} } pairs

  intents: ${Object.keys(INTENT_THRESHOLDS).join(' · ')}
`)
    return 0
  }

  if (args[0] === '--oklch') {
    const { l, c, h } = hexToOklch(args[1])
    console.log(`${args[1]}  →  oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)})`)
    console.log(`in sRGB gamut: ${inSrgbGamut({ l, c, h })}`)
    return 0
  }

  if (args[0] === '--gamut') {
    const [l, c, h] = args.slice(1, 4).map(Number)
    const mapped = gamutMapSrgb({ l, c, h })
    console.log(`requested   oklch(${l} ${c} ${h})`)
    console.log(`clipped     ${oklchToHexClipped({ l, c, h })}   ← what most libraries emit`)
    console.log(`mapped      ${oklchToHexClipped(mapped)}   oklch(${mapped.l.toFixed(4)} ${mapped.c.toFixed(4)} ${mapped.h.toFixed(2)})`)
    const clippedBack = hexToOklch(oklchToHexClipped({ l, c, h }))
    const hueErr = a => Math.abs(((a - h + 540) % 360) - 180)
    console.log(`\nhue error   clipped ${hueErr(clippedBack.h).toFixed(2)}°   mapped ${hueErr(mapped.h).toFixed(2)}°`)
    console.log(`L error     clipped ${Math.abs(clippedBack.l - l).toFixed(4)}    mapped ${Math.abs(mapped.l - l).toFixed(4)}`)
    return 0
  }

  if (args[0] === '--audit') {
    const pairs = JSON.parse(readFileSync(args[1], 'utf8'))
    let fails = 0
    console.log('\n  name                              intent        WCAG        Lc    verdict')
    console.log('  ' + '─'.repeat(74))
    for (const [name, p] of Object.entries(pairs)) {
      const v = evaluate(p.fg, p.bg, p.intent ?? 'body-text')
      if (!v.pass) fails++
      console.log(
        `  ${name.padEnd(33)} ${v.intent.padEnd(13)} ${v.wcag.toFixed(2).padStart(6)} ` +
        `${v.apcaLc.toFixed(1).padStart(8)}    ${mark(v.pass)}` +
        (v.passesWcag !== v.passesApca ? '  ← metrics disagree' : ''),
      )
    }
    console.log(`\n  ${Object.keys(pairs).length - fails}/${Object.keys(pairs).length} pass\n`)
    return fails ? 1 : 0
  }

  const [fg, bg, intent] = args
  const r = wcagRatio(fg, bg)
  const lc = apcaLc(fg, bg)
  console.log(`\n  ${fg} on ${bg}\n`)
  console.log(`  WCAG 2.1   ${r.toFixed(2)}:1   ${wcagBadge(r)}`)
  console.log(`  APCA       Lc ${lc.toFixed(1)}   (${lc >= 0 ? 'dark on light' : 'light on dark'})`)
  if (intent) {
    const v = evaluate(fg, bg, intent)
    console.log(`\n  intent: ${intent}   (WCAG ≥ ${INTENT_THRESHOLDS[intent].wcag ?? '—'}, |Lc| ≥ ${INTENT_THRESHOLDS[intent].apcaLc ?? '—'})`)
    console.log(`  WCAG ${mark(v.passesWcag)}    APCA ${mark(v.passesApca)}    overall ${mark(v.pass)}`)
    if (v.passesWcag !== v.passesApca) {
      console.log(`\n  The metrics disagree. ${v.passesWcag
        ? 'Compliant but perceptually weak — likely a dark-theme or low-chroma pair.'
        : 'Perceptually fine but below the legal floor — do not ship as-is.'}`)
    }
  }
  console.log()
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv))
