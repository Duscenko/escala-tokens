// Escala component: sizes a glyph by the system's icon roles (small · medium ·
// large). The glyph itself is a child — the product's icon set. Appearance: recipe (Icon).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface IconProps extends React.ComponentProps<'span'> {
  size?: 'sm' | 'default' | 'lg'
  /** Only for a meaningful standalone icon; omit when decorative. */
  label?: string
}

function Icon({ size = 'default', label, className, children, ...props }: IconProps) {
  return (
    <span
      data-slot="icon"
      data-escala="Icon"
      data-size={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0 items-center justify-center [&_svg]:h-full [&_svg]:w-full', className)}
      {...props}
    >
      {children}
    </span>
  )
}

export { Icon }
