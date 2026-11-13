// Escala component: TooltipContent and TooltipInfoTrigger — the Figma sets of the same names (design-plans/tooltip-contract.md;
// TooltipContent 415:773, TooltipInfoTrigger 415:556), 1:1. Radix Tooltip gives the behaviour (delay, hover and focus, Escape, aria-describedby).
// A bubble (Radius/overlay, Shadow/md) and a 5px arrow frame on the edge opposite to Side; Variant is the tone. The info trigger is a round
// button holding the info glyph. The bubble portals into the theme scope; `inline` draws it in place (docs, previews).
// Appearance: recipes TooltipContent and TooltipInfoTrigger (lib/componentRecipes.ts).
import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

export const TOOLTIP_SIZES = ['default', 'sm', 'lg'] as const
export type TooltipSize = (typeof TOOLTIP_SIZES)[number]
export const TOOLTIP_SIDES = ['top', 'bottom', 'left', 'right'] as const
export type TooltipSide = (typeof TOOLTIP_SIDES)[number]
export const TOOLTIP_ALIGNS = ['start', 'center', 'end'] as const
export type TooltipAlign = (typeof TOOLTIP_ALIGNS)[number]
export const TOOLTIP_VARIANTS = ['default', 'secondary', 'inverse', 'critical', 'info'] as const
export type TooltipVariant = (typeof TOOLTIP_VARIANTS)[number]
export const TOOLTIP_TRIGGER_STATES = ['Default', 'Hover', 'Open', 'Focused'] as const
export type TooltipTriggerState = (typeof TOOLTIP_TRIGGER_STATES)[number]

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

// The 5px arrow (10×5, 5×10 sideways) in the bubble's colour; it sits in a frame on the edge opposite to Side.
const ARROW: Record<TooltipSide, { w: number; h: number; points: string }> = {
  top: { w: 10, h: 5, points: '0,0 10,0 5,5' },
  bottom: { w: 10, h: 5, points: '0,5 5,0 10,5' },
  left: { w: 5, h: 10, points: '0,0 5,5 0,10' },
  right: { w: 5, h: 10, points: '5,0 0,5 5,10' },
}

export interface TooltipContentProps extends Omit<React.ComponentProps<typeof TooltipPrimitive.Content>, 'title'> {
  /** Figma Size: padding and type (the width tops out at 200 · 240 · 280). */
  size?: TooltipSize
  /** Figma Variant: the tone. */
  variant?: TooltipVariant
  /** Figma TitleVisible / Title. */
  title?: React.ReactNode
  /** Figma ArrowVisible. */
  arrow?: boolean
  /** Draw in place with its arrow, no portal and no positioning. */
  inline?: boolean
}

/** Figma TooltipContent. `children` is the Text. `side` is the edge the bubble opens from; the arrow is on the opposite one. */
function TooltipContent({
  size = 'default', variant = 'default', title, arrow = true, inline = false, side = 'top', align = 'start', sideOffset = 0, className, children, ...props
}: TooltipContentProps) {
  const container = usePortalContainer()
  const sideways = side === 'left' || side === 'right'
  const a = ARROW[side as TooltipSide]
  const arrowFrame = arrow && (
    <div
      data-part="TooltipContent.arrowFrame"
      aria-hidden
      className={cn(
        'flex shrink-0 overflow-hidden',
        sideways ? 'w-[5px] flex-col self-stretch' : 'h-[5px] w-full flex-row',
        align === 'center' ? 'justify-center' : align === 'end' ? 'justify-end' : 'justify-start',
        sideways
          ? align === 'start' ? 'pt-[var(--radius-overlay)]' : align === 'end' ? 'pb-[var(--radius-overlay)]' : ''
          : align === 'start' ? 'pl-[var(--radius-overlay)]' : align === 'end' ? 'pr-[var(--radius-overlay)]' : '',
      )}
    >
      <svg data-part="TooltipContent.arrow" width={a.w} height={a.h} viewBox={`0 0 ${a.w} ${a.h}`} className="shrink-0" style={{ fill: 'var(--escala-paint)' }}>
        <polygon points={a.points} />
      </svg>
    </div>
  )
  const body = (
    <>
      {arrowFrame}
      <div
        data-part="TooltipContent.bubble"
        className="flex flex-col overflow-hidden text-left data-[size=sm]:max-w-[calc(var(--spacing-32)+var(--spacing-16)+var(--spacing-2))] data-[size=default]:max-w-[calc(var(--spacing-32)+var(--spacing-24)+var(--spacing-4))] data-[size=lg]:max-w-[calc(var(--spacing-32)+var(--spacing-32)+var(--spacing-6))]"
        data-size={size}
      >
        {title != null && <span data-part="TooltipContent.title">{title}</span>}
        <span data-part="TooltipContent.text">{children}</span>
      </div>
    </>
  )
  // The DOM order is always arrow, bubble: bottom and right show the arrow first, top and left reverse it.
  const flow = side === 'bottom' ? 'flex-col' : side === 'top' ? 'flex-col-reverse' : side === 'right' ? 'flex-row' : 'flex-row-reverse'
  if (inline) {
    return (
      <div role="tooltip" data-slot="tooltip-content" data-escala="TooltipContent" data-size={size} data-variant={variant} data-side={side} data-align={align} className={cn('relative inline-flex w-fit', flow, className)}>
        {body}
      </div>
    )
  }
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        data-escala="TooltipContent"
        data-size={size}
        data-variant={variant}
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn('z-50 flex w-fit', flow, className)}
        {...props}
      >
        {body}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export interface TooltipInfoTriggerProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  /** Figma Size: the glyph is 14 · 16 · 20. */
  size?: TooltipSize
  /** Figma Variant: the tone; it must match the bubble it opens. */
  variant?: TooltipVariant
  /** Pin a state without a pointer (docs, Figma parity). */
  forceState?: TooltipTriggerState
  /** Another glyph, for a system on a different icon library. Defaults to Phosphor's Info. */
  icon?: React.ReactNode
}

const INFO = 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z'

/** Figma TooltipInfoTrigger: the info-circle button that opens a tooltip. It needs an accessible name (`aria-label`). */
function TooltipInfoTrigger({
  size = 'default', variant = 'default', forceState, icon, type = 'button', className, ...props
}: TooltipInfoTriggerProps) {
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <button
      type={type}
      data-slot="tooltip-info-trigger"
      data-escala="TooltipInfoTrigger"
      data-size={size}
      data-variant={variant}
      data-force-state={state}
      className={cn('inline-flex shrink-0 items-center justify-center outline-none select-none', className)}
      {...props}
    >
      <span data-part="TooltipInfoTrigger.icon" data-open={(props as Record<string, unknown>)['data-state'] === 'open' ? '' : undefined} aria-hidden className="inline-flex items-center justify-center [&>svg]:size-full">
        {icon ?? <svg viewBox="0 0 256 256" fill="currentColor" focusable="false"><path d={INFO} /></svg>}
      </span>
    </button>
  )
}

export { Tooltip, TooltipContent, TooltipInfoTrigger, TooltipProvider, TooltipTrigger }
