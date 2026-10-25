// The phone generator's preview (plan: `design-plans/mobile-bento-action-bar.md`):
// six pages swiped sideways under a sticky icon bar — Account · Actions ·
// Status · Forms · Cards · Navigation — and each page a small two-column bento
// of tiles. The tiles are the groups the desktop bento board (`SystemCollage`)
// is built from, and every part is a real `escala-ui` component painted by the
// system's recipe sheet (`RecipeScope`), so a pick repaints every page.
//
// The pages are a PICTURE of a product, not a form: each is `inert` (no focus,
// no keyboard popping up on a tap). The bar and the swipe are the interaction.

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { PreviewTokens } from '../preview/ButtonPreview'
import { PREVIEW_VIEWS, stepIn, type PreviewView } from '../../lib/mobileTheme'
import { haptic } from '../../lib/haptics'
import { RecipeScope } from './docs/skeleton/scope'
import { avatarFillOf } from './docs/specimens'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../escala-ui/card'
import { SocialLoginButton, PROVIDER_NAME } from '../escala-ui/social-login-button'
import { Badge, StatusBadge } from '../escala-ui/badge'
import { Button } from '../escala-ui/button'
import { Input } from '../escala-ui/input'
import { Label } from '../escala-ui/label'
import { Alert, AlertDescription, AlertTitle } from '../escala-ui/alert'
import { Chip } from '../escala-ui/chip'
import { Progress } from '../escala-ui/progress'
import { SegmentedControl } from '../escala-ui/segmented-control'
import { ToggleGroup, ToggleGroupItem } from '../escala-ui/toggle-group'
import { Switch } from '../escala-ui/switch'
import { Checkbox } from '../escala-ui/checkbox'
import { RadioGroup, RadioGroupItem } from '../escala-ui/radio-group'
import { Slider } from '../escala-ui/slider'
import { NativeSelect, NativeSelectOption } from '../escala-ui/native-select'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../escala-ui/input-otp'
import { Separator } from '../escala-ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../escala-ui/tabs'
import { Stepper } from '../escala-ui/stepper'
import { Pagination } from '../escala-ui/pagination'
import { cn } from '../../lib/utils'

type T = (s: string, vars?: Record<string, string | number>) => string

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

// ── Glyphs: one line family, stroke 1.5 ───────────────────────────────────

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function CheckGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden><path d="m5 12 5 5 9-10" {...line} strokeWidth={2.2} /></svg>
}
function PlusGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" {...line} /></svg>
}
function ArrowGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" {...line} /></svg>
}
function MoreGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><circle cx="6" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18" cy="12" r="1.4" fill="currentColor" /></svg>
}
function KeyGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><circle cx="15" cy="9" r="4.5" {...line} /><path d="M11.8 12.2 4.5 19.5M7 17l2 2M9.5 14.5l2 2" {...line} /></svg>
}
function ChevronGlyph({ up = false }: { up?: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d={up ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} {...line} /></svg>
}
function XGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6 6 18" {...line} /></svg>
}

// ── System type and ink ─────────────────────────────────────────────────────
// The few pieces composed here (tile labels, the filter bar, the checklist)
// read the system's own variables — the ones `RecipeScope` emits for its
// recipes — never a value of this file's.

const ty = (role: string): CSSProperties => ({
  fontFamily: `var(--text-${role}-font-family)`,
  fontSize: `var(--text-${role}-font-size)`,
  lineHeight: `var(--text-${role}-line-height)`,
  fontWeight: `var(--text-${role}-font-weight)` as CSSProperties['fontWeight'],
  letterSpacing: `var(--text-${role}-letter-spacing)`,
})
const INK = {
  primary: 'var(--color-content-primary)',
  secondary: 'var(--color-content-secondary)',
  subtle: 'var(--color-content-subtle)',
}
const SURFACE: CSSProperties = {
  background: 'var(--color-surface-layer-1)',
  border: 'var(--stroke-control) solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-container)',
}

// ── The bento's cells ───────────────────────────────────────────────────────

/** One cell of the bento. `wide` spans both columns. A cell that already is a
 *  `Card` passes `bare` and brings its own surface. */
