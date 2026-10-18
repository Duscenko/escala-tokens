// Skeleton: shadcn/ui `bases/radix/ui/badge.tsx` (MIT, see LICENSE-shadcn.md) with
// Escala's Style × Color × Size axes, and the StatusBadge (a presence dot).
// Appearance: recipes (Badge, StatusBadge).
import * as React from 'react'
import { cn } from '../../lib/utils'

export type BadgeVariant = 'solid' | 'soft' | 'outline'
export type BadgeColor = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info'

const COLOR: Record<BadgeColor, string> = {
  neutral: 'Neutral', brand: 'Brand', success: 'Success', warning: 'Warning', error: 'Error', info: 'Info',
}
const STYLE: Record<BadgeVariant, string> = { solid: 'Solid', soft: 'Soft', outline: 'Outline' }
/** shadcn's variant names, mapped onto Escala's style × colour. */
const SHADCN: Record<string, [BadgeVariant, BadgeColor]> = {
  default: ['solid', 'brand'], secondary: ['soft', 'neutral'], destructive: ['solid', 'error'],
}

export interface BadgeProps extends React.ComponentProps<'span'> {
  variant?: BadgeVariant | 'default' | 'secondary' | 'destructive'
  color?: BadgeColor
  size?: 'sm' | 'md' | 'lg'
  /** The leading status dot. Off for a count ("+5 more"). */
  dot?: boolean
}

function Badge({ variant = 'soft', color, size = 'md', dot = true, className, children, ...props }: BadgeProps) {
  const [style, aliasColor] = variant in SHADCN ? SHADCN[variant] : [variant as BadgeVariant, 'brand' as BadgeColor]
  return (
    <span
      data-slot="badge"
      data-escala="Badge"
      data-style={STYLE[style]}
      data-color={COLOR[color ?? aliasColor]}
      data-size={size.toUpperCase()}
      className={cn('inline-flex w-fit shrink-0 items-center whitespace-nowrap', !dot && 'tabular-nums', className)}
      {...props}
    >
      {dot && <span data-part="Badge.dot" aria-hidden className="inline-block shrink-0" />}
      {children}
    </span>
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
