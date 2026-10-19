// THE DESIGN SYSTEM DASHBOARD — what Home shows when the design system on
// screen is opened. Its menu takes Home's left column: Overview (the system at
// a glance), Docs, Status board and Integrations. Docs holds one
// page per foundation: the Docs article, and for Color the variable map.
//
// Every number comes from `useDashboard` (lib/systemDashboard.ts), which reads
// the tokens, the catalogue and the status decisions. Pages that would need a
// source Escala does not have yet (adoption in product files, hardcoded
// values, Storybook) are not built, on purpose: no page shows a made-up figure.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDesignStore } from '../../../store/useDesignStore'
import { useI18n } from '../../../lib/i18n'
import { goToLogin, useAccess } from '../../../lib/access'
import { useSavedBrandKeys } from '../../../lib/libraryStatus'
import type { ThemeAppearance } from '../../../lib/themeModes'
import { themeBrandRamp, themeDisplayName } from '../../../lib/themeSources'
import { ThemeAvatar } from '../ThemeLibraryRail'
import { CHROME_MENU_Z, SELECT_FOCUS, SELECT_LIST, SELECT_OPTION, SELECT_OPTION_OFF, SELECT_OPTION_ON } from '../themeWorkspaceLayout'
import { InspectorPortal } from '../WorkspaceInspector'
import DocsView from '../DocsView'
import SemanticTokenDrawer from '../SemanticTokenGroups'
import type { DocsExits } from '../docs/getStarted'
import { BTN, BTN_PRIMARY, Card, NavRow, PageHeader, SourcePill } from './parts'
import { DASH_DOCS, DASH_PAGE_LABEL, DEFAULT_DOC_KEY, ROLE_TABLE_KEYS, useDashboard, type DashPage, type Dashboard } from './dashboardData'
import OverviewPage from './OverviewPage'
import StatusBoardPage, { type StatusFilter, type StatusKind } from './StatusBoardPage'
import ColorVariableMap from './ColorVariableMap'
import FoundationRolesTable from './FoundationRolesTable'
const glyph = (d: string) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)
const PAGE_GLYPH: Record<DashPage, ReactNode> = {
  overview: glyph('M4 13h6V4H4v9ZM14 20h6v-9h-6v9ZM4 20h6v-3H4v3ZM14 7h6V4h-6v3Z'),
  status: glyph('M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2'),
  docs: glyph('M6 3h9l4 4v14H6V3ZM14 3v5h5M9 13h7M9 17h7'),
  components: glyph('M4 4h7v7H4V4ZM13 13h7v7h-7v-7ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7Z'),
  releases: glyph('M7 4v12M7 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17 8c0 5-10 3-10 8'),
  integrations: glyph('M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0V7ZM12 17v4'),
}

// Releases and Components are built but not in the menu.
/** Status board is ON HOLD (2026-10-19): it confused people and needs a
 *  rethink. Its page, store fields and links stay in the code; flip this to
 *  bring it back everywhere at once. */
export const STATUS_BOARD_ON = false
const NAV: DashPage[] = STATUS_BOARD_ON ? ['overview', 'docs', 'status', 'integrations'] : ['overview', 'docs', 'integrations']

