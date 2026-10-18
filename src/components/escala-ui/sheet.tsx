// Skeleton: shadcn/ui `bases/radix/ui/sheet.tsx` (MIT, see LICENSE-shadcn.md):
// a Dialog that slides in from a `side` (top | right | bottom | left), with
// shadcn's ghost icon-sm close. `inline` draws it in place (docs, previews).
// Appearance: recipe (Sheet, Button).
import * as React from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { usePortalContainer } from './portal-scope'

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return <SheetPrimitive.Overlay data-slot="sheet-overlay" data-part="Sheet.overlay" className={cn('fixed inset-0 z-50', className)} {...props} />
}

export type SheetSide = 'top' | 'right' | 'bottom' | 'left'

const SIDE: Record<SheetSide, string> = {
  right: 'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm',
  left: 'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm',
  top: 'inset-x-0 top-0 h-auto',
  bottom: 'inset-x-0 bottom-0 h-auto',
}

function SheetContent({
  className, children, side = 'right', showCloseButton = true, closeIcon, inline = false, ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide
  showCloseButton?: boolean
  /** The close glyph — icons are the system's, passed in. */
  closeIcon?: React.ReactNode
  inline?: boolean
}) {
  const container = usePortalContainer()
  const content = (
    <SheetPrimitive.Content
      data-slot="sheet-content"
      data-escala="Sheet"
      data-side={side}
      className={cn('relative flex flex-col outline-none', !inline && cn('fixed z-50', SIDE[side]), className)}
      onOpenAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      onCloseAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      {...props}
    >
      {children}
      {showCloseButton && (
        <SheetPrimitive.Close data-slot="sheet-close" asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3">
            {closeIcon ?? '×'}
            <span className="sr-only">Close</span>
          </Button>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  )
  if (inline) return content
  return (
    <SheetPrimitive.Portal container={container}>
      <SheetOverlay />
      {content}
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" data-part="Sheet.header" className={cn('flex flex-col', className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" data-part="Sheet.footer" className={cn('mt-auto flex flex-col', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" data-part="Sheet.title" className={cn('m-0', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" data-part="Sheet.description" className={cn('m-0', className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
