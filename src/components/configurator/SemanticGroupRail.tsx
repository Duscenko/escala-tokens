import VariableCollectionRail, { RailGroupNav, type RailGroupItem } from './VariableCollectionRail'

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
}: {
  ariaLabel: string
  items: SemanticGroupRailItem<Key>[]
  active: Key
  collapsed?: boolean
  onChange: (key: Key) => void
}) {
  return (
    <VariableCollectionRail collapsed={collapsed} ariaLabel={ariaLabel}>
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
