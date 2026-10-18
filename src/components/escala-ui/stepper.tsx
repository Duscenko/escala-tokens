// Escala component: numbered steps joined by a connector. The `current` step is
// 1-based; earlier steps are done. Appearance: recipe (Stepper).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface StepperProps extends React.ComponentProps<'ol'> {
  steps: string[]
  /** 1-based index of the current step. */
  current: number
  /** The glyph for a finished step (a check). */
  doneIcon?: React.ReactNode
  /** Stretch to this width: steps share it and the connectors flex. */
  width?: number | string
}

function Stepper({ steps, current, doneIcon = '✓', width, className, style, ...props }: StepperProps) {
  const stretch = width != null
  return (
    <ol data-slot="stepper" data-escala="Stepper" className={cn('m-0 flex list-none items-center p-0', className)} style={{ width, ...style }} {...props}>
      {steps.map((label, i) => {
        const state = i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'todo'
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined} className={cn('flex min-w-0 items-center', stretch && 'flex-1')}>
            <span data-part="Stepper.step" className={cn('flex flex-col items-center', stretch ? 'w-full' : 'w-[5.25rem]')}>
              <span data-part="Stepper.node" data-state={state} className="inline-flex items-center justify-center">{state === 'done' ? doneIcon : i + 1}</span>
              <span data-part="Stepper.label" data-state={state}>{label}</span>
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden data-part="Stepper.connector" data-state={state} className={cn('mb-5', stretch ? 'min-w-3 flex-1' : 'w-10')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export { Stepper }
