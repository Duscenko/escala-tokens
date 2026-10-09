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
  sendPasswordReset,
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
import { accountsEnabled, authProviders, supabase, type AuthProvider } from '../../lib/supabase'
import { pathForNext, pendingNext, readLoginSearch, rememberReturn } from '../../lib/loginReturn'

const DOCS_PAGE_PATH: Record<DocsMenuPage, string> = {
  mcp: '/docs/mcp',
  figma: '/docs/figma',
  changelog: '/docs/changelog',
  faq: '/docs/faq',
}

type Mode = 'signin' | 'signup' | 'reset' | 'recovery'

// Survives the dev double-mount so a recovery link is redeemed once and the
// mounted page still hears the result.
let pendingRecovery: Promise<'ok' | 'invalid'> | null = null

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
const FIELD = `h-12 w-full rounded-2xl border border-line bg-surface px-4 text-ui text-fg placeholder:text-fg-faint transition-colors hover:border-line-strong focus:border-line-strong ${FOCUS}`
/** Same type and ink as TopNav's inactive section items. */
const NAV_LINK = 'rounded-md px-0.5 py-1 text-ui font-medium whitespace-nowrap text-fg-faint transition-colors hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app'
const LINK = `rounded-sm text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline ${FOCUS}`
/** The page's one filled action: the inverse of the page (light in dark chrome). */
const PRIMARY = `flex h-12 w-full items-center justify-center rounded-2xl bg-fg px-4 text-ui font-semibold text-app transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS}`

function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

/** Decorative right panel: the product in miniature — a ramp, a synced file and
 *  the appearance switch — over a soft accent glow. Chrome tokens only, so it
 *  follows the platform accent and the light/dark chrome like everything else. */
function ShowcasePanel() {
  const { t } = useI18n()
  // Twelve tones of the platform accent: 1–8 grow out of the page, 9 is the
  // accent itself, 10–12 run toward the ink — the same shape a real ramp has.
  const ramp = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    if (n < 9) return `color-mix(in oklab, var(--accent-ui) ${Math.round(16 + (n - 1) * 10)}%, var(--app))`
    if (n === 9) return 'var(--accent-ui)'
    return `color-mix(in oklab, var(--accent-ui) ${100 - (n - 9) * 22}%, var(--fg))`
  })
  return (
    <aside aria-hidden className="relative hidden overflow-hidden rounded-[32px] border border-line bg-surface lg:block">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 32% 30%, color-mix(in srgb, var(--accent-ui) 22%, transparent), transparent 70%),' +
            'radial-gradient(ellipse 45% 40% at 82% 78%, color-mix(in srgb, var(--status-warning) 12%, transparent), transparent 70%)',
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-12">
        <div />
        <div className="flex flex-col items-center gap-14">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2.5 text-ui font-medium text-fg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
                <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
              </svg>
              tokens.json
            </span>
            <span className="flex h-10 items-center gap-2 rounded-full border border-status-success/50 px-4 text-ui font-medium text-status-success">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Figma
            </span>
          </div>
          <div className="flex w-full max-w-[360px] gap-1">
            {ramp.map((c, i) => (
              <span key={i} className={`h-10 flex-1 rounded-md ${i === 8 ? 'ring-2 ring-fg/70 ring-offset-2 ring-offset-surface' : ''}`} style={{ background: c }} />
            ))}
          </div>
          <div className="flex rounded-full border border-line bg-app/60 p-1 text-ui font-medium">
            <span className="rounded-full px-4 py-1.5 text-fg-muted">{t('Light')}</span>
            <span className="rounded-full bg-elevated px-4 py-1.5 text-fg shadow-sm">{t('Dark')}</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-strong font-medium text-fg">{t('Hosted Figma sync')}</span>
            <span className="text-ui text-fg-faint">{t('Live MCP for your AI agents')}</span>
          </div>
          <div className="h-[3px] w-full rounded-full bg-fg/10">
            <div className="h-full w-2/3 rounded-full bg-fg/70" />
          </div>
        </div>
      </div>
    </aside>
  )
}

