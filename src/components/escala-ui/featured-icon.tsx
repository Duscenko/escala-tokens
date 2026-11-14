// Escala component: FeaturedIcon — the Figma set of the same name (design-plans/featured-icon-contract.md,
// 1119:10857), 1:1. A decorative glyph (default: Phosphor `lightning`, regular = the file's Outline) centred
// in a tinted or solid shape. aria-hidden; the title beside it carries the meaning. Appearance: recipe.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const FEATURED_ICON_SIZES = ['default', 'sm', 'lg', 'xl'] as const
export type FeaturedIconSize = (typeof FEATURED_ICON_SIZES)[number]
export const FEATURED_ICON_VARIANTS = ['default', 'secondary', 'critical', 'success', 'warning', 'info'] as const
export type FeaturedIconVariant = (typeof FEATURED_ICON_VARIANTS)[number]
export const FEATURED_ICON_APPEARANCES = ['soft', 'solid'] as const
export type FeaturedIconAppearance = (typeof FEATURED_ICON_APPEARANCES)[number]
export const FEATURED_ICON_SHAPES = ['circle', 'rounded'] as const
export type FeaturedIconShape = (typeof FEATURED_ICON_SHAPES)[number]


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
        {icon ?? glyph('lightning')}
      </span>
    </span>
  )
}

export { FeaturedIcon }
