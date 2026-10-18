// Skeleton: shadcn/ui `bases/radix/ui/skeleton.tsx` (MIT, see LICENSE-shadcn.md):
// a block that pulses while its content loads. Appearance: recipe (Skeleton).
import * as React from 'react'
import { cn } from '../../lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" data-escala="Skeleton" className={cn('animate-pulse', className)} {...props} />
}

export { Skeleton }
