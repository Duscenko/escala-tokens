// Skeleton: shadcn/ui `bases/radix/ui/dialog.tsx` (MIT, see LICENSE-shadcn.md).
// Appearance: lib/componentRecipes.ts → lib/recipeStyles.ts (catalogue key
// `Modal`). No colour here.
import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      data-part="Modal.overlay"
      className={cn('fixed inset-0 isolate z-50', className)}
      {...props}
    />
  )
}

export interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean
  /** The close glyph — icons are the system's (Phosphor), passed in. */
  closeIcon?: React.ReactNode
  /**
   * Render in place: no portal, no overlay, no fixed positioning, no focus
   * steal. For docs and previews, where the dialog must stay inside the themed
   * card (a portal would paint it with the page's theme instead).
   */
  inline?: boolean
}

function DialogContent({
  className, children, showCloseButton = true, closeIcon, inline = false, ...props
}: DialogContentProps) {
  const content = (
    <DialogPrimitive.Content
      data-slot="dialog-content"
      data-escala="Modal"
      className={cn(
        'relative flex flex-col outline-none',
        !inline && 'fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
        className,
      )}
      onOpenAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      onCloseAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          data-slot="dialog-close"
          data-part="Modal.close"
          className="absolute inline-flex aspect-square cursor-pointer items-center justify-center border-0 bg-transparent p-0"
          style={{ top: 'var(--spacing-inset-surface)', right: 'var(--spacing-inset-surface)' }}
        >
          {closeIcon ?? '×'}
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  )
  if (inline) return content
  return (
    <DialogPortal>
      <DialogOverlay />
      {content}
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" data-part="Modal.header" className={cn('flex flex-col', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      data-part="Modal.footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" data-part="Modal.title" className={cn('m-0', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" data-part="Modal.description" className={cn('m-0', className)} {...props} />
}

export {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogTitle, DialogTrigger,
}
