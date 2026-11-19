// Escala blocks · Auth setup. The two enrolment blocks a signed-in person opens from Security settings, each on its own Figma
// page: `AuthPasskeySetup (PRO)` (2370:42) and `AuthTwoFactorSetup (PRO)` (2374:42). Both are the system's `Modal`
// (Layout tray · Size lg · CloseVisible false) with one fixed card size: a three-segment progress strip, a step region of a
// fixed height whose content swaps, and the step counter in the ModalFooter's Leading slot. Nothing is drawn here except the
// arrangement of escala-ui components, in role tokens (CSS variables).
//
// The blocks are controlled: `type` × `status` are the Figma axes, and every action is a callback. The two hooks at the end
// (`useAuthPasskeySetup`, `useAuthTwoFactorSetup`) hold the flow, so the app only supplies the WebAuthn call or the code check.
//
// Motion (contract in authSetup.contract.json): open / close are the Modal's own choreography and the card never moves; a
// step swap fades its content in on `use-page-transition`; an inline error arrives on `use-disclosure-in`; the passkey ring
// turns on `use-loop` while the device is asked and its check lands on `use-emphasis-in`. A nested component keeps its own
// motion (ProgressLine fills on `use-progress`, a Button changes colour on `use-hover`).
//
// Two accepted exceptions: the left-aligned ModalHeader with no icon (as AuthSignInPasskey), and the QR's fixed black on
// white, which a scanner needs in both themes (the only colour in this file that is not a role).
import * as React from 'react'
import qrcode from 'qrcode-generator'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph } from '../../../lib/icons'
import { boxedGlyph, blockType } from './shared'
import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Button } from '../button'
import { CheckboxItem } from '../checkbox'
import { FeaturedIcon } from '../featured-icon'
import { Field } from '../field'
import { Input } from '../input'
import { InputOTP } from '../input-otp'
import { Modal, ModalContent, ModalFooter, ModalHeader } from '../modal'
import { ProgressCircle, ProgressLine } from '../progress-line'

/** Figma `Status`, shared by both blocks and by AuthPasskeySetupIndicator. */
export const AUTH_SETUP_STATUSES = ['active', 'error', 'completed'] as const
export type AuthSetupStatus = (typeof AUTH_SETUP_STATUSES)[number]

export const AUTH_PASSKEY_SETUP_TYPES = ['intro', 'confirm', 'saved'] as const
export type AuthPasskeySetupType = (typeof AUTH_PASSKEY_SETUP_TYPES)[number]
/** The combinations the Figma set draws. Any other pair draws the nearest one (intro is always active, saved always completed). */
export const AUTH_PASSKEY_SETUP_VARIANTS = [['intro', 'active'], ['confirm', 'active'], ['confirm', 'error'], ['confirm', 'completed'], ['saved', 'completed']] as const

export const AUTH_TWO_FACTOR_SETUP_TYPES = ['scan', 'verify', 'backup'] as const
export type AuthTwoFactorSetupType = (typeof AUTH_TWO_FACTOR_SETUP_TYPES)[number]
/** The combinations the Figma set draws (scan is always active, backup has no error). */
export const AUTH_TWO_FACTOR_SETUP_VARIANTS = [['scan', 'active'], ['verify', 'active'], ['verify', 'error'], ['verify', 'completed'], ['backup', 'active'], ['backup', 'completed']] as const

// The sample account every Figma frame of these pages uses.
const PRODUCT = 'Ohmewn'
const ACCOUNT = 'ines@ohmewn.app'
const DOMAIN = 'ohmewn.app'
/** The sample TOTP secret (base32) and the `otpauth://` link the QR carries. */
export const AUTH_TWO_FACTOR_SETUP_SECRET = 'QK7MR2XD5LVNA3WE'
export const AUTH_TWO_FACTOR_SETUP_URI = `otpauth://totp/${PRODUCT}:${encodeURIComponent(ACCOUNT)}?secret=${AUTH_TWO_FACTOR_SETUP_SECRET}&issuer=${PRODUCT}`
/** The eight single-use codes the file draws. */
export const AUTH_TWO_FACTOR_SETUP_CODES = ['k7r2-9xmw', 'p4vd-3nqe', 'h8tz-6fja', 'w2cs-5ybk', 'm9gq-1rvh', 'd3ne-7wtp', 'b6yx-4kaz', 'f5hu-8cmd'] as const
const CODE_LENGTH = 6

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = blockType
const motion = (role: string) => `var(--motion-${role}-duration) var(--motion-${role}-easing)`
const col = (gap = 'spacing.gap-group'): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: v(gap) })
const primary = v('color.content.primary')
const secondary = v('color.content.secondary')
const critical = v('color.status.critical.content')

