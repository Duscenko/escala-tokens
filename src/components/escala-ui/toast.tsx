// Escala component: Toast — the Figma set of the same name (design-plans/toast-contract.md, 1117:114), 1:1; it replaces
// shadcn's Sonner skin. A short, non-blocking confirmation: an icon told apart by Variant (Sparkle · Info ·
// CheckCircle · Warning · WarningCircle), a title and an optional description, optional actions, a close and a
// progress hairline along the bottom edge (the time left). Appearance solid · soft · filled · outline. `Toaster` /
// `toast` are the `sonner` library's (the queue and the live region); `showToast` puts this component in it.
// Appearance: recipe (Toast).
import * as React from 'react'
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner'
import { cn } from '../../lib/utils'
import { glyph, type IconName } from '../../lib/icons'
import { CloseButton } from './close-button'

export const TOAST_APPEARANCES = ['solid', 'soft', 'filled', 'outline'] as const
export type ToastAppearance = (typeof TOAST_APPEARANCES)[number]
export const TOAST_VARIANTS = ['default', 'secondary', 'success', 'info', 'warning', 'critical'] as const
export type ToastVariant = (typeof TOAST_VARIANTS)[number]

// Phosphor regular glyphs (the file's icon/Sparkle, Info, CheckCircle, Warning, WarningCircle).
const GLYPH: Record<ToastVariant, IconName> = {
  default: 'sparkle',
  secondary: 'info',
  success: 'check-circle',
  info: 'info',
  warning: 'warning',
  critical: 'warning-circle',
}

export interface ToastProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Figma Appearance. */
  appearance?: ToastAppearance
  /** Figma Variant (the severity); it picks the icon and the colour. */
  variant?: ToastVariant
  /** Figma Title. */
  title?: React.ReactNode
  /** Figma DescriptionVisible / Description. */
  descriptionVisible?: boolean
  description?: React.ReactNode
  /** Figma IconVisible (and a glyph of your own). */
  iconVisible?: boolean
  icon?: React.ReactNode
  /** Figma ActionsVisible / the actions (a Button, e.g. Undo). */
  actionsVisible?: boolean
  actions?: React.ReactNode
  /** Figma CloseVisible. */
  closeVisible?: boolean
  onClose?: () => void
  closeLabel?: string
  /** Figma ProgressVisible, and how much of the hairline is filled (0–100; the file draws 25). */
  progressVisible?: boolean
  progress?: number
}

function Toast({
  appearance = 'filled', variant = 'default', title = 'Title', descriptionVisible = true, description = 'Description', iconVisible = true, icon,
  actionsVisible = false, actions, closeVisible = true, onClose, closeLabel = 'Dismiss', progressVisible = true, progress = 25, className, ...props
}: ToastProps) {
  const stroked = appearance === 'filled' || appearance === 'outline'
  return (
    <div
      role={variant === 'critical' ? 'alert' : 'status'}
      aria-live={variant === 'critical' ? 'assertive' : 'polite'}
      data-slot="toast"
      data-escala="Toast"
      data-appearance={appearance}
      data-variant={variant}
      // The file's left padding is Spacing/inset-surface (20); the recipe pads the other three sides.
      className={cn('relative flex w-[360px] max-w-full items-center overflow-clip [overflow-clip-margin:border-box] text-left !pl-[var(--spacing-inset-surface)]', className)}
      {...props}
    >
      {iconVisible && (
        <span data-part="Toast.icon" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
          {icon ?? glyph(GLYPH[variant], { decorative: false })}
        </span>
      )}
      <div data-part="Toast.content" className="flex min-w-0 flex-1 flex-col">
        <span data-part="Toast.title">{title}</span>
        {descriptionVisible && <span data-part="Toast.description">{description}</span>}
      </div>
      {actionsVisible && <div data-part="Toast.actions" className="flex shrink-0">{actions}</div>}
      {closeVisible && <CloseButton data-part="Toast.close" appearance="ghost" shape="rounded" size="sm" aria-label={closeLabel} onClick={onClose} className="shrink-0" />}
      {progressVisible && (
        // The file's progress hairline spans the whole frame (a stroke included): 360 wide, flush with the bottom edge.
        <div data-part="Toast.progress" aria-hidden className={cn('absolute', stroked ? 'bottom-[calc(var(--stroke-control,1px)*-1)] left-[calc(var(--stroke-control,1px)*-1)] w-[calc(100%+var(--stroke-control,1px)*2)]' : 'bottom-0 left-0 w-full')}>
          <div data-part="Toast.bar" className="h-full" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  )
}

function Toaster(props: ToasterProps) {
  return (
    <div data-slot="toaster" style={{ display: 'contents' }}>
      <Sonner className="toaster group" toastOptions={{ unstyled: true }} {...props} />
    </div>
  )
}

/** Shows a Toast in the Toaster's queue (the library handles the timer, the stack and the live region). */
function showToast(props: Omit<ToastProps, 'onClose'> & { duration?: number; id?: string | number }) {
  const { duration, id, ...rest } = props
  return toast.custom((t) => <Toast {...rest} onClose={() => toast.dismiss(t)} />, { duration, id })
}

export { Toast, Toaster, toast, showToast }
