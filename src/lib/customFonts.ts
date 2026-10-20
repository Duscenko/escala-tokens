// Fonts a design system ADDS beyond the built-in list — pure, no React, no
// store, so the export and the tests read the same rules.
//
// Phase 1 (design-plans/custom-fonts.md): two sources, no files on Escala.
//   google  any Google Fonts family, by name
//   css     a stylesheet URL from an allowed font provider (Adobe Fonts,
//           Fontshare, Bunny Fonts, a pasted Google css2 URL)
//
// A source only says WHERE a family loads from. The token value is still the
// family name in `typography.fontFamily`, so Figma, W3C and the plugin read
// exactly what they read before.

import type { FontPreset } from './fontStack'

export type FontCategory = FontPreset['category']

export interface FontSource {
  family: string
  kind: 'google' | 'css'
  /** `css` only — the provider stylesheet, https, on an allowed host. */
  url?: string
  /** `google` only — the css2 axis spec the family answers to
   *  (`wght@400;500;600;700`). Absent = the family's default weight: a static
   *  family lacking a requested weight makes Google refuse the whole URL. */
  spec?: string
  category: FontCategory
}

export const FONT_CATEGORIES: FontCategory[] = ['Sans-serif', 'Serif', 'Mono']

/** Hosts a stylesheet may come from. A stylesheet can restyle the whole app
 *  and any URL can track who opens it, so it is a list, not "any https". */
export const ALLOWED_FONT_HOSTS: Record<string, string> = {
  'fonts.googleapis.com': 'Google Fonts',
  'use.typekit.net': 'Adobe Fonts',
  'api.fontshare.com': 'Fontshare',
  'fonts.bunny.net': 'Bunny Fonts',
}

/** Per system — enough for real work, small enough for the cloud record. */
export const MAX_FONT_SOURCES = 12

const FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 .\-]{0,59}$/

/** A family name is safe to write into CSS (`'Name', sans-serif`) and a URL. */
export function normalizeFamilyName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  return FAMILY_RE.test(name) ? name : null
}

export type UrlCheck =
  | { ok: true; url: string; provider: string }
  | { ok: false; reason: 'invalid' | 'https' | 'host' | 'credentials' }

export function checkFontStylesheetUrl(raw: string): UrlCheck {
  let parsed: URL
  try { parsed = new URL(raw.trim()) } catch { return { ok: false, reason: 'invalid' } }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'https' }
  if (parsed.username || parsed.password) return { ok: false, reason: 'credentials' }
  const provider = ALLOWED_FONT_HOSTS[parsed.hostname.toLowerCase()]
  if (!provider) return { ok: false, reason: 'host' }
  if (parsed.port) return { ok: false, reason: 'host' }
  parsed.hash = ''
  return { ok: true, url: parsed.toString(), provider }
}

/** Families a stylesheet declares (`font-family: "Name"` inside @font-face). */
export function familiesInStylesheet(css: string): string[] {
  const out = new Set<string>()
  for (const block of css.match(/@font-face\s*{[^}]*}/gi) ?? []) {
    const m = block.match(/font-family\s*:\s*(['"]?)([^;'"}]+)\1/i)
    const name = m ? normalizeFamilyName(m[2]) : null
    if (name) out.add(name)
  }
  return [...out]
}

/** A pasted Google css2 URL names its families — `family=Inter:wght@…`. */
export function familiesInGoogleUrl(url: string): string[] {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'fonts.googleapis.com') return []
    return parsed.searchParams.getAll('family')
      .map((f) => normalizeFamilyName(f.split(':')[0].replace(/\+/g, ' ')))
      .filter((f): f is string => Boolean(f))
  } catch { return [] }
}

export function googleFontUrl(family: string, spec?: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}${spec ? `:${spec}` : ''}&display=swap`
}

/** Where the browser (and `@import`) loads a registered family from. */
export const GOOGLE_STANDARD_SPEC = 'wght@400;500;600;700'

export function fontSourceUrl(source: FontSource): string {
  return source.kind === 'css' && source.url ? source.url : googleFontUrl(source.family, source.spec)
}

const SPEC_RE = /^[a-z,]+@[0-9.;,]+$/i

export function findFontSource(sources: readonly FontSource[] | undefined, family: string): FontSource | undefined {
  const key = family.trim().toLowerCase()
  return sources?.find((s) => s.family.toLowerCase() === key)
}

/** Add or replace by family name (case-insensitive). Capped. */
export function upsertFontSource(sources: readonly FontSource[], next: FontSource): FontSource[] {
  const rest = sources.filter((s) => s.family.toLowerCase() !== next.family.toLowerCase())
  return [...rest, next].slice(-MAX_FONT_SOURCES)
}

/** Sanitize whatever a stored / imported snapshot carries. */
export function cleanFontSources(raw: unknown): FontSource[] {
  if (!Array.isArray(raw)) return []
  const out: FontSource[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const family = normalizeFamilyName(String((item as FontSource).family ?? ''))
    if (!family) continue
    const category = FONT_CATEGORIES.includes((item as FontSource).category) ? (item as FontSource).category : 'Sans-serif'
    if ((item as FontSource).kind === 'css') {
      const check = checkFontStylesheetUrl(String((item as FontSource).url ?? ''))
      if (!check.ok) continue
      out.push({ family, kind: 'css', url: check.url, category })
    } else {
      const spec = String((item as FontSource).spec ?? '')
      out.push({ family, kind: 'google', category, ...(SPEC_RE.test(spec) ? { spec } : {}) })
    }
  }
  return out.slice(-MAX_FONT_SOURCES)
}

/** `@import` lines for the registered families a file actually uses. */
export function fontImportLines(sources: readonly FontSource[] | undefined, usedFamilies: Iterable<string>): string[] {
  const urls: string[] = []
  for (const family of usedFamilies) {
    const source = findFontSource(sources, family)
    if (!source) continue
    const url = fontSourceUrl(source)
    if (!urls.includes(url)) urls.push(url)
  }
  return urls.map((url) => `@import url("${url}");`)
}
