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
import * as React from 'react'
import { cn } from '../../lib/utils'
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
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
    </svg>
  )
}

/** Phosphor `x` (regular) — the trigger's open glyph. */
function XGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
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
  item, labelled, index, disabled,
}: { item: FABGroupItem; labelled: boolean; index: number; disabled?: boolean }) {
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
      className="[transition:opacity_var(--motion-use-stagger-in,180ms_cubic-bezier(0,0,0.2,1)),transform_var(--motion-use-stagger-in,180ms_cubic-bezier(0,0,0.2,1))]"
      style={{ transitionDelay: `calc(${index} * 30ms)` }}
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
        {open &&
          items.map((item, i) => <Item key={i} item={item} labelled index={i} disabled={disabled} />)}
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
        {open &&
          items.map((item, i) => {
            const { x, y } = fanOffset(layout, i, items.length)
            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2"
                style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
              >
                <Item item={item} labelled={false} index={i} disabled={disabled} />
              </div>
            )
          })}
      </div>
    </div>
  )
}

export { FABGroup }
