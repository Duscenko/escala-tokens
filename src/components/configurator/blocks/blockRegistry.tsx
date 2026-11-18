// The platform's Blocks: the Figma file's composed blocks (Auth · Marketing ·
// Navigation · Overlay), the same 40 the Storybook documents under `Blocks/`.
//
// Nothing is re-drawn here. Each entry renders the real block from
// `escala-ui/blocks` with the controls its story exposes (same names, same
// options, same defaults), and its page reads the block's contract
// (`*.contract.json`: what it nests, accessibility, motion). A test holds the
// list equal to the Storybook's block stories, so a block added there fails
// here until it is listed.

import type { ReactNode } from 'react'
import {
  AuthAccountLocked, AuthCheckEmail, AuthError, AuthForgotPassword, AuthMagicLinkSent, AuthNewPassword,
  AuthOTPVerification, AuthSignIn, AuthSignInPasskey, AuthSignInPhone, AuthSplit, AuthSignUp, AuthSocialSignIn, AuthTwoFactor,
  AUTH_CONTAINERS, AUTH_LAYOUTS, AUTH_STATUSES, authPlacement, type AuthLayout, type AuthPlacement, type AuthContainer, type AuthStatus,
} from '../../escala-ui/blocks/auth'
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
import authContract from '../../escala-ui/blocks/auth.contract.json'
import marketingContract from '../../escala-ui/blocks/marketing.contract.json'
import navigationContract from '../../escala-ui/blocks/navigation.contract.json'
import overlayContract from '../../escala-ui/blocks/overlay.contract.json'

export const BLOCK_GROUPS = ['Auth', 'Marketing', 'Navigation', 'Overlay'] as const
export type BlockGroup = typeof BLOCK_GROUPS[number]

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
  /** A complementary piece of another block (`<Group>/<Name>`): shown on that block's page, not listed on its own. */
  partOf?: string
  /** Overlay blocks: the real dialog (scrim, focus trap, Escape). */
  dialog?: (p: Required<Pick<OverlayBlockProps, 'open' | 'onOpenChange'>>) => ReactNode
  contract: BlockContract | null
}

const CONTRACTS = new Map<string, BlockContract>(
  [authContract, marketingContract, navigationContract, overlayContract]
    .flatMap((c) => c.blocks as unknown as BlockContract[])
    .map((b) => [b.name, b]),
)

const containerCtl: BlockControl = { key: 'container', label: 'Container', options: AUTH_CONTAINERS, default: 'card' }
const layoutCtl: BlockControl = { key: 'layout', label: 'Layout', options: AUTH_LAYOUTS, default: 'stacked' }
const statusCtl: BlockControl = { key: 'status', label: 'Status', options: AUTH_STATUSES, default: 'idle' }
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
  { group: 'Auth', name: 'SignInPasskey', description: 'Email-first sign-in with a passkey and social providers, in a tray modal.', wide: false, controls: [], render: () => <AuthSignInPasskey />, contractName: 'AuthSignInPasskey' },
  { group: 'Auth', name: 'Split', description: 'A brand panel beside any Auth block, for a full sign-in page.', wide: true, controls: [], render: () => <AuthSplit><AuthSignIn container="plain" /></AuthSplit>, contractName: 'AuthSplit' },
  auth('SignInPhone', 'Sign-in with a phone number and its country code.', AuthSignInPhone),
  auth('SignUp', 'Creates an account: name, email, password and the terms.', AuthSignUp),
  auth('SocialSignIn', 'Sign-in with social providers only.', AuthSocialSignIn, false),
  auth('TwoFactor', 'Asks for the code from an authenticator app.', AuthTwoFactor),
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
  { group: 'Navigation', name: 'UtilityBar', description: 'A thin bar above the header: language and social links.', wide: true, controls: [], render: (v) => <UtilityBar socialVisible={v.layout !== 'mobile'} /> },
  // ── Overlay ──
  overlay('CartDrawer', 'The cart in a side sheet: items, quantities, total and checkout.', CartDrawer),
  overlay('ConfirmDialog', 'Asks the person to confirm an action before it runs.', ConfirmDialog),
  overlay('CookieConsent', 'Asks for consent to cookies, with a way to choose which.', CookieConsent),
  overlay('DestructiveConfirm', 'Confirms an action that cannot be undone, such as deleting.', DestructiveConfirm),
  overlay('ErrorModal', 'Says something went wrong and offers a way out.', ErrorModal),
  overlay('FeedbackRating', 'Asks for a rating and a comment.', FeedbackRating),
  overlay('FilterDrawer', 'Filters in a side sheet, applied together.', FilterDrawer),
  overlay('FilterModal', 'Filters in a dialog, applied together.', FilterModal),
  overlay('FormModal', 'A short form in a dialog.', FormModal),
  overlay('QuickEditDialog', 'Edits a few fields of an item without leaving the page.', QuickEditDialog),
  overlay('ReleaseModal', 'Announces what is new in a release.', ReleaseModal),
  overlay('SessionTimeoutWarning', 'Warns that the session is about to end, with a way to stay signed in.', SessionTimeoutWarning),
  overlay('ShareModal', 'Shares an item: a link to copy and people to invite.', ShareModal),
  overlay('SuccessModal', 'Confirms an action went through.', SuccessModal),
  overlay('WarningDialog', 'Warns about a risk before the person goes on.', WarningDialog),
]

export const BLOCKS: BlockDef[] = DEFS.map(({ contractName, ...d }) => ({
  ...d,
  id: `${d.group}/${d.name}`,
  contract: CONTRACTS.get(contractName ?? d.name) ?? null,
}))

/** What the catalogue lists: a complementary piece lives on its parent's page. */
export const LISTED_BLOCKS = BLOCKS.filter((b) => !b.partOf)

/** A link to a complementary piece opens the block it belongs to. */
export const BLOCK_BY_ID = new Map(BLOCKS.map((b) => [b.id, b]))
export function resolveBlock(id: string | undefined): BlockDef | null {
  const block = id ? BLOCK_BY_ID.get(id) : undefined
  if (!block) return null
  return block.partOf ? BLOCK_BY_ID.get(block.partOf) ?? block : block
}

export function blocksIn(group: BlockGroup): BlockDef[] {
  return LISTED_BLOCKS.filter((b) => b.group === group)
}

/** The complementary pieces shown on a block's page. */
export function partsOf(block: BlockDef): BlockDef[] {
  return BLOCKS.filter((b) => b.partOf === block.id)
}

export function blockDefaults(b: BlockDef): Record<string, string> {
  return Object.fromEntries(b.controls.map((c) => [c.key, c.default]))
}

/** Search matches the block's name, its group and its description. */
export function matchesBlock(b: BlockDef, q: string): boolean {
  const s = q.trim().toLowerCase()
  return !s || [b.name, b.group, b.description].some((x) => x.toLowerCase().includes(s))
}
