// Escala blocks · HeaderNavigation and SidebarNavigation. The Figma pages `HeaderNavigation` (1059:2) and `SidebarNavigation`
// (1064:2): AnnouncementBar, UtilityBar, AppHeader, AppHeaderExtended, FloatingHeader, SidebarStatCard, DualSidebar. Composed of
// escala-ui components and role tokens (CSS variables) only. `Layout=desktop · mobile` is a VIEWPORT switch of the same
// anatomy (the nav collapses to a menu button on mobile): it is never animated.
//
// Motion (contract in navigation.contract.json): persistent chrome has none on load; the DualSidebar's rail ↔ panel and
// the mobile menu are the Sidebar's / Sheet's own motion (a block never retimes its parts).
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { liftShadow } from '../../../lib/recipeStyles'
import { glyph } from '../../../lib/icons'
import { AccountMenuTrigger } from '../account-menu-trigger'
import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Brand } from '../brand'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from '../breadcrumb'
import { Button } from '../button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu'
import { CloseButton } from '../close-button'
import { IconButton } from '../icon-button'
import { Input } from '../input'
import { NavItem } from '../nav-item'
import { SegmentedControl, SegmentedControlItem } from '../segmented-control'
import { Separator } from '../separator'
import { Sidebar, SidebarBrand, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../sidebar'
import { TextLink } from '../text-link'
import { boxedGlyph, blockType } from './shared'

export const NAV_LAYOUTS = ['desktop', 'mobile'] as const
export type NavLayout = (typeof NAV_LAYOUTS)[number]

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = blockType
const spacer: React.CSSProperties = { flex: 1 }
/** Every glyph in these blocks sits in an sm or xs control (or a 32 px row): Icon/small, 16 px in the file. */
const ic = (name: Parameters<typeof boxedGlyph>[0]) => boxedGlyph(name, 'icon.small')

/** The account menu a header's avatar opens: the system's DropdownMenu on the AccountMenuTrigger (label, rows, a destructive one).
 *  Open and close are the DropdownMenu's own motion (disclosure roles); the block adds none. */
function AccountMenu({ name = 'Ayla' }: { name?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><AccountMenuTrigger size="sm" name={name} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuItem iconLeading={ic('user')}>Profile</DropdownMenuItem>
        <DropdownMenuItem iconLeading={ic('file')}>Billing</DropdownMenuItem>
        <DropdownMenuItem iconLeading={ic('gear')}>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" iconLeading={ic('sign-out')}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface Common { layout?: NavLayout; className?: string; style?: React.CSSProperties }

/** Figma `AnnouncementBar` (1059:3): Surface/accent, an outline Badge, Lightning, one sentence and a ghost CloseButton. */
export function AnnouncementBar({ badgeVisible = true, iconVisible = true, closeVisible = true, message = 'This message may require attention before proceeding with your current task.', onClose, style }: { badgeVisible?: boolean; iconVisible?: boolean; closeVisible?: boolean; message?: string; onClose?: () => void; style?: React.CSSProperties }) {
  return (
    <div data-block="AnnouncementBar" role="region" aria-label="Announcement" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control'), padding: `${v('spacing.gap-control')} ${v('spacing.inset-page')}`, background: v('color.surface.accent'), color: v('color.content.primary'), ...type('body-sm'), ...style }}>
      {badgeVisible && <Badge size="sm" appearance="outline" variant="default">Workspace</Badge>}
      {iconVisible && <span style={{ display: 'inline-flex', color: v('color.content.accent') }}>{ic('lightning')}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      {closeVisible && <CloseButton appearance="ghost" shape="pill" size="sm" aria-label="Dismiss announcement" onClick={onClose} />}
    </div>
  )
}

const SOCIAL = [['Instagram', 'instagram-logo'], ['X', 'x-logo'], ['YouTube', 'youtube-logo'], ['GitHub', 'github-logo']] as const

/** Figma `UtilityBar` (1059:27): TextLinks, social IconButtons and the language Button, over a Border/subtle rule. */
export function UtilityBar({ languageVisible = true, socialVisible = true, style }: { languageVisible?: boolean; socialVisible?: boolean; style?: React.CSSProperties }) {
  return (
    <div data-block="UtilityBar" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-group'), padding: `${v('spacing.gap-tight')} ${v('spacing.inset-page')}`, background: v('color.surface.page'), borderBottom: `${v('stroke.divider')} solid ${v('color.border.subtle')}`, ...style }}>
      <nav aria-label="Utility" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-group') }}>
        {['Docs', 'Changelog', 'Status'].map((l) => <TextLink key={l} href="#" size="xs" variant="secondary" underline={false}>{l}</TextLink>)}
      </nav>
      <span style={spacer} />
      {socialVisible && <div style={{ display: 'flex', gap: v('spacing.gap-tight') }}>{SOCIAL.map(([n, icon]) => <IconButton key={n} size="xs" variant="secondary" appearance="ghost" aria-label={n} icon={ic(icon)} />)}</div>}
      {languageVisible && <Button size="xs" variant="secondary" appearance="ghost" leading={ic('globe')} trailing={ic('chevron-down')}>EN</Button>}
    </div>
  )
}

/** The notifications IconButton with its count Badge (solid critical, Type=number), as every header draws it. */
function Notifications({ count = 7 }: { count?: number }) {
  return <IconButton size="sm" variant="secondary" appearance="ghost" aria-label={`Notifications, ${count} unread`} icon={ic('bell')} badge={<Badge type="number" appearance="solid" shape="pill" size="xs" variant="critical" count={count} />} />
}
const SearchTrigger = () => <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Search" icon={ic('search')} />
const MenuTrigger = () => <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Open menu" aria-expanded={false} icon={ic('list')} />

/** The theme toggle: a SegmentedControl sm of Sun · Moon. */
function ThemeToggle() {
  return (
    <SegmentedControl size="sm" defaultValue="Light" aria-label="Theme">
      <SegmentedControlItem value="Light" label="Light" aria-label="Light" labelVisible={false} iconLeadingVisible iconLeading={ic('sun')} />
      <SegmentedControlItem value="Dark" label="Dark" aria-label="Dark" labelVisible={false} iconLeadingVisible iconLeading={ic('moon')} />
    </SegmentedControl>
  )
}

/** The AppHeader's Nav slot as the file fills it: Product (a NEW badge), Solutions (a menu caret), Pricing, Blog, Contact. */
export function HeaderNavLinks({ current }: { current?: string }) {
  return (
    <>
      <NavItem href="#" size="sm" current={current === 'Product'} trailing={<Badge appearance="soft" shape="pill" size="xs" variant="info">NEW</Badge>}>Product</NavItem>
      <NavItem href="#" size="sm" current={current === 'Solutions'} iconTrailing={ic('chevron-down')}>Solutions</NavItem>
      {['Pricing', 'Blog', 'Contact'].map((l) => <NavItem key={l} href="#" size="sm" current={l === current}>{l}</NavItem>)}
    </>
  )
}

interface HeaderProps extends Common {
  themeToggleVisible?: boolean; messagesVisible?: boolean; notificationsVisible?: boolean; searchVisible?: boolean; searchButtonVisible?: boolean
  /** The Nav slot (desktop). Omitted → the file's five links. */
  nav?: React.ReactNode
  current?: string
}
const HEADER_BAR: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: v('spacing.gap-group'), padding: `${v('spacing.inset-control')} ${v('spacing.inset-page')}`, background: v('color.surface.page'), borderBottom: `${v('stroke.divider')} solid ${v('color.border.subtle')}` }

/** Figma `AppHeader` (1061:433), Layout desktop · mobile. Defaults are the set's: notifications and the search button
 *  on, messages and the search field off. The theme toggle is drawn in every variant of the file (its
 *  ThemeToggleVisible property is not wired to the layer), so it stays on here too. */
export function AppHeader({ layout = 'desktop', themeToggleVisible = true, messagesVisible = false, notificationsVisible = true, searchVisible = false, searchButtonVisible = true, nav, current, style, className }: HeaderProps) {
  if (layout === 'mobile') {
    return (
      <header data-block="AppHeader" data-layout="mobile" className={className} style={{ ...HEADER_BAR, ...style }}>
        <Brand size="sm" /><span style={spacer} />
        <AccountMenu />
        <MenuTrigger />
      </header>
    )
  }
  return (
    <header data-block="AppHeader" data-layout="desktop" className={className} style={{ ...HEADER_BAR, ...style }}>
      <Brand size="sm" />
      <Separator orientation="vertical" tone="subtle" style={{ height: v('icon.large') }} />
      <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-tight') }}>
        {nav ?? <HeaderNavLinks current={current} />}
      </nav>
      <span style={spacer} />
      {/* Figma: the search field is 260 wide (65 × the 4 px spacing unit). */}
      {searchVisible && <div style={{ width: 'calc(var(--spacing-1) * 65)', flexShrink: 0 }}><Input size="sm" type="search" placeholder="Search anything…" aria-label="Search" /></div>}
      <div data-part="actions" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
        {messagesVisible && <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Messages" icon={ic('chat-circle')} />}
        {notificationsVisible && <Notifications />}
        {searchButtonVisible && <SearchTrigger />}
        {themeToggleVisible && <ThemeToggle />}
        <AccountMenu />
      </div>
    </header>
  )
}

/** Figma `AppHeaderExtended` (1061:5849): AnnouncementBar, UtilityBar, AppHeader (search field, messages,
 *  notifications, theme toggle) and the Breadcrumb bar (desktop); AppHeader and the Breadcrumb bar (mobile). */
export function AppHeaderExtended({ layout = 'desktop', announcementVisible = true, utilityVisible = true, breadcrumbVisible = true, style }: Common & { announcementVisible?: boolean; utilityVisible?: boolean; breadcrumbVisible?: boolean }) {
  return (
    <div data-block="AppHeaderExtended" data-layout={layout} style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.none'), ...style }}>
      {layout === 'desktop' && announcementVisible && <AnnouncementBar />}
      {layout === 'desktop' && utilityVisible && <UtilityBar />}
      <AppHeader layout={layout} searchVisible messagesVisible searchButtonVisible={false} />
      {breadcrumbVisible && (
        <div data-part="breadcrumb-bar" style={{ display: 'flex', alignItems: 'center', padding: `${v('spacing.gap-control')} ${v('spacing.inset-page')}`, background: v('color.surface.layer-1'), borderBottom: `${v('stroke.divider')} solid ${v('color.border.subtle')}` }}>
          <Breadcrumb size="sm" separator="slash" appearance="ghost" aria-label="Breadcrumb"><BreadcrumbList>
            <BreadcrumbItem href="#" iconLeading={ic('house')}>Home</BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem href="#">Components</BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem current>Header</BreadcrumbItem>
          </BreadcrumbList></Breadcrumb>
        </div>
      )}
    </div>
  )
}

/** The FloatingHeader's Nav slot as the file's Header 05 fills it: Product, Solutions ▾, Pricing (current), More. */
export function FloatingNavLinks({ current = 'Pricing' }: { current?: string }) {
  return (
    <>
      <NavItem href="#" size="sm" current={current === 'Product'}>Product</NavItem>
      <NavItem href="#" size="sm" current={current === 'Solutions'} iconTrailing={ic('chevron-down')}>Solutions</NavItem>
      <NavItem href="#" size="sm" current={current === 'Pricing'}>Pricing</NavItem>
      <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="More" icon={ic('dots-three')} />
    </>
  )
}

const ICON_NAV = [['Product', 'cube'], ['Ideas', 'lightbulb'], ['Pricing', 'tag'], ['Contact', 'paper-plane-tilt'], ['More', 'dots-three']] as const

/** The FloatingHeader's Nav slot as the file's Header 04 fills it: icon-only IconButtons, the current one solid. */
export function FloatingIconNav({ current = 'Product' }: { current?: string }) {
  return <>{ICON_NAV.map(([label, icon]) => <IconButton key={label} size="sm" variant="secondary" appearance={label === current ? 'solid' : 'ghost'} aria-label={label} aria-current={label === current ? 'page' : undefined} icon={ic(icon)} />)}</>
}

export const FLOATING_NAVS = ['links', 'icons'] as const
export type FloatingNav = (typeof FLOATING_NAVS)[number]

/** Figma `FloatingHeader` (1061:6090): a 720-wide bar detached from the page edge — Surface/page, Border/default,
 *  Radius/container, Shadow/md. The Nav slot is centred between two spacers. */
export function FloatingHeader({ layout = 'desktop', notificationsVisible = true, searchButtonVisible = true, nav = 'links', style }: Common & { notificationsVisible?: boolean; searchButtonVisible?: boolean; nav?: FloatingNav | React.ReactNode }) {
  const bar: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: v('spacing.gap-group'), padding: `${v('spacing.gap-control')} ${v('spacing.inset-control')}`,
    background: v('color.surface.page'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'),
    boxShadow: liftShadow('floating-md'), boxSizing: 'border-box',
    // Figma: 720 wide on desktop (180 × the 4 px spacing unit); the mobile variant fills its column.
    width: layout === 'desktop' ? 'calc(var(--spacing-1) * 180)' : '100%', maxWidth: '100%',
  }
  if (layout === 'mobile') {
    return (
      <header data-block="FloatingHeader" data-layout="mobile" style={{ ...bar, ...style }}>
        <Brand size="sm" /><span style={spacer} /><AccountMenu /><MenuTrigger />
      </header>
    )
  }
  const navNode = nav === 'links' ? <FloatingNavLinks /> : nav === 'icons' ? <FloatingIconNav /> : nav
  return (
    <header data-block="FloatingHeader" data-layout="desktop" style={{ ...bar, ...style }}>
      <Brand size="sm" />
      <span style={spacer} />
      <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-tight') }}>{navNode}</nav>
      <span style={spacer} />
      <div data-part="actions" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
        {notificationsVisible && <Notifications />}
        {searchButtonVisible && <SearchTrigger />}
        <AccountMenu />
      </div>
    </header>
  )
}

/** Figma `SidebarStatCard` (1064:3): label + delta Badge + close, the headline value, a caption and a full-width
 *  secondary action, on Surface/layer-2 with Border/default, Radius/container and Shadow/sm. */
export function SidebarStatCard({ label = 'Net worth', value = '48,210.84', caption = 'Across 4 chains · 12 assets', delta = '+5.8%', deltaVisible = true, closeVisible = true, actionVisible = true, onClose, style }: { label?: string; value?: string; caption?: string; delta?: string; deltaVisible?: boolean; closeVisible?: boolean; actionVisible?: boolean; onClose?: () => void; style?: React.CSSProperties }) {
  return (
    <section data-block="SidebarStatCard" aria-label={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: v('spacing.gap-control'), padding: v('spacing.inset-control'), background: v('color.surface.layer-2'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'), boxShadow: liftShadow('card-sm'), boxSizing: 'border-box', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-tight') }}>
        <span style={{ ...type('label'), color: v('color.content.primary') }}>{label}</span>
        {deltaVisible && <Badge size="xs" shape="pill" appearance="soft" variant="success">{delta}</Badge>}
        <span style={spacer} />
        {closeVisible && <CloseButton appearance="ghost" shape="pill" size="xs" aria-label="Dismiss" onClick={onClose} />}
      </div>
      <span style={{ ...type('heading-lg'), color: v('color.content.primary') }}>{value}</span>
      <span style={{ ...type('caption'), color: v('color.content.secondary') }}>{caption}</span>
      {actionVisible && <Button size="sm" variant="secondary" appearance="solid" leading={ic('chart-bar')} style={{ width: '100%' }}>View report</Button>}
    </section>
  )
}

type IconName = Parameters<typeof boxedGlyph>[0]
const RAIL: { label: string; icon: IconName }[] = [
  { label: 'Wallet', icon: 'wallet' }, { label: 'Markets', icon: 'chart-line-up' }, { label: 'Assets', icon: 'cube' },
  { label: 'Alerts', icon: 'bell' }, { label: 'Security', icon: 'shield-check' }, { label: 'Transfers', icon: 'arrows-down-up' }, { label: 'Add', icon: 'plus' },
]
const EARN: { label: string; icon: IconName }[] = [{ label: 'Lending market', icon: 'bank' }, { label: 'Staking', icon: 'hand-coins' }, { label: 'Swap', icon: 'swap' }]
const WATCHLIST: { label: string; icon: IconName; price: string; trend: 'up' | 'down' | 'flat'; change: string }[] = [
  { label: 'Bitcoin', icon: 'currency-btc', price: '$58,581.62', trend: 'up', change: '+2.4%' },
  { label: 'Ethereum', icon: 'currency-eth', price: '$1,571.70', trend: 'down', change: '-1.2%' },
  { label: 'Polygon', icon: 'hexagon', price: '$0.1228', trend: 'up', change: '+6.1%' },
  { label: 'XRP', icon: 'drop', price: '$1.03', trend: 'flat', change: '0.0%' },
  { label: 'BNB', icon: 'diamond', price: '$541.62', trend: 'down', change: '-3.5%' },
]

/** Figma `DualSidebar` (1064:49): the 48 px icon rail (Sidebar Collapsed) beside the 272 px panel (Sidebar): Nexus
 *  brand, the Earn and Watchlist groups, a SidebarStatCard in the Footer. PanelVisible=false is the collapsed state. */
export function DualSidebar({ railVisible = true, panelVisible = true, current = 'Swap', style }: { railVisible?: boolean; panelVisible?: boolean; current?: string; style?: React.CSSProperties }) {
  return (
    <div data-block="DualSidebar" style={{ display: 'flex', alignItems: 'stretch', height: '100%', minHeight: 'calc(var(--spacing-1) * 180)', ...style }}>
      {railVisible && (
        <Sidebar collapsed aria-label="Sections">
          <SidebarContent>
            <SidebarGroup><SidebarGroupContent><SidebarMenu>{RAIL.map((i, n) => <SidebarMenuItem key={i.label}><SidebarMenuButton aria-label={i.label} state={n === 0 ? 'Current' : undefined} icon={ic(i.icon)}>{i.label}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>
          </SidebarContent>
          <SidebarFooter><Avatar size="sm" shape="rounded" type="initials" variant="info" appearance="solid" aria-label="Account">CK</Avatar></SidebarFooter>
        </Sidebar>
      )}
      {panelVisible && (
        <Sidebar aria-label="Navigation" id="dual-sidebar-panel" style={{ width: 'calc(var(--spacing-1) * 68)' }}>
          <SidebarHeader><SidebarBrand title="Nexus" subtitle="DeFi Hub" logo={<Avatar size="sm" shape="rounded" type="icon" variant="success" appearance="solid" icon={glyph('hexagon')} />} /></SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Earn</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu>{EARN.map((i) => <SidebarMenuItem key={i.label}><SidebarMenuButton state={i.label === current ? 'Current' : undefined} icon={ic(i.icon)} iconTrailing={ic('caret-right')}>{i.label}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Watchlist</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu>{WATCHLIST.map((i) => <SidebarMenuItem key={i.label}><SidebarMenuButton state={i.label === current ? 'Current' : undefined} icon={ic(i.icon)} trailing={i.price} trend={i.trend} trendLabel={i.change}>{i.label}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter><SidebarStatCard style={{ width: '100%' }} /></SidebarFooter>
        </Sidebar>
      )}
    </div>
  )
}

export const NAVIGATION_BLOCKS = { AnnouncementBar, UtilityBar, AppHeader, AppHeaderExtended, FloatingHeader, SidebarStatCard, DualSidebar } as const
