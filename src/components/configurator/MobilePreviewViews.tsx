// The phone generator's preview (plan: `design-plans/mobile-theme-sheet.md`):
// six views, one group of components each — the groups the desktop bento
// board (`SystemCollage`) is built from — under an icon bar, and a sideways
// swipe between them. Every part is a real `escala-ui` component painted by
// the system's recipe sheet (`RecipeScope`), so a pick in the Theme sheet
// repaints whichever view is on screen.
//
// The views are a PICTURE of a product, not a form: each is `inert` (no
// focus, no keyboard popping up on a tap). The bar is the interaction.

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
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

// ── Glyphs: one 20px line family, stroke 1.5 ──────────────────────────────

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
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
function CopyGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><rect x="8.5" y="8.5" width="11" height="11" rx="2" {...line} /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" {...line} /></svg>
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
// The few pieces composed here (group labels, the filter bar, the checklist)
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

/** A labelled group on the canvas, no card around it. `grid` lays the items
 *  in two equal columns, `stack` one under the other; the default wraps. */
function Group({ label, children, center = false, layout = 'wrap' }: {
  label: string
  children: ReactNode
  center?: boolean
  layout?: 'wrap' | 'grid' | 'stack'
}) {
  return (
    <section className={cn('flex flex-col', center && 'items-center text-center')} style={{ gap: 'var(--spacing-2_5)' }}>
      <h3 className="m-0" style={{ ...ty('caption'), color: INK.secondary }}>{label}</h3>
      <div
        className={cn(
          'w-full',
          layout === 'grid' ? 'grid grid-cols-2' : layout === 'stack' ? 'flex flex-col items-center' : 'flex flex-wrap items-center',
          layout === 'wrap' && center && 'justify-center',
        )}
        style={{ gap: 'var(--spacing-gap-control)' }}
      >
        {children}
      </div>
    </section>
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

// ── The views ───────────────────────────────────────────────────────────────

function AccountView({ t, avatar }: { t: T; avatar: string }) {
  return (
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
  )
}

function ActionsView({ t }: { t: T }) {
  return (
    <div className="flex flex-col py-2" style={{ gap: 'var(--spacing-6)' }}>
      {/* Every row is balanced at 390px: no group leaves one button alone
          on a line of its own. */}
      <Group label={t('Styles')} center layout="grid">
        <Button>{t('Save changes')}</Button>
        <Button variant="secondary">{t('Secondary')}</Button>
        <Button variant="ghost">{t('Ghost')}</Button>
        <Button variant="destructive">{t('Delete')}</Button>
      </Group>
      <Group label={t('Sizes')} center>
        <Button size="sm" variant="secondary">{t('Small')}</Button>
        <Button variant="secondary">{t('Default')}</Button>
        <Button size="lg" variant="secondary">{t('Large')}</Button>
      </Group>
      <Group label={t('With icons')} center>
        <Button size="sm" variant="secondary"><PlusGlyph /> {t('Add item')}</Button>
        <Button>{t('Continue')} <ArrowGlyph /></Button>
        <Button size="icon" variant="ghost" aria-label={t('More')}><MoreGlyph /></Button>
      </Group>
      <Group label={t('States')} center>
        <Button size="icon" variant="secondary" aria-label={t('Copy link')}><CopyGlyph /></Button>
        <Button variant="secondary">{t('Upload file')}</Button>
        <Button variant="secondary" disabled>{t('Disabled')}</Button>
      </Group>
      <Group label={t('Selection')} center layout="stack">
        <SegmentedControl options={[t('Day'), t('Week'), t('Month')]} value={t('Week')} />
        <ToggleGroup type="single" variant="outline" value="grid">
          <ToggleGroupItem value="list">{t('List')}</ToggleGroupItem>
          <ToggleGroupItem value="grid">{t('Grid')}</ToggleGroupItem>
          <ToggleGroupItem value="board">{t('Board')}</ToggleGroupItem>
        </ToggleGroup>
      </Group>
    </div>
  )
}

/** A filter pill's text: the field quiet, the value in full ink. */
const FilterLabel = ({ field, value }: { field: string; value: string }) => (
  <span><span style={{ color: INK.secondary }}>{field} · </span>{value}</span>
)

function StatusView({ t }: { t: T }) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-6)' }}>
      {/* A filter bar: the chips carry the active filters; the actions sit
          after them, never above. */}
      <div className="flex flex-wrap items-center" style={{ ...SURFACE, padding: 'var(--spacing-3)', gap: 'var(--spacing-gap-control)' }}>
        <Chip dismissible removeIcon={<XGlyph />}><FilterLabel field={t('Status')} value={t('In review')} /></Chip>
        <Chip dismissible removeIcon={<XGlyph />}><FilterLabel field={t('Owner')} value="Emma Collins" /></Chip>
        <Button size="sm" variant="outline"><PlusGlyph /> {t('Add filter')}</Button>
        <Button size="sm" variant="ghost">{t('Clear all')}</Button>
      </div>

      <Group label={t('Badges')}>
        <Badge>{t('Published')}</Badge>
        <Badge variant="secondary">{t('Draft')}</Badge>
        <Badge variant="destructive">{t('Critical')}</Badge>
        <Badge variant="outline">{t('Info')}</Badge>
      </Group>
      <Group label={t('Presence')}>
        <StatusBadge status="online">{t('Online')}</StatusBadge>
        <StatusBadge status="away">{t('Away')}</StatusBadge>
        <StatusBadge status="busy">{t('Busy')}</StatusBadge>
        <StatusBadge status="offline">{t('Offline')}</StatusBadge>
      </Group>

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

      <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
        <Progress label={t('Storage')} value={64} />
        <Progress label={t('Upload')} value={30} />
      </div>
    </div>
  )
}

