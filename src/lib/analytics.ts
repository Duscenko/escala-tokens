import { track } from '@vercel/analytics/react'
import type { BeforeSendEvent } from '@vercel/analytics/react'

// Product analytics — the ONE place the app reports what people do.
//
// Privacy contract (keep it true; the Legal & data copy in AboutMenu states it):
// - Vercel Web Analytics is cookieless: no cookie, no localStorage id, no
//   cross-site tracking. A visitor is a daily-rotating hash Vercel computes
//   server-side, so nothing here needs a consent banner (CNIL audience-
//   measurement exemption) as long as it stays anonymous.
// - Events carry ENUMS ONLY. Never a project name, a publish ID, a repo, a hex,
//   a theme the user named, an email — nothing typed by a person. The property
//   types below are closed unions so a free string can't slip in.
// - URLs are scrubbed before sending (`scrubUrl`): `?project=` is a publish ID,
//   and a publish ID is a read capability for that system's tokens.

export type AnalyticsEvent =
  | { name: 'export'; props: { destination: 'escala' | 'w3c' | 'agent-bundle' | 'css' | 'scss' | 'tailwind' | 'md' | 'skill' | 'other' } }
  | { name: 'github_handoff'; props?: undefined }
  | { name: 'github_push'; props: { result: 'ok' | 'error' } }
  | { name: 'figma_publish'; props: { result: 'ok' | 'error' } }
  | { name: 'plugin_open'; props: { update: 'yes' | 'no' } }
  | { name: 'style_adopt'; props: { style: string } }
  | { name: 'system_save'; props: { scope: 'system' | 'theme' } }

/** Throttle window for events that can fire in bursts (auto-sync republishes
 *  ~1.5s after every edit). One per window per tab is plenty to count usage
 *  and keeps the event bill flat. */
const BURST_MS = 10 * 60_000
const lastSent = new Map<string, number>()

export function trackEvent(e: AnalyticsEvent, opts: { throttle?: boolean } = {}): void {
  try {
    if (opts.throttle) {
      const key = `${e.name}:${JSON.stringify(e.props ?? {})}`
      const now = Date.now()
      const prev = lastSent.get(key)
      if (prev !== undefined && now - prev < BURST_MS) return
      lastSent.set(key, now)
    }
    track(e.name, e.props)
  } catch {
    // Analytics must never break a user action.
  }
}

const SENSITIVE_PARAMS = ['project', 'code', 'state', 'token', 'claim']

export function scrubUrl(raw: string): string {
  try {
    const url = new URL(raw)
    for (const p of SENSITIVE_PARAMS) url.searchParams.delete(p)
    return url.toString()
  } catch {
    return raw.split('?')[0]
  }
}

export function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  return { ...event, url: scrubUrl(event.url) }
}
