// Escala component: Breadcrumb, BreadcrumbItem, BreadcrumbEllipsis and BreadcrumbSeparator — the Figma sets of the same names
// (design-plans/breadcrumb-contract.md; 402:7814 · 402:998 · 402:999 · 402:1000), 1:1.
// A `nav` with an ordered list: items (the link segments, the last one `current`), separators between them and an optional
// ellipsis that stands for the collapsed start of a long trail. Appearance, Separator and Size cascade from the Breadcrumb.
// Appearance: recipes Breadcrumb, BreadcrumbItem, BreadcrumbEllipsis, BreadcrumbSeparator (lib/componentRecipes.ts).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const BREADCRUMB_SIZES = ['xs', 'sm', 'default'] as const
export type BreadcrumbSize = (typeof BREADCRUMB_SIZES)[number]
export const BREADCRUMB_APPEARANCES = ['ghost', 'outline', 'solid'] as const
export type BreadcrumbAppearance = (typeof BREADCRUMB_APPEARANCES)[number]
export const BREADCRUMB_SEPARATORS = ['chevron', 'slash', 'dot'] as const
export type BreadcrumbSeparatorKind = (typeof BREADCRUMB_SEPARATORS)[number]
export const BREADCRUMB_VARIANTS = ['default', 'secondary'] as const
export type BreadcrumbVariant = (typeof BREADCRUMB_VARIANTS)[number]
export const BREADCRUMB_ITEM_STATES = ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] as const
export type BreadcrumbItemState = (typeof BREADCRUMB_ITEM_STATES)[number]
export const BREADCRUMB_ELLIPSIS_STATES = ['Default', 'Hover', 'Focused', 'Disabled'] as const
export type BreadcrumbEllipsisState = (typeof BREADCRUMB_ELLIPSIS_STATES)[number]

const BreadcrumbContext = React.createContext<{ size: BreadcrumbSize; appearance: BreadcrumbAppearance; separator: BreadcrumbSeparatorKind }>({
  size: 'default', appearance: 'ghost', separator: 'chevron',
})

// Phosphor regular glyphs the file draws (house, caret-down, dots-three, caret-right, dot).

export interface BreadcrumbProps extends React.ComponentProps<'nav'> {
  /** Figma Appearance: ghost · outline · solid, for every item and the ellipsis. */
  appearance?: BreadcrumbAppearance
  /** Figma Separator: the glyph the BreadcrumbSeparators draw. */
  separator?: BreadcrumbSeparatorKind
  /** Figma Size: item height 24 · 32 · 40 (xs gives its items no gap). */
  size?: BreadcrumbSize
}

function Breadcrumb({ appearance = 'ghost', separator = 'chevron', size = 'default', className, ...props }: BreadcrumbProps) {
  const ctx = React.useMemo(() => ({ appearance, separator, size }), [appearance, separator, size])
  return (
    <BreadcrumbContext.Provider value={ctx}>
      <nav
        aria-label="Breadcrumb"
        data-slot="breadcrumb"
        data-escala="Breadcrumb"
        data-appearance={appearance}
        data-separator={separator}
        data-size={size}
        className={cn('flex items-center', className)}
        {...props}
      />
    </BreadcrumbContext.Provider>
  )
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return <ol data-slot="breadcrumb-list" className={cn('m-0 flex list-none flex-wrap items-center p-0', className)} style={{ gap: 'inherit' }} {...props} />
}

export interface BreadcrumbItemProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  /** Figma Variant: default (accent hover) · secondary (neutral hover). */
  variant?: BreadcrumbVariant
  appearance?: BreadcrumbAppearance
  size?: BreadcrumbSize
  /** Figma State=Current: the page itself. It is not a link (`aria-current="page"`). */
  current?: boolean
  disabled?: boolean
  /** Pins a state for docs and previews. */
  forceState?: BreadcrumbItemState
  /** Figma IconLeadingVisible / IconLeadingIcon. */
  iconLeading?: React.ReactNode
  /** Figma IconTrailingVisible / IconTrailingIcon. */
  iconTrailing?: React.ReactNode
  /** Use your router link as the element. */
  asChild?: boolean
  /** Figma Label. */
  children?: React.ReactNode
}

