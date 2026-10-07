// `/plugin?code=` — the page the Figma plugin opens for sign-in.
//
// The plugin cannot hold the website's session. It opens this URL; if there
// is no account yet, we go through `/login` and come back. Confirming binds
// the code to the account and sends the libraries stored in this browser.

import { useEffect, useState } from 'react'
import { BrandMark } from '../configurator/TopNav'
import { useAuth } from '../../lib/auth'
import { applyDocumentHead } from '../../lib/documentHead'
import { loginHref, pathForNext, rememberReturn } from '../../lib/loginReturn'
import { approvePluginSignIn, librariesOnThisBrowser, PLUGIN_CODE_KEY } from '../../lib/pluginAccount'
import { isPluginPairCode } from '../../lib/pluginSession'
import { accountsEnabled } from '../../lib/supabase'
import { useI18n } from '../../lib/i18n'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
const PRIMARY = `flex h-12 w-full items-center justify-center rounded-2xl bg-fg px-4 text-ui font-semibold text-app transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS}`

function readCode(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('code') ?? ''
  if (isPluginPairCode(fromUrl)) {
    try { window.sessionStorage.setItem(PLUGIN_CODE_KEY, fromUrl.trim().toUpperCase()) } catch { /* ignore */ }
    return fromUrl.trim().toUpperCase()
  }
  try {
    const stored = window.sessionStorage.getItem(PLUGIN_CODE_KEY) ?? ''
    return isPluginPairCode(stored) ? stored.trim().toUpperCase() : ''
  } catch {
    return ''
  }
}

export function PluginConnectPage() {
  const { t } = useI18n()
  const { user, loading } = useAuth()
  const [code] = useState(readCode)
  const [phase, setPhase] = useState<'ask' | 'working' | 'done' | 'error'>('ask')
  const [error, setError] = useState('')

  useEffect(() => {
    applyDocumentHead({
      title: `${t('Connect Figma')} — Escala Tokens`,
      description: t('Sign in so the Figma plugin can list your libraries and sync.'),
      canonicalPath: '/plugin',
      robots: 'noindex, nofollow',
    })
  }, [t])

  useEffect(() => {
    if (!accountsEnabled) window.location.replace('/')
  }, [])

  useEffect(() => {
    if (loading || user || !code) return
    rememberReturn('plugin')
    window.location.assign(loginHref({ next: 'plugin' }))
  }, [loading, user, code])

  async function connect() {
    if (!code || phase === 'working') return
    setPhase('working')
    setError('')
    const result = await approvePluginSignIn(code, librariesOnThisBrowser())
    if (!result.ok) {
      setPhase('error')
      setError(result.error)
      return
    }
    try { window.sessionStorage.removeItem(PLUGIN_CODE_KEY) } catch { /* ignore */ }
    setPhase('done')
  }

  return (
    <div className="flex min-h-screen flex-col bg-app text-fg">
      <header className="flex h-14 items-center px-5">
        <a href={pathForNext(null)} className={`flex items-center gap-2 ${FOCUS}`} aria-label="Escala">
          <BrandMark />
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        {!code ? (
          <>
            <h1 className="text-heading font-semibold">{t('Open this from the plugin')}</h1>
            <p className="mt-2 text-ui leading-relaxed text-fg-muted">
              {t('In Figma, open the Escala plugin and press Sign in. This page confirms that sign-in.')}
            </p>
          </>
        ) : phase === 'done' ? (
          <>
            <h1 className="text-heading font-semibold">{t('Plugin connected')}</h1>
            <p className="mt-2 text-ui leading-relaxed text-fg-muted">
              {t('Return to Figma. Your libraries are there — press Sync to start, Pause to stop.')}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-heading font-semibold">{t('Connect the Figma plugin')}</h1>
            <p className="mt-2 text-ui leading-relaxed text-fg-muted">
              {t('Only continue if you just pressed Sign in in the Escala plugin. This account’s libraries will show up there.')}
            </p>
            {user?.email ? (
              <p className="mt-4 truncate text-caption text-fg-faint">{user.email}</p>
            ) : null}
            {phase === 'error' ? (
              <p className="mt-3 text-caption text-status-danger" role="alert">{error}</p>
            ) : null}
            <button
              type="button"
              className={`mt-6 ${PRIMARY}`}
              disabled={loading || !user || phase === 'working'}
              onClick={() => { void connect() }}
            >
              {phase === 'working' ? t('Connecting…') : t('Connect')}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
