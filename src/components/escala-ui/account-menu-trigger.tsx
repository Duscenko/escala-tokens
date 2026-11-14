// Escala component: AccountMenuTrigger — the Figma set of the same name (design-plans/nav-header-contract.md; 1098:119), 1:1.
// Opens the user menu: an Avatar, an optional name and a caret, on ghost button roles. A button with `aria-haspopup="menu"` (and the caller's
// `aria-expanded`); when the name is hidden it carries « Account menu for <name> ». The avatar is a circle at rest and a rounded square
// while hovered, pressed or focused, as the file draws it.
// Appearance: recipe AccountMenuTrigger (lib/componentRecipes.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { Avatar } from './avatar'

export const ACCOUNT_MENU_TRIGGER_SIZES = ['default', 'sm'] as const
export type AccountMenuTriggerSize = (typeof ACCOUNT_MENU_TRIGGER_SIZES)[number]
export const ACCOUNT_MENU_TRIGGER_STATES = ['Default', 'Hover', 'Pressed', 'Focused'] as const
export type AccountMenuTriggerState = (typeof ACCOUNT_MENU_TRIGGER_STATES)[number]

// Phosphor regular `caret-down`.

export interface AccountMenuTriggerProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  /** Figma Size: height 40 · 32 (avatar 32 · 24, caret 20 · 16). */
  size?: AccountMenuTriggerSize
  /** Pins a state for docs and previews. */
  forceState?: AccountMenuTriggerState
  /** Figma Name. */
  name?: string
  /** Figma NameVisible (default true). */
  nameVisible?: boolean
  /** Your own Avatar (its Shape and Size are set for you). Defaults to a photo-less image avatar. */
  avatar?: React.ReactElement<React.ComponentProps<typeof Avatar>>
}

function AccountMenuTrigger({
  size = 'default', forceState, name = 'Ayla', nameVisible = true, avatar, className, onPointerEnter, onPointerLeave, onPointerDown, onPointerUp, onFocus, onBlur, ...props
}: AccountMenuTriggerProps) {
  const [live, setLive] = React.useState({ hover: false, pressed: false, focus: false })
  const hot = live.hover || live.pressed || live.focus || (forceState != null && forceState !== 'Default')
  const avatarProps = { size: size === 'sm' ? 'xs' : 'sm', shape: hot ? 'rounded' : 'circle', variant: 'secondary', appearance: 'soft' } as const
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-label={nameVisible ? undefined : `Account menu for ${name}`}
      data-slot="account-menu-trigger"
      data-escala="AccountMenuTrigger"
      data-size={size}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      className={cn('relative inline-flex shrink-0 cursor-pointer items-center outline-none disabled:cursor-not-allowed', className)}
      onPointerEnter={(e) => { setLive((s) => ({ ...s, hover: true })); onPointerEnter?.(e) }}
      onPointerLeave={(e) => { setLive((s) => ({ ...s, hover: false, pressed: false })); onPointerLeave?.(e) }}
      onPointerDown={(e) => { setLive((s) => ({ ...s, pressed: true })); onPointerDown?.(e) }}
      onPointerUp={(e) => { setLive((s) => ({ ...s, pressed: false })); onPointerUp?.(e) }}
      onFocus={(e) => { setLive((s) => ({ ...s, focus: e.currentTarget.matches(':focus-visible') })); onFocus?.(e) }}
      onBlur={(e) => { setLive((s) => ({ ...s, focus: false })); onBlur?.(e) }}
      {...props}
    >
      <span data-part="AccountMenuTrigger.avatar" className="inline-flex shrink-0 items-center">
        {avatar ? React.cloneElement(avatar, avatarProps) : <Avatar type="image" alt="" {...avatarProps} />}
      </span>
      {nameVisible && <span data-part="AccountMenuTrigger.name">{name}</span>}
      <span data-part="AccountMenuTrigger.iconTrailing" aria-hidden className="inline-flex shrink-0 items-center justify-center">
        {glyph('chevron-down', { className: 'size-full' })}
      </span>
    </button>
  )
}

export { AccountMenuTrigger }
