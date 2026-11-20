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
import { BREAKPOINT_STANDARD } from '../../../lib/layoutTokens'
import { liftShadow } from '../../../lib/recipeStyles'
import { Alert } from '../alert'
import { Button } from '../button'
import { Checkbox, CheckboxItem } from '../checkbox'
import { Field } from '../field'
import { FeaturedIcon, type FeaturedIconAppearance, type FeaturedIconVariant } from '../featured-icon'
import { glyph } from '../../../lib/icons'
import { boxedGlyph, blockType } from './shared'
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
/** Figma `Layout`. `inline` is the desktop page: larger controls on a `plain` container. Modals and phones stay `stacked`. */
export const AUTH_LAYOUTS = ['stacked', 'inline'] as const
export type AuthLayout = (typeof AUTH_LAYOUTS)[number]
/** Where a block sits. `layout="inline"` exists only with `container="plain"`, as the Figma sets draw it. */
export type AuthPlacement =
  | { container?: 'card'; layout?: 'stacked' }
  | { container: 'plain'; layout?: AuthLayout }
/** The placement for two free values (a story's or a stage's controls): a card is always stacked. */
export const authPlacement = (container: AuthContainer, layout: AuthLayout = 'stacked'): AuthPlacement =>
  container === 'plain' ? { container, layout } : { container, layout: 'stacked' }

/** The sizes `Layout` cascades to the parts a block nests. */
const authSizes = (layout: AuthLayout = 'stacked') => {
  const inline = layout === 'inline'
  return {
    inline,
    control: (inline ? 'lg' : 'default') as 'lg' | 'default',
    choice: (inline ? 'default' : 'sm') as 'default' | 'sm',
    notice: (inline ? 'default' : 'sm') as 'default' | 'sm',
  }
}

/** Set by `AuthSplit`: the block in its Content slot draws a left-aligned header with no icon. */
const AuthSplitContext = React.createContext(false)

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = blockType
const motion = (role: string) => `var(--motion-${role}-duration) var(--motion-${role}-easing)`

