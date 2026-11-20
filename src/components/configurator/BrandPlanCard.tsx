import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { INSPECTOR_EASE } from '../../lib/inspectorMotion'
import { PLAN_MOTION, type PlanItem, type PlanItemKey } from '../../lib/brandPlan'
import { BOARD_TOOLBAR_LIFT } from './ThemeSaveBar'

/** The chrome's own curve on a CSS transition (`--ease-out-quint`). */
const QUINT = '[transition-timing-function:var(--ease-out-quint)] motion-reduce:transition-none'
// Card and pill share one grid cell, pinned bottom-left (the dock is a grid):
// while one leaves and the other arrives they overlap in place, and nothing
// is re-anchored mid-motion (a popped-out card used to drop as the dock shrank).
const SURFACE = `[grid-area:1/1] self-end justify-self-start dark pointer-events-auto rounded-xl border border-white/[0.12] bg-[#050506] text-fg ${BOARD_TOOLBAR_LIFT}`

/**
 * The create studio's plan, floating at the Board's bottom-left corner on the
 * toolbar's line: what this brand needs (its scope), how far it got, and the
 * suggested order. A checklist, not a stepper (CLAUDE.md: no wizard, no
 * stepper, no Continue): every item opens its accordion row in any order,
 * nothing is locked, and Save · CSS · Figma · Agent work from the first frame.
 * An item is done once its row was edited, or with Keep. It folds to a pill.
 *
 * Painted like the board toolbar beside it (a fixed dark pill, `dark`), so it
 * reads as the platform's tool on any brand's canvas, never the brand's.
 *
 * Motion (`PLAN_MOTION`, the chrome's curve): it does not arrive — like the
 * toolbar, it is there when the board is. Folding grows the card out of its
 * pill's corner and shrinks it back; the open item's ring slides between
 * rows; a tick lands when an item gets done and the progress ring fills.
 * Reduced motion: every change is instant.
 */
