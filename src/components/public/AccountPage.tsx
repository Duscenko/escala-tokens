// Account home, opened from the avatar menu. The email is the sign-in
// address and is not editable. The page edits the display name, the
// password, and the licence. A signed-out visit goes through /login and
// comes back here (`next=account`).

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { BrandMark } from '../configurator/TopNav'
import { LicenceModal } from '../configurator/LicenceModal'
import { accountFocus, accountHref, matchAccountPath, type AccountFocus } from '../../lib/accountRoutes'
import {
  MIN_PASSWORD,
  displayNameOf,
  hasEmailPassword,
  replacePassword,
  resendSignupEmail,
  saveDisplayName,
  setNewPassword,
  signOut,
  useAuth,
  type AuthProblem,
} from '../../lib/auth'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n } from '../../lib/i18n'
import { loginHref, rememberReturn } from '../../lib/loginReturn'
import { useLicence } from '../../lib/licence'
import { useAccountPlanSync } from '../../lib/useAccountPlanSync'
import { accountsEnabled } from '../../lib/supabase'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
const FIELD = `h-12 w-full rounded-2xl border border-line bg-surface px-4 text-ui text-fg placeholder:text-fg-faint transition-colors hover:border-line-strong focus:border-line-strong ${FOCUS}`
const PRIMARY = `inline-flex h-10 items-center justify-center self-start rounded-xl bg-fg px-4 text-ui font-semibold text-app transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS}`
const QUIET = `self-start rounded-sm text-ui text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline ${FOCUS}`
const ROW_ACTION = `flex-shrink-0 rounded-lg px-2.5 py-1.5 text-ui font-medium text-fg transition-colors hover:bg-elevated ${FOCUS}`

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" />
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

