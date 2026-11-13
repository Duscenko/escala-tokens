// Escala component: NumberInput — the Figma `NumberInput` set
// (design-plans/number-input-contract.md): a number field with decrement and
// increment, also a quantity stepper. `size` default · sm · lg, State Default · Hover ·
// Focused · Invalid · Disabled (Hover and Focused from the pointer and keyboard,
// `forceState` pins one for docs). The value is a spinbutton (aria-valuenow / min /
// max; Arrow Up / Down step it); the two buttons are the system's IconButton —
// secondary · ghost, one size below the field, labelled Decrease / Increase and not
// tab stops — and turn Disabled at the min / max. Paint: the NumberInput recipe
// (the box and the value) and the IconButton recipe (the buttons).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { IconButton } from './icon-button'
import type { ButtonSizeStep } from './button'

export const NUMBER_INPUT_SIZES = ['default', 'sm', 'lg'] as const
export type NumberInputSize = (typeof NUMBER_INPUT_SIZES)[number]
export type NumberInputState = 'Default' | 'Hover' | 'Focused' | 'Invalid' | 'Disabled'

/** The IconButton Size inside each NumberInput Size (the file: xs · sm · default). */
const BUTTON_SIZE: Record<NumberInputSize, ButtonSizeStep> = { sm: 'xs', default: 'sm', lg: 'default' }

export interface NumberInputProps extends Omit<React.ComponentProps<'input'>, 'size' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'type'> {
  size?: NumberInputSize
  /** Figma Value. Controlled… */
  value?: number
  /** …or uncontrolled. */
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number) => void
  /** Pin a state without a pointer (docs, Storybook, Figma parity). */
  forceState?: NumberInputState
  /** The decrement glyph (Figma: icon/Minus). */
  decrementIcon?: React.ReactNode
  /** The increment glyph (Figma: icon/Plus). */
  incrementIcon?: React.ReactNode
  /** On the root box (the input is the spinbutton inside it). */
  className?: string
  style?: React.CSSProperties
}

/** Phosphor `minus` (regular). */
function MinusGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z" />
    </svg>
  )
}
/** Phosphor `plus` (regular). */
function PlusGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
    </svg>
  )
}

function NumberInput({
  size = 'default', value, defaultValue = 0, min = -Infinity, max = Infinity, step = 1, onValueChange,
  forceState, decrementIcon, incrementIcon, disabled, className, style, ref, ...props
}: NumberInputProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  const [draft, setDraft] = React.useState<string | null>(null)
  const isDisabled = disabled || forceState === 'Disabled'
  const invalid = forceState === 'Invalid' || props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  // A live disabled or invalid field pins its look (as Input does).
  const pinned = forceState && forceState !== 'Default' ? forceState : isDisabled ? 'Disabled' : invalid ? 'Invalid' : undefined
  const set = (n: number) => {
    if (Number.isNaN(n)) return
    const next = Math.min(max, Math.max(min, n))
    setInner(next)
    onValueChange?.(next)
  }
  const text = draft ?? String(current)
  const innerRef = React.useRef<HTMLInputElement | null>(null)
  const setRefs = (el: HTMLInputElement | null) => {
    innerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
  }
  const buttonSize = BUTTON_SIZE[size]
  const atMin = current <= min
  const atMax = current >= max
  return (
    <div
      data-slot="number-input"
      data-escala="NumberInput"
      data-size={size}
      data-force-state={pinned}
      className={cn('inline-flex shrink-0 items-center', className)}
      style={style}
    >
      <IconButton
        variant="secondary" appearance="ghost" size={buttonSize} tabIndex={-1} aria-label="Decrease"
        disabled={isDisabled || atMin} forceState={isDisabled || atMin ? 'Disabled' : undefined}
        icon={decrementIcon ?? <MinusGlyph />}
        onClick={() => set(current - step)}
      />
      {/* The value frame (FILL, centred): the input sized to its text, and — when Focused
          is pinned for docs — the file's 1px caret right after it. A live focus shows the
          browser's own caret instead. */}
      <span
        className="flex h-full min-w-0 flex-1 cursor-text items-center justify-center overflow-hidden"
        onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); innerRef.current?.focus() } }}
      >
        <input
          ref={setRefs}
          role="spinbutton"
          type="text"
          inputMode="decimal"
          data-part="NumberInput.value"
          aria-valuenow={current}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-invalid={invalid || undefined}
          disabled={isDisabled}
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft != null) set(Number(draft)); setDraft(null) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); set(current + step) }
            else if (e.key === 'ArrowDown') { e.preventDefault(); set(current - step) }
            else if (e.key === 'Enter' && draft != null) { set(Number(draft)); setDraft(null) }
          }}
          style={{ width: `${Math.max(1, text.length)}ch` }}
          className="h-full max-w-full min-w-0 border-0 bg-transparent p-0 text-center tabular-nums outline-none disabled:cursor-not-allowed"
          {...props}
        />
        {forceState === 'Focused' ? <span data-part="NumberInput.caret" aria-hidden className="h-[1lh] shrink-0" /> : null}
      </span>
      <IconButton
        variant="secondary" appearance="ghost" size={buttonSize} tabIndex={-1} aria-label="Increase"
        disabled={isDisabled || atMax} forceState={isDisabled || atMax ? 'Disabled' : undefined}
        icon={incrementIcon ?? <PlusGlyph />}
        onClick={() => set(current + step)}
      />
    </div>
  )
}

export { NumberInput }
