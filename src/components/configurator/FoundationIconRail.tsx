import type { RailGroup } from './SectionRail'

// ── Horizontal foundation switcher (Variables tab only) ──────────────────────
// Replaces the outer SectionRail for Variables specifically: a compact row of
// icon-only buttons docked at the top of the canvas, freeing the left column
// for a foundation's own sub-nav (Color's family Groups tree). Takes the same
// `groups` shape SectionRail does — same Variables/Styles split, same data —
// just rendered as a row instead of a labeled vertical list. Components and
// Documentation keep the vertical SectionRail; this component doesn't apply
// there.

export default function FoundationIconRail({
  groups, active, onSelect,
}: {
  groups: RailGroup[]
  /** Highlighted entry key. */
  active: string | null
  onSelect: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-4">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className={`flex items-center ${gi === 0 ? 'gap-1' : 'gap-px'}`}>
          {group.items.map(({ key, label, Icon }) => {
            const on = active === key
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                aria-current={on ? 'page' : undefined}
                aria-label={label}
                title={label}
                className={`flex-shrink-0 flex items-center justify-center w-[40.5px] h-[40.5px] rounded-[13.5px] transition-colors ${
                  on
                    ? 'bg-accent-ui/[0.83] text-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)]'
                    : 'text-fg-muted hover:text-fg hover:bg-elevated'
                }`}
              >
                {Icon && <Icon />}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