export function BrandPlanCard({ title, items, active, systemLabel, onOpen, onKeep, onFocus }: {
  title: string
  items: readonly PlanItem[]
  /** The item the open accordion row stands for. */
  active?: PlanItemKey
  /** The system brand an inherited item comes from. */
  systemLabel?: string
  /** Open that item's row in the inspector. */
  onOpen: (item: PlanItem) => void
  /** Mark the item done without changing it. */
  onKeep: (item: PlanItem) => void
  /** Point at the item's tiles on the board (null: stop). */
  onFocus: (key: PlanItemKey | null) => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion() ?? false
  const baseId = useId()
  const [folded, setFolded] = useState(false)
  // A new ring per opening: the ring slides between rows of ONE card, never
  // in from where it sat in the card that was folded away.
  const [opened, setOpened] = useState(0)
  const ringId = `plan-current-${baseId}-${opened}`
  const done = items.filter((item) => item.done).length
  const total = items.length
  const allDone = done === total
  const count = t('{done} of {total}', { done: String(done), total: String(total) })
  // Items already shown done: their tick does not land again when the card
  // unfolds or re-renders, only when an item turns done.
  const shownDone = useRef(new Set(items.filter((item) => item.done).map((item) => item.key)))
  // eslint-disable-next-line react-hooks/refs -- read-only during render; written after commit
  const landing = new Set(items.filter((item) => item.done && !shownDone.current.has(item.key)).map((item) => item.key))
  useEffect(() => { for (const item of items) if (item.done) shownDone.current.add(item.key) })

  // Grows from (and shrinks to) the bottom-left corner, where the pill sits.
  const swap = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96, y: 4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 4, transition: { duration: PLAN_MOTION.fold, ease: INSPECTOR_EASE } },
        transition: { duration: PLAN_MOTION.unfold, ease: INSPECTOR_EASE },
      }

  return (
    <AnimatePresence initial={false}>
      {folded ? (
        <motion.button
          key="pill"
          {...swap}
          style={{ transformOrigin: 'bottom left' }}
          type="button"
          onClick={() => { setOpened((n) => n + 1); setFolded(false) }}
          aria-expanded={false}
          aria-label={`${title} · ${count}`}
          className={`${SURFACE} flex h-10 items-center gap-2 px-3 text-caption transition-colors duration-150 ${QUINT} hover:bg-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60`}
        >
          <PlanProgress done={done} total={total} size={18} reduce={reduce} />
          <span className="font-semibold">{t('Plan')}</span>
          <span className="text-fg-muted">{count}</span>
        </motion.button>
      ) : (
        <motion.section
          key="card"
          {...swap}
          style={{ transformOrigin: 'bottom left' }}
          aria-label={title}
          className={`${SURFACE} mb-[3.25rem] flex w-[15.5rem] flex-col p-1.5`}
          onMouseLeave={() => onFocus(null)}
        >
          <header className="flex items-center gap-2 px-2 pb-1.5 pt-1">
            <PlanProgress done={done} total={total} size={18} reduce={reduce} />
            <h3 className="min-w-0 flex-1 truncate text-caption font-semibold">{title}</h3>
            <span className="text-mini text-fg-muted">{count}</span>
            <button
              type="button"
              onClick={() => { onFocus(null); setFolded(true) }}
              aria-expanded
              aria-label={t('Fold the plan')}
              title={t('Fold the plan')}
              className={`grid h-6 w-6 place-items-center rounded-md text-fg-muted transition-colors duration-150 ${QUINT} hover:bg-white/[0.08] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </button>
          </header>
          <ol className="flex flex-col">
            {items.map((item) => {
              const current = item.key === active
              const note = item.done
                ? null
                : item.inherited && systemLabel ? t('From {name}', { name: systemLabel }) : null
              return (
                <li
                  key={item.key}
                  className={`group relative flex items-center rounded-lg transition-colors duration-150 ${QUINT} ${current ? '' : 'hover:bg-white/[0.05]'}`}
                  onMouseEnter={() => onFocus(item.key)}
                >
                  {current && (
                    // One ring for the open item, sliding to the next row
                    // instead of blinking out here and in there.
                    <motion.span
                      layoutId={ringId}
                      aria-hidden
                      className="absolute inset-0 rounded-lg bg-white/[0.07] ring-1 ring-inset ring-accent-solid"
                      transition={reduce ? { duration: 0 } : { type: 'tween', duration: PLAN_MOTION.current, ease: INSPECTOR_EASE }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    onFocus={() => onFocus(item.key)}
                    onBlur={() => onFocus(null)}
                    aria-current={current ? 'step' : undefined}
                    className="relative flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                  >
                    <PlanDot done={item.done} current={current} lands={landing.has(item.key)} reduce={reduce} />
                    <span className={`min-w-0 truncate transition-colors duration-200 ${QUINT} ${item.done ? 'text-fg-muted' : 'text-fg'}`}>{t(item.label)}</span>
                    {note && <span className="ml-auto truncate pl-2 text-mini text-fg-faint">{note}</span>}
                    <span className="sr-only">{item.done ? t('Done') : t('To do')}</span>
                  </button>
                  {!item.done && (
                    <button
                      type="button"
                      onClick={() => onKeep(item)}
                      title={t('Keep it as it is and mark it done')}
                      className={`relative mr-1 flex-shrink-0 rounded-md px-1.5 py-1 text-mini font-medium text-fg-muted transition-[opacity,background-color,color] duration-150 ${QUINT} hover:bg-white/[0.08] hover:text-fg focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 ${current ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      {t('Keep')}
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="mt-1 border-t border-white/[0.08] px-2 pb-1 pt-2 text-mini text-fg-faint">
            {allDone
              ? t('All set. Save the brand, or ship it as CSS, Figma or Agent.')
              : t('A suggested order, not a required one. Save or ship at any time.')}
          </p>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

function PlanDot({ done, current, lands, reduce }: { done: boolean; current: boolean; lands: boolean; reduce: boolean }) {
  if (done) {
    return (
      <motion.span
        aria-hidden
        initial={lands && !reduce ? { scale: 0.5, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: PLAN_MOTION.done, ease: INSPECTOR_EASE }}
        className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-accent-solid text-accent-ink"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
      </motion.span>
    )
  }
  return (
    <span
      aria-hidden
      className={`h-4 w-4 flex-shrink-0 rounded-full border-[1.5px] transition-[border-color,box-shadow] duration-200 ${QUINT} ${current ? 'border-accent-solid shadow-[inset_0_0_0_3px_var(--accent-solid)]' : 'border-fg-faint'}`}
    />
  )
}

/** A ring that fills as items are done. */
function PlanProgress({ done, total, size, reduce }: { done: number; total: number; size: number; reduce: boolean }) {
  const r = (size - 3) / 2
  const c = 2 * Math.PI * r
  const share = total ? done / total : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent-solid)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${c * share} ${c}`}
        style={{ transition: reduce ? 'none' : `stroke-dasharray ${PLAN_MOTION.done}s var(--ease-out-quint)` }}
      />
    </svg>
  )
}
