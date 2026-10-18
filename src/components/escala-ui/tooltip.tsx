// Skeleton: shadcn/ui `bases/radix/ui/tooltip.tsx` (MIT, see LICENSE-shadcn.md).
// An "info" tooltip is this Tooltip on a ghost icon Button, as in shadcn. The
// bubble portals into the theme scope; `inline` draws it in place (docs, previews).
// Appearance: recipe (Tooltip).
import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const arrowStyle: React.CSSProperties = { fill: 'var(--escala-paint)' }

export interface TooltipContentProps extends React.ComponentProps<typeof TooltipPrimitive.Content> {
  /** Draw in place with its arrow, no portal and no positioning. */
  inline?: boolean
}

function TooltipContent({ inline, sideOffset = 6, className, children, ...props }: TooltipContentProps) {
  const container = usePortalContainer()
  const arrow = 'Tooltip.arrow'
  if (inline) {
    return (
      <div
        role="tooltip"
        data-slot="tooltip-content"
        data-escala="Tooltip"
        className={cn('relative inline-block', className)}
      >
        {children}
        <svg data-part={arrow} width="10" height="5" viewBox="0 0 10 5" aria-hidden className="absolute top-full left-1/2 -translate-x-1/2" style={arrowStyle}>
          <polygon points="0,0 10,0 5,5" />
        </svg>
      </div>
    )
  }
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        data-escala="Tooltip"
        sideOffset={sideOffset}
        className={cn('z-50 w-fit', className)}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow data-part={arrow} width={10} height={5} style={arrowStyle} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
