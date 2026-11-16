// ── Your icons: what the open beta keeps ────────────────────────────────────
// Custom icons are brand glyphs and one-off marks, not an icon library: the
// library is Phosphor (bundled). Every icon rides inside the design system, so
// it is stored in the browser, in the account record (Supabase, 1 MB cap per
// account: `MAX_CLOUD_BYTES`), in every saved copy of the system, and in the
// published tokens.json that each Figma file polls (2 MB cap, already ~0.5 MB
// without icons). A set of 1,000+ SVGs breaks all four, which is how a user
// with 1,173 icons got "Too large for your account".
//
// The budget is about cost and those caps, not value: a typical exported icon
// is 0.5–1.5 KB, so 100 icons fit in ~150 KB.

export const MAX_CUSTOM_ICONS = 100
/** One sanitized SVG. A detailed logo fits; an embedded bitmap does not. */
export const MAX_SVG_BYTES = 16 * 1024
/** All icons of one system together. */
export const MAX_CUSTOM_ICON_BYTES = 200 * 1024

export interface IconBudget { count: number; bytes: number }

export function iconBudget(icons: readonly { svg: string }[]): IconBudget {
  return { count: icons.length, bytes: icons.reduce((n, i) => n + i.svg.length, 0) }
}

export function overIconBudget(b: IconBudget): boolean {
  return b.count > MAX_CUSTOM_ICONS || b.bytes > MAX_CUSTOM_ICON_BYTES
}

export type IconRejection = 'count' | 'total' | 'size'

/** Whether one more icon fits. `replacing` = the bytes of an icon with the same
 *  name, which the upload replaces rather than adds. */
export function fitsIconBudget(b: IconBudget, svg: string, replacing?: string): IconRejection | null {
  if (svg.length > MAX_SVG_BYTES) return 'size'
  const count = b.count + (replacing === undefined ? 1 : 0)
  if (count > MAX_CUSTOM_ICONS) return 'count'
  if (b.bytes - (replacing?.length ?? 0) + svg.length > MAX_CUSTOM_ICON_BYTES) return 'total'
  return null
}

export function formatKb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`
}