export function LoginPage() {
  const { t, locale } = useI18n()
  const { user, loading, event } = useAuth()
  const titleId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  // `?mode=signup` opens on Create account; `?next=` is where to go afterwards
  // (closed list, see lib/loginReturn). Read once — the page never rewrites it.
  const [search] = useState(() => readLoginSearch(window.location.search))
  const [mode, setMode] = useState<Mode>(search.mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Create account and "choose a new password" ask twice: a typo there locks
  // the person out of the account they just made.
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | 'short_password' | 'password_mismatch' | 'reset_link_invalid' | null>(null)
  const [done, setDone] = useState<string | null>(null)

  // A reset link lands here with a recovery session; show "choose a password".
  const recovering = event === 'PASSWORD_RECOVERY' && mode !== 'recovery'
  const view: Mode = recovering ? 'recovery' : mode

  useEffect(() => {
    applyDocumentHead({
      title: `${t('Sign in')} — Escala Tokens`,
      description: t('Free. An account lets you see every token, export your system and save your theme.'),
      canonicalPath: LOGIN_PATH,
      robots: 'noindex, nofollow',
    })
  }, [t])

  // Accounts off, or already signed in (and not mid-recovery): nothing to do here.
  useEffect(() => {
    if (!accountsEnabled) window.location.replace('/')
  }, [])

  // Keep `next` across the OAuth round trip: GitHub returns to plain /login.
  useEffect(() => {
    if (search.next) rememberReturn(search.next)
  }, [search.next])

  // Back from OAuth, or already signed in: Home is the account entry
  // (`pathForNext(null)` → `/?section=library`). A pending `workspace` return
  // (export, save, the section they left) still wins. Recovery stays here.
  useEffect(() => {
    if (loading || !user || event === 'PASSWORD_RECOVERY' || mode === 'recovery') return
    window.location.replace(pathForNext(pendingNext()))
  }, [loading, user, event, mode])

  const afterSignIn = () => window.location.assign(pathForNext(pendingNext()))

  useEffect(() => {
    if (done) return
    ;(view === 'recovery' ? passwordRef : emailRef).current?.focus()
  }, [view, done, loading])

  // A recovery mail links here with ?token_hash=&type=recovery. Redeem it once,
  // then drop it from the address bar so a refresh cannot reuse it.
  useEffect(() => {
    if (!supabase) return
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    if (tokenHash && params.get('type') === 'recovery' && !pendingRecovery) {
      const url = new URL(window.location.href)
      url.searchParams.delete('token_hash')
      url.searchParams.delete('type')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      pendingRecovery = supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(
        ({ error }) => (error ? 'invalid' : 'ok'),
        () => 'invalid' as const,
      )
    }
    if (!pendingRecovery) return
    let live = true
    void pendingRecovery.then((result) => {
      if (!live) return
      pendingRecovery = null
      if (result === 'invalid') {
        setMode('reset')
        setProblem('reset_link_invalid')
      } else {
        setMode('recovery')
      }
    })
    return () => { live = false }
  }, [])

  // Caps Lock is only readable from a key event. While a password field is on
  // screen, any key (including Caps Lock itself) refreshes the warning.
  useEffect(() => {
    if (view === 'reset' || done) return
    const sync = (e: KeyboardEvent) => {
      if (typeof e.getModifierState !== 'function') return
      setCapsOn(e.getModifierState('CapsLock'))
    }
    window.addEventListener('keydown', sync)
    window.addEventListener('keyup', sync)
    return () => {
      window.removeEventListener('keydown', sync)
      window.removeEventListener('keyup', sync)
    }
  }, [view, done])

  if (!accountsEnabled) return null

  function go(next: Mode) {
    setMode(next)
    setProblem(null)
    setDone(null)
    setPassword('')
    setConfirm('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const address = email.trim()
    if (view !== 'recovery' && !address) return
    if ((view === 'signup' || view === 'recovery') && password.length < MIN_PASSWORD) { setProblem('short_password'); return }
    if ((view === 'signup' || view === 'recovery') && password !== confirm) { setProblem('password_mismatch'); return }
    if (view === 'signin' && !password) return
    setBusy(true)
    setProblem(null)

    if (view === 'signin') {
      const r = await signInWithEmail(address, password)
      setBusy(false)
      if (r.ok) afterSignIn()
      else setProblem(r.problem)
    } else if (view === 'signup') {
      const r = await signUpWithEmail(address, password)
      setBusy(false)
      if (!r.ok) setProblem(r.problem)
      else if (r.value.needsConfirmation) setDone(t('We sent a confirmation link to {email}. Open it to finish creating your account.', { email: address }))
      else afterSignIn()
    } else if (view === 'reset') {
      const r = await sendPasswordReset(address, locale)
      setBusy(false)
      if (!r.ok) setProblem(r.problem)
      else setDone(t('If an account exists for {email}, we sent a link to reset the password.', { email: address }))
    } else {
      const r = await setNewPassword(password)
      setBusy(false)
      if (!r.ok) setProblem(r.problem)
      else afterSignIn()
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
    : problem === 'password_mismatch' ? t('The passwords do not match.')
    : problem === 'rate_limited' ? t('Too many attempts. Try again in a few minutes.')
    : problem === 'reset_link_invalid' ? t('This reset link has expired or was already used. Send a new one.')
    : problem === 'unavailable' ? t('Something went wrong. Try again in a moment.')
    : null

  const showCaps = capsOn && view !== 'reset' && !done
  const describedBy = [
    showCaps ? `${titleId}-caps` : null,
    message ? `${titleId}-err` : null,
  ].filter(Boolean).join(' ') || undefined

  const heading =
    view === 'signup' ? t('Create your account')
    : view === 'reset' ? t('Reset your password')
    : view === 'recovery' ? t('Choose a new password')
    : t('Sign in to Escala')
  const sub =
    view === 'signup' ? t('Free. An account lets you see every token, export your system and save your theme.')
    : view === 'reset' ? t('Enter your email and we will send you a link to choose a new password.')
    : view === 'recovery' ? null
    : t('Sign in or create a free account to see every token, export and save.')
  const cta =
    view === 'signup' ? t('Create account')
    : view === 'reset' ? t('Send reset link')
    : view === 'recovery' ? t('Save password')
    : t('Sign in')

  const showSocial = authProviders.length > 0 && (view === 'signin' || view === 'signup') && !done

  return (
    <div className="grid min-h-screen bg-app text-fg lg:grid-cols-2 lg:gap-3 lg:p-3">
      <div className="flex min-h-full flex-col">
        <header className="flex h-[72px] flex-shrink-0 items-center justify-between px-6 lg:px-10">
          <a href="/" className={`flex items-center gap-2.5 rounded-md ${FOCUS}`}>
            <BrandMark size={28} />
            <span className="text-strong font-semibold">Escala Tokens</span>
          </a>
          <nav aria-label={t('Sections')} className="flex items-center gap-5">
            <a href="/" className={`${NAV_LINK} inline-flex items-center gap-1.5`}><ArrowLeft />{t('Home')}</a>
            <DocsNavMenu onOpenDocsPage={(page) => window.location.assign(DOCS_PAGE_PATH[page])} />
            <a href={CONTACT_PATH} className={NAV_LINK}>{t('Need help?')}</a>
          </nav>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-10">
          <section aria-labelledby={titleId} className="flex w-full max-w-[420px] flex-col gap-8">
            {user && view !== 'recovery' ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h1 id={titleId} className="text-[clamp(30px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">{t('You are signed in')}</h1>
                  <p className="mt-3 text-ui leading-relaxed text-fg-muted">{t('Signed in as')} <span className="text-fg">{user.email}</span></p>
                </div>
                <a href={pathForNext(pendingNext())} className={PRIMARY}>{t('Open the configurator')}</a>
                <button type="button" onClick={() => void signOut()} className={`self-center text-ui ${LINK}`}>{t('Sign out')}</button>
              </div>
            ) : (
              <>
                <div>
                  <h1 id={titleId} className="text-[clamp(30px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">{done ? t('Check your email') : heading}</h1>
                  {!done && sub && <p className="mt-3 text-ui leading-relaxed text-fg-muted">{sub}</p>}
                </div>

                {done ? (
                  <div className="flex flex-col gap-5">
                    <p role="status" className="text-ui leading-relaxed text-fg-muted">{done}</p>
                    <button type="button" onClick={() => go('signin')} className={PRIMARY}>{t('Back to sign in')}</button>
                  </div>
                ) : (
                  <>
                    {showSocial && (
                      <div className="flex flex-col gap-6">
                        <div className={`grid gap-3 ${authProviders.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {authProviders.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => void social(p)}
                              aria-label={t('Continue with GitHub')}
                              className={`flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-line bg-surface text-ui font-medium text-fg transition-colors hover:border-line-strong hover:bg-elevated ${FOCUS}`}
                            >
                              <GithubMark />
                              GitHub
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-body text-fg-faint" aria-hidden>
                          <span className="h-px flex-1 bg-line" />
                          {t('or use email')}
                          <span className="h-px flex-1 bg-line" />
                        </div>
                      </div>
                    )}

                    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                      {view !== 'recovery' && (
                        <label className="flex flex-col gap-2">
                          <span className="text-ui font-medium text-fg">{t('Email address')}</span>
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
                        <div className="flex flex-col gap-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <label htmlFor={`${titleId}-pw`} className="text-ui font-medium text-fg">
                              {view === 'recovery' ? t('New password') : t('Password')}
                            </label>
                            {view === 'signin' && (
                              <button type="button" onClick={() => go('reset')} className={`text-body ${LINK}`}>{t('Forgot your password?')}</button>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              id={`${titleId}-pw`}
                              ref={passwordRef}
                              type={showPassword ? 'text' : 'password'}
                              autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              aria-invalid={message ? true : undefined}
                              aria-describedby={describedBy}
                              className={`${FIELD} pr-12`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? t('Hide password') : t('Show password')}
                              aria-pressed={showPassword}
                              className={`absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-fg-muted transition-colors hover:text-fg ${FOCUS}`}
                            >
                              <EyeIcon off={showPassword} />
                            </button>
                          </div>
                          {showCaps && (
                            <p id={`${titleId}-caps`} role="status" className="text-caption text-status-warning">
                              {t('Caps Lock is on.')}
                            </p>
                          )}
                        </div>
                      )}
                      {(view === 'signup' || view === 'recovery') && (
                        <div className="flex flex-col gap-2">
                          <label htmlFor={`${titleId}-pw2`} className="text-ui font-medium text-fg">
                            {t('Confirm password')}
                          </label>
                          <input
                            id={`${titleId}-pw2`}
                            // Follows the eye toggle on the field above, so both
                            // read the same way while someone compares them.
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            aria-invalid={problem === 'password_mismatch' || (message ? true : undefined)}
                            aria-describedby={describedBy}
                            className={FIELD}
                          />
                        </div>
                      )}
                      {message && (
                        <div id={`${titleId}-err`} role="alert" className="flex flex-col items-start gap-1.5">
                          <p className="text-body text-status-danger">{message}</p>
                          {problem === 'invalid_credentials' && (
                            <button type="button" onClick={() => go('reset')} className={`text-body ${LINK}`}>
                              {t('Reset your password')}
                            </button>
                          )}
                        </div>
                      )}

                      <button type="submit" disabled={busy} className={`mt-1 ${PRIMARY}`}>{cta}</button>
                    </form>

                    <div className="flex flex-col items-center gap-3 text-ui">
                      {view === 'signin' && (
                        <button type="button" onClick={() => go('signup')} className={LINK}>{t('No account yet? Create one')}</button>
                      )}
                      {view === 'signup' && (
                        <button type="button" onClick={() => go('signin')} className={LINK}>{t('Already have an account? Sign in')}</button>
                      )}
                      {view === 'reset' && (
                        <button type="button" onClick={() => go('signin')} className={LINK}>{t('Back to sign in')}</button>
                      )}
                      <p className="text-center text-caption leading-relaxed text-fg-faint">
                        {t('By continuing, you accept the')}{' '}
                        <a href={TERMS_PATH} className={`underline ${LINK}`}>{t('Terms')}</a>{' '}
                        {t('and the')}{' '}
                        <a href={PRIVACY_PATH} className={`underline ${LINK}`}>{t('Privacy')}</a>.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </main>

        <footer className="flex-shrink-0 px-6 py-6 text-caption text-fg-faint lg:px-10">
          © 2026 Escala Tokens
        </footer>
      </div>

      <ShowcasePanel />
    </div>
  )
}
