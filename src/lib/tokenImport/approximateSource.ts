// Reads product source (CSS, components) and emits a small token JSON the
// existing analyzer already understands. It does not invent a second palette:
// each family is a color the files actually contain, named so analyzeTokens
// seeds Accent / Neutral / the four states. Ramps are generated later, in
// the review step, the same way a one-color JSON import is.

import chroma from 'chroma-js'
import { normalizeColor } from './parse'

export interface ApproximateSeed {
  /** Key written into the JSON (`primary`, `gray`, `red`…). */
  slot: string
  hex: string
  /** How the seed was chosen. */
  via: 'variable' | 'frequency'
}

export type ApproximateResult =
  | { ok: true; json: Record<string, unknown>; colors: number; seeds: ApproximateSeed[] }
  | { ok: false; error: string }

const SOURCE_EXTENSIONS = new Set([
  'css', 'scss', 'less', 'tsx', 'ts', 'jsx', 'js', 'vue', 'svelte', 'html', 'mdx',
])

const SKIP_DIR = /(?:^|\/)(node_modules|dist|build|\.next|\.git|coverage|vendor)(?:\/|$)/

const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-fA-F])/g
const FUNC_RE = /(?:oklch|oklab|rgba?|hsla?)\([^)]{1,80}\)/gi
const VAR_RE = /--([A-Za-z_][\w-]*)\s*:\s*([^;}{]+)/g
const FONT_RE = /font-family\s*:\s*([^;}{]+)/i

const NAMED_SLOT: [RegExp, string][] = [
  [/\b(primary|brand|accent|main)\b/, 'primary'],
  [/\b(gray|grey|neutral|slate|stone|zinc)\b/, 'gray'],
  [/\b(error|danger|destructive|critical|red)\b/, 'red'],
  [/\b(warning|caution|amber|orange|yellow|gold)\b/, 'orange'],
  [/\b(success|positive|confirm|green)\b/, 'green'],
  [/\b(info|informative|notice|blue)\b/, 'blue'],
]

interface Hit {
  hex: string
  count: number
  l: number
  c: number
  h: number
}

function readHit(value: string): Omit<Hit, 'count'> | null {
  let alpha = 1
  try {
    alpha = chroma(value).alpha()
  } catch {
    return null
  }
  if (alpha < 0.35) return null
  const hex = normalizeColor(value)
  if (!hex) return null
  try {
    const [l, c, h] = chroma(hex).oklch()
    if (Number.isNaN(l)) return null
    return { hex: hex.slice(0, 7).toLowerCase(), l, c: Number.isNaN(c) ? 0 : c, h: Number.isNaN(h) ? 0 : h }
  } catch {
    return null
  }
}

function slotOfName(name: string): string | null {
  const hay = name.toLowerCase().replace(/[-_./]/g, ' ')
  for (const [re, slot] of NAMED_SLOT) {
    if (re.test(hay)) return slot
  }
  return null
}

/** Hue bucket for an unnamed color. Brand is whatever is not a status or a gray. */
function bucketOf(hit: Omit<Hit, 'count'>): string | null {
  if (hit.c < 0.04) return hit.l > 0.06 && hit.l < 0.94 ? 'gray' : null
  if (hit.l > 0.96 || hit.l < 0.05) return null
  const h = hit.h
  if (h >= 10 && h < 45) return 'red'
  if (h >= 45 && h < 100) return 'orange'
  if (h >= 130 && h < 180) return 'green'
  if (h >= 220 && h < 265) return 'blue'
  return 'primary'
}

function add(map: Map<string, Hit>, sample: Omit<Hit, 'count'>, weight: number) {
  const prev = map.get(sample.hex)
  if (prev) prev.count += weight
  else map.set(sample.hex, { ...sample, count: weight })
}

/** Prefer a mid, saturated use of the color over a pale tint that happens to be copied more. */
function pickSolid(hits: Hit[]): Hit {
  const ranked = [...hits].sort((a, b) => b.count - a.count)
  const top = ranked[0]
  const mid = ranked.find((h) => h.l >= 0.32 && h.l <= 0.78 && h.count >= top.count * 0.2)
  return mid ?? top
}

function pickGray(hits: Hit[]): Hit {
  const ranked = [...hits].sort((a, b) => b.count - a.count)
  const mid = ranked.find((h) => h.l >= 0.35 && h.l <= 0.75)
  if (mid) return mid
  return ranked.reduce((best, h) => (Math.abs(h.l - 0.55) < Math.abs(best.l - 0.55) ? h : best))
}

/** Turn source text into token JSON. `name` becomes `project` in that JSON. */
export function approximateSource(text: string, name = 'From code'): ApproximateResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Drop source files or paste component code first.' }

  // Pull named variables out of the loose scan so a --color-primary isn't
  // also counted as an anonymous hex.
  const rest = trimmed.replace(VAR_RE, (full, rawName: string, rawValue: string) => {
    const slot = slotOfName(rawName)
    const sample = readHit(rawValue)
    return slot && sample ? ' ' : full
  })

  const loose = new Map<string, Hit>()
  const take = (raw: string) => {
    const sample = readHit(raw)
    if (sample) add(loose, sample, 1)
  }
  for (const m of rest.matchAll(HEX_RE)) take(m[0])
  for (const m of rest.matchAll(FUNC_RE)) take(m[0])

  const buckets = new Map<string, Hit[]>()
  for (const hit of loose.values()) {
    const slot = bucketOf(hit)
    if (!slot) continue
    const list = buckets.get(slot) ?? []
    list.push(hit)
    buckets.set(slot, list)
  }

  const seeds: ApproximateSeed[] = []
  const colors: Record<string, string> = {}
  const claim = (slot: string, hit: Hit, via: ApproximateSeed['via']) => {
    if (colors[slot]) return
    colors[slot] = hit.hex
    seeds.push({ slot, hex: hit.hex, via })
  }

  // Named variables win their slot. One slot, the strongest declaration.
  const namedBySlot = new Map<string, Hit>()
  for (const m of trimmed.matchAll(VAR_RE)) {
    const slot = slotOfName(m[1])
    const sample = readHit(m[2])
    if (!slot || !sample) continue
    const prev = namedBySlot.get(slot)
    if (!prev || sample.c > prev.c) namedBySlot.set(slot, { ...sample, count: 8 })
  }
  for (const [slot, hit] of namedBySlot) claim(slot, hit, 'variable')

  for (const [slot, hits] of buckets) {
    if (colors[slot]) continue
    claim(slot, slot === 'gray' ? pickGray(hits) : pickSolid(hits), 'frequency')
  }

  if (!colors.primary && !colors.gray && !colors.red && !colors.green && !colors.blue && !colors.orange) {
    return { ok: false, error: 'No colors found. This reads hex, rgb, hsl and CSS color variables — not Tailwind class names like bg-red-500.' }
  }

  const json: Record<string, unknown> = { project: name, colors }
  const font = trimmed.match(FONT_RE)?.[1]
  if (font) {
    const family = font.split(',')[0]?.trim().replace(/["']/g, '')
    if (family && !/^(inherit|initial|unset|var\()/.test(family)) json.fontFamily = family
  }

  const colorCount = loose.size + namedBySlot.size
  return { ok: true, json, colors: colorCount, seeds }
}

export function isSourceFile(path: string): boolean {
  if (SKIP_DIR.test(path)) return false
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return SOURCE_EXTENSIONS.has(ext)
}
