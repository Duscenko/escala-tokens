// Gradient foundation — a small model for named, token-exported gradients that
// can be assigned to preview surfaces (card covers, avatars) and shipped in
// tokens.json / variables.css / README. Kept dependency-free (pure data + CSS
// string builders) so the store, the editor and the exporters share one source.

import chroma from 'chroma-js'
import { slugify } from './utils'

export type GradientType = 'linear' | 'radial'

export interface GradientStop {
  /** Any CSS color the picker produces — 6- or 8-digit hex (alpha) included.
   *  When `tone` is set this is a CACHE of `accentScale[tone]`, re-resolved
   *  whenever the accent moves; never the source of truth. */
  color: string
  /** Stop position along the gradient axis, 0–100 (%). */
  pos: number
  /**
   * The accent-ramp TONE (1–12) this stop reads, for a linked gradient.
   *
   * "Linked to accent" used to mean stops computed by ad-hoc HSL math off the
   * raw accent hex (`brandCoverStops` below) — colours that existed nowhere in
   * the primitives, so a "linked" gradient shipped loose hex the plugin and the
   * CSS could never alias back to a token. A linked stop is now a REFERENCE to
   * a tone of the accent ramp, exactly like a semantic token is.
   */
  tone?: number
  /**
   * The stop's colour in the DARK appearance. Absent ⇒ the stop looks the same
   * in both, which is the honest default for a hand-picked hex.
   *
   * For a LINKED stop this is derived, never hand-set: it is a cache of
   * `primaryDarkScale[tone]`, the same tone read off the accent's dark twin —
   * the Radix two-scale model the whole system already follows ("step N means
   * the same role in both appearances, no inversion anywhere"). That is why a
   * linked gradient gets its dark version for free: the stop is a REFERENCE, so
   * there is a second ramp to resolve it against. An unlinked stop has no ramp,
   * so its dark value is the user's own choice.
   */
  darkColor?: string
}

/** Which appearance a gradient is being resolved for. */
export type GradientAppearance = 'light' | 'dark'

/** A stop's colour in one appearance. The single place the light/dark fallback
 *  lives — a stop with no `darkColor` renders its light colour in both, so
 *  every consumer degrades the same way. */
export function stopColor(s: GradientStop, appearance: GradientAppearance = 'light'): string {
  return appearance === 'dark' ? (s.darkColor || s.color) : s.color
}

export interface GradientDef {
  id: string
  name: string
  type: GradientType
  /** Linear angle in degrees (ignored for radial). */
  angle: number
  stops: GradientStop[]
  /** True while the stops derive from the accent color (only meaningful for
   *  gradients with a derivation — see `derivedStopsFor`). Unlocking frees the
   *  stops for hand-editing; re-locking re-derives them from the current accent. */
  linked?: boolean
}

/** Which preview surfaces a gradient can drive. Extend as more targets land. */
export interface GradientAssignments {
  cover: string | null // gradient id for card covers / brand hero strips
  avatar: string | null // gradient id for solid avatars / specimens
}

// ── CSS ──────────────────────────────────────────────────────────────────────

/** The `background`-ready CSS for a gradient (stops sorted by position), in the
 *  given appearance. Defaults to light, so every pre-existing call site keeps
 *  producing exactly what it produced before. */
