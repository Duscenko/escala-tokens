// Skeleton: shadcn/ui `bases/radix/ui/bubble.tsx` (MIT, see LICENSE-shadcn.md):
// a chat bubble, `variant` default | secondary | muted | tinted | outline |
// ghost | destructive × `align` start | end, with optional reactions.
// Appearance: recipe (Bubble).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

export const BUBBLE_VARIANTS = ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] as const
export type BubbleVariant = (typeof BUBBLE_VARIANTS)[number]

function BubbleGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="bubble-group" className={cn('flex min-w-0 flex-col gap-1', className)} {...props} />
}

function Bubble({
  variant = 'default', align = 'start', className, ...props
}: React.ComponentProps<'div'> & { variant?: BubbleVariant; align?: 'start' | 'end' }) {
  return (
    <div
      data-slot="bubble"
      data-escala="Bubble"
      data-variant={variant}
      data-align={align}
      className={cn('group/bubble relative flex w-fit min-w-0 max-w-[80%] flex-col', align === 'end' && 'self-end', className)}
      {...props}
    />
  )
}

function BubbleContent({ asChild = false, className, ...props }: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return <Comp data-slot="bubble-content" data-part="Bubble.content" className={cn('w-fit max-w-full min-w-0 overflow-hidden break-words', className)} {...props} />
}

function BubbleReactions({
  side = 'bottom', align = 'end', className, ...props
}: React.ComponentProps<'div'> & { align?: 'start' | 'end'; side?: 'top' | 'bottom' }) {
  return (
    <div
      data-slot="bubble-reactions"
      data-part="Bubble.reactions"
      data-align={align}
      data-side={side}
      className={cn(
        'absolute z-10 flex w-fit items-center justify-center',
        side === 'top' ? 'top-0 -translate-y-3/4' : 'bottom-0 translate-y-3/4',
        align === 'end' ? 'right-3' : 'left-3',
        className,
      )}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions }
