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

// Radix AlertDialog is ALWAYS modal (its Root hardcodes `modal: true`): an
// open one locks `body` pointer events and aria-hides the rest of the page.
// Drawn in place (`inline` on the Root) it must not, or one specimen on a
// docs page freezes the whole app. So `inline` skips the Radix tree and the
// parts render plain elements with the same slots, parts and roles.
const InlineAlertDialog = React.createContext(false)

function AlertDialog({ inline = false, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root> & { inline?: boolean }) {
  if (inline) return <InlineAlertDialog.Provider value>{props.children}</InlineAlertDialog.Provider>
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
  const inlineRoot = React.useContext(InlineAlertDialog)
  if (inlineRoot) {
    const { children, style, id } = props
    return (
      <div
        role="alertdialog"
        id={id}
        style={style}
        data-slot="alert-dialog-content"
        data-escala="AlertDialog"
        data-size={size}
        data-state="open"
        className={cn('group/alert-dialog-content flex flex-col outline-none', size === 'sm' ? 'max-w-xs' : 'max-w-lg', className)}
      >
        {children}
      </div>
    )
  }
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
  if (React.useContext(InlineAlertDialog)) {
    return <h2 data-slot="alert-dialog-title" data-part="AlertDialog.title" className={cn('m-0', className)}>{props.children}</h2>
  }
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" data-part="AlertDialog.title" className={cn('m-0', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  if (React.useContext(InlineAlertDialog)) {
    return <p data-slot="alert-dialog-description" data-part="AlertDialog.description" className={cn('m-0', className)}>{props.children}</p>
  }
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" data-part="AlertDialog.description" className={cn('m-0', className)} {...props} />
}

type ActionProps = React.ComponentProps<typeof AlertDialogPrimitive.Action> & { variant?: ButtonVariant; size?: ButtonSize }

function AlertDialogAction({ className, variant = 'default', size = 'default', ...props }: ActionProps) {
  if (React.useContext(InlineAlertDialog)) {
    return <Button variant={variant} size={size} data-slot="alert-dialog-action" className={className}>{props.children}</Button>
  }
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={className} {...props} />
    </Button>
  )
}

function AlertDialogCancel({ className, variant = 'outline', size = 'default', ...props }: ActionProps) {
  if (React.useContext(InlineAlertDialog)) {
    return <Button variant={variant} size={size} data-slot="alert-dialog-cancel" className={className}>{props.children}</Button>
  }
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
