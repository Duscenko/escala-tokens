// Skeleton: shadcn/ui `bases/radix/ui/checkbox.tsx` (MIT, see LICENSE-shadcn.md),
// wrapped in its label the way shadcn's docs compose it. Appearance: recipe.
import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export interface CheckboxProps extends Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, 'children'> {
  label?: React.ReactNode
  size?: 'md' | 'sm'
  /** Pin a state without a pointer (docs playground). */
  forceState?: 'Default' | 'Hover' | 'Focused' | 'Disabled'
  /** The check glyph (bold weight reads best at this size). */
  icon?: React.ReactNode
}

function Checkbox({
  label, size = 'md', forceState, icon, className, checked, defaultChecked, disabled, onCheckedChange, ...props
}: CheckboxProps) {
  const [inner, setInner] = React.useState<boolean | 'indeterminate'>(defaultChecked ?? false)
  const on = checked ?? inner
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <label
      data-slot="checkbox"
      data-escala="Checkbox"
      data-checked={on ? 'True' : 'False'}
      data-size={size === 'sm' ? 'SM' : 'MD'}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      className={cn('inline-flex cursor-pointer items-center aria-disabled:cursor-not-allowed', className)}
    >
      <CheckboxPrimitive.Root
        data-part="Checkbox.box"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={isDisabled}
        onCheckedChange={(v) => { setInner(v); onCheckedChange?.(v) }}
        className="inline-flex shrink-0 items-center justify-center p-0 outline-none transition-[background-color,border-color,box-shadow] duration-150"
        {...props}
      >
        <CheckboxPrimitive.Indicator data-part="Checkbox.indicator" className="inline-flex items-center justify-center">
          {icon ?? '✓'}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label != null && <span data-part="Checkbox.label">{label}</span>}
    </label>
  )
}

/** A labelled set of checkboxes. */
function CheckboxGroup({
  legend, className, children, ...props
}: React.ComponentProps<'fieldset'> & { legend?: React.ReactNode }) {
  return (
    <fieldset data-slot="checkbox-group" data-escala="CheckboxGroup" className={cn('m-0 flex flex-col border-0 p-0', className)} {...props}>
      {legend != null && <legend data-part="CheckboxGroup.legend" className="p-0">{legend}</legend>}
      {children}
    </fieldset>
  )
}

export { Checkbox, CheckboxGroup }
