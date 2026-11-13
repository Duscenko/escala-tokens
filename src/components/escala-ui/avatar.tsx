// Escala component: Avatar + AvatarStatus + AvatarGroup — the Figma sets of the same names
// (design-plans/avatar-contract.md; 378:2094, 377:54, 378:2507), 1:1. An avatar is a photo, initials or an
// icon in a square (16 … 64) on Radius/full or Radius/control, with a hairline edge over the content, an
// optional ring 4px outside it and a presence dot on the bottom-right corner. Appearance: recipes (Avatar,
// AvatarStatus, AvatarGroup).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const AVATAR_TYPES = ['image', 'initials', 'icon'] as const
export type AvatarType = (typeof AVATAR_TYPES)[number]
export const AVATAR_SIZES = ['2xs', 'xs', 'sm', 'default', 'lg', 'xl', '2xl'] as const
export type AvatarSize = (typeof AVATAR_SIZES)[number]
export const AVATAR_SHAPES = ['circle', 'rounded'] as const
export type AvatarShape = (typeof AVATAR_SHAPES)[number]
export const AVATAR_VARIANTS = ['secondary', 'default', 'info', 'success', 'warning', 'critical'] as const
export type AvatarVariant = (typeof AVATAR_VARIANTS)[number]
export const AVATAR_APPEARANCES = ['soft', 'solid'] as const
export type AvatarAppearance = (typeof AVATAR_APPEARANCES)[number]
export const AVATAR_STATUSES = ['online', 'busy', 'away', 'offline', 'do-not-disturb'] as const
export type AvatarStatusValue = (typeof AVATAR_STATUSES)[number]
export const AVATAR_STATUS_SIZES = ['xs', 'sm', 'default', 'lg'] as const
export type AvatarStatusSize = (typeof AVATAR_STATUS_SIZES)[number]

const STATUS_LABEL: Record<AvatarStatusValue, string> = {
  online: 'Online', busy: 'Busy', away: 'Away', offline: 'Offline', 'do-not-disturb': 'Do not disturb',
}
/** The dot the file puts on each avatar size. */
const STATUS_SIZE: Record<AvatarSize, AvatarStatusSize> = {
  '2xs': 'xs', xs: 'xs', sm: 'xs', default: 'sm', lg: 'default', xl: 'lg', '2xl': 'lg',
}

// Phosphor `user` (bold) — the file's `icon/user / Weight=Bold`.
const USER_BOLD =
  'M234.38,210a123.36,123.36,0,0,0-60.78-53.23,76,76,0,1,0-91.2,0A123.36,123.36,0,0,0,21.62,210a12,12,0,1,0,20.77,12c18.12-31.32,50.12-50,85.61-50s67.49,18.69,85.61,50a12,12,0,0,0,20.77-12ZM76,96a52,52,0,1,1,52,52A52.06,52.06,0,0,1,76,96Z'

// ── AvatarStatus ─────────────────────────────────────────────────────────────

export interface AvatarStatusProps extends React.ComponentProps<'span'> {
  /** Figma Status. */
  status?: AvatarStatusValue
  /** Figma Size: the dot is 6 · 8 · 10 · 12px. */
  size?: AvatarStatusSize
}

function AvatarStatus({ status = 'online', size = 'default', className, ...props }: AvatarStatusProps) {
  return (
    <span
      role="img"
      aria-label={STATUS_LABEL[status]}
      data-slot="avatar-status"
      data-escala="AvatarStatus"
      data-status={status}
      data-size={size}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    >
      {status === 'do-not-disturb' && <span data-part="AvatarStatus.bar" className="w-1/2" />}
    </span>
  )
}

// ── AvatarGroup context (size and shape cascade to every avatar) ────────────

const GroupContext = React.createContext<{ size: AvatarSize; shape: AvatarShape } | null>(null)

// ── Avatar ───────────────────────────────────────────────────────────────────

export interface AvatarProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Figma Type. */
  type?: AvatarType
  /** Figma Size: 16 · 24 · 32 · 40 · 48 · 56 · 64. */
  size?: AvatarSize
  /** Figma Shape. */
  shape?: AvatarShape
  /** Figma Variant (initials and icon; a photo avatar is secondary). */
  variant?: AvatarVariant
  /** Figma Appearance. */
  appearance?: AvatarAppearance
  /** Figma RingVisible. */
  ringVisible?: boolean
  /** Figma StatusVisible; the dot is `status`. */
  statusVisible?: boolean
  status?: AvatarStatusValue
  /** Figma Photo (the swap): the image URL. */
  src?: string
  alt?: string
  /** Figma Icon (the swap): the glyph. Default: a user. */
  icon?: React.ReactNode
  /** The initials (Type initials): one letter on 2xs, two otherwise. */
  children?: React.ReactNode
}

