/**
 * THIRD-PARTY BRAND ARTWORK — deliberately literal, never tokens. A vendor's
 * mark does not retint with the user's accent: Google blue is Google blue in
 * every system, and Apple / Google require the store badges black with white
 * type. Same rule as `public/ide-logos/*` in AgentInstallPanel. Any sweep for
 * hardcoded colour should skip this file.
 */
import { FigmaGlyph, GitHubGlyph } from '../ui/icons'
import { iconOf } from '../../lib/previewTokens'

export const PROVIDER_MARKS: Record<string, { glyph: string; color: string }> = {
  Google: { glyph: 'G', color: '#4285f4' },
  Apple: { glyph: '', color: '#111111' },
  GitHub: { glyph: '', color: '#111111' },
  Figma: { glyph: '', color: '#111111' },
}

export function ProviderMark({ provider }: { provider: string }) {
  if (provider === 'GitHub') return <GitHubGlyph size={iconOf(17)} />
  if (provider === 'Figma') return <FigmaGlyph size={iconOf(17)} />
  if (provider === 'Apple') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.31 10.38.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.58 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.16-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.73-1.05-2.76-4.17ZM14.44 4.9c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.67.77-1.25 2-1.09 3.19 1.15.09 2.33-.59 3.05-1.46Z" />
      </svg>
    )
  }
  const mark = PROVIDER_MARKS[provider] ?? PROVIDER_MARKS.Google
  return <span style={{ color: mark.color, lineHeight: 1, fontWeight: 600 }}>{mark.glyph}</span>
}

export const STORE_BADGE_INK = '#ffffff'
export const STORE_BADGE_FILL = '#111111'
export const STORE_BADGE_EDGE = '#2a2a2a'

export function StoreGlyph({ play }: { play: boolean }) {
  return play ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M4 3.5v17c0 .3.34.5.6.33l13.9-8.16a.4.4 0 0 0 0-.7L4.6 3.17a.4.4 0 0 0-.6.33Z" /></svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.31 10.38.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.58 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.16-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.73-1.05-2.76-4.17ZM14.44 4.9c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.67.77-1.25 2-1.09 3.19 1.15.09 2.33-.59 3.05-1.46Z" /></svg>
  )
}
