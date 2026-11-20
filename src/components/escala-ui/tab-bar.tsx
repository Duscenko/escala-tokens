// Escala components: TabBar and TabBarItem — the Figma `TabBar` component (2354:124) and `TabBarItem` set (2354:84), 1:1
// (design-plans/tab-bar-contract.md). The bottom navigation of a mobile app: three to five top-level destinations.
// NOT a tablist: every item is a LINK that changes the page (NavItem's semantics, Current = `aria-current="page"`), in natural
// Tab order with no roving tabindex and no arrow keys. Views inside one page use TabMenu.
// Appearance: recipes TabBar and TabBarItem (lib/recipes/navigation.ts); motion by role (lib/recipes/motion.ts).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'
import { Badge } from './badge'

export const TAB_BAR_ITEM_STATES = ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] as const
export type TabBarItemState = (typeof TAB_BAR_ITEM_STATES)[number]

export interface TabBarProps extends React.ComponentProps<'nav'> {
  /** The landmark's name ("Main", "Primary"). */
  'aria-label': string
  /** Figma Content slot: 3 to 5 TabBarItem, exactly one `current`. Each becomes a list item that fills an equal share. */
  children?: React.ReactNode
}

/** Figma TabBar: a `nav` landmark wrapping a list of TabBarItem links. */
function TabBar({ children, className, ...props }: TabBarProps) {
  return (
    <nav data-slot="tab-bar" data-escala="TabBar" className={cn('flex w-full', className)} {...props}>
      <ul data-part="TabBar.content" className="m-0 flex w-full min-w-0 list-none p-0">
        {React.Children.map(children, (child) => (child == null || child === false ? null : <li className="flex min-w-0 flex-1">{child}</li>))}
      </ul>
    </nav>
  )
}

export interface TabBarItemProps extends Omit<React.ComponentProps<'a'>, 'children' | 'media'> {
  /** Figma State=Current: the page you are on (`aria-current="page"`). */
  current?: boolean
  /** Figma State=Disabled. */
  disabled?: boolean
  /** Pins a state for docs and previews (Figma State). */
  forceState?: TabBarItemState
  /** Figma Icon (INSTANCE_SWAP) + IconVisible: a Phosphor glyph. Not drawn when `media` is given. */
  icon?: React.ReactNode
  /** Figma Media (SLOT) + MediaVisible: e.g. `<Avatar size="xs" />`, in the icon's box. */
  media?: React.ReactNode
  /** Figma BadgeVisible: the unread count (Badge number · critical · solid · xs · pill). Hidden when undefined. */
  badge?: number | string
  /** Figma LabelVisible, inverted. A hidden label needs an accessible name: pass `aria-label` (a string label is used otherwise). */
  hideLabel?: boolean
  /** Figma Label, when `asChild` gives the children to your router link. */
  label?: React.ReactNode
  /** Use your router link as the element: pass `label` and an empty link (`<TabBarItem asChild label="Home"><Link to="/" /></TabBarItem>`). */
  asChild?: boolean
  /** Figma Label. */
  children?: React.ReactNode
}

/** Figma TabBarItem: the pill `indicator` (icon or media, plus the badge) over the label. */
function TabBarItem({
  current, disabled, forceState, icon, media, badge, hideLabel, label, asChild, children, className, href, 'aria-label': ariaLabel, ...props
}: TabBarItemProps) {
  const isCurrent = current || forceState === 'Current'
  const state: TabBarItemState | undefined = disabled ? 'Disabled' : isCurrent ? 'Current' : forceState && forceState !== 'Default' ? forceState : undefined
  const text = label ?? (asChild ? undefined : children)
  const name = ariaLabel ?? (hideLabel && typeof text === 'string' ? text : undefined)
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-slot="tab-bar-item"
      data-escala="TabBarItem"
      data-force-state={state}
      aria-current={isCurrent ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      aria-label={name}
      tabIndex={disabled ? -1 : undefined}
      href={disabled ? undefined : href}
      className={cn('relative flex w-full min-w-0 cursor-pointer flex-col items-center justify-center no-underline outline-none', disabled && 'cursor-not-allowed', className)}
      {...props}
    >
      <span data-part="TabBarItem.indicator" className="relative inline-flex shrink-0 items-center justify-center">
        {media != null ? (
          <span data-part="TabBarItem.media" aria-hidden className="inline-flex shrink-0 items-center justify-center">{media}</span>
        ) : icon != null ? (
          <span data-part="TabBarItem.icon" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{icon}</span>
        ) : null}
        {/* Figma: absolute, top of the pill, its left edge on the icon's centre line (x 24 of 48). */}
        {badge !== undefined && (
          <span data-part="TabBarItem.badge" className="absolute top-0 left-1/2 inline-flex">
            <Badge appearance="solid" shape="pill" size="xs" type="number" variant="critical" count={badge} />
          </span>
        )}
      </span>
      {!hideLabel && text != null && <span data-part="TabBarItem.label" className="max-w-full truncate">{text}</span>}
      {asChild && <Slot.Slottable>{children}</Slot.Slottable>}
    </Comp>
  )
}

export { TabBar, TabBarItem }
