// Escala component: FeaturedIcon — the Figma set of the same name (design-plans/featured-icon-contract.md,
// 1119:10857), 1:1. A decorative glyph (default: Phosphor `lightning`, regular = the file's Outline) centred
// in a tinted or solid shape. aria-hidden; the title beside it carries the meaning. Appearance: recipe.
import * as React from 'react'
import { cn } from '../../lib/utils'

export const FEATURED_ICON_SIZES = ['default', 'sm', 'lg', 'xl'] as const
export type FeaturedIconSize = (typeof FEATURED_ICON_SIZES)[number]
export const FEATURED_ICON_VARIANTS = ['default', 'secondary', 'critical', 'success', 'warning', 'info'] as const
export type FeaturedIconVariant = (typeof FEATURED_ICON_VARIANTS)[number]
export const FEATURED_ICON_APPEARANCES = ['soft', 'solid'] as const
export type FeaturedIconAppearance = (typeof FEATURED_ICON_APPEARANCES)[number]
export const FEATURED_ICON_SHAPES = ['circle', 'rounded'] as const
export type FeaturedIconShape = (typeof FEATURED_ICON_SHAPES)[number]

const LIGHTNING =
  'M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z'

export interface FeaturedIconProps extends React.ComponentProps<'span'> {
  /** Figma Size: 32 · 40 · 48 · 56. */
  size?: FeaturedIconSize
  /** Figma Variant. */
  variant?: FeaturedIconVariant
  /** Figma Appearance. */
  appearance?: FeaturedIconAppearance
  /** Figma Shape. */
  shape?: FeaturedIconShape
  /** Figma Icon (the swap). */
  icon?: React.ReactNode
}

function FeaturedIcon({ size = 'default', variant = 'default', appearance = 'soft', shape = 'circle', icon, className, ...props }: FeaturedIconProps) {
  return (
    <span
      aria-hidden
      data-slot="featured-icon"
      data-escala="FeaturedIcon"
      data-size={size}
      data-variant={variant}
      data-appearance={appearance}
      data-shape={shape}
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    >
      <span data-part="FeaturedIcon.icon" className="inline-flex items-center justify-center [&>svg]:size-full">
        {icon ?? <svg viewBox="0 0 256 256" fill="currentColor" focusable="false"><path d={LIGHTNING} /></svg>}
      </span>
    </span>
  )
}

export { FeaturedIcon }
