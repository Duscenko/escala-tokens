// Skeleton: shadcn/ui `bases/radix/ui/switch.tsx` (MIT, see LICENSE-shadcn.md).
// Catalogue key `Toggle`. The thumb's travel is the recipe's `--escala-travel`.
import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export interface SwitchProps extends Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, 'children'> {
  label?: React.ReactNode
  size?: 'md' | 'sm'
  forceState?: 'Default' | 'Hover' | 'Focused' | 'Disabled'
}

function Switch({
  label, size = 'md', forceState, className, checked, defaultChecked, disabled, onCheckedChange, ...props
}: SwitchProps) {
  const [inner, setInner] = React.useState(defaultChecked ?? false)
  const on = checked ?? inner
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <label
      data-slot="switch"
      data-escala="Toggle"
      data-on={on ? 'True' : 'False'}
      data-size={size === 'sm' ? 'SM' : 'MD'}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      className={cn('inline-flex cursor-pointer items-center aria-disabled:cursor-not-allowed', className)}
    >
      <SwitchPrimitive.Root
        data-part="Toggle.track"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={isDisabled}
        onCheckedChange={(v) => { setInner(v); onCheckedChange?.(v) }}
        className="inline-flex shrink-0 items-center border-0 p-[var(--spacing-0_5)] outline-none transition-[background-color,box-shadow] duration-150"
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-part="Toggle.thumb"
          className="block translate-x-0 transition-transform duration-150 data-[state=checked]:translate-x-[var(--escala-travel)]"
        />
      </SwitchPrimitive.Root>
      {label != null && <span data-part="Toggle.label">{label}</span>}
    </label>
  )
}

/** Settings rows: a label on the left, its switch on the right. */
function SwitchGroup({
  legend, className, children, ...props
}: React.ComponentProps<'div'> & { legend?: React.ReactNode }) {
  return (
    <div role="group" data-slot="switch-group" data-escala="SwitchGroup" className={cn('flex flex-col', className)} {...props}>
      {legend != null && <span data-part="SwitchGroup.legend">{legend}</span>}
      {children}
    </div>
  )
}

function SwitchGroupRow({
  label, className, children, ...props
}: React.ComponentProps<'div'> & { label?: React.ReactNode }) {
  return (
    <div data-part="SwitchGroup.row" className={cn('flex items-center justify-between', className)} {...props}>
      {label != null && <span data-part="SwitchGroup.rowLabel">{label}</span>}
      {children}
    </div>
  )
}

export { Switch, SwitchGroup, SwitchGroupRow }
