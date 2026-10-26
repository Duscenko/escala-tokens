// Skeleton: shadcn/ui `bases/radix/ui/button.tsx` (MIT, see LICENSE-shadcn.md).
// Same variants, same values, same data attributes as shadcn. Appearance:
// lib/componentRecipes.ts → lib/recipeStyles.ts (the `cn-button-*` sheet's
// place), which reads `data-variant` / `data-size`. No colour here.
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

export const BUTTON_VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const
export const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]
export type ButtonSize = (typeof BUTTON_SIZES)[number]
export type ButtonState = 'Default' | 'Hover' | 'Pressed' | 'Focused' | 'Loading' | 'Disabled'

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
  /** Escala: pin a state without a pointer (docs playground, Figma parity). */
  forceState?: ButtonState
  /** Escala: replaces the content's leading icon with a spinner, sets aria-busy. */
  loading?: boolean
  /** Escala: paint from another recipe (a composite built on this skeleton). */
  recipe?: string
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  forceState,
  loading = false,
  disabled,
  recipe = 'Button',
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : loading ? 'Loading' : undefined

  return (
    <Comp
      data-slot="button"
      data-escala={recipe}
      data-variant={variant}
      data-size={size}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      aria-busy={state === 'Loading' || undefined}
      disabled={asChild ? undefined : disabled}
      className={cn(
        'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none',
        '',
        'aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variant === 'link' && 'underline-offset-4 hover:underline',
        className,
      )}
      {...props}
    />
  )
}

export { Button }
