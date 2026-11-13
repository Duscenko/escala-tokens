// Escala component: IconButton — the Figma `IconButton` set. A square at the Button
// heights with one icon and no visible label, on the same Variant × Appearance
// grammar (design-plans/button-contract.md). Appearance from the IconButton recipe.
import * as React from 'react'
import { Button, type ButtonAppearance, type ButtonIntent, type ButtonProps, type ButtonSizeStep } from './button'

export interface IconButtonProps extends Omit<ButtonProps, 'leading' | 'trailing' | 'children' | 'variant' | 'appearance' | 'size'> {
  /** The glyph (Figma Icon). */
  icon: React.ReactNode
  /** Required: there is no visible text, so this is the accessible name. */
  'aria-label': string
  variant?: ButtonIntent
  appearance?: ButtonAppearance
  size?: ButtonSizeStep
  /** A count or dot on the top-right corner (Figma BadgeVisible). */
  badge?: React.ReactNode
}

function IconButton({ icon, badge, variant = 'default', appearance = 'solid', size = 'default', className, ...props }: IconButtonProps) {
  return (
    <Button
      {...props}
      recipe="IconButton"
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      variant={variant}
      appearance={appearance}
      size={size}
      data-slot="icon-button"
      className={badge ? ['relative', className].filter(Boolean).join(' ') : className}
      // The icon slot is the file's `icon` frame (Size/icon-sm · sm · md · lg per Size):
      // whatever glyph arrives fills it, so an unsized SVG cannot fill the whole button.
      leading={<span data-part="IconButton.icon" className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{icon}</span>}
    >
      {badge ? (
        <span data-part="IconButton.badge" className="absolute -top-1 -right-1">
          {badge}
        </span>
      ) : null}
    </Button>
  )
}

export { IconButton }
