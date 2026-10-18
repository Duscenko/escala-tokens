// ONE request model for "context for agents". Before this there were four
// markdown surfaces that read the same tokens and differed only in how much
// they cut: the Code tab's Agent context, its README Markdown, the preview
// panel's `.MD` tab and Docs' "Copy context to Agents". None of them let the
// person say what they actually wanted — one foundation, one appearance, only
// the values — so every paste shipped the whole thing.
//
// A request names three things:
//   scope       — the whole system, one foundation, or one component
//   appearance  — light, dark, or both
//   detail      — the values only, or the full brief (rules, API, contract)
//
// Every output is a CUT of an existing renderer, never a new one:
//   system / foundation → the Skill bundle's `references/*.md`
//                         (`buildAgentSkillFiles`), filtered by `## ` section
//   component           → `agentContextMarkdown`, filtered the same way
// So a filtered paste can never name a token the full file does not.

import { buildAgentSkillFiles } from './agentBundle'
import type { TokenJSON } from './agentBundle/types'
import type { ThemeAppearance } from './themeModes'

export type ContextAppearance = ThemeAppearance | 'both'
export type ContextDetail = 'tokens' | 'full'

/** Foundations an agent context can be narrowed to. Keys match the
 *  Generator's own foundation keys (`FOUNDATION_KEYS`), plus `gradients`,
 *  which ships as its own section. */
export type ContextFoundation =
  | 'color' | 'typography' | 'dimensions' | 'spacing' | 'radius' | 'stroke'
  | 'sizes' | 'grid' | 'shadow' | 'gradients' | 'icons'

export type ContextScope = 'all' | ContextFoundation

export const CONTEXT_FOUNDATIONS: { key: ContextFoundation; label: string }[] = [
  { key: 'color', label: 'Color' },
  { key: 'typography', label: 'Typography' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'radius', label: 'Radius' },
  { key: 'stroke', label: 'Stroke' },
  { key: 'sizes', label: 'Sizes' },
  { key: 'grid', label: 'Grid' },
  { key: 'shadow', label: 'Shadow' },
  { key: 'gradients', label: 'Gradients' },
  { key: 'icons', label: 'Icons' },
]

export const CONTEXT_APPEARANCES: { key: ContextAppearance; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'both', label: 'Both' },
]

export const CONTEXT_DETAILS: { key: ContextDetail; label: string; hint: string }[] = [
  { key: 'tokens', label: 'Values', hint: 'Token names and values only.' },
  { key: 'full', label: 'Full brief', hint: 'Values plus rules, contract and API.' },
]

export function isContextFoundation(key: string | null | undefined): key is ContextFoundation {
  return !!key && CONTEXT_FOUNDATIONS.some((f) => f.key === key)
}

export function foundationLabel(key: ContextScope): string {
  if (key === 'all') return 'All foundations'
  return CONTEXT_FOUNDATIONS.find((f) => f.key === key)?.label ?? key
}

// ── Section cutting ─────────────────────────────────────────────────────────

/** One heading and the lines under it, up to the next boundary. `level` 1 is a
 *  file title (`# `), 2 a section (`## `). Text before the first heading has
 *  `heading: ''`. */
export interface MdChunk { heading: string; level: number; text: string }

/** Splits markdown at `# ` / `## ` headings. `### Icon sizes` is also a
 *  boundary: the foundations file appends it after Icons (or after Gradients
 *  when the system names no icon set), and it belongs to Icons either way.
 *  Fenced code is never split. */
