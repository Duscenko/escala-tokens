// `/plugin?code=` — the page the Figma plugin opens for sign-in.
//
// The plugin cannot hold the website's session. It opens this URL; if there
// is no account yet, we go through `/login` and come back. Confirming binds
// the code to the account and sends the libraries stored in this browser.

import { useEffect, useState, type MouseEvent } from 'react'
import { BrandMark } from '../configurator/TopNav'
import { FigmaLogo } from '../configurator/figmaShared'
import { useAuth } from '../../lib/auth'
import { applyDocumentHead } from '../../lib/documentHead'
import { loginHref, pathForNext, rememberReturn } from '../../lib/loginReturn'
import { approvePluginSignIn, librariesOnThisBrowser, PLUGIN_CODE_KEY } from '../../lib/pluginAccount'
import { isPluginPairCode } from '../../lib/pluginSession'
import { accountsEnabled } from '../../lib/supabase'
import { useI18n } from '../../lib/i18n'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
const SECONDARY = `flex h-11 w-full items-center justify-center rounded-2xl border border-line-strong px-4 text-ui font-medium text-fg transition-colors hover:bg-elevated ${FOCUS}`
const PRIMARY = `flex h-12 w-full items-center justify-center rounded-2xl bg-fg px-4 text-ui font-semibold text-app transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS}`

const FIGMA_WEB = 'https://www.figma.com/files'

