// ─── Import pipeline: heuristic analysis ─────────────────────────────────────
// Turns arbitrary parsed token JSON into an ImportAnalysis: color ramps
// normalized onto our 1–12 taxonomy, families classified (keyword → hue),
// semantic keys mapped onto the role taxonomy, foundations detected by
// container names, plus an issues list that powers the review step's
// "Organize & normalize" offer. Pure — no React, no store access.

import chroma from 'chroma-js'
import { generateColorScale, NAMING_SCHEMES } from '../colorUtils'
import { ALL_ROLES } from '../semanticRoles'
import { GRID_DEFAULT } from '../../store/useDesignStore'
import { FONT_SIZE_STANDARD, LINE_HEIGHT_STANDARD } from '../typographyStandard'
import { extractCandidates } from './parse'
import { matchRole, matchCandidateRole, type RoleMatch } from './aliases'
import type {
  AnalyzeResult, FamilyPick, FoundationKey, FoundationReport, ImportAnalysis,
  ImportFamilyKey, ImportIssue, MappedSemantic, TokenCandidate, TypographyPick,
} from './types'

const VIA_RANK = { exact: 0, legacy: 1, alias: 2, pattern: 3 } as const

const ROLE_BY_KEY = new Map(ALL_ROLES.map((r) => [r.key, r]))

function lightnessOf(hex: string): number {
  try {
    const l = chroma(hex).oklch()[0]
    return Number.isNaN(l) ? 0.5 : l
  } catch {
    return 0.5
  }
}

function chromaOf(hex: string): number {
  try {
    const c = chroma(hex).oklch()[1]
    return Number.isNaN(c) ? 0 : c
  } catch {
    return 0
  }
}

function hueOf(hex: string): number {
  try {
    const h = chroma(hex).oklch()[2]
    return Number.isNaN(h) ? -1 : h
  } catch {
    return -1
  }
}

// ── Theme container detection ───────────────────────────────────────────────

const DARK_SEGMENT = /^(dark|night|dark-?mode|semanticdark|\.dark)$/
const LIGHT_SEGMENT = /^(light|day|light-?mode|default)$/

function themeOf(c: TokenCandidate): 'light' | 'dark' | null {
  for (const seg of c.path) {
    const s = seg.toLowerCase()
    if (DARK_SEGMENT.test(s)) return 'dark'
    if (LIGHT_SEGMENT.test(s)) return 'light'
  }
  if (/dark$/.test(c.key.toLowerCase()) && c.key.toLowerCase() !== 'dark') return null
  return null
}

// ── Ramp detection ──────────────────────────────────────────────────────────

const SHADE_WORDS: Record<string, number> = {
  lightest: 1, lighter: 2, light: 3,
  base: 5, default: 5, main: 5, medium: 5, regular: 5,
  dark: 7, darker: 8, darkest: 9,
}

interface RampEntry {
  pos: number
  hex: string
  cand: TokenCandidate
}

interface RampGroup {
  name: string
  path: string[]
  entries: RampEntry[]
}

// Split a leaf key into (base name, ramp position): pure numeric keys take
// their parent group's name; suffixed keys ("primary-500", "primary500")
// carry their own; shade words map to fixed ordinals.
function rampSplit(c: TokenCandidate): { name: string; pos: number } | null {
  const key = c.key.toLowerCase()
  if (/^\d{1,4}$/.test(key)) {
    const parent = c.path[c.path.length - 1] ?? 'color'
    return { name: parent.toLowerCase(), pos: Number(key) }
  }
  const m = key.match(/^(.+?)[-_ ]?(\d{2,4})$/)
  if (m) return { name: m[1].replace(/[-_ ]+$/, ''), pos: Number(m[2]) }
  if (key in SHADE_WORDS) {
    const parent = c.path[c.path.length - 1] ?? 'color'
    return { name: parent.toLowerCase(), pos: SHADE_WORDS[key] }
  }
  return null
}

interface NormalizedRamp {
  scale: Record<number, string>
  baseHex: string
  preservedTones: number[]
  monotonic: boolean
}

