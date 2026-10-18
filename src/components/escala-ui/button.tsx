// Skeleton: shadcn/ui `bases/radix/ui/button.tsx` (MIT, see LICENSE-shadcn.md).
// Appearance: lib/componentRecipes.ts → lib/recipeStyles.ts. No colour here.
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

/** Escala's Style axis plus shadcn's variant names, which map onto it. */
type EscalaStyle = 'solid' | 'outline' | 'soft' | 'ghost'
type ShadcnVariant = 'default' | 'destructive' | 'secondary' | 'link'
export type ButtonIntent = 'brand' | 'neutral' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'default' | 'xs' | 'icon' | 'icon-sm' | 'icon-lg'
export type ButtonState = 'Default' | 'Hover' | 'Pressed' | 'Focused' | 'Loading' | 'Disabled'

const STYLE: Record<EscalaStyle, string> = { solid: 'Solid', outline: 'Outline', soft: 'Soft', ghost: 'Ghost' }
const INTENT: Record<ButtonIntent, string> = { brand: 'Brand', neutral: 'Neutral', danger: 'Danger', success: 'Success' }
/** shadcn variant → [Escala style, intent]. `link` has no Escala style; ghost is the closest. */
const SHADCN_VARIANT: Record<ShadcnVariant, [EscalaStyle, ButtonIntent]> = {
  default: ['solid', 'brand'],
  destructive: ['solid', 'danger'],
  secondary: ['solid', 'neutral'],
  link: ['ghost', 'brand'],
}
/** `outline` and `ghost` are shadcn names too, and in shadcn they are NEUTRAL;
 *  `solid` / `soft` are Escala's and default to the brand. Say `intent` to override. */
const DEFAULT_INTENT: Record<EscalaStyle, ButtonIntent> = { solid: 'brand', soft: 'brand', outline: 'neutral', ghost: 'neutral' }
const SIZE: Record<ButtonSize, string> = {
  xs: 'SM', sm: 'SM', default: 'MD', md: 'MD', lg: 'LG', xl: 'XL',
  icon: 'MD', 'icon-sm': 'SM', 'icon-lg': 'LG',
}

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: EscalaStyle | ShadcnVariant
  intent?: ButtonIntent
  size?: ButtonSize
  /** Pin a state without a pointer (docs playground). */
  forceState?: ButtonState
  loading?: boolean
  asChild?: boolean
  /** Paint from another recipe (a composite built on the Button's skeleton). */
  recipe?: string
}

function Button({
  className,
  variant = 'solid',
  intent,
  size = 'md',
  forceState,
  loading = false,
  disabled,
  asChild = false,
  recipe = 'Button',
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const [style, aliasIntent] = variant in SHADCN_VARIANT
    ? SHADCN_VARIANT[variant as ShadcnVariant]
    : [variant as EscalaStyle, DEFAULT_INTENT[variant as EscalaStyle]]
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : loading ? 'Loading' : undefined
  const square = size.startsWith('icon')

  return (
    <Comp
      data-slot="button"
      data-escala={recipe}
      data-style={STYLE[style]}
      data-color={INTENT[intent ?? aliasIntent]}
      data-size={SIZE[size]}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      aria-busy={state === 'Loading' || undefined}
      disabled={asChild ? undefined : disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none',
        'transition-[background-color,color,border-color,box-shadow] duration-150',
        'aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
        square && 'aspect-square !px-0',
        className,
      )}
      {...props}
    />
  )
}

/** The label slot. Optional: a bare string child renders the same. */
function ButtonLabel({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-part="Button.label" className={cn('truncate', className)} {...props} />
}

export interface CloseButtonProps extends React.ComponentProps<'button'> {
  size?: 'sm' | 'md'
  forceState?: 'Default' | 'Hover' | 'Focused'
}

/** Dismiss control. shadcn builds this from `Button variant="ghost" size="icon-sm"`;
 *  Escala names it (it has its own sizes and Figma set). The glyph is a child. */
function CloseButton({ className, size = 'md', forceState, children, ...props }: CloseButtonProps) {
  return (
    <button
      type="button"
      aria-label="Close"
      data-slot="close-button"
      data-escala="CloseButton"
      data-size={size === 'sm' ? 'SM' : 'MD'}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      className={cn(
        'inline-flex aspect-square shrink-0 cursor-pointer items-center justify-center border-0 p-0 outline-none',
        'transition-[background-color,color,box-shadow] duration-150 [&_svg]:pointer-events-none',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export interface FABButtonProps extends React.ComponentProps<'button'> {
  size?: 'md' | 'lg'
}

/** Floating action button: a circular primary action, one glyph, an accessible name. */
function FABButton({ className, size = 'md', children, ...props }: FABButtonProps) {
  return (
    <button
      type="button"
      data-slot="fab-button"
      data-escala="FABButton"
      data-size={size === 'lg' ? 'LG' : 'MD'}
      className={cn(
        'inline-flex aspect-square shrink-0 cursor-pointer items-center justify-center border-0 p-0 outline-none',
        'transition-[background-color,box-shadow] duration-150 [&_svg]:pointer-events-none',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button, ButtonLabel, CloseButton, FABButton }
