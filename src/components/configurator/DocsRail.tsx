import type { ComponentType } from 'react'
import { RAIL_COLLAPSED_WIDTH, RAIL_WIDTH } from './SectionRail'

function SidebarToggleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <line x1="9.5" y1="4" x2="9.5" y2="20" />
    </svg>
  )
}

export interface DocsRailRow {
  key: string
  label: string
  Icon?: ComponentType
}

/** Docs' left rail — same shell as ComponentsRail (gradient shows through,
 *  h-[52px] header band, collapse toggle, RAIL_WIDTH). */
export default function DocsRail({
  rows,
  activeKey,
  onSelect,
  collapsed,
  onToggleCollapse,
}: {
  rows: DocsRailRow[]
  activeKey: string
  onSelect: (key: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <div
      style={{ width: collapsed ? RAIL_COLLAPSED_WIDTH : RAIL_WIDTH }}
      className="flex-shrink-0 flex flex-col min-h-0 transition-[width] duration-200"
    >
      <div
        className={`flex items-center h-[52px] flex-shrink-0 border-b border-line/60 ${
          collapsed ? 'justify-center px-0' : 'justify-between pl-3 pr-2'
        }`}
      >
        {!collapsed && <span className="text-[13px] font-semibold text-fg truncate">Docs</span>}
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

      <nav aria-label="Docs" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-3 flex flex-col gap-0.5">
        {rows.map(({ key, label, Icon }) => {
          const on = activeKey === key
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-current={on ? 'page' : undefined}
              title={label}
              className={`flex items-center h-9 rounded-xl text-[13px] text-left transition-all ${
                collapsed ? 'w-9 mx-auto justify-center' : 'w-full gap-2 px-2.5'
              } ${
                on
                  ? 'bg-white text-accent-ui font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)] dark:bg-white/12 dark:shadow-none'
                  : 'text-fg-muted hover:text-fg hover:bg-white/60 dark:hover:bg-white/10'
              }`}
            >
              {Icon ? (
                <span className={`flex-shrink-0 ${on ? '' : 'text-fg-faint'}`}>
                  <Icon />
                </span>
              ) : null}
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
