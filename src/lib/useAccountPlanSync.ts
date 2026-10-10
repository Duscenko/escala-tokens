import { useEffect } from 'react'
import { useAuth } from './auth'
import { ACCOUNT_RECORDED_KEY, useLicence } from './licence'
import { supabase } from './supabase'

// Escala Pro is proved by a key, and the key lives in ONE browser's HttpOnly
// cookie. The Figma plugin signs in through whichever browser the system
// opens, which is often not that one, and a paying account came back as Free.
// So a signed-in browser that holds a good key tells the server once, and the
// server records the ACCOUNT as Pro (`api/_accountPlan.ts`). Plugin sign-in
// reads that record.

const inFlight = new Set<string>()

function recordedAccount(): string | null {
  try {
    return localStorage.getItem(ACCOUNT_RECORDED_KEY)
  } catch {
    return null
  }
}

/** The licence check with the session attached: the server validates the key
 *  in the cookie and records the account. Sent until the server confirms, then
 *  not again for this account in this browser — `/api/license` is rate
 *  limited, and a second request on every page load would halve that room. */
async function recordAccountPlan(userId: string): Promise<void> {
  if (inFlight.has(userId) || recordedAccount() === userId) return
  inFlight.add(userId)
  try {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token
    if (!token) return
    const res = await fetch('/api/license', { headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json().catch(() => null) as { account?: unknown } | null
    if (body?.account === true) {
      try { localStorage.setItem(ACCOUNT_RECORDED_KEY, userId) } catch { /* asked again next load */ }
    }
  } catch {
    // Offline or blocked. The next page load asks again.
  } finally {
    inFlight.delete(userId)
  }
}

/** While someone is signed in on a browser whose key Polar accepts, make sure
 *  the account's own record of Pro exists. Mounted wherever the account shows. */
export function useAccountPlanSync(): void {
  const { user } = useAuth()
  const { status } = useLicence()
  const userId = user?.id
  useEffect(() => {
    if (userId && status === 'valid') void recordAccountPlan(userId)
  }, [userId, status])
}
