// COMPONENTS — the catalogue of this design system, grouped by category.
// A row opens the component. Status stays on the row. Figma, preview and
// docs are on the component's own page, not repeated as columns here.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../../lib/i18n'
import { CATEGORIES } from '../../../lib/componentCatalogue'
import { componentElementId, type DashboardElement, type Suggestion } from '../../../lib/systemDashboard'
import { ELEMENT_STATUSES, type ElementStatus } from '../../../lib/systemDashboardTypes'
import { useDesignStore } from '../../../store/useDesignStore'
import { EmptyRow, StatusPill } from './parts'
import { STATUS_LABEL, type Dashboard } from './dashboardData'

type Scope = 'system' | 'all'

/** The status a check suggests. `keep` changes nothing. Same map as the status board. */
const SUGGESTED_STATUS: Record<Suggestion, ElementStatus | null> = { approve: 'approved', changes: 'review', keep: null }

/** The status pill as a menu. A choice is the same decision the status board stores. */
function StatusMenu({ element }: { element: DashboardElement }) {
  const { t } = useI18n()
  const setElementStatus = useDesignStore((s) => s.setElementStatus)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const suggested = SUGGESTED_STATUS[element.suggestion]

  useEffect(() => {
    if (!open || !btnRef.current) return
    const place = () => {
      const rect = btnRef.current!.getBoundingClientRect()
      const up = window.innerHeight - rect.bottom < 220 && rect.top > 220
      const menuW = 180
      setBox({
        top: up ? rect.top - 4 : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.right - menuW, window.innerWidth - menuW - 8)),
        up,
      })
    }
    place()
    const close = () => setOpen(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      btnRef.current?.focus({ preventScroll: true })
      setOpen(false)
    }
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', close, true)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    const focus = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"], button')?.focus({ preventScroll: true })
    })
    return () => {
      window.cancelAnimationFrame(focus)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', close, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])

  function choose(status: ElementStatus | null) {
    setElementStatus(element.id, status)
    btnRef.current?.focus({ preventScroll: true })
    setOpen(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('Set status')}: ${element.name}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <StatusPill status={element.status} />
      </button>
      {open && box && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={t('Set status')}
          data-status-menu
          style={{ top: box.top, left: box.left, transform: box.up ? 'translateY(-100%)' : undefined }}
          className="fixed z-50 flex w-40 flex-col gap-0.5 rounded-lg border border-line bg-elevated p-1 shadow-lg"
        >
          {ELEMENT_STATUSES.map((status) => {
            const on = element.decided && element.status === status
            const hinted = !on && suggested === status
            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={on}
                title={hinted ? t('The checks suggest this') : undefined}
                onClick={() => choose(status)}
                className={`h-7 rounded-md px-2 text-left text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  on
                    ? 'bg-accent-solid text-accent-ink'
                    : hinted
                      ? 'text-accent-ui hover:bg-accent-ui/[0.08]'
                      : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
                }`}
              >
                {t(STATUS_LABEL[status])}
              </button>
            )
          })}
          {element.decided && (
            <>
              <div className="my-0.5 border-t border-line" />
              <button
                type="button"
                onClick={() => choose(null)}
                className="h-7 rounded-md px-2 text-left text-caption text-fg-muted hover:bg-fg/[0.05] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
              >
                {t('Back to automatic')}
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

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
