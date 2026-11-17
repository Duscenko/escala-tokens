// Escala component: SocialLoginButton, the Figma set of the same name (364:20), 1:1: Brand × Appearance (white · brand) × Size ×
// State × IconOnly. A Button painted by its own recipe. The mark is the file's own `logo/<Brand>`: in colour on
// `white`, one colour in the label's ink on `brand` and when disabled (brandLogos.ts).
import * as React from 'react'
import { Button } from './button'
import { ProviderMark } from './brand-artwork'
import { cn } from '../../lib/utils'

export const SOCIAL_BRANDS_LIST = ['Google', 'Apple', 'Discord', 'Dribbble', 'Facebook', 'GitHub', 'LinkedIn', 'Slack', 'X'] as const
export type SocialBrand = (typeof SOCIAL_BRANDS_LIST)[number]
export const SOCIAL_APPEARANCES_LIST = ['white', 'brand'] as const
export type SocialAppearance = (typeof SOCIAL_APPEARANCES_LIST)[number]
/** The older lowercase ids (`google`), still accepted as `provider`. */
export type SocialProvider = Lowercase<SocialBrand> | 'figma'

export const PROVIDER_NAME: Record<string, string> = Object.fromEntries(SOCIAL_BRANDS_LIST.map((b) => [b.toLowerCase(), b]))

export interface SocialLoginButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'intent' | 'size' | 'recipe' | 'appearance'> {
  /** Figma Brand. */
  brand?: SocialBrand
  /** Older name of `brand` (lowercase id). */
  provider?: SocialProvider
  /** Figma Appearance: white (a bordered control) or the provider's own colour. */
  appearance?: SocialAppearance
  /** Figma IconOnly: a square of the Size; the accessible name is the full label. */
  iconOnly?: boolean
  size?: 'default' | 'lg'
  /** The full label; defaults to "Continue with <brand>". */
  label?: React.ReactNode
}

function SocialLoginButton({ brand, provider, appearance = 'white', iconOnly = false, size = 'default', label, className, children: _c, ...props }: SocialLoginButtonProps) {
  const name = brand ?? (provider ? PROVIDER_NAME[provider] ?? provider : 'Google')
  const text = label ?? `Continue with ${name}`
  return (
    <Button
      recipe="SocialLoginButton"
      variant="outline"
      data-size={size}
      data-brand={name}
      data-appearance={appearance}
      data-icononly={iconOnly ? 'true' : 'false'}
      aria-label={iconOnly && typeof text === 'string' ? text : undefined}
      className={cn(!iconOnly && 'w-full', iconOnly && '[&>[data-part="Button.label"]:empty]:hidden', className)}
      // The mark is the Button's leading slot, so it sits beside the label on the
      // control's centre line with the recipe's gap (inside the label it rode the baseline).
      leading={<span data-part="SocialLoginButton.icon" className="inline-flex shrink-0"><ProviderMark provider={name} colored={appearance === 'white' && !(props.disabled || props.forceState === 'Disabled')} /></span>}
      {...props}
    >
      {!iconOnly && <span data-part="SocialLoginButton.label" className="min-w-0 truncate">{text}</span>}
    </Button>
  )
}

export { SocialLoginButton }
