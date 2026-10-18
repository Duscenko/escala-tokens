// Skeleton: shadcn/ui `bases/radix/ui/toggle.tsx` (MIT, see LICENSE-shadcn.md):
// the Radix Toggle, `variant` default | outline × `size` default | sm | lg.
// Escala mirrors the pressed state as `data-pressed` True/False (the recipe's
// Pressed axis, a Figma property). Appearance: recipe (Toggle).
import * as React from 'react'
import { Toggle as TogglePrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const TOGGLE_VARIANTS = ['default', 'outline'] as const
export const TOGGLE_SIZES = ['default', 'sm', 'lg'] as const
export type ToggleVariant = (typeof TOGGLE_VARIANTS)[number]
export type ToggleSize = (typeof TOGGLE_SIZES)[number]

type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> & { variant?: ToggleVariant; size?: ToggleSize }

function Toggle({ className, variant = 'default', size = 'default', pressed, defaultPressed = false, onPressedChange, ...props }: ToggleProps) {
  const [inner, setInner] = React.useState(defaultPressed)
  const on = pressed ?? inner
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      data-escala="Toggle"
      data-variant={variant}
      data-size={size}
      data-pressed={on ? 'True' : 'False'}
      pressed={on}
      onPressedChange={(next) => { setInner(next); onPressedChange?.(next) }}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap outline-none transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Toggle }
