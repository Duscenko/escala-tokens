// THE DESIGN SYSTEM DASHBOARD — what Home shows when the design system on
// screen is opened. Its menu takes Home's left column; the pages follow the
// life of a system: measure it (Overview), govern it (Status board), build it
// (Foundations, Components) and ship it (Releases, Integrations).
//
// Every number comes from `useDashboard` (lib/systemDashboard.ts), which reads
// the tokens, the catalogue and the status decisions. Pages that would need a
// source Escala does not have yet (adoption in product files, hardcoded
// values, Storybook) are not built, on purpose: no page shows a made-up figure.

import { useState, type ReactNode } from 'react'
import { useDesignStore } from '../../../store/useDesignStore'
import { useI18n } from '../../../lib/i18n'
import { myThemeKeys } from '../../../lib/themeLibrary'
import { themeDisplayName } from '../../../lib/themeSources'
import { publishOrigin, syncProjectId } from '../../../lib/figmaSync'
import { mcpClaudeAddCommand, mcpEndpoint } from '../../../lib/agentInstall'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../../lib/pluginVersion'
import { sortForDecision, type SourceState } from '../../../lib/systemDashboard'
import { ELEMENT_STATUSES } from '../../../lib/systemDashboardTypes'
import { InspectorPortal } from '../WorkspaceInspector'
import { BTN, BTN_PRIMARY, Card, Kpi, KpiRow, Mark, NavGroup, NavRow, PageHeader, SourcePill, TEXT_LINK, Tag } from './parts'
import {
  DASH_PAGE_LABEL, STATUS_LABEL, headlineCheck, useCheckText, useDashboard, type DashPage, type Dashboard,
} from './dashboardData'
import StatusBoardPage, { type StatusFilter } from './StatusBoardPage'
import FoundationsPage from './FoundationsPage'
import ComponentsPage from './ComponentsPage'
import ReleasesPage from './ReleasesPage'

const glyph = (d: string) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)
const PAGE_GLYPH: Record<DashPage, ReactNode> = {
  overview: glyph('M4 13h6V4H4v9ZM14 20h6v-9h-6v9ZM4 20h6v-3H4v3ZM14 7h6V4h-6v3Z'),
  status: glyph('M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2'),
  foundations: glyph('M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5'),
  components: glyph('M4 4h7v7H4V4ZM13 13h7v7h-7v-7ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7Z'),
  releases: glyph('M7 4v12M7 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17 8c0 5-10 3-10 8'),
  integrations: glyph('M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0V7ZM12 17v4'),
}

const NAV: { label: string; pages: DashPage[] }[] = [
  { label: 'Measure', pages: ['overview'] },
  { label: 'Govern', pages: ['status'] },
  { label: 'Build', pages: ['foundations', 'components'] },
  { label: 'Ship', pages: ['releases', 'integrations'] },
]