// Resample an N-step detected ramp onto our 1–12 ColorScale: generate a full
// candidate ramp from the anchor, then let every detected hex claim the
// generated tone with the nearest OKLCH lightness — detected values survive
// verbatim, unclaimed tones keep generated fills.
function normalizeRamp(entries: RampEntry[]): NormalizedRamp {
  const sorted = [...entries].sort((a, b) => a.pos - b.pos)
  const Ls = sorted.map((e) => lightnessOf(e.hex))
  // Orientation: our tone 1 is the lightest. If lightness rises with the
  // position number the ramp is dark-first — flip it.
  let rising = 0
  for (let i = 1; i < Ls.length; i++) if (Ls[i] > Ls[i - 1]) rising++
  const oriented = rising > (Ls.length - 1) / 2 ? [...sorted].reverse() : sorted
  const orientedLs = oriented.map((e) => lightnessOf(e.hex))
  let violations = 0
  for (let i = 1; i < orientedLs.length; i++) if (orientedLs[i] > orientedLs[i - 1]) violations++

  // Exactly 12 steps → positional identity, nothing to resample.
  if (oriented.length === 12) {
    const scale: Record<number, string> = {}
    oriented.forEach((e, i) => { scale[i + 1] = e.hex })
    return { scale, baseHex: scale[9], preservedTones: Array.from({ length: 12 }, (_, i) => i + 1), monotonic: violations <= 1 }
  }

  // Anchor: the conventional "solid" step (500, else 600), else the middle.
  const anchor =
    sorted.find((e) => e.pos === 500) ??
    sorted.find((e) => e.pos === 600) ??
    oriented[Math.floor(oriented.length / 2)]
  const generated = generateColorScale(anchor.hex, 'radix', 0, '#ffffff', 'light')
  const scale: Record<number, string> = { ...generated }
  const genL: Record<number, number> = {}
  for (let t = 1; t <= 12; t++) genL[t] = lightnessOf(generated[t])

  const claimed = new Set<number>()
  for (const e of oriented) {
    const L = lightnessOf(e.hex)
    let best = -1
    let bestD = Infinity
    for (let t = 1; t <= 12; t++) {
      if (claimed.has(t)) continue
      const d = Math.abs(L - genL[t])
      if (d < bestD) { bestD = d; best = t }
    }
    if (best !== -1) {
      claimed.add(best)
      scale[best] = e.hex
    }
  }
  const preserved = [...claimed].sort((a, b) => a - b)
  return { scale, baseHex: scale[9], preservedTones: preserved, monotonic: violations <= 1 }
}

// ── Family classification ───────────────────────────────────────────────────

const FAMILY_KEYWORDS: [ImportFamilyKey, RegExp][] = [
  ['error', /\b(error|danger|destructive|critical|negative|red)\b/],
  ['warning', /\b(warning|caution|attention|amber|orange|yellow|gold)\b/],
  ['success', /\b(success|positive|confirm|green)\b/],
  ['info', /\b(info|informative|notice|blue)\b/],
  ['neutral', /\b(gray|grey|neutral|slate|stone|zinc)\b/],
  ['accent', /\b(primary|brand|accent|main)\b/],
]

const NEUTRAL_STEM_RE = /\b(gray|grey|neutral|slate|stone|zinc)\b/

// Variant suffix parsing for the merge/fix pass: Radix-style exports ship each
// hue several times ("red-light", "red-dark", "red-light-alpha"…) — one family
// per appearance × alpha. We collapse them onto the stem.
function parseVariant(name: string): { stem: string; appearance: 'light' | 'dark' | null; alpha: boolean } {
  let stem = name.toLowerCase()
  let alpha = false
  let appearance: 'light' | 'dark' | null = null
  const alphaM = stem.match(/^(.*?)[-_ ](alpha|a)$/)
  if (alphaM && alphaM[1]) {
    stem = alphaM[1]
    alpha = true
  }
  const appM = stem.match(/^(.*?)[-_ ](light|dark)$/)
  if (appM && appM[1]) {
    stem = appM[1]
    appearance = appM[2] as 'light' | 'dark'
  }
  return { stem, appearance, alpha }
}

function keywordFamily(name: string, path: string[]): ImportFamilyKey | null {
  const haystack = `${path.join(' ')} ${name}`.toLowerCase().replace(/[-_./]/g, ' ')
  for (const [fam, re] of FAMILY_KEYWORDS) {
    if (re.test(haystack)) return fam
  }
  return null
}

function hueFamily(baseHex: string): ImportFamilyKey | null {
  if (chromaOf(baseHex) < 0.03) return 'neutral'
  const h = hueOf(baseHex)
  if (h < 0) return null
  if (h >= 10 && h < 45) return 'error'
  if (h >= 45 && h < 100) return 'warning'
  if (h >= 130 && h < 180) return 'success'
  if (h >= 220 && h < 290) return 'info'
  return null
}

// ── Foundations ─────────────────────────────────────────────────────────────

