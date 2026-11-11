// Elevation recipes — the layers of every `Shadow/*` and `Depth/*` style in
// the Escala Figma file, each layer's colour named by an Elevation ROLE
// (`color.elevation.shadow-key|shadow-ambient|shadow-ring`), never a hex. One
// recipe serves Light and Dark: the roles change per theme, the geometry does
// not. tokens.json ships them as `elevation` (additive); variables.css ships
// `--depth-<step>` and `--blur-<step>` built from them.
//
// `shadow` follows the theme's chosen shadow preset when it is not the default
// ramp: each preset layer keeps its geometry and takes the key (first) or
// ambient (later) role, after the ring. The default ramp (Soft) IS the Figma
// recipe, so a fresh system ships exactly the file's styles.
//
// Pure data + string math: no store, no DOM.

import { SHADOW_PRESETS, SHADOW_STEPS } from './shadowTokens'

export type ElevationRole = 'key' | 'ambient' | 'ring'
export interface ElevationLayer { x: number; y: number; blur: number; spread: number; role: ElevationRole }
export type ElevationStep = (typeof SHADOW_STEPS)[number]

const L = (x: number, y: number, blur: number, spread: number, role: ElevationRole): ElevationLayer => ({ x, y, blur, spread, role })
const RING = L(0, 0, 0, 1, 'ring')

/** `Shadow/*` in the Figma file: ring + key/ambient drop shadows. */
export const SHADOW_RECIPES: Record<ElevationStep, ElevationLayer[]> = {
  xs: [RING, L(0, 1, 2, 0, 'ambient')],
  sm: [RING, L(0, 1, 3, 0, 'key'), L(0, 1, 2, -1, 'key')],
  md: [RING, L(0, 4, 6, -1, 'key'), L(0, 2, 4, -2, 'ambient')],
  lg: [RING, L(0, 12, 16, -4, 'key'), L(0, 4, 6, -2, 'ambient')],
  xl: [RING, L(0, 20, 24, -4, 'key'), L(0, 8, 8, -4, 'ambient')],
  '2xl': [RING, L(0, 24, 48, -12, 'key'), L(0, 24, 48, -12, 'key')],
}

/** `Depth/*`: the same idea as INNER shadows — presses an element into its
 *  surface. md…2xl use shorter offsets than the drop shadows. */
export const DEPTH_RECIPES: Record<ElevationStep, ElevationLayer[]> = {
  xs: [RING, L(0, 1, 2, 0, 'ambient')],
  sm: [RING, L(0, 1, 3, 0, 'key'), L(0, 1, 2, -1, 'key')],
  md: [RING, L(0, 2, 4, -1, 'key'), L(0, 1, 2, -1, 'ambient')],
  lg: [RING, L(0, 4, 8, -2, 'key'), L(0, 2, 4, -2, 'ambient')],
  xl: [RING, L(0, 8, 16, -4, 'key'), L(0, 4, 8, -4, 'ambient')],
  '2xl': [RING, L(0, 12, 24, -6, 'key'), L(0, 6, 12, -6, 'ambient')],
}

/** `Blur/*` as the CSS `backdrop-filter: blur()` radius in px. Figma's
 *  BACKGROUND_BLUR radius is twice this (`Blur/sm` 16 = `blur(8px)`). */
export const BLUR_PX: Record<ElevationStep, number> = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 40 }

const ROLE_VAR: Record<ElevationRole, string> = {
  key: 'var(--color-elevation-shadow-key)',
  ambient: 'var(--color-elevation-shadow-ambient)',
  ring: 'var(--color-elevation-shadow-ring)',
}

const SOFT = SHADOW_PRESETS.find((p) => p.label === 'Soft')!.values as Record<string, string>

/** One CSS shadow layer (`0 4px 6px -1px rgba(…)`) → its geometry, or null. */
function parseLayer(css: string): Omit<ElevationLayer, 'role'> | null {
  const inner = css.replace(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|inset/gi, ' ').trim()
  const nums = inner.split(/\s+/).filter(Boolean).map((t) => parseFloat(t))
  if (nums.length < 2 || nums.some((n) => !Number.isFinite(n))) return null
  const [x, y, blur = 0, spread = 0] = nums
  return { x, y, blur, spread }
}

/** Split a box-shadow on top-level commas (not the ones inside `rgba()`). */
function splitLayers(css: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of css) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/** The shadow recipes for a theme's light ramp: the Figma recipes for the
 *  default ramp, else the ramp's own geometry behind the ring (first layer
 *  `key`, later layers `ambient`). `none` ships no layers. */
export function shadowRecipesFor(shadows: Record<string, string> | undefined): Record<ElevationStep, ElevationLayer[]> {
  const ramp = shadows ?? SOFT
  const isDefault = SHADOW_STEPS.every((step) => (ramp[step] ?? '') === SOFT[step])
  if (isDefault) return structuredClone(SHADOW_RECIPES)
  const out = {} as Record<ElevationStep, ElevationLayer[]>
  for (const step of SHADOW_STEPS) {
    const css = ramp[step]
    if (!css || css === 'none') { out[step] = []; continue }
    const layers = splitLayers(css).map(parseLayer)
    out[step] = layers.every(Boolean)
      ? [RING, ...layers.map((g, i) => ({ ...g!, role: (i === 0 ? 'key' : 'ambient') as ElevationRole }))]
      : structuredClone(SHADOW_RECIPES[step])
  }
  return out
}

/** tokens.json `elevation`. */
export function elevationTokens(shadows: Record<string, string> | undefined): {
  shadow: Record<ElevationStep, ElevationLayer[]>
  depth: Record<ElevationStep, ElevationLayer[]>
  blur: Record<ElevationStep, number>
} {
  return { shadow: shadowRecipesFor(shadows), depth: structuredClone(DEPTH_RECIPES), blur: { ...BLUR_PX } }
}

const px = (n: number) => (n === 0 ? '0' : `${n}px`)
function layerCss(layer: ElevationLayer, inset: boolean): string {
  return `${inset ? 'inset ' : ''}${px(layer.x)} ${px(layer.y)} ${px(layer.blur)} ${px(layer.spread)} ${ROLE_VAR[layer.role]}`
}

/** `--depth-<step>` and `--blur-<step>` for `:root`. The colours are the
 *  Elevation roles, so the same declaration follows Light and Dark. */
export function elevationCssVars(): string[] {
  return [
    ...SHADOW_STEPS.map((step) => `--depth-${step}: ${DEPTH_RECIPES[step].map((l) => layerCss(l, true)).join(', ')};`),
    ...SHADOW_STEPS.map((step) => `--blur-${step}: ${BLUR_PX[step]}px;`),
  ]
}
