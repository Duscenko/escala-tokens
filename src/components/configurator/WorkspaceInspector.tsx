import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { INSPECTOR_TABS_H, SEGMENT_INACTIVE, SEGMENT_SELECTED_FILL } from './themeWorkspaceLayout'

// ─── The Generator's right-hand INSPECTOR ───────────────────────────────────
// Layout: [icon rail] [canvas card — your system] [inspector — edit it].
// The Figma/Framer convention: navigate on the left, the thing in the middle,
// its properties on the right.
//
// Every per-view side panel (Quick settings, Variables' Collections + Groups,
// the Themes library, Get code's scope, Figma/GitHub status, the doc TOC) is
// still RENDERED by the view that owns its state — it just portals into this
// column. That keeps each panel's state and props exactly where they were,
// and, the load-bearing part, puts the panel OUTSIDE the canvas card's DOM:
// the card carries the previewed theme's `.light`/`.dark` class, and a panel
// nested inside it would repaint in the theme's appearance instead of the
// chrome's.

export const INSPECTOR_WIDTH = 288
/** Stable hook for things docked against the column (ThemePanel). */
export const INSPECTOR_ID = 'workspace-inspector'

export type InspectorTab = 'theme' | 'variables' | 'code' | 'docs'

const SlotContext = createContext<HTMLElement | null>(null)

export function InspectorSlotProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <SlotContext.Provider value={slot}>{children}</SlotContext.Provider>
}

/** True when an inspector is mounted, i.e. an `InspectorPortal` rendered by
 *  the caller lands in it. A panel then fills the column's width and drops its
 *  own collapse and border — the column owns both. */
export function useInInspector(): boolean {
  return useContext(SlotContext) !== null
}

/** Renders `children` into the inspector when one is mounted, inline
 *  otherwise (any surface outside the Generator keeps its old placement). */
export function InspectorPortal({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext)
  if (!slot) return <>{children}</>
  return createPortal(children, slot)
}

// Code is a tab KEY (the view still exists) but not a tab in the strip: its door is
// the Get code icon in each canvas header. On Code, no tab reads as selected.
const TABS: { key: InspectorTab; label: string }[] = [
  { key: 'theme', label: 'Theme' },
  { key: 'variables', label: 'Variables' },
  { key: 'docs', label: 'Docs' },
]

export default function WorkspaceInspector({
  value,
  onChange,
  onSlot,
  showTabs = true,
  disabledTabs,
  disabledReason,
}: {
  value: InspectorTab | null
  onChange: (tab: InspectorTab) => void
  onSlot: (el: HTMLElement | null) => void
  /** Home fills the left file-menu column (not this inspector) and does not
   *  draw the Theme · Variables · Code · Docs strip. */
  showTabs?: boolean
  /** A System Style try-on has no live ramps to edit or document. */
  disabledTabs?: readonly InspectorTab[]
  disabledReason?: string
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const locked = new Set(disabledTabs)
  const enabledTabs = TABS.filter((item) => !locked.has(item.key))
  return (
    <aside
      id={INSPECTOR_ID}
      aria-label={showTabs ? t('Inspector') : t('Home')}
      // A RAISED panel on the frame, like the canvas card beside it (white on
      // #f5f5f5 in light, +.050 ΔL in dark — see `--side-panel` in index.css).
      className="my-3 mr-3 ml-3 flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-side-panel"
      // Panels portaled in here were built as WORKSPACE_CHROME columns
      // (`bg-tab-bar`, incl. their sticky headers). Inside the inspector the
      // whole column is one surface, so `--tab-bar` resolves to the panel's.
      style={{ width: INSPECTOR_WIDTH, '--tab-bar': 'var(--side-panel)', '--color-tab-bar': 'var(--side-panel)' } as CSSProperties}
    >
      {showTabs && (
      <div
        className="flex flex-shrink-0 items-center"
        // The strip is 2.5rem tall (h-8 tabs + p-1). The band's left/right inset
        // equals the space left above and below it, so it sits evenly in the band.
        style={{ height: INSPECTOR_TABS_H, paddingInline: `calc((${INSPECTOR_TABS_H}px - 2.5rem) / 2)` }}
      >
        <div
          role="tablist"
          aria-label={t('Theme workspace')}
          className="flex w-full min-w-0 gap-0.5 rounded-xl bg-chip-rest p-1"
          onKeyDown={(event) => {
            if (enabledTabs.length === 0) return
            const current = Math.max(0, enabledTabs.findIndex((item) => item.key === value))
            let next = current
            if (event.key === 'ArrowRight') next = (current + 1) % enabledTabs.length
            else if (event.key === 'ArrowLeft') next = (current + enabledTabs.length - 1) % enabledTabs.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = enabledTabs.length - 1
            else return
            event.preventDefault()
            const key = enabledTabs[next].key
            onChange(key)
            const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
            requestAnimationFrame(() => tabs[next]?.focus())
          }}
        >
          {TABS.map((item) => {
            const active = item.key === value
            const disabled = locked.has(item.key)
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={disabled || undefined}
                title={disabled ? disabledReason : undefined}
                tabIndex={disabled ? -1 : (active || (value == null && item.key === 'theme') ? 0 : -1)}
                onClick={() => onChange(item.key)}
                className={`relative flex h-8 min-w-0 flex-1 items-center justify-center rounded-lg px-1 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  // The label's weight and ink change on the BUTTON; the sliding
                  // pill below carries the fill and the edge.
                  disabled ? 'cursor-not-allowed font-medium text-fg/40' : active ? 'font-semibold text-fg' : SEGMENT_INACTIVE
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="workspace-inspector-tab"
                    aria-hidden
                    className={`absolute inset-0 rounded-lg ${SEGMENT_SELECTED_FILL}`}
                    transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                {/* Centred by the button's flex, not by its padding: a label wider
                    than the padded box (Variables, semibold, ~51px in a 46px
                    one) used to overflow to the RIGHT and read off-centre. */}
                <span className="relative whitespace-nowrap">{t(item.label)}</span>
              </button>
            )
          })}
        </div>
      </div>
      )}
      <div
        // A callback ref feeding STATE in the shell (not a plain ref), so the
        // portals re-render once the target exists.
        ref={onSlot}
        // Each panel was sized as a fixed-width left column (inline width,
        // border-r). `!` beats the inline style: here the column owns both.
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${showTabs ? 'border-t border-line' : ''} [&>*]:!w-full [&>*]:!flex-1 [&>*]:!min-h-0 [&>*]:!h-auto [&>*]:!border-r-0`}
      />
    </aside>
  )
}
