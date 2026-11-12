// Escala component: Input — the Figma `Input` set (design-plans/input-contract.md):
// the bare control — the box IS the <input>. A label and a hint are `Field`'s; icons,
// add-ons and the search Shortcut badge are `InputGroup`'s (the file draws them on
// the same component; the code keeps shadcn's split — see the contract). `State` is
// Figma's axis (`Invalid`, not `Error`); `Value` (placeholder · filled) needs no
// prop, the browser already paints `::placeholder` differently from a typed value.
// Appearance: the Input recipe (lib/recipes/forms.ts → lib/recipeStyles.ts), which
// reads `data-size` and `data-force-state`.
import * as React from 'react'
import { cn } from '../../lib/utils'

export type InputState = 'Default' | 'Hover' | 'Focused' | 'Invalid' | 'Disabled'
/** Escala's Size roles: compact 32 · control 40 · touch 48 (Button's ladder). */
export type InputSize = 'sm' | 'default' | 'lg'

// The native `size` attribute (a character count) gives way to the Size axis.
export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  size?: InputSize
  /** Pin a state without a pointer (docs playground, Figma parity). */
  forceState?: InputState
}

function Input({ className, type, size = 'default', forceState, disabled, ...props }: InputProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <input
      type={type}
      data-slot="input"
      data-escala="Input"
      data-size={size}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      aria-invalid={forceState === 'Invalid' ? true : props['aria-invalid']}
      disabled={isDisabled}
      className={cn(
        'w-full min-w-0 outline-none',
        'file:inline-flex file:border-0 file:bg-transparent disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