/** Figma BreadcrumbItem: one segment of the trail (a link, or the current page). */
function BreadcrumbItem({
  variant = 'default', appearance, size, current, disabled, forceState, iconLeading, iconTrailing, asChild, children, className, ...props
}: BreadcrumbItemProps) {
  const ctx = React.useContext(BreadcrumbContext)
  const isCurrent = current || forceState === 'Current'
  const state: BreadcrumbItemState | undefined = disabled ? 'Disabled' : isCurrent ? 'Current' : forceState && forceState !== 'Default' ? forceState : undefined
  const Comp = asChild ? Slot.Root : isCurrent ? 'span' : 'a'
  const aria = isCurrent ? { role: 'link', 'aria-current': 'page' as const } : disabled ? { 'aria-disabled': true } : {}
  return (
    <li data-slot="breadcrumb-item" className="inline-flex items-center">
      <Comp
        data-escala="BreadcrumbItem"
        data-variant={variant}
        data-appearance={appearance ?? ctx.appearance}
        data-size={size ?? ctx.size}
        data-force-state={state}
        {...aria}
        className={cn('inline-flex shrink-0 cursor-pointer items-center justify-center no-underline outline-none', (isCurrent || disabled) && 'cursor-default', disabled && 'cursor-not-allowed', className)}
        {...(props as React.ComponentProps<'a'>)}
      >
        {iconLeading != null && <span data-part="BreadcrumbItem.leading" aria-hidden className="inline-flex shrink-0 items-center justify-center">{iconLeading}</span>}
        {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : <span data-part="BreadcrumbItem.label">{children}</span>}
        {iconTrailing != null && <span data-part="BreadcrumbItem.trailing" aria-hidden className="inline-flex shrink-0 items-center justify-center">{iconTrailing}</span>}
      </Comp>
    </li>
  )
}

export interface BreadcrumbEllipsisProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  variant?: BreadcrumbVariant
  appearance?: BreadcrumbAppearance
  size?: BreadcrumbSize
  forceState?: BreadcrumbEllipsisState
}

/** Figma BreadcrumbEllipsis: the collapsed start of a long trail (a button that opens a menu of the hidden segments). */
function BreadcrumbEllipsis({ variant = 'default', appearance, size, forceState, disabled, className, 'aria-label': label = 'Show hidden breadcrumbs', ...props }: BreadcrumbEllipsisProps) {
  const ctx = React.useContext(BreadcrumbContext)
  const state = disabled ? 'Disabled' : forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <li data-slot="breadcrumb-ellipsis" className="inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        data-escala="BreadcrumbEllipsis"
        data-variant={variant}
        data-appearance={appearance ?? ctx.appearance}
        data-size={size ?? ctx.size}
        data-force-state={state}
        className={cn('inline-flex shrink-0 cursor-pointer items-center justify-center outline-none disabled:cursor-not-allowed', className)}
        {...props}
      >
        <span data-part="BreadcrumbEllipsis.icon" aria-hidden className="inline-flex items-center justify-center">{glyph('dots-three', { className: 'size-full' })}</span>
      </button>
    </li>
  )
}

export interface BreadcrumbSeparatorProps extends Omit<React.ComponentProps<'li'>, 'children'> {
  /** Figma Variant: chevron · slash · dot. Defaults to the Breadcrumb's Separator. */
  variant?: BreadcrumbSeparatorKind
  size?: BreadcrumbSize
  /** Another glyph or text. */
  children?: React.ReactNode
}

/** Figma BreadcrumbSeparator: the decorative divider between two items (hidden from assistive technology). */
function BreadcrumbSeparator({ variant, size, children, className, ...props }: BreadcrumbSeparatorProps) {
  const ctx = React.useContext(BreadcrumbContext)
  const kind = variant ?? ctx.separator
  return (
    <li
      role="presentation"
      aria-hidden
      data-slot="breadcrumb-separator"
      data-escala="BreadcrumbSeparator"
      data-variant={kind}
      data-size={size ?? ctx.size}
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    >
      {children ?? (kind === 'slash' ? '/' : <span data-part="BreadcrumbSeparator.icon" className="inline-flex items-center justify-center">{glyph(kind === 'dot' ? 'dot' : 'caret-right', { className: 'size-full' })}</span>)}
    </li>
  )
}

/** Figma's default glyphs, for stories and specimens. */
export const BREADCRUMB_GLYPHS = {
  house: glyph('house', { className: 'size-full' }),
  caretDown: glyph('chevron-down', { className: 'size-full' }),
}

export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator }
