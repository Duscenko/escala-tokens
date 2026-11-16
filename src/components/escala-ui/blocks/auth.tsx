// Escala blocks · Auth. The twelve Figma blocks of the `Auth` page (999:108478), each a `Container=card · plain` set,
// composed ONLY from escala-ui components and role tokens (CSS variables named as variables.css names them): no
// colour, length or type value of its own. Forms use `Field`; a bare Input never appears here.
//
// Motion (contract in auth.contract.json): inside a modal the overlay's own choreography runs and the block adds nothing;
// a swap of the content region (sign-in ↔ sign-up) cross-fades on `use-page-transition`; an inline notice appears on
// `use-disclosure-in` / `-out`; a success moment (link sent, check email) rises once on `use-celebration`. The
// `Container` (card · plain) is a presentation, never animated.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { liftShadow } from '../../../lib/recipeStyles'
import { Alert } from '../alert'
import { Button } from '../button'
import { Checkbox, CheckboxItem } from '../checkbox'
import { Field } from '../field'
import { glyph } from '../../../lib/icons'
import { boxedGlyph } from './shared'
import { Input } from '../input'
import { PhoneNumberInput } from './phoneNumber'
import { InputOTP } from '../input-otp'
import { ModalHeader } from '../modal'
import { PasswordStrength, PasswordStrengthMeter, scorePassword } from '../password-strength'
import { SegmentedControl, SegmentedControlItem } from '../segmented-control'
import { Separator } from '../separator'
import { SocialLoginButton, type SocialBrand } from '../social-login-button'
import { TextLink } from '../text-link'

export const AUTH_CONTAINERS = ['card', 'plain'] as const
export type AuthContainer = (typeof AUTH_CONTAINERS)[number]
/** The states a form block can reach. `invalid` shows the field error and an inline notice; `loading` busies the primary action. */
export const AUTH_STATUSES = ['idle', 'invalid', 'loading', 'success'] as const
export type AuthStatus = (typeof AUTH_STATUSES)[number]

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = (role: string): React.CSSProperties => ({
  fontFamily: `var(--text-${role}-font-family)`,
  fontSize: `var(--text-${role}-font-size)`,
  lineHeight: `var(--text-${role}-line-height)`,
  fontWeight: `var(--text-${role}-font-weight)`,
  letterSpacing: `var(--text-${role}-letter-spacing)`,
})
const motion = (role: string) => `var(--motion-${role}-duration) var(--motion-${role}-easing)`

/** Mounts transparent and low, then settles on a motion role: a content swap, a disclosure or a success moment. */
function Appear({ role, children, style }: { role: 'use-page-transition' | 'use-disclosure-in' | 'use-celebration'; children: React.ReactNode; style?: React.CSSProperties }) {
  const [on, setOn] = React.useState(false)
  // A timer, not requestAnimationFrame: a hidden tab never ticks a frame and the content would stay transparent.
  React.useEffect(() => { const id = setTimeout(() => setOn(true), 16); return () => clearTimeout(id) }, [])
  return (
    <div style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'var(--motion-transform-enter, none)', transition: `opacity ${motion(role)}, transform ${motion(role)}`, ...style }}>
      {children}
    </div>
  )
}

/** An inline notice: grows open and fades in on `use-disclosure-in`, and closes on `-out`. */
function Notice({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-live="polite"
      style={{
        display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0,
        transition: `grid-template-rows ${motion(open ? 'use-disclosure-in' : 'use-disclosure-out')}, opacity ${motion(open ? 'use-disclosure-in' : 'use-disclosure-out')}`,
      }}
    >
      <div style={{ overflow: 'hidden' }}>{open ? children : null}</div>
    </div>
  )
}

interface ShellProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  block: string
  container?: AuthContainer
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  /** The header's size: the sign-in block draws `lg`. */
  headerSize?: 'default' | 'lg'
  /** Cross-fade the content region when this key changes (sign-in ↔ sign-up). */
  swapKey?: string
  /** A success moment: the header rises once on `use-celebration`. */
  celebrate?: boolean
}

