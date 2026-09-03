import type { ReactNode } from 'react'
import type { RailGroup } from './SectionRail'
import { CHROME_CONTROL_HOVER } from './themeWorkspaceLayout'

const VARIABLE_ICON_SOURCES: Record<string, string> = {
  'theme-preview': '/icons/theme-hub-icons/Icon/theme.svg',
  color: '/icons/set-variables/color-variables.svg',
  typography: '/icons/set-variables/text-variables.svg',
  radius: '/icons/set-variables/radius-variables-2.svg',
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
  radius: '115%',
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
  groups, active, onSelect, orientation = 'horizontal', footer,
}: {
  groups: RailGroup[]
  /** Highlighted entry key. */
  active: string | null
  onSelect: (key: string) => void
  orientation?: 'horizontal' | 'vertical'
  /** Sync destinations (GitHub · Figma) — pinned to the foot of the vertical rail. */
  footer?: ReactNode
}) {
  const vertical = orientation === 'vertical'
  return (
    <nav
      aria-label="Variable foundations"
      className={vertical
        // The `ThemeWorkspaceTabs` strip spans the full width above this rail;
        // icons begin near the top with `pt-2`. Group spacing is per-group.
        ? 'h-full flex-shrink-0 flex flex-col items-center border-r border-line bg-nav pt-2 pb-3 overflow-y-auto scrollbar-thin'
        : 'flex items-center gap-4'}
      style={vertical ? { width: FOUNDATION_ICON_RAIL_WIDTH } : undefined}
    >
      <div className={vertical ? 'flex w-full flex-col items-center' : 'contents'}>
        {groups.map((group, gi) => (
          <div
            key={group.label ?? gi}
            className={vertical
              ? `flex flex-col items-center gap-1.5 pt-3 ${gi > 0 ? 'border-t border-line mt-3' : ''}`
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
                  className={`flex-shrink-0 flex items-center justify-center w-[42px] h-[42px] rounded-[13px] transition-[color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                    on
                      ? 'bg-accent-solid text-accent-ink shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)]'
                      : `text-fg-muted ${CHROME_CONTROL_HOVER}`
                  }`}
                >
                  {VARIABLE_ICON_SOURCES[key]
                    ? <span
                        aria-hidden
                        className={`h-5 w-5 ${on ? 'drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]' : 'opacity-90'}`}
                        style={{
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
      </div>
      {vertical && footer ? (
        <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-3">
          {footer}
        </div>
      ) : null}
    </nav>
  )
}
