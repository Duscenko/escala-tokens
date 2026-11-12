// Escala component: Switch — the Figma `Switch` set (design-plans/switch-contract.md), 1:1:
// Size xs · sm · default × State × Checked × Thumb short · long, plus the IoVisible and
// ThumbIconVisible booleans. Behaviour from Radix Switch (`role="switch"`). The bare control: name it
// with SwitchGroup, a Label or a Field. Appearance: recipe (Switch); the thumb's travel is the
// recipe's `--escala-travel`.
import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { Spinner } from './spinner'

export const SWITCH_SIZES = ['xs', 'sm', 'default'] as const
export type SwitchSize = (typeof SWITCH_SIZES)[number]
export const SWITCH_STATES = ['Default', 'Hover', 'Focused', 'Disabled'] as const
export type SwitchState = (typeof SWITCH_STATES)[number]
export const SWITCH_THUMBS = ['short', 'long'] as const
export type SwitchThumb = (typeof SWITCH_THUMBS)[number]

const CHECK = 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z'
const CLOSE = 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'

// The I / O marks sit at absolute positions the file hand-sets per Size · Thumb · Checked (x, y in the
// track; no variable): a ring 6 · 6 · 8 (off) or a bar 2 wide, 8 · 8 · 10 tall (on).
const IO_AT: Record<SwitchSize, Record<SwitchThumb, { off: [number, number]; on: [number, number] }>> = {
  xs: { short: { off: [17, 5], on: [7, 4] }, long: { off: [23, 5], on: [9, 4] } },
  sm: { short: { off: [22, 6], on: [9, 5] }, long: { off: [28, 6], on: [11, 5] } },
  default: { short: { off: [27, 7], on: [11, 6] }, long: { off: [35, 7], on: [15, 6] } },
}
const IO_SIZE: Record<SwitchSize, { ring: number; bar: number }> = { xs: { ring: 6, bar: 8 }, sm: { ring: 6, bar: 8 }, default: { ring: 8, bar: 10 } }

export interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  /** Figma Size: track 16 · 16 · 20 high (Size/selector-sm · sm · md). */
  size?: SwitchSize
  /** Figma Thumb: a round thumb (short) or a pill one (long). */
  thumb?: SwitchThumb
  /** Figma IoVisible: the I / O marks. */
  ioVisible?: boolean
  /** Figma ThumbIconVisible: a check / close glyph on the thumb. */
  thumbIconVisible?: boolean
  /** Pin a State without a pointer (docs playground, Figma parity). */
  forceState?: SwitchState
}

