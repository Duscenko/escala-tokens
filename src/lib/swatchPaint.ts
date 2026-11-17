// How a colour SAMPLE paints — one rule for every swatch, chip and ramp cell.
//
// An opaque colour paints as itself. A TRANSLUCENT one (an alpha twin, a
// `status.*.surface`, a focus ring) only means something over the page it was
// solved for. Painted straight on the chrome — a Light role's 12 % red on a
// dark Storybook — it reads as a near-black smudge: the "enmascarado" swatches
// reported 2026-11-17. So a translucent sample is split on its diagonal: over
// its OWN page upper-right (the colour that ships) and over a checker cut from
// that page lower-left (that it is translucent). Without a known page it falls
// back to a neutral checker. Pure, no DOM.
import type { CSSProperties } from 'react'

/** True when a colour carries transparency (8-digit hex below ff, #rgba, rgba/hsla < 1, transparent). */
export function isTranslucent(color: string): boolean {
  const c = color.trim().toLowerCase()
  if (c === 'transparent') return true
  const hex = /^#([0-9a-f]{4}|[0-9a-f]{8})$/.exec(c)
  if (hex) return hex[1].length === 8 ? hex[1].slice(6) !== 'ff' : hex[1][3] !== 'f'
  const fn = /^(?:rgba?|hsla?)\((.*)\)$/.exec(c)
  if (!fn) return false
  const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 4) return false
  const a = parts[3]
  return a.endsWith('%') ? parseFloat(a) < 100 : parseFloat(a) < 1
}

/** Style for a colour sample. `page` = the page the colour is solved for
 *  (the theme's own, not the chrome's). `cell` = checker cell size in px. */
export function swatchPaint(color: string, page?: string, cell = 6): CSSProperties {
  if (!color) return { background: 'transparent' }
  if (!isTranslucent(color)) return { background: color }
  const wash = `linear-gradient(${color}, ${color})`
  if (!page) {
    return {
      backgroundImage: `${wash}, repeating-conic-gradient(#ffffff 0% 25%, #a3a3a3 0% 50%)`,
      backgroundSize: `auto, ${cell}px ${cell}px`,
    }
  }
  return {
    backgroundImage: `${wash}, linear-gradient(to top right, transparent 50%, ${page} 50%), repeating-conic-gradient(${page} 0% 25%, color-mix(in srgb, ${page} 82%, #808080) 0% 50%)`,
    backgroundSize: `auto, auto, ${cell}px ${cell}px`,
  }
}
