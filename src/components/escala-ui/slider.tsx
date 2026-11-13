// Escala component: Slider + SliderThumb — the Figma sets of the same names
// (design-plans/slider-contract.md, design-plans/slider-thumb-contract.md), 1:1: Size xs · sm · default ×
// Range single · range × State × Variant default · secondary, plus TooltipVisible and MarksVisible. Behaviour
// from Radix Slider (`role="slider"`, arrow keys); the track and the range are drawn here so the range runs
// between the THUMBS' centres, as in the file. Appearance: recipes (Slider, SliderThumb).
import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const SLIDER_SIZES = ['xs', 'sm', 'default'] as const
export type SliderSize = (typeof SLIDER_SIZES)[number]
export const SLIDER_THUMB_STATES = ['Default', 'Hover', 'Focused', 'Dragging', 'Disabled'] as const
export type SliderThumbState = (typeof SLIDER_THUMB_STATES)[number]
export const SLIDER_STATES = ['Default', 'Dragging', 'Disabled'] as const
export type SliderState = (typeof SLIDER_STATES)[number]
export const SLIDER_VARIANTS = ['default', 'secondary'] as const
export type SliderVariant = (typeof SLIDER_VARIANTS)[number]
export const SLIDER_RANGES = ['single', 'range'] as const
export type SliderRange = (typeof SLIDER_RANGES)[number]

// The thumb's side per Size (mirrors the SliderThumb recipe: 14 · 16 · 20), which the range, the tooltips
// and the marks need to place themselves: a thumb's centre sits at half + p × (width − thumb).
const THUMB_PX: Record<SliderSize, number> = { xs: 14, sm: 16, default: 20 }

export interface SliderThumbProps extends React.ComponentProps<'span'> {
  /** Figma Size: 14 · 16 · 20. */
  size?: SliderSize
  /** Figma Variant: the edge colour (default accent, secondary neutral). */
  variant?: SliderVariant
  /** Pin a State without a pointer (docs playground, Figma parity). */
  forceState?: SliderThumbState
}

function SliderThumb({ size = 'default', variant = 'default', forceState, className, ...props }: SliderThumbProps) {
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <span
      data-slot="slider-thumb"
      data-escala="SliderThumb"
      data-size={size}
      data-variant={variant}
      data-force-state={state}
      aria-disabled={forceState === 'Disabled' || undefined}
      className={cn('block shrink-0 outline-none', className)}
      {...props}
    />
  )
}

export interface SliderProps extends Omit<React.ComponentProps<typeof SliderPrimitive.Root>, 'value' | 'defaultValue' | 'onValueChange'> {
  /** Figma Size: control 32 · 36 · 40 high, track 4 · 6 · 8, thumb 14 · 16 · 20. */
  size?: SliderSize
  variant?: SliderVariant
  /** A number is a single slider, an array a range (Figma Range). */
  value?: number | number[]
  defaultValue?: number | number[]
  onValueChange?: (value: number & number[]) => void
  /** Figma Range = range with no value given: the file's 25 – 70. */
  range?: boolean
  /** Figma TooltipVisible: the value above each thumb. */
  tooltipVisible?: boolean
  /** Figma TooltipText / TooltipEndText override what the tooltips read (docs). */
  tooltipText?: string
  tooltipEndText?: string
  /** Figma MarksVisible: ticks and labels under the track (0 · 25 · 50 · 75 · 100 by default). */
  marksVisible?: boolean
  marks?: number[]
  /** Pin a State: Dragging pins the last thumb as dragging, Disabled disables the slider (docs). */
  forceState?: SliderState
  /** The header row of the shadcn-era slider (label + live value) — not in the file. */
  label?: React.ReactNode
  format?: (value: number) => string
}

