import { type ComponentType } from 'react'

// ── The one left rail ────────────────────────────────────────────────────────
// Variables, Components and Documentation all navigate through THIS component,
// so the second column reads identically in every section: same width, same
// transparent treatment over the brand gradient, same rows, same group caption.
// Only the data differs (foundations split into Variables/Styles vs component
// categories). Don't fork it — add a group.
//
// Carries its own `h-[52px] border-b` header row — same band CenterHeader and
// PreviewPanel use — so the rail's title/toggle line up with "Color" and
// "Color preview" instead of the rail's list starting flush under the top
// bar while its neighbors have a header row above their content.

/** The rail's width. The top bar's brand block reads this so its right border
 *  and the rail's divider stay one continuous rule — don't hard-code either. */
export const RAIL_WIDTH = 200
/** Collapsed width — just enough for a centered 36px icon row. TopNav's brand
 *  block reads this too (via Configurator), so the divider stays continuous
 *  in the collapsed state exactly like it does in the expanded one. */
export const RAIL_COLLAPSED_WIDTH = 56

export interface RailEntry {
  key: string
  label: string
  Icon?: ComponentType
}

export interface RailGroup {
  /** Small uppercase caption above the group. Omit for an ungrouped block. */
  label?: string
  items: RailEntry[]
}

function GroupLabel({ label }: { label: string }) {
  return (
    <span className="px-2.5 pt-3 pb-1 text-mini font-semibold uppercase tracking-widest text-fg-faint">
      {label}
    </span>
  )
}

// The classic "toggle sidebar" glyph — an outer panel split by a vertical
// divider near the leading edge. Same mark whether you're collapsing or
// expanding; only its position in the rail changes.
function SidebarToggleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <line x1="9.5" y1="4" x2="9.5" y2="20" />
    </svg>
  )
}

export default function SectionRail({
  groups, active, onSelect, ariaLabel, title, collapsed, onToggleCollapse,
}: {
  groups: RailGroup[]
  /** Highlighted entry key, or null when nothing in this rail is active. */
  active: string | null
  onSelect: (key: string) => void
  ariaLabel: string
  /** Visible row-2 header title — "Variables", "Components", "Documentation".
   *  Sits in the SAME `h-[52px] border-b` band CenterHeader and PreviewPanel
   *  use, so all three columns' header rules land on one continuous line
   *  instead of the rail's content starting flush under the top bar while
   *  its neighbors don't. A group whose own caption repeats this title
   *  (Foundations' first group is literally "Variables") is skipped — no
   *  point saying it twice, one line apart. */
  title: string
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <div
      style={{ width: collapsed ? RAIL_COLLAPSED_WIDTH : RAIL_WIDTH }}
      className="flex-shrink-0 flex flex-col min-h-0 transition-[width] duration-200"
    >
      <div
        className={`flex items-center h-[52px] flex-shrink-0 border-b border-line ${collapsed ? 'justify-center px-0' : 'justify-between pl-3 pr-2'}`}
      >
        {!collapsed && <span className="text-ui font-semibold text-fg truncate">{title}</span>}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-fg-faint hover:text-fg hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
        >
          <SidebarToggleIcon />
        </button>
      </div>

      <nav aria-label={ariaLabel} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-3 flex flex-col">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className="flex flex-col gap-0.5">
          {group.label && group.label !== title && !collapsed && <GroupLabel label={group.label} />}
          {group.items.map(({ key, label, Icon }) => {
            const on = active === key
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                aria-current={on ? 'page' : undefined}
                title={label}
                className={`flex items-center h-9 rounded-xl text-ui text-left transition-all ${
                  collapsed ? 'w-9 mx-auto justify-center' : 'w-full gap-2 px-2.5'
                } ${
                  on
                    ? 'bg-white text-accent-ui font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)] dark:bg-white/12 dark:shadow-none'
                    : 'text-fg-muted hover:text-fg hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                {Icon && (
                  <span className={`flex-shrink-0 ${on ? '' : 'text-fg-faint'}`}>
                    <Icon />
                  </span>
                )}
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            )
          })}
        </div>
      ))}
      </nav>
    </div>
  )
}
