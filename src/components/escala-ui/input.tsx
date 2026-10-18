// Skeleton: shadcn/ui `bases/radix/ui/input.tsx` (MIT, see LICENSE-shadcn.md):
// the bare control — the box IS the <input>. Label and hint come from `Field`,
// icons and add-ons from `InputGroup`, as in shadcn. Appearance: recipe (Input).
import * as React from 'react'
import { cn } from '../../lib/utils'

export type InputState = 'Default' | 'Hover' | 'Focused' | 'Error' | 'Disabled'

export interface InputProps extends React.ComponentProps<'input'> {
  /** Escala: pin a state without a pointer (docs playground, Figma parity). */
  forceState?: InputState
}

function Input({ className, type, forceState, disabled, ...props }: InputProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <input
      type={type}
      data-slot="input"
      data-escala="Input"
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      aria-invalid={forceState === 'Error' ? true : props['aria-invalid']}
      disabled={isDisabled}
      className={cn(
        'w-full min-w-0 outline-none transition-[border-color,box-shadow] duration-150',
        'file:inline-flex file:border-0 file:bg-transparent disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
