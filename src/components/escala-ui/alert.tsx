// Skeleton: shadcn/ui `bases/radix/ui/alert.tsx` (MIT, see LICENSE-shadcn.md):
// Alert · AlertTitle · AlertDescription · AlertAction, `variant` default |
// destructive. The icon is the first child, as in shadcn (an <svg>, or any
// element marked `data-slot="alert-icon"`). Appearance: recipe (Alert).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const ALERT_VARIANTS = ['default', 'destructive'] as const
export type AlertVariant = (typeof ALERT_VARIANTS)[number]

const ICON = '[&>svg]:row-span-2 [&>[data-slot=alert-icon]]:row-span-2'

function Alert({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & { variant?: AlertVariant }) {
  return (
    <div
      data-slot="alert"
      data-escala="Alert"
      data-variant={variant}
      role="alert"
      className={cn(
        'group/alert relative grid w-full text-left',
        'has-[>svg]:grid-cols-[auto_1fr] has-[>[data-slot=alert-icon]]:grid-cols-[auto_1fr]',
        ICON,
        'has-data-[slot=alert-action]:pr-18',
        className,
      )}
      {...props}
    />
  )
}

/** Escala: wraps a glyph that is not an <svg> so it takes the icon column. */
function AlertIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="alert-icon" data-part="Alert.icon" className={cn('inline-flex translate-y-0.5', className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      data-part="Alert.title"
      className={cn('col-start-2 group-not-has-[>svg]/alert:group-not-has-[>[data-slot=alert-icon]]/alert:col-start-1 [&_a]:underline [&_a]:underline-offset-3', className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      data-part="Alert.description"
      className={cn('col-start-2 text-balance group-not-has-[>svg]/alert:group-not-has-[>[data-slot=alert-icon]]/alert:col-start-1 [&_a]:underline [&_a]:underline-offset-3', className)}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-action" data-part="Alert.action" className={cn('absolute top-2.5 right-3', className)} {...props} />
}

export { Alert, AlertAction, AlertDescription, AlertIcon, AlertTitle }
