// COMPONENTS — the catalogue seen from this design system: which components
// are in it, and for each one whether Figma, a live preview and documentation
// exist. A row opens the component's own page.

import { useMemo, useState } from 'react'
import { useI18n } from '../../../lib/i18n'
import { CATEGORIES } from '../../../lib/componentCatalogue'
import { componentElementId } from '../../../lib/systemDashboard'
import { BTN, Card, EmptyRow, Kpi, KpiRow, PageHeader, ROW, StatusPill, TD, TH, Tag, YesNo } from './parts'
import type { Dashboard } from './dashboardData'

type Scope = 'system' | 'all'

function csvCell(value: string | number | boolean): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export default function ComponentsPage({ dash, onOpenComponent }: {
  dash: Dashboard
  onOpenComponent?: (key: string) => void
}) {
  const { t } = useI18n()
  const { components, elements, store } = dash
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [scope, setScope] = useState<Scope>('system')

  const included = components.filter((row) => row.included)
  const statusOf = useMemo(() => new Map(elements.map((el) => [el.id, el.status])), [elements])
  const q = query.trim().toLowerCase()
  const shown = components.filter((row) =>
    (scope === 'all' || row.included)
    && (category === 'all' || row.category === category)
    && (!q || row.label.toLowerCase().includes(q) || row.key.toLowerCase().includes(q)),
  )

  const share = (count: number) => (included.length ? count / included.length : 0)
  const inFigma = included.filter((row) => row.figmaSets > 0).length
  const withPreview = included.filter((row) => row.preview).length
  const documented = included.filter((row) => row.documented).length

  const exportReport = () => {
    const head = ['Component', 'Category', 'In system', 'Status', 'Figma sets', 'Live preview', 'Documented', 'Variants', 'Colour roles']
    const lines = components.map((row) => [
      row.label, row.category, row.included, statusOf.get(componentElementId(row.key)) ?? '',
      row.figmaSets, row.preview, row.documented, row.variants, row.roles,
    ].map(csvCell).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${store.projectName || 'design-system'}-components.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title={t('Components')}
        detail={t('Which components are in this design system, and whether each one exists in Figma, has a live preview and is documented.')}
        right={<button type="button" onClick={exportReport} className={BTN}>{t('Export report')}</button>}
      />

      <KpiRow>
        <Kpi
          label={t('In this system')}
          value={`${included.length} / ${components.length}`}
          meter={components.length ? included.length / components.length : 0}
          detail={t('Components this design system ships, out of the catalogue.')}
        />
        <Kpi label={t('In Figma')} value={`${inFigma} / ${included.length}`} meter={share(inFigma)} detail={t('The plugin builds them as component sets.')} />
        <Kpi label={t('Live preview')} value={`${withPreview} / ${included.length}`} meter={share(withPreview)} detail={t('Rendered from your tokens in Components.')} />
        <Kpi label={t('Documented')} value={`${documented} / ${included.length}`} meter={share(documented)} detail={t('Usage, accessibility and props are written.')} />
      </KpiRow>

      <Card
        title={scope === 'system' ? t('Components in this system') : t('All components')}
        right={(
          <>
            <div role="group" aria-label={t('Which components')} className="flex h-8 items-center rounded-lg border border-line p-0.5">
              {(['system', 'all'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  aria-pressed={scope === key}
                  className={`h-7 rounded-md px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                    scope === key ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {key === 'system' ? t('In this system') : t('Whole catalogue')}
                </button>
              ))}
            </div>
            <select
              aria-label={t('Category')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-caption text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <option value="all">{t('All categories')}</option>
              {CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search')}
              aria-label={t('Search components')}
              className="h-8 w-40 rounded-lg border border-line bg-transparent px-2.5 text-caption text-fg placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            />
          </>
        )}
      >
        {shown.length === 0 ? <EmptyRow>{t('No component matches.')}</EmptyRow> : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>{t('Component')}</th>
                  <th className={TH}>{t('Status')}</th>
                  <th className={TH}>{t('Figma')}</th>
                  <th className={TH}>{t('Preview')}</th>
                  <th className={TH}>{t('Docs')}</th>
                  <th className={`${TH} text-right`}>{t('Variants')}</th>
                  <th className={`${TH} text-right`}>{t('Colour roles')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const status = statusOf.get(componentElementId(row.key))
                  return (
                    <tr key={row.key} className={`${ROW} transition-colors hover:bg-fg/[0.03]`}>
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => onOpenComponent?.(row.key)}
                          title={t('Open {name}', { name: row.label })}
                          className="flex flex-col items-start rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                        >
                          <span className="font-semibold text-fg hover:underline">{row.label}</span>
                          <span className="text-micro text-fg-faint">{row.category}</span>
                        </button>
                      </td>
                      <td className={TD}>{status ? <StatusPill status={status} /> : <Tag>{t('Not in this system')}</Tag>}</td>
                      <td className={TD}><YesNo yes={row.figmaSets > 0} yesLabel={t('In Figma')} noLabel={t('Not in Figma')} /></td>
                      <td className={TD}><YesNo yes={row.preview} yesLabel={t('Has a live preview')} noLabel={t('No live preview')} /></td>
                      <td className={TD}><YesNo yes={row.documented} yesLabel={t('Documented')} noLabel={t('Documentation is incomplete')} /></td>
                      <td className={`${TD} text-right tabular-nums`}>{row.variants}</td>
                      <td className={`${TD} text-right tabular-nums`}>{row.roles}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-caption text-fg-faint">{t('A dash means it is missing. Select a component to open its page: variants, tokens, usage and code.')}</p>
      </Card>
    </>
  )
}
