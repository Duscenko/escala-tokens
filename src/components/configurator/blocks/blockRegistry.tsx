// The platform's Blocks: the Figma file's composed blocks (Auth · Marketing ·
// Navigation · Overlay), the same ones the Storybook documents under `Blocks/`.
//
// Nothing is re-drawn here. Each entry renders the real block from
// `escala-ui/blocks` with the controls its story exposes (same names, same
// options, same defaults), and its page reads the block's contract
// (`*.contract.json`: what it nests, accessibility, motion). A test holds the
// list equal to the Storybook's block stories, so a block added there fails
// here until it is listed.
//
// The Screens tab reads the same shape: a screen (SettingsPage, IssueBoardPage)
// is a BlockDef of group `Screens`, and the pieces it is made of (SettingsRow,
// IssueCard…) are its parts (`partOf`), shown on its page and never listed on
// their own. Screens are kept apart from `BLOCKS`, which mirrors `Blocks/`.

import type { ReactNode } from 'react'
import {
  AuthAccountLocked, AuthCheckEmail, AuthError, AuthForgotPassword, AuthMagicLinkSent, AuthNewPassword,
  AuthOTPVerification, AuthSignIn, AuthSignInPasskey, AuthSignInPhone, AuthSplit, AuthSignUp, AuthSocialSignIn, AuthTwoFactor,
  AUTH_CONTAINERS, AUTH_LAYOUTS, AUTH_STATUSES, authPlacement, type AuthLayout, type AuthPlacement, type AuthContainer, type AuthStatus,
} from '../../escala-ui/blocks/auth'
import {
  AuthPasskeySetup, AuthTwoFactorSetup, AUTH_PASSKEY_SETUP_TYPES, AUTH_SETUP_STATUSES, AUTH_TWO_FACTOR_SETUP_TYPES,
  type AuthPasskeySetupType, type AuthSetupStatus, type AuthTwoFactorSetupType,
} from '../../escala-ui/blocks/authSetup'
import { AuthPasskeySetupDemo, AuthTwoFactorSetupDemo } from '../../escala-ui/blocks/authSetupDemo'
import {
  HeroHeader, FAQSection, PricingCard, PricingSection, ContactSection, Footer,
  FAQ_STYLES, type MarketingLayout, type FaqStyle,
} from '../../escala-ui/blocks/marketing'
import {
  AnnouncementBar, UtilityBar, AppHeader, AppHeaderExtended, FloatingHeader, SidebarStatCard, DualSidebar,
  FLOATING_NAVS, type FloatingNav, type NavLayout,
} from '../../escala-ui/blocks/navigation'
import { HeaderMockup, SidebarMockup } from '../../escala-ui/blocks/navigationShowcase'
import {
  ConfirmDialog, DestructiveConfirm, FormModal, SuccessModal, ErrorModal, FeedbackRating, WarningDialog, ShareModal,
  SessionTimeoutWarning, CartDrawer, QuickEditDialog, FilterDrawer, FilterModal, ReleaseModal, CookieConsent,
  type OverlayBlockProps,
} from '../../escala-ui/blocks/overlay'
import { MorphNav, UserMenu, MORPH_NAV_CONTENTS, type MorphNavContent } from '../../escala-ui/blocks/siteNavigation'
import { ScreenPrototype } from '../../escala-ui/screens/prototype'
import { IssueBoardPage, SettingsPage } from '../../escala-ui/screens/screens'
import { SCREEN_ROUTES } from '../../escala-ui/screens/sitemap'
import { SettingsRow } from '../../escala-ui/settings-row'
import { SettingsSection } from '../../escala-ui/settings-section'
import { BoardColumn } from '../../escala-ui/board-column'
import { IssueCard } from '../../escala-ui/issue-card'
import { Badge } from '../../escala-ui/badge'
import { Switch } from '../../escala-ui/switch'
import authContract from '../../escala-ui/blocks/auth.contract.json'
import authSetupContract from '../../escala-ui/blocks/authSetup.contract.json'
import marketingContract from '../../escala-ui/blocks/marketing.contract.json'
import navigationContract from '../../escala-ui/blocks/navigation.contract.json'
import overlayContract from '../../escala-ui/blocks/overlay.contract.json'
import siteNavigationContract from '../../escala-ui/blocks/siteNavigation.contract.json'
import screensContract from '../../escala-ui/screens/screens.contract.json'