// The plugin is already open in the Figma window and polls for this
// confirmation. `figma://` only asks the desktop app to come forward — it
// cannot open the plugin, and the file browser on the web is a different
// place, so it is never opened automatically. The button changes label in
// the same click; the short wait only decides whether to say the app
// didn't come forward.

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
  const [libraries] = useState(librariesOnThisBrowser)
  const [phase, setPhase] = useState<'ask' | 'working' | 'done' | 'error'>('ask')
  const [error, setError] = useState('')
  const [figmaReturn, setFigmaReturn] = useState<'idle' | 'opening' | 'stuck'>('idle')

  useEffect(() => {
    applyDocumentHead({
      title: `${t('Connect Figma')} — Escala Tokens`,
      description: t('Sign in so the Figma plugin can list your folders and sync.'),
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
    const result = await approvePluginSignIn(code, libraries)
    if (!result.ok) {
      setPhase('error')
      setError(result.error)
      return
    }
    try { window.sessionStorage.removeItem(PLUGIN_CODE_KEY) } catch { /* ignore */ }
    setPhase('done')
  }

  function goToFigma(e: MouseEvent) {
    e.preventDefault()
    setFigmaReturn('opening')
    let left = false
    const markHidden = () => {
      if (document.visibilityState === 'hidden') left = true
    }
    const markBlur = () => { left = true }
    document.addEventListener('visibilitychange', markHidden)
    window.addEventListener('blur', markBlur)
    window.location.href = 'figma://'
    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', markHidden)
      window.removeEventListener('blur', markBlur)
      if (!left && document.visibilityState === 'visible') setFigmaReturn('stuck')
    }, 700)
  }

  const home = pathForNext('library')
  const waitingForAccount = !!code && (loading || !user)

  return (
    <div className="flex min-h-screen flex-col bg-app text-fg">
      <header className="flex h-14 items-center px-5">
        <a href={home} className={`flex items-center gap-2 ${FOCUS}`} aria-label="Escala">
          <BrandMark />
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-5 pb-16">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center gap-3" aria-hidden>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-app"><BrandMark size={24} /></span>
            <span className={`h-px flex-1 ${phase === 'done' ? 'bg-status-success-solid' : 'bg-line-strong'}`} />
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-app"><FigmaLogo size={24} /></span>
          </div>

          {!code ? (
            <>
              <h1 className="mt-6 text-heading font-semibold">{t('Open this from the plugin')}</h1>
              <p className="mt-2 text-ui leading-relaxed text-fg-muted">
                {t('In Figma, open the Escala plugin and press Sign in. This page confirms that sign-in.')}
              </p>
              <a href={home} className={`mt-6 ${PRIMARY}`}>{t('Open Escala')}</a>
            </>
          ) : phase === 'done' ? (
            <>
              <h1 className="mt-6 flex items-center gap-2 text-heading font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-status-success-solid text-white" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {t('Plugin connected')}
              </h1>
              <p className="mt-2 text-ui leading-relaxed text-fg-muted">
                {libraries.length === 1
                  ? t('Switch back to the Figma window. The plugin picks this up as soon as that window is in front, and starts syncing “{name}” if the file is empty. A file that already has a system stays as it is. You can close this tab.', { name: libraries[0].name || libraries[0].id })
                  : libraries.length > 1
                    ? t('Switch back to the Figma window and press Sync on the folder you want. The plugin is already connected. You can close this tab.')
                    : t('Switch back to the Figma window. You’re signed in. Create a theme there, or publish a folder on the web and it will show up. You can close this tab.')}
              </p>
              {figmaReturn === 'stuck' ? (
                <p className="mt-3 text-caption leading-relaxed text-fg-muted" role="status">
                  {t('Figma didn’t come forward. Click the Figma window — the Escala plugin is already open there and starts on its own. Opening Figma in the browser only shows your files and does not start the plugin.')}
                </p>
              ) : null}
              <button type="button" onClick={goToFigma} className={`mt-6 ${PRIMARY}`}>
                {figmaReturn === 'opening'
                  ? t('Opening Figma…')
                  : figmaReturn === 'stuck'
                    ? t('Try the Figma app again')
                    : t('Go to Figma')}
              </button>
              <a href={FIGMA_WEB} target="_blank" rel="noopener noreferrer" className={`mt-2 ${SECONDARY}`}>{t('Open Figma in the browser')}</a>
              <a href="/docs/figma" className={`mt-2 ${SECONDARY}`}>{t('How Figma sync works')}</a>
            </>
          ) : waitingForAccount ? (
            <>
              <h1 className="mt-6 text-heading font-semibold">{t('Connect the Figma plugin')}</h1>
              <p className="mt-2 text-ui leading-relaxed text-fg-muted" role="status">{t('Taking you to sign in…')}</p>
            </>
          ) : (
            <>
              <h1 className="mt-6 text-heading font-semibold">{t('Connect the Figma plugin')}</h1>
              <p className="mt-2 text-ui leading-relaxed text-fg-muted">
                {t('Only continue if you just pressed Sign in in the Escala plugin.')}
              </p>

              <dl className="mt-5 divide-y divide-line rounded-xl border border-line text-ui">
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <dt className="text-fg-muted">{t('Account')}</dt>
                  <dd className="truncate font-medium">{user?.email}</dd>
                </div>
                <div className="px-3.5 py-2.5">
                  <dt className="text-fg-muted">{t('Folders the plugin will list')}</dt>
                  <dd className="mt-1.5">
                    {libraries.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {libraries.map((lib) => (
                          <li key={lib.id} className="max-w-full truncate rounded-md bg-elevated px-2 py-0.5 text-caption">{lib.name || lib.id}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-caption text-fg-faint">{t('None yet — you can create one after connecting.')}</span>
                    )}
                  </dd>
                </div>
              </dl>

              {phase === 'error' ? (
                <p className="mt-3 text-caption text-status-danger" role="alert">
                  {error} {t('If it keeps failing, press Sign in in the plugin again.')}
                </p>
              ) : null}
              <button
                type="button"
                className={`mt-6 ${PRIMARY}`}
                disabled={loading || !user || phase === 'working'}
                onClick={() => { void connect() }}
              >
                {phase === 'working' ? t('Connecting…') : phase === 'error' ? t('Try again') : t('Connect plugin')}
              </button>
              <a href={home} className={`mt-2 ${SECONDARY}`}>{t('Cancel')}</a>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
