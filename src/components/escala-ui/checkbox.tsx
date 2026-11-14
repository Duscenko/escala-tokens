// Escala component: Checkbox — the Figma `Checkbox` set (design-plans/checkbox-contract.md), 1:1:
// Size xs · sm · default × Checked false · true · indeterminate × State × Variant default ·
// secondary · critical · success · info · inverse. Behaviour from Radix Checkbox (a button with
// `role="checkbox"`, tri-state). The bare box: label it with CheckboxItem, Label or a Field.
// Appearance: recipe (Checkbox), which reads `data-size`, `data-checked`, `data-variant` and the State.
import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const CHECKBOX_SIZES = ['xs', 'sm', 'default'] as const
export type CheckboxSize = (typeof CHECKBOX_SIZES)[number]
export const CHECKBOX_STATES = ['Default', 'Hover', 'Focused', 'Disabled', 'Invalid'] as const
export type CheckboxState = (typeof CHECKBOX_STATES)[number]
export const CHECKBOX_VARIANTS = ['default', 'secondary', 'critical', 'success', 'info', 'inverse'] as const
export type CheckboxVariant = (typeof CHECKBOX_VARIANTS)[number]
export type CheckboxChecked = boolean | 'indeterminate'


export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  /** Figma Size: box 16 · 16 · 20 (Size/selector-sm · sm · md). */
  size?: CheckboxSize
  /** Figma Variant: the colour of the checked box and its focus ring. */
  variant?: CheckboxVariant
  /** Pin a State without a pointer (docs playground, Figma parity). */
  forceState?: CheckboxState
  /** The check glyph (Phosphor Check / Minus by default). */
  icon?: React.ReactNode
}

