// Escala component: FABButton — the Figma `FABButton` set. A floating action button:
// a leading icon and an optional label on a surface that lifts
// (design-plans/fab-button-contract.md): `appearance` solid · soft, `shape` rounded ·
// pill, `size` default · lg, `variant` inverse · default · secondary. Behaviour is a
// native <button>; appearance comes from the FABButton recipe
// (lib/recipes/actions.ts → lib/recipeStyles.ts), which reads `data-appearance`,
// `data-shape`, `data-size` and `data-variant`. No colour here. The width hugs its
// content and never goes below the height, so a FAB with no label is a square.
import * as React from 'react'
import { cn } from '../../lib/utils'

export const FAB_APPEARANCES = ['solid', 'soft'] as const
export const FAB_SHAPES = ['rounded', 'pill'] as const
export const FAB_SIZES = ['default', 'lg'] as const
export const FAB_VARIANTS = ['inverse', 'default', 'secondary'] as const
export type FABButtonAppearance = (typeof FAB_APPEARANCES)[number]
export type FABButtonShape = (typeof FAB_SHAPES)[number]
export type FABButtonSize = (typeof FAB_SIZES)[number]
export type FABButtonVariant = (typeof FAB_VARIANTS)[number]
export type FABButtonState = 'Default' | 'Hover' | 'Pressed' | 'Focused' | 'Disabled'

export interface FABButtonProps extends React.ComponentProps<'button'> {
  appearance?: FABButtonAppearance
  shape?: FABButtonShape
  size?: FABButtonSize
  /** `inverse` exists in `solid` only; with `soft` it paints the same. */
  variant?: FABButtonVariant
  /** Pin a state without a pointer (docs playground, Figma parity). */
  forceState?: FABButtonState
  /** The leading icon (Figma IconLeadingIcon). Defaults to Phosphor's plus. */
  icon?: React.ReactNode
}

/** Phosphor `plus` (regular) — the glyph the Figma file's FAB swaps in by default. */
function PlusGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
    </svg>
  )
}

/** The label is `children` (Figma Label + LabelVisible): with none it is an icon-only FAB
 *  and needs an `aria-label`. */
function FABButton({
  appearance = 'solid',
  shape = 'rounded',
  size = 'default',
  variant = 'default',
  forceState,
  icon,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: FABButtonProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  const hasLabel = children !== undefined && children !== null && children !== false && children !== ''
  return (
    <button
      type={type}
      data-slot="fab-button"
      data-escala="FABButton"
      data-appearance={appearance}
      data-shape={shape}
      data-size={size}
      data-variant={variant}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none',
        'aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      <span data-part="FABButton.icon" className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
        {icon ?? <PlusGlyph />}
      </span>
      {hasLabel ? <span data-part="FABButton.label">{children}</span> : null}
    </button>
  )
}

export { FABButton }
