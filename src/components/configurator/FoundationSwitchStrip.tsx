import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FoundationGlyph } from './FoundationIconRail'
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
 */
export default function FoundationSwitchStrip({
  items, current, onSelect, ariaLabel, variant = 'bar', lockOthers = false, lockedReason,
}: {
  items: readonly FoundationStripItem[]
  current: string
  onSelect: (key: string) => void
  ariaLabel: string
  variant?: 'bar' | 'hug'
  /** Guided setup: only the current step is open. */
  lockOthers?: boolean
  lockedReason?: string
}) {
  const reduce = useReducedMotion() ?? false
  const bar = variant === 'bar'
  const glyphWithName = bar && items.length <= GLYPH_WITH_NAME_MAX
  const shift = reduce
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }

  const move = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (lockOthers) return
    const index = items.findIndex((item) => item.key === current)
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length
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

  const glyph = (item: FoundationStripItem) =>
    item.icon
      ? <span className="flex h-3.5 w-3.5 items-center justify-center [&>svg]:h-full [&>svg]:w-full">{item.icon}</span>
      : <FoundationGlyph id={item.key} className="h-3.5 w-3.5" />

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
