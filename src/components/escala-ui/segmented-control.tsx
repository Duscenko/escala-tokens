// Escala component: SegmentedControl + SegmentedControlItem — the Figma sets of the same names
// (design-plans/segmented-control-contract.md, design-plans/segmented-control-item-contract.md), 1:1.
// A single choice between a few short options on a Surface/muted track (role="radiogroup", each
// segment role="radio" with aria-checked). One tab stop; the arrow keys move and select. Size
// cascades to every item. Appearance: recipes (SegmentedControl, SegmentedControlItem).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const SEGMENTED_CONTROL_SIZES = ['default', 'sm', 'lg'] as const
export type SegmentedControlSize = (typeof SEGMENTED_CONTROL_SIZES)[number]
export const SEGMENTED_CONTROL_ITEM_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const
export type SegmentedControlItemState = (typeof SEGMENTED_CONTROL_ITEM_STATES)[number]

const GroupContext = React.createContext<{
  size: SegmentedControlSize
  value: string | undefined
  select: (value: string) => void
} | null>(null)

export interface SegmentedControlProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  /** Figma Size: the segments' height 32 · 24 · 40 (the track is 8 more). */
  size?: SegmentedControlSize
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Shortcut for plain text segments (each option is its own value). */
  options?: string[]
  /** Figma Content slot: SegmentedControlItem segments. Omitted → the file's Day · Week · Month. */
  children?: React.ReactNode
}

function SegmentedControl({
  size = 'default', value, defaultValue, onValueChange, options, children, className, onKeyDown, ...props
}: SegmentedControlProps) {
  const fallback = options ? options[0] : 'Day'
  const [inner, setInner] = React.useState(defaultValue ?? fallback)
  const active = value ?? inner
  const select = React.useCallback((v: string) => { setInner(v); onValueChange?.(v) }, [onValueChange])
  const content = children ?? (options ?? ['Day', 'Week', 'Month']).map((o) => <SegmentedControlItem key={o} value={o} label={o} />)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([aria-disabled="true"])'))
    if (!radios.length) return
    const at = radios.findIndex((r) => r === document.activeElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? radios.length - 1
      : (at + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + radios.length) % radios.length
    e.preventDefault()
    radios[next].focus()
    radios[next].click()
  }
  return (
    <GroupContext.Provider value={{ size, value: active, select }}>
      <div
        role="radiogroup"
        data-slot="segmented-control"
        data-escala="SegmentedControl"
        data-size={size}
        className={cn('relative inline-flex', className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <div data-part="SegmentedControl.content" className="flex">{content}</div>
      </div>
    </GroupContext.Provider>
  )
}

export interface SegmentedControlItemProps extends Omit<React.ComponentProps<'button'>, 'value'> {
  /** The value this segment selects inside a SegmentedControl (defaults to the label text). */
  value?: string
  /** Figma Label. */
  label?: React.ReactNode
  /** Figma LabelVisible: false → icon only (give it an aria-label). */
  labelVisible?: boolean
  /** Figma IconLeadingVisible + IconLeadingIcon. */
  iconLeadingVisible?: boolean
  iconLeading?: React.ReactNode
  size?: SegmentedControlSize
  /** Figma Checked (a segment inside a SegmentedControl takes it from the group's value). */
  checked?: boolean
  /** Pin a State without a pointer (docs playground, Figma parity). */
  forceState?: SegmentedControlItemState
}

function SegmentedControlItem({
  value, label = 'Label', labelVisible = true, iconLeadingVisible = false, iconLeading, size: sizeProp, checked: checkedProp,
  forceState, disabled, className, onClick, type = 'button', ...props
}: SegmentedControlItemProps) {
  const group = React.useContext(GroupContext)
  const size = sizeProp ?? group?.size ?? 'default'
  const own = value ?? (typeof label === 'string' ? label : undefined)
  const checked = checkedProp ?? (group && own !== undefined ? group.value === own : false)
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <button
      type={type}
      role="radio"
      aria-checked={checked}
      tabIndex={group ? (checked ? 0 : -1) : undefined}
      data-slot="segmented-control-item"
      data-escala="SegmentedControlItem"
      data-size={size}
      data-checked={String(checked)}
      data-force-state={state ?? (isDisabled ? 'Disabled' : undefined)}
      aria-disabled={isDisabled || undefined}
      disabled={disabled}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented && !isDisabled && group && own !== undefined) group.select(own) }}
      className={cn('relative inline-flex shrink-0 items-center justify-center whitespace-nowrap border-0 outline-none select-none aria-disabled:cursor-not-allowed', !isDisabled && 'cursor-pointer', className)}
      {...props}
    >
      {iconLeadingVisible && iconLeading ? (
        <span data-part="SegmentedControlItem.icon" className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full" aria-hidden>{iconLeading}</span>
      ) : null}
      {labelVisible ? <span data-part="SegmentedControlItem.label">{label}</span> : null}
    </button>
  )
}

export { SegmentedControl, SegmentedControlItem }
