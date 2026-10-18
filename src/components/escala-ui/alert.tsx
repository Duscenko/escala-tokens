// Skeleton: shadcn/ui `bases/radix/ui/alert.tsx` (MIT, see LICENSE-shadcn.md):
// Alert / AlertTitle / AlertDescription — Escala's InlineAlert — plus the
// AlertBanner (a single-line alert with an action and a close).
// Appearance: recipes (InlineAlert, AlertBanner).
import * as React from 'react'
import { cn } from '../../lib/utils'

export type AlertStatus = 'Info' | 'Success' | 'Warning' | 'Error'

export interface AlertProps extends React.ComponentProps<'div'> {
  status?: AlertStatus
  /** The status glyph. */
  icon?: React.ReactNode
}

function Alert({ status = 'Info', icon, className, children, ...props }: AlertProps) {
  return (
    <div
      role={status === 'Error' ? 'alert' : 'status'}
      data-slot="alert"
      data-escala="InlineAlert"
      data-status={status}
      className={cn('flex', className)}
      {...props}
    >
      {icon != null && <span data-part="InlineAlert.icon" className="inline-flex shrink-0">{icon}</span>}
      <div data-part="InlineAlert.body" className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" data-part="InlineAlert.title" className={className} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" data-part="InlineAlert.description" className={className} {...props} />
}

export interface AlertBannerProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  status?: AlertStatus
  icon?: React.ReactNode
  message: React.ReactNode
  /** The call to action ("View", "Upgrade"). */
  action?: React.ReactNode
  onAction?: () => void
  onClose?: () => void
  /** The close glyph. */
  closeIcon?: React.ReactNode
}

function AlertBanner({ status = 'Info', icon, message, action, onAction, onClose, closeIcon = '×', className, ...props }: AlertBannerProps) {
  return (
    <div
      role={status === 'Error' ? 'alert' : 'status'}
      data-slot="alert-banner"
      data-escala="AlertBanner"
      data-status={status}
      className={cn('flex items-center', className)}
      {...props}
    >
      {icon != null && <span data-part="AlertBanner.icon" className="inline-flex shrink-0">{icon}</span>}
      <span data-part="AlertBanner.message" className="min-w-0 flex-1">{message}</span>
      {action != null && (
        <button type="button" data-part="AlertBanner.action" onClick={onAction} className="cursor-pointer border-0 bg-transparent p-0 whitespace-nowrap outline-none">{action}</button>
      )}
      {onClose && (
        <button type="button" aria-label="Dismiss" data-part="AlertBanner.close" onClick={onClose} className="inline-flex cursor-pointer border-0 bg-transparent p-0 outline-none">{closeIcon}</button>
      )}
    </div>
  )
}

export { Alert, AlertBanner, AlertDescription, AlertTitle }
