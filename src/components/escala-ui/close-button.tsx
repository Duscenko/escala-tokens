// Escala component: CloseButton — the Figma `CloseButton` set. A dismiss control:
// one fixed glyph in a square, on its own grammar (design-plans/close-button-contract.md):
// `appearance` solid · outline · soft · ghost, `shape` rounded · pill · square,
// `size` sm · lg · xl · xs · default, `variant` default · inverse. Behaviour is a
// native <button>; appearance comes from the CloseButton recipe
// (lib/recipes/actions.ts → lib/recipeStyles.ts), which reads `data-appearance`,
// `data-shape`, `data-size` and `data-variant`. No colour here.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const CLOSE_BUTTON_APPEARANCES = ['solid', 'outline', 'soft', 'ghost'] as const
export const CLOSE_BUTTON_SHAPES = ['rounded', 'pill', 'square'] as const
export const CLOSE_BUTTON_SIZES = ['sm', 'lg', 'xl', 'xs', 'default'] as const
export const CLOSE_BUTTON_VARIANTS = ['default', 'inverse'] as const
export type CloseButtonAppearance = (typeof CLOSE_BUTTON_APPEARANCES)[number]
export type CloseButtonShape = (typeof CLOSE_BUTTON_SHAPES)[number]
export type CloseButtonSize = (typeof CLOSE_BUTTON_SIZES)[number]
export type CloseButtonVariant = (typeof CLOSE_BUTTON_VARIANTS)[number]
export type CloseButtonState = 'Default' | 'Hover' | 'Pressed' | 'Focused' | 'Disabled'

export interface CloseButtonProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  appearance?: CloseButtonAppearance
  shape?: CloseButtonShape
  size?: CloseButtonSize
  variant?: CloseButtonVariant
  /** Pin a state without a pointer (docs playground, Figma parity). */
  forceState?: CloseButtonState
  /** Another glyph, for a system on a different icon library. Defaults to Phosphor's X. */
  icon?: React.ReactNode
}

function CloseButton({
  appearance = 'soft',
  shape = 'pill',
  size = 'default',
  variant = 'default',
  forceState,
  icon,
  disabled,
  type = 'button',
  className,
  'aria-label': ariaLabel = 'Close',
  ...props
}: CloseButtonProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <button
      type={type}
      data-slot="close-button"
      data-escala="CloseButton"
      data-appearance={appearance}
      data-shape={shape}
      data-size={size}
      data-variant={variant}
      data-force-state={state}
      aria-label={ariaLabel}
      aria-disabled={isDisabled || undefined}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center outline-none select-none',
        'aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      <span data-part="CloseButton.icon" className="inline-flex items-center justify-center [&>svg]:size-full">
        {icon ?? glyph('close')}
      </span>
    </button>
  )
}

export { CloseButton }
