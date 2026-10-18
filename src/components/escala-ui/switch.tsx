// Skeleton: shadcn/ui `bases/radix/ui/switch.tsx` (MIT, see LICENSE-shadcn.md):
// Root + Thumb, `size` default | sm, no label (use `Label` / `Field`). The
// thumb's travel is the recipe's `--escala-travel`. Appearance: recipe (Switch).
import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const SWITCH_SIZES = ['default', 'sm'] as const
export type SwitchSize = (typeof SWITCH_SIZES)[number]

export interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  size?: SwitchSize
  /** Escala: pin a state without a pointer (docs playground, Figma parity). */
  forceState?: 'Default' | 'Hover' | 'Focused' | 'Disabled'
}

function Switch({
  className, size = 'default', forceState, checked, defaultChecked, disabled, onCheckedChange, ...props
}: SwitchProps) {
  const [inner, setInner] = React.useState(defaultChecked ?? false)
  const on = checked ?? inner
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-escala="Switch"
      data-size={size}
      data-checked={on ? 'True' : 'False'}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={isDisabled}
      onCheckedChange={(v) => { setInner(v); onCheckedChange?.(v) }}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center border-0 p-[var(--spacing-0_5)] outline-none',
        'transition-[background-color,box-shadow] duration-150 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        data-part="Switch.thumb"
        className="pointer-events-none block translate-x-0 transition-transform duration-150 data-[state=checked]:translate-x-[var(--escala-travel)]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
