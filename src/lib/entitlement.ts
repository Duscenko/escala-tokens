// Entitlement: what this browser may sync right now.
//
// The free-for-everyone Pro period ended 7 Oct 2026 (Paris). After that the
// Free limits apply unless Polar vouches for a licence key. Pure and DOM-free
// so `api/entitlement.ts` and the client share ONE definition of the cutoff —
// the server is the clock that counts (a browser clock can be set to anything),
// this module is only the rule.

/** Last second of October 7, Europe/Paris. Still CEST (+02:00); DST ends
 *  Oct 25. Written as an offset, never a local-time string. */
export const PROMO_ENDS_AT = '2026-10-07T23:59:59+02:00'

/** Themes (each with its Light + Dark) a Figma sync may carry. */
export const FREE_MAX_THEMES = 1
export const PRO_MAX_THEMES = 10

/** Public pricing page (`src/components/public/PricingPage.tsx`). */
export const PRICING_PATH = '/pricing'

/** Escala Pro, one-time, in US dollars. The early ceiling is the cheaper of
 *  the two on purpose: the first stretch of the product stays at a lower top
 *  price, and the price rises later if the product grows. Change them here,
 *  never in the page.
 *
 *  Presented as a price that RISES on a date, never as a reduction from a
 *  higher number that was never charged. EU/French price-reduction rules
 *  reference the lowest price actually charged in the previous 30 days. In
 *  Polar this is the product's base price — already $45; edit it to $69 on
 *  Nov 16. The web follows this module; Polar does not. */
export const PRO_PRICE_USD = 69
export const PRO_LAUNCH_PRICE_USD = 45
/** Last second of the launch price, Europe/Paris (CET). */
export const PRO_LAUNCH_ENDS_AT = '2026-11-15T23:59:59+01:00'

export interface Entitlement {
  /** True while the launch promo grants Pro to everyone. */
  promo: boolean
  /** ISO instant the promo ends. */
  promoEndsAt: string
  /** Pro features apply (promo now; a valid licence in a later phase). */
  pro: boolean
  maxThemes: number
  /** True until PRO_LAUNCH_ENDS_AT; the price below follows it. */
  launchPrice: boolean
  launchEndsAt: string
  /** What Escala Pro costs right now, in USD. */
  priceUsd: number
  /** The server's clock when this was computed — the client measures the
   *  countdown against it, never against its own `Date.now()` alone. */
  now: string
}

export function entitlementAt(now: Date): Entitlement {
  const promo = now.getTime() <= Date.parse(PROMO_ENDS_AT)
  const launchPrice = now.getTime() <= Date.parse(PRO_LAUNCH_ENDS_AT)
  return {
    promo,
    promoEndsAt: PROMO_ENDS_AT,
    pro: promo,
    maxThemes: promo ? PRO_MAX_THEMES : FREE_MAX_THEMES,
    launchPrice,
    launchEndsAt: PRO_LAUNCH_ENDS_AT,
    priceUsd: launchPrice ? PRO_LAUNCH_PRICE_USD : PRO_PRICE_USD,
    now: now.toISOString(),
  }
}

/** Whole days left until `endsAt`, rounded UP: with 30 hours to go it is
 *  "2 days", and the last day reads 1 until it is over. 0 once it has ended. */
export function promoDaysLeft(now: Date, endsAt: string = PROMO_ENDS_AT): number {
  const ms = Date.parse(endsAt) - now.getTime()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}
