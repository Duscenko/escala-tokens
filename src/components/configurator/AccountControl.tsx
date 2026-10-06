import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { signOut, useAuth } from '../../lib/auth'
import { LOGIN_PATH } from '../../lib/legal'
import { accountsEnabled } from '../../lib/supabase'
import { useDesignStore } from '../../store/useDesignStore'

// TopNav's account entry: a "Sign in" link to /login when signed out, an initial
// that opens a small menu (email · Sign out) when signed in. Renders NOTHING
// while accounts are off (`accountsEnabled`), so the production header is
// unchanged until ACCOUNTS_LIVE flips. The login itself is a page, not a dialog.

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

export default function AccountControl({ onOpenLibrary }: { onOpenLibrary?: () => void }) {
  if (!accountsEnabled) return null
  return <AccountControlInner onOpenLibrary={onOpenLibrary} />
}

function AccountControlInner({ onOpenLibrary }: { onOpenLibrary?: () => void }) {
  const savedCount = useDesignStore((s) => s.savedSystems.length)
  const { t } = useI18n()
  const { user, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  if (loading) return null

  if (!user) {
    return (
      <a
        href={LOGIN_PATH}
        className={`inline-flex h-8 flex-shrink-0 items-center rounded-lg border border-line px-3 text-body font-medium text-fg transition-colors hover:border-line-strong hover:bg-elevated ${FOCUS}`}
      >
        {t('Sign in')}
      </a>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('Account')}
        title={user.email ?? t('Account')}
        className={`grid h-8 w-8 place-items-center rounded-full border border-line bg-elevated text-ui font-semibold uppercase text-fg transition-colors hover:border-line-strong ${FOCUS}`}
      >
        {(user.email ?? '?').charAt(0)}
      </button>
      {menuOpen && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-line bg-app p-2 shadow-2xl">
          <div className="px-2.5 py-2">
            <p className="text-caption text-fg-faint">{t('Signed in as')}</p>
            <p className="truncate text-ui font-medium text-fg">{user.email}</p>
          </div>
          {onOpenLibrary && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onOpenLibrary() }}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-ui text-fg transition-colors hover:bg-elevated ${FOCUS}`}
            >
              {t('Saved libraries')}
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
    </div>
  )
}
