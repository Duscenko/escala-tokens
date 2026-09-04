import { createContext, useContext, type ReactNode, type Ref } from 'react'
import { COLLAPSED_RAIL_WELL, COLOR_RAIL_COLLAPSED_WIDTH, COLOR_RAIL_WIDTH } from './colorControls'

export type VariableCollectionKey = 'primitives' | 'semantics' | 'gradients'

export type VariableCollectionItem = {
  key: VariableCollectionKey
  label: string
  count?: number
}

type CollectionContextValue = {
  active: VariableCollectionKey
  collections: VariableCollectionItem[]
  onChange: (collection: VariableCollectionKey) => void
  header?: ReactNode
}

const CollectionContext = createContext<CollectionContextValue | null>(null)

export function VariableCollectionProvider({
  active,
  collections,
  onChange,
  header,
  children,
}: CollectionContextValue & { children: ReactNode }) {
  return <CollectionContext.Provider value={{ active, collections, onChange, header }}>{children}</CollectionContext.Provider>
}

/**
 * The shared folder glyph for every rail that lists a folder — this column's
 * Collections rows AND `ColorPrimitives`' theme-folder / group headers, which
 * each hand-rolled their own `<path>` before. Rendered as a CSS mask painted
 * with `currentColor`, not an `<img>`: the source (`public/icons/settings/
 * folder.svg`) ships a hardcoded `stroke="white"`, so a bare `<img>` would be
 * invisible in light chrome and unable to follow the row's active/hover ink.
 * The mask reads only the file's alpha, so one asset serves every state and
 * both themes. Same technique as `ViewIcon` / `EditThemeIcon`.
 */
export function FolderIcon({ size = 12 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="block flex-shrink-0 bg-current"
      style={{
        width: size,
        height: size,
        WebkitMask: "url('/icons/settings/folder.svg') center / contain no-repeat",
        mask: "url('/icons/settings/folder.svg') center / contain no-repeat",
      }}
    />
  )
}

// ─── Groups-section primitives ──────────────────────────────────────────────
// Everything a foundation puts under "Groups" comes from here, so the column
// has ONE inset instead of one per section. Before this, the same 240px rail
// carried four different left edges (measured): the headings at 13.5px, the
// group rows at 22.5px, their labels at 36px, and Spacing's base-unit block at
// 31.5px — every one of them hand-rolled at its call site. Now a control and a
// group row share one footprint (13.5 → 225.5), and the caption's `px-2` puts
// it on the row labels' own line at 22.5 with its readout on the counts' right
// edge at 216.5.

/** A labelled global control — Spacing's base unit, Radius' preset and
 *  roundness, Shadow's preset. `trailing` is the live readout (a value, a
 *  count), on the same right edge the group rows put their counts. */
export function RailControl({
  label,
  trailing,
  children,
}: {
  label: string
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 py-1.5">
      <div className="flex items-center justify-between gap-2 px-2">
        <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{label}</span>
        {trailing !== undefined && (
          <span className="text-caption font-mono tabular-nums text-fg-faint">{trailing}</span>
        )}
      </div>
      {children}
    </div>
  )
}

/** Separates a control block from the nav below it. Same hairline the rail
 *  already draws between Collections and Groups — one divider mark per rail. */
export function RailDivider() {
  return <div className="my-1.5 h-px bg-line" aria-hidden />
}

/** What a foundation with no groups shows, instead of a heading over nothing.
 *  Sits on the group rows' text line. */
export function RailNoGroups() {
  return <p className="px-2 text-caption leading-5 text-fg-faint">This library has no variable groups.</p>
}

export type RailGroupItem<Key extends string> = {
  key: Key
  label: string
  count?: number
  hint?: string
  shortLabel?: string
}

function compactLabel(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  return label.slice(0, 2).toUpperCase()
}

/** The group row. Every rail's sub-navigation renders through this —
 *  `SemanticGroupRail` for the semantic surfaces, Spacing and Sizes for their
 *  collections — so a group row is one shape, not one per section. */
