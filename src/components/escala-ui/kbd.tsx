// Skeleton: shadcn/ui `bases/radix/ui/kbd.tsx` (MIT, see LICENSE-shadcn.md):
// a key cap, and a group that spaces several. Appearance: recipe (Kbd).
import * as React from 'react'
import { cn } from '../../lib/utils'

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      data-escala="Kbd"
      className={cn('pointer-events-none inline-flex w-fit select-none items-center justify-center', className)}
      {...props}
    />
  )
}

/** Several keys, one shortcut (`⌘` `K`). Spacing only: each key paints itself. */
function KbdGroup({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd data-slot="kbd-group" className={cn('inline-flex items-center gap-1', className)} {...props} />
}

export { Kbd, KbdGroup }
