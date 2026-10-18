// Escala component on the shadcn Input / Button skeleton: a number field with
// decrement and increment. Appearance: its recipe (InputStepper).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputStepperProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number) => void
  decrementIcon?: React.ReactNode
  incrementIcon?: React.ReactNode
}

function InputStepper({
  value, defaultValue = 0, min = -Infinity, max = Infinity, step = 1, onValueChange,
  decrementIcon = '−', incrementIcon = '+', className, ...props
}: InputStepperProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  const set = (n: number) => {
    const next = Math.min(max, Math.max(min, n))
    setInner(next)
    onValueChange?.(next)
  }
  return (
    <div role="group" data-slot="input-stepper" data-escala="InputStepper" className={cn('inline-flex items-stretch overflow-hidden', className)} {...props}>
      <button
        type="button" aria-label="Decrease" disabled={current <= min}
        data-part="InputStepper.button" className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
        onClick={() => set(current - step)}
      >{decrementIcon}</button>
      <span data-part="InputStepper.separator" />
      <output data-part="InputStepper.value" aria-live="polite" className="inline-flex items-center justify-center tabular-nums">{current}</output>
      <span data-part="InputStepper.separator" />
      <button
        type="button" aria-label="Increase" disabled={current >= max}
        data-part="InputStepper.button" className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
        onClick={() => set(current + step)}
      >{incrementIcon}</button>
    </div>
  )
}

export { InputStepper }