const FOUNDATION_CONTAINERS: [Exclude<FoundationKey, 'typography'>, RegExp][] = [
  ['spacing', /^(spacing|space|spaces|gap|gaps)$/],
  ['radius', /^(radius|radii|border-?radius|corner|corners|rounded)$/],
  ['opacity', /^(opacity|opacities|alpha)$/],
  ['shadows', /^(shadow|shadows|elevation|elevations|box-?shadow)$/],
  ['sizes', /^(sizes|sizing|heights|component-?sizes?)$/],
  ['grid', /^(grid|layout|breakpoints|screens)$/],
]

const WEIGHT_NAME_MAP: Record<string, string> = {
  thin: 'regular', light: 'regular', normal: 'regular', regular: 'regular', book: 'regular',
  medium: 'medium', semibold: 'semibold', demibold: 'semibold',
  bold: 'bold', extrabold: 'bold', heavy: 'bold', black: 'bold',
}

function emptyFoundations(): Record<FoundationKey, FoundationReport> {
  const mk = (): FoundationReport => ({ status: 'default', count: 0, values: {} })
  return {
    spacing: mk(), radius: mk(), opacity: mk(), shadows: mk(),
    grid: mk(), sizes: mk(), typography: mk(),
  }
}

// ── Escala fast-path ────────────────────────────────────────────────────────

function isEscalaExport(json: unknown): json is Record<string, any> {
  if (!json || typeof json !== 'object') return false
  const j = json as Record<string, any>
  return typeof j.schemaVersion === 'number' && !!j.colors && typeof j.colors.primitive === 'object'
}

// Our export names tones per the chosen naming scheme (1–12 / 50–1000 / 10–120).
// Detect which scheme fits the primitive key set best, then invert it.
function detectLabelMap(labels: string[]): Map<string, number> {
  let best = NAMING_SCHEMES[0]
  let bestHits = -1
  for (const scheme of NAMING_SCHEMES) {
    const set = new Set(scheme.labels)
    const hits = labels.filter((l) => set.has(l)).length
    if (hits > bestHits) { bestHits = hits; best = scheme }
  }
  return new Map(best.labels.map((l, i) => [l, i + 1]))
}

