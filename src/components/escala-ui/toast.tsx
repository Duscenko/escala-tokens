// Escala's Toast. shadcn ships Sonner (a toaster that queues and animates);
// this is the toast itself — an inverse snackbar with a message, an optional
// action and a close — so a product can drive it with whatever queue it uses.
// Appearance: recipe (Toast).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ToastProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  status?: 'Success' | 'Error' | 'Warning' | 'Info'
  message: React.ReactNode
  action?: React.ReactNode
  onAction?: () => void
  onClose?: () => void
  closeIcon?: React.ReactNode
}

function Toast({ status = 'Success', message, action, onAction, onClose, closeIcon = '✕', className, ...props }: ToastProps) {
  return (
    <div
      role={status === 'Error' ? 'alert' : 'status'}
      data-slot="toast"
      data-escala="Toast"
      data-status={status}
      className={cn('flex min-w-0 items-center', className)}
      {...props}
    >
      <span data-part="Toast.message" className="min-w-0 flex-1 truncate">{message}</span>
      {action != null && (
        <button type="button" data-part="Toast.action" onClick={onAction} className="shrink-0 cursor-pointer border-0 bg-transparent p-0 underline outline-none">{action}</button>
      )}
      {onClose && (
        <button type="button" aria-label="Dismiss" data-part="Toast.close" onClick={onClose} className="shrink-0 cursor-pointer border-0 bg-transparent p-0 outline-none">{closeIcon}</button>
      )}
    </div>
  )
}

export { Toast }