/** The frame every Auth block shares: header area, a rule, the body. Card = a Modal-like panel; plain = bare content. */
function AuthShell({ block, container = 'card', title, description, icon, headerSize = 'default', swapKey, celebrate = false, children, style, ...props }: ShellProps) {
  const card = container === 'card'
  const inset = v('spacing.inset-surface')
  return (
    <section
      data-block={block}
      data-container={container}
      style={{
        // 480 = 3 × spacing-32 + spacing-24: the width the Figma blocks are drawn at.
        width: '100%', maxWidth: 'calc(var(--spacing-32) * 3 + var(--spacing-24))', display: 'flex', flexDirection: 'column',
        color: v('color.content.primary'), ...type('body-md'),
        ...(card ? {
          background: v('color.surface.layer-2'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`,
          borderRadius: v('radius.overlay'), boxShadow: liftShadow('modal'), overflow: 'hidden',
        } : {}),
        ...style,
      }}
      {...props}
    >
      <div data-part="header-area" style={card ? { padding: inset } : { paddingBottom: v('spacing.gap-section') }}>
        {celebrate
          ? <Appear role="use-celebration"><ModalHeader size={headerSize} align={card ? 'vertical-center' : 'horizontal'} title={title} description={description} descriptionVisible={Boolean(description)} icon={icon} iconVisible={Boolean(icon)} /></Appear>
          : <ModalHeader size={headerSize} align={card ? 'vertical-center' : 'horizontal'} title={title} description={description} descriptionVisible={Boolean(description)} icon={icon} iconVisible={Boolean(icon)} />}
      </div>
      <Separator tone="subtle" />
      <div data-part="body" key={swapKey} style={card ? { padding: inset } : { paddingTop: v('spacing.gap-section') }}>
        <Appear role="use-page-transition">
          <div style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group') }}>{children}</div>
        </Appear>
      </div>
    </section>
  )
}

/** "Don't have an account? Sign up": a sentence and its link, centred. */
function AuthFooter({ text, linkLabel, onLink, href = '#' }: { text: string; linkLabel: string; onLink?: () => void; href?: string }) {
  return (
    <div data-part="footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: v('spacing.gap-tight'), color: v('color.content.secondary'), ...type('body-sm') }}>
      <span>{text}</span>
      <TextLink href={href} size="xs" onClick={onLink ? (e) => { e.preventDefault(); onLink() } : undefined}>{linkLabel}</TextLink>
    </div>
  )
}

/** A code's slots sit in the middle of the body, under the centred header (the Figma body centres them). */
const Centered = ({ children }: { children: React.ReactNode }) => <div data-part="code" style={{ display: 'flex', justifyContent: 'center' }}>{children}</div>

const OrRule = ({ label = 'OR' }: { label?: string }) => <Separator align="center" tone="default">{label}</Separator>

interface BlockProps extends Omit<React.ComponentProps<'section'>, 'title' | 'onSubmit'> {
  container?: AuthContainer
  status?: AuthStatus
  /** The notice shown when `status` is `invalid` (or the field error). */
  error?: string
  onSubmit?: () => void
  onNavigate?: (to: string) => void
}

/** The phone field's hint: the picker searches by calling code when the query starts with "+". */
const PHONE_HINT = 'Type + to search by calling code'

const busy = (status: AuthStatus) => status === 'loading'
const invalid = (status: AuthStatus) => (status === 'invalid' ? 'Invalid' : 'Default') as 'Invalid' | 'Default'

/** Figma `AuthSignIn`. */
export function AuthSignIn({ container, status = 'idle', error = 'The email or password is not right.', onSubmit, onNavigate, ...props }: BlockProps) {
  const social: SocialBrand[] = ['Google', 'Apple', 'Discord']
  return (
    <AuthShell block="AuthSignIn" container={container} headerSize="lg" icon={glyph('lock')} title="Welcome back" description="Sign in to continue to your workspace." {...props}>
      <div data-part="social-row" style={{ display: 'flex', gap: v('spacing.gap-control') }}>
        {social.map((brand) => <SocialLoginButton key={brand} brand={brand} iconOnly style={{ flex: 1 }} />)}
      </div>
      <OrRule />
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size="sm" description={error} /></Notice>
      <Field label="Email address" state={invalid(status)} error={error}><Input type="email" placeholder="you@company.com" aria-invalid={status === 'invalid' || undefined} /></Field>
      <Field label="Password" trailing={<TextLink href="#" size="xs" onClick={(e) => { e.preventDefault(); onNavigate?.('forgot-password') }}>Forgot?</TextLink>}>
        <Input type="password" placeholder="Enter your password" />
      </Field>
      <CheckboxItem size="sm" label="Remember me for 30 days" />
      <Button loading={busy(status)} onClick={onSubmit}>Sign in</Button>
      <AuthFooter text="Don't have an account?" linkLabel="Sign up" onLink={() => onNavigate?.('sign-up')} />
    </AuthShell>
  )
}

/** Figma `AuthSignUp`. */
export function AuthSignUp({ container, status = 'idle', error = 'That email already has an account.', onSubmit, onNavigate, ...props }: BlockProps) {
  // The meter scores what is typed, live (the number of the five rules met).
  const [password, setPassword] = React.useState('')
  return (
    <AuthShell block="AuthSignUp" container={container} icon={glyph('user-bold')} title="Get started now" description="Create your account in less than a minute." {...props}>
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size="sm" description={error} /></Notice>
      <Field label="Full name"><Input placeholder="Ada Lovelace" /></Field>
      <Field label="Email address" state={invalid(status)} error={error}><Input type="email" placeholder="you@company.com" /></Field>
      <Field label="Password"><Input type="password" autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <PasswordStrengthMeter size="sm" strength={scorePassword(password)} />
      <div data-part="consent" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
        <Checkbox size="sm" aria-label="I agree to the Terms of Service and Privacy Policy" />
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: v('spacing.gap-tight'), color: v('color.content.secondary'), ...type('body-sm') }}>
          I agree to the <TextLink href="#" size="xs">Terms of Service</TextLink> and <TextLink href="#" size="xs">Privacy Policy</TextLink>
        </span>
      </div>
      <Button loading={busy(status)} onClick={onSubmit}>Create account</Button>
      <AuthFooter text="Already have an account?" linkLabel="Sign in" onLink={() => onNavigate?.('sign-in')} />
    </AuthShell>
  )
}

/** Figma `AuthSignInPhone`. */
export function AuthSignInPhone({ container, status = 'idle', error = 'Enter a valid phone number.', onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthSignInPhone" container={container} icon={glyph('lock')} title="Sign in with your phone" description="We will text you a 6-digit code. Standard message rates may apply." {...props}>
      <Field label="Phone number" required state={invalid(status)} error={error} description={PHONE_HINT}><PhoneNumberInput placeholder="(201) 555-0123" /></Field>
      <CheckboxItem size="sm" label="Send me product updates by SMS" />
      <Button loading={busy(status)} onClick={onSubmit}>Send code</Button>
      <OrRule />
      <Button variant="secondary" onClick={() => onNavigate?.('sign-in')}>Continue with email</Button>
    </AuthShell>
  )
}

/** Figma `AuthOTPVerification`. */
export function AuthOTPVerification({ container, status = 'idle', onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthOTPVerification" container={container} icon={glyph('lock')} title="Enter your code" description="We sent a 4-digit code to +49 171 39200 12." {...props}>
      <Centered><InputOTP length={4} variant="outline" aria-label="One-time code" aria-invalid={status === 'invalid' || undefined} /></Centered>
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size="sm" description="That code is not right. Try again." /></Notice>
      <Button loading={busy(status)} onClick={onSubmit}>Verify and continue</Button>
      <Button variant="secondary" disabled>Resend code in 00:23</Button>
      <AuthFooter text="Wrong number?" linkLabel="Change it" onLink={() => onNavigate?.('phone')} />
    </AuthShell>
  )
}

/** Figma `AuthTwoFactor`. */
export function AuthTwoFactor({ container, status = 'idle', onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthTwoFactor" container={container} icon={glyph('lock')} title="Two-factor authentication" description="Open your authenticator app and enter the current code for Escala." {...props}>
      <div data-part="code-timer" style={{ display: 'flex', justifyContent: 'space-between', color: v('color.content.secondary'), ...type('body-sm') }}>
        <span>Code refreshes in</span><span>00:18</span>
      </div>
      <Centered><InputOTP length={6} variant="outline" aria-label="Authenticator code" aria-invalid={status === 'invalid' || undefined} /></Centered>
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size="sm" description="That code is not right. Try again." /></Notice>
      <CheckboxItem size="sm" label="Trust this device for 30 days" />
      <Button loading={busy(status)} onClick={onSubmit}>Verify</Button>
      <AuthFooter text="Lost your device?" linkLabel="Use a backup code" onLink={() => onNavigate?.('backup-code')} />
    </AuthShell>
  )
}

/** Figma `AuthForgotPassword` (Method email · sms). The method switch swaps the field (email ↔ phone with its country)
 *  and the action's copy; only that region cross-fades, so the switch keeps its focus. `method` controls it, or
 *  `defaultMethod` starts it and the block keeps it. */
export function AuthForgotPassword({
  container, method: controlled, defaultMethod = 'email', status = 'idle', error, onSubmit, onNavigate, onMethodChange, ...props
}: BlockProps & { method?: 'email' | 'sms'; defaultMethod?: 'email' | 'sms'; onMethodChange?: (m: 'email' | 'sms') => void }) {
  const [inner, setInner] = React.useState(defaultMethod)
  const method = controlled ?? inner
  const email = method === 'email'
  const choose = (m: string) => { const next = m as 'email' | 'sms'; setInner(next); onMethodChange?.(next) }
  return (
    <AuthShell block="AuthForgotPassword" container={container} icon={glyph('lock')} title="Forgot password?" description="No worries, we'll send you reset instructions." {...props}>
      <SegmentedControl fullWidth value={method} onValueChange={choose} aria-label="Send reset instructions by">
        <SegmentedControlItem value="email" label="Email" />
        <SegmentedControlItem value="sms" label="SMS" />
      </SegmentedControl>
      <Appear key={method} role="use-page-transition" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group') }}>
        <Field
          label={email ? 'Email address' : 'Phone number'}
          required
          state={invalid(status)}
          error={error ?? (email ? 'Enter a valid email address.' : 'Enter a valid phone number.')}
          description={email ? undefined : PHONE_HINT}
        >
          {email ? <Input type="email" placeholder="you@company.com" /> : <PhoneNumberInput placeholder="(201) 555-0123" />}
        </Field>
        <Button loading={busy(status)} onClick={onSubmit}>{email ? 'Send reset link' : 'Send reset code'}</Button>
      </Appear>
      <Button variant="secondary" leading={boxedGlyph('caret-left')} onClick={() => onNavigate?.('sign-in')}>Back to sign in</Button>
    </AuthShell>
  )
}

/** Figma `AuthNewPassword`. */
export function AuthNewPassword({ container, status = 'idle', error = 'The passwords do not match.', onSubmit, ...props }: BlockProps) {
  const [password, setPassword] = React.useState('')
  return (
    <AuthShell block="AuthNewPassword" container={container} icon={glyph('lock')} title="Set a new password" description="Your new password must be different from the last one you used." {...props}>
      <Field label="New password"><Input type="password" autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <PasswordStrength size="sm" value={password} rulesVisible />
      <Field label="Confirm password" state={invalid(status)} error={error}><Input type="password" placeholder="Repeat the password" /></Field>
      <Button loading={busy(status)} onClick={onSubmit}>Update password</Button>
    </AuthShell>
  )
}

/** Figma `AuthCheckEmail`. A success moment: the header rises once on `use-celebration`. */
export function AuthCheckEmail({ container, onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthCheckEmail" container={container} icon={glyph('check-circle')} celebrate title="Check your email" description="We sent a password reset link to hi@escala.design. It expires in 30 minutes." {...props}>
      <Button onClick={onSubmit}>Open mail app</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('sign-in')}>Skip for now</Button>
      <AuthFooter text="Didn't receive it?" linkLabel="Resend email" onLink={() => onNavigate?.('resend')} />
    </AuthShell>
  )
}

/** Figma `AuthMagicLinkSent`. */
export function AuthMagicLinkSent({ container, onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthMagicLinkSent" container={container} icon={glyph('sparkle')} celebrate title="Your sign-in link is on the way" description="Click the link we sent to hi@escala.design to sign in. No password needed." {...props}>
      <Alert variant="info" appearance="soft" size="sm" description="The link expires in 10 minutes and works once." />
      <Button onClick={onSubmit}>Open inbox</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('resend')}>Send a new link</Button>
      <AuthFooter text="Prefer a password?" linkLabel="Sign in the classic way" onLink={() => onNavigate?.('sign-in')} />
    </AuthShell>
  )
}

/** Figma `AuthAccountLocked`. */
export function AuthAccountLocked({ container, onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthAccountLocked" container={container} icon={glyph('warning')} title="Account temporarily locked" description="We paused sign-in after five failed attempts. This protects your account while we confirm it is you." {...props}>
      <Alert variant="warning" appearance="soft" size="sm" description="Unlocks automatically in 14:52. Last attempt from Istanbul, TR." />
      <Button onClick={onSubmit}>Unlock with email</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('forgot-password')}>Reset my password</Button>
      <AuthFooter text="Not you?" linkLabel="Report suspicious activity" onLink={() => onNavigate?.('report')} />
    </AuthShell>
  )
}

/** Figma `AuthError`. */
export function AuthError({ container, onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthError" container={container} icon={glyph('warning-circle')} title="Verification failed" description="The link you used has expired or was already claimed. Reset links stay valid for 30 minutes." {...props}>
      <Alert variant="critical" appearance="soft" size="sm" description="Error code AUTH_LINK_EXPIRED. Nothing was changed on your account." />
      <Button onClick={onSubmit}>Request a new link</Button>
      <Button variant="secondary" onClick={() => onNavigate?.('support')}>Contact support</Button>
    </AuthShell>
  )
}

/** Figma `AuthSocialSignIn`. */
export function AuthSocialSignIn({ container, onSubmit, onNavigate, ...props }: BlockProps) {
  return (
    <AuthShell block="AuthSocialSignIn" container={container} icon={glyph('user-bold')} title="Continue with" description="Use the account you already have. We never post on your behalf." {...props}>
      {(['Google', 'Discord', 'Apple'] as SocialBrand[]).map((brand) => <SocialLoginButton key={brand} brand={brand} appearance="brand" onClick={onSubmit} />)}
      <OrRule label="OR PICK A PROVIDER" />
      <div data-part="provider-grid" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control') }}>
        <div style={{ display: 'flex', gap: v('spacing.gap-control') }}>
          {(['GitHub', 'X'] as SocialBrand[]).map((brand) => <SocialLoginButton key={brand} brand={brand} onClick={onSubmit} style={{ flex: 1 }} />)}
        </div>
        <div style={{ display: 'flex', gap: v('spacing.gap-control') }}>
          <SocialLoginButton brand="LinkedIn" onClick={onSubmit} style={{ flex: 1 }} />
          <Button variant="secondary" appearance="outline" style={{ flex: 1 }} onClick={() => onNavigate?.('sso')}>SAML SSO</Button>
        </div>
      </div>
      <AuthFooter text="New to Escala?" linkLabel="Create an account" onLink={() => onNavigate?.('sign-up')} />
    </AuthShell>
  )
}

export const AUTH_BLOCKS = {
  AuthSignIn, AuthSignUp, AuthSignInPhone, AuthOTPVerification, AuthTwoFactor, AuthForgotPassword,
  AuthNewPassword, AuthCheckEmail, AuthMagicLinkSent, AuthAccountLocked, AuthError, AuthSocialSignIn,
} as const