/** Mounts transparent and low, then settles on a motion role: a content swap, a disclosure or a success moment. */
function Appear({ role, from = 'var(--motion-transform-enter, none)', inline = false, children, style }: { role: 'use-page-transition' | 'use-disclosure-in' | 'use-celebration'; from?: string; inline?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  const [on, setOn] = React.useState(false)
  // A timer, not requestAnimationFrame: a hidden tab never ticks a frame and the content would stay transparent.
  React.useEffect(() => { const id = setTimeout(() => setOn(true), 16); return () => clearTimeout(id) }, [])
  const Tag = inline ? 'span' : 'div'
  return (
    <Tag style={{ opacity: on ? 1 : 0, transform: on ? 'none' : from, transition: `opacity ${motion(role)}, transform ${motion(role)}`, ...style }}>
      {children}
    </Tag>
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
  /** The header icon's FeaturedIcon Variant, as each Figma block nests it (default · secondary · info · success · warning · critical). */
  iconVariant?: FeaturedIconVariant
  /** The header icon's Appearance: `soft`, or `gradient` on the screen that opens an account. */
  iconAppearance?: FeaturedIconAppearance
  layout?: AuthLayout
  /** The gap between the body's children: `spacing.gap-group` (a flat form), or `spacing.gap-section` between two groups. */
  bodyGap?: 'spacing.gap-group' | 'spacing.gap-section'
  /** The header's size: the sign-in block draws `lg`. */
  headerSize?: 'default' | 'lg'
  /** Cross-fade the content region when this key changes (sign-in ↔ sign-up). */
  swapKey?: string
  /** A success moment: the header rises once on `use-celebration`. */
  celebrate?: boolean
}

/** The frame every Auth block shares: header area, a rule, the body. Card = a Modal-like panel; plain = bare content. */
function AuthShell({ block, container = 'card', layout = 'stacked', title, description, icon, iconVariant, iconAppearance, bodyGap = 'spacing.gap-group', headerSize = 'default', swapKey, celebrate = false, children, style, ...props }: ShellProps) {
  const card = container === 'card'
  const inset = v('spacing.inset-surface')
  const inSplit = React.useContext(AuthSplitContext)
  const header = (
    <ModalHeader
      size={inSplit ? 'default' : layout === 'inline' ? 'lg' : headerSize}
      align={inSplit ? 'vertical-left' : card ? 'vertical-center' : 'horizontal'}
      title={title} description={description} descriptionVisible={Boolean(description)}
      icon={icon} iconVariant={iconVariant} iconAppearance={iconAppearance} iconVisible={!inSplit && Boolean(icon)}
    />
  )
  return (
    <section
      data-block={block}
      data-container={container}
      data-layout={layout}
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
        {celebrate ? <Appear role="use-celebration">{header}</Appear> : header}
      </div>
      <Separator tone="subtle" />
      <div data-part="body" key={swapKey} style={card ? { padding: inset } : { paddingTop: v('spacing.gap-section') }}>
        <Appear role="use-page-transition">
          <div style={{ display: 'flex', flexDirection: 'column', gap: v(bodyGap) }}>{children}</div>
        </Appear>
      </div>
    </section>
  )
}

/** "Don't have an account? Sign up": a sentence and its link, centred. */
function AuthFooter({ text, linkLabel, onLink, href = '#', layout = 'stacked', large = false }: { text: string; linkLabel: string; onLink?: () => void; href?: string; layout?: AuthLayout; large?: boolean }) {
  const inline = layout === 'inline'
  return (
    <div data-part="footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: v('spacing.gap-tight'), color: v('color.content.secondary'), ...type(inline || large ? 'body-md' : 'body-sm') }}>
      <span>{text}</span>
      <TextLink href={href} size={inline ? 'sm' : large ? 'default' : 'xs'} onClick={onLink ? (e) => { e.preventDefault(); onLink() } : undefined}>{linkLabel}</TextLink>
    </div>
  )
}

/** A code's slots sit in the middle of the body, under the centred header (the Figma body centres them). */
const Centered = ({ children }: { children: React.ReactNode }) => <div data-part="code" style={{ display: 'flex', justifyContent: 'center' }}>{children}</div>

const OrRule = ({ label = 'OR' }: { label?: string }) => <Separator align="center" tone="default">{label}</Separator>

type BlockProps = Omit<React.ComponentProps<'section'>, 'title' | 'onSubmit'> & AuthPlacement & {
  status?: AuthStatus
  /** The notice shown when `status` is `invalid` (or the field error). */
  error?: string
  onSubmit?: () => void
  onNavigate?: (to: string) => void
}

/** The error each Field draws, as the Figma file words them (16 Nov 2026), by the field's label. */
export const FIELD_ERRORS = {
  email: 'Enter a valid email address.',
  phone: 'Enter a valid phone number.',
  password: 'Password must be at least 8 characters.',
  confirmPassword: 'Passwords do not match.',
  fullName: 'Enter your full name.',
} as const

const busy = (status: AuthStatus) => status === 'loading'
const invalid = (status: AuthStatus) => (status === 'invalid' ? 'Invalid' : 'Default') as 'Invalid' | 'Default'

/** Figma `AuthSignIn`. */
export function AuthSignIn({ container, layout, status = 'idle', error = 'The email or password is not right.', onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  const social: SocialBrand[] = ['Google', 'Apple', 'Discord']
  return (
    <AuthShell block="AuthSignIn" container={container} layout={layout} headerSize="lg" iconVariant="secondary" icon={glyph('lock')} title="Welcome back" description="Sign in to continue to your workspace." {...props}>
      <div data-part="social-row" style={{ display: 'flex', gap: v('spacing.gap-control') }}>
        {social.map((brand) => <SocialLoginButton size={s.control} key={brand} brand={brand} iconOnly style={{ flex: 1 }} />)}
      </div>
      <OrRule />
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size={s.notice} description={error} /></Notice>
      <Field size={s.control} label="Email address" state={invalid(status)} error={FIELD_ERRORS.email}><Input type="email" placeholder="you@company.com" aria-invalid={status === 'invalid' || undefined} /></Field>
      <Field size={s.control} label="Password" trailing={<TextLink href="#" size="sm" onClick={(e) => { e.preventDefault(); onNavigate?.('forgot-password') }}>Forgot?</TextLink>}>
        <Input type="password" placeholder="Enter your password" />
      </Field>
      <CheckboxItem size={s.choice} label="Remember me for 30 days" />
      <Button size={s.control} loading={busy(status)} onClick={onSubmit}>Sign in</Button>
      <AuthFooter layout={layout} large text="Don't have an account?" linkLabel="Sign up" onLink={() => onNavigate?.('sign-up')} />
    </AuthShell>
  )
}

/** Figma `AuthSignUp`. */
export function AuthSignUp({ container, layout, status = 'idle', error = 'That email already has an account.', onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  // The meter scores what is typed, live (the number of the five rules met).
  const [password, setPassword] = React.useState('')
  return (
    <AuthShell block="AuthSignUp" container={container} layout={layout} headerSize="lg" iconVariant="default" iconAppearance="gradient" icon={glyph('user')} title="Get started now" description="Create your account in less than a minute." {...props}>
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size={s.notice} description={error} /></Notice>
      <Field size={s.control} label="Full name"><Input placeholder="Ada Lovelace" /></Field>
      <Field size={s.control} label="Email address" state={invalid(status)} error={FIELD_ERRORS.email}><Input type="email" placeholder="you@company.com" /></Field>
      <Field size={s.control} label="Password"><Input type="password" autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <PasswordStrengthMeter size={s.choice} strength={scorePassword(password)} />
      <div data-part="consent" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
        <Checkbox size={s.choice} aria-label="I agree to the Terms of Service and Privacy Policy" />
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: v('spacing.gap-tight'), color: v('color.content.secondary'), ...type(s.inline ? 'body-lg' : 'body-sm') }}>
          I agree to the <TextLink href="#" size={s.inline ? 'default' : 'xs'}>Terms of Service</TextLink> and <TextLink href="#" size={s.inline ? 'default' : 'xs'}>Privacy Policy</TextLink>
        </span>
      </div>
      <Button size={s.control} loading={busy(status)} onClick={onSubmit}>Create account</Button>
      <AuthFooter layout={layout} text="Already have an account?" linkLabel="Sign in" onLink={() => onNavigate?.('sign-in')} />
    </AuthShell>
  )
}

/** Figma `AuthSignInPhone` (flow 1662:717): the body is two groups, the form (field + consent) and the actions (code · OR · email),
 *  a `gap-section` apart; each group keeps `gap-group` inside. The country picker is an anchored Popover on every viewport. */
export function AuthSignInPhone({
  container, layout, status = 'idle', error = FIELD_ERRORS.phone, defaultCountry, defaultPhone, picker, onSubmit, onNavigate, ...props
}: BlockProps & {
  /** Where the country starts (ISO code); the browser's language by default. */
  defaultCountry?: string
  /** The number the field starts with (the Filled state). */
  defaultPhone?: string
  /** Docs and tests: the picker's visible viewport and the box it flips inside (a phone frame, a keyboard). */
  picker?: Pick<React.ComponentProps<typeof PhoneNumberInput>, 'viewport' | 'collisionBoundary'>
}) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthSignInPhone" container={container} layout={layout} headerSize="lg" icon={glyph('device-mobile')} iconVariant="secondary" bodyGap="spacing.gap-section" title="Sign in with your phone" description="We will text you a 6-digit code. Standard message rates may apply." {...props}>
      <div data-part="form" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group') }}>
        <Field size={s.control} label="Phone number" required state={invalid(status)} error={error}>
          <PhoneNumberInput autoComplete="tel" placeholder="6 12 34 56 78" defaultCountry={defaultCountry} defaultValue={defaultPhone} {...picker} />
        </Field>
        <CheckboxItem size={s.choice} label="Send me product updates by SMS" rowStyle={{ width: '100%' }} />
      </div>
      <div data-part="actions" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group') }}>
        <Button size={s.control} loading={busy(status)} onClick={onSubmit}>Send code</Button>
        <OrRule />
        <Button size={s.control} variant="secondary" leading={boxedGlyph('envelope-simple')} disabled={busy(status)} onClick={() => onNavigate?.('sign-in')}>Continue with email</Button>
      </div>
    </AuthShell>
  )
}