function Tile({ wide = false, bare = false, label, children }: {
  wide?: boolean
  bare?: boolean
  label?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn('flex min-w-0 flex-col', wide && 'col-span-2')}
      style={bare ? undefined : { ...SURFACE, padding: 'var(--spacing-4)', gap: 'var(--spacing-3)' }}
    >
      {label && <h3 className="m-0" style={{ ...ty('caption'), color: INK.secondary }}>{label}</h3>}
      {children}
    </div>
  )
}

/** Items inside a tile: two equal columns, one under the other, or wrapping. */
function Row({ children, layout = 'wrap', center = false }: { children: ReactNode; layout?: 'wrap' | 'grid' | 'stack'; center?: boolean }) {
  return (
    <div
      className={cn(
        'w-full',
        layout === 'grid' ? 'grid grid-cols-2' : layout === 'stack' ? 'flex flex-col items-start' : 'flex flex-wrap items-center',
        center && 'justify-center',
      )}
      style={{ gap: 'var(--spacing-gap-control)' }}
    >
      {children}
    </div>
  )
}

/** "or" between two hairlines. */
function OrRule({ t }: { t: T }) {
  return (
    <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
      <span className="flex-1"><Separator /></span>
      <span style={{ ...ty('caption'), color: INK.subtle }}>{t('or')}</span>
      <span className="flex-1"><Separator /></span>
    </div>
  )
}

// ── Tiles ───────────────────────────────────────────────────────────────────

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

/** The system itself, first: its name, both ramps, and its type. The bento's
 *  "hero" — what a shuffle changes is read here before anywhere else. */
function IdentityTile({ tokens, name, t }: { tokens: PreviewTokens; name: string; t: T }) {
  const heading = tokens.typography.headingFontFamily ?? tokens.typography.fontFamily
  const body = tokens.typography.fontFamily
  const strip = (ramp: Record<number, string> | undefined, tall: boolean) => ramp && (
    <div className="grid grid-cols-12 overflow-hidden" style={{ height: tall ? 56 : 24, borderRadius: 'var(--radius-control)' }} aria-hidden>
      {STEPS.map((step) => <span key={step} style={{ background: ramp[step] }} />)}
    </div>
  )
  return (
    <Tile wide>
      <div className="flex items-baseline justify-between" style={{ gap: 'var(--spacing-3)' }}>
        <span className="truncate" style={{ ...ty('heading-sm'), color: INK.primary }}>{name}</span>
        <span className="flex-shrink-0" style={{ ...ty('caption'), color: INK.secondary }}>{t('Accent · Neutral')}</span>
      </div>
      <div className="flex flex-col" style={{ gap: 'var(--spacing-1_5)' }}>
        {strip(tokens.brandRamp, true)}
        {strip(tokens.neutralRamp, false)}
      </div>
      <div className="grid grid-cols-2 items-end" style={{ gap: 'var(--spacing-3)' }}>
        <div className="flex min-w-0 flex-col">
          <span style={{ fontFamily: `"${heading}"`, fontWeight: 700, fontSize: 56, lineHeight: 1, color: INK.primary }} aria-hidden>Aa</span>
          <span className="truncate" style={{ ...ty('caption'), color: INK.secondary, marginTop: 'var(--spacing-1_5)' }}>{heading}</span>
        </div>
        <div className="flex min-w-0 flex-col" style={{ fontFamily: `"${body}"`, color: INK.primary, fontSize: 18, lineHeight: 1.25 }}>
          <span style={{ fontWeight: 400 }}>{t('Regular')}</span>
          <span style={{ fontWeight: 500 }}>{t('Medium')}</span>
          <span style={{ fontWeight: 700 }}>{t('Bold')}</span>
          <span className="truncate" style={{ ...ty('caption'), color: INK.secondary, marginTop: 'var(--spacing-1_5)' }}>{body}</span>
        </div>
      </div>
    </Tile>
  )
}

