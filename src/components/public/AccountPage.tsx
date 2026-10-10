// Account home, opened from the avatar menu. Same shell as Home: top bar,
// a left rail of sections, one card, the footer strip. The email is the
// sign-in address and is not editable. The page edits the display name,
// the password, and the licence. A signed-out visit goes through /login and
// comes back here (`next=account`).

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { AppearanceToggle, BrandMark, LanguageMenu } from '../configurator/TopNav'
import { COPYRIGHT_LINE } from '../configurator/AboutMenu'
import { FooterLinks } from '../configurator/FooterLinks'
import { LicenceModal } from '../configurator/LicenceModal'
import { INSPECTOR_TABS_H, SHELL_CHROME } from '../configurator/themeWorkspaceLayout'
import { accountHref, matchAccountPath } from '../../lib/accountRoutes'
import { setTheme, useTheme } from '../../lib/theme'
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
import { LOCALES, useI18n } from '../../lib/i18n'
import { loginHref, rememberReturn } from '../../lib/loginReturn'
import { useLicence } from '../../lib/licence'
import { accountsEnabled } from '../../lib/supabase'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
const FIELD = `h-12 w-full rounded-2xl border border-line bg-transparent px-4 dark:border-white/[0.08] text-ui text-fg placeholder:text-fg-faint transition-colors hover:border-line-strong focus:border-line-strong ${FOCUS}`
const PRIMARY = `inline-flex h-10 items-center justify-center self-start rounded-xl bg-fg px-4 text-ui font-semibold text-app transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS}`

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

type SectionId = 'profile' | 'password' | 'plan'

const SECTION_IDS: readonly SectionId[] = ['profile', 'password', 'plan']

/** Which section a link asked for. A hash wins; an older path names one. */
function sectionFromLocation(): SectionId {
  const id = window.location.hash.replace(/^#/, '')
  if (id === 'name' || id === 'verification') return 'profile'
  if ((SECTION_IDS as readonly string[]).includes(id)) return id as SectionId
  const legacy = matchAccountPath(window.location.pathname)
  if (legacy === 'security' || legacy === 'password') return 'password'
  return 'profile'
}

const RAIL_ITEM = 'flex h-8 w-full min-w-0 flex-shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-left text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'
const RAIL_ON = 'bg-[#7468EF1A] font-semibold text-fg'
const RAIL_OFF = 'font-medium text-fg-muted hover:bg-fg/[0.05] hover:text-fg'

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      {children}
    </svg>
  )
}

const ICONS: Record<SectionId | 'signout', ReactNode> = {
  profile: <Glyph><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></Glyph>,
  password: <Glyph><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></Glyph>,
  plan: <Glyph><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z" /></Glyph>,
  signout: <Glyph><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" /><path d="M10 8l-4 4 4 4M6 12h10" /></Glyph>,
}

