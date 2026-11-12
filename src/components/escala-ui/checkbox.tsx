// Escala component: Checkbox — the Figma `Checkbox` set (design-plans/checkbox-contract.md), 1:1:
// Size xs · sm · default × Checked false · true · indeterminate × State × Variant default ·
// secondary · critical · success · info · inverse. Behaviour from Radix Checkbox (a button with
// `role="checkbox"`, tri-state). The bare box: label it with CheckboxItem, Label or a Field.
// Appearance: recipe (Checkbox), which reads `data-size`, `data-checked`, `data-variant` and the State.
import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const CHECKBOX_SIZES = ['xs', 'sm', 'default'] as const
export type CheckboxSize = (typeof CHECKBOX_SIZES)[number]
export const CHECKBOX_STATES = ['Default', 'Hover', 'Focused', 'Disabled', 'Invalid'] as const
export type CheckboxState = (typeof CHECKBOX_STATES)[number]
export const CHECKBOX_VARIANTS = ['default', 'secondary', 'critical', 'success', 'info', 'inverse'] as const
export type CheckboxVariant = (typeof CHECKBOX_VARIANTS)[number]
export type CheckboxChecked = boolean | 'indeterminate'

const CHECK = 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z'
const MINUS = 'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z'

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
        {icon ?? (
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false"><path d={on === 'indeterminate' ? MINUS : CHECK} /></svg>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
