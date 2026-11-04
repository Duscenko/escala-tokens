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
  dimensions: '/icons/set-variables/dimension-variables.svg',
  sizes: '/icons/set-variables/size-variables.svg',
  stroke: '/icons/set-variables/stroke-variables.svg',
  icons: '/icons/set-variables/icon-library.svg',
  motion: '/icons/set-variables/motion-variables.svg',
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
  dimensions: '115%',
  sizes: '115%',
  stroke: '145%',
  motion: '115%',
  icons: '135%',
}

export const FOUNDATION_ICON_RAIL_WIDTH = 80
/** The glyph square every rail tile draws — and the brand tile above the rail,
 *  so the logo and the icons share one centre line and one footprint. */
export const RAIL_TILE_SIZE = 40
/** Height of a LABELLED tile's wash (glyph over a label). */
const RAIL_TILE_LABELLED_H = 32

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

/** One tile language for every button in the 80px workspace rail (foundation
 *  icons + the Themes library folder): glyph over a short label. Active = the
 *  platform accent as a subtle wash behind the glyph; the icon stays `text-fg`
 *  like its label so dense shapes (Components) never read louder than stroke-only
 *  icons — not a solid accent fill,
 *  so the selection reads without shouting over the canvas. Inactive glyph and
 *  label share the same faint ink; hover lifts both. `compact` drops the label. */