export const BLOCK_GROUPS = ['Auth', 'Marketing', 'Navigation', 'Overlay'] as const
/** The Screens tab's one group: whole screens, each holding its own pieces. */
export const SCREEN_GROUPS = ['Screens'] as const
export type BlockGroup = typeof BLOCK_GROUPS[number] | typeof SCREEN_GROUPS[number]
/** Which catalogue tab a BlockDef belongs to: Blocks or Screens. */
export type BlockCatalogue = 'blocks' | 'screens'

export interface BlockControl {
  /** The story arg. */
  key: string
  /** The Figma property name the story shows. */
  label: string
  options: readonly string[]
  default: string
}

export interface BlockContract {
  name: string
  variants: number
  nests: string[]
  anatomy?: string[]
  a11y: string[]
  motion: { moment: string; mechanism: string; role: string; reduced: string }[]
}

export interface BlockDef {
  /** `<group>/<name>` — the Storybook title without `Blocks/`. */
  id: string
  group: BlockGroup
  /** The Figma set's name as Storybook shows it ("SignIn", "HeroHeader"). */
  name: string
  description: string
  controls: BlockControl[]
  /** A page section (header, footer, hero): drawn full width, not centred. */
  wide: boolean
  /** Renders the block at these control values, in place. */
  render: (v: Record<string, string>) => ReactNode
  /** Navigation blocks: the block inside its Figma prototype frame — the 1440 desktop window, or the phone when the
   *  stage's viewport is Mobile (the viewport is the Layout, so these blocks have no Layout control). */
  mockup?: (v: Record<string, string>, layout: NavLayout) => ReactNode
  /** The block's Layout follows the stage's frame (Mobile and Tablet draw `mobile`), so it has no Layout control of its
   *  own: two switches for one question disagreed on screen. */
  responsive?: boolean
  /** Wide on a desktop, but a phone draws only its plain content: that content keeps the page's inset there. */
  phoneInset?: boolean
  /** A complementary piece of another block (`<Group>/<Name>`): shown on that block's page, not listed on its own. */
  partOf?: string
  /** Overlay blocks: the real dialog (scrim, focus trap, Escape). */
  dialog?: (p: Required<Pick<OverlayBlockProps, 'open' | 'onOpenChange'>>) => ReactNode
  contract: BlockContract | null
}

const CONTRACTS = new Map<string, BlockContract>(
  [authContract, authSetupContract, marketingContract, navigationContract, overlayContract, siteNavigationContract, screensContract]
    .flatMap((c) => c.blocks as unknown as BlockContract[])
    .map((b) => [b.name, b]),
)

const containerCtl: BlockControl = { key: 'container', label: 'Container', options: AUTH_CONTAINERS, default: 'card' }
const layoutCtl: BlockControl = { key: 'layout', label: 'Layout', options: AUTH_LAYOUTS, default: 'stacked' }
const statusCtl: BlockControl = { key: 'status', label: 'Status', options: AUTH_STATUSES, default: 'idle' }
const setupStatusCtl: BlockControl = { key: 'status', label: 'Status', options: AUTH_SETUP_STATUSES, default: 'active' }
const floatingNav: BlockControl = { key: 'nav', label: 'Nav', options: FLOATING_NAVS, default: 'links' }
const panelVisible: BlockControl = { key: 'panelVisible', label: 'PanelVisible', options: ['true', 'false'], default: 'true' }

type Def = Omit<BlockDef, 'id' | 'contract'> & { contractName?: string }

function auth(name: string, description: string, Block: (p: AuthPlacement & { status?: AuthStatus }) => ReactNode, withStatus = true): Def {
  return {
    group: 'Auth', name, description, wide: false,
    controls: withStatus ? [containerCtl, layoutCtl, statusCtl] : [containerCtl, layoutCtl],
    render: (v) => <Block {...authPlacement(v.container as AuthContainer, v.layout as AuthLayout)} {...(withStatus ? { status: v.status as AuthStatus } : {})} />,
    contractName: `Auth${name}`,
  }
}

