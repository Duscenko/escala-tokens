import { useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import FoundationSwitchStrip from './FoundationSwitchStrip'
import { WorkspaceSaveBar } from './ThemeSaveBar'
import { INSPECTOR_WIDTH } from './WorkspaceInspector'
import { INSPECTOR_TABS_H } from './themeWorkspaceLayout'
import { BLOCKS, BLOCK_GROUPS, blocksIn, matchesBlock, type BlockDef } from './blocks/blockRegistry'

const ROW_ACTIVE = 'border-line-strong bg-app text-fg font-medium shadow-[0_2px_12px_-6px_rgba(0,0,0,0.24)]'
const ROW_IDLE = 'border-transparent text-fg-muted hover:bg-elevated hover:text-fg'

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
 * Blocks' DIRECTORY — the same right-hand column as Components' (288px,
 * `bg-side-panel`, the 60px band): the four groups as a switch, a search,
 * then every group as an accordion, the open block's group expanded.
 */
export default function BlocksRail({
  icons, active, onSelect, onOpenIndex, search = '', onSearch,
}: {
  icons: Record<string, ComponentType>
  /** null = the index is open. */
  active: BlockDef | null
  onSelect: (b: BlockDef) => void
  onOpenIndex: () => void
  search?: string
  onSearch: (q: string) => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion() ?? false
  const activeGroup = active?.group ?? ''
  const q = search.trim()
  const groups = useMemo(
    () => BLOCK_GROUPS.map((g) => ({ g, items: blocksIn(g).filter((b) => matchesBlock(b, q)) })).filter((x) => x.items.length > 0),
    [q],
  )
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (g: string) => setOpen((prev) => {
    const next = new Set(prev)
    if (next.has(g)) next.delete(g)
    else next.add(g)
    return next
  })
  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <aside
      aria-label={t('Blocks')}
      className="relative my-3 mr-3 ml-3 flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-side-panel"
      style={{ width: INSPECTOR_WIDTH } as CSSProperties}
    >
      <div
        className="flex flex-shrink-0 items-center border-b border-line"
        style={{ height: INSPECTOR_TABS_H, paddingInline: `calc((${INSPECTOR_TABS_H}px - 2.5rem) / 2)` }}
      >
        <FoundationSwitchStrip
          ariaLabel={t('Block groups')}
          items={BLOCK_GROUPS.map((g) => {
            const Icon = icons[g]
            return { key: g, label: t(g), icon: Icon ? <Icon /> : undefined }
          })}
          current={activeGroup}
          onSelect={(g) => {
            const first = blocksIn(g as BlockDef['group'])[0]
            if (first) onSelect(first)
            setOpen(new Set())
          }}
        />
      </div>

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
            placeholder={t('Search blocks')}
            aria-label={t('Search blocks')}
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

      <nav aria-label={t('Blocks')} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 pb-3 pt-2">
        {!q && (
          <button
            type="button"
            onClick={onOpenIndex}
            aria-current={active ? undefined : 'page'}
            className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${active ? ROW_IDLE : ROW_ACTIVE}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden className="flex-shrink-0">
              <rect x="2" y="2" width="5" height="5" rx="1.2" />
              <rect x="9" y="2" width="5" height="5" rx="1.2" />
              <rect x="2" y="9" width="5" height="5" rx="1.2" />
              <rect x="9" y="9" width="5" height="5" rx="1.2" />
            </svg>
            <span className="min-w-0 flex-1 truncate">{t('All blocks')}</span>
            <span className="text-caption text-fg-faint">{BLOCKS.length}</span>
          </button>
        )}

        {groups.length === 0 && (
          <p className="px-2 pt-1 text-caption leading-relaxed text-fg-faint">
            {t('No blocks match')} “{q}”.
          </p>
        )}

        {groups.map(({ g, items }) => {
          const Icon = icons[g]
          const groupActive = activeGroup === g
          const expanded = Boolean(q) || groupActive || open.has(g)
          const panelId = `blocks-dir-${g.toLowerCase()}`
          return (
            <div key={g} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggle(g)}
                aria-expanded={expanded}
                aria-controls={panelId}
                className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  groupActive ? 'font-semibold text-fg' : 'text-fg-muted hover:bg-elevated hover:text-fg'
                }`}
              >
                {Icon ? <span className={`flex-shrink-0 ${groupActive ? '' : 'text-fg-faint'}`}><Icon /></span> : null}
                <span className="min-w-0 flex-1 truncate">{t(g)}</span>
                <span className="text-caption font-normal text-fg-faint">{items.length}</span>
                {!groupActive && <span className="text-fg-faint"><Chevron open={expanded} /></span>}
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
                      {items.map((b) => {
                        const isActive = b.id === active?.id
                        return (
                          <button
                            key={b.id}
                            type="button"
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => onSelect(b)}
                            className={`flex w-full items-center rounded-lg border px-2.5 py-1.5 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${isActive ? ROW_ACTIVE : ROW_IDLE}`}
                          >
                            <span className="min-w-0 truncate">{b.name}</span>
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
      <WorkspaceSaveBar statusOnly />
    </aside>
  )
}