// The step region's height, so the card keeps one size across steps (Figma `step`: 264 and 232, on the spacing scale).
const PASSKEY_STEP_HEIGHT = 'calc(var(--spacing-32) * 2 + var(--spacing-2))'
const TWO_FACTOR_STEP_HEIGHT = 'calc(var(--spacing-32) + var(--spacing-24) + var(--spacing-2))'
// The QR artwork: 164 square inside the tile. Black on white in both themes (accepted exception: a scanner needs fixed contrast).
const QR_SIDE = 'calc(var(--spacing-32) + var(--spacing-8) + var(--spacing-1))'
const QR_PAPER = 'white'
const QR_INK = 'black'

// A plain <button> a block draws itself (the sensor, the authenticator's code): the system's focus ring, in role tokens.
const FOCUS_RING = 'outline-none focus-visible:outline-solid focus-visible:[outline-width:var(--stroke-focus)] focus-visible:[outline-color:var(--color-border-ring-default)] focus-visible:[outline-offset:var(--stroke-divider)]'
// The ring turns while the device is asked: one turn per `use-loop`, still under reduced motion (the label says what is happening).
const RING_LOOP = 'animate-[spin_var(--motion-use-loop-duration)_var(--motion-use-loop-easing)_infinite] motion-reduce:animate-none'

/** A recessed panel inside the step (Surface/layer-1, Border/subtle, Radius/container). The stroke lays out in Figma, so the
 *  padding is the role in full, inside the border. */
const well = (padding: string): React.CSSProperties => ({
  boxSizing: 'border-box', width: '100%', background: v('color.surface.layer-1'),
  border: `${v('stroke.divider')} solid ${v('color.border.subtle')}`, borderRadius: v('radius.container'), padding: v(padding),
})

/** Mounts transparent and settles on a motion role: a step's content (rise), an inline error (rise), the check (pop). */
function Appear({ role, from = 'rise', style, children, ...props }: React.ComponentProps<'div'> & { role: 'use-page-transition' | 'use-disclosure-in' | 'use-emphasis-in'; from?: 'rise' | 'pop' }) {
  const [on, setOn] = React.useState(false)
  // A timer, not requestAnimationFrame: a hidden tab never ticks a frame and the content would stay transparent.
  React.useEffect(() => { const id = setTimeout(() => setOn(true), 16); return () => clearTimeout(id) }, [])
  const rest = from === 'pop' ? 'scale(var(--motion-transform-pop, 1))' : 'translateY(var(--motion-transform-enter, 0))'
  return (
    <div {...props} style={{ opacity: on ? 1 : 0, transform: on ? 'none' : rest, transition: `opacity ${motion(role)}, transform ${motion(role)}`, ...style }}>
      {children}
    </div>
  )
}

