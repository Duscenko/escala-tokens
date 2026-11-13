// Escala component: NavItem — the Figma set of the same name (design-plans/nav-header-contract.md; 1095:19644), 1:1.
// A header navigation link or menu trigger: optional leading icon, label, count Badge and trailing caret. `current` marks the page you are on
// (`aria-current="page"`); with a trailing caret it opens a NavigationMenu and the caller adds `aria-expanded`. Tabs inside a view use TabMenuItem.
// Appearance: recipe NavItem (lib/componentRecipes.ts).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

export const NAV_ITEM_SIZES = ['default', 'sm', 'lg'] as const
export type NavItemSize = (typeof NAV_ITEM_SIZES)[number]
export const NAV_ITEM_STATES = ['Default', 'Hover', 'Current', 'Focused', 'Disabled'] as const
export type NavItemState = (typeof NAV_ITEM_STATES)[number]

export interface NavItemProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  /** Figma Size: height 32 · 40 · 48 (icons 16 · 20 · 24). */
  size?: NavItemSize
  /** Figma State=Current: the page you are on. */
  current?: boolean
  disabled?: boolean
  /** Pins a state for docs and previews. */
  forceState?: NavItemState
  /** Figma IconLeadingVisible / IconLeadingIcon. */
  iconLeading?: React.ReactNode
  /** Figma TrailingVisible: a count Badge (xs · soft · pill · number · secondary). */
  trailing?: React.ReactNode
  /** Figma IconTrailingVisible / IconTrailingIcon. */
  iconTrailing?: React.ReactNode
  /** Use your router link (or a button) as the element. */
  asChild?: boolean
  /** Figma Label. */
  children?: React.ReactNode
}

function NavItem({ size = 'default', current, disabled, forceState, iconLeading, trailing, iconTrailing, asChild, children, className, ...props }: NavItemProps) {
  const isCurrent = current || forceState === 'Current'
  const state: NavItemState | undefined = disabled ? 'Disabled' : isCurrent ? 'Current' : forceState && forceState !== 'Default' ? forceState : undefined
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-slot="nav-item"
      data-escala="NavItem"
      data-size={size}
      data-force-state={state}
      aria-current={isCurrent ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cn('relative inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap no-underline outline-none', disabled && 'cursor-not-allowed', className)}
      {...props}
    >
      {iconLeading != null && <span data-part="NavItem.iconLeading" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{iconLeading}</span>}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : <span data-part="NavItem.label">{children}</span>}
      {trailing != null && <span data-part="NavItem.badge" className="inline-flex shrink-0 items-center">{trailing}</span>}
      {iconTrailing != null && <span data-part="NavItem.iconTrailing" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{iconTrailing}</span>}
    </Comp>
  )
}

export { NavItem }
