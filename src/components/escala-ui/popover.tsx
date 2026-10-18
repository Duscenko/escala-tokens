// Skeleton: shadcn/ui `bases/radix/ui/popover.tsx` (MIT, see LICENSE-shadcn.md).
// Portals into the theme scope; `inline` draws it in place (docs, previews).
// Appearance: recipe (Popover).
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

export interface PopoverContentProps extends React.ComponentProps<typeof PopoverPrimitive.Content> {
  inline?: boolean
}

function PopoverContent({ inline, sideOffset = 8, align = 'center', className, children, ...props }: PopoverContentProps) {
  const container = usePortalContainer()
  const arrow = (
    <svg data-part="Popover.arrow" width="12" height="6" viewBox="0 0 12 6" aria-hidden style={{ fill: 'var(--escala-paint)' }}>
      <polygon points="0,0 12,0 6,6" />
    </svg>
  )
  if (inline) {
    return (
      <div data-slot="popover-content" data-escala="Popover" className={cn('relative flex w-72 flex-col', className)}>
        {children}
        <span className="absolute top-full left-1/2 -translate-x-1/2">{arrow}</span>
      </div>
    )
  }
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-escala="Popover"
        sideOffset={sideOffset}
        align={align}
        className={cn('z-50 flex w-72 flex-col outline-none', className)}
        {...props}
      >
        {children}
        <PopoverPrimitive.Arrow asChild>{arrow}</PopoverPrimitive.Arrow>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="popover-title" data-part="Popover.title" className={className} {...props} />
}

function PopoverDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="popover-description" data-part="Popover.body" className={className} {...props} />
}

export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger }
