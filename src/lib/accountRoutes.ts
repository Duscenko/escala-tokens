// One account home. `/account` is the page. Older paths still match so a
// bookmark opens the section it named; the page then shows that section.

export const ACCOUNT_SECTIONS = ['profile', 'verification', 'security', 'password'] as const
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number]

/** The part of the home a link asked to open. `plan` is the licence dialog.
 *  The email address is shown and never edited. */
export type AccountFocus = 'name' | 'password' | 'plan'

export function accountHref(): string {
  return '/account'
}

export function matchAccountPath(pathname: string): AccountSection | 'unknown' | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/account' || path === '/account/profile') return 'profile'
  if (path === '/account/verification') return 'verification'
  if (path === '/account/security') return 'security'
  if (path === '/account/password') return 'password'
  if (path.startsWith('/account/')) return 'unknown'
  return null
}

/** Which block to open. A hash on an account path wins; an older path names one. */
export function accountFocus(pathname: string, hash: string): AccountFocus | null {
  const section = matchAccountPath(pathname)
  if (section === null) return null
  const id = hash.replace(/^#/, '')
  if (id === 'name' || id === 'password' || id === 'plan') return id
  if (section === 'security' || section === 'password') return 'password'
  return null
}
