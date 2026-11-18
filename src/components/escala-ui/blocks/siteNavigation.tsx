// The Figma blocks UserMenu (2259:589) and MorphNav (2259:594): escala-ui components and role tokens only (DEC-2026-11-18-012).
import * as React from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '../../../lib/utils'
import type { IconName } from '../../../lib/icons'
import { AccountMenuTrigger } from '../account-menu-trigger'
import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Brand } from '../brand'
import { Button } from '../button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu'
import { IconButton } from '../icon-button'
import { Image } from '../image'
import { Input } from '../input'
import { NavItem } from '../nav-item'
import { SegmentedControl, SegmentedControlItem } from '../segmented-control'
import { blockType, boxedGlyph } from './shared'

// ── UserMenu ───────────────────────────────────────────────────────────────
export const USER_MENU_THEMES = ['light', 'dark', 'system'] as const
export type UserMenuTheme = (typeof USER_MENU_THEMES)[number]
const THEME_OPTIONS: { value: UserMenuTheme; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'desktop' },
]

export interface UserMenuProps {
  name?: string
  email?: string
  plan?: string
  theme?: UserMenuTheme
  onThemeChange?: (theme: UserMenuTheme) => void
  onSignOut?: () => void
  /** Draws the open menu in place, for docs and previews. */
  inline?: boolean
}

function UserMenuRows({ name, email, plan, theme, onThemeChange, onSignOut, inline }: Required<Pick<UserMenuProps, 'name' | 'email' | 'plan'>> & UserMenuProps) {
  const header = (
    <div className="flex items-center" style={{ gap: 'var(--spacing-gap-control)', padding: 'var(--spacing-gap-control)' }}>
      <Avatar type="initials" size="default" shape="circle" variant="secondary" appearance="soft">{name.slice(0, 2).toUpperCase()}</Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center" style={{ gap: 'var(--spacing-gap-control)' }}>
          <span style={{ ...blockType('label'), color: 'var(--color-content-primary)' }}>{name}</span>
          <Badge appearance="soft" shape="rounded" size="xs" type="default" variant="default">{plan}</Badge>
        </span>
        <span style={{ ...blockType('body-sm'), color: 'var(--color-content-secondary)' }}>{email}</span>
      </div>
    </div>
  )
  return (
    <DropdownMenuContent inline={inline} align="end" header={header} style={{ width: 288 }}>
      <DropdownMenuSeparator />
      <DropdownMenuItem iconLeading={boxedGlyph('user')} trailing="⌘P">Profile</DropdownMenuItem>
      <DropdownMenuItem iconLeading={boxedGlyph('gear')} trailing="⌘,">Settings</DropdownMenuItem>
      <DropdownMenuItem iconLeading={boxedGlyph('credit-card')}>Billing</DropdownMenuItem>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-gap-tight) var(--spacing-gap-control)' }}>
        <DropdownMenuLabel className="p-0">Theme</DropdownMenuLabel>
        <SegmentedControl size="sm" value={theme} defaultValue="system" onValueChange={(v) => onThemeChange?.(v as UserMenuTheme)} aria-label="Theme">
          {THEME_OPTIONS.map((o) => <SegmentedControlItem key={o.value} value={o.value} labelVisible={false} iconLeadingVisible iconLeading={boxedGlyph(o.icon, 'icon.small')} aria-label={o.label} />)}
        </SegmentedControl>
      </div>
      <DropdownMenuSeparator />
      {/* Variant=default: `critical` is only for actions that delete (DEC-2026-11-18-012). */}
      <DropdownMenuItem iconLeading={boxedGlyph('sign-out')} trailing="⇧⌘Q" onSelect={onSignOut}>Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/** Figma `UserMenu`: opens from AccountMenuTrigger, which shows Pressed while the menu is open. */
export function UserMenu({ name = 'Inès Moreau', email = 'ines@ohmewn.app', plan = 'Pro', inline, ...rest }: UserMenuProps) {
  const [open, setOpen] = React.useState(false)
  if (inline) return <DropdownMenu><UserMenuRows name={name} email={email} plan={plan} inline {...rest} /></DropdownMenu>
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <AccountMenuTrigger name={name} forceState={open ? 'Pressed' : undefined} aria-expanded={open} />
      </DropdownMenuTrigger>
      <UserMenuRows name={name} email={email} plan={plan} {...rest} />
    </DropdownMenu>
  )
}

