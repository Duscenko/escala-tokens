// Skeleton: shadcn/ui `bases/radix/ui/scroll-area.tsx` (MIT, see LICENSE-shadcn.md).
// Appearance: recipe (ScrollArea).
import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" data-escala="ScrollArea" className={cn('relative overflow-hidden', className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        data-part="ScrollArea.scrollbar"
        className="flex touch-none p-px transition-colors select-none"
      >
        <ScrollAreaPrimitive.Thumb data-part="ScrollArea.thumb" className="relative flex-1" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}

/** A list row inside the viewport. */
function ScrollAreaRow({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-part="ScrollArea.row" className={cn('block', className)} {...props} />
}

export { ScrollArea, ScrollAreaRow }