export interface AuthSetupBlockProps {
  /** Render in place (docs, previews) instead of as a dialog over the page. */
  inline?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ShellProps extends AuthSetupBlockProps {
  block: string
  step: string
  status: AuthSetupStatus
  title: string
  /** 1 · 2 · 3: the counter in the footer and the segments filled. */
  index: number
  height: string
  /** Where focus lands when the step changes: its heading, or the code field. */
  focus?: 'heading' | 'code'
  describedBy: string
  footer: React.ReactNode
  children: React.ReactNode
}

/** The shell both blocks share: Modal tray lg with no close, the progress strip, the step region, the counter and the actions. */
function SetupShell({ block, step, status, inline = true, open = true, onOpenChange, title, index, height, focus = 'heading', describedBy, footer, children }: ShellProps) {
  const region = React.useRef<HTMLDivElement>(null)
  const focusStep = () => {
    const root = region.current
    const target = (focus === 'code' ? root?.querySelector<HTMLElement>('input') : null) ?? root?.querySelector<HTMLElement>('[data-part="step-title"]')
    target?.focus()
  }
  // Focus follows the step, never the first paint: in place (docs) a block must not take focus from the page.
  const shown = React.useRef(step)
  React.useEffect(() => {
    if (shown.current === step) return
    shown.current = step
    focusStep()
  })
  return (
    <Modal open={open} onOpenChange={onOpenChange} modal={!inline}>
      <ModalContent
        inline={inline}
        layout="tray"
        size="lg"
        showCloseButton={false}
        data-block={block}
        data-type={step}
        data-status={status}
        aria-describedby={describedBy}
        {...(inline ? {} : { onOpenAutoFocus: (e: Event) => { e.preventDefault(); focusStep() } })}
        header={<ModalHeader align="vertical-left" iconVisible={false} descriptionVisible={false} title={title} />}
        footer={(
          <ModalFooter layout="inline" leadingVisible leading={<span data-part="step-counter" style={{ color: secondary, ...type('caption') }}>Step {index} of 3</span>}>
            {footer}
          </ModalFooter>
        )}
      >
        {/* Decorative: the counter in the footer says the same in words. */}
        <div data-part="progress" aria-hidden style={{ display: 'flex', gap: v('spacing.gap-tight'), flexShrink: 0 }}>
          {[1, 2, 3].map((n) => <ProgressLine key={n} size="xs" value={n <= index ? 100 : 0} style={{ flex: 1, minWidth: 0 }} />)}
        </div>
        {/* A minimum, not a height: every step is shorter on the 640 card, so it keeps one size; on a phone the text wraps and the step grows. */}
        <div ref={region} data-part="step" style={{ minHeight: height, flexShrink: 0 }}>
          <Appear key={step} role="use-page-transition" style={col()}>{children}</Appear>
        </div>
      </ModalContent>
    </Modal>
  )
}

/** A step's heading and sentence. The heading takes focus when the step changes; the sentence describes the dialog. */
function StepIntro({ title, description, id }: { title: string; description: React.ReactNode; id: string }) {
  return (
    <div data-part="intro" style={col('spacing.gap-tight')}>
      <h3 data-part="step-title" tabIndex={-1} className="outline-none" style={{ margin: 0, color: primary, ...type('heading-2xs') }}>{title}</h3>
      <p id={id} data-part="step-description" style={{ margin: 0, color: secondary, ...type('body-md') }}>{description}</p>
    </div>
  )
}

/** The line under a step's control: a helper, or the error that takes its place (announced, arriving on `use-disclosure-in`). */
function StatusLine({ error, helper, id }: { error?: React.ReactNode; helper?: React.ReactNode; id?: string }) {
  return (
    <div data-part="status-line" aria-live="polite">
      {error ? (
        <Appear role="use-disclosure-in" id={id} data-part="error" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-tight'), color: critical, ...type('helper') }}>
          {boxedGlyph('warning-circle', 'icon.small')}
          <span>{error}</span>
        </Appear>
      ) : helper ? <p data-part="helper" style={{ margin: 0, color: secondary, ...type('helper') }}>{helper}</p> : null}
    </div>
  )
}

const ghost = (label: string, onClick?: () => void, disabled = false) => <Button variant="secondary" appearance="ghost" disabled={disabled} onClick={onClick}>{label}</Button>

// ── AuthPasskeySetup ─────────────────────────────────────────────────────────

const INDICATOR: Record<AuthSetupStatus, { label: string; hint: string; value: number }> = {
  active: { label: 'Touch ID', hint: `Place your finger on the sensor to save a passkey for ${DOMAIN}`, value: 25 },
  error: { label: 'Not recognised', hint: 'Try again, or use your device PIN instead', value: 0 },
  completed: { label: 'Verified', hint: 'Saving your passkey to iCloud Keychain', value: 100 },
}

export interface AuthPasskeySetupIndicatorProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Status: `active` waits for the authenticator, `error` is a cancelled or timed-out request, `completed` a created credential. */
  status?: AuthSetupStatus
  label?: React.ReactNode
  hint?: React.ReactNode
  /** A simulated prompt (stories, a prototype): the sensor becomes a button. A live product passes nothing, the device asks. */
  onSensorClick?: () => void
  sensorLabel?: string
}

/** Figma `AuthPasskeySetupIndicator` (2373:708): the platform prompt as the block shows it. A ring around the biometric glyph,
 *  a label and a hint. The ring is decorative; the label is announced (`aria-live`). */
