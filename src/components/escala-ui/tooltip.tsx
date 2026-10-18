// Skeleton: shadcn/ui `bases/radix/ui/tooltip.tsx` (MIT, see LICENSE-shadcn.md),
// plus Escala's InfoTooltip (a label with an info glyph). The bubble portals into
// the theme scope; `inline` draws it in place (docs, previews).
// Appearance: recipes (Tooltip, InfoTooltip).
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
  /** `Tooltip` (default) or `InfoTooltip`'s bubble. */
  recipe?: 'Tooltip' | 'InfoTooltip'
}

function TooltipContent({ inline, recipe = 'Tooltip', sideOffset = 6, className, children, ...props }: TooltipContentProps) {
  const container = usePortalContainer()
  const part = recipe === 'InfoTooltip' ? 'InfoTooltip.tip' : undefined
  const arrow = recipe === 'InfoTooltip' ? 'InfoTooltip.arrow' : 'Tooltip.arrow'
  if (inline) {
    return (
      <div
        role="tooltip"
        data-slot="tooltip-content"
        data-escala={recipe === 'Tooltip' ? 'Tooltip' : undefined}
        data-part={part}
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
        data-escala={recipe === 'Tooltip' ? 'Tooltip' : undefined}
        data-part={part}
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

export interface InfoTooltipProps extends Omit<React.ComponentProps<'span'>, 'content'> {
  content: React.ReactNode
  /** The info glyph. */
  icon?: React.ReactNode
  /** Show the tip in place above the label (docs, previews). */
  inline?: boolean
}

/** A label with an info glyph that explains it on hover or focus. */
function InfoTooltip({ content, icon = 'ⓘ', inline, className, children, ...props }: InfoTooltipProps) {
  const label = (
    <span data-part="InfoTooltip.label" className="inline-flex items-center">
      {children}
      <TooltipPrimitive.Trigger asChild>
        <button type="button" aria-label="More information" data-part="InfoTooltip.icon" className="inline-flex cursor-help border-0 bg-transparent p-0 outline-none">{icon}</button>
      </TooltipPrimitive.Trigger>
    </span>
  )
  return (
    <span data-slot="info-tooltip" data-escala="InfoTooltip" className={cn('inline-flex flex-col items-center', className)} {...props}>
      {inline ? (
        <>
          <TooltipContent inline recipe="InfoTooltip">{content}</TooltipContent>
          <span data-part="InfoTooltip.label" className="inline-flex items-center">
            {children}
            <span data-part="InfoTooltip.icon" className="inline-flex">{icon}</span>
          </span>
        </>
      ) : (
        <TooltipPrimitive.Root>
          {label}
          <TooltipContent recipe="InfoTooltip">{content}</TooltipContent>
        </TooltipPrimitive.Root>
      )}
    </span>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, InfoTooltip }
