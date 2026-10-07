// "Use it" — the one contract behind every element's destinations.
//
// This is the evolution of what `ShipsAs` used to be. That block answered
// "what does this BECOME" as three hand-written naming patterns; this one
// answers "how do I CONSUME this", with the user's own resolved values:
// Figma · Code · the brief for this page (Copy context to Agents).
//
// Two rules it exists to keep:
//
// 1. **Derived, never enumerated.** There are ~58 components and 9
//    foundations. Nothing here may be authored per element — every string
//    below composes a builder that already exists (`buildSectionExport`,
//    `snippetFor`, `syncProjectId`, the catalogue's own `figmaSets`). If
//    `buildCSS` renames a variable, this block renames with it.
//
// 2. **One contract, three outputs.** The rendered block (`UseItBlock` in
//    `blocks.tsx`), the "Copy Page" markdown, and the MCP reply all read
//    THIS module, so a page can never claim something the export or the
//    agent would contradict — the same rule the export wizard already
//    follows ("everything derives from ONE generateTokenJSON() call").

import { buildSectionExport, cssExcerpt, type SectionKey } from '../../../lib/sectionExport'
import { withAgentEnvelope } from '../../../lib/aiContext'
import { useDesignStore } from '../../../store/useDesignStore'
import type { ComponentDef } from '../../../lib/componentCatalogue'
import type { FoundationDoc } from './foundationDocs'

export type UseItDestId = 'figma' | 'code' | 'ai'

export interface UseItDest {
  id: UseItDestId
  label: string
  /** The snippet shown in the pane — and copied VERBATIM. Never a summary of
   *  something longer that the copy button would silently expand. */
  code: string
  /** One line under the pane: the naming convention, or the precondition.
   *  Rendered through `t(note, noteVars)`, so it must be a STABLE source
   *  string — any live value goes in `noteVars` as a `{placeholder}`, never
   *  interpolated into the string itself, or every distinct value would be a
   *  separate dictionary key that no translation could ever match. */
  note?: string
  noteVars?: Record<string, string | number>
}

export interface UseIt {
  destinations: UseItDest[]
}

export const USE_IT_ID = 'use-it'
export const USE_IT_TITLE = 'Use it'
export const USE_IT_LEAD =
  'Figma and code, plus the brief for this page. Every value here is read from your own tokens by the same resolvers the export uses, so what you copy is what lands.'

/** Under the agent-brief pane. A paste, not a live connection — the MCP
 *  install lives on Docs → Use in code, and this tab must not send the
 *  reader there for a one-off copy. */
const CONTEXT_NOTE =
  'The brief for this page: the same facts it states, with the live values. Paste it into a chat.'

// ── Foundations ──────────────────────────────────────────────────────────────

/** A foundation key IS a `SectionKey` — the two lists are identical
 *  (color · typography · radius · spacing · shadow · grid · sizes · stroke ·
 *  icons). Narrowed here rather than cast at each call site so a future
 *  foundation that has no export section fails loudly instead of emitting an
 *  empty pane. */
function sectionKeyFor(doc: FoundationDoc): SectionKey | null {
  const keys: SectionKey[] = [
    'color', 'typography', 'radius', 'spacing', 'shadow', 'grid', 'sizes', 'stroke', 'icons',
  ]
  const named = doc.codeSection ?? doc.key
  return keys.find((k) => k === named) ?? null
}

/** Live token markdown for this page. The hub Spacing article is the Sizes
 *  foundation plus the spacing roles, so both exports belong in that brief. */
function sectionValues(doc: FoundationDoc): string {
  const section = sectionKeyFor(doc)
  if (!section) return ''
  // Every theme the page tables, not light alone — omitted `modes` drops dark.
  const modes = useDesignStore.getState().themeOrder
  const opts = modes?.length ? { modes } : {}
  const parts = [buildSectionExport(section, 'md', 'hex', opts)]
  if (doc.key === 'sizes' && section === 'spacing') parts.push(buildSectionExport('sizes', 'md', 'hex', opts))
  return parts.filter(Boolean).join('\n\n')
}

/** What this foundation page actually tells: lead, why, usage, then the
 *  live values from the same exporter the Code tab uses. */
