// `/login` — one page for log in, create account and password reset.
//
// Laid out like Create UI's sign-in: a slim header, the form in the left column
// (heading · social buttons · OR · email form · terms line) and a product card on
// the right that hides below `lg`. Accounts are OPTIONAL and the configurator
// never waits on this page; it only exists for saving in the cloud and tying a
// Pro licence to a person (design-plans/accounts-and-login.md).
//
// While accounts are off (`accountsEnabled`, see lib/supabase.ts) the route
// sends everyone straight back to the configurator, so a production visitor can
// never reach a form that has nowhere to post.

import { useEffect, useId, useRef, useState } from 'react'
import { BrandMark, DocsNavMenu, type DocsMenuPage } from '../configurator/TopNav'
import { useI18n } from '../../lib/i18n'
import {
  MIN_PASSWORD,
  requestPasswordReset,
  setNewPassword,
  signInWithEmail,
  signInWithProvider,
  signOut,
  signUpWithEmail,
  useAuth,
  type AuthProblem,
} from '../../lib/auth'
import { applyDocumentHead } from '../../lib/documentHead'
import { CONTACT_PATH, LOGIN_PATH, PRIVACY_PATH, TERMS_PATH } from '../../lib/legal'
import { accountsEnabled, authProviders, type AuthProvider } from '../../lib/supabase'

const DOCS_PAGE_PATH: Record<DocsMenuPage, string> = {
  mcp: '/docs/mcp',
  figma: '/docs/figma',
  changelog: '/docs/changelog',
  faq: '/docs/faq',
}

