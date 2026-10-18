// Skeleton: shadcn/ui `bases/radix/ui/progress.tsx` (MIT, see LICENSE-shadcn.md),
// with the label + value header. Appearance: recipe (Progress).
import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  label?: React.ReactNode
  /** Show the percentage beside the label. */
  showValue?: boolean
}

function Progress({ label, showValue = true, value = 0, className, ...props }: ProgressProps) {
  return (
    <div data-slot="progress" data-escala="Progress" className={cn('flex min-w-0 flex-col', className)}>
      {(label != null || showValue) && (
        <div data-part="Progress.header" className="flex items-baseline justify-between">
          <span data-part="Progress.label" className="min-w-0">{label}</span>
          {showValue && value != null && <span data-part="Progress.value" className="shrink-0">{Math.round(value)}%</span>}
        </div>
      )}
      <ProgressPrimitive.Root value={value} data-part="Progress.track" className="relative w-full overflow-hidden" {...props}>
        <ProgressPrimitive.Indicator
          data-part="Progress.indicator"
          className="h-full transition-[width] duration-300"
          style={{ width: `${value ?? 0}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
}

export { Progress }