/** Figma `AuthOTPVerification`. */
export function AuthOTPVerification({ container, layout, status = 'idle', onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthOTPVerification" container={container} layout={layout} iconVariant="secondary" icon={glyph('lock')} title="Enter your code" description="We sent a 4-digit code to +49 171 39200 12." {...props}>
      <Centered><InputOTP size={s.control} length={4} variant="outline" aria-label="One-time code" aria-invalid={status === 'invalid' || undefined} /></Centered>
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size={s.notice} description="That code is not right. Try again." /></Notice>
      <Button size={s.control} loading={busy(status)} onClick={onSubmit}>Verify and continue</Button>
      <Button size={s.control} variant="secondary" disabled>Resend code in 00:23</Button>
      <AuthFooter layout={layout} text="Wrong number?" linkLabel="Change it" onLink={() => onNavigate?.('phone')} />
    </AuthShell>
  )
}

/** Figma `AuthTwoFactor`. */
export function AuthTwoFactor({ container, layout, status = 'idle', onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthTwoFactor" container={container} layout={layout} iconVariant="info" icon={glyph('lock')} title="Two-factor authentication" description="Open your authenticator app and enter the current code for Escala." {...props}>
      <div data-part="code-timer" style={{ display: 'flex', justifyContent: 'space-between', color: v('color.content.secondary'), ...type('body-sm') }}>
        <span>Code refreshes in</span><span>00:18</span>
      </div>
      <Centered><InputOTP size={s.control} length={6} variant="outline" aria-label="Authenticator code" aria-invalid={status === 'invalid' || undefined} /></Centered>
      <Notice open={status === 'invalid'}><Alert variant="critical" appearance="soft" size={s.notice} description="That code is not right. Try again." /></Notice>
      <CheckboxItem size={s.choice} label="Trust this device for 30 days" />
      <Button size={s.control} loading={busy(status)} onClick={onSubmit}>Verify</Button>
      <AuthFooter layout={layout} text="Lost your device?" linkLabel="Use a backup code" onLink={() => onNavigate?.('backup-code')} />
    </AuthShell>
  )
}