export function splitMarkdown(md: string): MdChunk[] {
  const chunks: MdChunk[] = []
  let current: MdChunk = { heading: '', level: 0, text: '' }
  let fenced = false
  const lines = md.split('\n')
  for (const line of lines) {
    if (line.startsWith('```')) fenced = !fenced
    const boundary = !fenced && (/^#{1,2} /.test(line) || line.startsWith('### Icon sizes'))
    if (boundary) {
      if (current.text.length || current.heading) chunks.push(current)
      const level = line.startsWith('## ') ? 2 : line.startsWith('# ') ? 1 : 3
      current = { heading: line, level, text: line + '\n' }
    } else {
      current.text += line + '\n'
    }
  }
  if (current.text.length || current.heading) chunks.push(current)
  return chunks
}

/** Which `## ` sections of the reference files each foundation owns. A role
 *  table on its own is useless to an agent that can't see the primitive it
 *  aliases, so every length foundation also takes `Dimension primitives`. */
const FOUNDATION_SECTIONS: Record<ContextFoundation, RegExp[]> = {
  color: [/^## Color /],
  typography: [/^## Typography/],
  dimensions: [/^## Dimension primitives/],
  spacing: [/^## Dimension primitives/, /^## Spacing/],
  radius: [/^## Dimension primitives/, /^## Radius/],
  stroke: [/^## Dimension primitives/, /^## Stroke/],
  sizes: [/^## Dimension primitives/, /^## Size/, /^## Selector/],
  grid: [/^## Dimension primitives/, /^## Grid/],
  shadow: [/^## Shadows/],
  gradients: [/^## Gradients/],
  icons: [/^## Icons/, /^### Icon sizes/],
}

function joinChunks(chunks: MdChunk[]): string {
  return chunks.map((c) => c.text.trimEnd()).join('\n\n').trim() + '\n'
}

// ── System / foundation ─────────────────────────────────────────────────────

export interface SystemContextRequest {
  scope: ContextScope
  detail: ContextDetail
  /** Which appearance the JSON was narrowed to (`contextTokenJson`). Labels
   *  the foundations' value columns; omit or `both` for both. */
  appearance?: ContextAppearance
}

/** The paste for a brand (or one of its foundations), from a TokenJSON that
 *  the caller has ALREADY narrowed to the requested appearance — see
 *  `contextTokenJson` in `contextSource.ts`. Pure, so tests and the MCP can
 *  call it without a store.
 *
 *  `{ scope: 'all', detail: 'full' }` is byte-identical to what the Code tab's
 *  Agent context always showed: every `references/` file, in package order. */
export function buildSystemContext(json: TokenJSON, req: SystemContextRequest, projectFallback?: string): string {
  const appearance = req.appearance === 'both' ? undefined : req.appearance
  const { files } = buildAgentSkillFiles(json, { projectFallback, appearance })
  const refs = files.filter((f) => f.path.startsWith('references/'))
  const tokens = refs.find((f) => f.path === 'references/tokens.md')?.text ?? ''
  const foundations = refs.find((f) => f.path === 'references/foundations.md')?.text ?? ''
  const contract = refs.find((f) => f.path === 'references/semantic-contract.md')?.text ?? ''

  if (req.scope === 'all') {
    const parts = [tokens, foundations]
    if (req.detail === 'full') parts.push(contract)
    return parts.map((t) => t.trimEnd()).join('\n\n---\n\n')
  }

  const project = json.project?.trim() || projectFallback?.trim() || 'Design system'
  const patterns = FOUNDATION_SECTIONS[req.scope]
  const pick = (md: string) => splitMarkdown(md).filter((c) => patterns.some((p) => p.test(c.heading)))
  const picked = [...pick(tokens), ...pick(foundations)]
  // Color's preamble (architecture + which mode columns exist) is what makes
  // the semantic table readable; it sits under the file title, not a section.
  const colorPreamble = req.scope === 'color'
    ? splitMarkdown(tokens).find((c) => c.level === 1)?.text
        .split('\n').slice(1).filter((l) => l.startsWith('**')).join('\n')
    : ''

  const out = [
    `# ${project} — ${foundationLabel(req.scope).toLowerCase()} tokens`,
    '',
    ...(colorPreamble ? [colorPreamble, ''] : []),
    picked.length ? joinChunks(picked).trimEnd() : '_This system ships no tokens for this foundation._',
  ]
  if (req.detail === 'full' && req.scope === 'color') out.push('', '---', '', contract.trimEnd())
  return out.join('\n') + '\n'
}

// ── Component ───────────────────────────────────────────────────────────────

/** Sections a component brief keeps at `detail: 'tokens'`. */
const COMPONENT_TOKEN_SECTIONS = [/^# Agent context/, /^## What it is/, /^## Design tokens/]

/** `### ` subsections of a component's Design tokens that change with the
 *  appearance: colour (the recipe table or the palette excerpt) and shadows.
 *  Every length, the type scale and the dimension primitives are the same in
 *  Light and Dark. */
const APPEARANCE_SUBSECTIONS = [/^### Tokens by part/, /^### Color /, /^### Shadow/]

/** Keeps the lead paragraph of a `## ` chunk and only the `### ` subsections
 *  that match. */
function keepSubsections(chunk: MdChunk, patterns: RegExp[]): MdChunk {
  const out: string[] = []
  let keep = true
  let fenced = false
  for (const line of chunk.text.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced
    if (!fenced && line.startsWith('### ')) keep = patterns.some((p) => p.test(line))
    if (keep) out.push(line)
  }
  return { ...chunk, text: out.join('\n') }
}

/** Narrows a component brief (`agentContextMarkdown`). `dark` is the same
 *  brief built against the dark appearance, needed only for `both`: its
 *  Design tokens section is appended under a `— Dark` heading, cut to the
 *  values that differ (colour, shadows), so nothing else repeats. */
export function cutComponentContext(
  primary: string,
  req: { detail: ContextDetail; appearance: ContextAppearance },
  dark?: string,
): string {
  const chunks = splitMarkdown(primary)
  const frontmatter = chunks[0]?.level === 0 ? [chunks[0]] : []
  const body = frontmatter.length ? chunks.slice(1) : chunks
  let kept = req.detail === 'full'
    ? body
    : body.filter((c) => COMPONENT_TOKEN_SECTIONS.some((p) => p.test(c.heading)))

  if (req.appearance === 'both' && dark) {
    const darkTokens = splitMarkdown(dark).find((c) => /^## Design tokens/.test(c.heading))
    if (darkTokens) {
      const idx = kept.findIndex((c) => /^## Design tokens/.test(c.heading))
      const relabel = (c: MdChunk, suffix: string): MdChunk => ({
        ...c,
        heading: `${c.heading} — ${suffix}`,
        text: c.text.replace(c.heading, `${c.heading} — ${suffix}`),
      })
      if (idx >= 0) {
        const darkOnly = keepSubsections(relabel(darkTokens, 'Dark'), APPEARANCE_SUBSECTIONS)
        kept = [...kept.slice(0, idx), relabel(kept[idx], 'Light'), darkOnly, ...kept.slice(idx + 1)]
      }
    }
  } else if (req.appearance !== 'both') {
    const idx = kept.findIndex((c) => /^## Design tokens/.test(c.heading))
    const label = req.appearance === 'dark' ? 'Dark' : 'Light'
    if (idx >= 0) {
      const c = kept[idx]
      kept = [...kept.slice(0, idx), { ...c, heading: `${c.heading} — ${label}`, text: c.text.replace(c.heading, `${c.heading} — ${label}`) }, ...kept.slice(idx + 1)]
    }
  }
  return [...frontmatter, ...kept].map((c) => c.text.trimEnd()).join('\n\n').trim() + '\n'
}

// ── Size ────────────────────────────────────────────────────────────────────

/** What a paste costs. ~4 characters per token is the usual estimate for
 *  English + markdown tables; it is shown as "≈", never as a count. */
export function contextSize(md: string): { chars: number; approxTokens: number; lines: number } {
  const chars = md.length
  return { chars, approxTokens: Math.ceil(chars / 4), lines: md ? md.split('\n').length : 0 }
}

export function formatApproxTokens(n: number): string {
  if (n >= 1000) return `≈ ${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k tokens`
  return `≈ ${n} tokens`
}
