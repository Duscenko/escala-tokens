// Gradient foundation — a small model for named, token-exported gradients that
// can be assigned to preview surfaces (card covers, avatars) and shipped in
// tokens.json / variables.css / README. Kept dependency-free (pure data + CSS
// string builders) so the store, the editor and the exporters share one source.

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

// ── Defaults ─────────────────────────────────────────────────────────────────

/** Fresh default gradient set — brand-flavored, static so they never depend on
 *  a generated scale being present. */
export function makeDefaultGradients(): GradientDef[] {
  return [
    {
      id: 'brand-cover',
      name: 'Brand Cover',
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#7f56d9', pos: 0 },
        { color: '#432e73', pos: 100 },
      ],
    },
    {
      id: 'aurora',
      name: 'Aurora',
      type: 'linear',
      angle: 120,
      stops: [
        { color: '#7f56d9', pos: 0 },
        { color: '#d444f1', pos: 50 },
        { color: '#f63d68', pos: 100 },
      ],
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