export function AuthPasskeySetupIndicator({ status = 'active', label, hint, onSensorClick, sensorLabel = 'Touch the sensor', style, ...props }: AuthPasskeySetupIndicatorProps) {
  const copy = INDICATOR[status]
  const sensor = (
    <>
      <span aria-hidden data-part="ring" className={status === 'active' ? RING_LOOP : undefined} style={{ display: 'inline-flex' }}>
        <ProgressCircle size="lg" cap="round" value={copy.value} />
      </span>
      <span aria-hidden data-part="glyph" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: status === 'error' ? critical : v('color.content.accent') }}>
        {status === 'completed'
          ? <Appear role="use-emphasis-in" from="pop" style={{ display: 'inline-flex' }}>{boxedGlyph('check', 'icon.large')}</Appear>
          : boxedGlyph('fingerprint', 'icon.large')}
      </span>
    </>
  )
  const box: React.CSSProperties = { position: 'relative', display: 'inline-flex', flexShrink: 0 }
  return (
    <div data-block="AuthPasskeySetupIndicator" data-status={status} style={{ ...well('spacing.inset-surface'), ...col(), alignItems: 'center', ...style }} {...props}>
      {onSensorClick && status === 'active'
        ? <button type="button" data-part="sensor" aria-label={sensorLabel} onClick={onSensorClick} className={FOCUS_RING} style={{ ...box, margin: 0, padding: 0, border: 0, background: 'none', color: 'inherit', cursor: 'pointer', borderRadius: v('radius.full') }}>{sensor}</button>
        : <span data-part="sensor" style={box}>{sensor}</span>}
      <div data-part="caption" style={{ ...col('spacing.gap-tight'), alignSelf: 'stretch', textAlign: 'center' }}>
        <span data-part="label" aria-live="polite" style={{ color: status === 'error' ? critical : primary, ...type('body-md') }}>{label ?? copy.label}</span>
        <span data-part="hint" style={{ color: secondary, ...type('body-sm') }}>{hint ?? copy.hint}</span>
      </div>
    </div>
  )
}

const BENEFITS: [Parameters<typeof glyph>[0], string, string][] = [
  ['scan-smiley', 'Your biometrics stay on this device', `${PRODUCT} only receives a signed proof, never your face or fingerprint.`],
  ['shield-check', 'Built to resist phishing', `The passkey only works on ${DOMAIN}, so a fake site gets nothing.`],
  ['cloud-check', 'Ready on your other devices', 'Synced through iCloud Keychain or Google Password Manager.'],
]

/** An icon, a title and a line: a benefit, the saved passkey. */
function Entry({ title, description }: { title: string; description: string }) {
  return (
    <span data-part="text" style={{ ...col('spacing.gap-tight'), flex: 1, minWidth: 0 }}>
      <span style={{ color: primary, ...type('body-md') }}>{title}</span>
      <span style={{ color: secondary, ...type('body-sm') }}>{description}</span>
    </span>
  )
}

export interface AuthPasskeySetupProps extends AuthSetupBlockProps {
  /** Figma Type: the step. */
  type?: AuthPasskeySetupType
  /** Figma Status: where the WebAuthn request stands on `confirm`. */
  status?: AuthSetupStatus
  /** The name the saved step proposes for the new passkey. */
  defaultName?: string
  /** The line under the indicator. The file's text says the prompt is simulated; a live product passes its own or `null`. */
  helper?: React.ReactNode
  /** Not now: leaves without creating anything. */
  onCancel?: () => void
  /** Create passkey: the app starts `navigator.credentials.create()`. */
  onCreate?: () => void
  onBack?: () => void
  /** Try again, after a cancelled or timed-out request. */
  onRetry?: () => void
  /** A simulated prompt only: the sensor was clicked. */
  onSensor?: () => void
  /** Done, with the name the person kept or typed. */
  onDone?: (name: string) => void
}

/** Figma `AuthPasskeySetup` (2373:768): passkey enrolment in three steps. `intro` explains the benefit, `confirm` hands over to
 *  the platform authenticator (Status active · error · completed), `saved` names the new credential. */
