import { useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { PRO_LAUNCH_PRICE_USD, PRO_PRICE_USD } from '../../lib/entitlement'
import { useEntitlement } from '../../lib/useEntitlement'
import TopBanner from './TopBanner'

const KEY = 'sd-promo-banner-dismissed'

function readDismissed(phase: string): boolean {
  try {
    return sessionStorage.getItem(KEY) === phase
  } catch {
    return false
  }
}

/** The launch offer, as the strip above every screen's header (workspace,
 *  About, the public reading pages and /pricing). Oct: the free promo.
 *  Nov 1–15: the launch price. After: nothing — the regular price needs no
 *  banner. `dismissible` is off on /pricing, where the offer is being read;
 *  elsewhere a dismissal lasts the session and is keyed by phase, so moving
 *  from the promo to the launch price shows the new message again. */
export default function PromoBanner({ dismissible = true }: { dismissible?: boolean }) {
  const { t } = useI18n()
  const entitlement = useEntitlement()
  const phase = entitlement.promo ? 'promo' : entitlement.launchPrice ? 'launch' : ''
  const [dismissed, setDismissed] = useState(() => readDismissed(phase))

  if (!phase || (dismissible && dismissed)) return null

  const days = entitlement.promo ? entitlement.daysLeft : entitlement.launchDaysLeft
  return (
    <TopBanner
      onDismiss={
        dismissible
          ? () => {
              try { sessionStorage.setItem(KEY, phase) } catch { /* ignore */ }
              setDismissed(true)
            }
          : undefined
      }
      dismissLabel={t('Dismiss promo announcement')}
    >
      <span className="inline-flex flex-shrink-0 items-center rounded-full bg-accent-solid px-2 py-0.5 text-nano font-semibold uppercase tracking-[0.1em] text-accent-ink">
        {t('Launch')}
      </span>
      <span>
        {entitlement.promo
          ? t('Everything in Pro is free for everyone until October 31.')
          : t('Escala Pro is ${launch} until November 15, then ${price}.', {
              launch: String(PRO_LAUNCH_PRICE_USD),
              price: String(PRO_PRICE_USD),
            })}
      </span>
      <span className="font-mono tabular-nums text-accent-ui">
        {days === 1 ? t('1 day left') : t('{n} days left', { n: String(days) })}
      </span>
    </TopBanner>
  )
}
