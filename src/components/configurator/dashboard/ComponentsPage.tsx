// COMPONENTS — the catalogue of this design system, grouped by category.
// A row opens the component. Status stays on the row. Figma, preview and
// docs are on the component's own page, not repeated as columns here.

import { useMemo, useState } from 'react'
import { useI18n } from '../../../lib/i18n'
import { CATEGORIES } from '../../../lib/componentCatalogue'
import { componentElementId } from '../../../lib/systemDashboard'
import { EmptyRow } from './parts'
import type { Dashboard } from './dashboardData'
import { StatusMenu } from './StatusMenu'

type Scope = 'system' | 'all'

export default function ComponentsPage({ dash, onOpenComponent }: {
  dash: Dashboard
  onOpenComponent?: (key: string) => void
}) {
  const { t } = useI18n()
  const { components, elements } = dash
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('system')

  const elementOf = useMemo(
    () => new Map(elements.filter((el) => el.kind === 'component').map((el) => [el.id, el])),
    [elements],
  )
  const q = query.trim().toLowerCase()
  const shown = components.filter((row) =>
    (scope === 'all' || row.included)
    && (!q || row.label.toLowerCase().includes(q) || row.key.toLowerCase().includes(q)),
  )
  const known = new Set<string>(CATEGORIES)
  const groups = [
    ...CATEGORIES.map((name) => ({ name, rows: shown.filter((row) => row.category === name) })),
    ...shown
      .filter((row) => !known.has(row.category))
      .reduce<{ name: string; rows: typeof shown }[]>((acc, row) => {
        const group = acc.find((item) => item.name === row.category)
        if (group) group.rows.push(row)
        else acc.push({ name: row.category, rows: [row] })
        return acc
      }, []),
  ].filter((group) => group.rows.length > 0)

  return (
    <>
      <header className="flex flex-col gap-3">
        <h2 className="text-heading font-semibold text-fg">{t('Components')}</h2>
        <div className="flex flex-wrap items-center gap-2">
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
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search')}
              aria-label={t('Search components')}
              className="h-8 w-52 rounded-lg border border-line bg-transparent px-2.5 text-caption text-fg placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            />
        </div>
      </header>

      {groups.length === 0 ? <EmptyRow>{t('No component matches.')}</EmptyRow> : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.name} aria-labelledby={`components-${group.name.replace(/\W+/g, '-')}`} className="flex flex-col">
              <h3 id={`components-${group.name.replace(/\W+/g, '-')}`} className="px-2 pb-1 text-micro font-semibold text-fg-faint">
                {group.name}
              </h3>
              <ul>
                {group.rows.map((row) => {
                  const element = elementOf.get(componentElementId(row.key))
                  return (
                    <li key={row.key} className="flex h-9 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-fg/[0.04]">
                      <button
                        type="button"
                        onClick={() => onOpenComponent?.(row.key)}
                        title={t('Open {name}', { name: row.label })}
                        aria-label={row.included ? undefined : `${row.label}, ${t('Not in this system')}`}
                        className="flex h-full min-w-0 flex-1 items-center rounded-sm text-left text-ui font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                      >
                        <span className={`truncate ${row.included ? 'text-fg' : 'text-fg-muted'}`}>{row.label}</span>
                      </button>
                      {element && <StatusMenu element={element} />}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
