import { type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { isLiveEnvironment } from '../../lib/figmaSync'
import ThemeToggle from './ThemeToggle'

// ── The global top bar (row 1 of the shell) ──────────────────────────────────
// Section switching lives HERE — there is no left icon rail. The bar is split
// by a vertical divider that continues down the workspace: the brand block on
// the left sits over the token-controls column, the nav + actions on the right
// sit over the canvas.

// THREE destinations: EDIT the system (Variables Generator), browse the
// component catalogue (Components), or read the token reference (Docs).
// Components and Docs used to be one "Documentation" destination with two
// groups sharing a rail (Foundations + Categories) — split apart because
// browsing components and reading token reference are different intents, and
// a rail that always listed both regardless of which one you came for was
// one more thing to visually filter past. Each keeps its own single-purpose
// rail/master-list now (see `ComponentsView`/`DocsView`).
export type TopNavKey = 'variables' | 'components' | 'docs'

const NAV_ITEMS: { key: TopNavKey; label: string }[] = [
  { key: 'variables', label: 'Variables Generator' },
  { key: 'components', label: 'Components' },
  { key: 'docs', label: 'Docs' },
]

interface TopNavProps {
  /** Lit nav item, or null in the export/connect views. */
  nav: TopNavKey | null
  onNav: (key: TopNavKey) => void
  exportMode: 'code' | 'md' | 'figma' | 'github' | 'save' | null
  onGetFigma: () => void
  /** Opens the guided export wizard (CSS · Tailwind · Tokens · MD). Lives here,
   *  not in a per-foundation header, because exporting is TRANSVERSAL — it
   *  isn't a property of whichever foundation you happen to be editing, it's
   *  something you reach for from anywhere in the app. */
  onExport: () => void
  /** Whether the export wizard is currently open, for the pill's active state —
   *  the same convention `exportMode === 'figma'`/`'github'` already uses for
   *  the pills beside it. */
  exportOpen?: boolean
  /** Opens the About/corporate drawer (AboutMenu). Always available — it's
   *  reference material, not a project action, so it doesn't wait on
   *  `projectCreated` the way Plugin/Export do. */
  onMenu: () => void
  /** Mirrors the left rail's own collapsed state — when the rail shrinks to
   *  an icon strip, the brand block above it shrinks the same way, so the
   *  divider between them stays one continuous line at every width. */
  railCollapsed?: boolean
  /** Width of the left column below, so the brand block's right border extends
   *  it and the divider runs unbroken from the very top. null = no column
   *  (export/connect views), so the block sizes to its content and drops the
   *  border rather than leaving a rule that leads nowhere. */
  brandWidth?: number | null
  previewTheme: string
  onThemeChange: (theme: string) => void
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

// Export mark — a share/box-out arrow, the same glyph the per-foundation
// Export pill used before it moved here.
function ExportGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.7914 12.6074C21.0355 12.3981 21.1575 12.2935 21.2023 12.169C21.2415 12.0598 21.2415 11.9402 21.2023 11.831C21.1575 11.7065 21.0355 11.6018 20.7914 11.3926L12.3206 4.13196C11.9004 3.77176 11.6903 3.59166 11.5124 3.58725C11.3578 3.58342 11.2101 3.65134 11.1124 3.77122C11 3.90915 11 4.18589 11 4.73936V9.03462C8.86532 9.40807 6.91159 10.4897 5.45971 12.1139C3.87682 13.8845 3.00123 16.1759 3 18.551V19.1629C4.04934 17.8989 5.35951 16.8765 6.84076 16.1659C8.1467 15.5394 9.55842 15.1683 11 15.0705V19.2606C11 19.8141 11 20.0908 11.1124 20.2288C11.2101 20.3486 11.3578 20.4166 11.5124 20.4127C11.6903 20.4083 11.9004 20.2282 12.3206 19.868L20.7914 12.6074Z" />
    </svg>
  )
}

