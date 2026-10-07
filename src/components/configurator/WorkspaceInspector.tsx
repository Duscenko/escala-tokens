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

const TABS: { key: InspectorTab; label: string }[] = [
  { key: 'theme', label: 'Theme' },
  { key: 'variables', label: 'Variables' },
  { key: 'code', label: 'Code' },
  { key: 'docs', label: 'Docs' },
]

export default function WorkspaceInspector({
  value,
  onChange,
  onSlot,
}: {
  value: InspectorTab | null
  onChange: (tab: InspectorTab) => void
  onSlot: (el: HTMLElement | null) => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <aside
      id={INSPECTOR_ID}
      aria-label={t('Inspector')}
      // A RAISED panel on the frame, like the canvas card beside it (white on
      // #f5f5f5 in light, +.050 ΔL in dark — see `--side-panel` in index.css).
      className="my-3 mr-3 ml-3 flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-side-panel"
      // Panels portaled in here were built as WORKSPACE_CHROME columns
      // (`bg-tab-bar`, incl. their sticky headers). Inside the inspector the
      // whole column is one surface, so `--tab-bar` resolves to the panel's.
      style={{ width: INSPECTOR_WIDTH, '--tab-bar': 'var(--side-panel)', '--color-tab-bar': 'var(--side-panel)' } as CSSProperties}
    >
      <div className="flex flex-shrink-0 items-center px-3" style={{ height: INSPECTOR_TABS_H }}>
        <div
          role="tablist"
          aria-label={t('Theme workspace')}
          className="inline-flex w-fit max-w-full shrink-0 gap-0.5 rounded-xl bg-chip-rest p-1"
          onKeyDown={(event) => {
            const current = TABS.findIndex((item) => item.key === value)
            let next = current
            if (event.key === 'ArrowRight') next = (current + 1) % TABS.length
            else if (event.key === 'ArrowLeft') next = (current + TABS.length - 1) % TABS.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = TABS.length - 1
            else return
            event.preventDefault()
            onChange(TABS[next].key)
            const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
            requestAnimationFrame(() => tabs[next]?.focus())
          }}
        >
          {TABS.map((item) => {
            const active = item.key === value
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active || (value == null && item.key === 'theme') ? 0 : -1}
                onClick={() => onChange(item.key)}
                className={`relative h-8 shrink-0 rounded-lg px-2 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  // The label's weight and ink change on the BUTTON; the sliding
                  // pill below carries the fill and the edge.
                  active ? 'font-semibold text-fg' : SEGMENT_INACTIVE
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
                <span className="relative">{t(item.label)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div
        // A callback ref feeding STATE in the shell (not a plain ref), so the
        // portals re-render once the target exists.
        ref={onSlot}
        // Each panel was sized as a fixed-width left column (inline width,
        // border-r). `!` beats the inline style: here the column owns both.
        className={`flex min-h-0 flex-1 flex-col overflow-hidden border-t border-line [&>*]:!w-full [&>*]:!flex-1 [&>*]:!min-h-0 [&>*]:!h-auto [&>*]:!border-r-0`}
      />
    </aside>
  )
}
