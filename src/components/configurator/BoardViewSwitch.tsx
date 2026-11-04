import { useId, useRef, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { HintTip } from '../ui/HintTip'

/** What the board shows: the bento board of the brand, or every catalogue
 *  component as a cover painted in its tokens. */
export type BoardView = 'theme' | 'components'

/** Phosphor bodies (`@phosphor-icons/core@2.1.1`, 256 grid) for the board
 *  toolbar's three views, from the Figma "Icons bar bottom controls" frame:
 *  line when idle, fill when on. */
const BOARD_GLYPH_PATHS = {
  "brand": {
    "regular": "M88,180a12,12,0,1,1-12-12A12,12,0,0,1,88,180Zm152-23.81V208a16,16,0,0,1-16,16H76a46.36,46.36,0,0,1-7.94-.68,44,44,0,0,1-35.43-50.95l25-143.13a15.94,15.94,0,0,1,18.47-13L130.84,26a16,16,0,0,1,12.92,18.52l-12.08,69L199.49,89a16,16,0,0,1,20.45,9.52L239,150.69A18.35,18.35,0,0,1,240,156.19ZM103,184.87,128,41.74,73.46,32l-25,143.1A28,28,0,0,0,70.9,207.57,27.29,27.29,0,0,0,91.46,203,27.84,27.84,0,0,0,103,184.87ZM116.78,195,224,156.11,204.92,104,128.5,131.7l-9.78,55.92A44.63,44.63,0,0,1,116.78,195ZM224,173.12,127.74,208H224Z",
    "fill": "M240,155.91a16,16,0,0,0-1-5.22L219.94,98.48A16,16,0,0,0,199.49,89l-67.81,24.57,12.08-69A16,16,0,0,0,130.84,26L76.17,16.25a15.94,15.94,0,0,0-18.47,13l-25,143.12A43.82,43.82,0,0,0,75.78,224H224a16,16,0,0,0,16-16ZM76,196a16,16,0,1,1,16-16A16,16,0,0,1,76,196Zm42.72-8.38,9.78-55.92L204.92,104,224,156.11,116.78,195A44.89,44.89,0,0,0,118.72,187.62ZM224,208H127.74L224,173.11Z"
  },
  "map": {
    "regular": "M160,112h48a16,16,0,0,0,16-16V48a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16V64H128a24,24,0,0,0-24,24v32H72v-8A16,16,0,0,0,56,96H24A16,16,0,0,0,8,112v32a16,16,0,0,0,16,16H56a16,16,0,0,0,16-16v-8h32v32a24,24,0,0,0,24,24h16v16a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V160a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16v16H128a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8h16V96A16,16,0,0,0,160,112ZM56,144H24V112H56v32Zm104,16h48v48H160Zm0-112h48V96H160Z",
    "fill": "M144,96V80H128a8,8,0,0,0-8,8v80a8,8,0,0,0,8,8h16V160a16,16,0,0,1,16-16h48a16,16,0,0,1,16,16v48a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V192H128a24,24,0,0,1-24-24V136H72v8a16,16,0,0,1-16,16H24A16,16,0,0,1,8,144V112A16,16,0,0,1,24,96H56a16,16,0,0,1,16,16v8h32V88a24,24,0,0,1,24-24h16V48a16,16,0,0,1,16-16h48a16,16,0,0,1,16,16V96a16,16,0,0,1-16,16H160A16,16,0,0,1,144,96Z"
  },
  "components": {
    "regular": "M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z",
    "fill": "M120,56v48a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40h48A16,16,0,0,1,120,56Zm80-16H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm-96,96H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm96,0H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Z"
  }
} as const

export type BoardGlyphId = keyof typeof BOARD_GLYPH_PATHS

export function BoardGlyph({ id, on = false, size = 16 }: { id: BoardGlyphId; on?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden>
      <path d={BOARD_GLYPH_PATHS[id][on ? 'fill' : 'regular']} />
    </svg>
  )
}

const VIEWS: BoardView[] = ['theme', 'components']

/** The id of a view's tab, so the board region can name itself after it
 *  (`aria-labelledby`). */
export function boardTabId(panelId: string, view: BoardView): string {
  return `${panelId}-tab-${view}`
}

/**
 * Brand · Components, at the head of the board. One control for the create
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
  // One pill per instance, so two switches never slide a pill between them.
  const pillId = useId()
  const reduceMotion = useReducedMotion()
  const labels: Record<BoardView, string> = { theme: t('Brand'), components: t('Components') }

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
        ? 'flex h-8 flex-shrink-0 items-center gap-0.5 rounded-lg bg-fg/[0.04] p-0.5'
        : 'flex h-9 flex-shrink-0 items-center gap-0.5 rounded-xl border border-line bg-nav p-1'}
    >
      {VIEWS.map((view) => {
        const on = value === view
        // Inset (the board toolbar): icon only, a 28px square — the name is
        // the tab's accessible name and its tooltip.
        const shape = inset ? 'h-7 w-7 justify-center rounded-md' : 'h-7 rounded-lg px-3 @max-[560px]/boardhead:px-2.5'
        // Inset (the board toolbar): the selected view is a LIGHTER grey pill
        // sliding between the two, its label full white; the other label is
        // faint. The old pill was the well's own grey (#131416 on ~#121314)
        // and both labels near-white, so nothing said which view was on.
        const state = inset
          ? on ? 'font-semibold text-fg' : 'font-medium text-fg-faint hover:bg-fg/[0.06] hover:text-fg'
          : on ? 'bg-fg/[0.09] font-semibold text-fg' : 'font-medium text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
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
            className={`relative flex items-center gap-1.5 ${shape} text-caption transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui ${state}`}
          >
            {inset && on && (
              <motion.span
                layoutId={pillId}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-[linear-gradient(126deg,color-mix(in_srgb,var(--fg)_15%,transparent)_18%,color-mix(in_srgb,var(--fg)_9%,transparent)_71%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                transition={reduceMotion ? { duration: 0 } : { type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <BoardGlyph id={view === 'theme' ? 'brand' : 'components'} on={on} />
              <span className={inset ? 'sr-only' : '@max-[560px]/boardhead:sr-only'}>{labels[view]}</span>
            </span>
          </button>
        )
        return inset ? <HintTip key={view} label={labels[view]}>{tab}</HintTip> : tab
      })}
    </div>
  )
}
