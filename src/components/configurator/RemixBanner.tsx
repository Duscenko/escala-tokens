// The desktop's welcome for a `?remix=` link: the system a visitor shuffled in
// the phone playground, open here as a try-on (`lib/remixLink.ts`). It says
// where it came from and what the next step is; the step itself is the board's
// own Add brand button, the one way a try-on becomes a theme. No account is
// asked for to open it, only later, to keep it (the guest rules as everywhere).

import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { cn } from '../../lib/utils'

export function RemixBanner({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion() ?? false
  return (
    <motion.div
      role="status"
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto fixed left-1/2 top-[64px] z-[70] flex w-[min(560px,calc(100vw-32px))] -translate-x-1/2 items-start gap-3 rounded-2xl border border-line bg-elevated/95 p-3 pl-4 shadow-2xl backdrop-blur-md"
    >
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-ui/12 text-accent-ui" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4.5" y="1.5" width="7" height="13" rx="1.5" />
          <path d="M7 12.5h2" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ui font-semibold text-fg">{t('Opened from your phone')}</span>
        <span className="text-body leading-relaxed text-fg-muted">
          {t('This is the system you shuffled. Adjust it here, then press Add brand to make it yours. No account needed to try it.')}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('Close')}
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-fg-faint transition-colors hover:bg-app/60 hover:text-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50',
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  )
}
