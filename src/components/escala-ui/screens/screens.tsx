// Escala screens: the Figma file's `SettingsPage` (2223:838) and `IssueBoardPage` (2223:839) — whole screens composed
// from components only, nothing drawn of their own. Each copies its page's `Prototype` section 1:1:
//   desktop = `_Screen / <Screen> · desktop` (1440 build: Sidebar app shell + main), shown in `DocWindow` at 0.75;
//   mobile  = `Light · <Screen> · mobile` (390 frame: top bar + content, between the iOS status bar and home indicator).
// The layout follows the Breakpoint roles: below `breakpoint.md` (768) a screen draws its mobile build (`layout="auto"`).
// Each screen keeps its pieces: SettingsSection and SettingsRow live on SettingsPage, BoardColumn and IssueCard on
// IssueBoardPage. Storybook (`Screens/<Name>`) and the platform's Screens tab render these same functions.
// Motion: none beyond the components'.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph, type IconName } from '../../../lib/icons'
import { AccountMenuTrigger } from '../account-menu-trigger'
import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { BoardColumn } from '../board-column'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from '../breadcrumb'
import { Button } from '../button'
import { Combobox, type ComboboxOption } from '../combobox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu'
import { IconButton } from '../icon-button'
import { Input } from '../input'
import { IssueCard } from '../issue-card'
import { ProgressLine } from '../progress-line'
import { SegmentedControl, SegmentedControlItem } from '../segmented-control'
import { SettingsRow } from '../settings-row'
import { SettingsSection } from '../settings-section'
import { Sidebar, SidebarBrand, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger } from '../sidebar'
import { Switch } from '../switch'
import { blockType, boxedGlyph } from '../blocks/shared'
import { SCREEN_ROUTES, settingsPath, type SettingsSectionId } from './sitemap'

export type ScreenLayout = 'desktop' | 'mobile'
export const SCREEN_LAYOUTS = ['desktop', 'mobile'] as const

/** The file's `media/photo-*` faces, by name. Without one an Avatar draws its gradient. */
export type ScreenPhotoName = 'photo-9' | 'photo-11' | 'photo-12' | 'photo-13' | 'photo-14' | 'photo-15' | 'photo-16' | 'photo-17'
export type ScreenPhotos = Partial<Record<ScreenPhotoName, string>>

export interface ScreenProps {
  /** desktop · mobile, or `auto`: mobile below the `breakpoint.md` role (768), measured on the screen's own box. */
  layout?: ScreenLayout | 'auto'
  photos?: ScreenPhotos
  /** The prototype's current path (see `sitemap.ts`); a screen marks the matching navigation item. */
  path?: string
  /** A navigation item was chosen: the prototype moves to that path. Without it, links stay on the page. */
  onNavigate?: (path: string) => void
  className?: string
  style?: React.CSSProperties
}

const v = (ref: string) => `var(${cssVarOf(ref)})`
const ic = (name: IconName) => boxedGlyph(name, 'icon.small')
const spacer: React.CSSProperties = { flex: 1, minWidth: 0 }
const clipRow: React.CSSProperties = { display: 'flex', alignItems: 'center', minWidth: 0 }

/** `layout="auto"`: the build the screen's own width calls for, by the `breakpoint.md` role. */
function useScreenLayout(layout: ScreenProps['layout'], ref: React.RefObject<HTMLElement | null>): ScreenLayout {
  const [measured, setMeasured] = React.useState<ScreenLayout>('desktop')
  React.useLayoutEffect(() => {
    const el = ref.current
    if (layout !== 'auto' || !el || typeof ResizeObserver === 'undefined') return
    const md = parseFloat(getComputedStyle(el).getPropertyValue(cssVarOf('breakpoint.md'))) || 768
    const ro = new ResizeObserver(([e]) => setMeasured(e.contentRect.width < md ? 'mobile' : 'desktop'))
    ro.observe(el)
    return () => ro.disconnect()
  }, [layout, ref])
  return layout === 'auto' ? measured : (layout ?? 'desktop')
}