// The outline-pill shape for TopNav's secondary action (Plugin) — icon + a
// label that hides under `sm`. `rounded-[13px]`, not `rounded-full` — the
// same proportional squircle every other 9-size (36px) chrome control uses
// (ThemeToggle, the About button beside it, ColorPrimitives' gear), so the
// whole action cluster on the right of the bar shares one corner language
// instead of pills sitting next to circles sitting next to squircles.
function NavPill({
  onClick, active, label, title, ariaLabel, children,
}: {
  onClick: () => void
  active?: boolean
  label: string
  title?: string
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      title={title}
      className={`h-9 px-3.5 rounded-[13px] flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors border ${
        active
          ? 'border-line-strong bg-elevated text-fg'
          : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// The filled, primary-CTA pill — Export's shape now, GitHub Connect's before
// it. Export took over both the STYLE and the rightmost slot: it's the one
// action that's always relevant regardless of what you're doing, the same
// reason Connect used to sit here.
function PrimaryPill({
  onClick, active, label, title, ariaLabel, children,
}: {
  onClick: () => void
  active?: boolean
  label: string
  title?: string
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      title={title}
      // Same `rounded-[13px]` as `NavPill` beside it — see that component's
      // note. Export is the one filled pill in the row; it still has to
      // share the row's corner language, not stand out as the one pill.
      className={`px-4 h-9 rounded-[13px] text-[13px] font-semibold bg-fg text-app transition-all hover:opacity-90 whitespace-nowrap inline-flex items-center gap-1.5 ${
        active ? 'ring-2 ring-fg/30' : ''
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// Escala Tokens mark. Every fill is `currentColor` (the brand art ships a hard
// #18181B) so the lockup inverts with the theme instead of going invisible on
// the dark chrome; the middle ring keeps its 0.3 opacity, which reads on both.
// No chip behind it — this is a finished badge, not a glyph needing a frame.
// Exported — App.tsx's desktop-only gate reuses it rather than duplicating
// the path data, so there's one place the mark's geometry lives.
export function BrandMark() {
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
  nav, onNav, exportMode, onGetFigma, onExport, exportOpen = false,
  onMenu, railCollapsed = false, brandWidth = null, previewTheme, onThemeChange,
}: TopNavProps) {
  const { projectCreated, autoSyncFigma } = useDesignStore()

  return (
    <header className="relative z-20 flex items-stretch h-[72px] flex-shrink-0 bg-app border-b border-line">
      {/* Brand block — spans the left column below, so its right border and the
          column divider read as one rule from the very top. Collapses to just
          the mark (no wordmark) in step with the rail below it. */}
      <div
        className={`flex items-center gap-3 flex-shrink-0 transition-[width] duration-200 ${brandWidth ? 'border-r border-line' : ''} ${
          railCollapsed ? 'justify-center px-0' : 'px-4 lg:px-5'
        }`}
        style={brandWidth ? { width: brandWidth } : undefined}
      >
        <BrandMark />
        {!railCollapsed && (
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-fg truncate leading-tight">Escala Tokens</div>
            <div className="text-[11.5px] text-fg-faint leading-tight">Token generator</div>
          </div>
        )}
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
              {/* ONE Figma control, not two. This used to be a "Sync" pill
                  (publish-on-click, shown only in a live/deployed environment)
                  standing next to a separate icon-only "Bring to Figma" button
                  — same glyph twice, whenever both happened to render. They're
                  merged: one pill, the Figma mark, labelled for what it DOES —
                  gets you the plugin (`FigmaConnectView`, which auto-publishes
                  on open) — not what used to be a separate manual-publish
                  action. The small dot is the only thing that still varies by
                  environment: it says auto-sync is live, it isn't a second
                  glyph. */}
              <NavPill
                onClick={onGetFigma}
                active={exportMode === 'figma'}
                label="Plugin"
                title="Get the Figma plugin & sync your tokens"
                ariaLabel="Figma plugin"
              >
                <span className="relative inline-flex">
                  <FigmaGlyph />
                  {isLiveEnvironment() && autoSyncFigma && (
                    <span className="absolute -right-1 -top-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-app" />
                  )}
                </span>
              </NavPill>
              {/* Export — the primary CTA now, in both style and position:
                  it took over the filled black pill and the rightmost slot
                  that used to belong to a standalone "Connect" GitHub button.
                  GitHub wasn't dropped — it's reachable from INSIDE the export
                  wizard's own "Save this design system" card (`onConnectGithub`
                  there), which is a better home for it: pushing to a repo is
                  something you do as part of getting your tokens out, not a
                  parallel top-level destination competing with Export for the
                  same "ship this system" intent. Transversal for the same
                  reason it was before — not scoped to whichever foundation
                  you're editing, so it lives in the global bar, not a
                  per-section header. */}
              <PrimaryPill
                onClick={onExport}
                active={exportOpen}
                label="Export"
                title="Copy or download this system as CSS · Tailwind · Tokens · MD"
                ariaLabel="Export tokens"
              >
                <ExportGlyph />
              </PrimaryPill>
            </>
          )}
          <ThemeToggle previewTheme={previewTheme} onThemeChange={onThemeChange} />
          <button
            onClick={onMenu}
            aria-label="About Escala Tokens"
            title="About · how it works · changelog · contact"
            // Same `rounded-[13px]` squircle as `ThemeToggle` right beside it.
            className="w-9 h-9 rounded-[13px] flex items-center justify-center border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
