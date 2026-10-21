import { AnimatePresence, motion } from 'framer-motion'
import { cloudSystemCount, cloudSystemLimit } from '../../lib/accountCloud'
import { useAccess } from '../../lib/access'
import {
  localCloudFiles,
  resolveAccountCloudConflict,
  useAccountCloud,
  type AccountCloudStatus as Status,
} from '../../lib/accountCloudSync'
import { signOut } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

// `short` is what the line says; `text` is the full reason, on hover and to
// screen readers. A status is a glance, not a paragraph.
const LINE: Partial<Record<Status, { short: string; text: string; tone: 'ok' | 'muted' | 'warn' }>> = {
  loading: { short: 'Opening your account…', text: 'Opening your files from your account…', tone: 'muted' },
  pending: { short: 'Saving to your account…', text: 'Saving to your account…', tone: 'muted' },
  saving: { short: 'Saving to your account…', text: 'Saving to your account…', tone: 'muted' },
  saved: { short: 'Saved to your account', text: 'Saved to your account. Open it in any browser.', tone: 'ok' },
  offline: { short: 'Not saved to your account', text: 'Could not reach your account. Changes are kept in this browser and will be saved when it is back.', tone: 'warn' },
  outdated: { short: 'Reload to keep saving', text: 'Your account was saved by a newer version of Escala. Reload the page to keep saving.', tone: 'warn' },
  'too-large': { short: 'Too large for your account', text: 'Too large to save to your account. It is kept in this browser.', tone: 'warn' },
  unavailable: { short: 'Not saved to your account', text: 'Saving to your account is not available right now. Your work is kept in this browser.', tone: 'warn' },
}

/** One line under Home's title: where the signed-in account's files live. */
export function AccountCloudStatus() {
  const { t } = useI18n()
  const status = useAccountCloud((s) => s.status)
  const localOnly = useAccountCloud((s) => s.localOnly)
  const { tier } = useAccess()
  const line = LINE[status]
  if (!line) return null
  const dot = line.tone === 'ok' ? 'bg-status-success-solid' : line.tone === 'warn' ? 'bg-status-warning-solid' : 'bg-fg-faint'
  return (
    <div className="flex flex-col gap-1" role="status" aria-live="polite">
      <p className="flex min-w-0 items-center gap-2 text-caption text-fg-muted" title={t(line.text)}>
        <span aria-hidden className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} />
        <span aria-hidden className="truncate">{t(line.short)}</span>
        <span className="sr-only">{t(line.text)}</span>
      </p>
      {localOnly > 0 && (status === 'saved' || status === 'pending' || status === 'saving') && (
        <p className="pl-3.5 text-caption text-fg-faint">
          {t(localOnly === 1
            ? '1 design system is kept only in this browser. Your plan saves {limit} to your account.'
            : '{n} design systems are kept only in this browser. Your plan saves {limit} to your account.',
          { n: localOnly, limit: cloudSystemLimit(tier === 'pro') })}
        </p>
      )}
    </div>
  )
}

function when(iso: string | undefined, locale: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

/** Two browsers changed the same account. Nothing is saved until the person
 *  picks; the other version is kept as a backup in this browser. */
export function AccountCloudConflict() {
  const { t, locale } = useI18n()
  const conflict = useAccountCloud((s) => s.conflict)
  const record = conflict?.record ?? null
  const cloudCount = record ? cloudSystemCount(record.files) : 0
  const localCount = conflict ? cloudSystemCount(localCloudFiles()) : 0
  const button = 'flex-1 rounded-lg px-3.5 py-2 text-ui font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  return (
    <AnimatePresence>
      {conflict && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="account-cloud-conflict-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-line bg-app shadow-2xl"
          >
            <div className="flex flex-col gap-2 p-5">
              <h2 id="account-cloud-conflict-title" className="text-strong font-semibold text-fg">
                {t('Your account was changed in another browser')}
              </h2>
              <p className="text-body leading-relaxed text-fg-muted">
                {t('This browser and your account both have changes. Choose which version to keep. The other one is kept as a backup in this browser.')}
              </p>
              <dl className="mt-1 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-surface px-3 py-2">
                  <dt className="text-caption text-fg-faint">{t('Your account')}</dt>
                  <dd className="text-body text-fg">{t('{n} design systems', { n: cloudCount })}</dd>
                  <dd className="text-caption text-fg-muted">{when(record?.savedAt, locale)}</dd>
                </div>
                <div className="rounded-lg border border-line bg-surface px-3 py-2">
                  <dt className="text-caption text-fg-faint">{t('This browser')}</dt>
                  <dd className="text-body text-fg">{t('{n} design systems', { n: localCount })}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-2 border-t border-line bg-surface/50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { void resolveAccountCloudConflict('local') }}
                  className={`${button} border border-line text-fg-muted hover:border-line-strong hover:text-fg`}
                >
                  {t("Keep this browser's")}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => { void resolveAccountCloudConflict('cloud') }}
                  className={`${button} bg-cta text-cta-ink hover:opacity-90`}
                >
                  {t("Use your account's")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { void signOut() }}
                className="w-full rounded-lg px-2 py-1.5 text-caption text-fg-faint transition-colors hover:text-fg"
              >
                {t('Sign out without saving')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