/** A link inside the prototype: follows `onNavigate` when there is one, and never leaves the page. */
function go(onNavigate: ScreenProps['onNavigate'], path: string) {
  return (e: React.SyntheticEvent) => { e.preventDefault(); onNavigate?.(path) }
}

/** The workspace avatar of both screens' SidebarBrand: Avatar initials · sm · rounded · default · solid. */
const workspaceLogo = <Avatar size="sm" shape="rounded" type="initials" variant="default" appearance="solid">OH</Avatar>

/** The AccountMenuTrigger and the account menu it opens (the system's DropdownMenu, as the navigation blocks have it). */
function AccountMenu({ photos, onNavigate }: Pick<ScreenProps, 'photos' | 'onNavigate'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AccountMenuTrigger name="Inès Moreau" avatar={<Avatar type="image" src={photos?.['photo-11']} alt="" />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuLabel>Inès Moreau</DropdownMenuLabel>
        <DropdownMenuItem iconLeading={ic('user')}>Profile</DropdownMenuItem>
        <DropdownMenuItem iconLeading={ic('gear')} onSelect={() => onNavigate?.(settingsPath('general'))}>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" iconLeading={ic('sign-out')}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── SettingsPage ────────────────────────────────────────────────────────────────────────────────────────────────────

const opts = (...labels: string[]): ComboboxOption[] => labels.map((l) => ({ label: l, value: l }))
const CONTROL_WIDTH = 280
const select = (value: string, options: ComboboxOption[], stacked = false) => (
  <Combobox options={options} defaultValue={value} placeholder="Search" leading={null} width={stacked ? '100%' : CONTROL_WIDTH} />
)
const field = (value: string) => <Input defaultValue={value} style={{ width: CONTROL_WIDTH }} />
const toggle = (on: boolean) => <Switch defaultChecked={on} />
const segments = (value: string, labels: string[], stacked = false) => (
  <SegmentedControl defaultValue={value} style={stacked ? { width: '100%' } : undefined}>
    {labels.map((l) => <SegmentedControlItem key={l} value={l} label={l} />)}
  </SegmentedControl>
)

type Labelled = React.ReactElement<{ 'aria-labelledby'?: string; 'aria-describedby'?: string }>
interface RowDef { title: string; description: string; control: (stacked: boolean) => Labelled }
interface SectionDef { id: SettingsSectionId | 'danger'; title: string; description: string; rows: RowDef[] }

/** `_Screen / SettingsPage · desktop` (2266:1555): seven SettingsSection, copy and controls as the file has them. */
const SETTINGS: SectionDef[] = [
  { id: 'general', title: 'General', description: 'Name, address and regional defaults for the workspace.', rows: [
    { title: 'Workspace name', description: 'Shown in the sidebar, in invitations and in email footers.', control: () => field('Ohmewn') },
    { title: 'Workspace address', description: 'Old links redirect for 30 days after a change.', control: () => <Input type="url" addon="escala.app/" defaultValue="ohmewn" style={{ width: CONTROL_WIDTH }} /> },
    { title: 'Language', description: 'Sets dates, numbers and interface text.', control: (s) => select('Español (España)', opts('English (UK)', 'English (US)', 'Español (España)', 'Français (France)', 'Deutsch'), s) },
    { title: 'Time zone', description: 'Due dates and summaries follow this zone.', control: (s) => select('Paris (GMT+1)', opts('London (GMT)', 'Paris (GMT+1)', 'Madrid (GMT+1)', 'New York (GMT-5)'), s) },
    { title: 'First day of the week', description: 'Used by calendars and weekly reports.', control: (s) => segments('Monday', ['Monday', 'Sunday'], s) },
  ] },
  { id: 'appearance', title: 'Appearance', description: 'How the interface looks on this device only.', rows: [
    { title: 'Theme', description: 'Follow the operating system or choose one.', control: (s) => segments('System', ['Light', 'Dark', 'System'], s) },
    { title: 'Density', description: 'Compact shows more rows in lists and tables.', control: (s) => segments('Comfortable', ['Comfortable', 'Compact'], s) },
    { title: 'Reduce motion', description: 'Replaces movement with fades across the app.', control: () => toggle(false) },
  ] },
  { id: 'notifications', title: 'Notifications', description: 'Pick the events that reach you and how often.', rows: [
    { title: 'Mentions', description: 'Someone tags you or a team you belong to.', control: () => toggle(true) },
    { title: 'Assigned to me', description: 'New issues and review requests addressed to you.', control: () => toggle(true) },
    { title: 'Failed builds', description: 'A pipeline breaks on a branch you own.', control: () => toggle(true) },
    { title: 'Weekly summary', description: 'A Monday recap of everything that shipped.', control: () => toggle(false) },
    { title: 'Email frequency', description: 'Group emails so they arrive less often.', control: (s) => select('Every hour', opts('Right away', 'Every hour', 'Once a day'), s) },
  ] },
  { id: 'security', title: 'Security', description: 'Sign-in rules and session policy for every member.', rows: [
    { title: 'Require two-step verification', description: 'Members add an authenticator app or a security key.', control: () => toggle(true) },
    { title: 'Single sign-on (SAML)', description: 'Members sign in through your identity provider.', control: () => toggle(false) },
    { title: 'Idle session timeout', description: 'Inactive members are signed out after this time.', control: (s) => select('12 hours', opts('1 hour', '12 hours', '7 days', 'Never'), s) },
    { title: 'Audit log retention', description: 'How long sign-ins and changes are stored.', control: (s) => select('180 days', opts('30 days', '90 days', '180 days', '1 year'), s) },
  ] },
  { id: 'members', title: 'Members', description: 'Who can join the workspace and what newcomers can do.', rows: [
    { title: 'Default role', description: 'Given to everyone who joins through an invite link.', control: (s) => select('Editor', opts('Viewer', 'Editor', 'Admin'), s) },
    { title: 'Who can invite', description: 'Admins review requests from everyone else.', control: (s) => segments('Admins', ['Admins', 'Everyone'], s) },
    { title: 'Guest access', description: 'Guests only see the projects shared with them.', control: () => toggle(true) },
    { title: 'Approved domains', description: 'People with these addresses join without an invite.', control: () => field('ohmewn.app') },
  ] },
  { id: 'billing', title: 'Billing', description: 'Where invoices go and how they are issued.', rows: [
    { title: 'Billing email', description: 'Receipts and payment notices are sent here.', control: () => field('accounts@ohmewn.app') },
    { title: 'Invoice currency', description: 'Applies from the next billing period.', control: (s) => select('Euro (EUR)', opts('Euro (EUR)', 'US dollar (USD)', 'Pound sterling (GBP)'), s) },
    { title: 'Budget alerts', description: 'Notify admins at 80% of the monthly limit.', control: () => toggle(true) },
    { title: 'Tax ID', description: 'Printed on every invoice.', control: () => field('FR 12 345678901') },
  ] },
  { id: 'danger', title: 'Danger zone', description: 'Actions here cannot be undone.', rows: [
    { title: 'Delete workspace', description: 'Removes every project, issue and file for all members.', control: () => <Button variant="critical" appearance="outline">Delete workspace</Button> },
  ] },
]

const SETTINGS_NAV: { group: string; items: { label: string; icon: IconName; section?: SettingsSectionId }[] }[] = [
  { group: 'Workspace', items: [
    { label: 'General', icon: 'sliders', section: 'general' }, { label: 'Appearance', icon: 'palette', section: 'appearance' },
    { label: 'Notifications', icon: 'bell', section: 'notifications' }, { label: 'Security', icon: 'shield-check', section: 'security' },
    { label: 'Members', icon: 'users', section: 'members' }, { label: 'Billing', icon: 'credit-card', section: 'billing' },
  ] },
  { group: 'Account', items: [{ label: 'Profile', icon: 'user' }, { label: 'API keys', icon: 'key' }] },
]

function settingsSectionOf(path: string | undefined): SettingsSectionId {
  const id = path?.split('/')[2] as SettingsSectionId | undefined
  return id && SETTINGS.some((s) => s.id === id) ? id : 'general'
}

function SettingsSections({ sections, stacked }: { sections: SectionDef[]; stacked: (row: RowDef) => boolean }) {
  return (
    <>
      {sections.map((s) => (
        <SettingsSection key={s.id} id={`settings-${s.id}`} title={s.title} description={s.description} style={{ scrollMarginTop: v('spacing.inset-page') }}>
          {s.rows.map((r) => {
            const st = stacked(r)
            return <SettingsRow key={r.title} layout={st ? 'stacked' : 'inline'} title={r.title} description={r.description} control={r.control(st)} />
          })}
        </SettingsSection>
      ))}
    </>
  )
}

/** Figma `SettingsPage`. Desktop: the Workspace settings sidebar beside a scrolling main (title, search with ⌘ K, every
 *  section); choosing a section scrolls to it. Mobile: a back button and the Notifications page, its select and segmented
 *  rows stacked as the 390 frame has them. */
export function SettingsPage({ layout = 'desktop', path, onNavigate, className, style }: ScreenProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const mainRef = React.useRef<HTMLElement>(null)
  const build = useScreenLayout(layout, ref)
  const current = settingsSectionOf(path)
  React.useEffect(() => {
    if (build !== 'desktop' || !path) return
    const el = mainRef.current?.querySelector<HTMLElement>(`#settings-${current}`)
    const main = mainRef.current
    if (el && main) main.scrollTo({ top: current === 'general' ? 0 : el.offsetTop - main.offsetTop })
  }, [build, current, path])

  if (build === 'mobile') {
    // The 390 frame: Notifications, then Appearance without Density.
    const byId = (id: SectionDef['id']) => SETTINGS.find((s) => s.id === id)!
    const appearance = byId('appearance')
    const mobile = [byId('notifications'), { ...appearance, rows: appearance.rows.filter((r) => r.title !== 'Density') }]
    return (
      <div ref={ref} data-screen="SettingsPage" data-layout="mobile" className={className} style={{ display: 'flex', flexDirection: 'column', background: v('color.surface.page'), ...style }}>
        <header style={{ ...clipRow, gap: v('spacing.gap-control'), padding: `${v('spacing.gap-control')} ${v('spacing.inset-page')}`, flexShrink: 0 }}>
          <IconButton variant="secondary" appearance="ghost" icon={glyph('caret-left')} aria-label="Back" onClick={go(onNavigate, SCREEN_ROUTES.board)} />
          <h1 style={{ margin: 0, color: v('color.content.primary'), ...blockType('heading-sm') }}>Notifications</h1>
        </header>
        <main style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-section'), padding: `${v('spacing.gap-control')} ${v('spacing.inset-page')} ${v('spacing.inset-page')}` }}>
          <Input type="search" placeholder="Search settings" shortcut={null} aria-label="Search settings" />
          <SettingsSections sections={mobile} stacked={(r) => r.control(false).type !== Switch} />
        </main>
      </div>
    )
  }

  return (
    <div ref={ref} data-screen="SettingsPage" data-layout="desktop" className={className} style={{ display: 'flex', height: '100%', minHeight: 0, background: v('color.surface.page'), ...style }}>
      <Sidebar aria-label="Settings" style={{ width: 'calc(var(--spacing-1) * 68)' }}>
        <SidebarHeader><SidebarBrand title="Ohmewn" subtitle="Workspace settings" logo={workspaceLogo} /><SidebarTrigger /></SidebarHeader>
        <SidebarContent>
          {SETTINGS_NAV.map((g) => (
            <SidebarGroup key={g.group}>
              <SidebarGroupLabel>{g.group}</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu>
                {g.items.map((i) => (
                  <SidebarMenuItem key={i.label}>
                    <SidebarMenuButton icon={ic(i.icon)} state={i.section === current ? 'Current' : undefined} aria-current={i.section === current ? 'page' : undefined}
                      onClick={i.section ? go(onNavigate, settingsPath(i.section)) : undefined}>{i.label}</SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu><SidebarMenuItem><SidebarMenuButton icon={ic('house')} onClick={go(onNavigate, SCREEN_ROUTES.board)}>Back to workspace</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <main ref={mainRef} style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: v('spacing.gap-section'), padding: v('spacing.inset-page'), position: 'relative' }}>
        <header style={{ ...clipRow, gap: v('spacing.gap-group'), flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: v('spacing.gap-tight') }}>
            <h1 style={{ margin: 0, color: v('color.content.primary'), ...blockType('heading-lg') }}>Settings</h1>
            <p style={{ margin: 0, color: v('color.content.secondary'), ...blockType('body-md') }}>Changes save automatically and apply to everyone in Ohmewn.</p>
          </div>
          <Input type="search" placeholder="Search settings" shortcut={['⌘', 'K']} aria-label="Search settings" style={{ width: 320 }} />
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-section'), flexShrink: 0 }}>
          <SettingsSections sections={SETTINGS} stacked={() => false} />
        </div>
      </main>
    </div>
  )
}

// ── IssueBoardPage ──────────────────────────────────────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high'
type Tag = 'Backend' | 'Frontend' | 'Growth' | 'Design' | 'Bug' | 'Performance'
interface Issue { key: string; title: string; priority: Priority; tags: Tag[]; photo: ScreenPhotoName; pr?: string; comments?: string; due?: string; dragging?: boolean }
interface Lane { title: string; icon: IconName; ink?: string; issues: Issue[] }

const PRIORITY_ICON: Record<Priority, IconName> = { low: 'cell-signal-low', medium: 'cell-signal-medium', high: 'cell-signal-high' }
/** The file's tag Badges: soft · default type, one intent per tag. */
const TAG_VARIANT: Record<Tag, 'secondary' | 'info' | 'success' | 'default' | 'critical' | 'warning'> = {
  Backend: 'secondary', Frontend: 'info', Growth: 'success', Design: 'default', Bug: 'critical', Performance: 'warning',
}

/** `_Screen / IssueBoardPage · desktop` (2266:5960): five lanes, every card as the file has it. */
const LANES: Lane[] = [
  { title: 'Backlog', icon: 'circle-dashed', issues: [
    { key: 'PAY-312', title: 'Support split payments across two cards', priority: 'low', tags: ['Backend'], comments: '2', photo: 'photo-17' },
    { key: 'PAY-318', title: 'Postcode lookup for Spanish addresses', priority: 'low', tags: ['Frontend'], comments: '5', photo: 'photo-9' },
    { key: 'PAY-321', title: 'Guest checkout for first-time buyers', priority: 'medium', tags: ['Growth'], photo: 'photo-12' },
    { key: 'PAY-324', title: 'Translate decline reasons into 12 languages', priority: 'low', tags: ['Frontend'], photo: 'photo-13' },
  ] },
  { title: 'Todo', icon: 'circle', ink: 'color.content.secondary', issues: [
    { key: 'PAY-301', title: 'Wallet button on product detail pages', priority: 'medium', tags: ['Frontend'], due: 'Nov 24', photo: 'photo-14' },
    { key: 'PAY-303', title: 'Retry card authentication after a timeout', priority: 'high', tags: ['Backend', 'Bug'], comments: '4', due: 'Nov 21', photo: 'photo-15' },
    { key: 'PAY-306', title: 'Skeleton state while totals recalculate', priority: 'medium', tags: ['Design'], photo: 'photo-16' },
    { key: 'PAY-308', title: 'VAT line for Canary Islands orders', priority: 'medium', tags: ['Backend'], due: 'Nov 27', photo: 'photo-17' },
    { key: 'PAY-310', title: 'Coupon field overlaps on narrow screens', priority: 'high', tags: ['Frontend', 'Bug'], comments: '3', photo: 'photo-17' },
  ] },
  { title: 'In progress', icon: 'circle-half', ink: 'color.status.warning.content', issues: [
    { key: 'PAY-288', title: 'Separate delivery and invoice steps', priority: 'high', pr: '#2041', tags: ['Frontend'], comments: '6', due: 'Nov 19', photo: 'photo-9' },
    { key: 'PAY-291', title: 'Idempotent keys for payment requests', priority: 'high', pr: '#2038', tags: ['Backend', 'Bug'], due: 'Nov 18', photo: 'photo-12' },
    { key: 'PAY-294', title: 'New payment method selector', priority: 'medium', tags: ['Design'], comments: '4', photo: 'photo-13', dragging: true },
    { key: 'PAY-297', title: 'Animate the total when shipping changes', priority: 'low', tags: ['Frontend', 'Performance'], photo: 'photo-14' },
  ] },
  { title: 'In review', icon: 'eye', ink: 'color.status.info.content', issues: [
    { key: 'PAY-276', title: 'One-tap checkout with saved wallets', priority: 'high', pr: '#2027', tags: ['Frontend'], comments: '11', photo: 'photo-15' },
    { key: 'PAY-279', title: 'Fraud score webhook from the risk provider', priority: 'medium', pr: '#2031', tags: ['Backend'], comments: '2', photo: 'photo-16' },
    { key: 'PAY-282', title: 'Empty basket suggests recently viewed items', priority: 'low', tags: ['Design'], photo: 'photo-17' },
  ] },
  { title: 'Done', icon: 'check-circle', ink: 'color.status.success.content', issues: [
    { key: 'PAY-261', title: 'Guest order lookup by email', priority: 'medium', pr: '#1998', tags: ['Frontend'], photo: 'photo-17' },
    { key: 'PAY-264', title: 'Cache exchange rates for 15 minutes', priority: 'low', pr: '#2003', tags: ['Backend'], comments: '1', photo: 'photo-9' },
    { key: 'PAY-268', title: 'Receipt PDF with company tax details', priority: 'medium', pr: '#2010', tags: ['Backend'], photo: 'photo-12' },
  ] },
]
const ISSUE_COUNT = LANES.reduce((n, l) => n + l.issues.length, 0)
const BOARD_SUMMARY = `${ISSUE_COUNT} issues · 72 points`

const tag = (t: Tag) => <Badge appearance="soft" shape="rounded" size="sm" type="default" variant={TAG_VARIANT[t]}>{t}</Badge>

function Lanes({ photos, width }: { photos?: ScreenPhotos; width: number }) {
  return (
    <>
      {LANES.map((lane) => (
        <div key={lane.title} data-lane={lane.title} style={{ width, flexShrink: 0, scrollSnapAlign: 'start' }}>
          <BoardColumn title={lane.title} count={lane.issues.length}
            statusIcon={<span style={{ display: 'inline-flex', width: '100%', height: '100%', color: lane.ink ? v(lane.ink) : undefined }}>{glyph(lane.icon)}</span>}>
            {lane.issues.map((i) => (
              <IssueCard key={i.key} href={`#${i.key}`} onClick={(e) => e.preventDefault()} issueKey={i.key} title={i.title} pullRequest={i.pr}
                forceState={i.dragging ? 'Dragging' : undefined}
                priorityIcon={glyph(PRIORITY_ICON[i.priority])}
                assignee={<Avatar type="image" size="xs" shape="circle" src={photos?.[i.photo]} aria-label="Assignee" />}
                tag={tag(i.tags[0])} tagSecondary={i.tags[1] ? tag(i.tags[1]) : undefined} comments={i.comments} due={i.due} />
            ))}
          </BoardColumn>
        </div>
      ))}
    </>
  )
}

const BOARD_NAV = [
  { items: [{ label: 'My issues', icon: 'user-circle' as IconName, count: '4' }, { label: 'Current cycle', icon: 'clock-countdown' as IconName, count: '21' }, { label: 'All issues', icon: 'stack' as IconName }] },
  { group: 'Projects', items: [
    { label: 'Payments 2.0', icon: 'shopping-cart' as IconName, count: '19', current: true }, { label: 'iOS 5.1', icon: 'device-mobile' as IconName, count: '5' },
    { label: 'Platform API', icon: 'code' as IconName, count: '4' }, { label: 'Design system', icon: 'cube' as IconName, count: '3' },
  ] },
]

/** Figma `IssueBoardPage`. Desktop: the workspace sidebar (views, projects, the cycle's progress, the account) beside a
 *  header with breadcrumb and actions, the filter bar and five lanes that scroll sideways. Mobile: a top bar, the filters
 *  and one 320 lane in view with the next peeking; it opens on In progress, as the 390 frame does. */
export function IssueBoardPage({ layout = 'desktop', photos, onNavigate, className, style }: ScreenProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const boardRef = React.useRef<HTMLDivElement>(null)
  const build = useScreenLayout(layout, ref)
  React.useLayoutEffect(() => {
    const board = boardRef.current
    if (build !== 'mobile' || !board) return
    const lane = board.querySelector<HTMLElement>('[data-lane="In progress"]')
    if (!lane) return
    // getBoundingClientRect is in zoomed pixels inside the DocWindow; the ratio to offsetWidth undoes it.
    const z = board.getBoundingClientRect().width / board.offsetWidth || 1
    const pad = parseFloat(getComputedStyle(board).paddingLeft || '0')
    board.scrollLeft += (lane.getBoundingClientRect().left - board.getBoundingClientRect().left) / z - pad
  }, [build])

  if (build === 'mobile') {
    return (
      <div ref={ref} data-screen="IssueBoardPage" data-layout="mobile" className={className} style={{ display: 'flex', flexDirection: 'column', background: v('color.surface.page'), minHeight: 0, ...style }}>
        <header style={{ ...clipRow, gap: v('spacing.gap-control'), padding: `${v('spacing.gap-control')} ${v('spacing.inset-page')}`, flexShrink: 0 }}>
          <IconButton variant="secondary" appearance="ghost" icon={glyph('list')} aria-label="Menu" />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: 0, color: v('color.content.primary'), ...blockType('heading-sm') }}>Payments 2.0</h1>
            <span style={{ color: v('color.content.secondary'), ...blockType('caption') }}>{BOARD_SUMMARY}</span>
          </div>
          <IconButton variant="secondary" appearance="outline" icon={glyph('link')} aria-label="Share" />
          <IconButton icon={glyph('plus')} aria-label="New issue" />
        </header>
        <div role="search" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control'), padding: `0 ${v('spacing.inset-page')} ${v('spacing.gap-group')}`, flexShrink: 0 }}>
          <Input size="sm" type="search" placeholder="Filter issues" shortcut={null} aria-label="Filter issues" />
          <div style={{ display: 'flex', gap: v('spacing.gap-control') }}>
            <Button variant="secondary" appearance="outline" size="xs" leading={ic('cell-signal-high')}>Priority</Button>
            <Button variant="secondary" appearance="outline" size="xs" leading={ic('tag')}>Tags</Button>
            <Button variant="secondary" appearance="outline" size="xs" leading={ic('user-circle')}>Assignee</Button>
          </div>
        </div>
        <div ref={boardRef} aria-label="Board" role="region" style={{ display: 'flex', alignItems: 'flex-start', gap: v('spacing.gap-group'), padding: `0 ${v('spacing.inset-page')}`, scrollPaddingInline: v('spacing.inset-page'), overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', flex: 1, minHeight: 0 }}>
          <Lanes photos={photos} width={320} />
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} data-screen="IssueBoardPage" data-layout="desktop" className={className} style={{ display: 'flex', height: '100%', minHeight: 0, background: v('color.surface.page'), ...style }}>
      <Sidebar aria-label="Workspace" style={{ width: 'calc(var(--spacing-1) * 68)' }}>
        <SidebarHeader><SidebarBrand title="Ohmewn" subtitle="Product" logo={workspaceLogo} /><SidebarTrigger /></SidebarHeader>
        <SidebarContent>
          {BOARD_NAV.map((g, gi) => (
            <SidebarGroup key={gi}>
              {g.group && <SidebarGroupLabel>{g.group}</SidebarGroupLabel>}
              <SidebarGroupContent><SidebarMenu>
                {g.items.map((i) => {
                  const current = 'current' in i && i.current
                  return (
                    <SidebarMenuItem key={i.label}>
                      <SidebarMenuButton icon={ic(i.icon)} trailing={'count' in i ? i.count : undefined} state={current ? 'Current' : undefined} aria-current={current ? 'page' : undefined}
                        onClick={current ? go(onNavigate, SCREEN_ROUTES.board) : undefined}>{i.label}</SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div data-part="cycle-progress" style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control'), padding: `${v('spacing.gap-control')} ${v('spacing.inset-control')}` }}>
            <div style={{ ...clipRow, justifyContent: 'space-between' }}>
              <span style={{ color: v('color.content.primary'), ...blockType('label') }}>Cycle 24</span>
              <span style={{ color: v('color.content.secondary'), ...blockType('caption') }}>9 days left</span>
            </div>
            <ProgressLine size="sm" value={50} aria-label="Cycle 24 progress" />
            <div style={{ ...clipRow, justifyContent: 'space-between', color: v('color.content.secondary'), ...blockType('caption') }}>
              <span>52 of 104 points</span><span>Day 5 of 14</span>
            </div>
          </div>
          <AccountMenu photos={photos} onNavigate={onNavigate} />
        </SidebarFooter>
      </Sidebar>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), padding: v('spacing.inset-surface'), overflow: 'clip' }}>
        <header style={{ ...clipRow, gap: v('spacing.gap-control'), flexShrink: 0 }}>
          <Breadcrumb size="sm" separator="chevron" appearance="ghost" aria-label="Breadcrumb"><BreadcrumbList>
            <BreadcrumbItem href="#" onClick={go(onNavigate, SCREEN_ROUTES.board)} iconLeading={ic('house')}>Ohmewn</BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem href="#" onClick={go(onNavigate, SCREEN_ROUTES.board)}>Projects</BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem current>Payments 2.0</BreadcrumbItem>
          </BreadcrumbList></Breadcrumb>
          <span style={{ color: v('color.content.secondary'), whiteSpace: 'nowrap', ...blockType('caption') }}>{BOARD_SUMMARY}</span>
          <span style={spacer} />
          <Button variant="secondary" appearance="outline" size="sm" leading={ic('link')}>Share</Button>
          <Button size="sm" leading={ic('plus')}>New issue</Button>
        </header>
        <div role="search" style={{ ...clipRow, gap: v('spacing.gap-control'), flexShrink: 0 }}>
          <Input size="sm" type="search" placeholder="Filter issues" shortcut={['/']} aria-label="Filter issues" style={{ width: 240 }} />
          <Button variant="secondary" appearance="outline" size="sm" leading={ic('cell-signal-high')}>Priority</Button>
          <Button variant="secondary" appearance="outline" size="sm" leading={ic('tag')}>Tags</Button>
          <Button variant="secondary" appearance="outline" size="sm" leading={ic('user-circle')}>Assignee</Button>
          <span style={spacer} />
          <SegmentedControl size="sm" defaultValue="Status" aria-label="Group by">
            <SegmentedControlItem value="Status" label="Status" />
            <SegmentedControlItem value="Assignee" label="Assignee" />
          </SegmentedControl>
        </div>
        <div aria-label="Board" role="region" style={{ display: 'flex', alignItems: 'flex-start', gap: v('spacing.gap-group'), flex: 1, minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
          <Lanes photos={photos} width={272} />
        </div>
      </main>
    </div>
  )
}