export function RailTile({
  on, label, onClick, children, ariaCurrent, compact = false, block = false, className = '', step, dimmed = false, grow = true, ...aria
}: {
  /** The workspace nav's shape (YouTube's mini guide, Figma's left bar): ONE
   *  72px block carries the hover around glyph AND label, and the tiles stack
   *  almost flush. The selection is no fill at all: the filled glyph and the
   *  full-strength ink (`text-fg`) say "you are here". The foundation rails keep the
   *  glyph-only wash. */
  block?: boolean
  /** Scale the active glyph up. Off where the glyph itself changes on
   *  activation (the nav rail's regular → fill swap). */
  grow?: boolean
  /** Still clickable (the click explains why), but reads as not open yet. */
  dimmed?: boolean
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
      className={`group flex-shrink-0 flex flex-col items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 disabled:cursor-default ${step === 'locked' ? 'opacity-35' : dimmed ? 'opacity-40' : ''} ${
        block
          ? `w-[72px] gap-1 pb-2 pt-2.5 transition-colors ${on ? 'text-fg' : 'text-fg-faint hover:bg-black/[0.06] dark:hover:bg-white/[0.07] hover:text-fg'}`
          : compact ? '' : 'w-[72px] gap-0.5 py-1'
      } ${className}`}
    >
      {block ? (
        <>
          {children}
          <span aria-hidden className="block max-w-full truncate px-0.5 text-mini font-medium leading-tight">{label}</span>
        </>
      ) : (<>
      {/* Only the glyph's square carries the selection — the label stays plain
          beneath it, so the rail doesn't read as a column of filled blocks.
          The active glyph scales inside that fixed 40px box (`transform` does
          not change layout), so the tile's height stays put. */}
      <span
        // A labelled tile's wash is a 40×32 pill, not a 40px square: the square
        // left 10px of air under a 20px glyph, so the label sat ~14px away
        // and read as a separate item. The width stays RAIL_TILE_SIZE (TopNav
        // aligns the brand mark to it); only the icon-only row keeps 40×40.
        style={{ width: RAIL_TILE_SIZE, height: compact ? RAIL_TILE_SIZE : RAIL_TILE_LABELLED_H }}
        className={`relative flex items-center justify-center rounded-lg transition-[color,background-color,box-shadow] ${on
          ? 'bg-accent-ui/[0.16] text-fg'
          : 'text-fg-faint group-hover:bg-black/[0.06] dark:group-hover:bg-white/[0.07] group-hover:text-fg'}`}
      >
        <span className={`flex transition-transform duration-200 ease-out motion-reduce:transition-none ${on && grow ? 'scale-[1.2]' : ''}`}>
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
            on ? 'text-fg' : 'text-fg-faint group-hover:text-fg'
          }`}
        >
          {label}
        </span>
      )}
      </>)}
    </button>
  )
}

// ── Workspace nav (the Generator's left rail) ───────────────────────────────
// Where you are in the product: Overview (the brand's board) · Variables ·
// System · Code · Components. WHICH foundation is being edited is the strip at
// the top of the inspector (`FoundationSwitchStrip`), beside the controls it
// switches.

export type WorkspaceNavKey = 'overview' | 'variables' | 'system' | 'code' | 'components'

// Phosphor (`@phosphor-icons/core@2.1.1`), copied verbatim from
// `src/generated/phosphor-body-{regular,fill}.ts` — the same set the product's
// components and the plugin ship. Phosphor bakes the stroke into each outline
// on a 256 grid, so drawing every glyph from ONE weight is what makes their
// strokes match. Inactive = REGULAR (line), active = FILL: the weight swap is
// the selection, so this rail does not also scale the active glyph. Every
// glyph here keeps its silhouette between the two weights — Icons follow the Figma
// nav-rail frame (HB1kCcjd…, node 6:1253): house · stack · brackets-curly ·
// diamonds-four. Eight bodies are inlined rather than importing a whole weight map (~1,500 icons).
// Variables keeps its glyph: `hexagon` + a centre dot (a hole when filled).
const NAV_ICON_PROPS = {
  width: 20, height: 20, viewBox: '0 0 256 256', fill: 'currentColor', 'aria-hidden': true,
} as const

/** The Variables dot, as a closed path (r 22 at the centre). */
const HEX_DOT = 'M150,128a22,22,0,1,1-44,0a22,22,0,1,1,44,0Z'

const NAV_ICON_PATHS: Record<WorkspaceNavKey, { regular: string; fill: string }> = {
  // house
  system: {
    regular: 'M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z',
    fill: 'M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z',
  },
  // stack
  overview: {
    regular: 'M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z',
    fill: 'M220,169.09l-92,53.65L36,169.09A8,8,0,0,0,28,182.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,169.09ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM28,86.91l96,56a8,8,0,0,0,8.06,0l96-56a8,8,0,0,0,0-13.82l-96-56a8,8,0,0,0-8.06,0l-96,56a8,8,0,0,0,0,13.82Z',
  },
  // hexagon (+ HEX_DOT)
  variables: {
    regular: 'M223.68,66.15,135.68,18h0a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM216,175.82,128,224,40,175.82V80.18L128,32h0l88,48.17Z',
    fill: 'M232,80.18v95.64a16,16,0,0,1-8.32,14l-88,48.17a15.88,15.88,0,0,1-15.36,0l-88-48.17a16,16,0,0,1-8.32-14V80.18a16,16,0,0,1,8.32-14l88-48.17a15.88,15.88,0,0,1,15.36,0l88,48.17A16,16,0,0,1,232,80.18Z',
  },
  // brackets-curly
  code: {
    regular: 'M43.18,128a29.78,29.78,0,0,1,8,10.26c4.8,9.9,4.8,22,4.8,33.74,0,24.31,1,36,24,36a8,8,0,0,1,0,16c-17.48,0-29.32-6.14-35.2-18.26-4.8-9.9-4.8-22-4.8-33.74,0-24.31-1-36-24-36a8,8,0,0,1,0-16c23,0,24-11.69,24-36,0-11.72,0-23.84,4.8-33.74C50.68,38.14,62.52,32,80,32a8,8,0,0,1,0,16C57,48,56,59.69,56,84c0,11.72,0,23.84-4.8,33.74A29.78,29.78,0,0,1,43.18,128ZM240,120c-23,0-24-11.69-24-36,0-11.72,0-23.84-4.8-33.74C205.32,38.14,193.48,32,176,32a8,8,0,0,0,0,16c23,0,24,11.69,24,36,0,11.72,0,23.84,4.8,33.74a29.78,29.78,0,0,0,8,10.26,29.78,29.78,0,0,0-8,10.26c-4.8,9.9-4.8,22-4.8,33.74,0,24.31-1,36-24,36a8,8,0,0,0,0,16c17.48,0,29.32-6.14,35.2-18.26,4.8-9.9,4.8-22,4.8-33.74,0-24.31,1-36,24-36a8,8,0,0,0,0-16Z',
    fill: 'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM88,155.84c.29,14.26.41,20.16,16,20.16a8,8,0,0,1,0,16c-31.27,0-31.72-22.43-32-35.84C71.71,141.9,71.59,136,56,136a8,8,0,0,1,0-16c15.59,0,15.71-5.9,16-20.16C72.28,86.43,72.73,64,104,64a8,8,0,0,1,0,16c-15.59,0-15.71,5.9-16,20.16-.17,8.31-.41,20.09-8,27.84C87.59,135.75,87.83,147.53,88,155.84ZM200,136c-15.59,0-15.71,5.9-16,20.16-.28,13.41-.73,35.84-32,35.84a8,8,0,0,1,0-16c15.59,0,15.71-5.9,16-20.16.17-8.31.41-20.09,8-27.84-7.6-7.75-7.84-19.53-8-27.84C167.71,85.9,167.59,80,152,80a8,8,0,0,1,0-16c31.27,0,31.72,22.43,32,35.84.29,14.26.41,20.16,16,20.16a8,8,0,0,1,0,16Z',
  },
  // diamonds-four
  components: {
    regular: 'M122.34,109.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0,0-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32ZM128,35.31,156.69,64,128,92.69,99.31,64Zm5.66,111a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0,0-11.32ZM128,220.69,99.31,192,128,163.31,156.69,192Zm109.66-98.35-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,237.66,122.34ZM192,156.69,163.31,128,192,99.31,220.69,128Zm-82.34-34.35-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,109.66,122.34ZM64,156.69,35.31,128,64,99.31,92.69,128Z',
    fill: 'M82.34,69.66a8,8,0,0,1,0-11.32l40-40a8,8,0,0,1,11.32,0l40,40a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32,0Zm51.32,76.68a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0,0-11.32Zm104-24-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,237.66,122.34Zm-128,0-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,0,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,109.66,122.34Z',
  },
}

function NavIcon({ id, filled }: { id: WorkspaceNavKey; filled: boolean }) {
  const paths = NAV_ICON_PATHS[id]
  if (id === 'variables') {
    return filled
      ? <svg {...NAV_ICON_PROPS}><path fillRule="evenodd" d={`${paths.fill}${HEX_DOT}`} /></svg>
      : <svg {...NAV_ICON_PROPS}><path d={paths.regular} /><path d={HEX_DOT} /></svg>
  }
  return <svg {...NAV_ICON_PROPS}><path d={filled ? paths.fill : paths.regular} /></svg>
}

export function WorkspaceNavRail({ items, active, onSelect, ariaLabel, dimmed, dimmedReason }: {
  /** Labels already translated. */
  items: readonly { key: WorkspaceNavKey; label: string }[]
  active: WorkspaceNavKey | null
  onSelect: (key: WorkspaceNavKey) => void
  ariaLabel: string
  /** Not open yet (a brand still being created): dimmed, and the click says why. */
  dimmed?: readonly WorkspaceNavKey[]
  dimmedReason?: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      data-shell-chrome=""
      className="flex h-full flex-shrink-0 flex-col items-center gap-0.5 overflow-y-auto pt-2 pb-3 scrollbar-thin bg-nav"
      style={{ width: FOUNDATION_ICON_RAIL_WIDTH }}
    >
      {items.map(({ key, label }) => {
        const on = active === key
        const off = !on && (dimmed?.includes(key) ?? false)
        return (
          <RailTile
            key={key}
            on={on}
            label={label}
            onClick={() => onSelect(key)}
            ariaCurrent={on ? 'page' : undefined}
            dimmed={off}
            title={off ? dimmedReason : label}
            grow={false}
            block
          >
            <NavIcon id={key} filled={on} />
          </RailTile>
        )
      })}
    </nav>
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
