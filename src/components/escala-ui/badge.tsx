// Escala component: Badge (+ Escala's StatusBadge, a presence dot) — the Figma set Badge (383:176,
// design-plans/badge-contract.md), 1:1: a small non-interactive label for statuses, counts and categories.
// Variant is the severity, Appearance soft · solid · outline · ghost, Type default · icon · number · dot (an
// icon-only badge needs an accessible name). Appearance: recipes (Badge, StatusBadge).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const BADGE_APPEARANCES = ['soft', 'solid', 'outline', 'ghost'] as const
export type BadgeAppearance = (typeof BADGE_APPEARANCES)[number]
export const BADGE_SHAPES = ['rounded', 'pill'] as const
export type BadgeShape = (typeof BADGE_SHAPES)[number]
export const BADGE_SIZES = ['xs', 'sm', 'default'] as const
export type BadgeSize = (typeof BADGE_SIZES)[number]
export const BADGE_TYPES = ['default', 'icon', 'number', 'dot'] as const
export type BadgeType = (typeof BADGE_TYPES)[number]
export const BADGE_VARIANTS = ['success', 'warning', 'info', 'inverse', 'default', 'secondary', 'critical'] as const
export type BadgeVariant = (typeof BADGE_VARIANTS)[number]

// Phosphor regular glyphs: the file's default swaps (CheckCircle · X · Info).
const GLYPH = {
  check: 'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
  x: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
  info: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z',
}
const glyph = (d: string) => <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false"><path d={d} /></svg>

export interface BadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Figma Appearance. */
  appearance?: BadgeAppearance
  /** Figma Shape. */
  shape?: BadgeShape
  /** Figma Size: 16 · 20 · 24 high. */
  size?: BadgeSize
  /** Figma Type: default (label), icon (needs an accessible name), number or dot. */
  type?: BadgeType
  /** Figma Variant: the severity. */
  variant?: BadgeVariant
  /** Figma Label. */
  children?: React.ReactNode
  /** Figma IconLeadingVisible + IconLeadingIcon: when given, the leading glyph shows. */
  iconLeading?: React.ReactNode
  /** Figma IconTrailingVisible + IconTrailingIcon. */
  iconTrailing?: React.ReactNode
  /** Figma Icon (Type icon; default an info glyph). */
  icon?: React.ReactNode
  /** Figma Count (Type number). */
  count?: React.ReactNode
}

function Badge({
  appearance = 'soft', shape = 'rounded', size = 'default', type = 'default', variant = 'default',
  children, iconLeading, iconTrailing, icon, count, className, ...props
}: BadgeProps) {
  return (
    <span
      role={type === 'icon' || type === 'dot' ? 'img' : undefined}
      data-slot="badge"
      data-escala="Badge"
      data-appearance={appearance}
      data-shape={shape}
      data-size={size}
      data-type={type}
      data-variant={variant}
      className={cn('group/badge inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap', className)}
      {...props}
    >
      {type === 'default' && (
        <>
          {iconLeading !== undefined && iconLeading !== false && <span data-part="Badge.iconLeading" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{iconLeading === true ? glyph(GLYPH.check) : iconLeading}</span>}
          <span data-part="Badge.label">{children ?? 'Badge'}</span>
          {iconTrailing !== undefined && iconTrailing !== false && <span data-part="Badge.iconTrailing" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{iconTrailing === true ? glyph(GLYPH.x) : iconTrailing}</span>}
        </>
      )}
      {type === 'icon' && <span data-part="Badge.icon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{icon ?? glyph(GLYPH.info)}</span>}
      {type === 'number' && <span data-part="Badge.count">{count ?? 8}</span>}
    </span>
  )
}

export type Presence = 'online' | 'away' | 'busy' | 'offline'

const PRESENCE_LABEL: Record<Presence, string> = { online: 'Online', away: 'Away', busy: 'Busy', offline: 'Offline' }

function StatusBadge({ status = 'online', className, children, ...props }: React.ComponentProps<'span'> & { status?: Presence }) {
  return (
    <span
      data-slot="status-badge"
      data-escala="StatusBadge"
      data-status={status}
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      <span data-part="StatusBadge.dot" aria-hidden className="inline-block shrink-0" />
      {children ?? PRESENCE_LABEL[status] ?? status}
    </span>
  )
}

export { Badge, StatusBadge }
