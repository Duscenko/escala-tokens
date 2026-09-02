// Phosphor Icons — the icon set Escala embeds and previews.
//
// The catalog lives in `src/generated/` (committed — Phosphor is MIT):
//   • `phosphor-icons.ts`      — the name/slug INDEX + `PHOSPHOR_CORE_BODIES`
//     (the ~30 concept glyphs specimens render inline). Always bundled, tiny.
//   • `phosphor-body-<w>.ts`   — one `{ slug: markup }` map per weight, lazy.
//
// This module is the typed runtime API. Glyph bodies are the inner markup of a
// Phosphor SVG (paths only); the colour comes from the wrapper's `fill`.

import {
  PHOSPHOR_ICONS,
  PHOSPHOR_ICONS_COUNT,
  PHOSPHOR_ICONS_PACKAGE,
  PHOSPHOR_ICONS_VERSION,
  PHOSPHOR_CORE_BODIES,
} from '../generated/phosphor-icons'

export {
  PHOSPHOR_ICONS,
  PHOSPHOR_ICONS_COUNT,
  PHOSPHOR_ICONS_PACKAGE,
  PHOSPHOR_ICONS_VERSION,
  PHOSPHOR_CORE_BODIES,
}

export type PhosphorWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'

export const PHOSPHOR_WEIGHTS: readonly PhosphorWeight[] = [
  'thin', 'light', 'regular', 'bold', 'fill', 'duotone',
]

export interface PhosphorIcon {
  name: string
  slug: string
}

const BY_NAME = new Map(PHOSPHOR_ICONS.map((i) => [i.name.toLowerCase(), i]))
const BY_SLUG = new Map(PHOSPHOR_ICONS.map((i) => [i.slug, i]))

export function findPhosphorIcon(nameOrSlug: string): PhosphorIcon | undefined {
  const key = nameOrSlug.trim().toLowerCase()
  return BY_NAME.get(key) ?? BY_SLUG.get(key)
}

/** Local search — matches name or slug. Empty query returns the first `limit`. */
export function searchPhosphorIcons(query: string, limit = 60): PhosphorIcon[] {
  const q = query.trim().toLowerCase()
  if (!q) return PHOSPHOR_ICONS.slice(0, limit)
  const hits: PhosphorIcon[] = []
  for (const icon of PHOSPHOR_ICONS) {
    if (icon.slug.includes(q) || icon.name.toLowerCase().includes(q)) {
      hits.push(icon)
      if (hits.length >= limit) break
    }
  }
  return hits
}

// ── Weight body maps ────────────────────────────────────────────────────────
// Every weight is a separate lazy chunk. `PHOSPHOR_CORE_BODIES` (regular) is
// the one thing available synchronously, for specimens.

const WEIGHT_LOADERS: Record<PhosphorWeight, () => Promise<{ default: Record<string, string> }>> = {
  thin: () => import('../generated/phosphor-body-thin'),
  light: () => import('../generated/phosphor-body-light'),
  regular: () => import('../generated/phosphor-body-regular'),
  bold: () => import('../generated/phosphor-body-bold'),
  fill: () => import('../generated/phosphor-body-fill'),
  duotone: () => import('../generated/phosphor-body-duotone'),
}

const bodyCache = new Map<PhosphorWeight, Record<string, string>>()

/** Load (and cache) every glyph body for one weight. */
export async function loadPhosphorWeight(weight: PhosphorWeight): Promise<Record<string, string>> {
  const cached = bodyCache.get(weight)
  if (cached) return cached
  const mod = await WEIGHT_LOADERS[weight]()
  bodyCache.set(weight, mod.default)
  return mod.default
}

/** A concept/core glyph's REGULAR body, synchronously — for specimens. */
export function phosphorCoreBody(slug: string): string | undefined {
  return PHOSPHOR_CORE_BODIES[slug]
}

// ── SVG assembly ───────────────────────────────────────────────────────────

const VIEWBOX = '0 0 256 256'

/** In-app render: inherits colour via `fill="currentColor"`. */
export function phosphorIconSvg(body: string, fill = 'currentColor'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="${fill}" aria-hidden="true">${body}</svg>`
}

/** Markup Figma accepts on paste — explicit black fill, no `currentColor`, a
 *  fixed 24px box (Phosphor's grid is 256, Figma scales it down). */
export function phosphorIconSvgForFigma(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${VIEWBOX}" fill="#000000">${body}</svg>`
}

export type PhosphorCopyKind = 'svg' | 'name'

export async function copyPhosphorIcon(
  icon: { name: string },
  body: string,
  kind: PhosphorCopyKind = 'svg',
): Promise<void> {
  const text = kind === 'name' ? icon.name : phosphorIconSvgForFigma(body)
  await navigator.clipboard.writeText(text)
}

/** CSS-mask data URI — black shape, tinted by `background-color: currentColor`. */
export function phosphorIconMaskUrl(body: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(phosphorIconSvg(body, '#000'))}")`
}
