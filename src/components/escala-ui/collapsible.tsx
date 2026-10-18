// Skeleton: shadcn/ui `bases/radix/ui/collapsible.tsx` (MIT, see LICENSE-shadcn.md):
// the Radix Collapsible. shadcn ships it unstyled; Escala's recipe paints the
// trigger row and the items its demo shows. Appearance: recipe (Collapsible).
import * as React from 'react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function Collapsible({ className, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" data-escala="Collapsible" className={cn('flex flex-col', className)} {...props} />
}

function CollapsibleTrigger({
  className, children, icon = '⌄', ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger> & { icon?: React.ReactNode }) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      data-part="Collapsible.trigger"
      className={cn(
        'flex w-full cursor-pointer items-center justify-between border-0 bg-transparent text-left outline-none',
        '[&[data-state=open]_[data-part="Collapsible.icon"]]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <span data-part="Collapsible.icon" className="inline-flex shrink-0 items-center justify-center transition-transform duration-200">{icon}</span>
    </CollapsiblePrimitive.CollapsibleTrigger>
  )
}

function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" data-part="Collapsible.content" className={cn('flex flex-col', className)} {...props} />
}

/** A row inside the content (shadcn's demo draws them by hand). */
function CollapsibleItem({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-part="Collapsible.item" className={className} {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleItem }
