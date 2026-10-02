import type { ReactNode } from 'react'
import VariableCollectionRail, { RailDivider, RailGroupNav, type RailGroupItem } from './VariableCollectionRail'

/** Kept as its own name because five semantic surfaces import it, but the row
 *  itself is `RailGroupNav` now — the same one Spacing and Sizes render. */
export type SemanticGroupRailItem<Key extends string> = RailGroupItem<Key> & { count: number }

/** Shared semantic sub-navigation. Its width mirrors Color's category rail so
 * the workbench divider remains continuous while switching foundations. */
export default function SemanticGroupRail<Key extends string>({
  ariaLabel,
  items,
  active,
  collapsed = false,
  onChange,
  controls,
}: {
  ariaLabel: string
  items: SemanticGroupRailItem<Key>[]
  active: Key
  collapsed?: boolean
  onChange: (key: Key) => void
  /** Global controls for the foundation (Radius' preset, Spacing's base unit),
   *  above the groups — they regrade the whole ramp, not one role. Dropped when
   *  the rail is collapsed to its glyph strip. */
  controls?: ReactNode
}) {
  return (
    <VariableCollectionRail collapsed={collapsed} ariaLabel={ariaLabel}>
      {controls && !collapsed && (
        <>
          <div className="flex flex-col gap-0.5">{controls}</div>
          <RailDivider />
        </>
      )}
      <RailGroupNav
        ariaLabel={`${ariaLabel} groups`}
        items={items}
        active={active}
        collapsed={collapsed}
        onChange={onChange}
      />
    </VariableCollectionRail>
  )
}
