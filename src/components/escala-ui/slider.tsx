// Skeleton: shadcn/ui `bases/radix/ui/slider.tsx` (MIT, see LICENSE-shadcn.md),
// with the header row (label + live value) the Escala slider ships.
import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export interface SliderProps extends Omit<React.ComponentProps<typeof SliderPrimitive.Root>, 'value' | 'defaultValue' | 'onValueChange'> {
  label?: React.ReactNode
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** How the live value reads beside the label (`"60%"`). */
  format?: (value: number) => string
}

function Slider({
  label, value, defaultValue = 0, onValueChange, format = (n) => `${n}%`, className, min = 0, max = 100, ...props
}: SliderProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  return (
    <div data-slot="slider" data-escala="Slider" className={cn('flex min-w-0 flex-col', className)}>
      {(label != null) && (
        <div className="flex justify-between">
          <span data-part="Slider.label">{label}</span>
          <span data-part="Slider.value" className="tabular-nums">{format(current)}</span>
        </div>
      )}
      <SliderPrimitive.Root
        value={[current]}
        min={min}
        max={max}
        onValueChange={([v]) => { setInner(v); onValueChange?.(v) }}
        className="relative flex w-full touch-none items-center py-[var(--spacing-2)] select-none"
        aria-label={typeof label === 'string' ? label : undefined}
        {...props}
      >
        <SliderPrimitive.Track data-part="Slider.track" className="relative w-full grow overflow-hidden">
          <SliderPrimitive.Range data-part="Slider.range" className="absolute h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-part="Slider.thumb"
          className="block outline-none transition-[transform,box-shadow] duration-150 hover:scale-105 active:scale-110"
        />
      </SliderPrimitive.Root>
    </div>
  )
}

export { Slider }
