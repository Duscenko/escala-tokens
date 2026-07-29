import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Static asset bundled in /public — refreshed via `npm run bundle:plugin`.
 *  The Figma plugin package (manifest.json + build output). Shared by every
 *  place that offers the download, so the path can't drift between them. */
export const FIGMA_PLUGIN_ZIP = '/scalable-designs-figma-plugin.zip'

// Token namespace slug from a human project name: "Apollo UI" → "apollo-ui".
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Sanitizes an uploaded SVG before it reaches the store: parses it, requires an
 * <svg> root, strips script/foreignObject elements, event handlers and
 * javascript: URLs. Returns the clean markup, or null if it isn't a safe SVG.
 */
export function sanitizeSvg(raw: string): string | null {
  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml')
  const root = doc.documentElement
  if (root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null

  root.querySelectorAll('script, foreignObject').forEach((el) => el.remove())
  const all = [root, ...root.querySelectorAll('*')]
  all.forEach((el) => {
    ;[...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value.toLowerCase()
      if (name.startsWith('on') || value.includes('javascript:')) el.removeAttribute(attr.name)
      if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) el.removeAttribute(attr.name)
    })
  })
  return new XMLSerializer().serializeToString(root)
}
