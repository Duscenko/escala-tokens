import type { ReactNode } from 'react'
import { RailToggle } from './colorControls'
import VariableCollectionRail, { RailNoGroups, VariableCollectionProvider, type VariableCollectionItem, type VariableCollectionKey } from './VariableCollectionRail'

// One workbench band (family heading + icon rail) for every Variables
// Generator section. Mounted by Configurator OUTSIDE the keyed page motion,
// so Color → Font fades the table, not the switcher. Collapse width is
// shared by Color primitives and every Semantics family. The + on Gradients
// lives in that tab's own nav, not here — this chrome is identical across
// foundations.

export default function FoundationWorkbench({
  railCollapsed = false,
  onToggleRail,
  label,
  groupsTrailing,
  gutter = false,
  activeCollection,
  collections,
  onCollectionChange,
  children,
}: {
  railCollapsed?: boolean
  onToggleRail?: () => void
  /** Column heading for the current foundation — e.g. “Color Variables”. */
  label: string
  groupsTrailing?: ReactNode
  /** Empty 198px column under the heading — for pages that don't already rail
   *  themselves (Icon Library), so the body lines up with Color's table. */
  gutter?: boolean
  activeCollection: VariableCollectionKey
  collections: VariableCollectionItem[]
  onCollectionChange: (collection: VariableCollectionKey) => void
  children: ReactNode
}) {
  const embeddedRailHeader = (
    <div className={`sticky top-0 z-20 flex h-[52px] items-center border-b border-line bg-app ${railCollapsed ? 'justify-center px-0' : 'justify-between gap-2 pl-3 pr-2'}`}>
      {/* The foundation's OWN name, not a bare "Variables" — `label` is
          `section.variablesLabel` ("Color Variables", "Text Variables", …), so
          the rail header says which variables it lists. */}
      {!railCollapsed && <span className="min-w-0 truncate text-ui font-semibold text-fg" title={label}>{label}</span>}
      <div className="flex flex-shrink-0 items-center gap-1">
        {groupsTrailing}
        <RailToggle collapsed={railCollapsed} onClick={onToggleRail} />
      </div>
    </div>
  )
  return (
    <div className="h-full flex flex-col min-h-0">
      {gutter ? (
        <VariableCollectionProvider active={activeCollection} collections={collections} onChange={onCollectionChange} header={embeddedRailHeader}>
          <div className="flex flex-1 min-h-0 items-stretch">
            <VariableCollectionRail collapsed={railCollapsed}>
              {!railCollapsed && <RailNoGroups />}
            </VariableCollectionRail>
            <div className="flex-1 min-w-0 bg-app border-l border-line min-h-0 overflow-hidden">
              {children}
            </div>
          </div>
        </VariableCollectionProvider>
      ) : (
        <div className="flex-1 min-h-0 bg-app">
          <VariableCollectionProvider active={activeCollection} collections={collections} onChange={onCollectionChange} header={embeddedRailHeader}>
            {children}
          </VariableCollectionProvider>
        </div>
      )}
    </div>
  )
}
