import { useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../../lib/componentCatalogue'
import { useI18n } from '../../lib/i18n'
import FoundationSwitchStrip from './FoundationSwitchStrip'
import { INSPECTOR_WIDTH } from './WorkspaceInspector'
import { INSPECTOR_TABS_H } from './themeWorkspaceLayout'

/** Same selected chip as Themes library · My themes (`bg-app` on the panel). */
const ROW_ACTIVE = 'border-line-strong bg-app text-fg font-medium shadow-[0_2px_12px_-6px_rgba(0,0,0,0.24)]'
const ROW_IDLE = 'border-transparent text-fg-muted hover:bg-elevated hover:text-fg'

/** The strip's selected step opens to its name; these fit the 288px column. */
const CATEGORY_SHORT: Record<string, string> = {
  'Button & Actions': 'Buttons',
  'Form Controls': 'Forms',
  'Indicators': 'Indicators',
  'Content & Surfaces': 'Surfaces',
  'Feedback': 'Feedback',
  'Navigation': 'Navigation',
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M3 4.5 6 7.5l3-3" />
    </svg>
  )
}

/**
 * Components' DIRECTORY — the right-hand panel, the same raised column the
 * Generator's inspector is (288px, `bg-side-panel`, its 60px top band).
 * The band carries the category switch (the inspector's sliding-pill strip),
 * the body the catalogue: every category an accordion, the open component's
 * category expanded. The canvas card in the middle is the component's page;
 * the icon rail on the left stays where you are in the product.
 */
export default function ComponentsRail({
  icons,
  active,
  onSelect,
  search = '',
  onSearch,
}: {
  icons: Record<string, ComponentType>
  active: ComponentDef | null
  onSelect: (c: ComponentDef) => void
  search?: string
  onSearch?: (q: string) => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion() ?? false
  const activeKey = active?.key ?? COMPONENTS[0].key
  const activeCategory = active?.category ?? CATEGORIES[0]

  const q = search.trim().toLowerCase()
  const groups = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        cat,
        items: COMPONENTS.filter(
          (c) =>
            c.category === cat &&
            (!q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
        ),
      })).filter((g) => g.items.length > 0),
    [q],
  )

  // The open component's category is always expanded; others open on demand.
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (cat: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  const selectCategory = (cat: string) => {
    const first = COMPONENTS.find((c) => c.category === cat)
    if (first) onSelect(first)
    // Picking from the strip reads as "take me there": fold the rest away.
    setOpen(new Set())
  }

  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <aside
      aria-label={t('Components')}
      className="my-3 mr-3 ml-3 flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-side-panel"
      style={{ width: INSPECTOR_WIDTH } as CSSProperties}
    >
      <div
        className="flex flex-shrink-0 items-center border-b border-line"
        style={{ height: INSPECTOR_TABS_H, paddingInline: `calc((${INSPECTOR_TABS_H}px - 2.5rem) / 2)` }}
      >
        <FoundationSwitchStrip
          ariaLabel={t('Component categories')}
          items={CATEGORIES.map((cat) => {
            const Icon = icons[cat]
            return {
              key: cat,
              label: t(CATEGORY_SHORT[cat] ?? cat),
              icon: Icon ? <Icon /> : undefined,
            }
          })}
          current={activeCategory}
          onSelect={selectCategory}
        />
      </div>

      {onSearch && (
        <div className="flex-shrink-0 px-3 pt-3">
          <div className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-app px-2.5 transition-colors focus-within:border-line-strong">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-fg-faint" aria-hidden>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t('Search components')}
              aria-label={t('Search components')}
              className="min-w-0 flex-1 bg-transparent text-ui text-fg-muted outline-none placeholder:text-fg-faint"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                aria-label={t('Clear filter')}
                className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-xs text-fg-faint transition-colors hover:text-fg-muted"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <nav aria-label={t('Components')} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 pb-3 pt-2">
        {groups.length === 0 && (
          <p className="px-2 pt-1 text-caption leading-relaxed text-fg-faint">
            {t('No components match')} “{search.trim()}”.
          </p>
        )}

        {groups.map(({ cat, items }) => {
          const Icon = icons[cat]
          const categoryActive = activeCategory === cat
          // A search shows every match; otherwise the accordion decides.
          const expanded = Boolean(q) || categoryActive || open.has(cat)
          const panelId = `components-dir-${cat.replace(/\W+/g, '-').toLowerCase()}`
          return (
            <div key={cat} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggle(cat)}
                aria-expanded={expanded}
                aria-controls={panelId}
                className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  categoryActive ? 'font-semibold text-fg' : 'text-fg-muted hover:bg-elevated hover:text-fg'
                }`}
              >
                {Icon ? (
                  <span className={`flex-shrink-0 ${categoryActive ? '' : 'text-fg-faint'}`}>
                    <Icon />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{t(cat)}</span>
                {!categoryActive && (
                  <span className="text-fg-faint">
                    <Chevron open={expanded} />
                  </span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    id={panelId}
                    key="items"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduce ? { height: 0, opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.22, ease }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 flex flex-col gap-0.5 border-l border-line pb-1.5 pl-1.5">
                      {items.map((comp) => {
                        const isActive = comp.key === activeKey
                        return (
                          <button
                            key={comp.key}
                            type="button"
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => onSelect(comp)}
                            className={`flex w-full items-center rounded-lg border px-2.5 py-1.5 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                              isActive ? ROW_ACTIVE : ROW_IDLE
                            }`}
                          >
                            <span className="min-w-0 truncate">{comp.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
