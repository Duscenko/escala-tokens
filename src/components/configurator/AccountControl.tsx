import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '../../lib/i18n'
import { accountHref } from '../../lib/accountRoutes'
import { displayNameOf, initialOf, signOut, useAuth, useSigningOut } from '../../lib/auth'
import { loginHref, rememberReturn } from '../../lib/loginReturn'
import { accountsEnabled } from '../../lib/supabase'
import { useDesignStore } from '../../store/useDesignStore'
import { useSavedBrandKeys } from '../../lib/libraryStatus'
import { useLicence, type LicenceStatus } from '../../lib/licence'
import { consumeLicenceReturn, lookupPurchase } from '../../lib/licencePurchase'
import { LicenceModal } from './LicenceModal'
import { OPEN_BETA } from '../../lib/entitlement'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'

/** The tile is `h-6 w-6` = 1.5rem = 27px at the 18px root, × `AVATAR_RADIUS`
 *  (8/31). Inlined, not imported: ThemeLibraryRail pulls half the workspace in,
 *  and this header control must not. */
const AVATAR_TILE_RADIUS = 27 * (8 / 31)

// TopNav's account entry: "Sign in" + "Create account" when signed out — never
// "Sign in" beside "Sign up", two labels one letter apart that people mix up —
// and an initial
// that opens a small menu (email · Sign out) when signed in. Renders NOTHING
// while accounts are off (`accountsEnabled`), so the production header is
// unchanged until ACCOUNTS_LIVE flips. The login itself is a page, not a dialog.

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app'
/** Closing the paste dialog silences the automatic open for this tab only.
 *  A new visit asks again until the key is valid. */
const PROMPT_DISMISS = 'sd-licence-prompt'

function promptDismissed(): boolean {
  try { return sessionStorage.getItem(PROMPT_DISMISS) === '1' } catch { return false }
}

function dismissPrompt(): void {
  try { sessionStorage.setItem(PROMPT_DISMISS, '1') } catch { /* private mode */ }
}

function needsKey(status: LicenceStatus): boolean {
  return status === 'none' || status === 'expired' || status === 'invalid'
}

interface AccountControlProps {
  onOpenLibrary?: () => void
  /** Re-declares `--accent-solid` / `--accent-ink` for the Sign up button, so it
   *  wears the brand being edited (already solved for contrast by the shell). */
  signUpAccent?: CSSProperties
  /** Another filled primary (Export, Go to generator) sits beside this control:
   *  Sign up steps back to an outline so the bar has ONE solid action. A guest
   *  can try and export without an account — the account only keeps the work. */
  quiet?: boolean
}

export default function AccountControl({ onOpenLibrary, signUpAccent, quiet }: AccountControlProps) {
  if (!accountsEnabled) return null
  return <AccountControlInner onOpenLibrary={onOpenLibrary} signUpAccent={signUpAccent} quiet={quiet} />
}

function AccountControlInner({ onOpenLibrary, signUpAccent, quiet }: AccountControlProps) {
  const savedCount = useDesignStore((s) => s.savedSystems.length)
  // A guest's brands live only in this browser. Signing UP is the way to keep
  // them, so it carries the save intent and returns to the workspace; with
  // nothing made yet it lands on the new account's Home.
  const guestBrandCount = useSavedBrandKeys().length
  const { t } = useI18n()
  const { user, loading } = useAuth()
  const signingOut = useSigningOut((s) => s.signingOut)
  // PRO on this chip is a bought licence only. Promo / launch entitlements
  // still unlock product features, but they are not a paid plan to badge.
  const { status: licenceStatus } = useLicence()
  const [menuOpen, setMenuOpen] = useState(false)
  const [licenceOpen, setLicenceOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (consumeLicenceReturn()) setLicenceOpen(true)
  }, [])

  useEffect(() => {
    const email = user?.email
    // Open beta: nothing to buy, so never prompt for a key.
    if (OPEN_BETA || loading || !email || !needsKey(licenceStatus)) return
    let cancel = false
    const ask = () => {
      if (cancel || promptDismissed()) return
      void lookupPurchase(email).then((purchased) => {
        if (!cancel && purchased && !promptDismissed()) setLicenceOpen(true)
      })
    }
    ask()
    window.addEventListener('focus', ask)
    return () => {
      cancel = true
      window.removeEventListener('focus', ask)
    }
  }, [loading, user?.email, licenceStatus])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const closeLicence = () => { dismissPrompt(); setLicenceOpen(false) }
  const licenceDialog = licenceOpen ? <LicenceModal onClose={closeLicence} /> : null

  if (loading) return licenceDialog

  if (!user) {
    const keepsWork = guestBrandCount > 0
    return (
      <>
        <a
          href={loginHref({ next: 'library' })}
          onClick={() => rememberReturn('library')}
          className={`inline-flex h-8 flex-shrink-0 items-center rounded-lg px-2.5 text-body font-medium text-fg-muted transition-colors hover:text-fg ${FOCUS_RING}`}
        >
          {t('Sign in')}
        </a>
        <a
          href={loginHref({ next: keepsWork ? 'workspace' : 'library', mode: 'signup' })}
          onClick={() => (keepsWork ? rememberReturn('workspace', 'save-library') : rememberReturn('library'))}
          title={keepsWork ? t('Save your work with a free account') : undefined}
          style={quiet ? undefined : { backgroundColor: 'var(--rainbow-fill-a)', color: 'var(--rainbow-ink)' }}
          className={`inline-flex h-8 flex-shrink-0 items-center rounded-lg px-3 text-body font-semibold ${FOCUS_RING} ${
            quiet
              ? 'border border-line-strong text-fg transition-colors hover:bg-elevated'
              : 'transition-[filter] hover:brightness-110'
          }`}
        >
          {t('Create account')}
        </a>
        {licenceDialog}
      </>
    )
  }

  const licensed = licenceStatus === 'valid'
  const planLabel = OPEN_BETA ? t('Beta') : licensed ? 'PRO' : t('Free')
  const initial = initialOf(user)
  const name = displayNameOf(user)

  // Leaving saves to the account first: the chip says so the moment Sign out
  // is pressed, instead of the header sitting still for seconds.
  if (signingOut) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex h-8 flex-shrink-0 items-center gap-2 rounded-lg px-2.5 text-caption font-medium text-fg-muted ${CHROME_CONTROL_SHELL}`}
      >
        <span aria-hidden className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
        {t('Saving and signing out…')}
      </span>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`${t('Account')} — ${planLabel}`}
        title={name || user.email || t('Account')}
        className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-lg p-1 pr-2 text-fg-muted transition-[color,box-shadow] ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app`}
      >
        {/* Same chip as ☰ / appearance: nested tile is elevated chrome, not
            the canvas `--app`. Radius = outer 8 − inset 4. */}
        <span
          className="grid h-6 w-6 flex-shrink-0 place-items-center border border-line bg-elevated text-caption font-semibold uppercase leading-none text-fg"
          // The theme chip's avatar corner (`ThemeAvatar`: 8/31 of its box), so
          // the two 24px tiles in the header share one proportion.
          style={{ borderRadius: AVATAR_TILE_RADIUS }}
        >
          {initial}
        </span>
        <span className={`text-caption font-semibold leading-none ${licensed ? 'text-accent-ui' : 'text-current'}`}>
          {planLabel}
        </span>
      </button>
      {menuOpen && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-line bg-app p-2 shadow-2xl">
          <div className="px-2.5 py-2">
            <p className="text-caption text-fg-faint">{t('Signed in as')}</p>
            <p className="truncate text-ui font-medium text-fg">{name || user.email}</p>
            {name && <p className="truncate text-caption text-fg-faint">{user.email}</p>}
          </div>
          <a role="menuitem" href={accountHref()} className={`rounded-lg px-2.5 py-2 text-ui text-fg transition-colors hover:bg-elevated ${FOCUS}`}>{t('Account')}</a>
          {onOpenLibrary && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onOpenLibrary() }}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-ui text-fg transition-colors hover:bg-elevated ${FOCUS}`}
            >
              {t('Saved design systems')}
              {savedCount > 0 && <span className="text-caption text-fg-faint">{savedCount}</span>}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setMenuOpen(false); void signOut() }}
            className={`rounded-lg px-2.5 py-2 text-left text-ui text-fg-muted transition-colors hover:bg-elevated hover:text-fg ${FOCUS}`}
          >
            {t('Sign out')}
          </button>
        </div>
      )}
      {licenceDialog}
    </div>
  )
}
