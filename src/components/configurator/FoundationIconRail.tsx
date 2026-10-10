import type { ReactNode } from 'react'
import type { RailGroup } from './SectionRail'

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

/** The same foundation glyph the icon rail paints, at any size. */
export function FoundationGlyph({ id, className = 'h-4 w-4' }: { id: string; className?: string }) {
  const src = VARIABLE_ICON_SOURCES[id]
  if (!src) return null
  const maskSize = VARIABLE_ICON_MASK_SIZE[id] ?? '100%'
  return (
    <span
      aria-hidden
      className={className}
      style={{
        backgroundColor: 'currentColor',
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize, WebkitMaskSize: maskSize,
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center', WebkitMaskPosition: 'center',
      }}
    />
  )
}

/** One tile language for every button in the 64px workspace rail (foundation
 *  icons + the Themes library folder): glyph over a short label. Active = the
 *  platform accent as INK on a very subtle wash of itself — not a solid fill,
 *  so the selection reads without shouting over the canvas. Inactive = muted
 *  ink, neutral hover. `compact` drops the label (horizontal placement). */
export function RailTile({
  on, label, onClick, children, ariaCurrent, compact = false, className = '', step, ...aria
}: {
  on: boolean
  /** Guided theme setup: a finished step carries a ✓, a future one is locked. */
  step?: 'done' | 'locked'
  label: string
  onClick: () => void
  children: ReactNode
  ariaCurrent?: 'page'
  compact?: boolean
  className?: string
  'aria-pressed'?: boolean
  'aria-expanded'?: boolean
  'aria-controls'?: string
  'aria-label'?: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={step === 'locked' || step === 'done'}
      aria-current={ariaCurrent}
      aria-label={aria['aria-label'] ?? (step === 'locked' ? `${label} — next steps` : step === 'done' ? `${label} — done` : label)}
      title={aria.title ?? (step === 'locked' ? `${label} — next steps` : step === 'done' ? `${label} — done` : label)}
      aria-pressed={aria['aria-pressed']}
      aria-expanded={aria['aria-expanded']}
      aria-controls={aria['aria-controls']}
      className={`group flex-shrink-0 flex flex-col items-center justify-center rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 disabled:cursor-default ${step === 'locked' ? 'opacity-35' : ''} ${
        compact ? '' : 'w-[56px] gap-0.5 py-1'
      } ${className}`}
    >
      {/* Only the glyph's square carries the selection — the label stays plain
          beneath it, so the rail doesn't read as a column of filled blocks.
          The active glyph scales inside that fixed 36px box (`transform` does
          not change layout), so the tile's height stays put. */}
      <span
        className={`relative flex items-center justify-center rounded-[11px] transition-[color,background-color,box-shadow] w-9 h-9 ${on
          ? 'bg-accent-ui/[0.16] text-accent-ui'
          : 'text-fg-muted group-hover:bg-black/[0.06] dark:group-hover:bg-white/[0.07] group-hover:text-fg'}`}
      >
        <span className={`flex transition-transform duration-200 ease-out motion-reduce:transition-none ${on ? 'scale-[1.2]' : ''}`}>
          {children}
        </span>
        {step === 'done' && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-solid text-accent-ink">
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5 5 9l4.5-5.5" /></svg>
          </span>
        )}
      </span>
      {!compact && (
        <span
          aria-hidden
          className={`block max-w-full truncate px-0.5 text-mini font-medium leading-tight transition-colors ${
            on ? 'text-fg' : 'text-fg-muted group-hover:text-fg'
          }`}
        >
          {label}
        </span>
      )}
    </button>
  )
}

// ── Horizontal foundation switcher (Variables tab only) ──────────────────────
// Replaces the outer SectionRail for Variables specifically: a compact row of
// icon-only buttons docked in Groups' adjacent 52px band (ColorHub for Color,
// FoundationWorkbench for every other foundation). Frees the left column for
// a foundation's own sub-nav. Takes the same `groups` shape SectionRail does —
// same Variables/Styles split, same data — just rendered as a row instead of a
// labeled vertical list. Components and Documentation keep the vertical
// SectionRail; this component doesn't apply there.

export default function FoundationIconRail({
  groups, active, onSelect, orientation = 'horizontal', header, footer, ariaLabel = 'Variable foundations', guide,
}: {
  /** Guided theme setup: steps already done, and the one in progress. Every
   *  other foundation is locked until its turn. */
  guide?: { done: readonly string[]; current: string }
  groups: RailGroup[]
  /** Highlighted entry key. */
  active: string | null
  onSelect: (key: string) => void
  orientation?: 'horizontal' | 'vertical'
  /** Theme library folder — pinned above foundation icons on Theme preview. */
  header?: ReactNode
  /** Themes library door — pinned to the foot of the vertical rail, outside
   *  the icon scroller, so it stays visible when the foundation list is long. */
  footer?: ReactNode
  ariaLabel?: string
}) {
  const vertical = orientation === 'vertical'
  const headerDivider = vertical && header && groups.length > 0
  return (
    <nav
      aria-label={ariaLabel}
      data-shell-chrome={vertical ? '' : undefined}
      className={vertical
        // The `ThemeWorkspaceTabs` strip spans the full width above this rail;
        // icons begin near the top with `pt-2`. Group spacing is per-group.
        ? 'h-full flex-shrink-0 flex flex-col items-center overflow-hidden pt-3 pb-3'
        : 'flex items-center gap-4'}
      style={vertical ? { width: FOUNDATION_ICON_RAIL_WIDTH } : undefined}
    >
      {vertical && header ? (
        <div className="flex w-full flex-shrink-0 flex-col items-center">
          {header}
          {headerDivider ? (
            <div className="mt-0.5 h-px w-8 bg-line/60" aria-hidden />
          ) : null}
        </div>
      ) : null}
      <div className={vertical ? 'flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto scrollbar-thin' : 'contents'}>
        {groups.map((group, gi) => (
          <div
            key={group.label ?? gi}
            className={vertical
              ? `flex w-full flex-col items-center gap-1 ${
                // Groups share the tiles' own `gap-1`: the Variables / Styles
                // split is data, not a visual break, so no extra air between
                // the fourth and fifth icon.
                gi > 0 ? 'mt-1' : headerDivider ? 'pt-[22px]' : ''
              }`
              : `flex items-center ${gi === 0 ? 'gap-1' : 'gap-px'}`}
          >
            {group.items.map(({ key, label, Icon }) => {
              const on = active === key
              const maskSize = VARIABLE_ICON_MASK_SIZE[key] ?? '100%'
              return (
                <RailTile
                  key={key}
                  on={on}
                  label={label}
                  onClick={() => onSelect(key)}
                  ariaCurrent={on ? 'page' : undefined}
                  compact={!vertical}
                  step={!guide || key === guide.current ? undefined : guide.done.includes(key) ? 'done' : 'locked'}
                >
                  {VARIABLE_ICON_SOURCES[key]
                    ? <span
                        aria-hidden
                        className="h-5 w-5"
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
                </RailTile>
              )
            })}
          </div>
        ))}
      </div>
      {vertical && footer ? (
        <div className="flex w-full flex-shrink-0 flex-col items-center gap-1.5 pt-3">
          {footer}
        </div>
      ) : null}
    </nav>
  )
}
