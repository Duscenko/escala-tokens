import { Fragment, useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ComponentDef } from '../../lib/componentCatalogue'
import { PLATFORM_FOLDERS, PLATFORM_FAMILIES, FOLDER_CATEGORY, familiesIn, familyLabel, familyOf } from '../../lib/platformCatalogue'
import { useI18n } from '../../lib/i18n'
import FoundationSwitchStrip from './FoundationSwitchStrip'
import { NAV_COLUMN_HEADER_H, NavFoldButton } from './WorkspaceNavColumn'
import { WorkspaceSaveBar } from './ThemeSaveBar'
import { INSPECTOR_WIDTH } from './WorkspaceInspector'
import { INSPECTOR_TABS_H } from './themeWorkspaceLayout'

/** Same selected chip as Themes library · My themes (`bg-app` on the panel). */
const ROW_ACTIVE = 'border-line-strong bg-app text-fg font-medium shadow-[0_2px_12px_-6px_rgba(0,0,0,0.24)]'
const ROW_IDLE = 'border-transparent text-fg-muted hover:bg-elevated hover:text-fg'

/** The strip's selected step opens to its name; these fit the 288px column. */
const FOLDER_SHORT: Record<string, string> = {
  'Content & Surfaces': 'Surfaces',
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
  onOpenIndex,
  search = '',
  onSearch,
  onInspectorSlot,
  side = 'right',
  onFold,
}: {
  icons: Record<string, ComponentType>
  /** null = the index page is open. */
  active: ComponentDef | null
  onSelect: (c: ComponentDef) => void
  /** Opens the catalogue index (every component as a card). */
  onOpenIndex?: () => void
  search?: string
  onSearch?: (q: string) => void
  /** Callback ref for the dock a pinned component's token list renders into. */
  onInspectorSlot?: (el: HTMLElement | null) => void
  /** `left`: the directory is the Generator's left nav column (its panels
   *  dock in a separate inspector on the right). Default: the old right column. */
  side?: 'left' | 'right'
  /** Folds the left column (side `left` only). */
  onFold?: () => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion() ?? false
  // A part's page lights its family's row: the directory lists families
  // (Storybook's sidebar), a part opens from inside its family's page.
  const activeFamily = active ? familyOf(active.key) : null
  // On the index no folder is selected; the strip shows none lit.
  const activeCategory = activeFamily?.folder ?? ''

  const q = search.trim().toLowerCase()
  const groups = useMemo(
    () =>
      PLATFORM_FOLDERS.map((cat) => ({
        cat,
        // A search matches a family by its name or by any of its parts.
        items: familiesIn(cat).filter(
          (f) =>
            !q ||
            [f.id, familyLabel(f), ...[f.lead, ...f.parts].flatMap((c) => [c.label, c.key])]
              .some((s) => s.toLowerCase().includes(q)),
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
    const first = familiesIn(cat)[0]
    if (first) onSelect(first.lead)
    // Picking from the strip reads as "take me there": fold the rest away.
    setOpen(new Set())
  }

  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <aside
      aria-label={t('Components')}
      className={`relative my-3 ${side === 'left' ? 'rounded-l-2xl' : 'ml-3 mr-3 rounded-2xl'} flex min-h-0 flex-shrink-0 flex-col overflow-hidden border border-line bg-side-panel`}
      style={{ width: INSPECTOR_WIDTH } as CSSProperties}
    >
      <div
        className="flex flex-shrink-0 items-center border-b border-line"
        style={{ height: side === 'left' ? NAV_COLUMN_HEADER_H : INSPECTOR_TABS_H, paddingInline: `calc((${side === 'left' ? NAV_COLUMN_HEADER_H : INSPECTOR_TABS_H}px - 2.5rem) / 2)` }}
      >
        <FoundationSwitchStrip
          ariaLabel={t('Component categories')}
          items={PLATFORM_FOLDERS.map((cat) => {
            const Icon = icons[FOLDER_CATEGORY[cat] ?? cat]
            return {
              key: cat,
              label: t(FOLDER_SHORT[cat] ?? cat),
              icon: Icon ? <Icon /> : undefined,
            }
          })}
          current={activeCategory}
          onSelect={selectCategory}
        />
        {side === 'left' && onFold && <span className="ml-1 flex-shrink-0"><NavFoldButton folded={false} onClick={onFold} /></span>}
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
        {onOpenIndex && !q && (
          <button
            type="button"
            onClick={onOpenIndex}
            aria-current={active ? undefined : 'page'}
            className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
              active ? ROW_IDLE : ROW_ACTIVE
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden className="flex-shrink-0">
              <rect x="2" y="2" width="5" height="5" rx="1.2" />
              <rect x="9" y="2" width="5" height="5" rx="1.2" />
              <rect x="2" y="9" width="5" height="5" rx="1.2" />
              <rect x="9" y="9" width="5" height="5" rx="1.2" />
            </svg>
            <span className="min-w-0 flex-1 truncate">{t('All components')}</span>
            <span className="text-caption text-fg-faint">{PLATFORM_FAMILIES.length}</span>
          </button>
        )}

        {groups.length === 0 && (
          <p className="px-2 pt-1 text-caption leading-relaxed text-fg-faint">
            {t('No components match')} “{search.trim()}”.
          </p>
        )}

        {groups.map(({ cat, items }) => {
          const Icon = icons[FOLDER_CATEGORY[cat] ?? cat]
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
                      {items.map((fam) => {
                        const isActive = fam === activeFamily
                        return (
                          <Fragment key={fam.id}>
                          <button
                            type="button"
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => onSelect(fam.lead)}
                            className={`flex w-full items-center rounded-lg border px-2.5 py-1.5 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                              isActive ? ROW_ACTIVE : ROW_IDLE
                            }`}
                          >
                            <span className="min-w-0 truncate">{familyLabel(fam)}</span>
                          </button>
                          {/* The open family's parts, under it (left column
                              only): a part is a place too, reachable without
                              scrolling the family page to its Anatomy. */}
                          {side === 'left' && isActive && fam.parts.length > 0 && (
                            <div role="group" aria-label={t('Parts of {name}', { name: familyLabel(fam) })} className="ml-3 flex flex-col gap-0.5 border-l border-line py-0.5 pl-1.5">
                              {fam.parts.map((part) => {
                                const partActive = active?.key === part.key
                                return (
                                  <button
                                    key={part.key}
                                    type="button"
                                    aria-current={partActive ? 'page' : undefined}
                                    onClick={() => onSelect(part)}
                                    className={`flex w-full items-center rounded-lg border px-2.5 py-1 text-left text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                                      partActive ? ROW_ACTIVE : ROW_IDLE
                                    }`}
                                  >
                                    <span className="min-w-0 truncate">{part.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          </Fragment>
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
      {/* The Generator's status line — "Not saved" + Save — like every
          inspector of a brand. No CSS · Figma · Agent: this page browses the
          catalogue, it is not where a brand ships from. Nothing when there is
          no brand (no shell footer). */}
      <WorkspaceSaveBar statusOnly />
      {/* Where a pinned component's token list docks (InspectorPortal). It
          covers the directory; leaving the inspector brings the list back.
          `contents`: the panel positions itself against the aside. */}
      <div ref={onInspectorSlot} className="contents" />
    </aside>
  )
}
