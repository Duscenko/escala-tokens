// Skeleton: shadcn/ui `bases/radix/ui/alert-dialog.tsx` (MIT, see LICENSE-shadcn.md):
// the Radix AlertDialog, content `size` default | sm, with media, title,
// description and Action / Cancel Buttons (shadcn's: default and outline).
// `inline` draws it in place (docs, previews), like Dialog. Appearance: recipe
// (AlertDialog, Button).
import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { Button, type ButtonSize, type ButtonVariant } from './button'
import { usePortalContainer } from './portal-scope'

function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal(props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      data-part="AlertDialog.overlay"
      className={cn('fixed inset-0 z-50', className)}
      {...props}
    />
  )
}

export type AlertDialogSize = 'default' | 'sm'

function AlertDialogContent({
  className, size = 'default', inline = false, ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & { size?: AlertDialogSize; inline?: boolean }) {
  const container = usePortalContainer()
  const content = (
    <AlertDialogPrimitive.Content
      data-slot="alert-dialog-content"
      data-escala="AlertDialog"
      data-size={size}
      className={cn(
        'group/alert-dialog-content flex flex-col outline-none',
        !inline && 'fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2',
        size === 'sm' ? 'max-w-xs' : 'max-w-lg',
        className,
      )}
      onOpenAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      onCloseAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      {...props}
    />
  )
  if (inline) return content
  return (
    <AlertDialogPortal container={container}>
      <AlertDialogOverlay />
      {content}
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      data-part="AlertDialog.header"
      className={cn('flex flex-col items-center text-center group-data-[size=default]/alert-dialog-content:sm:items-start group-data-[size=default]/alert-dialog-content:sm:text-left', className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      data-part="AlertDialog.footer"
      className={cn('flex flex-col-reverse group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function AlertDialogMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-media" data-part="AlertDialog.media" className={cn('inline-flex items-center justify-center', className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" data-part="AlertDialog.title" className={cn('m-0', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" data-part="AlertDialog.description" className={cn('m-0', className)} {...props} />
}

type ActionProps = React.ComponentProps<typeof AlertDialogPrimitive.Action> & { variant?: ButtonVariant; size?: ButtonSize }

function AlertDialogAction({ className, variant = 'default', size = 'default', ...props }: ActionProps) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={className} {...props} />
    </Button>
  )
}

function AlertDialogCancel({ className, variant = 'outline', size = 'default', ...props }: ActionProps) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={className} {...props} />
    </Button>
  )
}

export {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger,
}
