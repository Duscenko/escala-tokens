// Escala component on the shadcn Badge / Toggle skeleton: a selectable, optionally
// dismissible tag. Appearance: its recipe (Chip).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ChipProps extends Omit<React.ComponentProps<'span'>, 'onChange'> {
  selected?: boolean
  size?: 'default' | 'sm'
  /** Toggles the chip. */
  onPressedChange?: (selected: boolean) => void
  /** Shows the remove control and calls this when it is pressed. */
  onRemove?: () => void
  /** The remove glyph (an X from the system's icon set). */
  removeIcon?: React.ReactNode
  /** Draw the remove control without wiring it (docs, previews). */
  dismissible?: boolean
}

function Chip({
  selected = false, size = 'default', onPressedChange, onRemove, removeIcon = '×', dismissible, className, children, ...props
}: ChipProps) {
  const showRemove = dismissible ?? onRemove != null
  return (
    <span
      data-slot="chip"
      data-escala="Chip"
      data-selected={selected ? 'True' : 'False'}
      data-dismissible={showRemove ? 'True' : 'False'}
      data-size={size}
      className={cn('inline-flex cursor-pointer items-center whitespace-nowrap', className)}
      {...props}
    >
      {/* Two sibling buttons: a button may not contain another interactive control. */}
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onPressedChange?.(!selected)}
        className="cursor-pointer border-0 bg-transparent p-0 text-inherit outline-none [font:inherit]"
      >
        {children}
      </button>
      {showRemove && (
        <button
          type="button"
          aria-label="Remove"
          data-part="Chip.remove"
          className="inline-flex cursor-pointer border-0 bg-transparent p-0 text-inherit outline-none"
          onClick={(e) => { e.stopPropagation(); onRemove?.() }}
        >
          {removeIcon}
        </button>
      )}
    </span>
  )
}

export { Chip }