/** Which brand the dashboard reads. One brand: its name, with nothing to pick. */
export function BrandSelect({ brand, onSelect }: { brand: string; onSelect: (key: string) => void }) {
  const { t } = useI18n()
  const { themeOrder, themes, themeLabels } = useDesignStore()
  const mine = myThemeKeys(themeOrder, themes)
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

function DashboardNav({ dash, page, onPage, onBack, timeAgo }: {
  dash: Dashboard
  page: DashPage
  onPage: (next: DashPage) => void
  onBack: () => void
  timeAgo: (iso: string) => string
}) {
  const { t } = useI18n()
  const { store, waiting, draft, figma, github } = dash
  const pending = draft.first ? 0 : draft.changes.length
  const count = (n: number, label: string) => (n > 0
    ? <span title={label} className="flex-shrink-0 text-micro font-normal tabular-nums text-fg-faint">{n}</span>
    : undefined)
  const trailing: Partial<Record<DashPage, ReactNode>> = {
    status: count(waiting, t('Waiting for a decision')),
    releases: count(pending, t('Changes since the last release')),
  }
  const sourceLine = (name: string, state: SourceState, at: string | null) => (
    <li className="flex items-center justify-between gap-2">
      <span className="text-fg-muted">{name}</span>
      <span className={state === 'stale' ? 'text-status-warning' : 'text-fg-faint'}>
        {state === 'never' || !at
          ? t('Not connected')
          : state === 'stale' ? t('Behind · sent {when}', { when: timeAgo(at) }) : t('Sent {when}', { when: timeAgo(at) })}
      </span>
    </li>
  )
  return (
    <InspectorPortal>
      <nav aria-label={t('Design system')} className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-3 pb-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-fg/[0.05] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          {t('All design systems')}
        </button>
        {NAV.map((group) => (
          <NavGroup key={group.label} label={t(group.label)}>
            {group.pages.map((key) => (
              <NavRow
                key={key}
                on={page === key}
                icon={PAGE_GLYPH[key]}
                label={t(DASH_PAGE_LABEL[key])}
                trailing={trailing[key]}
                onClick={() => onPage(key)}
              />
            ))}
          </NavGroup>
        ))}
        <div className="mt-auto flex flex-col gap-1.5 rounded-xl border border-line p-3">
          <span className="text-micro font-semibold text-fg-faint">{t('Sources')}</span>
          <ul className="flex flex-col gap-1 text-micro">
            {sourceLine('Figma', figma, store.figmaLastPublishAt)}
            {sourceLine('GitHub', github, store.githubRepo ? store.githubLastPushAt : null)}
          </ul>
        </div>
      </nav>
    </InspectorPortal>
  )
}

function OverviewPage({ dash, header, brands, onPage, onOpenStatus }: {
  dash: Dashboard
  header: ReactNode
  brands: ReactNode
  onPage: (next: DashPage) => void
  onOpenStatus: (filter: StatusFilter, elementId?: string) => void
}) {
  const { t } = useI18n()
  const checkText = useCheckText()
  const { roles, contrast, components, counts, waiting, elements, tokenCount } = dash
  const included = components.filter((row) => row.included)
  const inFigma = included.filter((row) => row.figmaSets > 0).length
  const toFix = sortForDecision(elements).filter((el) => el.failing > 0).slice(0, 5)
  return (
    <>
      {header}
      <KpiRow>
        <Kpi
          label={t('Tokens')}
          value={tokenCount}
          detail={t('{roles} semantic roles, the primitives behind them and the foundations of every brand.', { roles: roles.roles.length })}
          action={<button type="button" onClick={() => onPage('foundations')} className={`${TEXT_LINK} self-start`}>{t('See foundations')}</button>}
        />
        <Kpi
          label={t('Contrast')}
          value={`${contrast.passing} / ${contrast.measured}`}
          meter={contrast.measured ? contrast.passing / contrast.measured : 0}
          detail={t('Text and control pairs of this brand that clear WCAG AA, in Light and Dark.')}
          action={contrast.failing.length > 0
            ? <button type="button" onClick={() => onOpenStatus('all')} className={`${TEXT_LINK} self-start`}>{t('See what fails')}</button>
            : undefined}
        />
        <Kpi
          label={t('Components')}
          value={`${included.length} / ${components.length}`}
          meter={components.length ? included.length / components.length : 0}
          detail={t('In this system, out of the catalogue. {n} exist in Figma.', { n: inFigma })}
          action={<button type="button" onClick={() => onPage('components')} className={`${TEXT_LINK} self-start`}>{t('See components')}</button>}
        />
        <Kpi
          label={t('Waiting for a decision')}
          value={waiting}
          detail={t('Elements that are proposed or in review.')}
          action={<button type="button" onClick={() => onOpenStatus('all')} className={`${TEXT_LINK} self-start`}>{t('Open status board')}</button>}
        />
      </KpiRow>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title={t('Status of every element')} right={<button type="button" onClick={() => onOpenStatus('all')} className={BTN}>{t('Open status board')}</button>}>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr))]">
            {ELEMENT_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onOpenStatus(status)}
                className="flex flex-col gap-0.5 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
              >
                <span className="text-caption text-fg-muted">{t(STATUS_LABEL[status])}</span>
                <span className="text-title font-semibold tabular-nums text-fg">{counts[status]}</span>
              </button>
            ))}
          </div>
          <p className="text-caption text-fg-faint">{t('Elements are the semantic roles and the components of this system.')}</p>
        </Card>

        <Card title={t('Fix next')}>
          {toFix.length === 0 ? (
            <p className="flex items-center gap-2 text-caption text-fg-muted"><Mark state="pass" />{t('Every check passes.')}</p>
          ) : (
            <ul className="flex flex-col">
              {toFix.map((el) => (
                <li key={el.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    onClick={() => onOpenStatus('all', el.id)}
                    className="flex w-full items-start gap-2 rounded-md py-2 text-left transition-colors hover:bg-fg/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
                  >
                    <span className="pt-0.5"><Mark state="fail" /></span>
                    <span className="flex min-w-0 flex-col">
                      <span className={`font-semibold text-fg ${el.kind === 'token' ? 'font-mono text-micro' : 'text-caption'}`}>{el.name}</span>
                      <span className="text-caption text-fg-muted">{checkText(headlineCheck(el.checks)).text}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {brands}
    </>
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

function IntegrationsPage({ dash, figmaThemes, timeAgo, onSyncFigma, onOpenGithub, onOpenAgentDocs }: {
  dash: Dashboard
  figmaThemes: readonly string[]
  timeAgo: (iso: string) => string
  onSyncFigma: () => void
  onOpenGithub: () => void
  onOpenAgentDocs?: () => void
}) {
  const { t } = useI18n()
  const { store, figma, github } = dash
  const [copied, setCopied] = useState(false)
  const origin = publishOrigin()
  const command = mcpClaudeAddCommand(origin)
  // File & modes lists one entry per theme a brand ships, so a brand can repeat.
  const brandNames = [...new Set(figmaThemes)].map((key) => themeDisplayName(key, store.themeLabels))
  const viewports = store.figmaSyncSelection?.viewports ?? []
  const pluginUpdate = store.pluginBuildSeen != null && store.pluginBuildSeen !== PLUGIN_BUILD
  const when = (iso: string | null) => (iso ? timeAgo(iso) : t('Never'))
  const copy = () => {
    void navigator.clipboard?.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
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

        <Card title={t('AI agents (MCP)')} right={<SourcePill state={figma} />}>
          <p className="text-caption text-fg-muted">
            {t('Agents read the system that was last published, the same one Figma reads. Publish again after a change so they resolve the current tokens.')}
          </p>
          <dl className="flex flex-col">
            <Fact label={t('Endpoint')}><span className="font-mono text-micro">{mcpEndpoint(origin)}</span></Fact>
            <Fact label={t('Project')}><span className="font-mono text-micro">{syncProjectId()}</span></Fact>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={BTN}>{copied ? t('Copied') : t('Copy the Claude Code command')}</button>
            {onOpenAgentDocs && <button type="button" onClick={onOpenAgentDocs} className={BTN}>{t('Other clients')}</button>}
          </div>
        </Card>

        <Card
          title={t('Figma plugin')}
          right={pluginUpdate ? <Tag tone="warning">{t('Update available')}</Tag> : store.pluginBuildSeen ? <Tag tone="success">{t('Up to date')}</Tag> : <Tag>{t('Not downloaded here')}</Tag>}
        >
          <dl className="flex flex-col">
            <Fact label={t('Current version')}>v{PLUGIN_VERSION}</Fact>
            <Fact label={t('What it builds')}>{t('Variables · Styles · Components')}</Fact>
          </dl>
          <button type="button" onClick={onSyncFigma} className={`${pluginUpdate ? BTN_PRIMARY : BTN} self-start`}>{t('Get the plugin')}</button>
        </Card>
      </div>
    </>
  )
}

export default function SystemDashboard({
  page, onPage, brand, overviewHeader, brands, onBack, timeAgo, figmaThemes,
  onSyncFigma, onOpenGithub, onEditFoundation, onOpenComponent, onOpenAgentDocs,
}: {
  page: DashPage
  onPage: (next: DashPage) => void
  /** The brand whose roles the dashboard reads. */
  brand: string
  /** Home's own title row for the design system: name, rename, pin, save. */
  overviewHeader: ReactNode
  /** Home's brand cards, shown on Overview. */
  brands: ReactNode
  onBack: () => void
  timeAgo: (iso: string) => string
  /** Brands the Figma sync publishes (File & modes). */
  figmaThemes: readonly string[]
  onSyncFigma: () => void
  onOpenGithub: () => void
  onEditFoundation?: (key: string) => void
  onOpenComponent?: (key: string) => void
  onOpenAgentDocs?: () => void
}) {
  const dash = useDashboard(brand)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [statusSelected, setStatusSelected] = useState<string | null>(null)
  const openStatus = (filter: StatusFilter, elementId?: string) => {
    setStatusFilter(filter)
    setStatusSelected(elementId ?? null)
    onPage('status')
  }
  return (
    <>
      <DashboardNav dash={dash} page={page} onPage={onPage} onBack={onBack} timeAgo={timeAgo} />
      {page === 'overview' && (
        <OverviewPage dash={dash} header={overviewHeader} brands={brands} onPage={onPage} onOpenStatus={openStatus} />
      )}
      {page === 'status' && (
        <StatusBoardPage
          dash={dash}
          filter={statusFilter}
          onFilter={setStatusFilter}
          selected={statusSelected}
          onSelect={setStatusSelected}
          timeAgo={timeAgo}
        />
      )}
      {page === 'foundations' && (
        <FoundationsPage
          dash={dash}
          onEditFoundation={onEditFoundation}
          onOpenComponent={onOpenComponent}
          onOpenStatus={(id) => openStatus('all', id)}
        />
      )}
      {page === 'components' && <ComponentsPage dash={dash} onOpenComponent={onOpenComponent} />}
      {page === 'releases' && (
        <ReleasesPage dash={dash} timeAgo={timeAgo} onOpenStatus={() => openStatus('all')} onOpenIntegrations={() => onPage('integrations')} />
      )}
      {page === 'integrations' && (
        <IntegrationsPage
          dash={dash}
          figmaThemes={figmaThemes}
          timeAgo={timeAgo}
          onSyncFigma={onSyncFigma}
          onOpenGithub={onOpenGithub}
          onOpenAgentDocs={onOpenAgentDocs}
        />
      )}
    </>
  )
}
