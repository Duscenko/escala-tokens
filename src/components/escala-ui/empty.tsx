// Skeleton: shadcn/ui `bases/radix/ui/empty.tsx` (MIT, see LICENSE-shadcn.md):
// the empty state — media, title, description and the actions under them.
// EmptyMedia `variant` default | icon as `data-variant`, as shadcn.
// Appearance: recipe (Empty).
import * as React from 'react'
import { cn } from '../../lib/utils'

function Empty({ className, style, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      data-escala="Empty"
      // Dashed is the empty state's edge; the recipe sets its colour and width.
      style={{ borderStyle: 'dashed', ...style }}
      className={cn('flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance', className)}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-header" data-part="Empty.header" className={cn('flex max-w-sm flex-col items-center', className)} {...props} />
}

export type EmptyMediaVariant = 'default' | 'icon'

function EmptyMedia({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & { variant?: EmptyMediaVariant }) {
  return (
    <div
      data-slot="empty-icon"
      data-part="Empty.media"
      data-variant={variant}
      className={cn('flex shrink-0 items-center justify-center', className)}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-title" data-part="Empty.title" className={className} {...props} />
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-description" data-part="Empty.description" className={cn('[&>a]:underline [&>a]:underline-offset-4', className)} {...props} />
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-content" data-part="Empty.content" className={cn('flex w-full max-w-sm min-w-0 flex-col items-center text-balance', className)} {...props} />
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
