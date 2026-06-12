import { type ComponentType, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'

export type Tab = 'foundations' | 'components'

export interface RailFoundation {
  key: string
  short: string
  Icon: ComponentType
  /** Secondary foundations collapse under the rail's "More" toggle. */
  secondary?: boolean
}

interface SidebarProps {
  foundations: RailFoundation[]
  /** Highlighted foundation key, or null when not in the foundations view. */
  activeFoundation: string | null
  onFoundationSelect: (key: string) => void
  exportMode: 'code' | 'md' | 'figma' | 'github' | null
  onGetFigma: () => void
  /** Opens the Home/hub screen (save + saved systems). */
  onHub: () => void
  /** True when the hub (home) screen is the active view. */
  hubActive: boolean
}

// Figma brand mark — monochrome, tracks currentColor.
function FigmaGlyph() {
  return (
    <svg width="13" height="19" viewBox="0 0 38 57" fill="currentColor" aria-hidden>
      <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
      <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
      <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
      <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
      <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2.26953V6.40007C14 6.96012 14 7.24015 14.109 7.45406C14.2049 7.64222 14.3578 7.7952 14.546 7.89108C14.7599 8.00007 15.0399 8.00007 15.6 8.00007H19.7305M15 15L12 18L9 15M12 18L12 12M14 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H15.2C16.8802 22 17.7202 22 18.362 21.673C18.9265 21.3854 19.3854 20.9265 19.673 20.362C20 19.7202 20 18.8802 20 17.2V8L14 2Z" />
    </svg>
  )
}

// Chevron that rotates when the "More" group is expanded.
function MoreIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// ── A single rail entry: an icon chip + a small label under it ────────────────
// Active = solid white chip with a drop-shadow (elevation = pressed signal).
// Inactive = semi-transparent white chip; glass-like over the gradient.
function RailItem({
  Icon,
  label,
  active,
  accent,
  onClick,
}: {
  Icon: ComponentType
  label: string
  active: boolean
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex flex-col items-center gap-0.5 px-0.5 py-0.5 rounded-xl"
      title={label}
    >
      <span
        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
          active
            ? 'bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)]'
            : 'bg-white/50 text-fg-muted group-hover:bg-white/80 group-hover:text-fg'
        }`}
        style={active ? { color: accent } : undefined}
      >
        <Icon />
      </span>
      <span
        className={`text-[10px] leading-tight text-center transition-colors ${
          active ? 'font-medium' : 'text-fg-muted group-hover:text-fg'
        }`}
        style={active ? { color: accent } : undefined}
      >
        {label}
      </span>
    </button>
  )
}

// ── Narrow icon rail (80px), transparent over the brand gradient ──────────────
export default function Sidebar({
  foundations,
  activeFoundation,
  onFoundationSelect,
  exportMode,
  onGetFigma,
  onHub,
  hubActive,
}: SidebarProps) {
  const { primaryScale, primaryColor, projectCreated } = useDesignStore()
  const accent = primaryScale[9] ?? primaryScale[8] ?? primaryColor ?? '#0088FF'
  const [moreOpen, setMoreOpen] = useState(false)

  // Pre-creation the rail is empty — the "Get MD" hub button is the entry point.
  // Once created, core foundations show always; secondary ones collapse under More.
  const core = projectCreated ? foundations.filter((f) => !f.secondary) : []
  const secondary = projectCreated ? foundations.filter((f) => f.secondary) : []
  // Keep More open while one of its items is active, so the highlight is visible.
  const secondaryActive = secondary.some((f) => f.key === activeFoundation)
  const showSecondary = moreOpen || secondaryActive

  return (
    <nav className="w-20 flex-shrink-0 flex flex-col items-center px-1.5 pt-2 pb-3 min-h-0">
      <div className="flex-1 min-h-0 w-full overflow-y-auto">
        <div className="flex flex-col items-center gap-0.5 w-full">
          {core.map((f) => (
            <RailItem
              key={f.key}
              Icon={f.Icon}
              label={f.short}
              active={activeFoundation === f.key}
              accent={accent}
              onClick={() => onFoundationSelect(f.key)}
            />
          ))}

          {secondary.length > 0 && (
            <>
              <RailItem
                Icon={() => <MoreIcon open={showSecondary} />}
                label={showSecondary ? 'Less' : 'More'}
                active={false}
                accent={accent}
                onClick={() => setMoreOpen((v) => !v)}
              />
              {showSecondary &&
                secondary.map((f) => (
                  <RailItem
                    key={f.key}
                    Icon={f.Icon}
                    label={f.short}
                    active={activeFoundation === f.key}
                    accent={accent}
                    onClick={() => onFoundationSelect(f.key)}
                  />
                ))}
            </>
          )}
        </div>
      </div>

      {/* Hub + connect block — "Get MD" is the always-present entry to the hub. */}
      <div className={`flex-shrink-0 w-full flex flex-col items-center gap-0.5 pt-2 mt-1 ${projectCreated ? 'border-t border-line/50' : ''}`}>
        {projectCreated && (
          <RailItem Icon={FigmaGlyph} label="Bring to Figma" active={exportMode === 'figma'} accent={accent} onClick={onGetFigma} />
        )}
        <RailItem Icon={DownloadIcon} label="Get MD" active={hubActive} accent={accent} onClick={onHub} />
      </div>
    </nav>
  )
}