type Mode = 'signin' | 'signup' | 'reset' | 'recovery'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
const FIELD = `h-11 w-full rounded-lg border border-line-strong bg-app px-3 text-ui text-fg placeholder:text-fg-faint ${FOCUS}`
/** Same type and ink as TopNav's inactive section items. */
const NAV_LINK = 'rounded-md px-0.5 py-1 text-ui font-medium whitespace-nowrap text-fg-faint transition-colors hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app'
const LINK = `text-accent-ui underline-offset-2 hover:underline rounded-sm ${FOCUS}`

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 flex-shrink-0">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LoginPage() {
  const { t } = useI18n()
  const { user, loading, event } = useAuth()
  const titleId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | 'short_password' | null>(null)
  const [done, setDone] = useState<string | null>(null)

  // A reset link lands here with a recovery session; show "choose a password".
  const recovering = event === 'PASSWORD_RECOVERY' && mode !== 'recovery'
  const view: Mode = recovering ? 'recovery' : mode

  useEffect(() => {
    applyDocumentHead({
      title: `${t('Log in')} — Escala Tokens`,
      description: t('Optional. You only need an account to save in the cloud and to use your Pro licence.'),
      canonicalPath: LOGIN_PATH,
      robots: 'noindex, nofollow',
    })
  }, [t])

  // Accounts off, or already signed in (and not mid-recovery): nothing to do here.
  useEffect(() => {
    if (!accountsEnabled) window.location.replace('/')
  }, [])

  useEffect(() => {
    if (done) return
    ;(view === 'recovery' ? passwordRef : emailRef).current?.focus()
  }, [view, done, loading])

  if (!accountsEnabled) return null

  function go(next: Mode) {
    setMode(next)
    setProblem(null)
    setDone(null)
    setPassword('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const address = email.trim()
    if (view !== 'recovery' && !address) return
    if ((view === 'signup' || view === 'recovery') && password.length < MIN_PASSWORD) { setProblem('short_password'); return }
    if (view === 'signin' && !password) return
    setBusy(true)
    setProblem(null)

    if (view === 'signin') {
      const r = await signInWithEmail(address, password)
      setBusy(false)
      if (r.ok) window.location.assign('/')
      else setProblem(r.problem)
    } else if (view === 'signup') {
      const r = await signUpWithEmail(address, password)
      setBusy(false)
      if (!r.ok) setProblem(r.problem)
      else if (r.value.needsConfirmation) setDone(t('We sent a confirmation link to {email}. Open it to finish creating your account.', { email: address }))
      else window.location.assign('/')
    } else if (view === 'reset') {
      const r = await requestPasswordReset(address)
      setBusy(false)
      if (!r.ok) setProblem(r.problem)
      else setDone(t('If an account exists for {email}, we sent a link to reset the password.', { email: address }))
    } else {
      const r = await setNewPassword(password)
      setBusy(false)
      if (!r.ok) setProblem(r.problem)
      else window.location.assign('/')
    }
  }

  async function social(provider: AuthProvider) {
    setProblem(null)
    const r = await signInWithProvider(provider)
    if (!r.ok) setProblem(r.problem)
  }

  const message =
    problem === 'invalid_credentials' ? t('Wrong email or password.')
    : problem === 'email_not_confirmed' ? t('Confirm your email first. Check your inbox.')
    : problem === 'weak_password' || problem === 'short_password' ? t('Use at least {n} characters.', { n: MIN_PASSWORD })
    : problem === 'rate_limited' ? t('Too many attempts. Try again in a few minutes.')
    : problem === 'unavailable' ? t('Something went wrong. Try again in a moment.')
    : null

  const heading =
    view === 'signup' ? t('Create your account')
    : view === 'reset' ? t('Reset your password')
    : view === 'recovery' ? t('Choose a new password')
    : t('Welcome to Escala')
  const sub =
    view === 'signup' ? t('Optional. You only need an account to save in the cloud and to use your Pro licence.')
    : view === 'reset' ? t('Enter your email and we will send you a link to choose a new password.')
    : view === 'recovery' ? null
    : t('Log in or create an account. The configurator works without one.')
  const cta =
    view === 'signup' ? t('Create account')
    : view === 'reset' ? t('Send reset link')
    : view === 'recovery' ? t('Save password')
    : t('Log in')

  const showSocial = authProviders.length > 0 && (view === 'signin' || view === 'signup') && !done

  return (
    <div className="flex min-h-screen flex-col bg-app text-fg">
      <header className="flex h-[72px] flex-shrink-0 items-center justify-between px-6 lg:px-10">
        <a href="/" className={`flex items-center gap-2.5 rounded-md ${FOCUS}`}>
          <BrandMark size={28} />
          <span className="text-strong font-semibold">Escala Tokens</span>
        </a>
        <nav aria-label={t('Sections')} className="flex items-center gap-5">
          <a href="/" className={NAV_LINK}>{t('Home')}</a>
          <DocsNavMenu onOpenDocsPage={(page) => window.location.assign(DOCS_PAGE_PATH[page])} />
          <a href={CONTACT_PATH} className={NAV_LINK}>{t('Need help?')}</a>
        </nav>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10 lg:px-10">
        <div className="grid w-full max-w-[1000px] items-center gap-12 lg:grid-cols-[minmax(0,436px)_minmax(0,1fr)] lg:gap-20">
          <section aria-labelledby={titleId} className="flex w-full max-w-[436px] flex-col gap-6 justify-self-center lg:justify-self-start">
            {user && !recovering ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h1 id={titleId} className="text-heading font-semibold text-fg">{t('You are logged in')}</h1>
                  <p className="mt-2 text-ui leading-relaxed text-fg-muted">{t('Signed in as')} <span className="text-fg">{user.email}</span></p>
                </div>
                <a
                  href="/"
                  className={`flex min-h-11 items-center justify-center rounded-lg bg-accent-solid px-4 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90 ${FOCUS}`}
                >
                  {t('Open the configurator')}
                </a>
                <button type="button" onClick={() => void signOut()} className={`self-start text-ui ${LINK}`}>{t('Log out')}</button>
              </div>
            ) : (
              <>
                <div>
                  <h1 id={titleId} className="text-heading font-semibold text-fg">{done ? t('Check your email') : heading}</h1>
                  {!done && sub && <p className="mt-2 text-ui leading-relaxed text-fg-muted">{sub}</p>}
                </div>

                {done ? (
                  <div className="flex flex-col gap-4">
                    <p role="status" className="text-ui leading-relaxed text-fg-muted">{done}</p>
                    <button type="button" onClick={() => go('signin')} className={`self-start text-ui ${LINK}`}>{t('Back to log in')}</button>
                  </div>
                ) : (
                  <>
                    {showSocial && (
                      <div className="flex flex-col gap-2.5">
                        {authProviders.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => void social(p)}
                            className={`flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-line-strong bg-elevated text-ui font-semibold text-fg transition-colors hover:border-fg/40 ${FOCUS}`}
                          >
                            {p === 'google' ? <GoogleMark /> : <GithubMark />}
                            {p === 'google' ? t('Continue with Google') : t('Continue with GitHub')}
                          </button>
                        ))}
                        <div className="my-1.5 flex items-center gap-4 text-caption text-fg-faint" aria-hidden>
                          <span className="h-px flex-1 bg-line" />
                          {t('OR')}
                          <span className="h-px flex-1 bg-line" />
                        </div>
                      </div>
                    )}

                    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
                      {view !== 'recovery' && (
                        <label className="flex flex-col gap-1.5">
                          <span className="text-body font-medium text-fg">{t('Email address')}</span>
                          <input
                            ref={emailRef}
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="you@studio.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={FIELD}
                          />
                        </label>
                      )}
                      {view !== 'reset' && (
                        <label className="flex flex-col gap-1.5">
                          <span className="text-body font-medium text-fg">{view === 'recovery' ? t('New password') : t('Password')}</span>
                          <input
                            ref={passwordRef}
                            type="password"
                            autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-describedby={message ? `${titleId}-err` : undefined}
                            className={FIELD}
                          />
                        </label>
                      )}
                      {message && <p id={`${titleId}-err`} role="alert" className="text-body text-status-danger">{message}</p>}

                      <button
                        type="submit"
                        disabled={busy}
                        className={`mt-1 flex min-h-11 items-center justify-center rounded-lg bg-accent-solid px-4 text-ui font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS}`}
                      >
                        {cta}
                      </button>
                    </form>

                    <div className="flex flex-col gap-2 text-body text-fg-muted">
                      {view === 'signin' && (
                        <>
                          <button type="button" onClick={() => go('reset')} className={`self-start ${LINK}`}>{t('Forgot your password?')}</button>
                          <button type="button" onClick={() => go('signup')} className={`self-start ${LINK}`}>{t('No account yet? Create one')}</button>
                        </>
                      )}
                      {view === 'signup' && (
                        <button type="button" onClick={() => go('signin')} className={`self-start ${LINK}`}>{t('Already have an account? Log in')}</button>
                      )}
                      {view === 'reset' && (
                        <button type="button" onClick={() => go('signin')} className={`self-start ${LINK}`}>{t('Back to log in')}</button>
                      )}
                    </div>

                    <p className="text-center text-caption leading-relaxed text-fg-faint">
                      {t('By continuing, you accept the')}{' '}
                      <a href={TERMS_PATH} className={LINK}>{t('Terms')}</a>{' '}
                      {t('and the')}{' '}
                      <a href={PRIVACY_PATH} className={LINK}>{t('Privacy')}</a>.
                    </p>
                  </>
                )}
              </>
            )}
          </section>

          <aside aria-hidden className="hidden lg:block">
            <div className="flex aspect-[4/5] max-w-[440px] flex-col justify-between rounded-[28px] bg-accent-solid p-9 text-accent-ink">
              <p className="text-[34px] font-semibold leading-[1.1] tracking-tight">
                {t('Your own token system. Free to build. Pro when it has to stay in sync.')}
              </p>
              <ul className="flex flex-col gap-3 text-ui font-medium">
                {[
                  t('Save systems and themes in the cloud'),
                  t('Hosted Figma sync'),
                  t('Live MCP for your AI agents'),
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5"><Check />{line}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <footer className="flex-shrink-0 px-6 py-6 text-center text-caption text-fg-faint">
        © 2026 Escala Tokens
      </footer>
    </div>
  )
}