/** Figma `AuthForgotPassword` (Method email · sms). The method switch swaps the field (email ↔ phone with its country)
 *  and the action's copy; only that region cross-fades, so the switch keeps its focus. `method` controls it, or
 *  `defaultMethod` starts it and the block keeps it. */
export function AuthForgotPassword({
  container, layout, method: controlled, defaultMethod = 'email', status = 'idle', error, onSubmit, onNavigate, onMethodChange, ...props
}: BlockProps & { method?: 'email' | 'sms'; defaultMethod?: 'email' | 'sms'; onMethodChange?: (m: 'email' | 'sms') => void }) {
  const s = authSizes(layout)
  const [inner, setInner] = React.useState(defaultMethod)
  const method = controlled ?? inner
  const email = method === 'email'
  const choose = (m: string) => { const next = m as 'email' | 'sms'; setInner(next); onMethodChange?.(next) }
  // The first draw does not slide: only a change of method does.
  const mounted = React.useRef(false)
  React.useEffect(() => { mounted.current = true }, [])
  return (
    <AuthShell block="AuthForgotPassword" container={container} layout={layout} iconVariant="secondary" icon={glyph('lock')} title="Forgot password?" description="No worries, we'll send you reset instructions." {...props}>
      <SegmentedControl size={s.control} fullWidth value={method} onValueChange={choose} aria-label="Send reset instructions by">
        <SegmentedControlItem value="email" label="Email" />
        <SegmentedControlItem value="sms" label="SMS" />
      </SegmentedControl>
      {/* Only the field swaps: it slides in from the side of the segment just chosen (SMS is on the right, so it enters
          from the right; Email from the left) and fades on `use-page-transition`. The button stays put and only its label
          cross-fades, so nothing under the switch jumps or flashes. Reduced motion zeroes the role: a plain swap. */}
      <div data-part="method-region" style={{ overflow: 'hidden', margin: `calc(${v('spacing.gap-tight')} * -1)`, padding: v('spacing.gap-tight') }}>
        <Appear key={method} role="use-page-transition" from={`translateX(calc(${v('spacing.gap-section')} * ${mounted.current ? (email ? -1 : 1) : 0}))`}>
          <Field
            size={s.control}
            label={email ? 'Email address' : 'Phone number'}
            required
            state={invalid(status)}
            error={error ?? (email ? FIELD_ERRORS.email : FIELD_ERRORS.phone)}
          >
            {email ? <Input type="email" placeholder="you@company.com" /> : <PhoneNumberInput placeholder="(201) 555-0123" />}
          </Field>
        </Appear>
      </div>
      <Button size={s.control} loading={busy(status)} onClick={onSubmit}>
        <Appear key={method} inline role="use-page-transition" from="none">{email ? 'Send reset link' : 'Send reset code'}</Appear>
      </Button>
      <Button size={s.control} variant="secondary" leading={boxedGlyph('caret-left')} onClick={() => onNavigate?.('sign-in')}>Back to sign in</Button>
    </AuthShell>
  )
}

