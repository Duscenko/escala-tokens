// Escala component: ButtonGroup · ButtonGroupItem · ButtonGroupDivider — the Figma
// `ButtonGroup` page (design-plans/button-group-contract.md), three sets.
//
// ButtonGroup: a clipping box (Shadow/xs, the radius of its Shape) holding up to five
// joined segments. `variant`, `size` reach every item and divider by context, and the
// group puts a divider BETWEEN two items itself (Figma's divider-2…5). Shape `pill` is
// horizontal only in the file. ButtonGroupItem: its own set, not a Button — no radius
// (the group clips the corners), no stroke; `active` is aria-pressed. Behaviour: native
// <button>; colour and geometry only from the recipes (lib/recipes/actions.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const BUTTON_GROUP_SIZES = ['xs', 'sm', 'lg', 'xl', 'default'] as const
export const BUTTON_GROUP_VARIANTS = ['outline', 'default', 'inverse', 'secondary'] as const
export const BUTTON_GROUP_SHAPES = ['rounded', 'pill', 'square'] as const
export const BUTTON_GROUP_ORIENTATIONS = ['horizontal', 'vertical'] as const
export type ButtonGroupSize = (typeof BUTTON_GROUP_SIZES)[number]
export type ButtonGroupVariant = (typeof BUTTON_GROUP_VARIANTS)[number]
export type ButtonGroupShape = (typeof BUTTON_GROUP_SHAPES)[number]
export type ButtonGroupOrientation = (typeof BUTTON_GROUP_ORIENTATIONS)[number]
export type ButtonGroupItemState = 'Default' | 'Hover' | 'Pressed' | 'Focused' | 'Disabled'

interface GroupContext {
  variant: ButtonGroupVariant
  size: ButtonGroupSize
  orientation: ButtonGroupOrientation
}
const ButtonGroupContext = React.createContext<GroupContext | null>(null)

export interface ButtonGroupProps extends React.ComponentProps<'div'> {
  size?: ButtonGroupSize
  variant?: ButtonGroupVariant
  shape?: ButtonGroupShape
  orientation?: ButtonGroupOrientation
}

function ButtonGroup({
  className, size = 'default', variant = 'default', shape = 'rounded', orientation = 'horizontal', children, ...props
}: ButtonGroupProps) {
  // The file draws no vertical pill ("Shape=pill is horizontal only").
  const effectiveShape = shape === 'pill' && orientation === 'vertical' ? 'rounded' : shape
  const items = React.Children.toArray(children).filter(React.isValidElement)
  const joined: React.ReactNode[] = []
  items.forEach((child, i) => {
    const isDivider = child.type === ButtonGroupDivider
    const prev = items[i - 1]
    // A divider between two items the caller did not separate already.
    if (i > 0 && !isDivider && prev && prev.type !== ButtonGroupDivider) {
      joined.push(<ButtonGroupDivider key={`divider-${child.key ?? i}`} />)
    }
    joined.push(child)
  })
  return (
    <ButtonGroupContext.Provider value={{ variant, size, orientation }}>
      <div
        role="group"
        data-slot="button-group"
        data-escala="ButtonGroup"
        data-size={size}
        data-variant={variant}
        data-shape={effectiveShape}
        data-orientation={orientation}
        className={cn(
          'relative isolate inline-flex w-fit overflow-hidden',
          orientation === 'vertical' ? 'flex-col items-stretch' : 'flex-row items-start',
          // Figma's absolute `border` rectangle (outline): over the items, never in the layout.
          "after:pointer-events-none after:absolute after:inset-0 after:z-10 after:content-['']",
          className,
        )}
        {...props}
      >
        {joined}
      </div>
    </ButtonGroupContext.Provider>
  )
}

export interface ButtonGroupItemProps extends React.ComponentProps<'button'> {
  /** Outside a ButtonGroup; inside, the group's wins. */
  variant?: ButtonGroupVariant
  size?: ButtonGroupSize
  /** Figma Active: the selected segment (aria-pressed). */
  active?: boolean
  /** Figma IconOnly: a square segment showing only `leading` — give it an aria-label. */
  iconOnly?: boolean
  /** Figma IconLeadingVisible + IconLeadingIcon. */
  leading?: React.ReactNode
  /** Figma IconTrailingVisible + IconTrailingIcon. */
  trailing?: React.ReactNode
  /** Figma LoadingVisible: a spinner after the label, aria-busy. */
  loading?: boolean
  /** Pin a state without a pointer (docs, Storybook, Figma parity). */
  forceState?: ButtonGroupItemState
}

function Spinner() {
  return (
    <span data-part="ButtonGroupItem.spinner" className="inline-flex shrink-0">
      <svg viewBox="0 0 16 16" width="100%" height="100%" fill="none" aria-hidden className="animate-spin">
        {/* Figma: a track ellipse at 30% under the arc, both in the item's ink. */}
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  )
}

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span data-part="ButtonGroupItem.icon" className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
    {children}
  </span>
)

function ButtonGroupItem({
  className, variant, size, active = false, iconOnly = false, leading, trailing, loading = false,
  forceState, disabled, children, type = 'button', ...props
}: ButtonGroupItemProps) {
  const group = React.useContext(ButtonGroupContext)
  const v = group?.variant ?? variant ?? 'default'
  const s = group?.size ?? size ?? 'default'
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <button
      type={type}
      data-slot="button-group-item"
      data-escala="ButtonGroupItem"
      data-part="ButtonGroup.item"
      data-variant={v}
      data-size={s}
      data-icononly={String(iconOnly)}
      data-active={String(active)}
      data-force-state={state ?? (isDisabled ? 'Disabled' : undefined)}
      aria-pressed={active}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      disabled={disabled}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center whitespace-nowrap outline-none select-none',
        'focus-visible:z-20 aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none',
        className,
      )}
      {...props}
    >
      {iconOnly ? (
        <Icon>{leading}</Icon>
      ) : (
        <>
          {leading ? <Icon>{leading}</Icon> : null}
          <span data-part="ButtonGroupItem.label">{children}</span>
          {loading ? <Spinner /> : null}
          {trailing ? <Icon>{trailing}</Icon> : null}
        </>
      )}
    </button>
  )
}

export interface ButtonGroupDividerProps extends React.ComponentProps<'div'> {
  variant?: ButtonGroupVariant
  /** Figma's meaning: `horizontal` is the vertical line between side-by-side items. */
  orientation?: ButtonGroupOrientation
}

function ButtonGroupDivider({ className, variant, orientation, ...props }: ButtonGroupDividerProps) {
  const group = React.useContext(ButtonGroupContext)
  const v = group?.variant ?? variant ?? 'default'
  const o = group?.orientation ?? orientation ?? 'horizontal'
  return (
    <div
      aria-hidden
      data-slot="button-group-divider"
      data-escala="ButtonGroupDivider"
      data-variant={v}
      data-orientation={o}
      className={cn('shrink-0 self-stretch', className)}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupItem, ButtonGroupDivider }
