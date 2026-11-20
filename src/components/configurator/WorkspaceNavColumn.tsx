import { createContext, useCallback, useContext, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../lib/i18n'
import { PANEL_SURFACE } from './themeWorkspaceLayout'
import { InspectorPortal } from './WorkspaceInspector'

// ─── The Generator's LEFT column: where you are inside a mode ───────────────
// Layout: [mode rail] [card: nav pane | canvas] [inspector]. The column is the
// LEFT PANE of the canvas card (proposal C): rounded on the left only, its
// right border is the card's divider, and the canvas drops its left edge
// (Configurator, `navInCard`). Two islands, not three.
// The rail picks the MODE (Home · Board · Variables · Code · Components); this
// column lists the PLACES inside it, by name (Color, Radius… / a component
// family and its parts). The inspector on the right only edits.
//
// Plan and the reasoning: design-plans/generator-left-nav.md. Workshop sketch:
// Escala Workshop, page "✎ Generator · navegación izquierda 2026-11-20".
//
// Panels that used to put their navigation in the inspector (Variables'
// Collections + Groups) render it through `NavPortal`: here when this column
// is mounted, in the inspector otherwise, so every other surface keeps its
// old placement.

export const NAV_COLUMN_WIDTH = 248
/** The canvas card's header band (CenterHeader, the catalogue row): the pane's
 *  header matches it so one rule runs across the whole card. */
export const NAV_COLUMN_HEADER_H = 52
/** The folded column: one button wide, so the canvas gets the width back. */
const NAV_COLUMN_FOLDED_WIDTH = 44

const NavSlotContext = createContext<HTMLElement | null>(null)

export function NavSlotProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <NavSlotContext.Provider value={slot}>{children}</NavSlotContext.Provider>
}

/** True when the left column is mounted, i.e. a `NavPortal` lands in it. */
export function useInNavColumn(): boolean {
  return useContext(NavSlotContext) !== null
}

/** Renders navigation into the left column when it is mounted, into the
 *  inspector otherwise (the placement every panel had before the column). */
export function NavPortal({ children }: { children: ReactNode }) {
  const slot = useContext(NavSlotContext)
  if (!slot) return <InspectorPortal>{children}</InspectorPortal>
  return createPortal(children, slot)
}

const STORAGE_PREFIX = 'escala.navColumn.folded.'

function readFolded(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(STORAGE_PREFIX + key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

/** Folded or open, per mode, remembered in this browser only (a per-viewer
 *  convenience, not design state: it never reaches the store or an export). */
/** Below this width the column starts folded (until the person opens it
 *  once): on a 1280px laptop the open column costs the tables ~200px. */
export const NAV_COLUMN_AUTO_FOLD_BELOW = 1360

function narrowWindow(): boolean {
  try {
    return window.innerWidth < NAV_COLUMN_AUTO_FOLD_BELOW
  } catch {
    return false
  }
}

export function useNavColumnFolded(mode: string): [boolean, (next: boolean) => void] {
  const [folded, setFolded] = useState(() => readFolded(mode, narrowWindow()))
  const set = useCallback((next: boolean) => {
    setFolded(next)
    try {
      window.localStorage.setItem(STORAGE_PREFIX + mode, next ? '1' : '0')
    } catch {
      // Private window or blocked storage: the column still folds for this visit.
    }
  }, [mode])
  return [folded, set]
}

function FoldIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2.5" width="12" height="11" rx="2" />
      <path d="M6 2.5v11" />
      <path d={open ? 'M10.5 6.5 9 8l1.5 1.5' : 'M9 6.5 10.5 8 9 9.5'} />
    </svg>
  )
}

/** Folds or opens the left column. Also sits in the Components / Blocks
 *  directories' header band, where those directories are the column. */
export function NavFoldButton({ folded, onClick }: { folded: boolean; onClick: () => void }) {
  const { t } = useI18n()
  const label = folded ? t('Show navigation') : t('Hide navigation')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={!folded}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-fg-faint transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <FoldIcon open={!folded} />
    </button>
  )
}