function Avatar({
  type = 'image', size: sizeProp, shape: shapeProp, variant = 'secondary', appearance = 'soft',
  ringVisible = false, statusVisible = false, status = 'online', src, alt = '', icon, children, className, ...props
}: AvatarProps) {
  const group = React.useContext(GroupContext)
  const size = sizeProp ?? group?.size ?? 'default'
  const shape = shapeProp ?? group?.shape ?? 'circle'
  return (
    <span
      // Named (alt / aria-label) it is an image; a photo with no name is decoration (the name sits beside it).
      role={alt || props['aria-label'] ? 'img' : undefined}
      aria-hidden={!alt && !props['aria-label'] && type !== 'initials' && !statusVisible ? true : undefined}
      aria-label={alt || undefined}
      data-slot="avatar"
      data-escala="Avatar"
      data-type={type}
      data-size={size}
      data-shape={shape}
      data-variant={variant}
      data-appearance={appearance}
      className={cn('relative inline-flex shrink-0 items-center justify-center select-none', className)}
      {...props}
    >
      {type === 'image' && src && <img data-part="Avatar.image" src={src} alt="" className="absolute left-0 top-0 object-cover" />}
      {type === 'initials' && <span data-part="Avatar.initials" className="inline-flex items-center justify-center">{children}</span>}
      {type === 'icon' && (
        <span data-part="Avatar.icon" className="inline-flex items-center justify-center [&>svg]:size-full">
          {icon ?? <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false"><path d={USER_BOLD} /></svg>}
        </span>
      )}
      <span data-part="Avatar.stroke" aria-hidden className="pointer-events-none absolute left-0 top-0 size-full" />
      {ringVisible && (
        <span data-part="Avatar.ring" aria-hidden className="pointer-events-none absolute -inset-[var(--spacing-1)]" />
      )}
      {statusVisible && <AvatarStatus status={status} size={STATUS_SIZE[size]} className="absolute right-0 bottom-0" />}
    </span>
  )
}

// ── AvatarGroup ──────────────────────────────────────────────────────────────

/** The overlaps the file hand-sets (no Spacing/overlap role): xs −6, lg · xl −12, 2xl −16. 2xs, sm and
 *  default read the roles in the recipe (`overlap`). */
const OVERLAP_STEP: Partial<Record<AvatarSize, string>> = {
  xs: 'var(--spacing-1_5)', lg: 'var(--spacing-3)', xl: 'var(--spacing-3)', '2xl': 'var(--spacing-4)',
}

export interface AvatarGroupProps extends React.ComponentProps<'div'> {
  /** Figma Size: cascades to every Avatar. */
  size?: AvatarSize
  /** Figma Shape: cascades to every Avatar. */
  shape?: AvatarShape
  /** The +N tile (the file shows +3). 0 or omitted: none. */
  count?: number
  /** Accessible name of the +N tile ("3 more people"). */
  countLabel?: string
}

function AvatarGroup({ size = 'default', shape = 'circle', count, countLabel, children, className, style, ...props }: AvatarGroupProps) {
  const overlap = OVERLAP_STEP[size]
  return (
    <GroupContext.Provider value={{ size, shape }}>
      <div
        role="group"
        data-slot="avatar-group"
        data-escala="AvatarGroup"
        data-size={size}
        data-shape={shape}
        className={cn('relative inline-flex items-center [&>*+*]:ml-[var(--escala-overlap)]', className)}
        style={overlap ? ({ '--escala-overlap': `calc(-1 * ${overlap})`, ...style } as React.CSSProperties) : style}
        {...props}
      >
        {React.Children.map(children, (child, i) => (
          <div data-part="AvatarGroup.item" key={i} className="inline-flex shrink-0">{child}</div>
        ))}
        {count ? (
          <div data-part="AvatarGroup.item" className="inline-flex shrink-0">
            <div
              data-part="AvatarGroup.action"
              role="img"
              aria-label={countLabel ?? `${count} more`}
              className="inline-flex items-center justify-center"
            >
              <span data-part="AvatarGroup.count" aria-hidden>+{count}</span>
            </div>
          </div>
        ) : null}
      </div>
    </GroupContext.Provider>
  )
}

export { Avatar, AvatarStatus, AvatarGroup }