function Switch({
  className, size = 'default', thumb = 'short', ioVisible = false, thumbIconVisible = false, forceState,
  checked, defaultChecked, disabled, onCheckedChange, ...props
}: SwitchProps) {
  const [inner, setInner] = React.useState(defaultChecked ?? false)
  const on = checked ?? inner
  const isDisabled = disabled || forceState === 'Disabled'
  const pinned = forceState && forceState !== 'Default' ? forceState : isDisabled ? 'Disabled' : undefined
  const io = IO_AT[size][thumb][on ? 'on' : 'off']
  const mark = IO_SIZE[size]
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-escala="Switch"
      data-size={size}
      data-thumb={thumb}
      data-checked={on ? 'true' : 'false'}
      data-force-state={pinned}
      aria-disabled={isDisabled || undefined}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={isDisabled}
      onCheckedChange={(v) => { setInner(v); onCheckedChange?.(v) }}
      className={cn('peer group/switch relative inline-flex shrink-0 items-center border-0 outline-none disabled:cursor-not-allowed', className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        data-part="Switch.thumb"
        className="pointer-events-none flex shrink-0 translate-x-0 items-center justify-center data-[state=checked]:translate-x-[var(--escala-travel)]"
      >
        {thumbIconVisible && (
          <span data-part="Switch.thumbIcon" className="inline-flex" aria-hidden>
            <svg viewBox="0 0 256 256" fill="currentColor" className="size-full" focusable="false"><path d={on ? CHECK : CLOSE} /></svg>
          </span>
        )}
      </SwitchPrimitive.Thumb>
      {ioVisible && (
        <span
          data-part="Switch.io"
          aria-hidden
          className="pointer-events-none absolute inline-flex"
          style={{ left: io[0], top: io[1] }}
        >
          {on ? (
            <svg width={2} height={mark.bar} viewBox={`0 0 2 ${mark.bar}`} fill="currentColor"><rect width={2} height={mark.bar} /></svg>
          ) : (
            <svg width={mark.ring} height={mark.ring} viewBox={`0 0 ${mark.ring} ${mark.ring}`} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx={mark.ring / 2} cy={mark.ring / 2} r={(mark.ring - 1.5) / 2} />
            </svg>
          )}
        </span>
      )}
    </SwitchPrimitive.Root>
  )
}

export { Switch }

// SwitchGroup — the Figma `SwitchGroup` set (design-plans/switch-group-contract.md): a Switch beside
// a label, an optional description and an optional footer (helper, or the error when Invalid). The
// whole row is a <label>; Loading swaps the switch for a spinner.
export const SWITCH_GROUP_STATES = ['Default', 'Disabled', 'Invalid', 'Loading'] as const
export type SwitchGroupState = (typeof SWITCH_GROUP_STATES)[number]
export const SWITCH_GROUP_PLACEMENTS = ['left', 'right'] as const
export type SwitchGroupPlacement = (typeof SWITCH_GROUP_PLACEMENTS)[number]

export interface SwitchGroupProps extends Omit<SwitchProps, 'forceState' | 'children'> {
  /** Figma Label. */
  label?: React.ReactNode
  /** Figma Description (DescriptionVisible when given). */
  description?: React.ReactNode
  /** Figma Footer (FooterVisible when given): helper text, or the error when invalid. */
  footer?: React.ReactNode
  /** Figma Placement: the switch before (left) or after (right) the text. */
  placement?: SwitchGroupPlacement
  invalid?: boolean
  loading?: boolean
  /** Pin a State (docs). */
  forceState?: SwitchGroupState
  rowClassName?: string
  rowStyle?: React.CSSProperties
}

function SwitchGroup({
  label = 'Email notifications', description, footer, placement = 'left', size = 'default', invalid, loading, disabled,
  forceState, rowClassName, rowStyle, id, ...props
}: SwitchGroupProps) {
  const auto = React.useId()
  const switchId = id ?? auto
  const state: SwitchGroupState = forceState ?? (loading ? 'Loading' : disabled ? 'Disabled' : invalid ? 'Invalid' : 'Default')
  const describedBy = [description != null ? `${switchId}-description` : null, footer != null ? `${switchId}-footer` : null].filter(Boolean).join(' ') || undefined
  const control = (
    <span data-part="SwitchGroup.control" className="inline-flex shrink-0 items-start">
      {state === 'Loading' ? (
        <Spinner data-part="SwitchGroup.spinner" aria-label="Loading" />
      ) : (
        <Switch
          id={switchId}
          size={size}
          disabled={disabled || state === 'Disabled'}
          aria-invalid={state === 'Invalid' || undefined}
          aria-describedby={describedBy}
          {...props}
        />
      )}
    </span>
  )
  return (
    <label
      htmlFor={switchId}
      data-slot="switch-group"
      data-escala="SwitchGroup"
      data-size={size}
      data-placement={placement}
      data-force-state={state === 'Default' ? undefined : state}
      className={cn('flex max-w-full items-start', state === 'Disabled' ? 'cursor-not-allowed' : 'cursor-pointer', rowClassName)}
      style={rowStyle}
    >
      {placement === 'left' && control}
      <span data-part="SwitchGroup.content" className="flex min-w-0 flex-1 flex-col">
        <span data-part="SwitchGroup.label">{label}</span>
        {description != null && <span data-part="SwitchGroup.description" id={`${switchId}-description`}>{description}</span>}
        {footer != null && <span data-part="SwitchGroup.footer" id={`${switchId}-footer`}>{footer}</span>}
      </span>
      {placement === 'right' && control}
    </label>
  )
}

export { SwitchGroup }
