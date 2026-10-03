import { useEffect, useState } from 'react'
import { entitlementAt, promoDaysLeft, type Entitlement } from './entitlement'
import { isLiveEnvironment } from './figmaSync'

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
  /** True once the server has answered; false while showing the fallback. */
  confirmed: boolean
}

function view(e: Entitlement, confirmed: boolean): EntitlementView {
  const now = new Date(Date.now() + skewMs)
  return { ...e, daysLeft: e.promo ? promoDaysLeft(now, e.promoEndsAt) : 0, confirmed }
}

export function useEntitlement(): EntitlementView {
  const [state, setState] = useState<EntitlementView>(() => view(entitlementAt(new Date()), false))
  useEffect(() => {
    if (!isLiveEnvironment()) return
    let cancelled = false
    fetchEntitlement().then((data) => {
      if (!cancelled && data) setState(view(data, true))
    })
    return () => { cancelled = true }
  }, [])
  return state
}
