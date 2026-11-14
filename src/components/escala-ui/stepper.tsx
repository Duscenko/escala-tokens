// Escala component: Stepper, StepperItem, StepperIndicator and StepperIcon — the Figma sets of the same names
// (design-plans/stepper-contract.md; 994:3222 · 994:1904 · 994:850 · 994:569), 1:1.
// An ordered list of steps. A step is a marker (StepperIcon: the step number, or an automatic check / warning) joined to the next one by a
// connector line (StepperIndicator), plus a title and an optional description. Vertical: marker and text side by side; horizontal: stacked,
// the items sharing the width. Size and Orientation cascade from the Stepper; the last item hides its line. One item is `aria-current="step"`.
// Appearance: recipes Stepper, StepperItem, StepperIndicator, StepperIcon (lib/componentRecipes.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const STEPPER_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export type StepperSize = (typeof STEPPER_SIZES)[number]
export const STEPPER_ORIENTATIONS = ['vertical', 'horizontal'] as const
export type StepperOrientation = (typeof STEPPER_ORIENTATIONS)[number]
export const STEPPER_STATUSES = ['active', 'completed', 'error', 'locked'] as const
export type StepperStatus = (typeof STEPPER_STATUSES)[number]
export const STEPPER_STATES = ['Default', 'Disabled'] as const
export type StepperState = (typeof STEPPER_STATES)[number]

const StepperContext = React.createContext<{ size: StepperSize; orientation: StepperOrientation }>({ size: 'default', orientation: 'vertical' })
const IndexContext = React.createContext(1)

// Phosphor regular `check` and `warning`: the markers of completed and error steps.

export interface StepperProps extends Omit<React.ComponentProps<'ol'>, 'children'> {
  /** Figma Size: marker 40 · 24 · 32 · 48 (cascades). */
  size?: StepperSize
  /** Figma Orientation: vertical (default) · horizontal. */
  orientation?: StepperOrientation
  /** Figma Content slot: StepperItem steps. */
  children?: React.ReactNode
  /** Shortcut for plain steps (their titles): earlier ones are completed, `current` is active, the rest locked. */
  steps?: string[]
  /** 1-based index of the current step (with `steps`). */
  current?: number
  /** The glyph of a completed step (with `steps`); defaults to the check. */
  doneIcon?: React.ReactNode
  /** Stretch to this width. */
  width?: number | string
}

function Stepper({ size = 'default', orientation = 'vertical', steps, current = 1, doneIcon, width, children, className, style, ...props }: StepperProps) {
  const ctx = React.useMemo(() => ({ size, orientation }), [size, orientation])
  const items = children ?? steps?.map((title, i) => (
    <StepperItem key={title} status={i + 1 < current ? 'completed' : i + 1 === current ? 'active' : 'locked'} icon={i + 1 < current ? doneIcon : undefined}>{title}</StepperItem>
  ))
  return (
    <StepperContext.Provider value={ctx}>
      <ol
        data-slot="stepper"
        data-escala="Stepper"
        data-size={size}
        data-orientation={orientation}
        className={cn('m-0 flex list-none p-0', orientation === 'vertical' ? 'w-full flex-col items-stretch' : 'w-full flex-row', className)}
        style={{ width, ...style }}
        {...props}
      >
        {React.Children.toArray(items).map((child, i) => <IndexContext.Provider key={i} value={i + 1}>{child}</IndexContext.Provider>)}
      </ol>
    </StepperContext.Provider>
  )
}

export interface StepperIconProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  size?: StepperSize
  /** Figma Status: active · completed (check) · error (warning) · locked. */
  status?: StepperStatus
  /** Figma State=Disabled. */
  disabled?: boolean
  /** Figma Label (the number) and LabelVisible. */
  label?: React.ReactNode
  labelVisible?: boolean
  /** Figma Icon / IconVisible: replaces the number (and the automatic glyph of completed / error). */
  icon?: React.ReactNode
}

