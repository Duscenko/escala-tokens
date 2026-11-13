// Escala component: TextLink — the Figma `TextLink` set. An inline link with optional
// icons either side and a 1px underline on the label's bottom edge
// (design-plans/text-link-contract.md): `variant` inverse · success · info · default ·
// secondary · critical, `size` xs · sm · default · lg. Behaviour is a native <a>;
// appearance comes from the TextLink recipe (lib/recipes/actions.ts →
// lib/recipeStyles.ts), which reads `data-variant` and `data-size`. No colour here:
// text, underline and icons all follow `currentColor`, which the recipe sets per state.
import * as React from 'react'
import { cn } from '../../lib/utils'

export const TEXT_LINK_VARIANTS = ['inverse', 'success', 'info', 'default', 'secondary', 'critical'] as const
export const TEXT_LINK_SIZES = ['xs', 'sm', 'default', 'lg'] as const
export type TextLinkVariant = (typeof TEXT_LINK_VARIANTS)[number]
export type TextLinkSize = (typeof TEXT_LINK_SIZES)[number]
export type TextLinkState = 'Default' | 'Hover' | 'Pressed' | 'Visited' | 'Focused' | 'Disabled'

export interface TextLinkProps extends React.ComponentProps<'a'> {
  variant?: TextLinkVariant
  size?: TextLinkSize
  /** The underline (Figma UnderlineVisible). Hover and Pressed always show it. */
  underline?: boolean
  /** Icon before the label (Figma IconLeadingVisible + IconLeadingIcon). */
  leading?: React.ReactNode
  /** Icon after the label (Figma IconTrailingVisible + IconTrailingIcon). */
  trailing?: React.ReactNode
  /** Pin a state without a pointer (docs playground, Figma parity). */
  forceState?: TextLinkState
  /** Takes the link out of the tab order and ignores clicks (aria-disabled). */
  disabled?: boolean
}

function TextLink({
  variant = 'default',
  size = 'default',
  underline = true,
  leading,
  trailing,
  forceState,
  disabled = false,
  className,
  children,
  onClick,
  tabIndex,
  ...props
}: TextLinkProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <a
      data-slot="text-link"
      data-escala="TextLink"
      data-variant={variant}
      data-size={size}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : tabIndex}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      className={cn(
        'inline-flex items-center justify-start whitespace-nowrap no-underline outline-none',
        'aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {leading ? <span data-part="TextLink.icon" className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{leading}</span> : null}
      <span data-part="TextLink.label" className="relative inline-flex flex-col">
        {children}
        {/* The 1px bar on the label's bottom edge; the recipe hides it when `data-visible="false"`. */}
        <span data-part="TextLink.underline" data-visible={underline} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 bg-current" />
      </span>
      {trailing ? <span data-part="TextLink.icon" className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{trailing}</span> : null}
    </a>
  )
}

export { TextLink }
