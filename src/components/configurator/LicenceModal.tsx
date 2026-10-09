import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { useAuth } from '../../lib/auth'
import { activateLicence, clearLicence } from '../../lib/licence'
import { checkoutUrl } from '../../lib/polar'
import { PRICING_PATH, PRO_PRICE_USD } from '../../lib/entitlement'
import { useEntitlement } from '../../lib/useEntitlement'

// "Paste your licence key" — the only place a key enters the app.
//
// Polar's confirmation email ("Access purchase") opens Polar's own page and
// shows the key. It does not tell this app anything: the chip stays Free until
// the key is pasted here and `/api/license` gets `granted` back. Paste is the
// first thing on screen for that reason. Buying is the other half of the same
// dialog, under the field, for someone who does not have a key yet.

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function LicenceModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const entitlement = useEntitlement()
  const { licence } = entitlement
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  /** What the LAST attempt in this dialog said — not the saved key's status,
   *  so reopening the dialog never greets someone with a stale rejection. */
  const [attempt, setAttempt] = useState<'expired' | 'invalid' | 'unavailable' | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setAttempt(null)
    const result = await activateLicence(value)
    setBusy(false)
    if (result.status === 'valid') { setValue(''); return }
    if (result.status === 'expired' || result.status === 'invalid' || result.status === 'unavailable') {
      setAttempt(result.status)
    }
  }

  const message =
    attempt === 'expired' ? t('This key has expired. Renew it, or keep working on Free.')
    : attempt === 'invalid' ? t('That key was not recognised. Check it and try again.')
    : attempt === 'unavailable' ? t('Could not check the key right now. Try again in a moment.')
    : null

  const active = licence.status === 'valid'

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-5 rounded-2xl border border-line bg-app p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-title font-semibold text-fg">
              {active ? t('Escala Pro is active') : t('Activate Escala Pro')}
            </h2>
            <p className="mt-1 text-body leading-relaxed text-fg-muted">
              {active
                ? (licence.expiresAt
                  ? t('Hosted sync, live MCP and updates are included until {date}.', { date: formatDate(licence.expiresAt, locale) })
                  : t('One payment. Includes 12 months of hosted sync, live MCP and updates.'))
                : entitlement.promo
                  ? t('One payment. Includes 12 months of hosted sync, live MCP and updates.')
                  : t('The purchase email opens Polar and shows the key. Paste it here to turn this browser into Pro.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close')}
            className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-fg/8 hover:text-fg ${FOCUS}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {active ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { clearLicence(); setAttempt(null) }}
              className={`rounded-lg border border-line px-3.5 py-2 text-ui font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg ${FOCUS}`}
            >
              {t('Remove key from this browser')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg bg-fg px-3.5 py-2 text-ui font-semibold text-app transition-opacity hover:opacity-90 ${FOCUS}`}
            >
              {t('Done')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <label htmlFor={`${titleId}-key`} className="text-body font-semibold text-fg">
              {t('Paste your licence key')}
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id={`${titleId}-key`}
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="ESCALA-XXXXXXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={message ? true : undefined}
                aria-describedby={message ? `${titleId}-err` : `${titleId}-hint`}
                className={`h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-caption text-fg outline-none placeholder:text-fg-faint focus:ring-2 focus:ring-fg/40`}
              />
              <button
                type="submit"
                disabled={!value.trim() || busy}
                className={`h-11 rounded-lg bg-fg px-4 text-ui font-semibold text-app transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
              >
                {busy ? t('Checking…') : t('Activate')}
              </button>
            </div>
            {message ? (
              <p id={`${titleId}-err`} role="alert" className="text-caption text-status-danger">{message}</p>
            ) : (
              <p id={`${titleId}-hint`} className="text-caption text-fg-faint">
                {t('No account needed. The key stays in this browser; paste it again on another device.')}
              </p>
            )}
            <details className="group">
              <summary className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md text-caption font-medium text-accent-ui [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className="flex-shrink-0 transition-transform group-open:rotate-90">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('How do I find the key?')}
              </summary>
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-caption leading-relaxed text-fg-muted">
                <li>{t('Open the Polar email for this order.')}</li>
                <li>{t('Click Access purchase.')}</li>
                <li>{t('Under Benefit grants, copy the Escala Pro licence key.')}</li>
                <li>{t('Paste it in the field above and press Activate.')}</li>
              </ol>
            </details>
          </form>
        )}

        {!active && !entitlement.promo && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-body font-semibold text-fg">{t("Don't have a key yet?")}</p>
            <a
              href={checkoutUrl(user?.email)}
              className={`flex min-h-11 items-center justify-between rounded-lg border border-line px-4 text-ui font-semibold text-fg transition-colors hover:border-line-strong ${FOCUS}`}
            >
              <span>{t('Buy Escala Pro')} · <span className="tabular-nums">${entitlement.priceUsd}</span></span>
            </a>
            {entitlement.launchPrice && (
              <p className="text-caption text-fg-muted">
                {t('After November 15, ${price}.', { price: String(PRO_PRICE_USD) })}
              </p>
            )}
            <p className="text-caption text-fg-faint">
              {t('Secure checkout by Polar. The email opens the page where the key is shown.')}{' '}
              <a href={PRICING_PATH} className="text-accent-ui underline-offset-2 hover:underline">{t('See pricing')}</a>
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  )
}
