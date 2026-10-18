// shadcn/ui `separator.tsx` (MIT, see LICENSE-shadcn.md) — Escala's Divider.
// Radix's Separator writes a lowercase `data-orientation` that would shadow the
// recipe's axis attribute, so this is the same element without the primitive.
// Appearance: recipe (Divider).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SeparatorProps extends React.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical'
  /** A purely visual rule (default). Set false to expose role="separator". */
  decorative?: boolean
}

function Separator({ orientation = 'horizontal', decorative = true, className, ...props }: SeparatorProps) {
  return (
    <div
      data-slot="separator"
      data-escala="Divider"
      data-orientation={orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={cn('shrink-0', orientation === 'horizontal' ? 'w-full' : 'inline-block', className)}
      {...props}
    />
  )
}

export { Separator }