function Checkbox({
  className, size = 'default', variant = 'default', forceState, icon, checked, defaultChecked, disabled,
  onCheckedChange, 'aria-invalid': ariaInvalid, ...props
}: CheckboxProps) {
  const [inner, setInner] = React.useState<CheckboxChecked>(defaultChecked ?? false)
  const on = checked ?? inner
  const isDisabled = disabled || forceState === 'Disabled'
  const invalid = ariaInvalid === true || ariaInvalid === 'true'
  // A live disabled or invalid box pins its look (as Input does).
  const pinned = forceState && forceState !== 'Default' ? forceState : isDisabled ? 'Disabled' : invalid ? 'Invalid' : undefined
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-escala="Checkbox"
      data-size={size}
      data-variant={variant}
      data-checked={on === 'indeterminate' ? 'indeterminate' : on ? 'true' : 'false'}
      data-force-state={pinned}
      aria-disabled={isDisabled || undefined}
      aria-invalid={ariaInvalid}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={isDisabled}
      onCheckedChange={(v) => { setInner(v); onCheckedChange?.(v) }}
      className={cn('peer relative inline-flex shrink-0 items-center justify-center p-0 outline-none disabled:cursor-not-allowed', className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" data-part="Checkbox.indicator" className="inline-flex text-current transition-none [&>svg]:size-full">
        {icon ?? glyph(on === 'indeterminate' ? 'minus' : 'check')}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

// CheckboxItem — the Figma `CheckboxItem` set (design-plans/checkbox-item-contract.md): the Checkbox
// (same Size · Checked · State · Variant) beside a label and an optional description. The whole row
// is a <label>, so a click anywhere toggles the box; the description is wired with aria-describedby.
export const CHECKBOX_ITEM_STATES = ['Default', 'Disabled', 'Invalid'] as const
export type CheckboxItemState = (typeof CHECKBOX_ITEM_STATES)[number]
export const CHECKBOX_ITEM_PLACEMENTS = ['left', 'right'] as const
export type CheckboxItemPlacement = (typeof CHECKBOX_ITEM_PLACEMENTS)[number]

export interface CheckboxItemProps extends Omit<CheckboxProps, 'forceState' | 'children'> {
  /** Figma Label. */
  label?: React.ReactNode
  /** Figma Description (DescriptionVisible when given). */
  description?: React.ReactNode
  /** Figma Placement: the box before (left) or after (right) the text. */
  placement?: CheckboxItemPlacement
  /** Figma State Invalid: the box's edge turns critical. */
  invalid?: boolean
  /** Pin a State without a pointer (docs). */
  forceState?: CheckboxItemState
  /** Classes for the row (`className` goes to the box). */
  rowClassName?: string
  rowStyle?: React.CSSProperties
}

/** A CheckboxGroup's Size · Placement · State · Variant, which its rows take unless they set their own. */
const CheckboxGroupContext = React.createContext<{
  size?: CheckboxSize; placement?: CheckboxItemPlacement; state?: CheckboxGroupState; variant?: CheckboxVariant
} | null>(null)

function CheckboxItem({
  label = 'Label', description, placement: placementProp, size: sizeProp, variant: variantProp, invalid, disabled,
  forceState: forceProp, rowClassName, rowStyle, id, ...props
}: CheckboxItemProps) {
  const group = React.useContext(CheckboxGroupContext)
  const size = sizeProp ?? group?.size ?? 'default'
  const placement = placementProp ?? group?.placement ?? 'left'
  const variant = variantProp ?? group?.variant ?? 'default'
  const forceState = forceProp ?? (group?.state && group.state !== 'Default' ? group.state : undefined)
  const auto = React.useId()
  const boxId = id ?? auto
  const descId = `${boxId}-description`
  const state: CheckboxItemState = forceState ?? (disabled ? 'Disabled' : invalid ? 'Invalid' : 'Default')
  const control = (
    // One label line tall (1lh in the label's type), the box centred in it.
    <span data-part="CheckboxItem.control" className="inline-flex h-[1lh] shrink-0 items-center">
      <Checkbox
        id={boxId}
        size={size}
        variant={variant}
        disabled={disabled || state === 'Disabled'}
        aria-invalid={state === 'Invalid' || undefined}
        aria-describedby={description != null ? descId : undefined}
        forceState={state === 'Default' ? undefined : state}
        {...props}
      />
    </span>
  )
  return (
    <label
      htmlFor={boxId}
      data-slot="checkbox-item"
      data-escala="CheckboxItem"
      data-size={size}
      data-placement={placement}
      data-force-state={state === 'Default' ? undefined : state}
      className={cn('flex max-w-full items-start', state === 'Disabled' ? 'cursor-not-allowed' : 'cursor-pointer', rowClassName)}
      style={rowStyle}
    >
      {placement === 'left' && control}
      <span data-part="CheckboxItem.content" className="flex min-w-0 flex-1 flex-col">
        <span data-part="CheckboxItem.label">{label}</span>
        {description != null && <span data-part="CheckboxItem.description" id={descId}>{description}</span>}
      </span>
      {placement === 'right' && control}
    </label>
  )
}

// CheckboxGroup — the Figma `CheckboxGroup` set (design-plans/checkbox-group-contract.md): a group
// label, the CheckboxItem rows (each independent) and an optional footer (helper, or the error when
// Invalid). role="group" named by the label, described by the footer. Size · Placement · State ·
// Variant cascade to the rows.
export const CHECKBOX_GROUP_STATES = ['Default', 'Invalid', 'Disabled'] as const
export type CheckboxGroupState = (typeof CHECKBOX_GROUP_STATES)[number]

export interface CheckboxGroupProps extends React.ComponentProps<'div'> {
  /** Figma GroupLabel. */
  label?: React.ReactNode
  /** Figma FooterText (FooterVisible when given): helper text, or the error when invalid. */
  footer?: React.ReactNode
  size?: CheckboxSize
  placement?: CheckboxItemPlacement
  variant?: CheckboxVariant
  /** Figma State: Invalid reddens the footer and every box edge; Disabled mutes everything. */
  invalid?: boolean
  disabled?: boolean
  /** Pin a State (docs). */
  forceState?: CheckboxGroupState
  /** The CheckboxItem rows. Omitted → the file's three sample rows. */
  children?: React.ReactNode
}

function CheckboxGroup({
  label = 'Notifications', footer, size = 'default', placement = 'left', variant = 'default', invalid, disabled,
  forceState, children, className, id, ...props
}: CheckboxGroupProps) {
  const auto = React.useId()
  const base = id ?? auto
  const state: CheckboxGroupState = forceState ?? (disabled ? 'Disabled' : invalid ? 'Invalid' : 'Default')
  const rows = children ?? (
    <>
      <CheckboxItem label="Email" defaultChecked />
      <CheckboxItem label="SMS" />
      <CheckboxItem label="Push notifications" defaultChecked />
    </>
  )
  return (
    <CheckboxGroupContext.Provider value={{ size, placement, state, variant }}>
      <div
        id={id}
        role="group"
        aria-labelledby={`${base}-label`}
        aria-describedby={footer != null ? `${base}-footer` : undefined}
        aria-disabled={state === 'Disabled' || undefined}
        data-slot="checkbox-group"
        data-escala="CheckboxGroup"
        data-size={size}
        data-placement={placement}
        data-force-state={state === 'Default' ? undefined : state}
        className={cn('flex max-w-full flex-col [&>[data-escala=CheckboxItem]]:w-full!', className)}
        {...props}
      >
        <span data-part="CheckboxGroup.label" id={`${base}-label`}>{label}</span>
        {rows}
        {footer != null && <span data-part="CheckboxGroup.footer" id={`${base}-footer`}>{footer}</span>}
      </div>
    </CheckboxGroupContext.Provider>
  )
}

export { Checkbox, CheckboxItem, CheckboxGroup }
