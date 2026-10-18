// Skeleton: shadcn/ui `bases/radix/ui/card.tsx` (MIT, see LICENSE-shadcn.md).
// Appearance: lib/componentRecipes.ts → lib/recipeStyles.ts. No colour here.
import * as React from 'react'
import { cn } from '../../lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" data-escala="Card" className={cn('flex flex-col', className)} {...props} />
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

/** Escala addition: the card's text link ("Learn more →"). */
function CardLink({ className, ...props }: React.ComponentProps<'a'>) {
  return <a data-part="Card.link" className={cn('cursor-pointer no-underline', className)} {...props} />
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, CardLink }
