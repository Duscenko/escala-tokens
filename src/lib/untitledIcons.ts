// Untitled UI Icons — the only icon set Escala embeds.
// Glyph paths live in `src/generated/untitled-icons.ts` (gitignored; run
// `npm run gen:untitled-icons`). This module is the typed runtime API.

import {
  UNTITLED_ICONS,
  UNTITLED_ICONS_COUNT,
  UNTITLED_ICONS_PACKAGE,
  UNTITLED_ICONS_VERSION,
} from '../generated/untitled-icons'

export {
  UNTITLED_ICONS,
  UNTITLED_ICONS_COUNT,
  UNTITLED_ICONS_PACKAGE,
  UNTITLED_ICONS_VERSION,
}

export interface UntitledIconPath {
  d: string
  clipRule?: string
}

export interface UntitledIcon {
  name: string
  slug: string
  paths: UntitledIconPath[]
}

const BY_NAME = new Map(UNTITLED_ICONS.map((i) => [i.name.toLowerCase(), i]))
const BY_SLUG = new Map(UNTITLED_ICONS.map((i) => [i.slug, i]))

export function findUntitledIcon(nameOrSlug: string): UntitledIcon | undefined {
  const key = nameOrSlug.trim().toLowerCase()
  return BY_NAME.get(key) ?? BY_SLUG.get(key)
}

/** Local search — matches name or slug. Empty query returns the first `limit` icons. */
export function searchUntitledIcons(query: string, limit = 60): UntitledIcon[] {
  const q = query.trim().toLowerCase()
  if (!q) return UNTITLED_ICONS.slice(0, limit)
  const hits: UntitledIcon[] = []
  for (const icon of UNTITLED_ICONS) {
    if (icon.slug.includes(q) || icon.name.toLowerCase().includes(q)) {
      hits.push(icon)
      if (hits.length >= limit) break
    }
  }
  return hits
}

export function untitledIconSvg(icon: UntitledIcon, stroke = 'currentColor'): string {
  const paths = icon.paths
    .map((p) => {
      const extra = p.clipRule ? ` clip-rule="${p.clipRule}" fill-rule="${p.clipRule}"` : ''
      return `<path d="${p.d}"${extra}/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
}

/** SVG markup Figma accepts on paste — explicit black stroke, no `currentColor`. */
export function untitledIconSvgForFigma(icon: UntitledIcon): string {
  const paths = icon.paths
    .map((p) => {
      const extra = p.clipRule ? ` clip-rule="${p.clipRule}" fill-rule="${p.clipRule}"` : ''
      return `<path d="${p.d}"${extra}/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
}

export type UntitledIconCopyKind = 'svg' | 'name'

export async function copyUntitledIcon(icon: UntitledIcon, kind: UntitledIconCopyKind = 'svg'): Promise<void> {
  const text = kind === 'name' ? icon.name : untitledIconSvgForFigma(icon)
  await navigator.clipboard.writeText(text)
}

/** CSS-mask data URI — black strokes, tinted by `background-color: currentColor`. */
export function untitledIconMaskUrl(icon: UntitledIcon): string {
  return `url("data:image/svg+xml,${encodeURIComponent(untitledIconSvg(icon, '#000'))}")`
}