function overlay(name: string, description: string, Block: (p: OverlayBlockProps) => ReactNode): Def {
  return {
    group: 'Overlay', name, description, wide: false, controls: [],
    render: () => <Block inline />,
    dialog: ({ open, onOpenChange }) => <Block inline={false} open={open} onOpenChange={onOpenChange} onConfirm={() => onOpenChange(false)} />,
  }
}

const DEFS: Def[] = [
  // ── Auth ──
  auth('AccountLocked', 'Tells the person their account is locked after too many attempts and how to get back in.', AuthAccountLocked, false),
  auth('CheckEmail', 'Confirms a link was sent and asks the person to check their inbox.', AuthCheckEmail, false),
  auth('Error', 'A sign-in error screen with a way to try again.', AuthError, false),
  {
    ...auth('ForgotPassword', 'Asks for an email or a phone number to send a reset link or code.', AuthForgotPassword),
    controls: [containerCtl, layoutCtl, statusCtl, { key: 'method', label: 'Method', options: ['email', 'sms'], default: 'email' }],
    render: (v) => <AuthForgotPassword key={v.method} {...authPlacement(v.container as AuthContainer, v.layout as AuthLayout)} status={v.status as AuthStatus} defaultMethod={v.method as 'email' | 'sms'} />,
  },
  auth('MagicLinkSent', 'Confirms a magic sign-in link was sent, with a way to resend it.', AuthMagicLinkSent, false),
  auth('NewPassword', 'Sets a new password, with the strength rules shown as the person types.', AuthNewPassword),
  auth('OTPVerification', 'Asks for the one-time code sent by email or SMS.', AuthOTPVerification),
  auth('SignIn', 'Email and password sign-in, with social sign-in and a link to sign up.', AuthSignIn),
  {
    group: 'Auth', name: 'PasskeySetup', description: 'Passkey enrolment in three steps: why, the device prompt, and naming the new passkey.', wide: false,
    controls: [{ key: 'type', label: 'Type', options: AUTH_PASSKEY_SETUP_TYPES, default: 'intro' }, setupStatusCtl],
    render: (v) => <AuthPasskeySetup inline type={v.type as AuthPasskeySetupType} status={v.status as AuthSetupStatus} />,
    dialog: ({ open, onOpenChange }) => <AuthPasskeySetupDemo inline={false} open={open} onOpenChange={onOpenChange} />,
    contractName: 'AuthPasskeySetup',
  },
  { group: 'Auth', name: 'SignInPasskey', description: 'Email-first sign-in with a passkey and social providers, in a tray modal.', wide: false, controls: [], render: () => <AuthSignInPasskey />, contractName: 'AuthSignInPasskey' },
  { group: 'Auth', name: 'Split', description: 'A brand panel beside any Auth block, for a full sign-in page.', wide: true, phoneInset: true, controls: [], render: () => <AuthSplit><AuthSignIn container="plain" /></AuthSplit>, contractName: 'AuthSplit' },
  auth('SignInPhone', 'Sign-in with a phone number and its country code.', AuthSignInPhone),
  auth('SignUp', 'Creates an account: name, email, password and the terms.', AuthSignUp),
  auth('SocialSignIn', 'Sign-in with social providers only.', AuthSocialSignIn, false),
  auth('TwoFactor', 'Asks for the code from an authenticator app.', AuthTwoFactor),
  {
    group: 'Auth', name: 'TwoFactorSetup', description: 'Authenticator-app enrolment in three steps: scan the QR, verify one code, keep the backup codes.', wide: false,
    controls: [{ key: 'type', label: 'Type', options: AUTH_TWO_FACTOR_SETUP_TYPES, default: 'scan' }, setupStatusCtl],
    render: (v) => <AuthTwoFactorSetup key={`${v.type}-${v.status}`} inline type={v.type as AuthTwoFactorSetupType} status={v.status as AuthSetupStatus} defaultCode={v.type !== 'verify' || v.status === 'active' ? '' : v.status === 'error' ? '318205' : '440912'} />,
    dialog: ({ open, onOpenChange }) => <AuthTwoFactorSetupDemo inline={false} open={open} onOpenChange={onOpenChange} />,
    contractName: 'AuthTwoFactorSetup',
  },
  // ── Marketing ──
  { group: 'Marketing', name: 'ContactSection', description: 'A contact form beside an image, with the services to choose from.', wide: true, responsive: true, controls: [], render: (v) => <ContactSection layout={v.layout as MarketingLayout} /> },
  { group: 'Marketing', name: 'FAQSection', description: 'Frequently asked questions as an accordion, split or centred.', wide: true, responsive: true, controls: [{ key: 'faqStyle', label: 'Style', options: FAQ_STYLES, default: 'split' }], render: (v) => <FAQSection layout={v.layout as MarketingLayout} faqStyle={v.faqStyle as FaqStyle} /> },
  { group: 'Marketing', name: 'Footer', description: 'The site footer: brand, link columns, newsletter and the legal line.', wide: true, responsive: true, controls: [], render: (v) => <Footer layout={v.layout as MarketingLayout} /> },
  { group: 'Marketing', name: 'HeroHeader', description: 'The page opener: badge, headline, supporting copy, an email form and media.', wide: true, responsive: true, controls: [], render: (v) => <HeroHeader layout={v.layout as MarketingLayout} /> },
  { group: 'Marketing', name: 'PricingCard', description: 'One plan: name, price, billing, features and its call to action.', wide: false, partOf: 'Marketing/PricingSection', controls: [], render: () => <PricingCard /> },
  { group: 'Marketing', name: 'PricingSection', description: 'The pricing page section: heading and the plans side by side.', wide: true, responsive: true, controls: [], render: (v) => <PricingSection layout={v.layout as MarketingLayout} /> },
  // ── Navigation ──
  { group: 'Navigation', name: 'AnnouncementBar', description: 'A one-line message across the top of the page, dismissible.', wide: true, controls: [], render: () => <AnnouncementBar /> },
  { group: 'Navigation', name: 'AppHeader', description: 'The product header: brand, navigation, search and account.', wide: true, controls: [], render: (v) => <AppHeader layout={v.layout as NavLayout} />, mockup: (_v, layout) => <HeaderMockup block="AppHeader" layout={layout} /> },
  { group: 'Navigation', name: 'AppHeaderExtended', description: 'The product header with an announcement bar, a utility bar and breadcrumbs.', wide: true, controls: [], render: (v) => <AppHeaderExtended layout={v.layout as NavLayout} />, mockup: (_v, layout) => <HeaderMockup block="AppHeaderExtended" layout={layout} /> },
  { group: 'Navigation', name: 'DualSidebar', description: 'An icon rail beside a panel of grouped links.', wide: true, controls: [panelVisible], render: (v) => <DualSidebar panelVisible={v.panelVisible !== 'false'} />, mockup: (v, layout) => <SidebarMockup layout={layout} expanded={v.panelVisible !== 'false'} /> },
  { group: 'Navigation', name: 'FloatingHeader', description: 'A header that floats over the page as a rounded bar.', wide: true, controls: [floatingNav], render: (v) => <FloatingHeader layout={v.layout as NavLayout} nav={v.nav as FloatingNav} />, mockup: (v, layout) => <HeaderMockup block="FloatingHeader" layout={layout} nav={v.nav as FloatingNav} /> },
  { group: 'Navigation', name: 'SidebarStatCard', description: 'A figure with its trend, for the foot of a sidebar.', wide: false, partOf: 'Navigation/DualSidebar', controls: [], render: () => <SidebarStatCard /> },
  { group: 'Navigation', name: 'MorphNav', description: 'Floating navigation that grows from the bar into the Product panel or the search palette.', wide: true, controls: [{ key: 'content', label: 'Content', options: MORPH_NAV_CONTENTS, default: 'bar' }, { key: 'compact', label: 'Compact', options: ['false', 'true'], default: 'false' }], render: (v) => <MorphNav key={v.content} defaultContent={v.content as MorphNavContent} compact={v.compact === 'true'} /> },
  { group: 'Navigation', name: 'UserMenu', description: 'The account menu: identity, profile, settings, billing, theme and sign out.', wide: false, controls: [], render: () => <UserMenu inline /> },
  { group: 'Navigation', name: 'UtilityBar', description: 'A thin bar above the header: language and social links.', wide: true, controls: [], render: (v) => <UtilityBar socialVisible={v.layout !== 'mobile'} /> },
  // ── Overlay ──
  overlay('CartDrawer', 'The cart as a tray Modal: items, quantities, subtotal, discount and checkout.', CartDrawer),
  overlay('ConfirmDialog', 'Asks the person to confirm an action before it runs.', ConfirmDialog),
  overlay('CookieConsent', 'Asks for consent to cookies, with a way to choose which.', CookieConsent),
  overlay('DestructiveConfirm', 'Confirms an action that cannot be undone, such as deleting.', DestructiveConfirm),
  overlay('ErrorModal', 'Says something went wrong and offers a way out.', ErrorModal),
  overlay('FeedbackRating', 'Asks for a rating and a comment.', FeedbackRating),
  overlay('FilterDrawer', 'Filters in a tray Modal, applied together.', FilterDrawer),
  overlay('FilterModal', 'Filters in a dialog, applied together.', FilterModal),
  overlay('FormModal', 'A short form in a dialog.', FormModal),
  overlay('QuickEditDialog', 'Edits a few fields of an item without leaving the page.', QuickEditDialog),
  overlay('ReleaseModal', 'Announces what is new in a release.', ReleaseModal),
  overlay('SessionTimeoutWarning', 'Warns that the session is about to end, with a way to stay signed in.', SessionTimeoutWarning),
  overlay('ShareModal', 'Shares an item: a link to copy and people to invite.', ShareModal),
  overlay('SuccessModal', 'Confirms an action went through.', SuccessModal),
  overlay('WarningDialog', 'Warns about a risk before the person goes on.', WarningDialog),
]

