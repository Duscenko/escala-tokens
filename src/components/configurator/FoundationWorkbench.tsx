import type { ReactNode } from 'react'
import { RailToggle, COLOR_RAIL_WIDTH, COLOR_RAIL_COLLAPSED_WIDTH } from './colorControls'

// One workbench band (family heading + icon rail) for every Variables
// Generator section. Mounted by Configurator OUTSIDE the keyed page motion,
// so Color → Font fades the table, not the switcher. Collapse width is
// Color-only (Primitives / Semantics); everyone else stays at 198px. The +
// on Gradients lives in that tab's own nav, not here — this chrome is
// identical across foundations.

export default function FoundationWorkbench({
  toolbar,
  toolbarWash,
  railCollapsed = false,
  onToggleRail,
  label,
  groupsTrailing,
  gutter = false,
  children,
}: {
  toolbar?: ReactNode
  toolbarWash?: string
  railCollapsed?: boolean
  onToggleRail?: () => void
  /** Column heading for the current foundation — e.g. “Color Variables”. */
  label: string
  groupsTrailing?: ReactNode
  /** Empty 198px column under the heading — for pages that don't already rail
   *  themselves (Icon Library), so the body lines up with Color's table. */
  gutter?: boolean
  children: ReactNode
}) {
  const width = railCollapsed ? COLOR_RAIL_COLLAPSED_WIDTH : COLOR_RAIL_WIDTH
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div
          className={`flex-shrink-0 flex items-center h-[52px] bg-app transition-[width] duration-200 ${
            railCollapsed ? 'justify-center px-0' : 'justify-between gap-2 pl-3 pr-2'
          }`}
          style={{ width }}
        >
          {!railCollapsed && (
            <span className="min-w-0 truncate text-[13px] font-semibold text-fg" title={label}>
              {label}
            </span>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {groupsTrailing}
            <RailToggle collapsed={railCollapsed} onClick={onToggleRail} />
          </div>
        </div>
        <div
          className="flex-1 min-w-0 flex items-center gap-4 pl-4 pr-3 h-[52px] bg-app border-l border-line"
          style={{ background: toolbarWash }}
        >
          {toolbar}
        </div>
      </div>
      {gutter ? (
        <div className="flex flex-1 min-h-0 items-stretch">
          <div className="flex-shrink-0 bg-app" style={{ width }} />
          <div className="flex-1 min-w-0 bg-app border-l border-line min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-app">{children}</div>
      )}
    </div>
  )
}