/** Figma `AuthNewPassword`. */
export function AuthNewPassword({ container, layout, status = 'idle', error = FIELD_ERRORS.confirmPassword, onSubmit, ...props }: BlockProps) {
  const s = authSizes(layout)
  const [password, setPassword] = React.useState('')
  return (
    <AuthShell block="AuthNewPassword" container={container} layout={layout} iconVariant="secondary" icon={glyph('lock')} title="Set a new password" description="Your new password must be different from the last one you used." {...props}>
      <Field size={s.control} label="New password"><Input type="password" autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <PasswordStrength size={s.choice} value={password} rulesVisible />
      <Field size={s.control} label="Confirm password" state={invalid(status)} error={error}><Input type="password" placeholder="Repeat the password" /></Field>
      <Button size={s.control} loading={busy(status)} onClick={onSubmit}>Update password</Button>
    </AuthShell>
  )
}

/** Figma `AuthCheckEmail`. A success moment: the header rises once on `use-celebration`. */
export function AuthCheckEmail({ container, layout, onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthCheckEmail" container={container} layout={layout} iconVariant="success" icon={glyph('check-circle')} celebrate title="Check your email" description="We sent a password reset link to hi@escala.design. It expires in 30 minutes." {...props}>
      <Button size={s.control} onClick={onSubmit}>Open mail app</Button>
      <Button size={s.control} variant="secondary" onClick={() => onNavigate?.('sign-in')}>Skip for now</Button>
      <AuthFooter layout={layout} text="Didn't receive it?" linkLabel="Resend email" onLink={() => onNavigate?.('resend')} />
    </AuthShell>
  )
}

/** Figma `AuthMagicLinkSent`. */
export function AuthMagicLinkSent({ container, layout, onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthMagicLinkSent" container={container} layout={layout} iconVariant="info" icon={glyph('sparkle')} celebrate title="Your sign-in link is on the way" description="Click the link we sent to hi@escala.design to sign in. No password needed." {...props}>
      <Alert variant="info" appearance="soft" size={s.notice} description="The link expires in 10 minutes and works once." />
      <Button size={s.control} onClick={onSubmit}>Open inbox</Button>
      <Button size={s.control} variant="secondary" onClick={() => onNavigate?.('resend')}>Send a new link</Button>
      <AuthFooter layout={layout} text="Prefer a password?" linkLabel="Sign in the classic way" onLink={() => onNavigate?.('sign-in')} />
    </AuthShell>
  )
}

/** Figma `AuthAccountLocked`. */
export function AuthAccountLocked({ container, layout, onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthAccountLocked" container={container} layout={layout} iconVariant="warning" icon={glyph('warning')} title="Account temporarily locked" description="We paused sign-in after five failed attempts. This protects your account while we confirm it is you." {...props}>
      <Alert variant="warning" appearance="soft" size={s.notice} description="Unlocks automatically in 14:52. Last attempt from Istanbul, TR." />
      <Button size={s.control} onClick={onSubmit}>Unlock with email</Button>
      <Button size={s.control} variant="secondary" onClick={() => onNavigate?.('forgot-password')}>Reset my password</Button>
      <AuthFooter layout={layout} text="Not you?" linkLabel="Report suspicious activity" onLink={() => onNavigate?.('report')} />
    </AuthShell>
  )
}

/** Figma `AuthError`. */
export function AuthError({ container, layout, onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthError" container={container} layout={layout} iconVariant="critical" icon={glyph('warning-circle')} title="Verification failed" description="The link you used has expired or was already claimed. Reset links stay valid for 30 minutes." {...props}>
      <Alert variant="critical" appearance="soft" size={s.notice} description="Error code AUTH_LINK_EXPIRED. Nothing was changed on your account." />
      <Button size={s.control} onClick={onSubmit}>Request a new link</Button>
      <Button size={s.control} variant="secondary" onClick={() => onNavigate?.('support')}>Contact support</Button>
    </AuthShell>
  )
}

