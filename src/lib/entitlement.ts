// Entitlement: what this browser may sync right now.
//
// Phase 1 of design-plans/pricing-and-packaging.md: there is no licence yet,
// only the launch promo. Until PROMO_ENDS_AT everyone gets Pro; after it the
// Free limits apply. Pure and DOM-free so `api/entitlement.ts` and the client
// share ONE definition of the cutoff — the server is the clock that counts
// (a browser clock can be set to anything), this module is only the rule.

/** Last second of October 31, Europe/Paris. DST ends Oct 25 2026, so the
 *  31st is CET (+01:00) — written as an offset, never a local-time string. */
export const PROMO_ENDS_AT = '2026-10-31T23:59:59+01:00'

/** Themes (each with its Light + Dark) a Figma sync may carry. */
export const FREE_MAX_THEMES = 1
export const PRO_MAX_THEMES = 10

/** Public pricing page (`src/components/public/PricingPage.tsx`). */
export const PRICING_PATH = '/pricing'

/** Escala Pro, one-time, in US dollars (the main audience is LATAM). The
 *  launch price runs to Dec 31. Hypotheses from the pricing plan — change
 *  them here, never in the page. */
export const PRO_PRICE_USD = 79
export const PRO_LAUNCH_PRICE_USD = 59

export interface Entitlement {
  /** True while the launch promo grants Pro to everyone. */
  promo: boolean
  /** ISO instant the promo ends. */
  promoEndsAt: string
  /** Pro features apply (promo now; a valid licence in a later phase). */
  pro: boolean
  maxThemes: number
  /** The server's clock when this was computed — the client measures the
   *  countdown against it, never against its own `Date.now()` alone. */
  now: string
}

export function entitlementAt(now: Date): Entitlement {
  const promo = now.getTime() <= Date.parse(PROMO_ENDS_AT)
  return {
    promo,
    promoEndsAt: PROMO_ENDS_AT,
    pro: promo,
    maxThemes: promo ? PRO_MAX_THEMES : FREE_MAX_THEMES,
    now: now.toISOString(),
  }
}

/** Whole days left, rounded UP: with 30 hours to go it is "2 days", and the
 *  last day reads 1 until it is over. 0 once the promo has ended. */
export function promoDaysLeft(now: Date, endsAt: string = PROMO_ENDS_AT): number {
  const ms = Date.parse(endsAt) - now.getTime()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}
