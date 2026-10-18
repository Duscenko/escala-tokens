// Escala component on the shadcn Button skeleton: an outlined sign-in button
// carrying a provider mark. Appearance: its own recipe (SocialLoginButton).
import * as React from 'react'
import { Button } from './button'
import { ProviderMark } from './brand-artwork'
import { cn } from '../../lib/utils'

export type SocialProvider = 'Google' | 'Apple' | 'GitHub' | 'Figma'

export interface SocialLoginButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'intent' | 'size' | 'recipe'> {
  provider: SocialProvider
  size?: 'md' | 'lg'
  /** The full label; defaults to "Continue with <provider>" — never icon-only. */
  label?: React.ReactNode
}

function SocialLoginButton({ provider, size = 'md', label, className, ...props }: SocialLoginButtonProps) {
  return (
    <Button
      recipe="SocialLoginButton"
      variant="outline"
      data-size={size === 'lg' ? 'LG' : 'MD'}
      data-provider={provider}
      className={cn('w-full', className)}
      {...props}
    >
      <span className="inline-flex shrink-0"><ProviderMark provider={provider} /></span>
      <span className="min-w-0 truncate">{label ?? `Continue with ${provider}`}</span>
    </Button>
  )
}

export { SocialLoginButton }
