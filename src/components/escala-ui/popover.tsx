// Escala component: Popover and PopoverFooter — the Figma sets of the same names (design-plans/popover-contract.md; Popover 973:364,
// PopoverFooter 972:279), 1:1. Radix Popover gives the behaviour (non-modal, Escape / outside click close, focus returns to the trigger).
// The content is a transparent wrapper holding the 8px arrow frame and the `panel`; Side is the edge it opens from.
// Appearance: recipes Popover and PopoverFooter (lib/componentRecipes.ts). Portals into the theme scope; `inline` draws it in place.
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { CloseButton } from './close-button'
import { usePortalContainer } from './portal-scope'

export const POPOVER_SIZES = ['default', 'sm', 'lg'] as const
export type PopoverSize = (typeof POPOVER_SIZES)[number]
export const POPOVER_SIDES = ['bottom', 'top', 'left', 'right'] as const
export type PopoverSide = (typeof POPOVER_SIDES)[number]
export const POPOVER_FOOTER_LAYOUTS = ['inline', 'stacked'] as const
export type PopoverFooterLayout = (typeof POPOVER_FOOTER_LAYOUTS)[number]

const PopoverContext = React.createContext<{ size: PopoverSize } | null>(null)

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverClose = PopoverPrimitive.Close

export interface PopoverContentProps extends Omit<React.ComponentProps<typeof PopoverPrimitive.Content>, 'title' | 'side'> {
  /** Figma Size: 320 · 256 · 360 wide. */
  size?: PopoverSize
  /** Figma Side: the trigger edge it opens from (where the arrow sits). */
  side?: PopoverSide
  /** Figma ArrowVisible. */
  arrow?: boolean
  /** Figma CloseVisible. */
  showCloseButton?: boolean
  closeIcon?: React.ReactNode
  closeLabel?: string
  /** Figma MediaVisible / Media: a picture above the text. */
  media?: React.ReactNode
  /** Figma Title. */
  title?: React.ReactNode
  /** Figma DescriptionVisible / Description. */
  descriptionVisible?: boolean
  description?: React.ReactNode
  /** Figma FooterVisible: a PopoverFooter under the body. */
  footer?: React.ReactNode
  /** Render in place (no portal, no positioning, no focus steal): docs and previews. */
  inline?: boolean
}

// The arrow is 16×9 (9×16 sideways): a triangle whose two slanted edges are drawn with Border/default over a Surface/layer-2 fill.
// The file puts it 1px into the panel's edge (the panel paints over it for bottom / right, the arrow over the panel for top / left).
const ARROW: Record<PopoverSide, { w: number; h: number; d: string; frame: string; shape: string }> = {
  bottom: { w: 16, h: 9, d: 'M0 9 L8 0 L16 9', frame: 'h-2 w-full', shape: 'top-0 left-1/2 -translate-x-1/2' },
  top: { w: 16, h: 9, d: 'M0 0 L8 9 L16 0', frame: 'h-2 w-full', shape: 'top-[-1px] left-1/2 -translate-x-1/2' },
  left: { w: 9, h: 16, d: 'M0 0 L9 8 L0 16', frame: 'w-2 self-stretch', shape: 'left-[-1px] top-1/2 -translate-y-1/2' },
  right: { w: 9, h: 16, d: 'M9 0 L0 8 L9 16', frame: 'w-2 self-stretch', shape: 'left-0 top-1/2 -translate-y-1/2' },
}

