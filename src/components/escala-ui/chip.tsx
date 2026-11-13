// Escala component: Chip — the Figma set of the same name (design-plans/chip-contract.md, 390:10982), 1:1:
// a compact tag for filter, selection or input values with an optional leading icon and close action. Size
// xs … xl, Shape rounded · pill, Variant default · info · success · critical, Appearance outline · soft, State
// Default · Hover · Focused · Selected · Disabled · Dragging. Two sibling buttons (a button may not hold another
// interactive control): the label toggles, the close removes. Appearance: recipe (Chip).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const CHIP_VARIANTS = ['info', 'success', 'default', 'critical'] as const
export type ChipVariant = (typeof CHIP_VARIANTS)[number]
export const CHIP_APPEARANCES = ['outline', 'soft'] as const
export type ChipAppearance = (typeof CHIP_APPEARANCES)[number]
export const CHIP_SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const
export type ChipSize = (typeof CHIP_SIZES)[number]
export const CHIP_STATES = ['Default', 'Hover', 'Focused', 'Selected', 'Disabled', 'Dragging'] as const
export type ChipState = (typeof CHIP_STATES)[number]
export const CHIP_SHAPES = ['rounded', 'pill'] as const
export type ChipShape = (typeof CHIP_SHAPES)[number]

// Phosphor regular glyphs: the file's default swaps (Plus leading, X close).
const PLUS = 'M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z'
const X = 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'
const glyph = (d: string) => <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false"><path d={d} /></svg>

export interface ChipProps extends Omit<React.ComponentProps<'span'>, 'onChange'> {
  /** Figma Variant. */
  variant?: ChipVariant
  /** Figma Appearance. */
  appearance?: ChipAppearance
  /** Figma Size: 24 · 32 · 40 · 48 · 56 high. */
  size?: ChipSize
  /** Figma Shape. */
  shape?: ChipShape
  /** Figma State Selected. */
  selected?: boolean
  /** Figma State Dragging. */
  dragging?: boolean
  /** Figma State Disabled. */
  disabled?: boolean
  /** Pin a State without a pointer (docs, Figma parity). */
  forceState?: ChipState
  /** Toggles the chip. */
  onPressedChange?: (selected: boolean) => void
  /** Figma CloseVisible: draws the close control; with a handler it removes the chip. */
  closeVisible?: boolean
  onRemove?: () => void
  /** Figma IconLeadingVisible + IconLeadingIcon: when given (`true` = the file's plus), the leading glyph shows. */
  iconLeading?: React.ReactNode
  /** Accessible name of the close control (default "Remove"). */
  closeLabel?: string
}

function Chip({
  variant = 'default', appearance = 'outline', size = 'default', shape = 'rounded', selected = false, dragging = false,
  disabled = false, forceState, onPressedChange, closeVisible, onRemove, iconLeading, closeLabel = 'Remove', className, children, ...props
}: ChipProps) {
  const showClose = closeVisible ?? onRemove != null
  const state = forceState && forceState !== 'Default' ? forceState : selected ? 'Selected' : dragging ? 'Dragging' : disabled ? 'Disabled' : undefined
  const isDisabled = disabled || state === 'Disabled'
  return (
    <span
      data-slot="chip"
      data-escala="Chip"
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      data-shape={shape}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      className={cn('inline-flex items-center justify-center whitespace-nowrap select-none', !isDisabled && 'cursor-pointer', className)}
      {...props}
    >
      <button
        type="button"
        aria-pressed={selected}
        disabled={isDisabled}
        onClick={() => onPressedChange?.(!selected)}
        className="inline-flex cursor-[inherit] items-center gap-[inherit] border-0 bg-transparent p-0 text-inherit outline-none [font:inherit]"
      >
        {iconLeading !== undefined && iconLeading !== false && (
          <span data-part="Chip.leading" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
            {iconLeading === true ? glyph(PLUS) : iconLeading}
          </span>
        )}
        <span data-part="Chip.label">{children ?? 'Chip'}</span>
      </button>
      {showClose && (
        <button
          type="button"
          aria-label={closeLabel}
          disabled={isDisabled}
          data-part="Chip.close"
          className="inline-flex shrink-0 cursor-[inherit] items-center justify-center border-0 bg-transparent p-0 text-inherit outline-none [&>svg]:size-full"
          onClick={(e) => { e.stopPropagation(); onRemove?.() }}
        >
          {glyph(X)}
        </button>
      )}
    </span>
  )
}

export { Chip }