// ── MorphNav ───────────────────────────────────────────────────────────────
export const MORPH_NAV_CONTENTS = ['bar', 'product', 'search'] as const
export type MorphNavContent = (typeof MORPH_NAV_CONTENTS)[number]

const DESTINATIONS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'map-trifold', title: 'Planning', text: 'Quarters, cycles and milestones' },
  { icon: 'file-text', title: 'Docs', text: 'Specs that update as the work moves' },
  { icon: 'chart-bar', title: 'Insights', text: 'Lead time and throughput per team' },
  { icon: 'flow-arrow', title: 'Automations', text: 'Rules that sort, assign and nudge' },
  { icon: 'puzzle-piece', title: 'Integrations', text: 'Connect your repo, chat and 60 more tools' },
  { icon: 'shield-check', title: 'Security', text: 'Single sign-on, audit trail, data residency' },
]
const SUGGESTIONS = [
  { title: 'Planning', text: 'Quarters, cycles and milestones', group: 'Product' },
  { title: 'Automations', text: 'Rules that sort, assign and nudge', group: 'Product' },
  { title: 'Pricing', text: 'Free, Team and Enterprise plans', group: 'Company' },
  { title: 'Documentation', text: 'Guides and API reference', group: 'Resources' },
  { title: 'Changelog', text: 'What changed this week', group: 'Resources' },
]
const LINKS = ['Solutions', 'Resources', 'Pricing']
const titleText: React.CSSProperties = { ...blockType('label'), color: 'var(--color-content-primary)' }
const bodyText: React.CSSProperties = { ...blockType('body-sm'), color: 'var(--color-content-secondary)' }

export interface MorphNavProps extends Omit<React.ComponentProps<'nav'>, 'content'> {
  /** Figma Content, controlled. */
  content?: MorphNavContent
  /** Figma Content, uncontrolled (default `bar`). */
  defaultContent?: MorphNavContent
  onContentChange?: (content: MorphNavContent) => void
  /** Figma Compact: hides the Brand name. A product state, never animated. */
  compact?: boolean
}