function PopoverContent({
  size = 'default', side = 'bottom', arrow = true, showCloseButton = false, closeIcon, closeLabel = 'Close', media, title, descriptionVisible = true,
  description, footer, inline = false, className, children, align = 'center', sideOffset = 0, ...props
}: PopoverContentProps) {
  const container = usePortalContainer()
  const a = ARROW[side]
  const sideways = side === 'left' || side === 'right'
  const body = (
    <PopoverContext.Provider value={{ size }}>
      {arrow && (
        <div data-part="Popover.arrowFrame" aria-hidden className={cn('relative shrink-0', a.frame, (side === 'top' || side === 'left') && 'z-[1]')}>
          <svg data-part="Popover.arrow" width={a.w} height={a.h} viewBox={`0 0 ${a.w} ${a.h}`} className={cn('absolute overflow-visible', a.shape)} style={{ fill: 'var(--escala-paint)', stroke: 'currentColor' }}>
            <path d={a.d} strokeWidth="1" />
          </svg>
        </div>
      )}
      <div data-part="Popover.panel" className="relative flex flex-col overflow-hidden text-left">
        {media != null && <div data-part="Popover.media" className="shrink-0 overflow-hidden">{media}</div>}
        <div data-part="Popover.body" className="flex flex-col">
          {(title != null || description != null) && (
            <div data-part="Popover.header" className="flex flex-col">
              {title != null && <div data-part="Popover.title" className="m-0">{title}</div>}
              {descriptionVisible && description != null && <div data-part="Popover.description" className="m-0">{description}</div>}
            </div>
          )}
          {children != null && <div data-part="Popover.content" className="flex flex-col">{children}</div>}
        </div>
        {footer}
        {showCloseButton && (
          <PopoverPrimitive.Close asChild>
            <CloseButton
              data-part="Popover.close"
              appearance="ghost"
              shape="pill"
              size={size === 'lg' ? 'sm' : 'xs'}
              icon={closeIcon}
              aria-label={closeLabel}
              // 8 (12 at lg) from the panel's outer edge: the border takes 1px of it.
              className={cn('absolute', size === 'lg' ? 'top-[calc(var(--spacing-inset-control)-1px)] right-[calc(var(--spacing-inset-control)-1px)]' : 'top-[calc(var(--spacing-gap-control)-1px)] right-[calc(var(--spacing-gap-control)-1px)]')}
            />
          </PopoverPrimitive.Close>
        )}
      </div>
    </PopoverContext.Provider>
  )
  // bottom: arrow above the panel; top: below; right: before; left: after (DOM order is always arrow, panel).
  const flow = side === 'bottom' ? 'flex-col' : side === 'top' ? 'flex-col-reverse' : side === 'right' ? 'flex-row' : 'flex-row-reverse'
  if (inline) {
    return (
      <div data-slot="popover-content" data-escala="Popover" data-size={size} data-side={side} className={cn('relative flex w-fit', flow, className)} {...(props as React.ComponentProps<'div'>)}>
        {body}
      </div>
    )
  }
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-escala="Popover"
        data-size={size}
        side={side}
        sideOffset={sideOffset}
        align={align}
        className={cn('z-50 flex w-fit outline-none', sideways ? 'flex-row' : '', flow, className)}
        {...props}
      >
        {body}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="popover-title" data-part="Popover.title" className={className} {...props} />
}

function PopoverDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="popover-description" data-part="Popover.description" className={className} {...props} />
}

export interface PopoverFooterProps extends React.ComponentProps<'div'> {
  /** Figma Size (it follows the Popover it sits in). */
  size?: PopoverSize
  /** Figma Layout. */
  layout?: PopoverFooterLayout
  /** Figma LeadingVisible / Leading (status text; it fills the row). */
  leadingVisible?: boolean
  leading?: React.ReactNode
}

/** Figma PopoverFooter. `children` is the Actions slot. */
function PopoverFooter({ size, layout = 'inline', leadingVisible = true, leading, className, children, ...props }: PopoverFooterProps) {
  const ctx = React.useContext(PopoverContext)
  const sz = size ?? ctx?.size ?? 'default'
  const stacked = layout === 'stacked'
  return (
    <div
      data-slot="popover-footer"
      data-escala="PopoverFooter"
      data-size={sz}
      data-layout={layout}
      // The file's top hairline is drawn inside the 8px padding (the footer is 48 = 8 + 32 + 8): the border takes 1px of it.
      className={cn('flex w-full !pt-[calc(var(--spacing-gap-control)-var(--stroke-divider,1px))]', stacked ? 'flex-col' : 'flex-row items-center', className)}
      {...props}
    >
      {leadingVisible && <div data-part="PopoverFooter.leading" className={cn('flex min-w-0 items-center', !stacked && 'flex-1')}>{leading}</div>}
      <div data-part="PopoverFooter.actions" className={cn('flex', stacked ? 'w-full flex-col [&>*]:w-full' : 'shrink-0 flex-row items-center')}>{children}</div>
    </div>
  )
}

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverDescription, PopoverFooter, PopoverTitle, PopoverTrigger }
