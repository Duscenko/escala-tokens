// THE DESIGN SYSTEM DASHBOARD — what Home shows when the design system on
// screen is opened. Its menu takes Home's left column: Overview (the system at
// a glance), Docs, Components, Status board and Integrations. Docs holds one
// page per foundation: the Docs article, and for Color the variable map.
//
// Every number comes from `useDashboard` (lib/systemDashboard.ts), which reads
// the tokens, the catalogue and the status decisions. Pages that would need a
// source Escala does not have yet (adoption in product files, hardcoded
// values, Storybook) are not built, on purpose: no page shows a made-up figure.

import { useState, type ReactNode } from 'react'
import { useDesignStore } from '../../../store/useDesignStore'
import { useI18n } from '../../../lib/i18n'
import { useSavedBrandKeys } from '../../../lib/libraryStatus'
import type { ThemeAppearance } from '../../../lib/themeModes'
import { themeDisplayName } from '../../../lib/themeSources'
import { InspectorPortal } from '../WorkspaceInspector'
import DocsView from '../DocsView'
import type { DocsExits } from '../docs/getStarted'
import { BTN, BTN_PRIMARY, Card, NavRow, PageHeader, SourcePill } from './parts'
import { DASH_DOCS, DASH_PAGE_LABEL, DEFAULT_DOC_KEY, ROLE_TABLE_KEYS, useDashboard, type DashPage, type Dashboard } from './dashboardData'
import OverviewPage from './OverviewPage'
import StatusBoardPage, { type StatusFilter, type StatusKind } from './StatusBoardPage'
import ColorVariableMap from './ColorVariableMap'
import FoundationRolesTable from './FoundationRolesTable'
import ComponentsPage from './ComponentsPage'

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

// Releases is built (`ReleasesPage`) but not in the menu for now.
const NAV: DashPage[] = ['overview', 'docs', 'components', 'status', 'integrations']

