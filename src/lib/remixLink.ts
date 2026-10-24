// `?remix=` — a system shuffled on a phone, carried to a laptop in a link
// (plan: `design-plans/mobile-shuffle-playground.md`, F2).
//
//   https://www.escalatokens.com/?remix=1.<base64url>
//
// NOT a project id and NOT a token payload: it never touches `/api/tokens`
// (frozen) and is not the `project` / `section` protocol in `workspaceLink.ts`.
// It is a try-on, the same thing the Themes Library hands the preview: the
// desktop opens it as `stylePreview`, and nothing reaches the store until the
// visitor adds it to their system. No account is asked for to open it.
//
// The payload is the System Style the look was built on (`b`) plus a JSON
// merge patch (RFC 7386) of what the shuffle changed on top (`p`), deflated.
// A whole style is just its id. Generic on purpose: locks mix axes from
// different styles, and a patch carries any mix exactly, where a hand-made
// per-axis encoding would have to be kept in step with the dice.
//
// A link is input from anyone, so decoding is strict: known fields only,
// safe values only, catalogue fonts only, a size cap. Anything else → null.

import { FONT_PRESETS } from './fontStack'
import { FOUNDATION_AXIS } from './shuffleLocks'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from './themePresets'

export const REMIX_PARAM = 'remix'

/** Format version, the prefix before the dot. */
const VERSION = '1'
/** Longest code accepted — well past any real system, short of abuse. */
const MAX_CODE = 6000
/** Longest JSON a code may inflate to. */
const MAX_JSON = 60_000

/** The preset fields a remix may carry. The rest (id, label, copy) belong to
 *  the base style and are never read from a link. */
const CARRIED = ['accent', 'neutral', 'neutralTint', 'states', 'semantics', 'preferredAppearance', 'foundations'] as const
type Carried = Pick<ThemeStylePreset, (typeof CARRIED)[number]>

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: Json }

const isObject = (v: unknown): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v)

// ── JSON merge patch (RFC 7386) ──────────────────────────────────────────────

/** The patch that turns `from` into `to`: changed keys, `null` for removed. */
export function createMergePatch(from: Json, to: Json): Json | undefined {
  if (!isObject(from) || !isObject(to)) return JSON.stringify(from) === JSON.stringify(to) ? undefined : to
  const patch: JsonObject = {}
  for (const key of Object.keys(from)) if (!(key in to)) patch[key] = null
  for (const [key, value] of Object.entries(to)) {
    const sub = key in from ? createMergePatch(from[key], value) : value
    if (sub !== undefined) patch[key] = sub
  }
  return Object.keys(patch).length ? patch : undefined
}

export function applyMergePatch(target: Json, patch: Json): Json {
  if (!isObject(patch)) return patch
  const out: JsonObject = isObject(target) ? { ...target } : {}
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key]
    else out[key] = applyMergePatch(out[key], value)
  }
  return out
}

// ── Bytes ↔ base64url, through deflate ───────────────────────────────────────

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

// ── Validation ───────────────────────────────────────────────────────────────

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i
/** A token value: lengths, refs, shadows, numbers. No `;{}<>\` — nothing that
 *  could end a declaration or open markup if it is ever written to CSS. */