/** Figma StepperIcon: the round marker of a step. */
function StepperIcon({ size, status = 'active', disabled = false, label = '1', labelVisible = true, icon, className, ...props }: StepperIconProps) {
  const ctx = React.useContext(StepperContext)
  const auto = status === 'completed' ? glyph('check', { className: 'size-full' }) : status === 'error' ? glyph('warning', { className: 'size-full' }) : null
  const glyphNode = icon ?? auto
  return (
    <span
      data-escala="StepperIcon"
      data-size={size ?? ctx.size}
      data-status={status}
      data-force-state={disabled ? 'Disabled' : undefined}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    >
      {glyphNode != null
        ? <span data-part="StepperIcon.icon" aria-hidden className="inline-flex items-center justify-center [&>svg]:size-full">{glyphNode}</span>
        : labelVisible && <span data-part="StepperIcon.label">{label}</span>}
      {(status === 'completed' || status === 'error') && <span className="sr-only">{status === 'completed' ? 'Completed' : 'Error'}</span>}
    </span>
  )
}

export interface StepperIndicatorProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  size?: StepperSize
  status?: StepperStatus
  orientation?: StepperOrientation
  disabled?: boolean
  /** Figma LineVisible (default true). */
  lineVisible?: boolean
  /** The marker's number and glyph (see StepperIcon). */
  label?: React.ReactNode
  icon?: React.ReactNode
}

/** Figma StepperIndicator: the marker and the connector line to the next step. */
function StepperIndicator({ size, status = 'active', orientation, disabled = false, lineVisible = true, label, icon, className, ...props }: StepperIndicatorProps) {
  const ctx = React.useContext(StepperContext)
  const o = orientation ?? ctx.orientation
  return (
    <div
      data-escala="StepperIndicator"
      data-size={size ?? ctx.size}
      data-status={status}
      data-orientation={o}
      data-force-state={disabled ? 'Disabled' : undefined}
      className={cn('inline-flex items-center', o === 'vertical' ? 'flex-col self-stretch' : 'flex-row', className)}
      {...props}
    >
      <StepperIcon size={size} status={status} disabled={disabled} label={label} icon={icon} />
      {lineVisible && <span aria-hidden role="presentation" data-part="StepperIndicator.line" className="min-h-0 min-w-0 flex-1 self-stretch" style={{ flexBasis: 0 }} />}
    </div>
  )
}

export interface StepperItemProps extends Omit<React.ComponentProps<'li'>, 'title'> {
  size?: StepperSize
  orientation?: StepperOrientation
  /** Figma Status: active (the current step, `aria-current="step"`) · completed · error · locked. */
  status?: StepperStatus
  /** Figma State=Disabled: no click handler, `aria-disabled`. */
  disabled?: boolean
  /** Figma Description / DescriptionVisible. */
  description?: React.ReactNode
  /** The marker's number (defaults to the step's position) and glyph. */
  label?: React.ReactNode
  icon?: React.ReactNode
  /** Figma LineVisible (the last item hides it). */
  lineVisible?: boolean
  /** Figma Title. */
  children?: React.ReactNode
}

/** Figma StepperItem: one step. */
function StepperItem({ size, orientation, status = 'active', disabled = false, description, label, icon, lineVisible = true, children, className, ...props }: StepperItemProps) {
  const ctx = React.useContext(StepperContext)
  const index = React.useContext(IndexContext)
  const o = orientation ?? ctx.orientation
  return (
    <li
      data-slot="stepper-item"
      data-escala="StepperItem"
      data-size={size ?? ctx.size}
      data-status={status}
      data-orientation={o}
      data-force-state={disabled ? 'Disabled' : undefined}
      aria-current={status === 'active' ? 'step' : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'flex min-w-0 [&:last-child_[data-part="StepperIndicator.line"]]:hidden',
        o === 'vertical' ? 'flex-row items-start' : 'flex-1 flex-col items-stretch',
        className,
      )}
      {...props}
    >
      <StepperIndicator size={size} status={status} orientation={o} disabled={disabled} lineVisible={lineVisible} label={label ?? index} icon={icon} className={o === 'horizontal' ? 'self-stretch' : undefined} />
      <div data-part="StepperItem.content" className="flex min-w-0 flex-1 flex-col">
        <span data-part="StepperItem.title">{children}</span>
        {description != null && <span data-part="StepperItem.description">{description}</span>}
      </div>
    </li>
  )
}

export { Stepper, StepperIcon, StepperIndicator, StepperItem }
