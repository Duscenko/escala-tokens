// Skeleton: shadcn/ui `bases/radix/ui/attachment.tsx` (MIT, see LICENSE-shadcn.md):
// a file attached to a message or form — media, title, description, actions —
// `size` default | sm | xs × `orientation` horizontal | vertical, and a
// `state` idle | uploading | processing | error | done. Escala carries the state
// onto the media and description too, so the recipe paints them per state
// (`media-error` in Figma). Appearance: recipe (Attachment, Button).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'
import { Button } from './button'

export const ATTACHMENT_STATES = ['idle', 'uploading', 'processing', 'error', 'done'] as const
export const ATTACHMENT_SIZES = ['default', 'sm', 'xs'] as const
export type AttachmentState = (typeof ATTACHMENT_STATES)[number]
export type AttachmentSize = (typeof ATTACHMENT_SIZES)[number]

const StateContext = React.createContext<AttachmentState>('done')

function Attachment({
  className, state = 'done', size = 'default', orientation = 'horizontal', style, ...props
}: React.ComponentProps<'div'> & { state?: AttachmentState; size?: AttachmentSize; orientation?: 'horizontal' | 'vertical' }) {
  return (
    <StateContext.Provider value={state}>
      <div
        data-slot="attachment"
        data-escala="Attachment"
        data-state={state}
        data-size={size}
        data-orientation={orientation}
        // Idle is a drop target: shadcn dashes its edge.
        style={state === 'idle' ? { borderStyle: 'dashed', ...style } : style}
        className={cn(
          'group/attachment relative flex max-w-full min-w-0 shrink-0 flex-wrap',
          orientation === 'vertical' ? 'flex-col' : 'items-center',
          className,
        )}
        {...props}
      />
    </StateContext.Provider>
  )
}

function AttachmentMedia({ className, variant = 'icon', ...props }: React.ComponentProps<'div'> & { variant?: 'icon' | 'image' }) {
  const state = React.useContext(StateContext)
  return (
    <div
      data-slot="attachment-media"
      data-part="Attachment.media"
      data-variant={variant}
      data-state={state}
      className={cn('relative flex aspect-square shrink-0 items-center justify-center overflow-hidden [&_img]:aspect-square [&_img]:w-full [&_img]:object-cover', className)}
      {...props}
    />
  )
}

function AttachmentContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="attachment-content" data-part="Attachment.content" className={cn('flex max-w-full min-w-0 flex-1 flex-col', className)} {...props} />
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="attachment-title" data-part="Attachment.title" className={cn('block max-w-full min-w-0 truncate', className)} {...props} />
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<'span'>) {
  const state = React.useContext(StateContext)
  return <span data-slot="attachment-description" data-part="Attachment.description" data-state={state} className={cn('block max-w-full min-w-0 truncate', className)} {...props} />
}

function AttachmentActions({ className, ...props }: React.ComponentProps<'div'>) {
  // Vertical: the actions float over the top-right corner (shadcn), at the
  // card's own inset, instead of dropping to a row of their own under the text.
  return (
    <div
      data-slot="attachment-actions"
      data-part="Attachment.actions"
      className={cn(
        'flex shrink-0 items-center',
        'group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-[var(--spacing-1)] group-data-[orientation=vertical]/attachment:right-[var(--spacing-1)] group-data-[orientation=vertical]/attachment:z-20',
        className,
      )}
      {...props}
    />
  )
}

function AttachmentAction({ variant, size = 'icon-xs', style, ...props }: React.ComponentProps<typeof Button>) {
  // The glyph takes Attachment.actions' ink (content.secondary), as the
  // plugin's icon slot does — the ghost Button only lends its hover wash.
  return <Button data-slot="attachment-action" variant={variant ?? 'ghost'} size={size} style={{ color: 'inherit', ...style }} {...props} />
}

function AttachmentTrigger({ className, asChild = false, type, ...props }: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="attachment-trigger" type={asChild ? undefined : (type ?? 'button')} className={cn('absolute inset-0 z-10 cursor-pointer border-0 bg-transparent outline-none', className)} {...props} />
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="attachment-group" className={cn('flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain [&>[data-slot=attachment]]:flex-none [&>[data-slot=attachment]]:snap-start', className)} {...props} />
}

export {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription,
  AttachmentActions, AttachmentAction, AttachmentTrigger,
}
