// Escala component: Alert — the Figma set of the same name (design-plans/alert-contract.md, 397:1932), 1:1. A message
// bar: an icon and a description, optional actions and a close. Layout horizontal is the full-width banner, vertical a
// boxed message; Variant is the severity, Appearance outline · solid · soft · inverse. Passing `children` instead of
// `description` keeps the older composition (AlertTitle + AlertDescription inside a boxed, close-less alert).
// Appearance: recipe (Alert); the close is a CloseButton.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { CloseButton, type CloseButtonAppearance, type CloseButtonVariant } from './close-button'

export const ALERT_VARIANTS = ['success', 'info', 'warning', 'default', 'critical', 'secondary'] as const
export type AlertVariant = (typeof ALERT_VARIANTS)[number]
export const ALERT_APPEARANCES = ['outline', 'solid', 'soft', 'inverse'] as const
export type AlertAppearance = (typeof ALERT_APPEARANCES)[number]
export const ALERT_LAYOUTS = ['horizontal', 'vertical'] as const
export type AlertLayout = (typeof ALERT_LAYOUTS)[number]
export const ALERT_SIZES = ['sm', 'default'] as const
export type AlertSize = (typeof ALERT_SIZES)[number]

/** Phosphor Sparkle (regular): the file's default icon for every severity. */
const SPARKLE = 'M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z'

export interface AlertProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Figma Variant (the severity). `destructive` is the older name of `critical`. */
  variant?: AlertVariant | 'destructive'
  /** Figma Appearance. */
  appearance?: AlertAppearance
  /** Figma Layout: the full-width banner or a boxed message. */
  layout?: AlertLayout
  /** Figma Size. */
  size?: AlertSize
  /** Figma Description. */
  description?: React.ReactNode
  /** Figma IconVisible / Icon (the swap; the Sparkle by default). */
  iconVisible?: boolean
  icon?: React.ReactNode
  /** Figma ActionsVisible / the actions (a Button). */
  actionsVisible?: boolean
  actions?: React.ReactNode
  /** Figma CloseVisible. */
  closeVisible?: boolean
  onClose?: () => void
  closeLabel?: string
}

const CLOSE: Record<AlertAppearance, { appearance: CloseButtonAppearance; variant: CloseButtonVariant }> = {
  outline: { appearance: 'soft', variant: 'default' },
  solid: { appearance: 'soft', variant: 'inverse' },
  soft: { appearance: 'ghost', variant: 'default' },
  inverse: { appearance: 'soft', variant: 'inverse' },
}

function Alert({
  variant: variantProp = 'default', appearance = 'outline', layout: layoutProp, size = 'default', description = 'Description',
  iconVisible: iconVisibleProp, icon, actionsVisible = false, actions, closeVisible: closeVisibleProp, onClose, closeLabel = 'Dismiss',
  className, children, ...props
}: AlertProps) {
  const variant: AlertVariant = variantProp === 'destructive' ? 'critical' : variantProp
  // `children` = the older title + description composition: a boxed alert, no close, no icon unless one is given.
  const legacy = children !== undefined
  const layout = layoutProp ?? (legacy ? 'vertical' : 'horizontal')
  const iconVisible = iconVisibleProp ?? (legacy ? icon !== undefined : true)
  const closeVisible = closeVisibleProp ?? !legacy
  const vertical = layout === 'vertical'
  const closeProps = CLOSE[appearance]
  const closeOffset = vertical && appearance === 'outline' ? 'calc(var(--spacing-inset-control) - var(--stroke-control, 1px))' : 'var(--spacing-inset-control)'
  return (
    <div
      role="alert"
      data-slot="alert"
      data-escala="Alert"
      data-variant={variant}
      data-appearance={appearance}
      data-layout={layout}
      data-size={size}
      className={cn('relative flex w-full text-left', vertical ? 'flex-col items-stretch' : 'flex-row items-center', className)}
      {...props}
    >
      <div data-part="Alert.content" className={cn('flex min-w-0 flex-1', vertical ? 'items-start' : 'items-center')}>
        {iconVisible && (
          <span data-part="Alert.icon" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
            {icon ?? <svg viewBox="0 0 256 256" fill="currentColor" focusable="false"><path d={SPARKLE} /></svg>}
          </span>
        )}
        {legacy ? <div className="flex min-w-0 flex-1 flex-col">{children}</div> : <span data-part="Alert.description" className="min-w-0 flex-1">{description}</span>}
      </div>
      {actionsVisible && <div data-part="Alert.actions" className="flex shrink-0 items-center">{actions}</div>}
      {closeVisible && (
        <CloseButton
          data-part="Alert.close"
          appearance={closeProps.appearance}
          variant={closeProps.variant}
          shape="pill"
          size={vertical ? 'xs' : size}
          aria-label={closeLabel}
          onClick={onClose}
          className={cn('shrink-0', vertical && 'absolute')}
          style={vertical ? { top: closeOffset, right: closeOffset } : undefined}
        />
      )}
    </div>
  )
}

// The older composition's parts.
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" data-part="Alert.title" className={className} {...props} />
}
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" data-part="Alert.description" className={cn('text-balance', className)} {...props} />
}
function AlertIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="alert-icon" className={cn('inline-flex', className)} {...props} />
}
function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-action" className={cn('absolute top-2.5 right-3', className)} {...props} />
}

export { Alert, AlertAction, AlertDescription, AlertIcon, AlertTitle }
