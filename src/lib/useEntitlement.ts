import { useEffect, useState } from 'react'
import { FREE_MAX_THEMES, PRO_MAX_THEMES, entitlementAt, promoDaysLeft, type Entitlement } from './entitlement'
import { isLiveEnvironment } from './figmaSync'
import { useLicence, type LicenceState } from './licence'

// Client side of /api/entitlement. One request per page load, shared by every
// caller — the answer only changes once a day, and an endpoint polled from a
// mounted component is exactly the cost pattern that paused this project.
//
// Until the server answers (and on localhost, where `vite dev` serves no
// /api), the rule is evaluated against the local clock. That is a FALLBACK
// for rendering only; nothing in this phase enforces anything, and from
// phase 3 the enforcement is `api/tokens.ts`, never this hook.

let request: Promise<Entitlement | null> | null = null
/** Server clock minus local clock, so the countdown follows the server. */
let skewMs = 0

function fetchEntitlement(): Promise<Entitlement | null> {
  if (!request) {
    request = fetch('/api/entitlement', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<Entitlement>) : null))
      .then((data) => {
        if (data) skewMs = Date.parse(data.now) - Date.now()
        return data
      })
      .catch(() => null)
  }
  return request
}

export interface EntitlementView extends Entitlement {
  daysLeft: number
  /** Days left at the launch price (0 once it is over). */
  launchDaysLeft: number
  /** True once the server has answered; false while showing the fallback. */
  confirmed: boolean
  /** What this browser's licence key is doing. `pro` already includes it. */
  licence: LicenceState
}

function view(e: Entitlement, confirmed: boolean, licence: LicenceState): EntitlementView {
  const now = new Date(Date.now() + skewMs)
  // Pro is the promo OR a key Polar vouches for. `maxThemes` follows, so one
  // `pro` flag is all a screen needs to read.
  const pro = e.pro || licence.status === 'valid'
  return {
    ...e,
    pro,
    maxThemes: pro ? PRO_MAX_THEMES : FREE_MAX_THEMES,
    licence,
    daysLeft: e.promo ? promoDaysLeft(now, e.promoEndsAt) : 0,
    launchDaysLeft: e.launchPrice ? promoDaysLeft(now, e.launchEndsAt) : 0,
    confirmed,
  }
}

export function useEntitlement(): EntitlementView {
  const licence = useLicence()
  const [base, setBase] = useState<{ e: Entitlement; confirmed: boolean }>(() => ({ e: entitlementAt(new Date()), confirmed: false }))
  useEffect(() => {
    if (!isLiveEnvironment()) return
    let cancelled = false
    fetchEntitlement().then((data) => {
      if (!cancelled && data) setBase({ e: data, confirmed: true })
    })
    return () => { cancelled = true }
  }, [])
  return view(base.e, base.confirmed, licence)
}
