// Escala component: Toast — the Figma set of the same name (design-plans/toast-contract.md, 1117:114), 1:1; it replaces
// shadcn's Sonner skin. A short, non-blocking confirmation: an icon told apart by Variant (Sparkle · Info ·
// CheckCircle · Warning · WarningCircle), a title and an optional description, optional actions, a close and a
// progress hairline along the bottom edge (the time left). Appearance solid · soft · filled · outline. `Toaster` /
// `toast` are the `sonner` library's (the queue and the live region); `showToast` puts this component in it.
// Appearance: recipe (Toast).
import * as React from 'react'
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner'
import { cn } from '../../lib/utils'
import { CloseButton } from './close-button'

export const TOAST_APPEARANCES = ['solid', 'soft', 'filled', 'outline'] as const
export type ToastAppearance = (typeof TOAST_APPEARANCES)[number]
export const TOAST_VARIANTS = ['default', 'secondary', 'success', 'info', 'warning', 'critical'] as const
export type ToastVariant = (typeof TOAST_VARIANTS)[number]

// Phosphor regular glyphs (the file's icon/Sparkle, Info, CheckCircle, Warning, WarningCircle).
const GLYPH: Record<ToastVariant, string> = {
  default: 'M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z',
  secondary: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z',
  success: 'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
  info: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z',
  warning: 'M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z',
  critical: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z',
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
          {icon ?? <svg viewBox="0 0 256 256" fill="currentColor" focusable="false"><path d={GLYPH[variant]} /></svg>}
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