/** Figma `MorphNav`: one container that grows from the bar into the Product panel or the search palette. */
export function MorphNav({ content, defaultContent = 'bar', onContentChange, compact = false, className, style, ...props }: MorphNavProps) {
  const [own, setOwn] = React.useState<MorphNavContent>(defaultContent)
  const current = content ?? own
  const reduced = useReducedMotion() ?? false
  const inner = React.useRef<HTMLDivElement>(null)
  const productTrigger = React.useRef<HTMLButtonElement>(null)
  const searchTrigger = React.useRef<HTMLButtonElement>(null)
  const searchInput = React.useRef<HTMLInputElement>(null)
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null)

  const go = React.useCallback((next: MorphNavContent) => { setOwn(next); onContentChange?.(next) }, [onContentChange])
  const close = React.useCallback(() => {
    const from = current
    go('bar')
    // Back to the control that opened it, once the bar is drawn again.
    window.setTimeout(() => (from === 'search' ? searchTrigger : productTrigger).current?.focus({ preventScroll: true }), 0)
  }, [current, go])

  // The container's size is what morphs: measured from its content, so CSS can transition between two lengths.
  React.useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = () => setSize({ width: el.offsetWidth, height: el.offsetHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [current, compact])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); go('search') }
      else if (e.key === 'Escape' && current !== 'bar') { e.preventDefault(); close() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, close, go])

  React.useEffect(() => { if (current === 'search') searchInput.current?.focus({ preventScroll: true }) }, [current])

  const morph = current === 'bar' ? '--motion-use-overlay-out' : '--motion-use-overlay-in'
  const caret = boxedGlyph(current === 'product' ? 'caret-up' : 'chevron-down', 'icon.small')
  const bar = (
    <div data-part="MorphNav.bar" className="flex items-center" style={{ gap: 'var(--spacing-gap-tight)', paddingInlineStart: 'var(--spacing-gap-tight)' }}>
      <Brand size="sm" name={compact ? '' : 'Ohmewn'} versionVisible={false} aria-label="Ohmewn" />
      <NavItem asChild size="sm" iconTrailing={caret} forceState={current === 'product' ? 'Hover' : undefined}>
        <button ref={productTrigger} type="button" aria-expanded={current === 'product'} aria-haspopup="true" onPointerEnter={() => go('product')} onClick={() => go(current === 'product' ? 'bar' : 'product')}>Product</button>
      </NavItem>
      {LINKS.map((label) => <NavItem key={label} size="sm" href="#" iconTrailing={label === 'Pricing' ? undefined : boxedGlyph('chevron-down', 'icon.small')}>{label}</NavItem>)}
      <span className="flex-1" />
      <IconButton ref={searchTrigger} variant="secondary" appearance="ghost" icon={boxedGlyph('search')} aria-label="Search" aria-keyshortcuts="Meta+K" onClick={() => go('search')} />
      <Button size="sm">Start free</Button>
    </div>
  )

  return (
    <nav
      data-slot="morph-nav"
      data-content={current}
      data-compact={compact}
      aria-label="Main"
      onPointerLeave={() => { if (current === 'product') go('bar') }}
      className={cn('relative inline-block max-w-full overflow-hidden', className)}
      style={{
        background: 'var(--color-surface-layer-2)', border: 'var(--stroke-divider) solid var(--color-border-default)', borderRadius: 'var(--radius-overlay)', boxShadow: 'var(--shadow-lg)',
        // Open on `use-overlay-in`, back to the bar on `use-overlay-out`; reduced motion drops the size travel and keeps the fade.
        transition: reduced ? undefined : `width var(${morph}), height var(${morph})`,
        ...(size && !reduced ? { width: size.width, height: size.height } : {}),
        ...style,
      }}
      {...props}
    >
      <div
        ref={inner}
        key={current}
        data-part="MorphNav.content"
        className="flex w-max max-w-[100vw] flex-col starting:opacity-0"
        style={{ gap: 'var(--spacing-gap-control)', padding: current === 'product' ? 'var(--spacing-inset-surface)' : 'var(--spacing-gap-control)', transition: 'opacity var(--motion-use-overlay-in)' }}
      >
        {current === 'search' ? (
          <div role="search" className="flex flex-col" style={{ width: 622, gap: 'var(--spacing-gap-control)' }}>
            <div className="flex items-center" style={{ gap: 'var(--spacing-gap-control)' }}>
              <Input ref={searchInput} size="lg" type="search" placeholder="Search Ohmewn" aria-label="Search Ohmewn" className="flex-1" />
              <IconButton variant="secondary" appearance="ghost" icon={boxedGlyph('close')} aria-label="Close search" onClick={close} />
            </div>
            <DropdownMenu>
              <DropdownMenuContent inline style={{ background: 'none', border: 0, boxShadow: 'none', padding: 0, width: '100%' }}>
                <DropdownMenuLabel>Suggested</DropdownMenuLabel>
                {SUGGESTIONS.map((s, i) => <DropdownMenuItem key={s.title} description={s.text} trailing={s.group} highlighted={i === 0}>{s.title}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : bar}
        {current === 'product' && (
          <>
            <div data-part="MorphNav.panel" className="flex" style={{ gap: 'var(--spacing-gap-group)' }}>
              <ul className="m-0 grid list-none grid-cols-2 p-0" style={{ gap: 'var(--spacing-gap-tight)' }}>
                {DESTINATIONS.map((d) => (
                  <li key={d.title} style={{ width: 256 }}>
                    <a
                      data-part="MorphNav.destination"
                      href="#"
                      className="flex no-underline outline-none hover:bg-(--color-action-ghost-hover) focus-visible:outline-2 focus-visible:outline-(--color-border-focus)"
                      style={{ gap: 'var(--spacing-gap-control)', padding: 'var(--spacing-inset-control)', borderRadius: 'var(--radius-action)' }}
                    >
                      <span aria-hidden className="inline-flex shrink-0" style={{ color: 'var(--color-content-secondary)' }}>{boxedGlyph(d.icon)}</span>
                      <span className="flex flex-col" style={{ gap: 'var(--spacing-gap-tight)' }}>
                        <span style={titleText}>{d.title}</span>
                        <span style={bodyText}>{d.text}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col" style={{ width: 240, gap: 'var(--spacing-gap-control)' }}>
                <Image ratio="16:9" shape="rounded" alt="" />
                <span style={titleText}>Ohmewn 5 is here</span>
                <span style={bodyText}>Roadmap to release, in one workspace.</span>
              </div>
            </div>
            <div data-part="MorphNav.announcement" className="flex" style={{ borderTop: 'var(--stroke-divider) solid var(--color-border-subtle)', paddingTop: 'var(--spacing-gap-control)' }}><Button asChild variant="default" appearance="link" size="sm"><a href="#">New: automations can run on a timetable</a></Button></div>
          </>
        )}
      </div>
    </nav>
  )
}
