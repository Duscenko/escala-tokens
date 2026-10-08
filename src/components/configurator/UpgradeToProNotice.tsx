import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PRICING_PATH } from '../../lib/entitlement'
import { useI18n } from '../../lib/i18n'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** The one upgrade notice. Styles already showed it; Create, Duplicate,
 *  File & modes and the agent connection use the same words. */
export function UpgradeToProNotice() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-stretch gap-2">
      <a
        href={PRICING_PATH}
        className={`flex h-10 items-center justify-center gap-2 rounded-full bg-accent-solid px-4 text-ui font-medium text-accent-ink transition-opacity hover:opacity-90 ${FOCUS}`}
      >
        {t('Upgrade to Pro')}
      </a>
      <p className="text-center text-caption text-fg-faint">{t('Free includes one theme. Pro adds this style and as many as you need.')}</p>
    </div>
  )
}

export function UpgradeToProDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Upgrade to Pro')}
        className="w-full max-w-sm rounded-2xl border border-line bg-app p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <UpgradeToProNotice />
        <button
          type="button"
          onClick={onClose}
          className={`mt-4 h-8 w-full rounded-lg text-caption font-medium text-fg-muted hover:text-fg ${FOCUS}`}
        >
          {t('Close')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