function ButtonsTile({ t }: { t: T }) {
  return (
    <Tile wide label={t('Buttons')}>
      <Row layout="grid">
        <Button>{t('Save changes')}</Button>
        <Button variant="secondary">{t('Secondary')}</Button>
        <Button variant="ghost">{t('Ghost')}</Button>
        <Button variant="destructive">{t('Delete')}</Button>
      </Row>
      {/* Icons and sizes in one balanced line: the icon button sits beside, never alone below. */}
      <div className="flex items-center" style={{ gap: 'var(--spacing-gap-control)' }}>
        <Button size="sm" variant="secondary" className="flex-1"><PlusGlyph /> {t('Add')}</Button>
        <Button className="flex-1">{t('Continue')} <ArrowGlyph /></Button>
        <Button size="icon" variant="ghost" aria-label={t('More')}><MoreGlyph /></Button>
      </div>
    </Tile>
  )
}

function BadgesTile({ t }: { t: T }) {
  return (
    <Tile label={t('Badges')}>
      <Row layout="stack">
        <Badge>{t('Published')}</Badge>
        <Badge variant="secondary">{t('Draft')}</Badge>
        <Badge variant="destructive">{t('Critical')}</Badge>
        <Badge variant="outline">{t('Info')}</Badge>
      </Row>
    </Tile>
  )
}

function PresenceTile({ t }: { t: T }) {
  return (
    <Tile label={t('Presence')}>
      <Row layout="stack">
        <StatusBadge status="online">{t('Online')}</StatusBadge>
        <StatusBadge status="away">{t('Away')}</StatusBadge>
        <StatusBadge status="busy">{t('Busy')}</StatusBadge>
        <StatusBadge status="offline">{t('Offline')}</StatusBadge>
      </Row>
    </Tile>
  )
}

function SelectionTile({ t }: { t: T }) {
  return (
    <Tile wide label={t('Selection')}>
      <Row layout="stack">
        <SegmentedControl options={[t('Day'), t('Week'), t('Month')]} value={t('Week')} />
        <ToggleGroup type="single" variant="outline" value="grid">
          <ToggleGroupItem value="list">{t('List')}</ToggleGroupItem>
          <ToggleGroupItem value="grid">{t('Grid')}</ToggleGroupItem>
          <ToggleGroupItem value="board">{t('Board')}</ToggleGroupItem>
        </ToggleGroup>
      </Row>
    </Tile>
  )
}

function AccountTile({ t, avatar }: { t: T; avatar: string }) {
  return (
    <Tile wide bare>
      <Card>
        <CardHeader>
          {/* The brand mark: the system's own avatar gradient (Aurora, linked
              to the accent ramp), so it re-tints with every colour pick. */}
          <span className="mb-3 h-10 w-10 rounded-full" style={{ backgroundImage: avatar }} aria-hidden />
          <CardTitle>{t('Sign in to Escala')}</CardTitle>
          <CardDescription>{t('Enter your email and we will send you a code.')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col" style={{ gap: 'var(--spacing-gap-group)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--spacing-1_5)' }}>
            <Label htmlFor="mobile-preview-email">{t('Email')}</Label>
            <Input id="mobile-preview-email" placeholder="name@example.com" readOnly />
          </div>
          <Button className="w-full">{t('Continue')}</Button>
          <OrRule t={t} />
          <div className="flex flex-col" style={{ gap: 'var(--spacing-gap-control)' }}>
            <Button variant="outline" className="w-full"><KeyGlyph /> {t('Sign in with a passkey')}</Button>
            {/* Two providers, full names: three cut to "G…" in a phone card. */}
            <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-gap-control)' }}>
              {(['google', 'apple'] as const).map((p) => (
                <SocialLoginButton key={p} provider={p} label={PROVIDER_NAME[p]} />
              ))}
            </div>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="justify-end" style={{ gap: 'var(--spacing-1)' }}>
          <span style={{ ...ty('body-sm'), color: INK.secondary }}>{t('No account?')}</span>
          <Button variant="link" className="h-auto p-0">{t('Sign up')}</Button>
        </CardFooter>
      </Card>
    </Tile>
  )
}

