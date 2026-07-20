// Gradient foundation — a small model for named, token-exported gradients that
// can be assigned to preview surfaces (card covers, avatars) and shipped in
// tokens.json / variables.css / README. Kept dependency-free (pure data + CSS
// string builders) so the store, the editor and the exporters share one source.

import chroma from 'chroma-js'
import { slugify } from './utils'

export type GradientType = 'linear' | 'radial'

export interface GradientStop {
  /** Any CSS color the picker produces — 6- or 8-digit hex (alpha) included. */
  color: string
  /** Stop position along the gradient axis, 0–100 (%). */
  pos: number
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

/** The `background`-ready CSS for a gradient (stops sorted by position). */
export function gradientToCss(g: GradientDef): string {
  const stops = [...g.stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${clampPos(s.pos)}%`)
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

const DEFAULT_ACCENT = '#7f56d9'

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

/** The accent-derived stop signature for a gradient, or null when the gradient
 *  has no derivation (custom gradients can't be accent-linked). One resolver so
 *  the editor's lock, the accent retint and the migration all agree on what
 *  "linked" produces. */
export function derivedStopsFor(id: string, accent: string): GradientStop[] | null {
  if (id === 'brand-cover') return brandCoverStops(accent)
  if (id === 'aurora') return brandAvatarStops(accent)
  return null
}

// ── Defaults ─────────────────────────────────────────────────────────────────

/** Fresh default gradient set. Brand Cover + Aurora are derived from `accent`
 *  (defaults to the app's default violet) so a new system's gradients already
 *  match its brand; Moss Glow stays a fixed example of a non-brand gradient. */
export function makeDefaultGradients(accent: string = DEFAULT_ACCENT): GradientDef[] {
  return [
    {
      id: 'brand-cover',
      name: 'Brand Cover',
      type: 'linear',
      angle: 135,
      stops: brandCoverStops(accent),
      linked: true,
    },
    {
      id: 'aurora',
      name: 'Aurora',
      type: 'linear',
      angle: 120,
      stops: brandAvatarStops(accent),
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
export function makeGradient(base = '#7f56d9'): GradientDef {
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