export function gradientToCss(g: GradientDef, appearance: GradientAppearance = 'light'): string {
  const stops = [...g.stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${stopColor(s, appearance)} ${clampPos(s.pos)}%`)
    .join(', ')
  return g.type === 'radial'
    ? `radial-gradient(circle at 30% 30%, ${stops})`
    : `linear-gradient(${Math.round(g.angle)}deg, ${stops})`
}

/** Stable export slug for a gradient (name → kebab, id fallback). */
export function gradientSlug(g: GradientDef): string {
  return slugify(g.name) || g.id
}

function clampPos(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** True when two stop lists are identical (position + case-insensitive color).
 *  Used to tell an auto-derived brand gradient from a hand-edited one, so the
 *  accent-retint and the migration only touch the untouched seeds. */
export function stopsMatch(a: GradientStop[], b: GradientStop[]): boolean {
  if (a.length !== b.length) return false
  return a.every((s, i) => s.pos === b[i].pos && s.color.toLowerCase() === b[i].color.toLowerCase())
}

// ── Accent-derived brand gradients ───────────────────────────────────────────
// The brand gradients track the chosen accent instead of a fixed violet — a
// gradient-heavy "AI tool" purple on a green brand reads as unrelated chrome.
// Both stay inside the accent's own hue family (quiet, credible), never a neon
// rainbow.

const DEFAULT_ACCENT = '#9522e9'

function hsl(hex: string): [number, number, number] {
  const [h, s, l] = chroma(hex).hsl()
  return [Number.isNaN(h) ? 0 : h, Number.isNaN(s) ? 0 : s, l]
}

/** Brand Cover — the accent, then a deeper, slightly calmer shade of the SAME
 *  hue. A single-hue descent, so it always reads as "this brand." */
export function brandCoverStops(accent: string): GradientStop[] {
  try {
    const [h, s, l] = hsl(accent)
    const deep = chroma.hsl(h, Math.min(1, s * 0.92), Math.max(0.16, l * 0.42)).hex()
    return [{ color: chroma(accent).hex(), pos: 0 }, { color: deep, pos: 100 }]
  } catch {
    return [{ color: accent, pos: 0 }, { color: accent, pos: 100 }]
  }
}

/** Aurora — a quiet three-stop kept within ±22° of the accent's hue, with a
 *  little tonal movement for life. On-brand, never a purple→magenta rainbow. */
export function brandAvatarStops(accent: string): GradientStop[] {
  try {
    const [h, s, l] = hsl(accent)
    const sat = Math.min(1, Math.max(0.45, s))
    const mk = (dh: number, ll: number) => chroma.hsl((h + dh + 360) % 360, sat, ll).hex()
    return [
      { color: mk(-22, Math.min(0.68, Math.max(0.42, l + 0.08))), pos: 0 },
      { color: chroma(accent).hex(), pos: 50 },
      { color: mk(22, Math.max(0.28, l * 0.72)), pos: 100 },
    ]
  } catch {
    return [{ color: accent, pos: 0 }, { color: accent, pos: 100 }]
  }
}

/** LEGACY — the pre-primitive stop signature. Kept ONLY for the v35→v36 and
 *  v36→v37 migration blocks, which must keep producing exactly what they always
 *  produced (migrations are append-only). Nothing live should call this; use
 *  `linkedStopsFor` instead. */
export function derivedStopsFor(id: string, accent: string): GradientStop[] | null {
  if (id === 'brand-cover') return brandCoverStops(accent)
  if (id === 'aurora') return brandAvatarStops(accent)
  return null
}

// ── Primitive-backed linking ─────────────────────────────────────────────────

/** Which accent-ramp TONES each built-in gradient reads, and where each sits.
 *  Tones follow the Radix bands: 9 is the solid (the accent verbatim), 11–12
 *  the deep text end, 7 a light border tint — so a linked gradient is always a
 *  walk along the user's own ramp, never an invented colour. */
export const LINKED_GRADIENT_TONES: Record<string, { tone: number; pos: number }[]> = {
  'brand-cover': [{ tone: 9, pos: 0 }, { tone: 12, pos: 100 }],
  aurora: [{ tone: 7, pos: 0 }, { tone: 9, pos: 50 }, { tone: 11, pos: 100 }],
}

/** True when this gradient can be accent-linked at all (the built-ins can; a
 *  user-created gradient has no defined tone signature). */
export function isLinkable(id: string): boolean {
  return id in LINKED_GRADIENT_TONES
}

/** Resolve a stop's tone against the ramp, falling back to the nearest tone
 *  present (a ramp is always 1–12, so this only guards malformed state). */
function toneColor(scale: Record<number, string> | undefined, tone: number, fallback: string): string {
  return scale?.[tone] ?? fallback
}

/**
 * A linked gradient's stops, resolved against the accent RAMP.
 *
 * `prev` is the gradient's current stops: any that already carry a `tone` are
 * preserved (tone AND position), so re-tinting the accent re-resolves the
 * user's own choices instead of resetting to the default signature — that's
 * what makes adding/moving stops possible while the gradient stays linked.
 * Pass no `prev` (or stops with no tones) to seed the default signature.
 */
export function linkedStopsFor(
  id: string,
  scale: Record<number, string> | undefined,
  prev?: GradientStop[],
  /** The accent's DARK twin. Given, every stop also caches its dark value from
   *  the SAME tone — one reference, two appearances. Omitted, `darkColor` is
   *  left off entirely and the gradient renders identically in both, which is
   *  what every pre-dark call site expects. */
  darkScale?: Record<number, string>,
): GradientStop[] | null {
  const signature = LINKED_GRADIENT_TONES[id]
  if (!signature) return null
  const fallback = scale?.[9] ?? DEFAULT_ACCENT
  const kept = prev?.filter((s) => typeof s.tone === 'number')
  const source = kept && kept.length >= 2
    ? kept.map((s) => ({ tone: s.tone as number, pos: s.pos }))
    : signature
  return source.map(({ tone, pos }) => ({
    tone,
    pos: clampPos(pos),
    color: toneColor(scale, tone, fallback),
    ...(darkScale ? { darkColor: toneColor(darkScale, tone, fallback) } : null),
  }))
}

// ── Defaults ─────────────────────────────────────────────────────────────────

/** Fresh default gradient set. Brand Cover + Aurora are derived from `accent`
 *  (defaults to the app's default violet) so a new system's gradients already
 *  match its brand; Moss Glow stays a fixed example of a non-brand gradient. */
export function makeDefaultGradients(
  accent: string = DEFAULT_ACCENT,
  /** The accent's 12-tone ramp, so a brand-new system's linked gradients are
   *  tone-backed from the first render instead of waiting for the first accent
   *  edit to convert them. Passed IN rather than generated here on purpose:
   *  this module stays dependency-free (see the file header), and importing
   *  colorUtils created a module-init cycle through the store — the generator
   *  was still undefined when `makeDesignDefaults()` ran at import time.
   *  Omitted ⇒ the legacy hex derivation, which the v45 migration then
   *  converts. */
  scale?: Record<number, string>,
  /** The accent's dark twin — same reason as `scale`, so a fresh system's
   *  linked gradients ship a dark appearance from the first render. */
  darkScale?: Record<number, string>,
): GradientDef[] {
  const ramp = scale
  return [
    {
      id: 'brand-cover',
      name: 'Brand Cover',
      type: 'linear',
      angle: 135,
      stops: (ramp && linkedStopsFor('brand-cover', ramp, undefined, darkScale)) || brandCoverStops(accent),
      linked: true,
    },
    {
      id: 'aurora',
      name: 'Aurora',
      type: 'linear',
      angle: 120,
      stops: (ramp && linkedStopsFor('aurora', ramp, undefined, darkScale)) || brandAvatarStops(accent),
      linked: true,
    },
    {
      id: 'moss-glow',
      name: 'Moss Glow',
      type: 'radial',
      angle: 0,
      stops: [
        { color: '#66c61c', pos: 0 },
        { color: '#16653a', pos: 100 },
      ],
    },
  ]
}

export function makeDefaultGradientAssignments(): GradientAssignments {
  return { cover: 'brand-cover', avatar: 'aurora' }
}

/** A blank gradient seeded from a base color — used by the "＋ New" action. */
export function makeGradient(base = DEFAULT_ACCENT): GradientDef {
  return {
    id: `grad-${Math.random().toString(36).slice(2, 8)}`,
    name: 'New gradient',
    type: 'linear',
    angle: 135,
    stops: [
      { color: base, pos: 0 },
      { color: '#111827', pos: 100 },
    ],
  }
}
