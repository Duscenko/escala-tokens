// Escala component: FABGroup — the Figma `FABGroup` set
// (design-plans/fab-group-contract.md): a speed-dial. One trigger FABButton opens up to
// five action items; `layout` sets the direction they fan out in: `stack` (vertical,
// labelled, flush to the trigger's own width) or a radial arc (`fan-center` · `fan-left` ·
// `fan-right`, icon-only). The trigger and every item are FABButton instances — this
// component positions them, it paints nothing of its own (see the contract's "Color y
// efectos"). The trigger's icon swaps Plus → X with `open`; everything else about the
// trigger (Appearance=solid, Shape=pill, Size=lg, Variant=default) and every item
// (Appearance=soft, Shape=pill, Size=default, Variant=default) is fixed, exactly as the
// Figma set has it — there is no per-trigger or per-item styling axis to expose.
//
// Motion (no role of its own): the items open as the system's `list-reveal` and close as its `list-dismiss` — each item
// is one child of a stagger: `use-stagger-in` forward at the `--motion-stagger` step, `use-stagger-out` last item first at
// 0.6 of it. A `stack` item rises (`--motion-transform-enter`); a fan item leaves the trigger's centre and settles on its arc
// (`--motion-transform-pop`). Closed items stay mounted, hidden (`visibility`), so the exit plays; reduced motion (the
// scope's `--motion-stagger: 0` and neutral transforms) leaves the fade, and the fan does not travel.
import * as React from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { FABButton } from './fab-button'

export const FAB_GROUP_LAYOUTS = ['stack', 'fan-center', 'fan-left', 'fan-right'] as const
export type FABGroupLayout = (typeof FAB_GROUP_LAYOUTS)[number]

export interface FABGroupItem {
  /** The item's icon (Figma IconLeadingIcon). */
  icon: React.ReactNode
  /** The action's name — the visible label in `stack`, the accessible name everywhere else
   *  (every fan item is icon-only, LabelVisible off, per the file). */
  label: string
  onSelect?: () => void
}

export interface FABGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  layout?: FABGroupLayout
  /** Up to five (Figma: "opens up to five action items"). */
  items: FABGroupItem[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** The trigger's closed icon (Figma IconLeadingIcon = Plus). */
  triggerIcon?: React.ReactNode
  /** The trigger's open icon (Figma IconLeadingIcon = X). */
  triggerOpenIcon?: React.ReactNode
  /** The trigger's accessible name (Figma Label, "Create") — it is icon-only (LabelVisible off). */
  triggerLabel?: string
  disabled?: boolean
}

/** Phosphor `plus` (regular) — the trigger's closed glyph. */
function PlusGlyph() {
  return (
    glyph('plus')
  )
}

/** Phosphor `x` (regular) — the trigger's open glyph. */
function XGlyph() {
  return (
    glyph('close')
  )
}

/** 100px, measured centre-to-centre on every fan `Layout` in the Figma file — a composition
 *  literal, not a Dimension role (fab-group-contract.md § Geometría: "no role matches it"). */
const FAN_RADIUS = 100

/** The angle (degrees; screen convention — 0 right, −90 up, 180 left) of item `i` of `n`,
 *  per the three fan `Layout`s measured in the file (fab-group-contract.md § Geometría). */
function fanAngle(layout: Exclude<FABGroupLayout, 'stack'>, i: number, n: number): number {
  if (n <= 1) return -90
  const t = i / (n - 1)
  if (layout === 'fan-center') return t * 180 - 180
  if (layout === 'fan-left') return -90 - t * 90
  return -90 + t * 90 // fan-right
}

/** Item `i`'s centre offset from the trigger's centre, in px. */
function fanOffset(layout: Exclude<FABGroupLayout, 'stack'>, i: number, n: number) {
  const a = (fanAngle(layout, i, n) * Math.PI) / 180
  return { x: Math.cos(a) * FAN_RADIUS, y: Math.sin(a) * FAN_RADIUS }
}

/** The trigger is fixed (Appearance=solid, Shape=pill, Size=lg, Variant=default) in all 8
 *  variants of the Figma set — only its icon swaps with `open`. */
