import { type ComponentType } from 'react'

// ── The one left rail ────────────────────────────────────────────────────────
// Variables, Components and Documentation all navigate through THIS component,
// so the second column reads identically in every section: same width, same
// transparent treatment over the brand gradient, same rows, same group caption.
// Only the data differs (foundations split into Variables/Styles vs component
// categories). Don't fork it — add a group.

/** The rail's width. The top bar's brand block reads this so its right border
 *  and the rail's divider stay one continuous rule — don't hard-code either. */
export const RAIL_WIDTH = 200

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
    <span className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
      {label}
    </span>
  )
}

export default function SectionRail({
  groups, active, onSelect, ariaLabel,
}: {
  groups: RailGroup[]
  /** Highlighted entry key, or null when nothing in this rail is active. */
  active: string | null
  onSelect: (key: string) => void
  ariaLabel: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      style={{ width: RAIL_WIDTH }}
      className="flex-shrink-0 overflow-y-auto px-2 pt-2 pb-3 flex flex-col min-h-0"
    >
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className="flex flex-col gap-0.5">
          {group.label && <GroupLabel label={group.label} />}
          {group.items.map(({ key, label, Icon }) => {
            const on = active === key
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                aria-current={on ? 'page' : undefined}
                title={label}
                className={`w-full flex items-center gap-2 h-9 px-2.5 rounded-xl text-[13px] text-left transition-all ${
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
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