export function AuthPasskeySetup({
  type: step = 'intro', status: given = 'active', defaultName = "Inès's MacBook Pro", helper = 'Simulated prompt. Click the sensor to continue.',
  onCancel, onCreate, onBack, onRetry, onSensor, onDone, ...shell
}: AuthPasskeySetupProps) {
  const status: AuthSetupStatus = step === 'intro' ? 'active' : step === 'saved' ? 'completed' : given
  const [name, setName] = React.useState(defaultName)
  const describedBy = React.useId()
  const close = () => { onCancel?.(); shell.onOpenChange?.(false) }

  let footer: React.ReactNode
  if (step === 'intro') footer = <>{ghost('Not now', close)}<Button leading={boxedGlyph('key')} onClick={onCreate}>Create passkey</Button></>
  else if (step === 'saved') footer = <Button onClick={() => onDone?.(name)}>Done</Button>
  else if (status === 'error') footer = <>{ghost('Back', onBack)}<Button leading={boxedGlyph('arrow-clockwise')} onClick={onRetry}>Try again</Button></>
  else footer = <>{ghost('Back', onBack, status === 'completed')}<Button loading>{status === 'completed' ? 'Saving passkey' : 'Waiting for device'}</Button></>

  return (
    <SetupShell block="AuthPasskeySetup" {...shell} step={step} status={status} title="Set up a passkey" index={AUTH_PASSKEY_SETUP_TYPES.indexOf(step) + 1} height={PASSKEY_STEP_HEIGHT} describedBy={describedBy} footer={footer}>
      {step === 'intro' && (
        <>
          <StepIntro id={describedBy} title="Sign in with your face or fingerprint" description="A passkey replaces your password with the screen lock you already use on this device." />
          <ul data-part="benefits" style={{ ...col(), margin: 0, padding: 0, listStyle: 'none' }}>
            {BENEFITS.map(([icon, title, description]) => (
              <li key={icon} data-part="benefit" style={{ display: 'flex', alignItems: 'flex-start', gap: v('spacing.gap-group') }}>
                <FeaturedIcon size="sm" variant="default" appearance="soft" shape="rounded" icon={glyph(icon)} />
                <Entry title={title} description={description} />
              </li>
            ))}
          </ul>
        </>
      )}
      {step === 'confirm' && (
        <>
          <StepIntro id={describedBy} title="Confirm it is you" description={`Your browser is asking to save a passkey for ${ACCOUNT}.`} />
          <AuthPasskeySetupIndicator status={status} onSensorClick={onSensor} />
          <StatusLine error={status === 'error' ? 'The request was cancelled or timed out. Nothing was saved.' : undefined} helper={helper} />
        </>
      )}
      {step === 'saved' && (
        <>
          <StepIntro id={describedBy} title="Your passkey is ready" description="Next time, sign in with Touch ID instead of typing your password." />
          <div data-part="passkey" style={{ ...well('spacing.inset-control'), display: 'flex', alignItems: 'center', gap: v('spacing.gap-group') }}>
            <FeaturedIcon size="default" variant="secondary" appearance="soft" shape="rounded" icon={glyph('laptop')} />
            <Entry title="MacBook Pro · Chrome" description="iCloud Keychain · Created just now" />
            <Badge size="sm" variant="success" appearance="soft" shape="pill">Active</Badge>
          </div>
          <Field label="Passkey name" description="Helps you tell your passkeys apart in Security settings.">
            <Input leading={glyph('key')} placeholder="Maya's MacBook Pro" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </>
      )}
    </SetupShell>
  )
}

// ── AuthTwoFactorSetup ───────────────────────────────────────────────────────

export interface AuthTwoFactorSetupQRProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** What the code carries: the `otpauth://` link of the account being enrolled. */
  value?: string
  /** The accessible name of the image. */
  label?: string
}

/** Figma `_AuthTwoFactorSetupQR` (2374:44): the scannable code, generated here from the link (error correction M). Black
 *  modules on a white tile in both themes; the same secret always sits next to it as text for whoever cannot scan. */
export function AuthTwoFactorSetupQR({ value = AUTH_TWO_FACTOR_SETUP_URI, label = `QR code to add ${PRODUCT} to an authenticator app`, style, ...props }: AuthTwoFactorSetupQRProps) {
  const { count, path } = React.useMemo(() => {
    const code = qrcode(0, 'M')
    code.addData(value)
    code.make()
    const n = code.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (code.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
    return { count: n, path: d }
  }, [value])
  return (
    <div data-block="_AuthTwoFactorSetupQR" style={{ boxSizing: 'border-box', flexShrink: 0, padding: v('spacing.gap-group'), border: `${v('stroke.divider')} solid ${v('color.border.subtle')}`, borderRadius: v('radius.container'), background: QR_PAPER, ...style }} {...props}>
      <svg role="img" aria-label={label} viewBox={`0 0 ${count} ${count}`} shapeRendering="crispEdges" style={{ display: 'block', width: QR_SIDE, height: QR_SIDE }}>
        <path d={path} fill={QR_INK} />
      </svg>
    </div>
  )
}

export interface AuthTwoFactorSetupItemProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Code: the one-time code the authenticator shows now. */
  code?: string
  /** Figma Countdown: the seconds before the code rotates, as text. */
  countdown?: string
  /** The countdown ring, 0–100 (decorative; the seconds are the readable value). */
  progress?: number
  /** The code becomes a button that hands it over (the prototype types it into the field). */
  onCodeClick?: () => void
}