function analyzeEscala(json: Record<string, any>): ImportAnalysis {
  const issues: ImportIssue[] = []
  const primitive: Record<string, string> = json.colors.primitive ?? {}

  // Split "family-label" keys (label = tone under the detected naming scheme).
  const rawLabels = Object.keys(primitive)
    .map((k) => k.match(/-(\d{1,4})$/)?.[1])
    .filter((l): l is string => !!l)
  const labelMap = detectLabelMap(rawLabels)
  const scales = new Map<string, Record<number, string>>()
  for (const [key, hex] of Object.entries(primitive)) {
    if (typeof hex !== 'string' || key.includes('/')) continue // theme-palette namespaces: out of scope
    const m = key.match(/^(.*)-(\d{1,4})$/)
    if (!m) continue
    const tone = labelMap.get(m[2])
    if (!tone) continue
    const fam = m[1]
    if (!scales.has(fam)) scales.set(fam, {})
    scales.get(fam)![tone] = hex
  }

  const pick = (name: string): FamilyPick | undefined => {
    const scale = scales.get(name)
    if (!scale || !Object.keys(scale).length) return undefined
    const tones = Object.keys(scale).map(Number).sort((a, b) => a - b)
    return {
      name,
      scale,
      baseHex: scale[9] ?? scale[tones[tones.length - 1]],
      coverage: tones.length / 12,
      preservedTones: tones,
      source: 'ramp',
    }
  }

  const families: ImportAnalysis['families'] = {
    accent: pick('accent'),
    neutral: pick('neutral'),
    grayDark: pick('neutral-dark'),
    error: pick('error'),
    warning: pick('warning'),
    success: pick('success'),
    info: pick('info'),
    custom: [...scales.keys()]
      .filter((n) => !['accent', 'neutral', 'neutral-dark', 'error', 'warning', 'success', 'info'].includes(n))
      .map((n) => pick(n)!)
      .filter(Boolean),
  }

  // Themes — light/dark only; extra themes are reported, not imported.
  const themes = json.colors.themes ?? {}
  const lightMap: Record<string, string> = themes.light ?? json.colors.semantic ?? {}
  const darkMap: Record<string, string> = themes.dark ?? json.colors.semanticDark ?? {}
  const extraThemes = Object.keys(themes).filter((t) => t !== 'light' && t !== 'dark')
  if (extraThemes.length) {
    issues.push({ kind: 'ignored-content', message: `Custom themes not imported: ${extraThemes.join(', ')} (light/dark only in v1).` })
  }
  const mapped: MappedSemantic[] = []
  const unmapped: { pathStr: string; hex: string }[] = []
  const mapTheme = (map: Record<string, string>, theme: 'light' | 'dark') => {
    for (const [k, v] of Object.entries(map)) {
      if (typeof v !== 'string' || !v) continue
      const m: RoleMatch | null = matchRole(k)
      if (m) mapped.push({ theme, roleKey: m.roleKey, hex: v, via: m.via, sourceKey: `colors.themes.${theme}.${k}`, onRamp: true })
      else unmapped.push({ pathStr: `colors.themes.${theme}.${k}`, hex: v })
    }
  }
  mapTheme(lightMap, 'light')
  mapTheme(darkMap, 'dark')

  // Foundations — verbatim records.
  const foundations = emptyFoundations()
  const adopt = (key: Exclude<FoundationKey, 'typography'>, rec: unknown) => {
    if (!rec || typeof rec !== 'object') return
    const values: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec as Record<string, unknown>)) {
      if (typeof v === 'string') values[k] = v
    }
    if (Object.keys(values).length) {
      foundations[key] = { status: 'detected', count: Object.keys(values).length, values }
    }
  }
  adopt('spacing', json.spacing)
  adopt('radius', json.radius)
  adopt('opacity', json.opacity)
  adopt('shadows', json.shadows)
  adopt('grid', json.grid)
  adopt('sizes', json.sizes)

  const typography: TypographyPick = {}
  if (json.typography && typeof json.typography === 'object') {
    const t = json.typography
    if (typeof t.fontFamily === 'string') typography.fontFamily = t.fontFamily
    if (typeof t.headingFontFamily === 'string') typography.headingFontFamily = t.headingFontFamily
    if (t.weights && typeof t.weights === 'object') typography.weights = { ...t.weights }
    if (t.sizes && typeof t.sizes === 'object') typography.sizes = { ...t.sizes }
    if (t.lineHeights && typeof t.lineHeights === 'object') typography.lineHeights = { ...t.lineHeights }
    const count = Object.keys(typography.sizes ?? {}).length + Object.keys(typography.weights ?? {}).length + (typography.fontFamily ? 1 : 0)
    foundations.typography = { status: count ? 'detected' : 'default', count, values: {} }
  }

  const colorCount = Object.keys(primitive).length + mapped.length
  return {
    sourceName: typeof json.project === 'string' ? json.project : null,
    fastPath: 'escala',
    families,
    semantics: {
      themesDetected: [
        ...(Object.keys(lightMap).length ? (['light'] as const) : []),
        ...(Object.keys(darkMap).length ? (['dark'] as const) : []),
      ],
      mapped,
      unmapped,
    },
    foundations,
    typography,
    backgrounds: {
      page: typeof json.colors.background === 'string' ? json.colors.background : undefined,
      dark: typeof darkMap['surface-0'] === 'string' ? darkMap['surface-0'] : undefined,
    },
    issues,
    stats: { totalTokens: colorCount + Object.values(foundations).reduce((n, f) => n + f.count, 0), colors: colorCount },
  }
}

// ── Generic heuristic analysis ──────────────────────────────────────────────

export interface AnalyzeOptions {
  /**
   * Merge/fix pass (default true): collapse light/dark/alpha ramp variants
   * into one family per stem — alpha twins are skipped (Escala regenerates
   * them) and a dark neutral variant becomes the dark-appearance gray ramp.
   */
  consolidate?: boolean
}