function problemText(
  problem: AuthProblem | 'short_password' | 'password_mismatch' | null,
  t: (source: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (problem === 'invalid_credentials') return t('Wrong email or password.')
  if (problem === 'email_not_confirmed') return t('Confirm your email first. Check your inbox.')
  if (problem === 'email_in_use') return t('That email is already in use.')
  if (problem === 'weak_password' || problem === 'short_password') return t('Use at least {n} characters.', { n: MIN_PASSWORD })
  if (problem === 'password_mismatch') return t('The passwords do not match.')
  if (problem === 'rate_limited') return t('Too many attempts. Try again in a few minutes.')
  if (problem === 'unavailable') return t('Something went wrong. Try again in a moment.')
  return null
}

function formatWhen(iso: string | null | undefined, locale: string, withTime: boolean): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale, withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function providerLabel(provider: string, t: (source: string) => string): string {
  if (provider === 'email') return t('Email and password')
  if (provider === 'github') return 'GitHub'
  return provider
}

export function AccountPage() {
  const { t } = useI18n()
  const { user, loading } = useAuth()
  const onAccount = matchAccountPath(window.location.pathname) !== null

  useEffect(() => {
    applyDocumentHead({
      title: `${t('Account')} — Escala Tokens`,
      description: t('Your Escala account.'),
      canonicalPath: accountHref(),
      robots: 'noindex, nofollow',
    })
  }, [t])

  useEffect(() => {
    if (!accountsEnabled) window.location.replace('/')
  }, [])

  useEffect(() => {
    if (loading || user || !accountsEnabled) return
    rememberReturn('account')
    window.location.replace(loginHref({ next: 'account' }))
  }, [loading, user])

  if (!accountsEnabled || loading || !user || !onAccount) {
    return <div className="min-h-screen bg-app" />
  }

  return <AccountHome user={user} />
}

function AccountHome({ user }: { user: User }) {
  const { t, locale } = useI18n()
  const { status } = useLicence()
  useAccountPlanSync()
  const licensed = status === 'valid'
  const initialFocus = accountFocus(window.location.pathname, window.location.hash)
  const [open, setOpen] = useState<AccountFocus | null>(initialFocus === 'plan' ? null : initialFocus)
  const [licenceOpen, setLicenceOpen] = useState(initialFocus === 'plan')

  useEffect(() => {
    const focus = accountFocus(window.location.pathname, window.location.hash)
    const canonical = focus ? `/account#${focus}` : '/account'
    if (`${window.location.pathname}${window.location.hash}` !== canonical) {
      history.replaceState(null, '', canonical)
    }
    if (focus) document.getElementById(`account-${focus}`)?.scrollIntoView({ block: 'nearest' })
  }, [])

  function toggle(id: Exclude<AccountFocus, 'plan'>) {
    setOpen((current) => {
      const next = current === id ? null : id
      history.replaceState(null, '', next ? `/account#${next}` : '/account')
      return next
    })
  }

  function openPlan() {
    setOpen(null)
    setLicenceOpen(true)
    history.replaceState(null, '', '/account#plan')
  }

  function closePlan() {
    setLicenceOpen(false)
    history.replaceState(null, '', '/account')
  }

  const name = displayNameOf(user)
  const initial = (name || user.email || '?').charAt(0)
  const since = formatWhen(user.created_at, locale, false)
  const methods = signInMethods(user, t)

  return (
    <div className="flex min-h-screen flex-col bg-app text-fg">
      <header className="flex h-[72px] flex-shrink-0 items-center justify-between px-6 lg:px-10">
        <a href="/" className={`flex items-center gap-2.5 rounded-md ${FOCUS}`}>
          <BrandMark size={28} />
          <span className="text-strong font-semibold">Escala Tokens</span>
        </a>
        <a href="/" className={`inline-flex items-center gap-1.5 text-ui font-medium text-fg-muted transition-colors hover:text-fg ${FOCUS}`}>
          <ArrowLeft />
          {t('Workspace')}
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8 lg:py-12">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border border-line bg-elevated text-title font-semibold uppercase text-fg">
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-display font-semibold tracking-[-0.02em] text-fg">
              {name || user.email}
            </h1>
            {since && (
              <p className="truncate text-body text-fg-muted">{t('Member since')} · {since}</p>
            )}
          </div>
        </div>

        <div className="mt-10">
          <NameSetting user={user} open={open === 'name'} onToggle={() => toggle('name')} />
          <EmailRow user={user} />
          <PasswordSetting
            user={user}
            open={open === 'password'}
            onToggle={() => toggle('password')}
            methods={methods}
          />
          <Setting
            id="account-plan"
            title={t('Plan')}
            detail={licensed ? 'Pro' : t('Free')}
            action={licensed ? t('Manage licence') : t('Activate licence')}
            actionProps={{ 'aria-haspopup': 'dialog' }}
            open={false}
            onToggle={openPlan}
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
          <p className="text-body leading-relaxed text-fg-muted">
            {t('Signing out closes your folders on this browser until you come back.')}
          </p>
          <button
            type="button"
            onClick={() => { void signOut().then(() => { window.location.assign('/') }) }}
            className={QUIET}
          >
            {t('Sign out')}
          </button>
        </div>
      </main>
      {licenceOpen && <LicenceModal onClose={closePlan} />}
    </div>
  )
}

function signInMethods(user: User, t: (source: string) => string): string {
  const providers = [...new Set((user.identities ?? []).map((identity) => identity.provider).filter(Boolean))]
  const methods = providers.length ? providers : ['email']
  return methods.map((provider) => providerLabel(provider, t)).join(' · ')
}

function Setting({
  id,
  title,
  detail,
  action,
  open,
  onToggle,
  actionProps,
  children,
}: {
  id: string
  title: string
  detail: ReactNode
  action?: string
  open?: boolean
  onToggle?: () => void
  actionProps?: Record<string, string>
  children?: ReactNode
}) {
  return (
    <section id={id} className="border-t border-line">
      <div className="flex items-start justify-between gap-6 py-4">
        <div className="min-w-0">
          <h2 className="text-ui font-medium text-fg">{title}</h2>
          <div className="mt-1 text-body leading-relaxed text-fg-muted">{detail}</div>
        </div>
        {action && onToggle && (
          <button
            type="button"
            aria-expanded={children ? open : undefined}
            aria-controls={children ? `${id}-panel` : undefined}
            onClick={onToggle}
            className={ROW_ACTION}
            {...actionProps}
          >
            {action}
          </button>
        )}
      </div>
      {open && children && (
        <div id={`${id}-panel`} className="flex flex-col gap-4 pb-6">
          {children}
        </div>
      )}
    </section>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="text-ui font-medium text-fg">{children}</label>
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-body leading-relaxed text-fg-muted">{children}</p>
}

function Alert({ id, children }: { id?: string; children: ReactNode }) {
  return <p id={id} role="alert" className="text-body text-status-danger">{children}</p>
}

function Saved({ children }: { children: ReactNode }) {
  return <p role="status" className="text-body text-fg-muted">{children}</p>
}

function NameSetting({ user, open, onToggle }: { user: User; open: boolean; onToggle: () => void }) {
  const { t } = useI18n()
  const id = useId()
  const [name, setName] = useState(() => displayNameOf(user))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = name.trim() !== displayNameOf(user)
  const message = problemText(problem, t)
  const shown = displayNameOf(user)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy || !dirty) return
    setBusy(true)
    setProblem(null)
    setSaved(false)
    const result = await saveDisplayName(name)
    setBusy(false)
    if (!result.ok) setProblem(result.problem)
    else setSaved(true)
  }

  return (
    <Setting
      id="account-name"
      title={t('Display name')}
      detail={shown || '—'}
      action={t('Edit')}
      open={open}
      onToggle={onToggle}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <FieldLabel htmlFor={id}>{t('Display name')}</FieldLabel>
        <input
          id={id}
          value={name}
          maxLength={80}
          autoComplete="nickname"
          onChange={(e) => { setName(e.target.value); setSaved(false) }}
          className={FIELD}
        />
        <Note>{t('Shown on your account. Your email stays the sign-in address.')}</Note>
        {message && <Alert>{message}</Alert>}
        {saved && !dirty && <Saved>{t('Saved.')}</Saved>}
        <button type="submit" disabled={busy || !dirty} className={PRIMARY}>{t('Save')}</button>
      </form>
    </Setting>
  )
}

