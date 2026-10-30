import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FoundationGlyph } from './FoundationIconRail'
import { HintTip } from '../ui/HintTip'
import { CHROME_CONTROL_SHELL, SEGMENT_INACTIVE, SEGMENT_SELECTED_FILL } from './themeWorkspaceLayout'

export interface FoundationStripItem {
  key: string
  /** Already translated. */
  label: string
  /** Used when the foundation has no mask glyph (Dimensions). */
  icon?: ReactNode
}

// With more steps than this the selected one drops its glyph and keeps only
// its name: ten foundations (Variables) do not fit the inspector otherwise.
const GLYPH_WITH_NAME_MAX = 7

/**
 * Which foundation is being edited: a sliding pill over a row of foundation
 * glyphs, the selected step opening to its name.
 *
 * `bar` is the inspector's top band (full width, the column's main switch).
 * `hug` is the same control inline in an edition card, where it steps down:
 * the track ends after the last glyph.
 * `rail` runs down the inspector's left edge, one glyph per row (Variables'
 * eleven foundations): no names on the tiles, so each one says its name in a
 * hint on hover or focus, and ↑ / ↓ walk it.
 */
export default function FoundationSwitchStrip({
  items, current, onSelect, ariaLabel, variant = 'bar', lockOthers = false, lockedReason,
}: {
  items: readonly FoundationStripItem[]
  current: string
  onSelect: (key: string) => void
  ariaLabel: string
  variant?: 'bar' | 'hug' | 'rail'
  /** Guided setup: only the current step is open. */
  lockOthers?: boolean
  lockedReason?: string
}) {
  const reduce = useReducedMotion() ?? false
  const bar = variant === 'bar'
  const rail = variant === 'rail'
  const glyphWithName = bar && items.length <= GLYPH_WITH_NAME_MAX
  const shift = reduce
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }

  const move = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (lockOthers) return
    const index = items.findIndex((item) => item.key === current)
    let next = index
    const forward = rail ? 'ArrowDown' : 'ArrowRight'
    const back = rail ? 'ArrowUp' : 'ArrowLeft'
    if (event.key === forward) next = (index + 1) % items.length
    else if (event.key === back) next = (index + items.length - 1) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    const key = items[next]?.key
    if (!key || key === current) return
    onSelect(key)
    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    requestAnimationFrame(() => tabs[next]?.focus())
  }

  const glyph = (item: FoundationStripItem, size = 'h-3.5 w-3.5') =>
    item.icon
      ? <span className={`flex ${size} items-center justify-center [&>svg]:h-full [&>svg]:w-full`}>{item.icon}</span>
      : <FoundationGlyph id={item.key} className={size} />

  if (rail) {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="vertical"
        // The column scrolls on its own when a short window cannot hold all
        // eleven; the panel beside it keeps its place.
        className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5 py-2 scrollbar-thin"
        onKeyDown={move}
      >
        {items.map((item) => {
          const on = item.key === current
          const locked = lockOthers && !on
          return (
            <HintTip key={item.key} label={locked && lockedReason ? lockedReason : item.label} side="left">
              <button
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={item.label}
                aria-disabled={locked || undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => { if (!on && !locked) onSelect(item.key) }}
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  on ? 'text-fg' : locked ? 'cursor-not-allowed text-fg/30' : SEGMENT_INACTIVE
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="foundation-rail-pill"
                    aria-hidden
                    className={`absolute inset-0 rounded-lg ${SEGMENT_SELECTED_FILL}`}
                    transition={shift}
                  />
                )}
                <span className="relative flex">{glyph(item, 'h-4 w-4')}</span>
              </button>
            </HintTip>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={bar
        ? `flex w-full min-w-0 items-center gap-0.5 rounded-xl p-1 ${CHROME_CONTROL_SHELL}`
        : `inline-flex h-8 w-fit max-w-full shrink-0 items-center gap-0.5 rounded-lg p-0.5 ${CHROME_CONTROL_SHELL}`}
      onKeyDown={move}
    >
      {items.map((item) => {
        const on = item.key === current
        const locked = lockOthers && !on
        const radius = bar ? 'rounded-lg' : 'rounded-md'
        return (
          <motion.button
            key={item.key}
            type="button"
            role="tab"
            layout
            aria-selected={on}
            aria-label={item.label}
            aria-disabled={locked || undefined}
            title={locked ? lockedReason : on ? undefined : item.label}
            tabIndex={on ? 0 : -1}
            onClick={() => { if (!on && !locked) onSelect(item.key) }}
            transition={{ layout: shift }}
            className={`relative flex items-center justify-center text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${radius} ${bar ? 'h-8' : 'h-7'} ${
              on
                ? `z-[1] shrink-0 font-semibold text-fg ${bar ? 'px-3' : 'px-2.5'}`
                : `${bar ? 'min-w-0 flex-1' : 'w-7 shrink-0'} ${locked ? 'cursor-not-allowed font-medium text-fg/30' : SEGMENT_INACTIVE}`
            }`}
          >
            {on && (
              <motion.span
                layoutId={bar ? 'foundation-strip-pill' : 'edition-step-pill'}
                aria-hidden
                className={`absolute inset-0 ${radius} ${SEGMENT_SELECTED_FILL}`}
                transition={shift}
              />
            )}
            <motion.span
              key={on ? item.key : 'mark'}
              initial={on && !reduce ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center gap-1.5 whitespace-nowrap"
            >
              {on ? (
                <>
                  {glyphWithName && glyph(item)}
                  {item.label}
                </>
              ) : glyph(item)}
            </motion.span>
          </motion.button>
        )
      })}
    </div>
  )
}