function Trigger({
  open, icon, openIcon, label, disabled, onClick,
}: { open: boolean; icon: React.ReactNode; openIcon: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <FABButton
      appearance="solid"
      shape="pill"
      size="lg"
      variant="default"
      aria-label={label}
      aria-expanded={open}
      disabled={disabled}
      icon={open ? openIcon : icon}
      onClick={onClick}
    />
  )
}

/** Every item is fixed (Appearance=soft, Shape=pill, Size=default, Variant=default) in the
 *  file; `labelled` decides whether its Label is shown (`stack`) or stays the aria-label
 *  (every fan Layout — icon-only, per the measured `LabelVisible` table). */
function Item({
  item, labelled, index, count, open, from, disabled,
}: { item: FABGroupItem; labelled: boolean; index: number; count: number; open: boolean; from: string; disabled?: boolean }) {
  const role = open ? 'use-stagger-in' : 'use-stagger-out'
  const step = open ? index : count - 1 - index
  return (
    <FABButton
      appearance="soft"
      shape="pill"
      size="default"
      variant="default"
      aria-label={labelled ? undefined : item.label}
      disabled={disabled}
      icon={item.icon}
      onClick={item.onSelect}
      data-part="FABGroup.item"
      data-open={open ? 'true' : 'false'}
      style={{
        opacity: open ? 1 : 0,
        transform: open ? 'none' : from,
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? undefined : 'none',
        transition: `opacity var(--motion-${role}), transform var(--motion-${role}), visibility var(--motion-${role})`,
        // The dismissal runs at 0.6 of the reveal's step, from the last item to the first (the `list-dismiss` choreography).
        transitionDelay: `calc(${step} * var(--motion-stagger, 0ms) * ${open ? 1 : 0.6})`,
      }}
    >
      {labelled ? item.label : undefined}
    </FABButton>
  )
}

/** The open/closed speed-dial. `items[0]` is the one nearest the trigger in `stack`
 *  (closest above it) and nearest the top of the arc in every fan `Layout` — the order the
 *  file's own `item-1` carries in each (fab-group-contract.md § Geometría). */
function FABGroup({
  layout = 'stack',
  items,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  triggerIcon,
  triggerOpenIcon,
  triggerLabel = 'Create',
  disabled,
  className,
  ...props
}: FABGroupProps) {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = openProp ?? openState
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )
  const toggle = React.useCallback(() => setOpen(!open), [open, setOpen])
  const reduced = useReducedMotion() ?? false

  const trigger = (
    <Trigger
      open={open}
      icon={triggerIcon ?? <PlusGlyph />}
      openIcon={triggerOpenIcon ?? <XGlyph />}
      label={triggerLabel}
      disabled={disabled}
      onClick={toggle}
    />
  )

  // `data-layout` / `data-open` are the recipe's axes (lib/recipes/actions.ts →
  // lib/recipeStyles.ts): only `stack`'s gap is a token (`spacing.inset-control`,
  // applied through the generated stylesheet); the fan arc's 100px radius is a
  // composition literal with no Dimension role (fab-group-contract.md), so it
  // stays inline, computed per item below.
  if (layout === 'stack') {
    return (
      <div
        role="group"
        aria-label={triggerLabel}
        data-slot="fab-group"
        data-escala="FABGroup"
        data-layout={layout}
        data-open={open ? 'true' : 'false'}
        className={cn('inline-flex flex-col-reverse items-end', className)}
        {...props}
      >
        {trigger}
        {items.map((item, i) => (
          <Item key={i} item={item} labelled index={i} count={items.length} open={open} from="translateY(var(--motion-transform-enter))" disabled={disabled} />
        ))}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label={triggerLabel}
      data-slot="fab-group"
      data-escala="FABGroup"
      data-layout={layout}
      data-open={open ? 'true' : 'false'}
      className={cn('relative inline-flex', className)}
      {...props}
    >
      <div className="relative inline-flex">
        {trigger}
        {items.map((item, i) => {
          const { x, y } = fanOffset(layout, i, items.length)
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2"
              style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
            >
              {/* From the trigger's centre (back along the offset), small; reduced motion does not travel. */}
              <Item item={item} labelled={false} index={i} count={items.length} open={open} from={reduced ? 'none' : `translate(${-x}px, ${-y}px) scale(var(--motion-transform-pop))`} disabled={disabled} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { FABGroup }
