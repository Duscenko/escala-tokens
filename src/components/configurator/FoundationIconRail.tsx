import type { RailGroup } from './SectionRail'

const VARIABLE_ICON_SOURCES: Record<string, string> = {
  'theme-preview': '/icons/theme-hub-icons/Icon/theme.svg',
  color: '/icons/set-variables/color-variables.svg',
  typography: '/icons/set-variables/text-variables.svg',
  radius: '/icons/set-variables/radius-variables.svg',
  spacing: '/icons/set-variables/spacing-variables.svg',
  shadow: '/icons/set-variables/shadow-variables.svg',
  grid: '/icons/set-variables/grid-variables.svg',
  sizes: '/icons/set-variables/size-variables.svg',
  stroke: '/icons/set-variables/stroke-variables.svg',
  icons: '/icons/set-variables/icon-library.svg',
}

// The source SVGs all use a 24px canvas but their drawings occupy very
// different fractions of it. These per-glyph scales normalize the visible
// artwork to roughly 14px while every mask keeps the same 20px layout box.
const VARIABLE_ICON_MASK_SIZE: Record<string, string> = {
  'theme-preview': '88%',
  color: '115%',
  typography: '130%',
  radius: '225%',
  spacing: '145%',
  shadow: '130%',
  grid: '145%',
  sizes: '115%',
  stroke: '145%',
  icons: '135%',
}

export const FOUNDATION_ICON_RAIL_WIDTH = 64

// ── Horizontal foundation switcher (Variables tab only) ──────────────────────
// Replaces the outer SectionRail for Variables specifically: a compact row of
// icon-only buttons docked in Groups' adjacent 52px band (ColorHub for Color,
// FoundationWorkbench for every other foundation). Frees the left column for
// a foundation's own sub-nav. Takes the same `groups` shape SectionRail does —
// same Variables/Styles split, same data — just rendered as a row instead of a
// labeled vertical list. Components and Documentation keep the vertical
// SectionRail; this component doesn't apply there.

export default function FoundationIconRail({
  groups, active, onSelect, orientation = 'horizontal',
}: {
  groups: RailGroup[]
  /** Highlighted entry key. */
  active: string | null
  onSelect: (key: string) => void
  orientation?: 'horizontal' | 'vertical'
}) {
  const vertical = orientation === 'vertical'
  return (
    <nav
      aria-label="Variable foundations"
      className={vertical
        // The `ThemeWorkspaceTabs` strip now spans the full width ABOVE this
        // rail (it reaches the Themes Library column's edge), so the rail no
        // longer carries a 52px header band of its own — the icons just begin
        // near the top with `pt-2`. Group spacing is per-group (`pt-3` / `mt-3`).
        ? 'h-full flex-shrink-0 flex flex-col items-center border-r border-line bg-app pt-2 pb-3 overflow-y-auto scrollbar-thin'
        : 'flex items-center gap-4'}
      style={vertical ? { width: FOUNDATION_ICON_RAIL_WIDTH } : undefined}
    >
      {groups.map((group, gi) => (
        <div
          key={group.label ?? gi}
          className={vertical
            // First group sits at the top under the full-width tab strip; every
            // later group carries its own separator rule + top margin.
            ? `flex flex-col items-center gap-1.5 pt-3 ${gi > 0 ? 'border-t border-line/60 mt-3' : ''}`
            : `flex items-center ${gi === 0 ? 'gap-1' : 'gap-px'}`}
        >
          {group.items.map(({ key, label, Icon }) => {
            const on = active === key
            const maskSize = VARIABLE_ICON_MASK_SIZE[key] ?? '100%'
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                aria-current={on ? 'page' : undefined}
                aria-label={label}
                title={label}
                className={`flex-shrink-0 flex items-center justify-center w-[42px] h-[42px] rounded-[13px] border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  on
                    // Full opacity, not the old /[0.83]. That softening blended
                    // the fill toward the page, which quietly undid the ink's
                    // contrast guarantee: --accent-ink is solved against the
                    // ACCENT, not against an 83% composite of it. Any fill that
                    // wants to stay legible has to be the real accent.
                    ? 'bg-accent-solid text-accent-ink shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)]'
                    // Mirrors the System styles rows: a quiet surface and a
                    // structural edge appear together on hover.
                    : 'text-fg-muted hover:border-line hover:bg-surface/60 hover:text-fg'
                }`}
              >
                {VARIABLE_ICON_SOURCES[key]
                  ? <span
                      aria-hidden
                    className={`h-5 w-5 ${on ? 'drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]' : 'opacity-90'}`}
                      style={{
                        // A mask makes every glyph inherit the button's semantic
                        // foreground. The previous <img> depended on `dark:invert`,
                        // which does not follow the editor's independent chrome
                        // appearance and could render a dark glyph on dark chrome.
                        backgroundColor: 'currentColor',
                        maskImage: `url(${VARIABLE_ICON_SOURCES[key]})`,
                        WebkitMaskImage: `url(${VARIABLE_ICON_SOURCES[key]})`,
                        maskSize, WebkitMaskSize: maskSize,
                        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
                        maskPosition: 'center', WebkitMaskPosition: 'center',
                      }}
                    />
                  : Icon && <Icon />}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
