import { useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { isLiveEnvironment, publishTokens } from '../../lib/figmaSync'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import type { Tab } from './Sidebar'

interface TopNavProps {
  tab: Tab
  exportMode: 'code' | 'md' | 'figma' | 'github' | 'save' | null
  onTabChange: (t: Tab) => void
  onGithub: () => void
  /** Logo click → the Home hub (saved systems live there). */
  onHome: () => void
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
      className={`ml-1 sm:ml-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-[12px] sm:text-[13px] font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1.5 border ${
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

// Top-nav text link — bold/fg when active, muted otherwise.
function NavLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 sm:px-3 py-1.5 rounded-lg text-[12px] sm:text-[13px] whitespace-nowrap transition-colors ${
        active ? 'text-fg font-semibold' : 'text-fg-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

// ── Transparent top navigation, layered over the brand gradient (layer 0) ─────
export default function TopNav({ tab, exportMode, onTabChange, onGithub, onHome }: TopNavProps) {
  const { projectCreated } = useDesignStore()
  const foundationsActive = !exportMode && tab === 'foundations'
  const componentsActive = !exportMode && tab === 'components'

  return (
    <header className="relative z-20 flex items-center justify-between gap-2 h-14 px-2 sm:px-3 lg:px-5 flex-shrink-0">
      {/* Logo — icon mark only on phones, full wordmark from md up. Click → Home. */}
      <button
        type="button"
        onClick={onHome}
        title="Home"
        aria-label="Home"
        className="h-8 w-[34px] md:w-auto overflow-hidden flex-shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 transition-opacity hover:opacity-80"
      >
        <Logo className="h-8 text-fg" />
      </button>

      <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
        {/* Pre-creation the nav is just logo + theme — Home is the entry point. */}
        {projectCreated && (
          <>
            <NavLink active={foundationsActive} onClick={() => onTabChange('foundations')}>
              Foundations
            </NavLink>
            <NavLink active={componentsActive} onClick={() => onTabChange('components')}>
              Components
            </NavLink>
            {isLiveEnvironment() && <FigmaSyncPill />}
            <button
              onClick={onGithub}
              className={`ml-1 sm:ml-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-semibold bg-fg text-app transition-all hover:opacity-90 whitespace-nowrap inline-flex items-center gap-1.5 ${
                exportMode === 'github' ? 'ring-2 ring-fg/30' : ''
              }`}
            >
              <GitHubGlyph />
              <span className="hidden sm:inline">Connect</span>
            </button>
          </>
        )}
        <div className="ml-1 sm:ml-2 flex-shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