function EmailRow({ user }: { user: User }) {
  const { t, locale } = useI18n()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  if (!user.email) return null

  const confirmedAt = formatWhen(user.email_confirmed_at, locale, true)
  const confirmed = Boolean(user.email_confirmed_at)
  const message = problemText(problem, t)

  async function resend() {
    if (busy || !user.email) return
    setBusy(true)
    setProblem(null)
    setNotice(null)
    const result = await resendSignupEmail(user.email)
    setBusy(false)
    if (!result.ok) setProblem(result.problem)
    else setNotice(t('Confirmation sent. Check your inbox.'))
  }

  return (
    <Setting
      id="account-email"
      title={t('Email')}
      detail={
        <div className="flex flex-col gap-2">
          <p className="truncate">{user.email}</p>
          <p>
            {confirmed
              ? t('Confirmed on {date}.', { date: confirmedAt ?? '' })
              : t('This address is not confirmed yet. Open the link we sent, or ask for another.')}
          </p>
          {!confirmed && (
            <button type="button" onClick={() => void resend()} disabled={busy} className={QUIET}>
              {t('Resend confirmation')}
            </button>
          )}
          {notice && <Saved>{notice}</Saved>}
          {message && <Alert>{message}</Alert>}
        </div>
      }
    />
  )
}

function PasswordSetting({
  user,
  open,
  onToggle,
  methods,
}: {
  user: User
  open: boolean
  onToggle: () => void
  methods: string
}) {
  const { t, locale } = useI18n()
  const withCurrent = hasEmailPassword(user)
  const last = formatWhen(user.last_sign_in_at, locale, true)

  return (
    <Setting
      id="account-password"
      title={t('Password')}
      detail={
        <div className="flex flex-col gap-1">
          <p>{methods}</p>
          {last && <p>{t('Last signed in {when}.', { when: last })}</p>}
        </div>
      }
      action={withCurrent ? t('Change password') : t('Add password')}
      open={open}
      onToggle={onToggle}
    >
      <PasswordForm user={user} />
    </Setting>
  )
}

function PasswordForm({ user }: { user: User }) {
  const { t } = useI18n()
  const titleId = useId()
  const withCurrent = hasEmailPassword(user)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | 'short_password' | 'password_mismatch' | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
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
  }, [])

  if (!user.email) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy || !user.email) return
    if (password.length < MIN_PASSWORD) { setProblem('short_password'); setSaved(false); return }
    if (password !== confirm) { setProblem('password_mismatch'); setSaved(false); return }
    if (withCurrent && !current) return
    setBusy(true)
    setProblem(null)
    setSaved(false)
    const result = withCurrent
      ? await replacePassword(user.email, current, password)
      : await setNewPassword(password)
    setBusy(false)
    if (!result.ok) setProblem(result.problem)
    else {
      setCurrent('')
      setPassword('')
      setConfirm('')
      setSaved(true)
    }
  }

  const message = problemText(problem, t)
  const describedBy = [
    capsOn ? `${titleId}-caps` : null,
    message ? `${titleId}-err` : null,
  ].filter(Boolean).join(' ') || undefined

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {!withCurrent && (
        <Note>{t('You sign in with GitHub. Add a password if you also want to sign in with this email.')}</Note>
      )}
      {withCurrent && (
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor={`${titleId}-current`}>{t('Current password')}</FieldLabel>
          <input
            id={`${titleId}-current`}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={FIELD}
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${titleId}-next`}>{t('New password')}</FieldLabel>
        <div className="relative">
          <input
            id={`${titleId}-next`}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={message ? true : undefined}
            aria-describedby={describedBy}
            className={`${FIELD} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t('Hide password') : t('Show password')}
            aria-pressed={show}
            className={`absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-fg-muted transition-colors hover:text-fg ${FOCUS}`}
          >
            <EyeIcon off={show} />
          </button>
        </div>
        {capsOn && (
          <p id={`${titleId}-caps`} role="status" className="text-caption text-status-warning">{t('Caps Lock is on.')}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={`${titleId}-confirm`}>{t('Confirm password')}</FieldLabel>
        <input
          id={`${titleId}-confirm`}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={problem === 'password_mismatch' ? true : undefined}
          aria-describedby={describedBy}
          className={FIELD}
        />
      </div>
      {message && <Alert id={`${titleId}-err`}>{message}</Alert>}
      {saved && <Saved>{t('Password updated.')}</Saved>}
      <button type="submit" disabled={busy} className={PRIMARY}>
        {withCurrent ? t('Save password') : t('Add password')}
      </button>
    </form>
  )
}