/** Which brand the dashboard reads. One brand: its name, with nothing to pick. */
export function BrandSelect({ brand, onSelect }: { brand: string; onSelect: (key: string) => void }) {
  const { t } = useI18n()
  const { themeLabels } = useDesignStore()
  const mine = useSavedBrandKeys()
  if (mine.length === 0) return null
  if (mine.length === 1) {
    return <span className="text-caption text-fg-muted">{t('Brand')}: <span className="font-medium text-fg">{themeDisplayName(mine[0], themeLabels)}</span></span>
  }
  return (
    <label className="flex items-center gap-2 text-caption text-fg-muted">
      {t('Brand')}
      <select
        value={mine.includes(brand) ? brand : mine[0]}
        onChange={(e) => onSelect(e.target.value)}
        className="h-8 rounded-lg border border-line bg-surface px-2 text-caption font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        {mine.map((key) => <option key={key} value={key}>{themeDisplayName(key, themeLabels)}</option>)}
      </select>
    </label>
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
                onClick={() => onPage(key)}
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

function IntegrationsPage({ dash, figmaThemes, timeAgo, onSyncFigma, onOpenGithub }: {
  dash: Dashboard
  figmaThemes: readonly string[]
  timeAgo: (iso: string) => string
  onSyncFigma: () => void
  onOpenGithub: () => void
}) {
  const { t } = useI18n()
  const { store, figma, github } = dash
  // File & modes lists one entry per theme a brand ships, so a brand can repeat.
  const brandNames = [...new Set(figmaThemes)].map((key) => themeDisplayName(key, store.themeLabels))
  const viewports = store.figmaSyncSelection?.viewports ?? []
  const when = (iso: string | null) => (iso ? timeAgo(iso) : t('Never'))
  return (
    <>
      <PageHeader
        title={t('Integrations')}
        detail={t('Where this design system goes. If a destination is behind, what it holds is older than what you see here.')}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="Figma" right={<SourcePill state={figma} />}>
          <dl className="flex flex-col">
            <Fact label={t('Last publish')}>{when(store.figmaLastPublishAt)}</Fact>
            <Fact label={t('Brands')}>{brandNames.length ? brandNames.join(' · ') : '—'}</Fact>
            <Fact label={t('Viewports')}>{viewports.length ? viewports.map((v) => t(v.charAt(0).toUpperCase() + v.slice(1))).join(' · ') : '—'}</Fact>
            <Fact label={t('Auto-sync')}>{store.autoSyncFigma ? t('On') : t('Off')}</Fact>
          </dl>
          <button type="button" onClick={onSyncFigma} className={`${figma === 'synced' ? BTN : BTN_PRIMARY} self-start`}>{t('Open Figma sync')}</button>
        </Card>

        <Card title="GitHub" right={<SourcePill state={github} />}>
          <dl className="flex flex-col">
            <Fact label={t('Repository')}>{store.githubRepo ?? '—'}</Fact>
            <Fact label={t('Last push')}>{when(store.githubRepo ? store.githubLastPushAt : null)}</Fact>
            <Fact label={t('Files')}>tokens.json · variables.css · README.md</Fact>
          </dl>
          <button type="button" onClick={onOpenGithub} className={`${github === 'stale' || !store.githubRepo ? BTN_PRIMARY : BTN} self-start`}>
            {store.githubRepo ? t('Open GitHub') : t('Connect GitHub')}
          </button>
        </Card>

      </div>
    </>
  )
}

export default function SystemDashboard({
  page, onPage, docKey, onDocKey, brand, appearance, overviewHeader, brands, onBack, timeAgo, figmaThemes,
  onSyncFigma, onOpenGithub, onEditFoundation, onEditRole, onOpenComponent, docsExits,
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
  /** Home's brand cards, shown on Overview. */
  brands: ReactNode
  onBack?: () => void
  timeAgo: (iso: string) => string
  /** Brands the Figma sync publishes (File & modes). */
  figmaThemes: readonly string[]
  onSyncFigma: () => void
  onOpenGithub: () => void
  onEditFoundation?: (key: string) => void
  /** Opens one semantic role's editor in Variables. */
  onEditRole?: (roleId: string) => void
  onOpenComponent?: (key: string) => void
  /** Where a Docs recipe leaves for: Figma, Export, Save, GitHub. */
  docsExits: DocsExits
}) {
  const { t } = useI18n()
  const dash = useDashboard(brand)
  const { themeLabels } = useDesignStore()
  const savedBrands = useSavedBrandKeys()
  // No brand in this design system: every page that reads tokens would draw the
  // scaffold's default accent as if someone had chosen it.
  const noBrands = savedBrands.length === 0
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
  // Releases has no menu entry for now; a page kept from before lands on Overview.
  const shown: DashPage = page === 'releases' ? 'overview' : page
  const doc = DASH_DOCS.some((item) => item.key === docKey) ? docKey : DEFAULT_DOC_KEY
  return (
    <>
      <DashboardNav page={shown} onPage={onPage} docKey={doc} onDocKey={openDoc} onBack={onBack} />
      {shown === 'overview' && (
        <OverviewPage
          dash={dash}
          header={overviewHeader(noBrands ? 0 : dash.tokenCount)}
          brands={brands}
          onOpenFoundation={openDoc}
          onOpenStatus={() => openStatus()}
        />
      )}
      {noBrands && (shown === 'docs' || shown === 'status' || shown === 'components') && (
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center" role="status">
          <p className="text-body font-medium text-fg">{t('No brand in this design system yet')}</p>
          <p className="max-w-[22rem] text-caption leading-relaxed text-fg-muted">{t('Add a brand from Overview. Its tokens, components and status show here.')}</p>
          <button type="button" onClick={() => onPage('overview')} className={`${BTN} self-center`}>{t('Back to Overview')}</button>
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
            ? <ColorVariableMap dash={dash} onOpenComponent={onOpenComponent} onEditRole={onEditRole} onOpenStatus={(id) => openStatus(id)} />
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
      {!noBrands && shown === 'components' && <ComponentsPage dash={dash} onOpenComponent={onOpenComponent} />}
      {shown === 'integrations' && (
        <IntegrationsPage
          dash={dash}
          figmaThemes={figmaThemes}
          timeAgo={timeAgo}
          onSyncFigma={onSyncFigma}
          onOpenGithub={onOpenGithub}
        />
      )}
    </>
  )
}