/** Figma `AuthTwoFactorSetupItem` (2374:47): a simulated authenticator entry. A live product has no such row: it exists so a
 *  prototype or a story can fill the code on click. */
export function AuthTwoFactorSetupItem({ code = '440 912', countdown = '14s', progress = 50, onCodeClick, style, ...props }: AuthTwoFactorSetupItemProps) {
  const codeStyle: React.CSSProperties = { color: primary, ...type('heading-xs'), flexShrink: 0 }
  return (
    <div data-block="AuthTwoFactorSetupItem" style={{ ...well('spacing.inset-control'), display: 'flex', alignItems: 'center', gap: v('spacing.gap-group'), ...style }} {...props}>
      <Avatar aria-hidden type="icon" size="sm" shape="rounded" variant="default" appearance="solid" icon={glyph('stack')} />
      <Entry title={PRODUCT} description={ACCOUNT} />
      {onCodeClick
        ? <button type="button" data-part="code" aria-label={`Use the code ${code}`} onClick={onCodeClick} className={FOCUS_RING} style={{ ...codeStyle, margin: 0, padding: 0, border: 0, background: 'none', cursor: 'pointer', borderRadius: v('radius.item') }}>{code}</button>
        : <span data-part="code" style={codeStyle}>{code}</span>}
      <span data-part="timer" style={{ display: 'inline-flex', alignItems: 'center', gap: v('spacing.gap-control'), flexShrink: 0 }}>
        <span aria-hidden style={{ display: 'inline-flex' }}><ProgressCircle size="xs" cap="round" value={progress} /></span>
        <span data-part="countdown" style={{ color: secondary, ...type('body-sm') }}>{countdown}</span>
      </span>
    </div>
  )
}

export interface AuthTwoFactorSetupGroupProps extends Omit<React.ComponentProps<'ul'>, 'children'> {
  codes?: readonly string[]
  /** The accessible name of the list. */
  label?: string
}

/** Figma `AuthTwoFactorSetupGroup` (2374:64): the backup codes, two rows of four. A list of selectable text, so each code is
 *  announced and can be copied by hand. */
export function AuthTwoFactorSetupGroup({ codes = AUTH_TWO_FACTOR_SETUP_CODES, label = 'Backup codes', style, ...props }: AuthTwoFactorSetupGroupProps) {
  return (
    <ul data-block="AuthTwoFactorSetupGroup" aria-label={label} className="grid grid-cols-2 sm:grid-cols-4" style={{ ...well('spacing.inset-surface'), margin: 0, listStyle: 'none', columnGap: v('spacing.gap-group'), rowGap: v('spacing.gap-control'), ...style }} {...props}>
      {codes.map((code) => <li key={code} data-part="code" style={{ color: primary, userSelect: 'text', ...type('code') }}>{code}</li>)}
    </ul>
  )
}

/** The secret in groups of four, as the file writes it. */
const grouped = (secret: string) => secret.replace(/(.{4})(?=.)/g, '$1 ')

