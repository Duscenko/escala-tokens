import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
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

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

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
  const doneRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion() ?? false
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  /** What the LAST attempt in this dialog said — not the saved key's status,
   *  so reopening the dialog never greets someone with a stale rejection. */
  const [attempt, setAttempt] = useState<'expired' | 'invalid' | 'unavailable' | 'activation_limit' | null>(null)

  const active = licence.status === 'valid'

  useEffect(() => {
    // Hand focus back to whatever opened the dialog when it closes.
    const opener = document.activeElement as HTMLElement | null
    return () => opener?.focus?.()
  }, [])

  useEffect(() => {
    if (active) doneRef.current?.focus()
    else inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab') return
      // Tab stays inside: a modal that lets focus fall through to the page
      // behind the scrim is not modal for keyboard users.
      const items = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), summary',
        ) ?? [],
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const at = document.activeElement
      if (event.shiftKey && at === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && at === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, active])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setAttempt(null)
    const result = await activateLicence(value)
    setBusy(false)
    if (result.status === 'valid') { setValue(''); return }
    if (result.status === 'expired' || result.status === 'invalid' || result.status === 'unavailable' || result.status === 'activation_limit') {
      setAttempt(result.status)
    }
  }

  const message =
    attempt === 'expired' ? t('This key has expired. Renew it, or keep working on Free.')
    : attempt === 'invalid' ? t('That key was not recognised. Check it and try again.')
    : attempt === 'activation_limit' ? t('This browser is past the activation limit for this key. Free one in Polar, or keep working on Free.')
    : attempt === 'unavailable' ? t('Could not check the key right now. Try again in a moment.')
    : null

  const until = active && licence.expiresAt ? formatDate(licence.expiresAt, locale) : null
  const fade = reduceMotion ? { duration: 0 } : { duration: 0.15 }
  const rise = reduceMotion ? { duration: 0 } : { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fade}
      onMouseDown={onClose}
      // A scrim is DARK in both chromes. `bg-fg` flips with the theme, so in
      // dark mode it painted a pale wash over the page instead of dimming it.
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-copy`}
        initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={rise}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col rounded-2xl border border-line bg-elevated p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden
            className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${
              active ? 'bg-status-success/15 text-status-success' : 'bg-accent-ui/15 text-accent-ui'
            }`}
          >
            {active ? (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="10.5" r="2.5" /><path d="M7.3 8.7 13 3m-2.2 2.2L12.5 7m-4-1.5 1.5 1.5" /></svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-strong font-semibold tracking-tight text-fg">
              {active ? t('Escala Pro is active') : t('Activate Escala Pro')}
            </h2>
            <p id={`${titleId}-copy`} className="mt-1.5 text-caption leading-5 text-fg-muted">
              {active
                ? t('Hosted sync, live MCP and updates.')
                : entitlement.promo
                  ? t('One payment. Includes 12 months of hosted sync, live MCP and updates.')
                  : t('The purchase email opens Polar and shows the key. Paste it here to turn this browser into Pro.')}
            </p>
            {until && (
              <p className="mt-1 text-caption text-fg-faint">
                {t('Included until {date}.', { date: until })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close')}
            className={`-mr-2 -mt-1.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-fg/[0.06] hover:text-fg active:scale-95 ${FOCUS}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {active ? (
          <div className="mt-6 flex items-center gap-3">
            {/* Pro by the account, with no key here: there is nothing in this
                browser to remove. */}
            {licence.hasKey && (
              <button
                type="button"
                onClick={() => { clearLicence(); setAttempt(null) }}
                className={`min-w-0 truncate rounded-md px-1 py-1 text-left text-caption font-medium text-fg-muted transition-colors hover:text-fg ${FOCUS}`}
              >
                {t('Remove key from this browser')}
              </button>
            )}
            <button
              ref={doneRef}
              type="button"
              onClick={onClose}
              className={`ml-auto h-8 flex-shrink-0 rounded-lg bg-accent-solid px-3.5 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 ${FOCUS}`}
            >
              {t('Done')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-2">
            <label htmlFor={`${titleId}-key`} className="text-caption font-semibold text-fg">
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
                className={`h-10 min-w-0 flex-1 rounded-lg border bg-surface px-3 font-mono text-caption text-fg outline-none transition-colors placeholder:text-fg-faint focus:ring-2 ${
                  message
                    ? 'border-status-danger focus:ring-status-danger/40'
                    : 'border-line-strong hover:border-fg-faint focus:border-accent-ui focus:ring-accent-ui/40'
                }`}
              />
              <button
                type="submit"
                disabled={!value.trim() || busy}
                className={`h-10 flex-shrink-0 rounded-lg bg-accent-solid px-4 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
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
          <div className="mt-6 flex flex-col gap-2.5 border-t border-line pt-5">
            <p className="text-caption font-semibold text-fg">{t("Don't have a key yet?")}</p>
            {/* A secondary FILL, like every other secondary button in the
                product: the outline-only version read as an input. The price
                sits on the right so the label can stay the action. */}
            <a
              href={checkoutUrl(user?.email)}
              className={`flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-caption font-semibold text-fg transition-colors hover:border-line-strong hover:bg-elevated ${FOCUS}`}
            >
              <span className="min-w-0 flex-1 truncate">{t('Buy Escala Pro')}</span>
              <span className="tabular-nums text-fg-muted">${entitlement.priceUsd}</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-fg-faint"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
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
