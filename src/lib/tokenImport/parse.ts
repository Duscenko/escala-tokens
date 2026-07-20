// ─── Import pipeline: JSON parse + candidate extraction ──────────────────────
// Walks arbitrary token JSON (plain nested maps, W3C DTCG $value/$type, Tokens
// Studio value/type) into a flat list of typed TokenCandidates, resolving
// {token.path} references along the way. Pure — no React, no store.

import chroma from 'chroma-js'
import type { TokenCandidate, TokenKind } from './types'

export function parseTokenSource(
  text: string,
): { ok: true; json: unknown } | { ok: false; error: string } {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Paste or drop a JSON file first.' }
  try {
    return { ok: true, json: JSON.parse(trimmed) }
  } catch (e) {
    return { ok: false, error: `Not valid JSON — ${e instanceof Error ? e.message : 'parse failed'}.` }
  }
}

// Documentation-only keys that never carry token values.
const SKIP_KEYS = new Set(['$description', '$extensions', '$schema', '$metadata', '$themes', 'description', 'comment', 'comments'])

const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FUNC_COLOR_RE = /^(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i
const NAMED_COLOR_RE = /^[a-z]{3,20}$/
const DIM_RE = /^-?\d*\.?\d+(px|rem|em)$/
const PCT_RE = /^-?\d*\.?\d+%$/
const NUM_RE = /^-?\d*\.?\d+$/
const REF_RE = /^\{[^{}]+\}$/

/** Normalize any recognizable CSS color to hex (alpha kept as #rrggbbaa). */
export function normalizeColor(value: string): string | null {
  const v = value.trim()
  const colorish = HEX_RE.test(v) || FUNC_COLOR_RE.test(v) || (NAMED_COLOR_RE.test(v) && chroma.valid(v))
  if (!colorish) return null
  try {
    return chroma(v).hex()
  } catch {
    return null
  }
}

function normalizeDimension(value: string): string {
  const n = parseFloat(value)
  if (value.endsWith('rem') || value.endsWith('em')) return `${Math.round(n * 16 * 100) / 100}px`
  return `${n}px`
}

// W3C shadow object → CSS string. Accepts both $-prefixed and bare field names.
function shadowObjectToCss(obj: Record<string, unknown>): string | null {
  const get = (k: string) => obj[k] ?? obj[`$${k}`]
  const x = get('offsetX') ?? get('x')
  const y = get('offsetY') ?? get('y')
  if (x === undefined || y === undefined) return null
  const blur = get('blur') ?? '0px'
  const spread = get('spread')
  const color = get('color') ?? 'rgba(0,0,0,0.1)'
  const dim = (v: unknown) => (typeof v === 'number' ? `${v}px` : String(v))
  const parts = [dim(x), dim(y), dim(blur)]
  if (spread !== undefined) parts.push(dim(spread))
  const hex = typeof color === 'string' ? normalizeColor(color) ?? String(color) : String(color)
  return `${parts.join(' ')} ${hex}`
}

function looksLikeShadow(value: string): boolean {
  const px = value.match(/-?\d+(\.\d+)?px/g)
  return !!px && px.length >= 2 && (/#[0-9a-f]{3,8}/i.test(value) || /rgba?\(/i.test(value) || /hsla?\(/i.test(value))
}

const FONT_KEY_RE = /font-?famil|typeface/i

interface Classified {
  kind: TokenKind
  value: string
}

function classifyLeaf(raw: unknown, hint: string | undefined, key: string): Classified | null {
  // Arrays: font stacks (strings) or layered shadows (objects).
  if (Array.isArray(raw)) {
    if (raw.every((x) => typeof x === 'string')) {
      return { kind: 'fontFamily', value: raw.join(', ') }
    }
    if (raw.every((x) => x && typeof x === 'object')) {
      const layers = raw
        .map((x) => shadowObjectToCss(x as Record<string, unknown>))
        .filter((s): s is string => !!s)
      if (layers.length) return { kind: 'shadow', value: layers.join(', ') }
    }
    return null
  }
  if (raw && typeof raw === 'object') {
    const css = shadowObjectToCss(raw as Record<string, unknown>)
    if (css) return { kind: 'shadow', value: css }
    return null // composite tokens (typography objects…) are out of scope
  }
  if (typeof raw === 'number') {
    return { kind: 'number', value: String(raw) }
  }
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v) return null

  const hintLower = hint?.toLowerCase() ?? ''
  if (hintLower.includes('fontfamily') || FONT_KEY_RE.test(key)) {
    return { kind: 'fontFamily', value: v.replace(/["']/g, '') }
  }
  const hex = normalizeColor(v)
  if (hex && (hintLower === '' || hintLower === 'color')) return { kind: 'color', value: hex }
  if (DIM_RE.test(v)) return { kind: 'dimension', value: normalizeDimension(v) }
  if (PCT_RE.test(v)) return { kind: 'percent', value: v }
  if (NUM_RE.test(v)) return { kind: 'number', value: v }
  if (hintLower === 'shadow' || hintLower === 'boxshadow' || looksLikeShadow(v)) {
    return { kind: 'shadow', value: v }
  }
  return { kind: 'string', value: v }
}

// A node is a DTCG/Tokens-Studio leaf when it wraps its value: `$value` always
// wins; bare `value` only when it's clearly a token wrapper (has a sibling
// `type` or a primitive value), so groups that merely contain a "value" child
// group aren't swallowed.
function leafValueOf(node: Record<string, unknown>): { raw: unknown; hint?: string } | null {
  if ('$value' in node) {
    return { raw: node.$value, hint: typeof node.$type === 'string' ? node.$type : undefined }
  }
  if ('value' in node) {
    const v = node.value
    if ('type' in node || typeof v !== 'object' || v === null || Array.isArray(v)) {
      return { raw: v, hint: typeof node.type === 'string' ? node.type : undefined }
    }
  }
  return null
}

interface PendingRef {
  path: string[]
  key: string
  pathStr: string
  target: string // normalized dotted target path
  hint?: string
}

function normalizeRefTarget(raw: string): string {
  return raw.replace(/[{}]/g, '').trim().toLowerCase().split(/[./]/).filter(Boolean).join('.')
}

export interface ExtractResult {
  candidates: TokenCandidate[]
  unresolvedRefs: string[]
}

export function extractCandidates(json: unknown): ExtractResult {
  const candidates: TokenCandidate[] = []
  const pending: PendingRef[] = []

  const pushLeaf = (raw: unknown, hint: string | undefined, path: string[], key: string) => {
    const pathStr = [...path, key].join('.').toLowerCase()
    if (typeof raw === 'string' && REF_RE.test(raw.trim())) {
      pending.push({ path, key, pathStr, target: normalizeRefTarget(raw), hint })
      return
    }
    const c = classifyLeaf(raw, hint, key)
    if (c) candidates.push({ path, pathStr, key, kind: c.kind, value: c.value, typeHint: hint })
  }

  const walk = (node: unknown, path: string[], depth: number) => {
    if (depth > 12 || node === null || node === undefined) return
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (item && typeof item === 'object') walk(item, [...path, String(i)], depth + 1)
      })
      return
    }
    if (typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    const leaf = leafValueOf(obj)
    if (leaf) {
      const key = path[path.length - 1] ?? 'value'
      pushLeaf(leaf.raw, leaf.hint, path.slice(0, -1), key)
      return
    }
    for (const [key, value] of Object.entries(obj)) {
      if (SKIP_KEYS.has(key) || key.startsWith('$')) continue
      if (value === null || value === undefined) continue
      if (typeof value === 'object') {
        walk(value, [...path, key], depth + 1)
      } else {
        pushLeaf(value, undefined, path, key)
      }
    }
  }

  walk(json, [], 0)

  // ── Reference resolution (multi-pass for chained aliases) ──
  const index = new Map<string, TokenCandidate>()
  for (const c of candidates) index.set(c.pathStr, c)

  const resolveTarget = (target: string): TokenCandidate | null => {
    const exact = index.get(target)
    if (exact) return exact
    // Prefix drift ({colors.x} vs stored "color.x"): accept a unique suffix match.
    const suffix = `.${target}`
    let found: TokenCandidate | null = null
    for (const [p, c] of index) {
      if (p.endsWith(suffix) || p === target) {
        if (found) return null // ambiguous
        found = c
      }
    }
    return found
  }

  const unresolved: string[] = []
  let queue = pending
  for (let pass = 0; pass < 4 && queue.length; pass++) {
    const next: PendingRef[] = []
    for (const ref of queue) {
      const target = resolveTarget(ref.target)
      if (target) {
        const cand: TokenCandidate = {
          path: ref.path,
          pathStr: ref.pathStr,
          key: ref.key,
          kind: target.kind,
          value: target.value,
          typeHint: ref.hint ?? target.typeHint,
        }
        candidates.push(cand)
        index.set(cand.pathStr, cand)
      } else {
        next.push(ref)
      }
    }
    if (next.length === queue.length) {
      // No progress — everything left is genuinely unresolvable.
      queue = next
      break
    }
    queue = next
  }
  for (const ref of queue) unresolved.push(ref.target)

  return { candidates, unresolvedRefs: unresolved }
}