/** Saves the codes as a text file, from the person's own click. */
function downloadCodes(codes: readonly string[]) {
  const url = URL.createObjectURL(new Blob([`${PRODUCT} backup codes\n\n${codes.join('\n')}\n`], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${PRODUCT.toLowerCase()}-backup-codes.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export interface AuthTwoFactorSetupProps extends AuthSetupBlockProps {
  /** Figma Type: the step. */
  type?: AuthTwoFactorSetupType
  /** Figma Status: on `verify`, where the check stands; on `backup`, `completed` once the codes are acknowledged. */
  status?: AuthSetupStatus
  /** The code typed so far (controlled), or where it starts. */
  code?: string
  defaultCode?: string
  onCodeChange?: (code: string) => void
  /** The simulated authenticator row: its code, its countdown and its ring. `null` code hides the row (a live product). */
  authenticatorCode?: string | null
  countdown?: string
  countdownProgress?: number
  /** The line under the code field while idle. The file's text says the authenticator is simulated. */
  helper?: React.ReactNode
  codes?: readonly string[]
  onCancel?: () => void
  onContinue?: () => void
  onBack?: () => void
  /** Verify, with the six digits. */
  onVerify?: (code: string) => void
  onAcknowledge?: (stored: boolean) => void
  /** Turn on: two-factor authentication is enabled. The app closes the dialog and confirms with a Toast. */
  onTurnOn?: () => void
}

/** Figma `AuthTwoFactorSetup` (2374:837): authenticator-app (TOTP) enrolment in three steps. `scan` shows the QR and the same
 *  secret as copyable text, `verify` checks one code from the app, `backup` hands over eight single-use codes and keeps
 *  Turn on disabled until they are acknowledged. */
export function AuthTwoFactorSetup({
  type: step = 'scan', status: given = 'active', code, defaultCode = '', onCodeChange, authenticatorCode = '440 912', countdown, countdownProgress,
  helper = 'Simulated authenticator. Click the code to type it.', codes = AUTH_TWO_FACTOR_SETUP_CODES,
  onCancel, onContinue, onBack, onVerify, onAcknowledge, onTurnOn, ...shell
}: AuthTwoFactorSetupProps) {
  const status: AuthSetupStatus = step === 'scan' ? 'active' : step === 'backup' && given === 'error' ? 'active' : given
  const [typed, setTyped] = React.useState(defaultCode)
  const value = code ?? typed
  const change = (next: string) => { setTyped(next); onCodeChange?.(next) }
  const [stored, setStored] = React.useState(step === 'backup' && status === 'completed')
  React.useEffect(() => { if (step === 'backup') setStored(status === 'completed') }, [step, status])
  const [copied, setCopied] = React.useState(false)
  const describedBy = React.useId()
  const errorId = React.useId()
  const close = () => { onCancel?.(); shell.onOpenChange?.(false) }
  const checking = step === 'verify' && status === 'completed'

  let footer: React.ReactNode
  if (step === 'scan') footer = <>{ghost('Not now', close)}<Button onClick={onContinue}>Continue</Button></>
  else if (step === 'backup') footer = <Button disabled={!stored} onClick={onTurnOn}>Turn on</Button>
  else if (checking) footer = <>{ghost('Back', onBack, true)}<Button loading>Verifying</Button></>
  else footer = <>{ghost('Back', onBack)}<Button disabled={value.length < CODE_LENGTH} onClick={() => onVerify?.(value)}>Verify</Button></>

  return (
    <SetupShell block="AuthTwoFactorSetup" {...shell} step={step} status={status} title="Two-factor authentication" index={AUTH_TWO_FACTOR_SETUP_TYPES.indexOf(step) + 1} height={TWO_FACTOR_STEP_HEIGHT} focus={step === 'verify' ? 'code' : 'heading'} describedBy={describedBy} footer={footer}>
      {step === 'scan' && (
        <div data-part="scan" className="flex flex-col items-start sm:flex-row" style={{ gap: v('spacing.gap-section') }}>
          <AuthTwoFactorSetupQR />
          <div data-part="details" className="self-stretch sm:flex-1" style={{ ...col(), minWidth: 0 }}>
            <StepIntro id={describedBy} title="Scan the QR code" description={`Point your authenticator app at this code to link it to ${PRODUCT}.`} />
            <div data-part="apps" style={{ display: 'flex', flexWrap: 'wrap', gap: v('spacing.gap-control') }}>
              <Badge size="default" variant="secondary" appearance="soft" shape="pill" iconLeading={glyph('device-mobile')}>Google Authenticator</Badge>
              <Badge size="default" variant="secondary" appearance="soft" shape="pill" iconLeading={glyph('password')}>1Password</Badge>
            </div>
            <div data-part="manual-key" style={col('spacing.gap-control')}>
              <span id={errorId} style={{ color: secondary, ...type('body-sm') }}>{"Can't scan it? Enter this key instead."}</span>
              <Input type="copy-link" readOnly leading={null} aria-label="Setup key" aria-describedby={errorId} value={grouped(AUTH_TWO_FACTOR_SETUP_SECRET)} style={type('code')} />
            </div>
          </div>
        </div>
      )}
      {step === 'verify' && (
        <>
          <StepIntro id={describedBy} title="Enter the 6-digit code" description={`Type the code your app shows for ${PRODUCT}. A new one appears every 30 seconds.`} />
          {authenticatorCode != null && (
            <AuthTwoFactorSetupItem code={authenticatorCode} countdown={countdown} progress={countdownProgress} onCodeClick={checking ? undefined : () => change(authenticatorCode.replace(/\D/g, ''))} />
          )}
          <div data-part="code-input" style={{ display: 'flex' }}>
            <InputOTP length={CODE_LENGTH} aria-label="Verification code" aria-invalid={status === 'error' || undefined} aria-describedby={status === 'error' ? errorId : undefined} readOnly={checking} value={value} onChange={change} />
          </div>
          <StatusLine id={errorId} error={status === 'error' ? "That code didn't work. Use the one your app shows now." : undefined} helper={checking ? `Checking the code with ${PRODUCT}.` : helper} />
        </>
      )}
      {step === 'backup' && (
        <>
          <StepIntro id={describedBy} title="Keep your backup codes" description="Each code signs you in once if your phone is lost or reset." />
          <AuthTwoFactorSetupGroup codes={codes} />
          <div data-part="actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: v('spacing.gap-control') }}>
            <CheckboxItem variant="secondary" label="I stored these codes somewhere safe" checked={stored} onCheckedChange={(next) => { const on = next === true; setStored(on); onAcknowledge?.(on) }} rowStyle={{ flex: '1 1 0', minWidth: 'calc(var(--spacing-32) + var(--spacing-16))' }} />
            <Button variant="secondary" appearance="outline" leading={boxedGlyph('download-simple')} onClick={() => downloadCodes(codes)}>Download</Button>
            <Button variant="secondary" appearance="outline" leading={boxedGlyph('copy')} onClick={async () => { try { await navigator.clipboard.writeText(codes.join('\n')) } catch { /* the clipboard may be blocked */ } setCopied(true) }}>Copy</Button>
            <span className="sr-only" aria-live="polite">{copied ? 'Backup codes copied' : ''}</span>
          </div>
        </>
      )}
    </SetupShell>
  )
}

// ── The flows ────────────────────────────────────────────────────────────────

/** The passkey flow. `create` is the app's `navigator.credentials.create()` (it gets a signal, aborted on Back); `save` sends
 *  the credential to the server. A rejected `create` (cancelled, timed out) is the `error` status; nothing is lost on Back. */
export function useAuthPasskeySetup({ create, save }: { create: (signal: AbortSignal) => Promise<unknown>; save?: (credential: unknown) => Promise<unknown> }) {
  const [state, setState] = React.useState<{ type: AuthPasskeySetupType; status: AuthSetupStatus }>({ type: 'intro', status: 'active' })
  const request = React.useRef<AbortController | null>(null)
  const start = async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState({ type: 'confirm', status: 'active' })
    try {
      const credential = await create(controller.signal)
      if (controller.signal.aborted) return
      setState({ type: 'confirm', status: 'completed' })
      await save?.(credential)
      if (controller.signal.aborted) return
      setState({ type: 'saved', status: 'completed' })
    } catch {
      if (!controller.signal.aborted) setState({ type: 'confirm', status: 'error' })
    }
  }
  const reset = () => { request.current?.abort(); request.current = null; setState({ type: 'intro', status: 'active' }) }
  React.useEffect(() => () => request.current?.abort(), [])
  return { ...state, start, retry: start, back: reset, reset }
}

/** The two-factor flow. `verify` is the server's check of the six digits. A wrong or expired code is the `error` status,
 *  cleared as soon as the person types; Turn on waits for the acknowledgement. */
export function useAuthTwoFactorSetup({ verify }: { verify: (code: string) => Promise<boolean> }) {
  const [state, setState] = React.useState<{ type: AuthTwoFactorSetupType; status: AuthSetupStatus }>({ type: 'scan', status: 'active' })
  const [code, setCode] = React.useState('')
  const run = React.useRef(0)
  const changeCode = (next: string) => {
    setCode(next)
    setState((s) => (s.type === 'verify' && s.status === 'error' ? { type: 'verify', status: 'active' } : s))
  }
  const submit = async (value = code) => {
    const id = ++run.current
    setState({ type: 'verify', status: 'completed' })
    let ok = false
    try { ok = await verify(value) } catch { ok = false }
    if (run.current !== id) return
    setState(ok ? { type: 'backup', status: 'active' } : { type: 'verify', status: 'error' })
  }
  const reset = () => { run.current++; setCode(''); setState({ type: 'scan', status: 'active' }) }
  return {
    ...state, code, changeCode, submit, reset,
    next: () => setState({ type: 'verify', status: 'active' }),
    back: () => { run.current++; setState({ type: 'scan', status: 'active' }) },
    acknowledge: (stored: boolean) => setState({ type: 'backup', status: stored ? 'completed' : 'active' }),
  }
}

export const AUTH_SETUP_BLOCKS = { AuthPasskeySetup, AuthTwoFactorSetup }
