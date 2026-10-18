// shadcn expresses a text link as `Button variant="link"`; Escala names it
// (TextLink) because it sits inside running text and has its own Figma set.
// Appearance: lib/componentRecipes.ts → lib/recipeStyles.ts. No colour here.
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface TextLinkProps extends React.ComponentProps<'a'> {
  forceState?: 'Default' | 'Hover' | 'Disabled'
}

function TextLink({ className, forceState, ...props }: TextLinkProps) {
  const disabled = forceState === 'Disabled' || props['aria-disabled'] === true
  return (
    <a
      data-slot="text-link"
      data-escala="TextLink"
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'cursor-pointer font-medium no-underline underline-offset-4 outline-none hover:underline',
        'aria-disabled:cursor-not-allowed aria-disabled:no-underline',
        forceState === 'Hover' && 'underline',
        className,
      )}
      {...props}
    />
  )
}

export { TextLink }
