import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../lib/i18n'

/** Register without leaving the previewer. The account page is the next step
 *  the person chooses; closing the dialog keeps the design system on screen. */
export function RegisterToContinueDialog({
  open,
  onClose,
  onContinue,
}: {
  open: boolean
  onClose: () => void
  onContinue: (mode: 'signup' | 'signin') => void
}) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const title = t('Create a free account')
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-to-continue-title"
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-line bg-app p-5 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="register-to-continue-title" className="m-0 text-ui font-semibold text-fg">{title}</p>
        <p className="m-0 text-caption leading-relaxed text-fg-muted">
          {t('A free account saves this design system on Escala, so you can add another brand without losing it. Everything else stays open without one.')}
        </p>
        <button
          type="button"
          onClick={() => onContinue('signup')}
          className="h-8 w-full rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {title}
        </button>
        <button
          type="button"
          onClick={() => onContinue('signin')}
          className="text-caption font-medium text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded"
        >
          {t('I already have an account')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-full rounded-lg text-caption font-medium text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Close')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
