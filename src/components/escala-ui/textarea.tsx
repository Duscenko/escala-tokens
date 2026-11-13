// Escala component: Textarea — the Figma `Textarea` set (design-plans/textarea-contract.md,
// 394:152): a multi-line text field with an optional resize glyph. `size` sm · default ·
// lg, State Default · Hover · Focused · Invalid · Loading · Disabled (Hover and Focused
// from the pointer and keyboard; `aria-invalid`, `loading` and `disabled` pin the others;
// `forceState` pins one for docs). Value (placeholder · filled) needs no prop: the
// placeholder is the empty value. Invalid shows the warning glyph and Loading the
// Spinner at the top-right corner. The label and the error text come from Field, which
// wires `id`, `aria-describedby`, `aria-invalid` and `disabled` onto the <textarea>.
// Paint: the Textarea recipe.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './spinner'

export const TEXTAREA_SIZES = ['default', 'sm', 'lg'] as const
export type TextareaSize = (typeof TEXTAREA_SIZES)[number]
export type TextareaState = 'Default' | 'Hover' | 'Focused' | 'Invalid' | 'Loading' | 'Disabled'

export interface TextareaProps extends Omit<React.ComponentProps<'textarea'>, 'size'> {
  size?: TextareaSize
  /** Pin a state without a pointer (docs, Storybook, Figma parity). */
  forceState?: TextareaState
  /** State Loading: the Spinner in the corner, `aria-busy`. */
  loading?: boolean
  /** Figma ResizeGlyphVisible: the corner glyph, which drags the box taller. */
  resizeGlyph?: boolean
  /** On the root box (the <textarea> is inside it). */
  className?: string
  style?: React.CSSProperties
}

/** Phosphor `warning` (regular), the file's icon/warning. */
function WarningGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z" />
    </svg>
  )
}

function Textarea({
  size = 'default', forceState, loading, resizeGlyph = false, disabled, className, style, ref, ...props
}: TextareaProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  const isLoading = loading || forceState === 'Loading'
  const invalid = forceState === 'Invalid' || props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  // A live disabled, loading or invalid field pins its look (as Input does).
  const pinned = forceState && forceState !== 'Default'
    ? forceState
    : isDisabled ? 'Disabled' : isLoading ? 'Loading' : invalid ? 'Invalid' : undefined
  const corner = pinned === 'Invalid' ? 'status' : pinned === 'Loading' ? 'spinner' : null

  const boxRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | null>(null)
  const drag = (e: React.PointerEvent) => {
    const box = boxRef.current
    if (!box || isDisabled) return
    e.preventDefault()
    const from = e.clientY
    const start = box.getBoundingClientRect().height
    const min = start > 0 ? Math.min(start, parseFloat(getComputedStyle(box).minHeight) || start) : 0
    const move = (ev: PointerEvent) => setHeight(Math.max(min, start + ev.clientY - from))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={boxRef}
      data-slot="textarea"
      data-escala="Textarea"
      data-size={size}
      data-force-state={pinned}
      aria-disabled={isDisabled || undefined}
      className={cn('relative flex w-full flex-col', className)}
      style={height == null ? style : { ...style, height }}
    >
      <textarea
        ref={ref}
        data-part="Textarea.text"
        disabled={isDisabled}
        aria-invalid={invalid || undefined}
        aria-busy={isLoading || undefined}
        className="block min-h-0 w-full flex-1 resize-none border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
        {...props}
      />
      {corner ? (
        // The corner glyph sits `padding` in from the outer edge (the file positions it
        // absolutely, ignoring the stroke): the overlay starts at the border's outer edge.
        <span
          data-part="Textarea.adornment"
          aria-hidden
          className="pointer-events-none absolute flex items-start justify-end"
          style={{ inset: 'calc(-1 * var(--stroke-control, 1px))' }}
        >
          {corner === 'status' ? (
            <span data-part="Textarea.status" className="inline-flex shrink-0 [&>svg]:size-full"><WarningGlyph /></span>
          ) : (
            <span data-part="Textarea.spinner" className="relative inline-flex shrink-0 overflow-visible">
              {/* The file's Spinner: a 16px glyph pinned top-left, whatever the frame. */}
              <Spinner aria-hidden role={undefined} aria-label={undefined} className="absolute left-0 top-0 size-4" />
            </span>
          )}
        </span>
      ) : null}
      {resizeGlyph ? (
        <span
          data-part="Textarea.corner"
          className="pointer-events-none absolute flex items-end justify-end"
          style={{ inset: 'calc(-1 * var(--stroke-control, 1px))' }}
        >
          <svg
            data-part="Textarea.grip"
            viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
            aria-hidden focusable="false"
            className={cn('pointer-events-auto shrink-0 overflow-visible', isDisabled ? 'cursor-not-allowed' : 'cursor-ns-resize')}
            onPointerDown={drag}
          >
            <path d="M8 0L0 8M8 4L4 8" />
          </svg>
        </span>
      ) : null}
    </div>
  )
}

export { Textarea }