function ProfileTile({ t, avatar }: { t: T; avatar: string }) {
  return (
    <Tile wide bare>
      <Card>
        <CardHeader className="flex-row items-center" style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <span className="h-12 w-12 flex-shrink-0 rounded-full" style={{ backgroundImage: avatar }} aria-hidden />
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center" style={{ gap: 'var(--spacing-1)' }}>
              <CardTitle style={ty('heading-2xs')}>Maya Chen</CardTitle>
              <span style={{ color: 'var(--color-action-primary-default)' }}><CheckGlyph /></span>
            </span>
            <CardDescription>@maya · {t('Design systems')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col" style={{ gap: 'var(--spacing-gap-group)' }}>
          <p className="m-0" style={ty('body-sm')}>{t('Building one token system for Figma, code and agents.')}</p>
          <div className="flex" style={{ gap: 'var(--spacing-4)', ...ty('body-sm') }}>
            <span><strong style={{ color: INK.primary }}>4</strong> <span style={{ color: INK.secondary }}>{t('Following')}</span></span>
            <span><strong style={{ color: INK.primary }}>12.4K</strong> <span style={{ color: INK.secondary }}>{t('Followers')}</span></span>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 'var(--spacing-gap-control)' }}>
            <Button>{t('Follow')}</Button>
            <Button variant="secondary">{t('Message')}</Button>
          </div>
        </CardContent>
      </Card>
    </Tile>
  )
}

function MetricTile({ t }: { t: T }) {
  return (
    <Tile>
      <div className="flex items-start justify-between" style={{ gap: 'var(--spacing-2)' }}>
        <span style={{ ...ty('caption'), color: INK.secondary }}>{t('Uptime')}</span>
        <Badge variant="secondary">+6%</Badge>
      </div>
      <span className="tabular-nums" style={{ ...ty('heading-sm'), fontSize: 'calc(var(--text-heading-sm-font-size) * 1.6)', lineHeight: 1, color: INK.primary }}>98%</span>
      {/* The figure above is the value: the bar shows no second "98%". */}
      <Progress value={98} showValue={false} />
    </Tile>
  )
}

function TogglesTile({ t }: { t: T }) {
  const row: CSSProperties = { gap: 'var(--spacing-gap-control)', ...ty('label'), color: INK.primary }
  return (
    <Tile label={t('Settings')}>
      <label className="flex items-center justify-between" style={row}>{t('Push')} <Switch checked /></label>
      <label className="flex items-center justify-between" style={row}>{t('Email')} <Switch checked={false} /></label>
      <label className="flex items-center" style={row}><Checkbox checked icon={<CheckGlyph />} /> {t('Mute')}</label>
    </Tile>
  )
}

function VerifyTile({ t }: { t: T }) {
  return (
    <Tile wide bare>
      <Card>
        <CardHeader>
          <CardTitle>{t('Verify account')}</CardTitle>
          <CardDescription>{t('Enter the code we sent to your email.')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col" style={{ gap: 'var(--spacing-gap-group)' }}>
          {/* Four digits: six slots do not fit a phone card. */}
          <InputOTP maxLength={4} value="4829" readOnly>
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={2} /><InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          <p className="m-0" style={ty('body-sm')}>
            <span style={{ color: INK.secondary }}>{t('No code?')} </span>
            <Button variant="link" className="h-auto p-0">{t('Resend')}</Button>
          </p>
        </CardContent>
      </Card>
    </Tile>
  )
}

/** A filter pill's text: the field quiet, the value in full ink. */
const FilterLabel = ({ field, value }: { field: string; value: string }) => (
  <span><span style={{ color: INK.secondary }}>{field} · </span>{value}</span>
)

function FiltersTile({ t }: { t: T }) {
  return (
    <Tile wide label={t('Filters')}>
      {/* The chips carry the active filters; the actions sit after them. */}
      <Row>
        <Chip dismissible removeIcon={<XGlyph />}><FilterLabel field={t('Status')} value={t('In review')} /></Chip>
        <Chip dismissible removeIcon={<XGlyph />}><FilterLabel field={t('Owner')} value="Emma Collins" /></Chip>
        <Button size="sm" variant="outline"><PlusGlyph /> {t('Add filter')}</Button>
        <Button size="sm" variant="ghost">{t('Clear all')}</Button>
      </Row>
    </Tile>
  )
}

function AlertsTile({ t }: { t: T }) {
  return (
    <Tile wide bare>
      <div className="flex flex-col" style={{ gap: 'var(--spacing-gap-control)' }}>
        <Alert>
          <AlertTitle>{t('A new version is ready')}</AlertTitle>
          <AlertDescription>{t('Reload to get the latest tokens.')}</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>{t('Payment failed')}</AlertTitle>
          <AlertDescription>{t('Update your card to keep your plan.')}</AlertDescription>
        </Alert>
      </div>
    </Tile>
  )
}

/** A progress ring in the system's accent over a border-subtle track. */
function Ring({ done, of }: { done: number; of: number }) {
  const r = 15
  const len = 2 * Math.PI * r
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="flex-shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-border-subtle)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-action-primary-default)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(done / of) * len} ${len}`} />
    </svg>
  )
}