const SAFE_VALUE = /^[\w\s#.,%()+\-/'"*:]{0,120}$/
/** A semantic reference (`{black-a.7}`), resolved by the engine, never raw CSS. */
const REF = /^\{[\w.-]{1,40}\}$/
const TINTS = new Set(['pure', 'subtle', 'tinted', 'vivid'])
const FONTS = new Set(FONT_PRESETS.map((font) => font.value))

function safeLeaves(value: Json, depth = 0): boolean {
  if (depth > 6) return false
  if (typeof value === 'string') return SAFE_VALUE.test(value) || REF.test(value)
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length <= 64 && value.every((v) => safeLeaves(v, depth + 1))
  if (isObject(value)) return Object.keys(value).length <= 128 && Object.entries(value).every(([k, v]) => SAFE_VALUE.test(k) && safeLeaves(v, depth + 1))
  return false
}

/** The carried fields, checked one by one. */
function validCarried(c: JsonObject): boolean {
  if (Object.keys(c).some((key) => !(CARRIED as readonly string[]).includes(key))) return false
  if (typeof c.accent !== 'string' || !HEX.test(c.accent)) return false
  if (c.neutral !== undefined && (typeof c.neutral !== 'string' || !HEX.test(c.neutral))) return false
  if (typeof c.neutralTint !== 'string' || !TINTS.has(c.neutralTint)) return false
  if (c.preferredAppearance !== 'light' && c.preferredAppearance !== 'dark') return false
  if (c.states !== undefined) {
    const states = c.states
    if (!isObject(states)) return false
    if (!['error', 'warning', 'success', 'info'].every((k) => typeof states[k] === 'string' && HEX.test(states[k]))) return false
  }
  if (!isObject(c.foundations)) return false
  if (Object.keys(c.foundations).some((key) => !(key in FOUNDATION_AXIS))) return false
  const type = c.foundations.typography
  if (type !== undefined) {
    if (!isObject(type)) return false
    if (typeof type.fontFamily !== 'string' || !FONTS.has(type.fontFamily)) return false
    if (typeof type.headingFontFamily !== 'string' || !FONTS.has(type.headingFontFamily)) return false
  }
  return safeLeaves(c)
}

// ── Encode / decode ──────────────────────────────────────────────────────────

const carriedOf = (preset: ThemeStylePreset): Json => {
  const out: JsonObject = {}
  for (const key of CARRIED) if (preset[key] !== undefined) out[key] = preset[key] as unknown as Json
  return JSON.parse(JSON.stringify(out)) as Json
}

/** The code for `preset`, built on the System Style `preset.id` names. */
export async function encodeRemix(preset: ThemeStylePreset): Promise<string> {
  const base = THEME_STYLE_PRESETS.find((p) => p.id === preset.id) ?? THEME_STYLE_PRESETS[0]
  const patch = createMergePatch(carriedOf(base), carriedOf(preset))
  const json = JSON.stringify(patch === undefined ? { b: base.id } : { b: base.id, p: patch })
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw'))
  return `${VERSION}.${toBase64Url(packed)}`
}

/** What a remix link opens: a try-on preset, or null when the code is not one
 *  this version can read safely. `whole` = a System Style, unchanged. */
export async function decodeRemix(code: string): Promise<{ preset: ThemeStylePreset; whole: boolean } | null> {
  try {
    if (code.length > MAX_CODE) return null
    const [version, body] = code.split('.')
    if (version !== VERSION || !body || !/^[\w-]+$/.test(body)) return null
    const bytes = await pipe(fromBase64Url(body), new DecompressionStream('deflate-raw'))
    if (bytes.length > MAX_JSON) return null
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Json
    if (!isObject(payload) || typeof payload.b !== 'string') return null
    const base = THEME_STYLE_PRESETS.find((p) => p.id === payload.b)
    if (!base) return null
    if (payload.p === undefined) return { preset: base, whole: true }
    if (!isObject(payload.p)) return null
    const carried = applyMergePatch(carriedOf(base), payload.p)
    if (!isObject(carried) || !validCarried(carried)) return null
    return { preset: { ...base, ...(carried as unknown as Carried) }, whole: false }
  } catch {
    return null
  }
}

/** The public link for a code — always the public host, never a preview one. */
export function remixUrl(code: string, origin = 'https://www.escalatokens.com'): string {
  return `${origin}/?${REMIX_PARAM}=${code}`
}

// ── The page side ────────────────────────────────────────────────────────────

/** A changed look is no System Style, so it travels under its own id: Edit
 *  theme must not reopen a style the visitor already owns (`openStyleForEditing`
 *  reuses by `themeOrigin === preset.id`), and the same link opened twice
 *  reopens the theme it made the first time. Named like a desktop Random. */
export function remixPreset(
  decoded: { preset: ThemeStylePreset; whole: boolean },
  code: string,
  label: string,
  description = '',
): ThemeStylePreset {
  if (decoded.whole) return decoded.preset
  let h = 0x811c9dc5
  for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 0x01000193)
  const id = `${REMIX_ID_PREFIX}${(h >>> 0).toString(16).padStart(8, '0')}`
  return { ...decoded.preset, id, label, shortLabel: label, description, detail: description }
}

export const REMIX_ID_PREFIX = 'remix-'

let incoming: string | null | undefined

/** The `?remix=` this page was opened with, read once and then taken off the
 *  address bar, so a reload or a copied URL does not re-open it. Both the
 *  phone playground and the desktop shell ask; the first read wins for both. */
export function takeIncomingRemix(): string | null {
  if (incoming !== undefined) return incoming
  if (typeof window === 'undefined') return (incoming = null)
  const url = new URL(window.location.href)
  incoming = url.searchParams.get(REMIX_PARAM)
  if (incoming !== null) {
    url.searchParams.delete(REMIX_PARAM)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }
  return incoming
}