function Slider({
  size = 'default', variant = 'default', value, defaultValue, onValueChange, range, tooltipVisible = false, tooltipText, tooltipEndText,
  marksVisible = false, marks = [0, 25, 50, 75, 100], forceState, label, format = (n) => `${n}%`, disabled, className,
  min = 0, max = 100, 'aria-label': ariaLabel, ...props
}: SliderProps) {
  const isRange = Array.isArray(value ?? defaultValue) || (!!range && value == null && defaultValue == null)
  const initial = defaultValue ?? (isRange ? [25, 70] : 40)
  const [inner, setInner] = React.useState<number[]>(Array.isArray(initial) ? initial : [initial])
  const current = value !== undefined ? (Array.isArray(value) ? value : [value]) : inner
  const isDisabled = disabled || forceState === 'Disabled'
  const [dragging, setDragging] = React.useState(false)
  const [active, setActive] = React.useState(0)
  React.useEffect(() => {
    if (!dragging) return
    const stop = () => setDragging(false)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => { window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop) }
  }, [dragging])
  const thumb = THUMB_PX[size]
  const span = max - min
  const at = (v: number) => (v - min) / span
  // A thumb centre along the control: half a thumb in, then its share of the room the thumb leaves.
  const centre = (p: number) => `calc(${thumb / 2}px + ${p} * (100% - ${thumb}px))`
  const draggingIndex = forceState === 'Dragging' ? current.length - 1 : dragging ? Math.min(active, current.length - 1) : -1
  const texts = [tooltipText, tooltipEndText]
  const lo = isRange ? Math.min(...current) : min
  return (
    <div data-slot="slider" data-escala="Slider" data-size={size} data-variant={variant} data-range={isRange ? 'range' : 'single'} className={cn('flex min-w-0 flex-col', className)}>
      {label != null && (
        <div className="flex justify-between">
          <span data-part="Slider.label">{label}</span>
          <span data-part="Slider.value" className="tabular-nums">{format(current[0])}</span>
        </div>
      )}
      {tooltipVisible && (
        <div data-part="Slider.tooltips" aria-hidden className="pointer-events-none relative">
          {current.map((v, i) => (
            <span
              key={i}
              data-part="Slider.tooltip"
              className="absolute top-0 inline-flex -translate-x-1/2 items-center justify-center whitespace-nowrap"
              style={{ left: centre(at(v)) }}
            >
              {texts[i] ?? String(v)}
            </span>
          ))}
        </div>
      )}
      <SliderPrimitive.Root
        data-part="Slider.control"
        value={current}
        min={min}
        max={max}
        disabled={isDisabled}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        onValueChange={(v) => {
          // The thumb that moved is the one being dragged (Radix picks the closest to the pointer).
          const moved = v.findIndex((x, i) => x !== current[i])
          if (moved >= 0) setActive(moved)
          setInner(v)
          onValueChange?.((isRange ? v : v[0]) as number & number[])
        }}
        onPointerDown={() => setDragging(true)}
        className="relative flex w-full touch-none items-center select-none"
        {...props}
      >
        <SliderPrimitive.Track data-part="Slider.track" className="relative w-full grow">
          <span
            data-part="Slider.range"
            className="absolute inset-y-0"
            style={{ left: isRange ? centre(at(lo)) : 0, width: isRange ? `calc((${at(Math.max(...current))} - ${at(lo)}) * (100% - ${thumb}px))` : centre(at(current[0])) }}
          />
        </SliderPrimitive.Track>
        {current.map((_, i) => (
          <SliderPrimitive.Thumb key={i} asChild aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)} onFocus={() => setActive(i)} onPointerDown={() => setActive(i)}>
            <SliderThumb size={size} variant={variant} forceState={isDisabled ? 'Disabled' : draggingIndex === i ? 'Dragging' : undefined} />
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Root>
      {marksVisible && (
        <div data-part="Slider.marks" aria-hidden className="flex justify-between">
          {marks.map((m) => (
            <span key={m} data-part="Slider.mark" className="inline-flex flex-col items-center">
              <span data-part="Slider.tick" className="block shrink-0" />
              <span data-part="Slider.markLabel">{m}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export { Slider, SliderThumb }
