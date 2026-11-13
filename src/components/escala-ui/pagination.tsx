// Escala component: Pagination, PaginationLink and PaginationEllipsis — the Figma sets of the same names
// (design-plans/pagination-contract.md; 989:714 · 988:330 · 988:343), 1:1.
// Page navigation as `nav`: First / Previous, numbered links with ellipses (the Content slot), Next / Last.
// `compact-grouped` joins the buttons like an outline ButtonGroup; `compact` keeps them apart as ghost IconButtons and PaginationLinks.
// Size cascades to every part. Appearance: recipes Pagination, PaginationLink, PaginationEllipsis (lib/componentRecipes.ts);
// the grouped variant is painted by ButtonGroup / ButtonGroupItem and the compact arrows by IconButton.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { ButtonGroup, ButtonGroupItem } from './button-group'
import { IconButton } from './icon-button'

export const PAGINATION_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export type PaginationSize = (typeof PAGINATION_SIZES)[number]
export const PAGINATION_VARIANTS = ['compact', 'compact-grouped'] as const
export type PaginationVariant = (typeof PAGINATION_VARIANTS)[number]
export const PAGINATION_LINK_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const
export type PaginationLinkState = (typeof PAGINATION_LINK_STATES)[number]

const PaginationContext = React.createContext<{ size: PaginationSize; variant: PaginationVariant }>({ size: 'default', variant: 'compact-grouped' })

// Phosphor regular glyphs the file draws: caret-double-left · caret-left · caret-right · caret-double-right · dots-three.
const PATHS = {
  first: 'M205.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L131.31,128ZM51.31,128l74.35-74.34a8,8,0,0,0-11.32-11.32l-80,80a8,8,0,0,0,0,11.32l80,80a8,8,0,0,0,11.32-11.32Z',
  prev: 'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z',
  next: 'M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z',
  last: 'M141.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L124.69,128,50.34,53.66A8,8,0,0,1,61.66,42.34l80,80A8,8,0,0,1,141.66,133.66Zm80-11.32-80-80a8,8,0,0,0-11.32,11.32L204.69,128l-74.35,74.34a8,8,0,0,0,11.32,11.32l80-80A8,8,0,0,0,221.66,122.34Z',
  dots: 'M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z',
}
const glyph = (d: string) => <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false" className="size-full"><path d={d} /></svg>
const ICON_PX: Record<PaginationSize, number> = { xs: 16, sm: 16, default: 20, lg: 24 }
const sized = (d: string, size: PaginationSize) => <span className="inline-flex" style={{ width: ICON_PX[size], height: ICON_PX[size] }}>{glyph(d)}</span>

export interface PaginationProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
  /** Figma Size: items 40 · 24 · 32 · 48 high. */
  size?: PaginationSize
  /** Figma Variant: compact-grouped (a joined outline group) · compact (ghost buttons apart). */
  variant?: PaginationVariant
  /** Figma JumpButtonsVisible: First and Last. */
  jumpButtons?: boolean
  /** Disable First / Previous (page 1) and Next / Last (the last page). */
  atStart?: boolean
  atEnd?: boolean
  onFirst?: () => void
  onPrevious?: () => void
  onNext?: () => void
  onLast?: () => void
  /** Shortcut for the Content slot: page numbers, `'…'` for an ellipsis. Needs `page` and `onPageChange`. */
  pages?: (number | '…')[]
  page?: number
  onPageChange?: (page: number) => void
  /** Figma Content slot: PaginationLink and PaginationEllipsis. */
  children?: React.ReactNode
}

