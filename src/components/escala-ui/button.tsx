// Escala component: Button. The API is the Figma file's (design-plans/button-contract.md):
// `variant` is the intent (default · secondary · critical), `appearance` the style
// (solid · outline · ghost · link), `size` default · xs · sm · lg. Behaviour from
// Radix (Slot for asChild); appearance from the Button recipe
// (lib/recipes/actions.ts → lib/recipeStyles.ts), which reads `data-variant`,
// `data-appearance` and `data-size`. No colour here.
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

export const BUTTON_VARIANTS = ['default', 'secondary', 'critical'] as const
export const BUTTON_APPEARANCES = ['solid', 'outline', 'ghost', 'link'] as const
export const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg'] as const
/** The Figma axes, strict. */
export type ButtonIntent = (typeof BUTTON_VARIANTS)[number]
export type ButtonAppearance = (typeof BUTTON_APPEARANCES)[number]
export type ButtonSizeStep = (typeof BUTTON_SIZES)[number]
export type ButtonState = 'Default' | 'Hover' | 'Pressed' | 'Focused' | 'Loading' | 'Disabled'

/** MIGRATION ONLY — shadcn's one-axis values, still accepted so existing call
 *  sites keep painting while they move to `variant` + `appearance`. Not in the
 *  catalogue, the docs or the registry's examples. */
export type LegacyButtonVariant = 'outline' | 'ghost' | 'link' | 'destructive'
/** MIGRATION ONLY — shadcn's square sizes; they render an IconButton. */
export type LegacyIconSize = 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

const LEGACY_VARIANT: Record<LegacyButtonVariant, [ButtonIntent, ButtonAppearance]> = {
  outline: ['secondary', 'outline'],
  ghost: ['secondary', 'ghost'],
  link: ['default', 'link'],
  destructive: ['critical', 'solid'],
}
/** What a call site may pass: the Figma values, plus the legacy ones while they migrate. */
export type ButtonVariant = ButtonIntent | LegacyButtonVariant
export type ButtonSize = ButtonSizeStep | LegacyIconSize

const LEGACY_ICON_SIZE: Record<LegacyIconSize, ButtonSizeStep> = { 'icon-xs': 'xs', 'icon-sm': 'sm', icon: 'default', 'icon-lg': 'lg' }

/** Resolves a call site's props (new or legacy) to the Figma axes. */
export function buttonAxes(
  variant: ButtonVariant = 'default',
  appearance?: ButtonAppearance,
  size: ButtonSize = 'default',
): { variant: ButtonIntent; appearance: ButtonAppearance; size: ButtonSizeStep; iconOnly: boolean } {
  const legacy = LEGACY_VARIANT[variant as LegacyButtonVariant]
  const iconSize = LEGACY_ICON_SIZE[size as LegacyIconSize]
  return {
    variant: legacy ? legacy[0] : (variant as ButtonIntent),
    appearance: appearance ?? (legacy ? legacy[1] : 'solid'),
    size: iconSize ?? (size as ButtonSizeStep),
    iconOnly: Boolean(iconSize),
  }
}

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant
  appearance?: ButtonAppearance
  size?: ButtonSize
  /** Icon before the label (Figma IconLeadingVisible + IconLeadingIcon). */
  leading?: React.ReactNode
  /** Icon after the label (Figma IconTrailingVisible + IconTrailingIcon). */
  trailing?: React.ReactNode
  asChild?: boolean
  /** Pin a state without a pointer (docs playground, Figma parity). */
  forceState?: ButtonState
  /** Replaces the leading icon with a spinner, sets aria-busy. */
  loading?: boolean
  /** Paint from another recipe (a composite built on this skeleton). */
  recipe?: string
}

function Spinner() {
  return (
    <svg data-slot="spinner" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="animate-spin">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  )
}

function Button({
  className,
  variant,
  appearance,
  size,
  leading,
  trailing,
  asChild = false,
  forceState,
  loading = false,
  disabled,
  recipe = 'Button',
  children,
  ...props
}: ButtonProps) {
  const axes = buttonAxes(variant, appearance, size)
  // A legacy square size (`icon-sm`…) paints as data-escala="IconButton".
  const recipeKey = axes.iconOnly && recipe === 'Button' ? 'IconButton' : recipe
  const Comp = asChild ? Slot.Root : 'button'
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : loading ? 'Loading' : undefined
  const busy = state === 'Loading'

  return (
    <Comp
      data-slot={axes.iconOnly ? 'icon-button' : 'button'}
      data-escala={recipeKey}
      data-variant={axes.variant}
      data-appearance={axes.appearance}
      data-size={axes.size}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      aria-busy={busy || undefined}
      disabled={asChild ? undefined : disabled}
      className={cn(
        'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none',
        'aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
        // Figma underlines only the critical link on hover / press.
        axes.appearance === 'link' && axes.variant === 'critical' && 'underline-offset-4 hover:underline active:underline',
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {busy ? <Spinner /> : leading}
          {children}
          {!busy || !axes.iconOnly ? trailing : null}
        </>
      )}
    </Comp>
  )
}

export { Button }