export default function WorkspaceNavColumn({
  label,
  title,
  folded,
  onFoldedChange,
  onSlot,
  children,
  foldedChildren,
  slotStyle,
}: {
  /** Accessible name of the column (the mode: "Variables", "Components"). */
  label: string
  /** Visible heading at the top of the column. */
  title: string
  folded: boolean
  onFoldedChange: (next: boolean) => void
  /** Callback ref for the area `NavPortal` renders into, under `children`. */
  onSlot?: (el: HTMLElement | null) => void
  /** The column's own list, above the portaled navigation. */
  children?: ReactNode
  /** What the folded strip still offers (icon-only rows), so a narrow window
   *  keeps one-click navigation. */
  foldedChildren?: ReactNode
  /** Custom properties for the list (the edited theme's accent). */
  slotStyle?: CSSProperties
}) {
  return (
    <aside
      aria-label={label}
      className={`relative my-3 flex min-h-0 flex-shrink-0 flex-col overflow-hidden rounded-l-2xl ${PANEL_SURFACE}`}
      style={{ width: folded ? NAV_COLUMN_FOLDED_WIDTH : NAV_COLUMN_WIDTH, '--tab-bar': 'var(--side-panel)', '--color-tab-bar': 'var(--side-panel)' } as CSSProperties}
      data-nav-column={folded ? 'folded' : 'open'}
    >
      <div className={`flex flex-shrink-0 items-center gap-2 border-b border-line ${folded ? 'justify-center' : 'pl-4 pr-2.5'}`} style={{ height: NAV_COLUMN_HEADER_H }}>
        {!folded && <h2 className="min-w-0 flex-1 truncate text-ui font-semibold text-fg">{title}</h2>}
        <NavFoldButton folded={folded} onClick={() => onFoldedChange(!folded)} />
      </div>
      {folded && foldedChildren && (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto py-2">{foldedChildren}</div>
      )}
      {/* Folded, the list is hidden. Variables then points its NavPortal back
          at the inspector (Configurator), so the portaled panels remount
          there: folding is a layout change, local scroll and accordion state
          inside them reset. */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden ${folded ? 'hidden' : ''}`} style={slotStyle}>
        {children}
        <div
          ref={onSlot}
          className="flex min-h-0 flex-col [&>*]:!w-full [&>*]:!h-auto [&>*]:!flex-none [&>*]:!border-r-0 [&>*]:!overflow-visible"
        />
      </div>
    </aside>
  )
}

/** One labelled group of the column's own list. */
export function NavGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-2 pt-3">
      {label && <p className="px-2 pb-1 text-caption font-medium text-fg-faint">{label}</p>}
      {children}
    </div>
  )
}

/** One row of the column's own list: a place, by name. */
export function NavRow({
  label,
  icon,
  current = false,
  disabled = false,
  disabledReason,
  trailing,
  onSelect,
  compact = false,
}: {
  /** Icon only (the folded strip): the name moves to the tooltip. */
  compact?: boolean
  label: string
  icon?: ReactNode
  current?: boolean
  disabled?: boolean
  disabledReason?: string
  trailing?: ReactNode
  onSelect: () => void
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-current={current ? 'page' : undefined}
        aria-label={label}
        title={disabled ? disabledReason : label}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:h-4 [&>svg]:w-4 ${
          current ? 'bg-fg/[0.09] text-fg' : 'text-fg-faint hover:bg-fg/[0.06] hover:text-fg'
        }`}
      >
        {icon}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-current={current ? 'page' : undefined}
      title={disabled ? disabledReason : undefined}
      className={`flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 disabled:cursor-not-allowed disabled:opacity-40 ${
        current ? 'bg-fg/[0.09] font-medium text-fg' : 'text-fg-muted hover:bg-fg/[0.06] hover:text-fg'
      }`}
    >
      {icon && <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4 ${current ? '' : 'text-fg-faint'}`}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  )
}
