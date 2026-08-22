// Get started — the Docs landing and the three destination articles.
// Keys are not foundation keys (they never collide with FOUNDATION_DOCS).
// The whole-system token sheet stays `OVERVIEW_KEY` (`__overview`), renamed
// in the rail to "System reference" so it is not the first thing a new
// user opens.

import { FOUNDATION_DOCS, OVERVIEW_KEY } from './foundationDocs'

export const GET_STARTED_KEY = '__get-started'
export const GUIDE_FIGMA_KEY = '__guide-figma'
export const GUIDE_CODE_KEY = '__guide-code'
export const GUIDE_AI_KEY = '__guide-ai'

export const GUIDE_PAGES: { key: string; label: string }[] = [
  { key: GET_STARTED_KEY, label: 'Get started' },
  { key: GUIDE_FIGMA_KEY, label: 'Use in Figma' },
  { key: GUIDE_CODE_KEY, label: 'Use in code' },
  { key: GUIDE_AI_KEY, label: 'Use with AI' },
]

/** Get started → three destinations → the token sheet. */
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