export function foundationAgentContext(doc: FoundationDoc): string {
  const values = sectionValues(doc)
  const body = [
    doc.lead,
    '',
    `## Why ${doc.label.toLowerCase()} tokens`,
    '',
    doc.why,
    '',
    '## Usage',
    '',
    doc.usage,
    '',
    '```css',
    doc.usageCode.trim(),
    '```',
    '',
    values,
  ].join('\n')
  return withAgentEnvelope('variable', doc.label, body)
}

export function useItForFoundation(doc: FoundationDoc): UseIt {
  const section = sectionKeyFor(doc)

  // Real, resolved, live: `buildSectionExport` reads the store itself, so
  // retinting the accent moves this pane in the same frame it moves the table.
  const css = section
    ? cssExcerpt(buildSectionExport(section, 'css'))
    : doc.usageCode

  return {
    destinations: [
      {
        id: 'figma',
        label: 'Figma',
        code: doc.ships.figma,
        note: 'Created by the Escala plugin on import, then kept current by Live Sync.',
      },
      {
        id: 'code',
        label: 'Code',
        code: css,
        note: 'variables.css: {css}   ·   tokens.json: {json}',
        noteVars: { css: doc.ships.css, json: doc.ships.json },
      },
      {
        id: 'ai',
        label: 'Copy context to Agents',
        code: foundationAgentContext(doc),
        note: CONTEXT_NOTE,
      },
    ],
  }
}

// ── Components ───────────────────────────────────────────────────────────────

/** What the component page states when no fuller brief is passed: identity,
 *  when to use it, the sets, and the snippet on screen. */
function componentPageBrief(def: ComponentDef, snippet: string): string {
  const sets = def.figmaSets.length ? def.figmaSets.join(', ') : 'not in the Figma library yet'
  return [
    `# ${def.label}`,
    '',
    def.description,
    '',
    '## When to use',
    '',
    def.usage,
    '',
    `Figma: ${sets}`,
    '',
    '```tsx',
    snippet.trim(),
    '```',
    '',
    '## Accessibility',
    '',
    def.accessibility,
  ].join('\n')
}

/** `snippet` is the hero's own code — passed in rather than recomputed so the
 *  block can never show a different variant than the playground above it.
 *  `agentContext`, when passed, is that page's full brief (tokens, API, the
 *  same snippet) and replaces the shorter page summary. */
export function useItForComponent(def: ComponentDef, snippet: string, agentContext?: string): UseIt {
  // A catalogue-first entry has no Figma set yet, and says so — the rule the
  // catalogue already follows everywhere else ("not in the Figma library
  // yet"). Never name a set that does not exist.
  const figma = def.figmaSets.length
    ? def.figmaSets.join('\n')
    : `${def.label} is not in the Figma library yet — it documents and exports here, and\nits component set lands once the plugin ships a gate for it.`

  const brief = agentContext?.trim()
    ? agentContext
    : withAgentEnvelope('component', def.label, componentPageBrief(def, snippet))

  return {
    destinations: [
      {
        id: 'figma',
        label: 'Figma',
        code: figma,
        note: def.figmaSets.length
          ? def.figmaSets.length === 1
            ? 'Component set the plugin unlocks for this key.'
            : 'Component sets the plugin unlocks for this key.'
          : 'The plugin is the source of truth for the catalogue — this entry is spec-only for now.',
      },
      {
        id: 'code',
        label: 'Code',
        code: snippet,
        note: 'Styled from your semantic roles — no hardcoded values. Catalogue key: {key}',
        noteVars: { key: def.key },
      },
      {
        id: 'ai',
        label: 'Copy context to Agents',
        code: brief,
        note: CONTEXT_NOTE,
      },
    ],
  }
}

// ── Markdown (the second of the three outputs) ───────────────────────────────

/** Serialised for "Copy Page" / the agent envelope. Same descriptor as the
 *  rendered block, so the two cannot drift. */
export function useItMarkdown(useIt: UseIt): string {
  const body = useIt.destinations
    .map((d) => [`### ${d.label}`, '', '```', d.code, '```', ...(d.note ? ['', `_${d.note}_`] : [])].join('\n'))
    .join('\n\n')
  return [`## ${USE_IT_TITLE}`, '', USE_IT_LEAD, '', body].join('\n')
}