export function analyzeTokens(json: unknown, opts?: AnalyzeOptions): AnalyzeResult {
  if (!json || typeof json !== 'object') {
    return { ok: false, error: 'The JSON root must be an object of token groups.' }
  }
  if (isEscalaExport(json)) {
    return { ok: true, analysis: analyzeEscala(json) }
  }

  const { candidates, unresolvedRefs } = extractCandidates(json)
  if (!candidates.length) {
    return { ok: false, error: 'No recognizable tokens found — expected colors, dimensions or shadows.' }
  }

  const issues: ImportIssue[] = []
  if (unresolvedRefs.length) {
    const preview = [...new Set(unresolvedRefs)].slice(0, 3).join(', ')
    issues.push({ kind: 'unresolved-reference', message: `${unresolvedRefs.length} token reference${unresolvedRefs.length > 1 ? 's' : ''} couldn't be resolved (${preview}…) and were skipped.` })
  }

  const colors = candidates.filter((c) => c.kind === 'color')

  // Strong role matches (exact/legacy) are semantic by definition — they never
  // join a ramp even when their key ends in a digit (surface-0, surface-1…).
  const strongRole = new Map<TokenCandidate, RoleMatch>()
  for (const c of colors) {
    const m = matchCandidateRole(c.path, c.key)
    if (m && (m.via === 'exact' || m.via === 'legacy')) strongRole.set(c, m)
  }

  // ── Ramps ──
  const groups = new Map<string, RampGroup>()
  const inRamp = new Set<TokenCandidate>()
  for (const c of colors) {
    if (strongRole.has(c)) continue
    const split = rampSplit(c)
    if (!split) continue
    const gKey = `${c.path.join('.').toLowerCase()}|${split.name}`
    if (!groups.has(gKey)) groups.set(gKey, { name: split.name, path: c.path, entries: [] })
    groups.get(gKey)!.entries.push({ pos: split.pos, hex: c.value, cand: c })
  }
  const ramps: { group: RampGroup; norm: NormalizedRamp }[] = []
  for (const g of groups.values()) {
    const distinct = new Set(g.entries.map((e) => e.pos))
    if (distinct.size < 3) continue
    // Dedupe positions (first wins) before normalizing.
    const seen = new Set<number>()
    g.entries = g.entries.filter((e) => (seen.has(e.pos) ? false : (seen.add(e.pos), true)))
    const norm = normalizeRamp(g.entries)
    if (!norm.monotonic) {
      issues.push({ kind: 'non-monotonic-ramp', message: `The "${g.name}" ramp isn't ordered light→dark; it was re-sorted by lightness.` })
    }
    ramps.push({ group: g, norm })
    for (const e of g.entries) inRamp.add(e.cand)
  }

  // ── Merge/fix pass: collapse light/dark/alpha variants onto their stem ──
  // A Radix-style file ships "red-light", "red-dark", "red-light-alpha"… as
  // separate ramps; without this pass each became its own custom family.
  const consolidate = opts?.consolidate !== false
  interface Classifiable { group: RampGroup; norm: NormalizedRamp; label: string }
  let classifiable: Classifiable[] = ramps.map((r) => ({ ...r, label: r.group.name }))
  let grayDarkPick: FamilyPick | undefined
  let mergeStats: ImportAnalysis['merge']
  if (consolidate && ramps.length > 1) {
    interface Variant { group: RampGroup; norm: NormalizedRamp; appearance: 'light' | 'dark' | null; alpha: boolean }
    const stems = new Map<string, Variant[]>()
    for (const r of ramps) {
      const { stem, appearance, alpha } = parseVariant(r.group.name)
      // Ramps whose values are mostly translucent are alpha twins even when
      // the name doesn't say so.
      const valueAlpha = r.group.entries.filter((e) => /^#[0-9a-f]{8}$/i.test(e.hex) && !/ff$/i.test(e.hex)).length > r.group.entries.length / 2
      const key = stem || r.group.name.toLowerCase()
      if (!stems.has(key)) stems.set(key, [])
      stems.get(key)!.push({ group: r.group, norm: r.norm, appearance, alpha: alpha || valueAlpha })
    }
    let alphaDropped = 0
    const picked: Classifiable[] = []
    for (const [stem, variants] of stems) {
      const solid = variants.filter((v) => !v.alpha)
      alphaDropped += variants.length - solid.length
      const canonical =
        solid.find((v) => v.appearance === 'light') ??
        solid.find((v) => v.appearance === null) ??
        solid[0] ?? variants[0]
      // The neutral stem's dark variant IS our dark-appearance gray ramp.
      const darkTwin = solid.find((v) => v.appearance === 'dark' && v !== canonical)
      if (darkTwin && NEUTRAL_STEM_RE.test(stem)) {
        grayDarkPick = {
          name: `${stem}-dark`,
          scale: darkTwin.norm.scale,
          baseHex: darkTwin.norm.baseHex,
          coverage: darkTwin.norm.preservedTones.length / 12,
          preservedTones: darkTwin.norm.preservedTones,
          source: 'ramp',
        }
      }
      picked.push({ group: canonical.group, norm: canonical.norm, label: stem })
    }
    const merged = ramps.length - picked.length
    if (merged > 0) {
      mergeStats = { variantsMerged: merged, alphaDropped, families: picked.length }
      issues.push({
        kind: 'merged-variants',
        message: `Merged ${ramps.length} ramp variants (light/dark/alpha) into ${picked.length} families — alpha twins are skipped because Escala regenerates them against your page background${grayDarkPick ? '; the dark neutral became your dark-appearance ramp' : ''}.`,
      })
      classifiable = picked
    }
  }

  // ── Classify ramps into families ──
  const families: ImportAnalysis['families'] = { custom: [] }
  if (grayDarkPick) families.grayDark = grayDarkPick
  const assignFamily = (fam: ImportFamilyKey, pickVal: FamilyPick): boolean => {
    if (families[fam]) return false
    families[fam] = pickVal
    return true
  }
  const toPick = (c: Classifiable): FamilyPick => ({
    name: c.label,
    scale: c.norm.scale,
    baseHex: c.norm.baseHex,
    coverage: c.norm.preservedTones.length / 12,
    preservedTones: c.norm.preservedTones,
    source: 'ramp',
  })

  const unassigned: Classifiable[] = []
  // Pass 1 — keywords. A second accent-flavored family becomes "accent-2"
  // (then accent-3…) instead of keeping a name that collides with the slot.
  let accentExtra = 2
  for (const r of classifiable) {
    const fam = keywordFamily(r.label, r.group.path)
    if (fam && assignFamily(fam, toPick(r))) continue
    if (fam === 'accent') {
      const alias = `accent-${accentExtra++}`
      issues.push({ kind: 'duplicate-family', message: `"${r.label}" also reads as accent — kept "${families.accent!.name}" as Accent, imported "${r.label}" as "${alias}".` })
      families.custom.push({ ...toPick(r), name: alias })
      continue
    }
    if (fam) {
      issues.push({ kind: 'duplicate-family', message: `"${r.label}" also reads as ${fam} — kept "${families[fam]!.name}", imported "${r.label}" as a custom family.` })
      families.custom.push(toPick(r))
      continue
    }
    unassigned.push(r)
  }
  // Pass 2 — hue fallback for still-empty slots.
  const stillUnassigned: typeof unassigned = []
  for (const r of unassigned) {
    const fam = hueFamily(r.norm.baseHex)
    if (fam && assignFamily(fam, toPick(r))) continue
    stillUnassigned.push(r)
  }
  // Pass 3 — no accent yet: the most chromatic remaining ramp wins.
  if (!families.accent && stillUnassigned.length) {
    let best = stillUnassigned[0]
    let bestC = -1
    for (const r of stillUnassigned) {
      const avgC = Object.values(r.norm.scale).reduce((s, h) => s + chromaOf(h), 0) / 12
      if (avgC > bestC) { bestC = avgC; best = r }
    }
    assignFamily('accent', toPick(best))
    stillUnassigned.splice(stillUnassigned.indexOf(best), 1)
  }
  for (const r of stillUnassigned) families.custom.push(toPick(r))

  // ── Semantics ──
  const themesSeen = new Set<'light' | 'dark'>()
  const mappedByKey = new Map<string, MappedSemantic>()
  const unmapped: { pathStr: string; hex: string }[] = []
  for (const c of colors) {
    if (inRamp.has(c)) continue
    const m = strongRole.get(c) ?? matchCandidateRole(c.path, c.key)
    const theme = themeOf(c) ?? 'light'
    if (m) {
      themesSeen.add(theme)
      const id = `${theme}:${m.roleKey}`
      const existing = mappedByKey.get(id)
      if (!existing || VIA_RANK[m.via] < VIA_RANK[existing.via]) {
        mappedByKey.set(id, { theme, roleKey: m.roleKey, hex: c.value, via: m.via, sourceKey: c.pathStr, onRamp: false })
      }
    } else {
      unmapped.push({ pathStr: c.pathStr, hex: c.value })
    }
  }
  let mapped = [...mappedByKey.values()]

  // Backfill primitives from mapped solids when a family slot is still empty —
  // "primary: #7c3aed" maps to action-primary AND seeds the accent ramp.
  const seedFromRole = (fam: ImportFamilyKey, roleKey: string) => {
    if (families[fam]) return
    const m = mapped.find((x) => x.theme === 'light' && x.roleKey === roleKey)
    if (!m) return
    families[fam] = {
      name: m.sourceKey.split('.').pop() ?? fam,
      scale: generateColorScale(m.hex, 'radix', 0, '#ffffff', 'light'),
      baseHex: m.hex,
      coverage: 1 / 12,
      preservedTones: [9],
      source: 'singleton',
    }
  }
  seedFromRole('accent', 'action-primary')
  seedFromRole('error', 'status-error')
  seedFromRole('warning', 'status-warning')
  seedFromRole('success', 'status-success')
  seedFromRole('info', 'status-info')

  // Singleton family bases: an unmapped color whose name IS a family keyword
  // ("gray": "#888") seeds that family when the slot is still empty.
  const stillUnmapped: typeof unmapped = []
  for (const u of unmapped) {
    const name = u.pathStr.split('.').pop() ?? ''
    const fam = keywordFamily(name, [])
    if (fam && !families[fam]) {
      families[fam] = {
        name,
        scale: generateColorScale(u.hex, 'radix', 0, '#ffffff', 'light'),
        baseHex: u.hex,
        coverage: 1 / 12,
        preservedTones: [9],
        source: 'singleton',
      }
    } else {
      stillUnmapped.push(u)
    }
  }

  // onRamp check now that families are final.
  const familyForScale: Record<string, FamilyPick | undefined> = {
    gray: families.neutral, brand: families.accent, error: families.error,
    warning: families.warning, success: families.success, info: families.info,
  }
  let offRamp = 0
  mapped = mapped.map((m) => {
    const role = ROLE_BY_KEY.get(m.roleKey)
    const fam = role ? familyForScale[role.scale] : undefined
    if (!fam) return m
    const on = Object.values(fam.scale).some((h) => h.toLowerCase() === m.hex.toLowerCase())
    if (!on && m.theme === 'light') offRamp++
    return { ...m, onRamp: on }
  })
  if (offRamp) {
    issues.push({ kind: 'off-ramp-semantic', message: `${offRamp} semantic value${offRamp > 1 ? 's' : ''} don't sit on their family ramp — normalizing snaps them to the nearest recommended tone.` })
  }
  const partial = [families.accent, families.neutral, families.error, families.warning, families.success, families.info, ...families.custom]
    .filter((f): f is FamilyPick => !!f && f.source === 'ramp' && f.coverage < 1)
  if (partial.length) {
    issues.push({ kind: 'partial-ramp', message: `${partial.length} ramp${partial.length > 1 ? 's' : ''} arrived with fewer than 12 tones — missing tones were generated from the ramp's base.` })
  }
  if (stillUnmapped.length) {
    const preview = stillUnmapped.slice(0, 3).map((u) => u.pathStr).join(', ')
    issues.push({ kind: 'unmapped-semantic', message: `${stillUnmapped.length} color token${stillUnmapped.length > 1 ? 's' : ''} didn't match any role (${preview}…) and won't be imported.` })
  }

  // ── Foundations ──
  const foundations = emptyFoundations()
  const buckets: Record<Exclude<FoundationKey, 'typography'>, Record<string, string>> = {
    spacing: {}, radius: {}, opacity: {}, shadows: {}, grid: {}, sizes: {},
  }
  const foundationOf = (c: TokenCandidate): Exclude<FoundationKey, 'typography'> | null => {
    for (const seg of c.path) {
      const s = seg.toLowerCase()
      for (const [key, re] of FOUNDATION_CONTAINERS) {
        if (re.test(s)) return key
      }
    }
    return null
  }
  const weightNames: Record<string, number> = {}
  const fontSizes: Record<string, string> = {}
  const lineHeights: Record<string, string> = {}
  const typography: TypographyPick = {}

  for (const c of candidates) {
    if (c.kind === 'color') continue
    const lowerPath = c.path.map((p) => p.toLowerCase())
    const key = c.key.toLowerCase()

    if (c.kind === 'fontFamily') {
      const clean = c.value.split(',')[0].trim().replace(/["']/g, '')
      if (/heading|display|title/.test(`${lowerPath.join(' ')} ${key}`)) {
        typography.headingFontFamily = typography.headingFontFamily ?? clean
      } else {
        typography.fontFamily = typography.fontFamily ?? clean
      }
      continue
    }
    // Font weights: numbers 100–900 keyed by a weight name.
    if (c.kind === 'number') {
      const n = Number(c.value)
      const wname = WEIGHT_NAME_MAP[key]
      if (wname && n >= 100 && n <= 900 && (lowerPath.some((p) => /weight/.test(p)) || Number.isInteger(n / 100))) {
        weightNames[wname] = n
        continue
      }
    }
    // Type scale: dimensions under font-size / line-height containers.
    if (c.kind === 'dimension') {
      if (lowerPath.some((p) => /^(font-?sizes?|fontsize|text-?sizes?)$/.test(p))) {
        fontSizes[key] = c.value
        continue
      }
      if (lowerPath.some((p) => /^(line-?heights?|lineheight|leading)$/.test(p))) {
        lineHeights[key] = c.value
        continue
      }
    }

    const fkey = foundationOf(c)
    if (!fkey) continue
    if (fkey === 'opacity') {
      if (c.kind === 'percent') buckets.opacity[key] = c.value
      else if (c.kind === 'number') {
        const n = Number(c.value)
        buckets.opacity[key] = n <= 1 ? `${Math.round(n * 100)}%` : `${n}%`
      }
      continue
    }
    if (fkey === 'shadows') {
      if (c.kind === 'shadow' || c.kind === 'string') buckets.shadows[key] = c.value
      continue
    }
    if (fkey === 'grid') {
      const isBp = lowerPath.some((p) => /^(breakpoints|screens)$/.test(p))
      const gk = isBp && !key.startsWith('breakpoint-') ? `breakpoint-${key}` : key
      if (c.kind === 'dimension') buckets.grid[gk] = c.value
      else if (c.kind === 'number' && /columns?/.test(gk)) buckets.grid[gk] = c.value
      else if (c.kind === 'number') buckets.grid[gk] = `${c.value}px`
      continue
    }
    // spacing / radius / sizes — dimensions (bare numbers read as px).
    if (c.kind === 'dimension') buckets[fkey][key] = c.value
    else if (c.kind === 'number') buckets[fkey][key] = `${c.value}px`
  }

  // Radius: normalize the pill/circle step onto our 'full' key.
  for (const k of Object.keys(buckets.radius)) {
    if (/^(pill|circle|round)$/.test(k)) {
      buckets.radius.full = buckets.radius[k]
      delete buckets.radius[k]
    }
  }

  for (const [key, values] of Object.entries(buckets) as [Exclude<FoundationKey, 'typography'>, Record<string, string>][]) {
    const count = Object.keys(values).length
    if (count >= 3) {
      // Grid merges over defaults (partial columns/gutter/breakpoints are the
      // norm); the rest replace their default record wholesale.
      foundations[key] = {
        status: 'detected',
        count,
        values: key === 'grid' ? { ...GRID_DEFAULT, ...values } : values,
      }
    }
  }

  // Type scale adoption: ≥60% of incoming keys must land on our standard names.
  const adoptScale = (incoming: Record<string, string>, standard: Record<string, string>): Record<string, string> | null => {
    const keys = Object.keys(incoming)
    if (keys.length < 3) return null
    const matched: Record<string, string> = {}
    for (const k of keys) {
      const target = standard[k] !== undefined ? k : standard[`text-${k}`] !== undefined ? `text-${k}` : null
      if (target) matched[target] = incoming[k]
    }
    if (Object.keys(matched).length / keys.length < 0.6) return null
    return { ...standard, ...matched }
  }
  if (Object.keys(fontSizes).length) {
    const adopted = adoptScale(fontSizes, FONT_SIZE_STANDARD)
    if (adopted) typography.sizes = adopted
    else issues.push({ kind: 'incompatible-type-scale', message: `The file's type scale names don't match our standard (text-xs…display-2xl) — keeping the default scale.` })
  }
  if (Object.keys(lineHeights).length) {
    const adopted = adoptScale(lineHeights, LINE_HEIGHT_STANDARD)
    if (adopted) typography.lineHeights = adopted
  }
  if (Object.keys(weightNames).length) typography.weights = weightNames
  const typoCount =
    (typography.fontFamily ? 1 : 0) + (typography.headingFontFamily ? 1 : 0) +
    Object.keys(typography.weights ?? {}).length + Object.keys(typography.sizes ?? {}).length +
    Object.keys(typography.lineHeights ?? {}).length
  foundations.typography = { status: typoCount ? 'detected' : 'default', count: typoCount, values: {} }

  if (!themesSeen.size && mapped.length) themesSeen.add('light')

  // A file with no colors and no detected foundations isn't a token file.
  const anyFoundation = Object.values(foundations).some((r) => r.status === 'detected')
  if (!colors.length && !anyFoundation) {
    return { ok: false, error: 'No recognizable design tokens found — expected colors, spacing, radius, shadows or a type scale.' }
  }

  const j = json as Record<string, unknown>
  return {
    ok: true,
    analysis: {
      sourceName:
        typeof j.project === 'string' ? j.project : typeof j.name === 'string' ? j.name : null,
      fastPath: null,
      families,
      semantics: {
        themesDetected: [...themesSeen],
        mapped,
        unmapped: stillUnmapped,
      },
      foundations,
      typography,
      merge: mergeStats,
      issues,
      stats: { totalTokens: candidates.length, colors: colors.length },
    },
  }
}