function AccountHome({ user }: { user: User }) {
  const { t, locale } = useI18n()
  const { status } = useLicence()
  const chrome = useTheme()
  const licensed = status === 'valid'
  const [section, setSection] = useState<SectionId>(sectionFromLocation)
  const [licenceOpen, setLicenceOpen] = useState(() => sectionFromLocation() === 'plan')

  useEffect(() => {
    const canonical = section === 'profile' ? '/account' : `/account#${section}`
    if (`${window.location.pathname}${window.location.hash}` !== canonical) {
      history.replaceState(null, '', canonical)
    }
  }, [section])

  function openSection(id: SectionId) {
    setSection(id)
    if (id !== 'plan') setLicenceOpen(false)
  }

  const name = displayNameOf(user)
  const initial = (name || user.email || '?').charAt(0)
  const since = formatWhen(user.created_at, locale, false)
  const confirmed = Boolean(user.email_confirmed_at)
  const methods = signInMethods(user, t)

  const titles: Record<SectionId, string> = {
    profile: t('Profile'),
    password: t('Password'),
    plan: t('Plan'),
  }

  return (
    <div className={`flex h-screen flex-col text-fg ${SHELL_CHROME}`}>
      <header className="flex h-[52px] flex-shrink-0 items-center justify-between gap-4 px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <a href="/" className={`flex items-center gap-2.5 rounded-md ${FOCUS}`}>
            <BrandMark size={28} />
            <span className="text-strong font-semibold">Escala Tokens</span>
          </a>
          <span aria-hidden className="text-fg-faint">|</span>
          <span className="truncate text-strong text-fg-muted">{t('Account')}</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <LanguageMenu />
          <AppearanceToggle value={chrome} onChange={setTheme} />
          <a
            href="/"
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-ui font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg ${FOCUS}`}
          >
            <ArrowLeft />
            {t('Workspace')}
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav aria-label={t('Account')} className="flex flex-shrink-0 gap-0.5 overflow-x-auto px-3 pb-2 md:w-[240px] md:flex-col md:overflow-visible md:pb-0 md:pt-3">
          {SECTION_IDS.map((id) => {
            const active = section === id
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => openSection(id)}
                className={`${RAIL_ITEM} ${active ? RAIL_ON : RAIL_OFF}`}
              >
                {ICONS[id]}
                <span className="flex-1 truncate">{titles[id]}</span>
                {id === 'profile' && !confirmed && (
                  <span
                    aria-label={t('Not confirmed')}
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-status-warning-solid"
                  />
                )}
                {id === 'plan' && licensed && (
                  <span className="flex-shrink-0 text-mini font-semibold uppercase tracking-wider text-status-success">Pro</span>
                )}
              </button>
            )
          })}
          <div aria-hidden className="mx-1 my-2 hidden border-t border-line dark:border-white/[0.08] md:block" />
          <button
            type="button"
            onClick={() => { void signOut().then(() => { window.location.assign('/') }) }}
            className={`${RAIL_ITEM} ${RAIL_OFF}`}
          >
            {ICONS.signout}
            <span className="flex-1 truncate">{t('Sign out')}</span>
          </button>
        </nav>

        <main className="my-3 mr-3 ml-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-app dark:border-white/[0.08] dark:bg-[#161617] md:ml-0">
          <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-line px-8 dark:border-white/[0.08]" style={{ height: INSPECTOR_TABS_H }}>
            <span className="text-fg-muted">{ICONS[section]}</span>
            <h1 className="text-title font-semibold text-fg">{titles[section]}</h1>
          </div>

          <div id={`account-${section}`} className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
            {section === 'profile' && (
              <ProfilePanel user={user} licensed={licensed} onPlan={() => openSection('plan')} />
            )}

            {section === 'password' && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-1 text-body text-fg-muted">
                  <p className="text-ui font-medium text-fg">{t('Sign-in method')}</p>
                  <p>{methods}</p>
                  {formatWhen(user.last_sign_in_at, locale, true) && (
                    <p>{t('Last signed in {when}.', { when: formatWhen(user.last_sign_in_at, locale, true) ?? '' })}</p>
                  )}
                </div>
                <div className="border-t border-line pt-8">
                  <PasswordForm user={user} />
                </div>
              </div>
            )}

            {section === 'plan' && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-ui font-medium text-fg">{t('Plan')}</p>
                  <p className="mt-1 text-body text-fg-muted">{licensed ? 'Pro' : t('Free')}</p>
                </div>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setLicenceOpen(true)}
                  className={PRIMARY}
                >
                  {licensed ? t('Manage licence') : t('Activate licence')}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className={`flex h-7 flex-shrink-0 items-center gap-3 border-t border-line px-4 lg:px-5 ${SHELL_CHROME}`}>
        <span className="min-w-0 flex-1 truncate text-mini text-fg-faint">{COPYRIGHT_LINE}</span>
        <FooterLinks className="h-full" />
      </footer>

      {licenceOpen && <LicenceModal onClose={() => setLicenceOpen(false)} />}
    </div>
  )
}

function signInMethods(user: User, t: (source: string) => string): string {
  const providers = [...new Set((user.identities ?? []).map((identity) => identity.provider).filter(Boolean))]
  const methods = providers.length ? providers : ['email']
  return methods.map((provider) => providerLabel(provider, t)).join(' · ')
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

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col">
      <h2 className="pb-3 text-mini font-semibold uppercase tracking-widest text-fg-faint">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-2 border-t border-line py-5 dark:border-white/[0.08] md:grid-cols-[200px_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="text-ui font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-caption leading-snug text-fg-faint">{hint}</p>}
      </div>
      <div className="min-w-0 text-body text-fg-muted">{children}</div>
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { key: T; label: string }[]
  onChange: (key: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-0.5 rounded-xl border border-line p-0.5 dark:border-white/[0.08]">
      {options.map((option) => {
        const on = option.key === value
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.key)}
            className={`h-8 rounded-lg px-3 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${on ? 'bg-[#7468EF1A] font-semibold text-fg' : 'font-medium text-fg-muted hover:bg-fg/[0.05] hover:text-fg'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Region and time zone as this browser reports them. Read-only: nothing is
 *  stored, so there is nothing to edit. */
function detectedRegion(locale: string): { region: string | null; zone: string | null } {
  let zone: string | null = null
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { zone = null }
  let region: string | null = null
  try {
    const code = new Intl.Locale(navigator.language).maximize().region
    if (code) region = new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch { region = null }
  return { region, zone }
}

function ProfilePanel({ user, licensed, onPlan }: { user: User; licensed: boolean; onPlan: () => void }) {
  const { t, locale, setLocale } = useI18n()
  const chrome = useTheme()
  const name = displayNameOf(user)
  const initial = (name || user.email || '?').charAt(0)
  const since = formatWhen(user.created_at, locale, false)
  const last = formatWhen(user.last_sign_in_at, locale, true)
  const methods = signInMethods(user, t)
  const { region, zone } = detectedRegion(locale)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border border-line bg-elevated text-title font-semibold uppercase text-fg dark:border-white/[0.08]">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-heading font-semibold tracking-[-0.02em] text-fg">{name || user.email}</p>
          {since && <p className="truncate text-body text-fg-muted">{t('Member since')} · {since}</p>}
        </div>
      </div>

      <Group title={t('Account')}>
        <Row label={t('Display name')} hint={t('Shown on your account.')}>
          <NameForm user={user} />
        </Row>
        <Row label={t('Email')} hint={t('Your sign-in address. It cannot be changed.')}>
          <EmailStatus user={user} />
        </Row>
        <Row label={t('Sign-in method')}>
          <p>{methods}</p>
          {last && <p className="mt-1 text-caption text-fg-faint">{t('Last signed in {when}.', { when: last })}</p>}
        </Row>
        <Row label={t('Plan')}>
          <div className="flex items-center gap-3">
            <span className="font-medium text-fg">{licensed ? 'Pro' : t('Free')}</span>
            <button type="button" onClick={onPlan} className={`rounded-sm text-ui text-fg-muted underline-offset-2 hover:text-fg hover:underline ${FOCUS}`}>
              {licensed ? t('Manage licence') : t('Activate licence')}
            </button>
          </div>
        </Row>
      </Group>

      <Group title={t('Preferences')}>
        <Row label={t('Language')}>
          <Segmented
            label={t('Language')}
            value={locale}
            options={LOCALES.map((option) => ({ key: option.key, label: option.label }))}
            onChange={setLocale}
          />
        </Row>
        <Row label={t('Appearance')}>
          <Segmented
            label={t('Appearance')}
            value={chrome}
            options={[{ key: 'light', label: t('Light') }, { key: 'dark', label: t('Dark') }]}
            onChange={setTheme}
          />
        </Row>
        <Row label={t('Region')} hint={t('Detected from this browser.')}>
          <p>{region ?? '—'}</p>
          {zone && <p className="mt-1 text-caption text-fg-faint">{zone}</p>}
        </Row>
      </Group>
    </div>
  )
}

function NameForm({ user }: { user: User }) {
  const { t } = useI18n()
  const id = useId()
  const [name, setName] = useState(() => displayNameOf(user))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = name.trim() !== displayNameOf(user)
  const message = problemText(problem, t)

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
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          id={id}
          aria-label={t('Display name')}
          value={name}
          maxLength={80}
          autoComplete="nickname"
          onChange={(e) => { setName(e.target.value); setSaved(false) }}
          className={`${FIELD} max-w-md`}
        />
        <button type="submit" disabled={busy || !dirty} className={PRIMARY}>{t('Save')}</button>
      </div>
      {message && <Alert>{message}</Alert>}
      {saved && !dirty && <Saved>{t('Saved.')}</Saved>}
    </form>
  )
}

function EmailStatus({ user }: { user: User }) {
  const { t, locale } = useI18n()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  if (!user.email) return <p>—</p>

  const confirmedAt = formatWhen(user.email_confirmed_at, locale, true)
  const confirmed = Boolean(user.email_confirmed_at)
  const message = problemText(problem, t)

  async function resend() {
    if (busy || !user.email) return
    setBusy(true)
    setProblem(null)
    setNotice(null)
    const result = await resendSignupEmail(user.email, locale)
    setBusy(false)
    if (!result.ok) setProblem(result.problem)
    else setNotice(t('Confirmation sent. Check your inbox.'))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <p className="truncate font-medium text-fg">{user.email}</p>
        <span className={`inline-flex h-5 flex-shrink-0 items-center gap-1.5 rounded-full px-2 text-mini font-semibold ${confirmed ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${confirmed ? 'bg-status-success-solid' : 'bg-status-warning-solid'}`} />
          {confirmed ? t('Confirmed') : t('Not confirmed')}
        </span>
      </div>
      <p className="text-caption text-fg-faint">
        {confirmed
          ? t('Confirmed on {date}.', { date: confirmedAt ?? '' })
          : t('This address is not confirmed yet. Open the link we sent, or ask for another.')}
      </p>
      {!confirmed && (
        <button type="button" onClick={() => void resend()} disabled={busy} className={`self-start rounded-sm text-ui text-fg-muted underline-offset-2 hover:text-fg hover:underline ${FOCUS}`}>
          {t('Resend confirmation')}
        </button>
      )}
      {notice && <Saved>{notice}</Saved>}
      {message && <Alert>{message}</Alert>}
    </div>
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