/** One settings row: what it is, a line on why, the control at the end. */
function SettingRow({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 'var(--spacing-4)' }}>
      <div className="flex min-w-0 flex-col" style={{ gap: 'var(--spacing-0_5)' }}>
        <span style={{ ...ty('label'), color: INK.primary }}>{title}</span>
        {hint && <span style={{ ...ty('helper'), color: INK.secondary }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function FormsView({ t }: { t: T }) {
  const row: CSSProperties = { gap: 'var(--spacing-gap-control)', ...ty('label') }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('Verify account')}</CardTitle>
          <CardDescription>{t('Enter the code we sent to your email.')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col" style={{ gap: 'var(--spacing-gap-group)' }}>
          {/* Four digits: six slots do not fit a 390px card. */}
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
      <Card>
        <CardHeader>
          <CardTitle>{t('Notifications')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
          <SettingRow title={t('Push')} hint={t('Mentions and replies')}><Switch checked /></SettingRow>
          <Separator />
          <SettingRow title={t('Email')} hint={t('A weekly digest')}><Switch checked={false} /></SettingRow>
          <Separator />
          <label className="flex items-center" style={row}>
            <Checkbox checked icon={<CheckGlyph />} /> {t('Mute on weekends')}
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col" style={{ gap: 'var(--spacing-gap-group)' }}>
          <RadioGroup value="pro" className="flex flex-col" style={{ gap: 'var(--spacing-gap-control)' }}>
            <label className="flex items-center" style={row}><RadioGroupItem value="free" /> {t('Free')}</label>
            <label className="flex items-center" style={row}><RadioGroupItem value="pro" /> Pro</label>
          </RadioGroup>
          <Separator />
          <Slider label={t('Volume')} value={60} format={(v) => `${v}%`} />
          <div className="flex flex-col" style={{ gap: 'var(--spacing-1_5)' }}>
            <Label>{t('Role')}</Label>
            <NativeSelect value="designer" onChange={() => {}}>
              <NativeSelectOption value="designer">{t('Designer')}</NativeSelectOption>
              <NativeSelectOption value="engineer">{t('Engineer')}</NativeSelectOption>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>
    </>
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

function ChecklistCard({ t }: { t: T }) {
  const rest = [t('Connect GitHub'), t('Turn on two-factor sign-in')]
  const pad = 'var(--spacing-3)'
  return (
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
        <div className="flex items-center justify-between" style={{ padding: pad, paddingLeft: `calc(${pad} * 2 + 20px)`, color: INK.secondary, ...ty('body-sm') }}>
          {t('1 completed')}
          <ChevronGlyph />
        </div>
      </CardContent>
    </Card>
  )
}

function CardsView({ t, avatar }: { t: T; avatar: string }) {
  return (
    <>
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
      <ChecklistCard t={t} />
      <Card>
        <CardHeader className="flex-row items-start justify-between" style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--spacing-1)' }}>
            <CardDescription>{t('Uptime this month')}</CardDescription>
            <CardTitle className="tabular-nums" style={{ fontSize: 'calc(var(--text-heading-sm-font-size) * 1.5)', lineHeight: 1 }}>98%</CardTitle>
          </div>
          <Badge variant="secondary">+6%</Badge>
        </CardHeader>
      </Card>
    </>
  )
}

function NavigationView({ t }: { t: T }) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-6)' }}>
      <Group label={t('Tabs')}>
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
        <Tabs value="tokens" className="w-full" style={{ marginTop: 'var(--spacing-3)' }}>
          <TabsList variant="line">
            <TabsTrigger value="tokens">{t('Tokens')}</TabsTrigger>
            <TabsTrigger value="components">{t('Components')}</TabsTrigger>
            <TabsTrigger value="docs">{t('Docs')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </Group>
      <Group label={t('Checkout')}>
        <Stepper steps={[t('Account'), t('Plan'), t('Pay')]} current={2} width="100%" doneIcon={<CheckGlyph />} />
      </Group>
      <Group label={t('Pages')} center>
        <Pagination pages={[1, 2, 3, '…', 8]} page={2} onPageChange={() => {}} />
      </Group>
    </div>
  )
}

function ViewBody({ view, t, avatar }: { view: PreviewView; t: T; avatar: string }) {
  switch (view) {
    case 'account': return <AccountView t={t} avatar={avatar} />
    case 'actions': return <ActionsView t={t} />
    case 'status': return <StatusView t={t} />
    case 'forms': return <FormsView t={t} />
    case 'cards': return <CardsView t={t} avatar={avatar} />
    case 'navigation': return <NavigationView t={t} />
  }
}

// ── The bar + the track ─────────────────────────────────────────────────────

export function MobilePreview({ tokens, view, onViewChange, t, caption }: {
  tokens: PreviewTokens
  view: PreviewView
  onViewChange: (view: PreviewView) => void
  t: T
  /** The line under the bar: appearance · accent hex. */
  caption: ReactNode
}) {
  const reduceMotion = useReducedMotion() ?? false
  const id = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<Partial<Record<PreviewView, HTMLDivElement | null>>>({})
  const tabRefs = useRef<Partial<Record<PreviewView, HTMLButtonElement | null>>>({})
  const [height, setHeight] = useState<number | null>(null)
  const avatar = avatarFillOf(tokens)
  // Six views of real components are heavy for a phone. Only the one on
  // screen and its neighbours (the next swipe) render; a view once seen stays,
  // so swiping back never rebuilds it.
  const at = PREVIEW_VIEWS.indexOf(view)
  const [seen, setSeen] = useState<ReadonlySet<PreviewView>>(() => new Set([view]))
  if (!seen.has(view)) setSeen(new Set([...seen, view]))
  const rendered = (v: PreviewView) => seen.has(v) || Math.abs(PREVIEW_VIEWS.indexOf(v) - at) <= 1
  // A scroll WE started (a tap on the bar) must not be read back as a swipe
  // half way through and flip the bar to a view it passes on the way.
  // Released when the scroll lands, or after a beat if it never quite does
  // (snap can settle a pixel off the target).
  const steering = useRef<{ left: number; until: number } | null>(null)
  // A view the SWIPE picked: the bar follows it, the track is not steered
  // back to it (that would fight a swipe passing through a view).
  const fromSwipe = useRef(false)

  // The track is as tall as the view on screen, not the tallest one.
  useLayoutEffect(() => {
    const el = panelRefs.current[view]
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view])

  // Bar → track: bring the picked view in (on mount without motion).
  const first = useRef(true)
  useEffect(() => {
    const track = trackRef.current
    const el = panelRefs.current[view]
    if (!track || !el) return
    if (fromSwipe.current) { fromSwipe.current = false; return }
    const left = el.offsetLeft
    if (Math.abs(track.scrollLeft - left) < 2) return
    steering.current = { left, until: performance.now() + 700 }
    track.scrollTo({ left, behavior: first.current || reduceMotion ? 'auto' : 'smooth' })
    first.current = false
  }, [view, reduceMotion])
  useEffect(() => { first.current = false }, [])

  // Track → bar: a swipe that settles on a view selects it.
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
    // A detent: the swipe crossing into the next view ticks once.
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
      {/* Sticky under the page header, so the views stay one tap away while
          the preview scrolls. */}
      {/* `touch-manipulation`: no double-tap zoom on the icons, so a tap
          answers at once; no grey tap flash (the pill shows the press). */}
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
                  'flex h-11 items-center justify-center rounded-xl transition-[color,background-color,transform] duration-200 ease-[var(--ease-out-quint)] active:scale-[0.94]',
                  FOCUS,
                  on ? 'bg-elevated text-fg shadow-sm' : 'text-fg-faint hover:text-fg',
                )}
              >
                {VIEW_META[v].glyph}
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3 px-1 text-caption">
          <span className="font-medium text-fg" aria-live="polite">{t(VIEW_META[view].label)}</span>
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
        className="relative -mx-1 flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            {/* ONE canvas in the system's page colour, no frame of its own:
                the cards sit on it the way they sit on a real page. */}
            <div className="rounded-3xl px-2 py-3" style={{ backgroundColor: tokens.archTokens?.['surface.page'] }}>
              <p className="sr-only">{t('Sample screens painted with this system.')}</p>
              {rendered(v) && (
                <RecipeScope t={tokens}>
                  <div className="flex flex-col gap-4" inert>
                    <ViewBody view={v} t={t} avatar={avatar} />
                  </div>
                </RecipeScope>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
