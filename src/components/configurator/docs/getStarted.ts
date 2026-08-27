// Get started — the Docs landing and the three destination articles.
// Keys are not foundation keys (they never collide with FOUNDATION_DOCS).
// The whole-system token sheet stays `OVERVIEW_KEY` (`__overview`), renamed
// in the rail to "System reference" so it is not the first thing a new
// user opens.

import { FOUNDATION_DOCS, OVERVIEW_KEY } from './foundationDocs'

export const GET_STARTED_KEY = '__get-started'
export const GUIDE_FIGMA_KEY = '__guide-figma'
export const GUIDE_CODE_KEY = '__guide-code'

/**
 * TWO destinations, not three. "Use in code" and "Use with AI" were separate
 * pages answering the SAME question — how do my tokens reach my repo — and
 * giving the same answer twice ("reference roles, never invent a hex"; the CSS
 * page said it in prose, the AI page enforced it through `resolve_token`).
 * CSS variables, W3C JSON, a GitHub repo and the MCP server all land in one
 * place: the product repo. Figma is the genuinely different destination — a
 * design tool, a plugin, variables in a file.
 *
 * `GUIDE_AI_KEY` is GONE, not deprecated: the rail row, the TOC branch, the
 * markdown branch and the `TITLE` entry all went with it. Anything that used
 * to deep-link the AI page (About's "learn AI" CTA) points at
 * `GUIDE_CODE_KEY` now — the section it wants (`#connect`) lives there.
 */
export const GUIDE_PAGES: { key: string; label: string }[] = [
  { key: GET_STARTED_KEY, label: 'Get started' },
  { key: GUIDE_FIGMA_KEY, label: 'Use in Figma' },
  { key: GUIDE_CODE_KEY, label: 'Use in code' },
]

/** Get started → two destinations → the token sheet. */
export const DOCS_INTRO_PAGES: { key: string; label: string }[] = [
  ...GUIDE_PAGES,
  { key: OVERVIEW_KEY, label: 'System reference' },
]

export function isGuideKey(key: string): boolean {
  return GUIDE_PAGES.some((p) => p.key === key)
}

export function isDocsIntroKey(key: string): boolean {
  return DOCS_INTRO_PAGES.some((p) => p.key === key)
}

export function colorPrev(): { key: string; label: string } {
  return { key: OVERVIEW_KEY, label: 'System reference' }
}

export function overviewNext(): { key: string; label: string } | undefined {
  const first = FOUNDATION_DOCS[0]
  return first ? { key: first.key, label: first.label } : undefined
}

export function introPager(key: string): {
  prev?: { key: string; label: string }
  next?: { key: string; label: string }
} {
  const i = DOCS_INTRO_PAGES.findIndex((p) => p.key === key)
  if (i < 0) return {}
  return {
    prev: i > 0 ? DOCS_INTRO_PAGES[i - 1] : undefined,
    next: i < DOCS_INTRO_PAGES.length - 1 ? DOCS_INTRO_PAGES[i + 1] : undefined,
  }
}

export interface DocsExits {
  onOpenFigmaDownload: () => void
  onOpenFigmaSync: () => void
  onOpenExport: () => void
  onOpenSave: () => void
  onOpenGithub: () => void
}
