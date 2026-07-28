import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { isLiveEnvironment, publishTokens } from '../../lib/figmaSync'
import ThemeToggle from './ThemeToggle'

// ── The global top bar (row 1 of the shell) ──────────────────────────────────
// Section switching lives HERE — there is no left icon rail. The bar is split
// by a vertical divider that continues down the workspace: the brand block on
// the left sits over the token-controls column, the nav + actions on the right
// sit over the canvas.

export type TopNavKey = 'variables' | 'documentation' | 'components'

const NAV_ITEMS: { key: TopNavKey; label: string }[] = [
  { key: 'variables', label: 'Variables' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'components', label: 'Components' },
]

interface TopNavProps {
  /** Lit nav item, or null in the export/connect views. */
  nav: TopNavKey | null
  onNav: (key: TopNavKey) => void
  exportMode: 'code' | 'md' | 'figma' | 'github' | 'save' | null
  onGithub: () => void
  onGetFigma: () => void
  /** Width of the left column below, so the brand block's right border extends
   *  it and the divider runs unbroken from the very top. null = no column
   *  (export/connect views), so the block sizes to its content and drops the
   *  border rather than leaving a rule that leads nowhere. */
  brandWidth?: number | null
  previewTheme: string
  onThemeChange: (theme: string) => void
}

// GitHub brand mark — monochrome, tracks currentColor.
function GitHubGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

// Figma brand mark — monochrome, tracks currentColor.
function FigmaGlyph() {
  return (
    <svg width="11" height="16" viewBox="0 0 38 57" fill="currentColor" aria-hidden>
      <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
      <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
      <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
      <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
      <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
    </svg>
  )
}

type SyncState = 'idle' | 'publishing' | 'done' | 'error'

// Persistent "Sync to Figma" pill — publishes the current token set to
// /api/tokens on click. A live dot shows when auto-sync is on (every edit
// republishes); the manual click stays available to force a push.
function FigmaSyncPill() {
  const autoSyncFigma = useDesignStore((s) => s.autoSyncFigma)
  const [state, setState] = useState<SyncState>('idle')

  async function sync() {
    if (state === 'publishing') return
    setState('publishing')
    const ok = await publishTokens()
    setState(ok ? 'done' : 'error')
    setTimeout(() => setState('idle'), 2200)
  }

  const label =
    state === 'publishing' ? 'Syncing…'
    : state === 'done'     ? 'Synced'
    : state === 'error'    ? 'Retry'
    : 'Sync'

  return (
    <button
      onClick={sync}
      title={autoSyncFigma ? 'Auto-sync is on — click to force a publish now' : 'Publish your tokens to Figma now'}
      aria-label="Sync tokens to Figma"
      className={`px-3 sm:px-3.5 py-1.5 rounded-full text-[12px] sm:text-[13px] font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1.5 border ${
        state === 'error'
          ? 'border-red-400/60 text-red-500 bg-red-500/5'
          : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
      }`}
    >
      {state === 'publishing' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : state === 'done' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
      ) : (
        <span className="relative inline-flex">
          <FigmaGlyph />
          {autoSyncFigma && (
            <span className="absolute -right-1 -top-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-app" />
          )}
        </span>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// Escala Tokens mark. Every fill is `currentColor` (the brand art ships a hard
// #18181B) so the lockup inverts with the theme instead of going invisible on
// the dark chrome; the middle ring keeps its 0.3 opacity, which reads on both.
// No chip behind it — this is a finished badge, not a glyph needing a frame.
function BrandMark() {
  return (
    <svg
      width="32" height="32" viewBox="0 0 32 32" fill="none"
      className="flex-shrink-0 text-fg"
      role="img" aria-label="Escala Tokens"
    >
      <path d="M28 9.01611V22.9839L15.9033 29.9683L3.80664 22.9839V9.01611L15.9033 2.03174L28 9.01611ZM5.80664 10.1704V21.8286L15.9033 27.6587L26 21.8286V10.1704L15.9033 4.34033L5.80664 10.1704Z" fill="currentColor" />
      <path opacity="0.3" d="M23.7306 12.6007L22.7083 15.8562L23.727 19.1045L20.7177 20.7013L19.128 23.7221L15.8695 22.7003L12.619 23.7168L11.0204 20.7102L8.0067 19.1284L9.0187 15.8655L8 12.6172L11.0195 11.028L12.5985 8L15.8571 9.02182L19.108 8.0049L20.7065 11.0115L23.7306 12.6007V12.6007" fill="currentColor" />
      <path d="M22.1184 18.3505C19.9936 17.9805 18.1552 19.834 18.5165 21.9544C17.2684 20.1965 14.6559 20.1915 13.4192 21.9581C13.7868 19.8321 11.9326 17.9918 9.81349 18.3512C11.5695 17.1044 11.5714 14.4913 9.80469 13.2521C11.9301 13.6221 13.7679 11.7686 13.4066 9.64823C14.6546 11.4061 17.2672 11.4105 18.5039 9.64453C18.1364 11.7699 19.9912 13.6107 22.1096 13.2514C20.3542 14.4982 20.3517 17.1113 22.1184 18.3505V18.3505" fill="currentColor" />
    </svg>
  )
}

export default function TopNav({
  nav, onNav, exportMode, onGithub, onGetFigma,
  brandWidth = null, previewTheme, onThemeChange,
}: TopNavProps) {
  const { projectCreated } = useDesignStore()

  return (
    <header className="relative z-20 flex items-stretch h-[72px] flex-shrink-0 bg-app border-b border-line">
      {/* Brand block — spans the left column below, so its right border and the
          column divider read as one rule from the very top. */}
      <div
        className={`flex items-center gap-3 px-4 lg:px-5 flex-shrink-0 ${brandWidth ? 'border-r border-line' : ''}`}
        style={brandWidth ? { width: brandWidth } : undefined}
      >
        <BrandMark />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-fg truncate leading-tight">Escala Tokens</div>
          <div className="text-[11.5px] text-fg-faint leading-tight">Token generator</div>
        </div>
      </div>

      {/* Nav + actions */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-4 lg:gap-8 px-4 lg:px-8">
        {projectCreated && (
          <nav aria-label="Sections" className="hidden md:flex items-center gap-6 lg:gap-8 min-w-0">
            {NAV_ITEMS.map(({ key, label }) => {
              const on = nav === key
              return (
                <button
                  key={key}
                  onClick={() => onNav(key)}
                  aria-current={on ? 'page' : undefined}
                  className={`text-[14px] whitespace-nowrap transition-colors ${
                    on ? 'font-semibold text-fg' : 'font-medium text-fg-faint hover:text-fg-muted'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </nav>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {projectCreated && (
            <>
              {isLiveEnvironment() && <FigmaSyncPill />}
              <button
                onClick={onGetFigma}
                aria-label="Bring to Figma"
                title="Bring to Figma — install the sync plugin"
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                  exportMode === 'figma'
                    ? 'border-line-strong bg-elevated text-fg'
                    : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
                }`}
              >
                <FigmaGlyph />
              </button>
              <button
                onClick={onGithub}
                className={`px-4 h-9 rounded-full text-[13px] font-semibold bg-fg text-app transition-all hover:opacity-90 whitespace-nowrap inline-flex items-center gap-1.5 ${
                  exportMode === 'github' ? 'ring-2 ring-fg/30' : ''
                }`}
              >
                <GitHubGlyph />
                <span className="hidden sm:inline">Connect</span>
              </button>
            </>
          )}
          <ThemeToggle previewTheme={previewTheme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </header>
  )
}