function BrandChevron({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`flex-shrink-0 text-fg-faint transition-transform duration-150 ease-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/** Which brand the dashboard reads. One brand still names it. `title` is the
 *  Overview heading: avatar and name, the same face as the top-nav chip, with
 *  the menu only as the way to pick another. */
export function BrandSelect({ brand, onSelect, appearance = 'inline' }: {
  brand: string
  onSelect: (key: string) => void
  appearance?: 'inline' | 'title'
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const mine = useSavedBrandKeys()
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const value = mine.includes(brand) ? brand : mine[0]
  const title = appearance === 'title'

  useLayoutEffect(() => {
    if (!open) { setMenuPos(null); return }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPos({ top: rect.bottom + 6, left: rect.left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (mine.length === 0 || !value) return null
  if (!title && mine.length === 1) {
    return <span className="text-caption text-fg-muted">{t('Brand')}: <span className="font-medium text-fg">{themeDisplayName(mine[0], store.themeLabels)}</span></span>
  }

  const face = (key: string) => ({
    ramp: themeBrandRamp(key, store.themeSources, store.themeKinds, store),
    appearance: store.themeKinds[key] ?? 'light' as const,
  })
  const current = face(value)

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('Brand')}: ${themeDisplayName(value, store.themeLabels)}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-w-0 items-center rounded-lg text-left transition-colors duration-150 ease-out ${SELECT_FOCUS} ${
          title
            ? `h-8 max-w-[18rem] gap-2 pl-1 pr-2 ${open ? 'bg-chip-rest' : 'hover:bg-chip-rest'}`
            : `h-8 max-w-[14rem] gap-1.5 pl-1 pr-2 ${open ? 'bg-chip-rest' : 'hover:bg-chip-rest'}`
        }`}
      >
        <span className="grid h-6 w-6 flex-shrink-0 place-items-center">
          <ThemeAvatar size={27} ramp={current.ramp} appearance={current.appearance} fallback={store.primaryColor} />
        </span>
        <span className={`min-w-0 flex-1 truncate ${title ? 'text-heading font-semibold text-fg' : 'text-caption font-medium text-fg'}`}>
          {themeDisplayName(value, store.themeLabels)}
        </span>
        <BrandChevron open={open} />
      </button>
      {open && menuPos && createPortal(
        <ul
          ref={menuRef}
          role="listbox"
          aria-label={t('Brand')}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: CHROME_MENU_Z }}
          className={`flex w-[15rem] flex-col ${SELECT_LIST}`}
        >
          <li className="px-2.5 pb-1 pt-1.5 text-micro font-semibold uppercase tracking-widest text-fg-faint">{t('Brand')}</li>
          {mine.map((key) => {
            const row = face(key)
            const selected = key === value
            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => { onSelect(key); setOpen(false) }}
                  className={`${SELECT_OPTION} flex h-8 items-center gap-2 ${selected ? SELECT_OPTION_ON : SELECT_OPTION_OFF}`}
                >
                  <ThemeAvatar size={18} ramp={row.ramp} appearance={row.appearance} fallback={store.primaryColor} />
                  <span className="min-w-0 flex-1 truncate text-caption">{themeDisplayName(key, store.themeLabels)}</span>
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-fg">
                      <path d="M5 12.5 10 17.5 19 7.5" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </div>
  )
}

function DashboardNav({ page, onPage, docKey, onDocKey, onBack }: {
  page: DashPage
  onPage: (next: DashPage) => void
  docKey: string
  onDocKey: (key: string) => void
  /** Back to the list of design systems. Absent where there is no such list to go to. */
  onBack?: () => void
}) {
  const { t } = useI18n()
  return (
    <InspectorPortal>
      <nav aria-label={t('Design system')} className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-3 pb-4 pt-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 flex-shrink-0 items-center gap-2 rounded-lg px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-fg/[0.05] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            {t('All design systems')}
          </button>
        )}
        <div className={`flex flex-col gap-0.5 ${onBack ? 'border-t border-line pt-3' : ''}`}>
          {NAV.map((key) => (
            <div key={key} className="flex flex-col gap-0.5">
              <NavRow
                on={page === key}
                icon={PAGE_GLYPH[key]}
                label={t(DASH_PAGE_LABEL[key])}
                trailing={key === 'docs' ? (
                  <BrandChevron open={page === 'docs'} />
                ) : key === 'status' ? (
                  <span className="flex-shrink-0 text-mini font-light leading-none text-fg-faint">Beta</span>
                ) : undefined}
                // Docs is an accordion: open → foundation list; click again →
                // collapse back to Overview. Other rows are one-shot navigations.
                onClick={() => onPage(key === 'docs' && page === 'docs' ? 'overview' : key)}
              />
              {/* Docs lists its pages while it is open: one per foundation. */}
              {key === 'docs' && page === 'docs' && (
                <ul className="mb-1 ml-[1.125rem] flex flex-col gap-0.5 border-l border-line pl-2">
                  {DASH_DOCS.map((doc) => (
                    <li key={doc.key}>
                      <button
                        type="button"
                        onClick={() => onDocKey(doc.key)}
                        aria-current={docKey === doc.key ? 'page' : undefined}
                        className={`flex h-7 w-full items-center rounded-md px-2 text-left text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
                          docKey === doc.key ? 'font-semibold text-fg' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
                        }`}
                      >
                        {t(doc.label)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </nav>
    </InspectorPortal>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-2 text-caption first:border-t-0">
      <dt className="flex-shrink-0 text-fg-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-fg">{children}</dd>
    </div>
  )
}

function IntegrationsPage({ dash, timeAgo, onOpenGithub }: {
  dash: Dashboard
  timeAgo: (iso: string) => string
  onOpenGithub: () => void
}) {
  const { t } = useI18n()
  const { guest } = useAccess()
  const { store, github } = dash
  const when = (iso: string | null) => (iso ? timeAgo(iso) : t('Never'))
  // GitHub is the one destination here. Figma is synced from the plugin, not
  // from this page. Connecting a repository is an account feature: a visitor
  // without one is asked to sign in first, and nothing else on the page asks.
  return (
    <>
      <PageHeader
        title={t('Integrations')}
        detail={t('Where this design system goes. If a destination is behind, what it holds is older than what you see here.')}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="GitHub" right={guest ? undefined : <SourcePill state={github} />}>
          {guest ? (
            <>
              <p className="text-caption text-fg-muted">
                {t('Sign in to push this design system to a GitHub repository: tokens.json, variables.css and README.md.')}
              </p>
              <button type="button" onClick={() => goToLogin(undefined, 'signin')} className={`${BTN_PRIMARY} self-start`}>
                {t('Sign in to connect GitHub')}
              </button>
            </>
          ) : (
            <>
              <dl className="flex flex-col">
                <Fact label={t('Repository')}>{store.githubRepo ?? '—'}</Fact>
                <Fact label={t('Last push')}>{when(store.githubRepo ? store.githubLastPushAt : null)}</Fact>
                <Fact label={t('Files')}>tokens.json · variables.css · README.md</Fact>
              </dl>
              <button type="button" onClick={onOpenGithub} className={`${github === 'stale' || !store.githubRepo ? BTN_PRIMARY : BTN} self-start`}>
                {store.githubRepo ? t('Open GitHub') : t('Connect GitHub')}
              </button>
            </>
          )}
        </Card>
      </div>
    </>
  )
}

export default function SystemDashboard({
  page, onPage, docKey, onDocKey, brand, appearance, overviewHeader, onBack, timeAgo,
  onOpenGithub, onEditFoundation, onOpenBrand, onSelectBrand, onEditBrand, onOpenColorTheme,
  onEditRole, onOpenComponent, docsExits, onExportBrand, onAddBrand, onImportBrand, addBrandBlocked, maxBrands,
}: {
  page: DashPage
  onPage: (next: DashPage) => void
  /** The foundation page Docs has open. */
  docKey: string
  onDocKey: (key: string) => void
  /** The brand whose roles the dashboard reads. */
  brand: string
  /** The appearance the brand is shown in: Docs paints its ramps in it. */
  appearance: ThemeAppearance
  /** Home's own title row for the design system, given the token count to state. */
  overviewHeader: (tokenCount: number) => ReactNode
  onBack?: () => void
  timeAgo: (iso: string) => string
  /** Brands the Figma sync publishes (File & modes). */
  onOpenGithub: () => void
  onEditFoundation?: (key: string) => void
  /** Overview's Color card: open the brand preview on the Color edition. */
  onOpenBrand?: () => void
  /** Overview column header: that brand becomes the one on screen. */
  onSelectBrand: (key: string) => void
  /** Overview column header: open that brand in the editor. */
  onEditBrand: (key: string) => void
  /** Brands' theme chips: open Variables · Color for that brand and appearance. */
  onOpenColorTheme?: (brand: string, appearance: 'light' | 'dark') => void
  /** Gate before the role editor opens in the inspector. Return `false` to keep it closed. */
  onEditRole?: (roleId: string) => boolean | void
  onOpenComponent?: (key: string) => void
  /** Where a Docs recipe leaves for: Figma, Export, Save, GitHub. */
  docsExits: DocsExits
  /** Overview: a brand card's Export. */
  onExportBrand?: (key: string) => void
  /** Overview: the empty slot's +. */
  onAddBrand?: () => void
  /** Overview: the + → import a brand from another system's context or JSON. */
  onImportBrand?: (json: Record<string, unknown>, name: string) => { key: string } | { error: string }
  /** Why a brand cannot be added right now. */
  addBrandBlocked?: string
  /** How many brands this plan holds. */
  maxBrands?: number
}) {
  const { t } = useI18n()
  const dash = useDashboard(brand)
  const { themeLabels } = useDesignStore()
  const savedBrands = useSavedBrandKeys()
  // No brand in this design system: every page that reads tokens would draw the
  // scaffold's default accent as if someone had chosen it.
  const noBrands = savedBrands.length === 0
  // The role whose primitive picker is open in the inspector. The map stays.
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<StatusKind>('token')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [statusSelected, setStatusSelected] = useState<string | null>(null)
  // Tokens and components are two boards: opening one element opens its own.
  const openStatus = (elementId?: string) => {
    setStatusKind(elementId?.startsWith('component:') ? 'component' : 'token')
    setStatusFilter('all')
    setStatusSelected(elementId ?? null)
    onPage('status')
  }
  const openDoc = (key: string) => {
    // A Docs article links to pages this menu does not hold (guides, the
    // reference sheet): only a foundation page opens here.
    // `onDocKey` sets the page too: calling `onPage` after it would write the
    // stale doc key back over the one just picked.
    if (DASH_DOCS.some((doc) => doc.key === key)) onDocKey(key)
    else onPage('docs')
  }
  useEffect(() => { setEditingRole(null) }, [brand, docKey, page])
  // Releases and Components have no menu entry; a page kept from before lands on Overview.
  const shown: DashPage = page === 'releases' || page === 'components' || (page === 'status' && !STATUS_BOARD_ON) ? 'overview' : page
  const doc = DASH_DOCS.some((item) => item.key === docKey) ? docKey : DEFAULT_DOC_KEY
  return (
    <>
      <DashboardNav page={shown} onPage={onPage} docKey={doc} onDocKey={openDoc} onBack={onBack} />
      <SemanticTokenDrawer
        previewTheme={brand}
        previewAppearance={appearance}
        tokenId={shown === 'docs' && doc === 'color' ? editingRole : null}
        onClose={() => setEditingRole(null)}
      />
      {shown === 'overview' && (
        <OverviewPage
          dash={dash}
          header={overviewHeader(noBrands ? 0 : dash.tokenCount)}
          onOpenFoundation={openDoc}
          onOpenBrand={onOpenBrand}
          onOpenStatus={STATUS_BOARD_ON ? () => openStatus() : undefined}
          onSelectBrand={onSelectBrand}
          onEditBrand={onEditBrand}
          onOpenColorTheme={onOpenColorTheme}
          onExportBrand={onExportBrand}
          onAddBrand={onAddBrand}
          onImportBrand={onImportBrand}
          addBrandBlocked={addBrandBlocked}
          maxBrands={maxBrands}
        />
      )}
      {noBrands && (shown === 'docs' || shown === 'status') && (
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center" role="status">
          <p className="text-body font-medium text-fg">{t('No brand in this design system yet')}</p>
          <p className="max-w-[22rem] text-caption leading-relaxed text-fg-muted">{t('Add a brand from Brands. Its tokens, components and status show here.')}</p>
          <button type="button" onClick={() => onPage('overview')} className={`${BTN} self-center`}>{t('Back to Brands')}</button>
        </div>
      )}
      {!noBrands && shown === 'docs' && (
        <DocsView
          activeFoundationKey={doc}
          onSelectFoundationKey={openDoc}
          onEditFoundation={(key) => onEditFoundation?.(key)}
          exits={docsExits}
          overviewTitle={themeDisplayName(brand, themeLabels)}
          hubMode
          rail={false}
          appearance={appearance}
          docScope={{ themeKey: brand }}
          lead={doc === 'color'
            ? <ColorVariableMap dash={dash} onOpenComponent={onOpenComponent} onEditRole={onEditRole ? (roleId) => { if (onEditRole(roleId) !== false) setEditingRole(roleId) } : undefined} onOpenStatus={STATUS_BOARD_ON ? (id) => openStatus(id) : undefined} />
            : ROLE_TABLE_KEYS.has(doc)
              ? <FoundationRolesTable dash={dash} foundation={doc} onEdit={onEditFoundation} />
              : onEditFoundation
                ? <button type="button" onClick={() => onEditFoundation(doc)} className={`${BTN} self-start`}>{t('Edit in Variables')}</button>
                : undefined}
        />
      )}
      {!noBrands && shown === 'status' && (
        <StatusBoardPage
          dash={dash}
          kind={statusKind}
          onKind={(next) => { setStatusKind(next); setStatusFilter('all'); setStatusSelected(null) }}
          filter={statusFilter}
          onFilter={setStatusFilter}
          selected={statusSelected}
          onSelect={setStatusSelected}
          timeAgo={timeAgo}
        />
      )}
      {shown === 'integrations' && (
        <IntegrationsPage
          dash={dash}
          timeAgo={timeAgo}
          onOpenGithub={onOpenGithub}
        />
      )}
    </>
  )
}
