// Escala blocks · HeaderNavigation and SidebarNavigation. The Figma pages `HeaderNavigation` (1059:2) and `SidebarNavigation`
// (1064:2): AnnouncementBar, UtilityBar, AppHeader, AppHeaderExtended, FloatingHeader, SidebarStatCard, DualSidebar. Composed of
// escala-ui components and role tokens (CSS variables) only. `Layout=desktop · mobile` is a VIEWPORT switch of the same
// anatomy (the nav collapses to a menu button on mobile): it is never animated.
//
// Motion (contract in navigation.contract.json): persistent chrome has none on load; the DualSidebar's rail ↔ panel and
// the mobile menu are the Sidebar's / Sheet's own motion (a block never retimes its parts).
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
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
import { boxedGlyph } from './shared'

export const NAV_LAYOUTS = ['desktop', 'mobile'] as const
export type NavLayout = (typeof NAV_LAYOUTS)[number]

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = (role: string): React.CSSProperties => ({
  fontFamily: `var(--text-${role}-font-family)`, fontSize: `var(--text-${role}-font-size)`, lineHeight: `var(--text-${role}-line-height)`,
  fontWeight: `var(--text-${role}-font-weight)`, letterSpacing: `var(--text-${role}-letter-spacing)`,
})
const spacer: React.CSSProperties = { flex: 1 }
const NAV = ['Product', 'Solutions', 'Pricing', 'Blog', 'Contact']

/** The account menu a header's avatar opens: the system's DropdownMenu on the AccountMenuTrigger (label, rows, a destructive one).
 *  Open and close are the DropdownMenu's own motion (disclosure roles); the block adds none. */
function AccountMenu({ name = 'Ayla' }: { name?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><AccountMenuTrigger size="sm" name={name} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuItem iconLeading={boxedGlyph('user')}>Profile</DropdownMenuItem>
        <DropdownMenuItem iconLeading={boxedGlyph('file')}>Billing</DropdownMenuItem>
        <DropdownMenuItem iconLeading={boxedGlyph('gear')}>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" iconLeading={boxedGlyph('sign-out')}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface Common { layout?: NavLayout; className?: string; style?: React.CSSProperties }

/** Figma `AnnouncementBar`: an accent strip with a badge, a glyph, one sentence and a close. */
export function AnnouncementBar({ badgeVisible = true, iconVisible = true, closeVisible = true, message = 'This message may require attention before proceeding.', onClose, style }: { badgeVisible?: boolean; iconVisible?: boolean; closeVisible?: boolean; message?: string; onClose?: () => void; style?: React.CSSProperties }) {
  return (
    <div data-block="AnnouncementBar" role="region" aria-label="Announcement" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control'), padding: `${v('spacing.gap-control')} ${v('spacing.inset-page')}`, background: v('color.surface.accent'), color: v('color.content.accent'), ...type('body-sm'), ...style }}>
      {badgeVisible && <Badge size="sm" appearance="outline">Workspace</Badge>}
      {iconVisible && boxedGlyph('lightning')}
      <span style={{ flex: 1 }}>{message}</span>
      {closeVisible && <CloseButton appearance="ghost" shape="pill" size="sm" aria-label="Dismiss announcement" onClick={onClose} />}
    </div>
  )
}

/** Figma `UtilityBar`: secondary links, social icons and the language. */
export function UtilityBar({ languageVisible = true, socialVisible = true, style }: { languageVisible?: boolean; socialVisible?: boolean; style?: React.CSSProperties }) {
  return (
    <div data-block="UtilityBar" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-group'), padding: `${v('spacing.gap-tight')} ${v('spacing.inset-page')}`, background: v('color.surface.page'), ...style }}>
      <nav aria-label="Utility" style={{ display: 'flex', gap: v('spacing.gap-group') }}>
        {['Docs', 'Changelog', 'Status'].map((l) => <TextLink key={l} href="#" size="xs" variant="secondary" underline={false}>{l}</TextLink>)}
      </nav>
      <span style={spacer} />
      {socialVisible && <div style={{ display: 'flex', gap: v('spacing.gap-tight') }}>{['X', 'GitHub', 'Slack', 'LinkedIn'].map((n) => <IconButton key={n} size="xs" variant="secondary" appearance="ghost" aria-label={n} icon={boxedGlyph('dot', 'icon.small')} />)}</div>}
      {languageVisible && <Button size="xs" variant="secondary" appearance="ghost" leading={boxedGlyph('swap', 'icon.small')} trailing={boxedGlyph('chevron-down', 'icon.small')}>EN</Button>}
    </div>
  )
}

interface HeaderProps extends Common {
  themeToggleVisible?: boolean; messagesVisible?: boolean; notificationsVisible?: boolean; searchVisible?: boolean; searchButtonVisible?: boolean
  /** The nav slot: NavItems (desktop). Omitted → the file's five. */
  nav?: React.ReactNode
  current?: string
}
const HEADER_BAR: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: v('spacing.gap-group'), padding: `${v('spacing.inset-control')} ${v('spacing.inset-page')}`, background: v('color.surface.page') }

/** Figma `AppHeader` (Layout desktop · mobile). */
export function AppHeader({ layout = 'desktop', themeToggleVisible = true, messagesVisible = true, notificationsVisible = true, searchVisible = true, searchButtonVisible = false, nav, current = 'Pricing', style, className }: HeaderProps) {
  if (layout === 'mobile') {
    return (
      <header data-block="AppHeader" data-layout="mobile" className={className} style={{ ...HEADER_BAR, ...style }}>
        <Brand size="sm" /><span style={spacer} />
        <AccountMenu />
        <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Open menu" icon={boxedGlyph('dots-three')} />
      </header>
    )
  }
  return (
    <header data-block="AppHeader" data-layout="desktop" className={className} style={{ ...HEADER_BAR, ...style }}>
      <Brand size="sm" />
      <Separator orientation="vertical" tone="subtle" />
      <nav aria-label="Primary" style={{ display: 'flex', gap: v('spacing.gap-tight') }}>
        {nav ?? NAV.map((l) => <NavItem key={l} href="#" size="sm" current={l === current} iconTrailing={l === 'Solutions' ? boxedGlyph('chevron-down', 'icon.small') : undefined}>{l}</NavItem>)}
      </nav>
      <span style={spacer} />
      {searchVisible && <div style={{ width: 'calc(var(--spacing-32) + var(--spacing-24))' }}><Input size="sm" type="search" placeholder="Search anything…" aria-label="Search" /></div>}
      <div data-part="actions" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
        {searchButtonVisible && <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Search" icon={boxedGlyph('search')} />}
        {messagesVisible && <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Messages" icon={boxedGlyph('file')} />}
        {notificationsVisible && <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Notifications" badge icon={boxedGlyph('info')} />}
        {themeToggleVisible && (
          <SegmentedControl size="sm" defaultValue="Light" aria-label="Theme">
            <SegmentedControlItem value="Light" label="Light" labelVisible={false} iconLeadingVisible iconLeading={boxedGlyph('sparkle', 'icon.small')} />
            <SegmentedControlItem value="Dark" label="Dark" labelVisible={false} iconLeadingVisible iconLeading={boxedGlyph('lock', 'icon.small')} />
          </SegmentedControl>
        )}
        <AccountMenu />
      </div>
    </header>
  )
}

/** Figma `AppHeaderExtended`: announcement, utility bar and header (desktop); header and breadcrumb (mobile). */
export function AppHeaderExtended({ layout = 'desktop', announcementVisible = true, utilityVisible = true, breadcrumbVisible = true, style }: Common & { announcementVisible?: boolean; utilityVisible?: boolean; breadcrumbVisible?: boolean }) {
  const crumbs = (
    <Breadcrumb size="sm" separator="slash" aria-label="Breadcrumb"><BreadcrumbList>
      <BreadcrumbItem href="#">Home</BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem href="#">Projects</BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem current>Northwind</BreadcrumbItem>
    </BreadcrumbList></Breadcrumb>
  )
  return (
    <div data-block="AppHeaderExtended" data-layout={layout} style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.none'), ...style }}>
      {layout === 'desktop' && announcementVisible && <AnnouncementBar />}
      {layout === 'desktop' && utilityVisible && <UtilityBar />}
      <AppHeader layout={layout} searchButtonVisible={layout === 'mobile'} themeToggleVisible={layout === 'desktop'} />
      {breadcrumbVisible && <div data-part="breadcrumb-bar" style={{ padding: `${v('spacing.gap-control')} ${v('spacing.inset-page')}`, background: v('color.surface.page'), borderTop: `${v('stroke.divider')} solid ${v('color.border.subtle')}` }}>{crumbs}</div>}
    </div>
  )
}

/** Figma `FloatingHeader`: a compact pill-shaped bar floating on the page. */
export function FloatingHeader({ layout = 'desktop', notificationsVisible = true, searchButtonVisible = true, current = 'Pricing', style }: Common & { notificationsVisible?: boolean; searchButtonVisible?: boolean; current?: string }) {
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: v('spacing.gap-group'), padding: `${v('spacing.inset-control')} ${v('spacing.gap-control')}`, background: v('color.surface.page'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'), width: 'fit-content', maxWidth: '100%' }
  if (layout === 'mobile') {
    return (
      <header data-block="FloatingHeader" data-layout="mobile" style={{ ...bar, ...style }}>
        <Brand size="sm" /><span style={spacer} /><AccountMenu />
        <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Open menu" icon={boxedGlyph('dots-three')} />
      </header>
    )
  }
  return (
    <header data-block="FloatingHeader" data-layout="desktop" style={{ ...bar, ...style }}>
      <Brand size="sm" /><span style={spacer} />
      <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-tight') }}>
        {['Product', 'Solutions', 'Pricing'].map((l) => <NavItem key={l} href="#" size="sm" current={l === current} iconTrailing={l === 'Solutions' ? boxedGlyph('chevron-down', 'icon.small') : undefined}>{l}</NavItem>)}
        {searchButtonVisible && <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Search" icon={boxedGlyph('search')} />}
      </nav>
      <span style={spacer} />
      <div style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
        {notificationsVisible && <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Notifications" badge icon={boxedGlyph('info')} />}
        <IconButton size="sm" variant="secondary" appearance="ghost" aria-label="Messages" icon={boxedGlyph('file')} />
        <AccountMenu />
      </div>
    </header>
  )
}

/** Figma `SidebarStatCard`: a figure with its delta, a caption and an action, on a raised card. */
export function SidebarStatCard({ label = 'Net worth', value = '48,210.84', caption = 'Across 4 chains · 12 assets', delta = '+5.8%', deltaVisible = true, closeVisible = true, actionVisible = true, onClose, style }: { label?: string; value?: string; caption?: string; delta?: string; deltaVisible?: boolean; closeVisible?: boolean; actionVisible?: boolean; onClose?: () => void; style?: React.CSSProperties }) {
  return (
    <section data-block="SidebarStatCard" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control'), padding: v('spacing.inset-control'), background: v('color.surface.layer-2'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'), ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-tight') }}>
        <span style={{ ...type('label'), color: v('color.content.secondary') }}>{label}</span>
        {deltaVisible && <Badge size="xs" shape="pill" variant="success">{delta}</Badge>}
        <span style={spacer} />
        {closeVisible && <CloseButton appearance="ghost" shape="pill" size="xs" aria-label="Dismiss" onClick={onClose} />}
      </div>
      <span style={{ ...type('heading-md') }}>{value}</span>
      <span style={{ ...type('caption'), color: v('color.content.secondary') }}>{caption}</span>
      {actionVisible && <Button size="sm" variant="secondary" leading={boxedGlyph('file', 'icon.small')}>View report</Button>}
    </section>
  )
}

const GROUPS: { label: string; items: { label: string; icon: Parameters<typeof boxedGlyph>[0]; current?: boolean }[] }[] = [
  { label: 'Overview', items: [{ label: 'Dashboard', icon: 'house', current: true }, { label: 'Portfolio', icon: 'stack' }, { label: 'Activity', icon: 'lightning' }] },
  { label: 'Account', items: [{ label: 'Team', icon: 'user' }, { label: 'Settings', icon: 'lock' }] },
]

/** Figma `DualSidebar`: the 48 px icon rail beside the 272 px panel (brand, groups, stat card). */
export function DualSidebar({ railVisible = true, panelVisible = true, style }: { railVisible?: boolean; panelVisible?: boolean; style?: React.CSSProperties }) {
  return (
    <div data-block="DualSidebar" style={{ display: 'flex', alignItems: 'stretch', minHeight: 'calc(var(--spacing-32) * 5 + var(--spacing-24) + var(--spacing-8))', ...style }}>
      {railVisible && (
        <Sidebar collapsed aria-label="Rail">
          <SidebarContent>
            <SidebarGroup><SidebarGroupContent><SidebarMenu>{GROUPS.flatMap((g) => g.items).map((i) => <SidebarMenuItem key={i.label}><SidebarMenuButton aria-label={i.label} state={i.current ? 'Current' : undefined} icon={boxedGlyph(i.icon)} /></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>
          </SidebarContent>
          <SidebarFooter><Avatar size="sm" shape="rounded" type="initials" variant="info" appearance="solid">AK</Avatar></SidebarFooter>
        </Sidebar>
      )}
      {panelVisible && (
        <Sidebar aria-label="Navigation">
          <SidebarHeader><SidebarBrand title="Nexus" subtitle="DeFi Hub" logo={<Avatar size="sm" shape="rounded" type="initials" variant="default" appearance="solid">N</Avatar>} /></SidebarHeader>
          <SidebarContent>
            {GROUPS.map((g) => (
              <SidebarGroup key={g.label}>
                <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
                <SidebarGroupContent><SidebarMenu>{g.items.map((i) => <SidebarMenuItem key={i.label}><SidebarMenuButton state={i.current ? 'Current' : undefined} icon={boxedGlyph(i.icon)}>{i.label}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter><SidebarStatCard /></SidebarFooter>
        </Sidebar>
      )}
    </div>
  )
}

export const NAVIGATION_BLOCKS = { AnnouncementBar, UtilityBar, AppHeader, AppHeaderExtended, FloatingHeader, SidebarStatCard, DualSidebar } as const