/** Figma `AuthSocialSignIn`. */
export function AuthSocialSignIn({ container, layout, onSubmit, onNavigate, ...props }: BlockProps) {
  const s = authSizes(layout)
  return (
    <AuthShell block="AuthSocialSignIn" container={container} layout={layout} headerSize="lg" iconVariant="secondary" icon={glyph('user')} title="Continue with" description="Use the account you already have. We never post on your behalf." {...props}>
      {(['Google', 'Discord', 'Apple'] as SocialBrand[]).map((brand) => <SocialLoginButton size={s.control} key={brand} brand={brand} appearance="brand" onClick={onSubmit} />)}
      <OrRule label="OR PICK A PROVIDER" />
      {/* Two equal columns of the same white SocialLoginButton, each labelled with the provider only (as the Figma grid
          draws them). SAML SSO is the fourth cell: the same SocialLoginButton with the globe as its mark. The white
          appearance paints every brand alike; GitHub is named only for its neutral focus ring. */}
      <div data-part="provider-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: v('spacing.gap-control') }}>
        {(['GitHub', 'X', 'LinkedIn'] as SocialBrand[]).map((brand) => <SocialLoginButton size={s.control} key={brand} brand={brand} label={brand} onClick={onSubmit} />)}
        <SocialLoginButton
          size={s.control} brand="GitHub" label="SAML SSO" onClick={() => onNavigate?.('sso')}
          leading={<span data-part="SocialLoginButton.icon" className="inline-flex shrink-0">{boxedGlyph('globe')}</span>}
        />
      </div>
      <AuthFooter layout={layout} text="New to Escala?" linkLabel="Create an account" onLink={() => onNavigate?.('sign-up')} />
    </AuthShell>
  )
}

/** The social providers `AuthSignInPasskey` offers, as the Figma block lists them. */
const PASSKEY_PROVIDERS: SocialBrand[] = ['Google', 'Apple', 'GitHub']

/** Figma `AuthSignInPasskey` (2146:8197): the tray modal. A raised panel (header, email, passkey, providers) over the filled footer tray.
 *  The block only reports what was chosen: WebAuthn lives in the app. Inside a Modal the title names the dialog and the overlay's
 *  `dialog-enter` / `dialog-exit` play; the block adds no motion. Its left-aligned title is an accepted exception (EXC-2026-11-18-001). */
export function AuthSignInPasskey({ title = 'Welcome back', description = 'Sign in to continue to your workspace.', onContinue, onPasskey, onProvider, onSignUp, style, ...props }: Omit<React.ComponentProps<'section'>, 'title'> & {
  title?: string
  description?: string
  onContinue?: (email: string) => void
  onPasskey?: () => void
  onProvider?: (id: string) => void
  onSignUp?: () => void
}) {
  const [email, setEmail] = React.useState('')
  const inset = v('spacing.inset-surface')
  const titleId = React.useId()
  return (
    <section
      data-block="AuthSignInPasskey"
      aria-labelledby={titleId}
      style={{
        width: '100%', maxWidth: 'calc(var(--spacing-32) * 3 + var(--spacing-24))', display: 'flex', flexDirection: 'column',
        color: v('color.content.primary'), ...type('body-md'), background: v('color.surface.layer-2'),
        border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.overlay'), boxShadow: liftShadow('modal'), overflow: 'hidden', ...style,
      }}
      {...props}
    >
      <div data-part="panel" style={{ display: 'flex', flexDirection: 'column', background: v('color.surface.raised'), border: `${v('stroke.divider')} solid ${v('color.border.subtle')}`, borderBottomLeftRadius: v('radius.container'), borderBottomRightRadius: v('radius.container') }}>
        <div data-part="header-area" style={{ padding: inset, paddingBottom: 0 }}>
          <ModalHeader size="lg" align="vertical-left" iconVisible={false} title={<span id={titleId}>{title}</span>} description={description} />
        </div>
        <div data-part="body" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), padding: inset }}>
          <Field label="Email address"><Input type="email" leading={glyph('envelope-simple')} autoComplete="username webauthn" placeholder="hi@escala.design" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button onClick={() => onContinue?.(email)}>Continue</Button>
          <OrRule />
          <Button variant="secondary" appearance="outline" leading={boxedGlyph('key')} onClick={onPasskey}>Sign in with a passkey</Button>
          <div data-part="social-row" style={{ display: 'flex', gap: v('spacing.gap-control') }}>
            {PASSKEY_PROVIDERS.map((brand) => <SocialLoginButton key={brand} brand={brand} label={brand} style={{ flex: 1, minWidth: 0 }} onClick={() => onProvider?.(brand.toLowerCase())} />)}
          </div>
        </div>
      </div>
      <div data-part="footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: v('spacing.gap-tight'), padding: inset, color: v('color.content.secondary'), ...type('body-md') }}>
        <span>No account?</span>
        <TextLink href="#" onClick={(e) => { e.preventDefault(); onSignUp?.() }}>Sign up</TextLink>
      </div>
    </section>
  )
}