export function RailGroupNav<Key extends string>({
  ariaLabel,
  items,
  active,
  collapsed = false,
  onChange,
}: {
  ariaLabel: string
  items: RailGroupItem<Key>[]
  active: Key
  collapsed?: boolean
  onChange: (key: Key) => void
}) {
  return (
    <div role="navigation" aria-label={ariaLabel} className={`flex flex-col gap-0.5 ${collapsed ? 'items-center' : ''}`}>
      {items.map((item) => {
        const selected = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-current={selected ? 'page' : undefined}
            aria-label={item.label}
            title={collapsed ? `${item.label}${item.count !== undefined ? ` · ${item.count}` : ''}${item.hint ? ` — ${item.hint}` : ''}` : item.hint}
            className={`rounded-lg text-left transition-colors ${
              collapsed ? COLLAPSED_RAIL_WELL : 'flex w-full items-center gap-2 px-2 py-2'
            } ${
              selected ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
            }`}
          >
            {collapsed ? (
              <span aria-hidden className="text-micro font-semibold tracking-[0.06em] text-current">
                {item.shortLabel ?? compactLabel(item.label)}
              </span>
            ) : (
              <>
                <span className="text-ui flex-1 min-w-0 truncate">{item.label}</span>
                {item.count !== undefined && (
                  <span className={`text-caption font-mono tabular-nums ${selected ? 'text-fg-muted' : 'text-fg-faint'}`}>{item.count}</span>
                )}
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** One Figma-style column: collection choice first, contextual groups below. */
export default function VariableCollectionRail({
  children,
  collapsed = false,
  ariaLabel = 'Variable collections and groups',
  navRef,
}: {
  children: ReactNode
  collapsed?: boolean
  ariaLabel?: string
  navRef?: Ref<HTMLElement>
}) {
  const context = useContext(CollectionContext)
  if (!context) return <>{children}</>

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className="flex-shrink-0 h-full overflow-y-auto border-r border-line bg-app transition-[width] duration-200"
      style={{ width: collapsed ? COLOR_RAIL_COLLAPSED_WIDTH : COLOR_RAIL_WIDTH }}
    >
      {context.header}
      <div className={collapsed ? 'px-[8px] py-2' : 'px-3 py-3'}>
      <section aria-labelledby="variable-collections-heading">
        {!collapsed && <h2 id="variable-collections-heading" className="px-1 pb-2 text-ui font-semibold text-fg">Collections</h2>}
        <div className={`flex flex-col gap-0.5 ${collapsed ? 'items-center' : ''}`}>
          {context.collections.map((collection) => {
            const selected = context.active === collection.key
            return (
              <button
                key={collection.key}
                type="button"
                onClick={() => context.onChange(collection.key)}
                aria-current={selected ? 'page' : undefined}
                aria-label={collection.label}
                title={collapsed ? collection.label : undefined}
                className={`rounded-lg transition-colors ${collapsed ? COLLAPSED_RAIL_WELL : 'flex w-full items-center gap-2 px-2 py-2 text-left'} ${
                  selected ? 'text-fg bg-elevated/70' : 'text-fg-faint hover:text-fg-muted hover:bg-elevated/40'
                }`}
              >
                <span className="flex-shrink-0"><FolderIcon size={collapsed ? 16 : 12} /></span>
                {!collapsed && <>
                  {/* Verbatim, no `uppercase` — these are names ("Color
                      primitives", "Shadow styles"), and shouting a name in CSS
                      misreports it. The all-caps device belongs to the eyebrow
                      caption above a group, not to a navigable row. Same call
                      as `HubRail`'s rows in `ThemePreviewHub`. */}
                  <span className={`min-w-0 flex-1 truncate text-body ${selected ? 'text-fg font-semibold' : ''}`}>{collection.label}</span>
                  {collection.count !== undefined && <span className="flex-shrink-0 text-mini font-mono tabular-nums text-fg-faint">{collection.count}</span>}
                </>}
              </button>
            )
          })}
        </div>
      </section>

      <div className={`${collapsed ? 'my-2' : 'my-3'} h-px bg-line`} aria-hidden />

      <section aria-labelledby="variable-groups-heading">
        {!collapsed && <h2 id="variable-groups-heading" className="px-1 pb-2 text-ui font-semibold text-fg">Groups</h2>}
        {children}
      </section>
      </div>
    </nav>
  )
}
