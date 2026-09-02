import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LOCALES, useI18n } from '../../lib/i18n'

// ── The global top bar (row 1 of the shell) ──────────────────────────────────
// Section switching lives HERE — there is no left icon rail. The bar is split
// by a vertical divider that continues down the workspace: the brand block on
// the left sits over the token-controls column, the nav + actions on the right
// sit over the canvas.
//
// The right cluster: the token search (contextual — passed as `search`, only
// present while the Generator workspace is open), then the language switcher and
// the light/dark appearance toggle. Two things that used to live here are gone:
//   • Export — it is not a global-chrome concern; its entry points are inside
//     the Docs destination and the theme workspace's own hand-off rows.
//   • The ☰ Workspace-settings menu — System library, Figma and GitHub are all
//     reachable from their own surfaces now (SaveSidePanel, and the Figma /
//     GitHub pills in the theme-workspace tab strip), and the one thing it
//     owned that IS global chrome — the appearance toggle — moved out here.
//
// The token search sat in the Themes-workspace tab strip for a while (the
// argument being "per-workspace tool, not global chrome"), then came back up
// here at the user's call: it's the workspace's primary way to FIND a token,
// and the tab strip was already carrying the two Sync pills plus three tabs —
// one row doing four jobs. Up here it sits beside the other two session
// controls (Language, Appearance) and the tab strip breathes. It is still
// contextual, not global: `Configurator` passes `search` only on the Generator
// tab (`themesCanvas`), so it's absent on About / Components / Docs where there
// are no tokens to filter. `colorSearchRef` / ⌘K are unchanged.

// FOUR destinations: read "what this is" (About, first — see below), EXPLORE
// and edit the system by theme, browse the component catalogue (Components),
// or read the token reference (Docs). Components and Docs used to be one
// "Documentation" destination with two groups sharing a rail (Foundations +
// Categories) — split apart because browsing components and reading token
// reference are different intents, and a rail that always listed both
// regardless of which one you came for was one more thing to visually filter
// past. Each keeps its own single-purpose rail/master-list now (see
// `ComponentsView`/`DocsView`).
//
// About used to be a hidden burger-icon drawer (`AboutMenu`'s default
// export, still in that file, unwired — same retirement treatment as
// `WorkbenchLayout`/`HomeView`) — new visitors never found it. It's a real
// tab now, first in order: `Configurator.tsx` also lands a first-time
// visitor there by default (`hasOnboarded()`, `lib/onboarding.ts`), making it
// the workspace's landing surface without reviving a wizard/HomeView.
export type TopNavKey = 'about' | 'variables' | 'components' | 'docs'
export type DocsMenuPage = 'mcp' | 'figma' | 'changelog' | 'faq'

const NAV_ITEMS: { key: TopNavKey; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'variables', label: 'Generator' },
  { key: 'components', label: 'Components' },
  { key: 'docs', label: 'Docs' },
]

interface TopNavProps {
  /** Lit nav item, or null in the export/connect views. */
  nav: TopNavKey | null
  onNav: (key: TopNavKey) => void
  /** Mirrors the left rail's own collapsed state — when the rail shrinks to
   *  an icon strip, the brand block above it shrinks the same way, so the
   *  divider between them stays one continuous line at every width. */
  railCollapsed?: boolean
  /** Width of the left column below, so the brand block's right border extends
   *  it and the divider runs unbroken from the very top. null = no column
   *  (export/connect views), so the block sizes to its content and drops the
   *  border rather than leaving a rule that leads nowhere. */
  brandWidth?: number | null
  chromeAppearance: 'light' | 'dark'
  onChromeAppearanceChange: (appearance: 'light' | 'dark') => void
  /** Opens one of Docs' focused subpages. Docs itself is a menu trigger, not
   *  a catch-all landing page. */
  onOpenDocsPage?: (page: DocsMenuPage) => void
  /** Language switcher — placeholder until i18n lands. Optional: with no
   *  handler the control still renders (matching the design), it just doesn't
   *  do anything yet. */
  onOpenLanguages?: () => void
  /** The token-search field, built by `Configurator` (which owns `colorQuery` /
   *  `colorSearchRef` and every consumer of the query). Passed only while the
   *  Generator workspace is open; absent elsewhere. Sits at the LEFT of the
   *  right-hand cluster, before Language and Appearance. */
  search?: ReactNode
}

