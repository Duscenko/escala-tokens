// Skeleton: shadcn/ui `bases/radix/ui/card.tsx` (MIT, see LICENSE-shadcn.md):
// Card (`size` default | sm) · CardHeader · CardTitle · CardDescription ·
// CardAction · CardContent · CardFooter.
// Appearance: lib/componentRecipes.ts → lib/recipeStyles.ts. No colour here.
import * as React from 'react'
import { cn } from '../../lib/utils'

export const CARD_SIZES = ['default', 'sm'] as const
export type CardSize = (typeof CARD_SIZES)[number]

function Card({ className, size = 'default', ...props }: React.ComponentProps<'div'> & { size?: CardSize }) {
  return <div data-slot="card" data-escala="Card" data-size={size} className={cn('group/card flex flex-col overflow-hidden', className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      data-part="Card.header"
      className={cn(
        'grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" data-part="Card.title" className={className} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description" data-part="Card.description" className={className} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      data-part="Card.action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" data-part="Card.content" className={className} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" data-part="Card.footer" className={cn('flex items-center', className)} {...props} />
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
