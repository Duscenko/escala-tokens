import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../lib/i18n'
import { INSPECTOR_TABS_H } from './themeWorkspaceLayout'

// ─── The Generator's right-hand INSPECTOR ───────────────────────────────────
// Layout: [nav rail] [canvas card — your system] [inspector — edit it].
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

const SlotContext = createContext<HTMLElement | null>(null)
const HeaderSlotContext = createContext<HTMLElement | null>(null)

export function InspectorSlotProvider({ slot, headerSlot = null, children }: {
  slot: HTMLElement | null
  /** The band above the panel slot. A panel embedded outside the inspector
   *  (the create studio) passes null and keeps its header inline. */
  headerSlot?: HTMLElement | null
  children: ReactNode
}) {
  return (
    <SlotContext.Provider value={slot}>
      <HeaderSlotContext.Provider value={headerSlot}>{children}</HeaderSlotContext.Provider>
    </SlotContext.Provider>
  )
}

/** Keeps a subtree's header inline even when an inspector band is mounted. */
export function InspectorHeaderInline({ children }: { children: ReactNode }) {
  return <HeaderSlotContext.Provider value={null}>{children}</HeaderSlotContext.Provider>
}

/** True when the inspector's top band is there to portal into. */
export function useInspectorHeader(): boolean {
  return useContext(HeaderSlotContext) !== null
}

/** Renders `children` into the inspector's top band: the foundation switch of
 *  whichever panel is open below it. Inline when there is no band. */
export function InspectorHeaderPortal({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext)
  if (!slot) return <>{children}</>
  return createPortal(children, slot)
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

export default function WorkspaceInspector({
  onSlot,
  onHeaderSlot,
  home = false,
  slotStyle,
}: {
  onSlot: (el: HTMLElement | null) => void
  onHeaderSlot: (el: HTMLElement | null) => void
  /** Custom properties for the panel slot only (the Generator passes the edited
   *  theme's accent here). The band above stays on the platform's accent. */
  slotStyle?: CSSProperties
  /** The create studio: no band, the panel owns the whole column. */
  home?: boolean
}) {
  const { t } = useI18n()
  return (
    <aside
      id={INSPECTOR_ID}
      aria-label={home ? t('Home') : t('Inspector')}
      // A RAISED panel on the frame, like the canvas card beside it (white on
      // #f5f5f5 in light, +.050 ΔL in dark — see `--side-panel` in index.css).
      className="my-3 mr-3 ml-3 flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-side-panel"
      // Panels portaled in here were built as WORKSPACE_CHROME columns
      // (`bg-tab-bar`, incl. their sticky headers). Inside the inspector the
      // whole column is one surface, so `--tab-bar` resolves to the panel's.
      style={{ width: INSPECTOR_WIDTH, '--tab-bar': 'var(--side-panel)', '--color-tab-bar': 'var(--side-panel)' } as CSSProperties}
    >
      {/* The band holds the open panel's foundation switch (Color · Font ·
          Radius …), portaled in by the panel that owns the selection. Where
          workspaces are switched is the nav rail on the left. Empty (System,
          Code, a connect page) it takes no room. */}
      {!home && (
        <div
          ref={onHeaderSlot}
          className="flex flex-shrink-0 items-center border-b border-line empty:hidden"
          // The strip is 2.5rem tall (h-8 steps + p-1). The band's left/right inset
          // equals the space left above and below it, so it sits evenly in the band.
          style={{ height: INSPECTOR_TABS_H, paddingInline: `calc((${INSPECTOR_TABS_H}px - 2.5rem) / 2)` }}
        />
      )}
      <div
        // A callback ref feeding STATE in the shell (not a plain ref), so the
        // portals re-render once the target exists.
        ref={onSlot}
        style={slotStyle}
        // Each panel was sized as a fixed-width left column (inline width,
        // border-r). `!` beats the inline style: here the column owns both.
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden [&>*]:!w-full [&>*]:!flex-1 [&>*]:!min-h-0 [&>*]:!h-auto [&>*]:!border-r-0`}
      />
    </aside>
  )
}