// A hard-#white asset painted with `currentColor` via a CSS mask — the
// `ViewIcon` / `FolderIcon` pattern. The svg's own fill is ignored; only its
// alpha is read, so one file serves every ink and both chromes.
function MaskGlyph({ src, className = 'h-4 w-4' }: { src: string; className?: string }) {
  const mask = `url('${src}') center / contain no-repeat`
  return <span aria-hidden className={`${className} bg-current`} style={{ WebkitMask: mask, mask }} />
}

// Figma brand mark — monochrome, tracks currentColor. `className` is
// optional (every existing call site renders it at the fixed 11×16 the SVG
// attributes already set); pass `h-*`/`w-*` to resize, CSS wins over the
// presentation attributes.
export function FigmaGlyph({ className }: { className?: string } = {}) {
  return (
    <svg width="11" height="16" viewBox="0 0 38 57" fill="currentColor" className={className} aria-hidden>
      <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
      <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
      <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
      <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
      <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="8" r="2.6" />
      <path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13.2 10.3A5.7 5.7 0 0 1 5.7 2.8 5.7 5.7 0 1 0 13.2 10.3Z" />
    </svg>
  )
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
    >
      <path d="m3 4.5 3 3 3-3" />
    </svg>
  )
}

function ClockIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="8" cy="8" r="5.5" /><path d="M8 4.8v3.4l2.25 1.35" /></svg>
}

function HelpIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="8" cy="8" r="5.5" /><path d="M6.45 6.35a1.7 1.7 0 0 1 3.3.56c0 1.45-1.7 1.65-1.7 2.8M8 11.7h.01" /></svg>
}

// Global icon actions share one interaction language. Keeping this as one
// primitive prevents GitHub, locale, and appearance from drifting apart as
// their individual menus and states evolve.
const GLOBAL_ICON_ACTION = 'grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border border-line bg-app text-fg-muted transition-colors hover:border-line-strong hover:bg-elevated/60 hover:text-fg active:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app'

