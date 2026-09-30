import { forwardRef, type ComponentPropsWithoutRef } from 'react'

import { cn } from '../../lib/utils'
import { RainbowButton } from './rainbow-button'

export interface ColorAgentButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Elevated chrome while the Color Agent panel is open. */
  active?: boolean
  asChild?: boolean
  /** Nested in the Color Agent name field — 1px rainbow, radius concentric with the parent. */
  nested?: boolean
}

/** Color Agent trigger — Magic UI rainbow chrome. Standalone is a 36×36 squircle. */
export const ColorAgentButton = forwardRef<HTMLButtonElement, ColorAgentButtonProps>(
  function ColorAgentButton({
    active = false,
    className,
    children,
    type = 'button',
    asChild = false,
    nested = false,
    ...props
  }, ref) {
    return (
      <RainbowButton
        ref={ref}
        type={type}
        size="icon"
        asChild={asChild}
        aria-pressed={active}
        className={cn(
          'relative z-10',
          nested
            ? 'rounded-[calc(0.5rem-5px)] ![border:1px_solid_transparent] before:hidden'
            : 'rounded-[13px]',
          active && !nested && 'ring-1 ring-fg/20',
          className,
        )}
        {...props}
      >
        {children}
      </RainbowButton>
    )
  },
)