// ── Screens ── the Figma file's SettingsPage and IssueBoardPage, with the pieces each one keeps inside. Desktop and
// Mobile draw the Prototype section's frames (`mockup`); the Tablet window (the stage passes layout=mobile) draws the
// screen itself with layout=auto, so it picks its build by the breakpoint.md role, as a real browser would.
const screenPart = (screen: string, name: string, description: string, render: () => ReactNode): Def => ({
  group: 'Screens', name, description, wide: false, partOf: `Screens/${screen}`, controls: [], render,
})
const SCREEN_DEFS: Def[] = [
  { group: 'Screens', name: 'SettingsPage', description: 'Workspace settings: a sidebar of sections beside a scrolling page of SettingsSections, each a list of rows with their control.', wide: true, controls: [], render: (v) => (v.layout === 'mobile' ? <SettingsPage layout="auto" /> : <ScreenPrototype initialPath={SCREEN_ROUTES.settings} />), mockup: (_v, layout) => <ScreenPrototype layout={layout} initialPath={SCREEN_ROUTES.settings} /> },
  screenPart('SettingsPage', 'SettingsSection', 'A titled group of SettingsRow.', () => (
    <SettingsSection title="Notifications" description="What this group of settings controls.">
      <SettingsRow title="Email notifications" control={<Switch defaultChecked />} />
    </SettingsSection>
  )),
  screenPart('SettingsPage', 'SettingsRow', 'One setting: its title, an optional description and a single control.', () => (
    <SettingsRow layout="stacked" title="Setting name" description="One line that explains what this setting changes." control={<Switch defaultChecked />} />
  )),
  { group: 'Screens', name: 'IssueBoardPage', description: 'An issue board: the workspace sidebar, a header and filters, and one BoardColumn per status, each a list of IssueCards.', wide: true, controls: [], render: (v) => (v.layout === 'mobile' ? <IssueBoardPage layout="auto" /> : <ScreenPrototype initialPath={SCREEN_ROUTES.board} />), mockup: (_v, layout) => <ScreenPrototype layout={layout} initialPath={SCREEN_ROUTES.board} /> },
  screenPart('IssueBoardPage', 'BoardColumn', 'One status lane: status icon, title, count, add action and a list of IssueCard.', () => (
    <BoardColumn title="Backlog" count="1" newIssueVisible={false}>
      <IssueCard href="#" issueKey="PAY-312" title="Support split payments across two cards" tag={<Badge appearance="soft" shape="rounded" size="sm" type="default" variant="info">Payments</Badge>} />
    </BoardColumn>
  )),
  screenPart('IssueBoardPage', 'IssueCard', 'One issue on a board: key, linked pull request, assignee, title, priority, tags, comments and due date.', () => (
    <IssueCard href="#" issueKey="PAY-312" title="Support split payments across two cards" pullRequest="#2041" comments="3" due="Nov 20" tag={<Badge appearance="soft" shape="rounded" size="sm" type="default" variant="info">Payments</Badge>} />
  )),
]

