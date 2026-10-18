// Skeleton: shadcn/ui `bases/radix/ui/badge.tsx` (MIT, see LICENSE-shadcn.md):
// the same `variant` values and `data-variant`. Plus Escala's StatusBadge (a
// presence dot). Appearance: recipes (Badge, StatusBadge).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

export const BADGE_VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const
export type BadgeVariant = (typeof BADGE_VARIANTS)[number]

function Badge({
  className, variant = 'default', asChild = false, ...props
}: React.ComponentProps<'span'> & { variant?: BadgeVariant; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'
  return (
    <Comp
      data-slot="badge"
      data-escala="Badge"
      data-variant={variant}
      className={cn(
        'group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap',
        'transition-colors [&>svg]:pointer-events-none',
        variant === 'link' && 'underline-offset-4 hover:underline',
        className,
      )}
      {...props}
    />
  )
}

export type Presence = 'Online' | 'Away' | 'Busy' | 'Offline'

function StatusBadge({ status = 'Online', className, children, ...props }: React.ComponentProps<'span'> & { status?: Presence }) {
  return (
    <span
      data-slot="status-badge"
      data-escala="StatusBadge"
      data-status={status}
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      <span data-part="StatusBadge.dot" aria-hidden className="inline-block shrink-0" />
      {children ?? status}
    </span>
  )
}

export { Badge, StatusBadge }
