import { type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import type { Tab } from './Sidebar'

interface TopNavProps {
  tab: Tab
  exportMode: 'code' | 'md' | 'figma' | 'github' | null
  onTabChange: (t: Tab) => void
  onDocs: () => void
  onGithub: () => void
}

// GitHub brand mark — monochrome, tracks currentColor.
function GitHubGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
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
export default function TopNav({ tab, exportMode, onTabChange, onDocs, onGithub }: TopNavProps) {
  const { projectCreated } = useDesignStore()
  const foundationsActive = !exportMode && tab === 'foundations'
  const componentsActive = !exportMode && tab === 'components'
  const docsActive = exportMode === 'md'

  return (
    <header className="relative z-20 flex items-center justify-between gap-2 h-14 px-2 sm:px-3 lg:px-5 flex-shrink-0">
      {/* Logo — icon mark only on phones, full wordmark from md up */}
      <div className="h-8 w-[34px] md:w-[130px] overflow-hidden flex-shrink-0">
        <Logo className="h-8 w-[130px] max-w-none text-fg" />
      </div>

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
            <NavLink active={docsActive} onClick={onDocs}>
              Docs
            </NavLink>
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
