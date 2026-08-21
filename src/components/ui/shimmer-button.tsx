import { forwardRef, type ComponentPropsWithoutRef } from 'react'

import { cn } from '../../lib/utils'
import { RainbowButton } from './rainbow-button'

export interface ColorAgentButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Elevated chrome while the Color Agent panel is open. */
  active?: boolean
}

/** Color Agent trigger — Magic UI rainbow chrome, 36×36 squircle. */
export const ColorAgentButton = forwardRef<HTMLButtonElement, ColorAgentButtonProps>(
  function ColorAgentButton({ active = false, className, children, type = 'button', ...props }, ref) {
    return (
      <RainbowButton
        ref={ref}
        type={type}
        size="icon"
        aria-pressed={active}
        className={cn('relative z-10 rounded-[13px]', active && 'ring-1 ring-fg/20', className)}
        {...props}
      >
        {children}
      </RainbowButton>
    )
  },
)