function Pagination({
  size = 'default', variant = 'compact-grouped', jumpButtons = false, atStart, atEnd, onFirst, onPrevious, onNext, onLast,
  pages, page, onPageChange, children, className, ...props
}: PaginationProps) {
  const numbers = (pages ?? []).filter((p): p is number => p !== '…')
  const at = page != null ? numbers.indexOf(page) : -1
  const go = (n: number) => { if (page != null) onPageChange?.(numbers[Math.min(numbers.length - 1, Math.max(0, n))] ?? page) }
  const start = atStart ?? (pages ? at <= 0 : false)
  const end = atEnd ?? (pages ? at >= numbers.length - 1 : false)
  const content = children ?? pages?.map((p, i) => p === '…'
    ? <PaginationEllipsis key={`e${i}`} />
    : <PaginationLink key={p} active={p === page} onClick={() => onPageChange?.(p)}>{p}</PaginationLink>)
  const arrow = (key: 'first' | 'prev' | 'next' | 'last', label: string, disabled: boolean | undefined, onClick: (() => void) | undefined) =>
    variant === 'compact-grouped'
      ? <ButtonGroupItem key={key} iconOnly aria-label={label} disabled={disabled} onClick={onClick} leading={sized(PATHS[key], size)} />
      : <IconButton key={key} variant="secondary" appearance="ghost" size={size} aria-label={label} disabled={disabled} onClick={onClick} icon={sized(PATHS[key], size)} />
  const items = [
    jumpButtons && arrow('first', 'First page', start, onFirst),
    arrow('prev', 'Previous page', start, onPrevious ?? (pages ? () => go(at - 1) : undefined)),
    ...(variant === 'compact-grouped' ? React.Children.toArray(content) : [<div key="content" data-part="Pagination.content" className="flex items-center">{content}</div>]),
    arrow('next', 'Next page', end, onNext ?? (pages ? () => go(at + 1) : undefined)),
    jumpButtons && arrow('last', 'Last page', end, onLast),
  ]
  return (
    <PaginationContext.Provider value={{ size, variant }}>
      <nav
        aria-label="pagination"
        data-slot="pagination"
        data-escala="Pagination"
        data-size={size}
        data-variant={variant}
        className={cn('inline-flex items-center', className)}
        {...props}
      >
        {variant === 'compact-grouped' ? <ButtonGroup variant="outline" size={size}>{items}</ButtonGroup> : items}
      </nav>
    </PaginationContext.Provider>
  )
}

export interface PaginationLinkProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  size?: PaginationSize
  /** Figma Active: the current page (`aria-current="page"`). */
  active?: boolean
  /** Pins a state for docs and previews. */
  forceState?: PaginationLinkState
  /** Figma Label. */
  children?: React.ReactNode
}

/** Figma PaginationLink: a numbered page. In a grouped Pagination it is a ButtonGroupItem (the active one filled). */
function PaginationLink({ size, active = false, forceState, disabled, children, className, ...props }: PaginationLinkProps) {
  const ctx = React.useContext(PaginationContext)
  const s = size ?? ctx.size
  if (ctx.variant === 'compact-grouped') {
    return (
      <ButtonGroupItem active={active} aria-pressed={undefined} aria-current={active ? 'page' : undefined} disabled={disabled} forceState={forceState} className={className} {...props}>
        {children}
      </ButtonGroupItem>
    )
  }
  const state = disabled ? 'Disabled' : forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      data-slot="pagination-link"
      data-escala="PaginationLink"
      data-size={s}
      data-active={String(active)}
      data-force-state={state}
      className={cn('relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap outline-none disabled:cursor-not-allowed', className)}
      {...props}
    >
      <span data-part="PaginationLink.label">{children}</span>
    </button>
  )
}

export interface PaginationEllipsisProps extends React.ComponentProps<'span'> {
  size?: PaginationSize
}

/** Figma PaginationEllipsis: the non-interactive gap marker between page ranges. */
function PaginationEllipsis({ size, className, ...props }: PaginationEllipsisProps) {
  const ctx = React.useContext(PaginationContext)
  return (
    <span
      role="presentation"
      data-slot="pagination-ellipsis"
      data-escala="PaginationEllipsis"
      data-size={size ?? ctx.size}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    >
      <span data-part="PaginationEllipsis.icon" aria-hidden className="inline-flex items-center justify-center">{glyph(PATHS.dots)}</span>
      <span className="sr-only">More pages</span>
    </span>
  )
}

/** Sets Size and Variant for a lone PaginationLink or PaginationEllipsis (docs, stories) without the arrows. */
function PaginationScope({ size = 'default', variant = 'compact', children }: { size?: PaginationSize; variant?: PaginationVariant; children: React.ReactNode }) {
  const ctx = React.useMemo(() => ({ size, variant }), [size, variant])
  return <PaginationContext.Provider value={ctx}>{children}</PaginationContext.Provider>
}

export { Pagination, PaginationEllipsis, PaginationLink, PaginationScope }