const toBlock = ({ contractName, ...d }: Def): BlockDef => ({
  ...d,
  id: `${d.group}/${d.name}`,
  contract: CONTRACTS.get(contractName ?? d.name) ?? null,
})

export const BLOCKS: BlockDef[] = DEFS.map(toBlock)
/** The Screens tab: each screen and, as its parts, the pieces it is made of. */
export const SCREENS: BlockDef[] = SCREEN_DEFS.map(toBlock)

/** What the catalogue lists: a complementary piece lives on its parent's page. */
export const LISTED_BLOCKS = BLOCKS.filter((b) => !b.partOf)
export const LISTED_SCREENS = SCREENS.filter((b) => !b.partOf)

/** The groups and the listed entries of one catalogue tab. */
export function catalogue(kind: BlockCatalogue): { groups: readonly BlockGroup[]; listed: BlockDef[] } {
  return kind === 'screens' ? { groups: SCREEN_GROUPS, listed: LISTED_SCREENS } : { groups: BLOCK_GROUPS, listed: LISTED_BLOCKS }
}

export function catalogueOf(b: Pick<BlockDef, 'group'>): BlockCatalogue {
  return (SCREEN_GROUPS as readonly string[]).includes(b.group) ? 'screens' : 'blocks'
}

/** A link to a complementary piece opens the block it belongs to. */
export const BLOCK_BY_ID = new Map([...BLOCKS, ...SCREENS].map((b) => [b.id, b]))
export function resolveBlock(id: string | undefined): BlockDef | null {
  const block = id ? BLOCK_BY_ID.get(id) : undefined
  if (!block) return null
  return block.partOf ? BLOCK_BY_ID.get(block.partOf) ?? block : block
}

export function blocksIn(group: BlockGroup): BlockDef[] {
  return catalogue(catalogueOf({ group })).listed.filter((b) => b.group === group)
}

/** The complementary pieces shown on a block's page (a screen's: the pieces it is made of). */
export function partsOf(block: BlockDef): BlockDef[] {
  return [...BLOCKS, ...SCREENS].filter((b) => b.partOf === block.id)
}

/** The values a block draws with on the stage. The frame is the one switch for the viewport: Tablet and Mobile draw the block's
 *  mobile layout. A block whose own `layout` is a control (Auth: stacked · inline) keeps what the reader picked. */
export function stageBlockValues(block: Pick<BlockDef, 'controls'>, values: Record<string, string>, frame: string): Record<string, string> {
  if (block.controls.some((c) => c.key === 'layout')) return values
  return { ...values, layout: frame === 'tablet' || frame === 'mobile' ? 'mobile' : 'desktop' }
}

export function blockDefaults(b: BlockDef): Record<string, string> {
  return Object.fromEntries(b.controls.map((c) => [c.key, c.default]))
}

/** Search matches the block's name, its group and its description. */
export function matchesBlock(b: BlockDef, q: string): boolean {
  const s = q.trim().toLowerCase()
  return !s || [b.name, b.group, b.description].some((x) => x.toLowerCase().includes(s))
}