/** The viewport is at or above the Tablet breakpoint (`--breakpoint-tablet`). True until measured, so a page opens on its full layout. */
/** A stage that draws a block inside a device frame says whether that frame is Tablet or wider: the window it runs in is not the
 *  viewport the block is shown at. A real page provides nothing and the window decides. */
export const AuthDeviceFrameContext = React.createContext<{ tabletUp: boolean } | null>(null)

function useTabletUp() {
  const frame = React.useContext(AuthDeviceFrameContext)
  const [up, setUp] = React.useState(true)
  React.useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-tablet').trim() || BREAKPOINT_STANDARD.sm
    const query = window.matchMedia(`(min-width: ${value})`)
    const sync = () => setUp(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return frame ? frame.tabletUp : up
}

/** Figma `AuthSplit` (2146:8199): a brand panel beside any Auth block. `children` is the block, in `container="plain"`: its header
 *  aligns left and hides its icon here. Below the Tablet breakpoint only `children` is drawn. No motion on load. */
export function AuthSplit({ title = 'One source of tokens. Every surface in sync.', description = 'Sign in to pick up where your team left off: variables, components and reviews in one place.', mediaIcon, media, mediaAlt = '', children, style, ...props }: Omit<React.ComponentProps<'section'>, 'title'> & {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Figma MediaIcon: the glyph of the panel's FeaturedIcon. */
  mediaIcon?: React.ReactNode
  /** A photo (URL) between the icon and the copy, filling the panel's free height. The Figma set draws the bare
   *  accent panel; the photo is a code addition (the copy never sits on it, so no on-image ink role is needed). */
  media?: string
  /** The photo's alt text; empty (decorative) by default. */
  mediaAlt?: string
}) {
  const tabletUp = useTabletUp()
  const content = <AuthSplitContext.Provider value>{children}</AuthSplitContext.Provider>
  if (!tabletUp) return content
  const page = v('spacing.inset-page')
  return (
    <section
      data-block="AuthSplit"
      style={{
        // 1120 = 8 × spacing-32 + spacing-24: the width the Figma block is drawn at.
        width: '100%', maxWidth: 'calc(var(--spacing-32) * 8 + var(--spacing-24))', display: 'flex', background: v('color.surface.page'),
        border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'), overflow: 'hidden', ...style,
      }}
      {...props}
    >
      {/* 520 = 4 × spacing-32 + spacing-2. */}
      <div data-part="media" style={{ flex: '0 1 calc(var(--spacing-32) * 4 + var(--spacing-2))', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: v('spacing.gap-section'), padding: page, background: v('color.surface.accent') }}>
        <FeaturedIcon size="xl" variant="default" appearance="gradient" shape="rounded" icon={mediaIcon} />
        {media ? (
          <img data-part="photo" src={media} alt={mediaAlt} style={{ flex: 1, minHeight: 0, width: '100%', objectFit: 'cover', borderRadius: v('radius.container'), display: 'block' }} />
        ) : null}
        <div data-part="copy" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control') }}>
          <h2 style={{ margin: 0, color: v('color.content.primary'), ...type('heading-lg') }}>{title}</h2>
          <p style={{ margin: 0, color: v('color.content.secondary'), ...type('body-lg') }}>{description}</p>
        </div>
      </div>
      <div data-part="content" style={{ flex: '1 1 calc(var(--spacing-32) * 3 + var(--spacing-24))', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: page }}>{content}</div>
    </section>
  )
}

export const AUTH_BLOCKS = {
  AuthSignIn, AuthSignUp, AuthSignInPhone, AuthOTPVerification, AuthTwoFactor, AuthForgotPassword,
  AuthNewPassword, AuthCheckEmail, AuthMagicLinkSent, AuthAccountLocked, AuthError, AuthSocialSignIn,
} as const
