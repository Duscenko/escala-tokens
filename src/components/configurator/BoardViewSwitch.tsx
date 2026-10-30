import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'
import { HintTip } from '../ui/HintTip'

/** What the board shows: the bento board of the brand, or every catalogue
 *  component as a cover painted in its tokens. */
export type BoardView = 'theme' | 'components'

const VIEWS: BoardView[] = ['theme', 'components']

/** The id of a view's tab, so the board region can name itself after it
 *  (`aria-labelledby`). */
export function boardTabId(panelId: string, view: BoardView): string {
  return `${panelId}-tab-${view}`
}

/**
 * Theme · Components, at the head of the board. One control for the create
 * studio and the Generator, so the switch does not disappear when the studio
 * hands over to the editor. Same segmented pill as Light / Dark and
 * Desktop / Tablet / Mobile.
 *
 * It is a real tab list (WAI-ARIA tabs, automatic activation): one tab stop,
 * the arrows move between the two views and select them, Home / End jump to
 * the ends, and each tab points at the board it shows (`aria-controls`) —
 * the board region carries `role="tabpanel"` with `boardTabId` as its label.
 *
 * On a narrow board (the Generator's `boardhead` header under 560px — the
 * width where Theme · Components beside Undo · Redo · Random · Inspector
 * starts to clip) the words go and the icons stay. The words remain the tabs'
 * accessible names (`sr-only`) and their tooltip.
 */
export function BoardViewSwitch({ value, onChange, panelId, inset = false }: {
  value: BoardView
  onChange: (view: BoardView) => void
  /** The board region this switch drives. */
  panelId: string
  /** Inside the board toolbar (`BoardHistoryControls`' trailing group), like
   *  Figma's mode switch: no shell of its own, a recessed well, and the
   *  selected view cut back to the toolbar's colour. */
  inset?: boolean
}) {
  const { t } = useI18n()
  const listRef = useRef<HTMLDivElement>(null)
  const glyphs: Record<BoardView, ReactNode> = {
    theme: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
        <path d="M2.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v8.5a2 2 0 0 1-4 0Z" />
        <path d="M7.5 5.5 9.6 3.4a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4L6.3 12.7" />
        <circle cx="5.5" cy="12" r=".6" fill="currentColor" />
      </svg>
    ),
    components: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" />
        <rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" />
        <rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2" />
        <rect x="9" y="9" width="4.5" height="4.5" rx="1.2" />
      </svg>
    ),
  }
  const labels: Record<BoardView, string> = { theme: t('Theme'), components: t('Components') }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = VIEWS.indexOf(value)
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? VIEWS[(at + 1) % VIEWS.length]
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? VIEWS[(at - 1 + VIEWS.length) % VIEWS.length]
        : event.key === 'Home' ? VIEWS[0]
          : event.key === 'End' ? VIEWS[VIEWS.length - 1]
            : null
    if (!next) return
    event.preventDefault()
    onChange(next)
    listRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(boardTabId(panelId, next))}`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t('Board view')}
      onKeyDown={onKeyDown}
      // The pill wears the frame colour (`--nav`, what the left rail is
      // painted with) over the board, with a hairline edge and no shadow.
      // `bg-nav` reads the card's own `.light` / `.dark` class, so it stays
      // the frame's colour for the appearance on screen.
      className={inset
        ? 'flex h-7 flex-shrink-0 items-center gap-0.5 rounded-lg bg-fg/[0.06] p-0.5'
        : 'flex h-9 flex-shrink-0 items-center gap-0.5 rounded-xl border border-line bg-nav p-1'}
    >
      {VIEWS.map((view) => {
        const on = value === view
        const shape = inset ? 'h-6 rounded-md px-2.5 @max-[560px]/boardhead:px-2' : 'h-7 rounded-lg px-3 @max-[560px]/boardhead:px-2.5'
        const state = on
          ? inset ? 'bg-nav font-semibold text-fg shadow-sm' : 'bg-fg/[0.09] font-semibold text-fg'
          : 'font-medium text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
        const tab = (
          <button
            key={view}
            id={boardTabId(panelId, view)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(view)}
            title={inset ? undefined : labels[view]}
            className={`flex items-center gap-1.5 ${shape} text-caption transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui ${state}`}
          >
            {glyphs[view]}
            <span className="@max-[560px]/boardhead:sr-only">{labels[view]}</span>
          </button>
        )
        return inset ? <HintTip key={view} label={labels[view]}>{tab}</HintTip> : tab
      })}
    </div>
  )
}