// Appearance is one action, not a two-choice segment. The glyph shows the
// destination: sun while dark is active, moon while light is active.
function AppearanceToggle({
  value, onChange,
}: {
  value: 'light' | 'dark'
  onChange: (appearance: 'light' | 'dark') => void
}) {
  const { t } = useI18n()
  const isDark = value === 'dark'
  const next = isDark ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={t(isDark ? 'Light appearance' : 'Dark appearance')}
      title={t(isDark ? 'Light appearance' : 'Dark appearance')}
      className={GLOBAL_ICON_ACTION}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
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
  nav, onNav, railCollapsed = false, brandWidth = null,
  chromeAppearance, onChromeAppearanceChange, onOpenLanguages, onOpenDocsPage, search,
}: TopNavProps) {
  const { locale, setLocale, t } = useI18n()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [docsMenuOpen, setDocsMenuOpen] = useState(false)
  const languageRootRef = useRef<HTMLDivElement>(null)
  const docsRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!languageOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!languageRootRef.current?.contains(event.target as Node)) setLanguageOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLanguageOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [languageOpen])

  useEffect(() => {
    if (!docsMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!docsRootRef.current?.contains(event.target as Node)) setDocsMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDocsMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [docsMenuOpen])

  // z-30 (not 20): the header must stay above the Color primitives quick-edit
  // strip (`sticky z-20 isolate`) when the workspace scrolls beneath it.
  return (
    <header className="relative z-30 flex items-stretch h-[72px] flex-shrink-0 bg-app border-b border-line">
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
            <div className="text-strong font-semibold text-fg truncate leading-tight">Escala Tokens</div>
            <div className="text-caption text-fg-faint leading-tight">{t('Token generator')}</div>
          </div>
        )}
      </div>

      {/* Balanced three-column chrome: the section nav stays optically centered
          while the search + language + appearance cluster is pinned right.
          The RIGHT track is `minmax(min-content,1fr)` so it never collapses
          under the nav — when the window narrows, the empty LEFT track gives up
          its width first and the search field (`flex-1 min-w-0` inside) shrinks,
          rather than the cluster overrunning the centred nav. */}
      <div className="grid flex-1 min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(min-content,1fr)] items-center gap-3 px-4 xl:px-6">
        <span aria-hidden />
        <nav aria-label={t('Sections')} className="hidden min-[860px]:flex items-center gap-4 lg:gap-6 xl:gap-8 min-w-0">
          {NAV_ITEMS.map(({ key, label }) => {
            const on = nav === key
            if (key === 'docs') {
              const pages: { key: DocsMenuPage; label: string; icon: ReactNode }[] = [
                { key: 'mcp', label: 'MCP', icon: <MaskGlyph src="/icons/settings/mcp.svg" className="h-4 w-4" /> },
                { key: 'figma', label: 'Use in Figma', icon: <FigmaGlyph className="h-3.5 w-3.5" /> },
                { key: 'changelog', label: 'Changelog', icon: <ClockIcon /> },
                { key: 'faq', label: 'FAQ', icon: <HelpIcon /> },
              ]
              return (
                <div
                  key={key}
                  ref={docsRootRef}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDocsMenuOpen((open) => !open)
                    }}
                    aria-current={on ? 'page' : undefined}
                    aria-haspopup="menu"
                    aria-expanded={docsMenuOpen}
                    className={`flex items-center gap-1 rounded-md px-0.5 py-1 text-ui lg:text-ui whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app ${
                      on ? 'font-semibold text-fg' : 'font-medium text-fg-faint hover:text-fg-muted'
                    }`}
                  >
                    {t(label)}
                    <ChevronDownIcon open={docsMenuOpen} />
                  </button>
                  {docsMenuOpen && (
                    <div role="menu" aria-label={t('Docs')} className="absolute left-1/2 top-full z-[80] mt-1.5 w-40 -translate-x-1/2 rounded-lg border border-line-strong bg-app p-1.5 shadow-xl">
                      {pages.map((page, index) => (
                        <div key={page.key} className={index === 2 ? 'mt-1 border-t border-line pt-1' : ''}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setDocsMenuOpen(false); onOpenDocsPage?.(page.key) }}
                            className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
                          >
                            <span className="grid h-4 w-4 flex-shrink-0 place-items-center">{page.icon}</span>
                            {t(page.label)}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <button
                key={key}
                onClick={() => onNav(key)}
                aria-current={on ? 'page' : undefined}
                className={`rounded-md px-0.5 py-1 text-ui lg:text-ui whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app ${
                  on ? 'font-semibold text-fg' : 'font-medium text-fg-faint hover:text-fg-muted'
                }`}
              >
                {t(label)}
              </button>
            )
          })}
        </nav>

        {/* Right cluster: contextual token search, then Language + Appearance.
            The "Escala Tokens on GitHub" repo link used to lead here and was the
            odd one out — Language and Appearance change THIS session, that link
            leaves the app for the source, and its GitHub mark collided with the
            user's OWN repo-sync mark in the tab strip. It moved to the footer.
            `min-w-0` so the search shrinks (not the centered nav) when the
            window narrows; the two icon controls stay `flex-shrink-0`. */}
        <div className="col-start-3 flex items-center justify-self-end gap-2 min-w-0">
          {search}
          {/* Locale stays visible inside the menu; the trigger is icon-only so
              it has the same 32px footprint as the other global controls. */}
          <div ref={languageRootRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => { onOpenLanguages?.(); setLanguageOpen((open) => !open) }}
              aria-label={t('Select language')}
              title={t('Language')}
              aria-haspopup="menu"
              aria-expanded={languageOpen}
              className={`${GLOBAL_ICON_ACTION} ${languageOpen ? 'border-line-strong bg-elevated text-fg' : ''}`}
            >
              <MaskGlyph src="/icons/settings/languages.svg" className="h-4 w-4" />
            </button>
            {languageOpen && (
              <div role="menu" aria-label={t('Select language')} className="absolute right-0 top-full z-[80] mt-2 w-36 overflow-hidden rounded-lg border border-line-strong bg-app p-1.5 shadow-xl">
                {LOCALES.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={locale === option.key}
                    onClick={() => { setLocale(option.key); setLanguageOpen(false) }}
                    className={`flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-caption font-medium transition-colors ${locale === option.key ? 'bg-elevated text-fg' : 'text-fg-muted hover:bg-elevated/60 hover:text-fg'}`}
                  >
                    <span>{option.label}</span>
                    <span className="text-micro font-semibold text-fg-faint">{option.shortLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <AppearanceToggle value={chromeAppearance} onChange={onChromeAppearanceChange} />
        </div>
      </div>
    </header>
  )
}