/** The empty circle of a to-do step. */
const StepDot = () => (
  <span
    className="h-5 w-5 flex-shrink-0 rounded-full"
    style={{ border: 'var(--stroke-md, 1.5px) solid var(--color-border-strong, var(--color-border-subtle))' }}
    aria-hidden
  />
)

function ChecklistTile({ t }: { t: T }) {
  const rest = [t('Connect GitHub'), t('Turn on two-factor sign-in')]
  const pad = 'var(--spacing-3)'
  return (
    <Tile wide bare>
      <Card>
        <CardHeader className="flex-row items-center" style={{ display: 'flex', gap: pad }}>
          <Ring done={1} of={4} />
          <div className="flex min-w-0 flex-1 flex-col">
            <CardTitle style={ty('heading-2xs')}>{t('Set up Northwind')}</CardTitle>
            <CardDescription>{t('1 of 4 done')}</CardDescription>
          </div>
          <Button size="sm" variant="ghost">{t('Hide')} <ChevronGlyph up /></Button>
        </CardHeader>
        <CardContent className="flex flex-col" style={{ gap: 'var(--spacing-0_5)' }}>
          {/* The next step is open; the rest wait in line. */}
          <div className="flex items-start" style={{ gap: pad, padding: pad, background: 'var(--color-surface-layer-2)', borderRadius: 'var(--radius-container)' }}>
            <StepDot />
            <div className="flex min-w-0 flex-col items-start" style={{ gap: 'var(--spacing-1)' }}>
              <span style={{ ...ty('label'), color: INK.primary }}>{t('Invite your team')}</span>
              <span style={{ ...ty('body-sm'), color: INK.secondary }}>{t('Priya and Jonas are waiting.')}</span>
              <Button size="sm" style={{ marginTop: 'var(--spacing-2)' }}>{t('Send invites')} <ArrowGlyph /></Button>
            </div>
          </div>
          {rest.map((step) => (
            <div key={step} className="flex items-center" style={{ gap: pad, padding: pad }}>
              <StepDot />
              <span style={{ ...ty('label'), color: INK.primary }}>{step}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Tile>
  )
}

function TabsTile({ t }: { t: T }) {
  return (
    <Tile wide label={t('Tabs')}>
      <Tabs value="overview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="activity">{t('Activity')}</TabsTrigger>
          <TabsTrigger value="settings">{t('Settings')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" style={{ paddingTop: 'var(--spacing-3)', ...ty('body-sm'), color: INK.secondary }}>
          {t('Every token your product reads, in one place.')}
        </TabsContent>
      </Tabs>
    </Tile>
  )
}

function CheckoutTile({ t }: { t: T }) {
  return (
    <Tile wide label={t('Checkout')}>
      <Stepper steps={[t('Account'), t('Plan'), t('Pay')]} current={2} width="100%" doneIcon={<CheckGlyph />} />
      <div className="flex justify-center" style={{ paddingTop: 'var(--spacing-2)' }}>
        <Pagination pages={[1, 2, 3, '…', 8]} page={2} onPageChange={() => {}} />
      </div>
    </Tile>
  )
}

function FormTile({ t }: { t: T }) {
  const row: CSSProperties = { gap: 'var(--spacing-gap-control)', ...ty('label'), color: INK.primary }
  return (
    <Tile wide label={t('Plan')}>
      <RadioGroup value="pro" className="flex" style={{ gap: 'var(--spacing-6)' }}>
        <label className="flex items-center" style={row}><RadioGroupItem value="free" /> {t('Free')}</label>
        <label className="flex items-center" style={row}><RadioGroupItem value="pro" /> Pro</label>
      </RadioGroup>
      <Slider label={t('Volume')} value={60} format={(v) => `${v}%`} />
      <div className="flex flex-col" style={{ gap: 'var(--spacing-1_5)' }}>
        <Label>{t('Role')}</Label>
        <NativeSelect value="designer" onChange={() => {}}>
          <NativeSelectOption value="designer">{t('Designer')}</NativeSelectOption>
          <NativeSelectOption value="engineer">{t('Engineer')}</NativeSelectOption>
        </NativeSelect>
      </div>
    </Tile>
  )
}

// ── The pages ───────────────────────────────────────────────────────────────

const Glyph = ({ children }: { children: ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>{children}</svg>
)

const VIEW_META: Record<PreviewView, { label: string; glyph: ReactNode }> = {
  account: {
    label: 'Account',
    glyph: <Glyph><circle cx="12" cy="8.5" r="3.5" {...line} /><path d="M5 19.5c1.3-3.3 3.9-5 7-5s5.7 1.7 7 5" {...line} /></Glyph>,
  },
  actions: {
    label: 'Actions',
    glyph: <Glyph><rect x="3.5" y="7" width="17" height="10" rx="5" {...line} /><path d="M9 12h6" {...line} /></Glyph>,
  },
  status: {
    label: 'Status',
    glyph: <Glyph><path d="M4 12.5V5.5a1.5 1.5 0 0 1 1.5-1.5h7l7.5 7.5-8.5 8.5L4 12.5Z" {...line} /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" /></Glyph>,
  },
  forms: {
    label: 'Forms',
    glyph: <Glyph><rect x="3.5" y="5" width="17" height="6" rx="3" {...line} /><circle cx="17.5" cy="8" r="1.5" fill="currentColor" /><rect x="3.5" y="13" width="17" height="6" rx="3" {...line} /><circle cx="6.5" cy="16" r="1.5" {...line} /></Glyph>,
  },
  cards: {
    label: 'Cards',
    glyph: <Glyph><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...line} /><circle cx="9" cy="10" r="2" {...line} /><path d="M6.5 15.5c.6-1.4 1.5-2 2.5-2s1.9.6 2.5 2M14 9.5h3.5M14 13h3.5" {...line} /></Glyph>,
  },
  navigation: {
    label: 'Navigation',
    glyph: <Glyph><path d="M3.5 7.5h17M3.5 12h17M3.5 16.5h10" {...line} /><path d="M6 4v3.5" {...line} /></Glyph>,
  },
}

/** Each page's bento: the system's identity opens the first, so the
 *  shuffle's biggest change is the first thing seen. */
function PageBody({ view, tokens, name, t, avatar }: { view: PreviewView; tokens: PreviewTokens; name: string; t: T; avatar: string }) {
  switch (view) {
    case 'account': return <><IdentityTile tokens={tokens} name={name} t={t} /><AccountTile t={t} avatar={avatar} /></>
    case 'actions': return <><ButtonsTile t={t} /><SelectionTile t={t} /><MetricTile t={t} /><TogglesTile t={t} /></>
    case 'status': return <><BadgesTile t={t} /><PresenceTile t={t} /><FiltersTile t={t} /><AlertsTile t={t} /></>
    case 'forms': return <><VerifyTile t={t} /><FormTile t={t} /></>
    case 'cards': return <><ProfileTile t={t} avatar={avatar} /><ChecklistTile t={t} /></>
    case 'navigation': return <><TabsTile t={t} /><CheckoutTile t={t} /></>
  }
}

// ── The device ──────────────────────────────────────────────────────────────

/** The width a page is laid out at: a real phone's, so tiles keep their
 *  proportions however small the mockup draws them. */
const SCREEN_W = 390
/** Screen px kept clear at the top for the island (not scaled with the page). */
const ISLAND_CLEAR = 34
/** Screen px kept clear at the bottom (the home bar's room). */
const FOOT_CLEAR = 14

/** A phone mockup: a bezel in the chrome's own surfaces, a screen in the
 *  system's page colour, and the page drawn at `SCREEN_W` then scaled to the
 *  screen's WIDTH, so tiles read at a useful size. The screen is as tall as
 *  its page — no scroll inside the phone, only the page's own. */
function Device({ bg, children }: { bg?: string; children: ReactNode }) {
  const screenRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const screen = screenRef.current
    const page = pageRef.current
    if (!screen || !page) return
    const measure = () => {
      const w = screen.clientWidth
      const ph = page.offsetHeight
      if (!w || !ph) return
      const scale = Math.min(1, w / SCREEN_W)
      setFit({ scale, height: ISLAND_CLEAR + ph * scale + FOOT_CLEAR })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(screen)
    ro.observe(page)
    return () => ro.disconnect()
  }, [])
  return (
    // `isolate`: the island and home bar layer only inside the phone, never
    // over the sticky icon bar when the page scrolls under it.
    <div className="isolate mx-auto flex w-full max-w-[22rem] flex-col rounded-[2.25rem] border border-line-strong bg-elevated p-[7px] shadow-[0_12px_40px_rgb(0_0_0/0.28)]">
      <div
        ref={screenRef}
        className="relative overflow-hidden rounded-[1.85rem]"
        style={{ height: fit?.height ?? 480, backgroundColor: bg }}
      >
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-2 z-10 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-black" />
        <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 h-1 w-24 -translate-x-1/2 rounded-full bg-fg/30" />
        <div
          ref={pageRef}
          className="absolute left-1/2 origin-top"
          style={{
            width: SCREEN_W,
            top: ISLAND_CLEAR,
            transform: `translateX(-50%) scale(${fit?.scale ?? 1})`,
            visibility: fit ? undefined : 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ── The bar + the track ─────────────────────────────────────────────────────

export function MobilePreview({ tokens, name, view, onViewChange, t, caption }: {
  tokens: PreviewTokens
  /** The system's name, on the identity tile. */
  name: string
  view: PreviewView
  onViewChange: (view: PreviewView) => void
  t: T
  /** The line under the bar, on the right: appearance · accent hex. */
  caption: ReactNode
}) {
  const reduceMotion = useReducedMotion() ?? false
  const id = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<Partial<Record<PreviewView, HTMLDivElement | null>>>({})
  const tabRefs = useRef<Partial<Record<PreviewView, HTMLButtonElement | null>>>({})
  const [height, setHeight] = useState<number | null>(null)
  const avatar = avatarFillOf(tokens)
  // Six pages of real components are heavy for a phone. Only the one on
  // screen and its neighbours (the next swipe) render; a page once seen
  // stays, so swiping back never rebuilds it.
  const at = PREVIEW_VIEWS.indexOf(view)
  const [seen, setSeen] = useState<ReadonlySet<PreviewView>>(() => new Set([view]))
  if (!seen.has(view)) setSeen(new Set([...seen, view]))
  const rendered = (v: PreviewView) => seen.has(v) || Math.abs(PREVIEW_VIEWS.indexOf(v) - at) <= 1
  // A scroll WE started (a tap on the bar) must not be read back as a swipe
  // half way through and flip the bar to a page it passes on the way.
  const steering = useRef<{ left: number; until: number } | null>(null)
  // A page the SWIPE picked: the bar follows it, the track is not steered
  // back to it (that would fight a swipe passing through a page).
  const fromSwipe = useRef(false)

  // The track is as tall as the page on screen, not the tallest one.
  useLayoutEffect(() => {
    const el = panelRefs.current[view]
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view])

  // Bar → track: bring the picked page in (on mount without motion).
  const first = useRef(true)
  useEffect(() => {
    const track = trackRef.current
    const el = panelRefs.current[view]
    if (!track || !el) return
    if (fromSwipe.current) { fromSwipe.current = false; return }
    const left = el.offsetLeft
    if (Math.abs(track.scrollLeft - left) < 2) { first.current = false; return }
    steering.current = { left, until: performance.now() + 700 }
    track.scrollTo({ left, behavior: first.current || reduceMotion ? 'auto' : 'smooth' })
    first.current = false
  }, [view, reduceMotion])

  // Track → bar: a swipe that crosses half way into a page selects it.
  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const steer = steering.current
    if (steer) {
      const landed = Math.abs(track.scrollLeft - steer.left) < 2
      if (landed || performance.now() > steer.until) steering.current = null
      if (!landed && performance.now() <= steer.until) return
      if (landed) return
    }
    const i = Math.round(track.scrollLeft / track.clientWidth)
    const next = PREVIEW_VIEWS[Math.max(0, Math.min(PREVIEW_VIEWS.length - 1, i))]
    // A detent: the swipe crossing into the next page ticks once.
    if (next !== view) { fromSwipe.current = true; haptic('tick'); onViewChange(next) }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const next = stepIn(PREVIEW_VIEWS, view, e.key)
    if (!next) return
    e.preventDefault()
    haptic('tick')
    onViewChange(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sticky under the page header, so the pages stay one tap away while
          a long page scrolls. `touch-manipulation`: no double-tap zoom on
          the icons, so a tap answers at once; no grey tap flash. */}
      <div className="sticky top-0 z-10 -mx-1 flex touch-manipulation flex-col gap-2 bg-app/90 px-1 pb-2 pt-1 backdrop-blur-md [-webkit-tap-highlight-color:transparent]">
        <div
          role="tablist"
          aria-label={t('Preview')}
          onKeyDown={onKeyDown}
          className="grid grid-cols-6 gap-1 rounded-2xl border border-line bg-surface/50 p-1"
        >
          {PREVIEW_VIEWS.map((v) => {
            const on = v === view
            return (
              <button
                key={v}
                ref={(el) => { tabRefs.current[v] = el }}
                type="button"
                role="tab"
                id={`${id}-${v}`}
                aria-selected={on}
                aria-controls={`${id}-${v}-panel`}
                aria-label={t(VIEW_META[v].label)}
                title={t(VIEW_META[v].label)}
                tabIndex={on ? 0 : -1}
                onClick={() => { if (v !== view) haptic('tick'); onViewChange(v) }}
                className={cn(
                  'relative flex h-11 items-center justify-center rounded-xl transition-[color,transform] duration-200 ease-[var(--ease-out-quint)] active:scale-[0.94]',
                  FOCUS,
                  on ? 'text-fg' : 'text-fg-faint hover:text-fg-muted',
                )}
              >
                {/* One pill that slides to the page picked (a fade under reduced motion). */}
                {on && (
                  <motion.span
                    layoutId={`${id}-pill`}
                    className="absolute inset-0 rounded-xl bg-elevated shadow-sm"
                    transition={reduceMotion ? { duration: 0 } : { type: 'tween', duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden
                  />
                )}
                <span className="relative">{VIEW_META[v].glyph}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3 px-1 text-caption">
          <span className="flex items-baseline gap-2">
            <span className="font-medium text-fg" aria-live="polite">{t(VIEW_META[view].label)}</span>
            <span className="font-mono tabular-nums text-fg-faint" aria-hidden>{at + 1}/{PREVIEW_VIEWS.length}</span>
          </span>
          <span className="text-fg-muted">{caption}</span>
        </div>
      </div>

      {/* `relative`, track and panels: Radix (Switch, Checkbox, Radio) and the
          OTP field render hidden `absolute` inputs. With a static track their
          containing block sat OUTSIDE the scroller, so they escaped its clip,
          widened the page to ~1700px and a phone zoomed out to 25%. */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        // The track follows the page on screen: each phone is as tall as its
        // page, and the step between two pages eases instead of jumping.
        className="relative -mx-1 flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain transition-[height] duration-300 ease-[var(--ease-out-quint)] motion-reduce:transition-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height: height ?? undefined }}
      >
        {PREVIEW_VIEWS.map((v) => (
          <div
            key={v}
            ref={(el) => { panelRefs.current[v] = el }}
            role="tabpanel"
            id={`${id}-${v}-panel`}
            aria-labelledby={`${id}-${v}`}
            aria-hidden={v !== view}
            className="relative w-full flex-shrink-0 snap-start snap-always px-1"
          >
            {/* The page inside a phone mockup, scaled to fit whole: the
                tiles sit on the system's page colour like a real app screen. */}
            <p className="sr-only">{t('Sample screens painted with this system.')}</p>
            <Device bg={tokens.archTokens?.['surface.page']}>
              {rendered(v) && (
                <RecipeScope t={tokens}>
                  <div className="relative grid grid-cols-2 px-3" style={{ gap: 'var(--spacing-gap-control, 8px)' }} inert>
                    <PageBody view={v} tokens={tokens} name={name} t={t} avatar={avatar} />
                  </div>
                </RecipeScope>
              )}
            </Device>
          </div>
        ))}
      </div>
    </div>
  )
}
