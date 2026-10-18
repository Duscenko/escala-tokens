// Escala component (shadcn's ToggleGroup, single): option toggles on a track with
// a sliding selection. Appearance: recipe (SegmentedControl).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { SlidingSelection } from './sliding-selection'

export interface SegmentedControlProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  options: string[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: 'md' | 'sm'
}

function SegmentedControl({ options, value, defaultValue, onValueChange, size = 'md', className, ...props }: SegmentedControlProps) {
  const [inner, setInner] = React.useState(defaultValue ?? options[0])
  const active = value ?? inner
  const ref = React.useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      role="radiogroup"
      data-slot="segmented-control"
      data-escala="SegmentedControl"
      data-size={size === 'sm' ? 'SM' : 'MD'}
      className={cn('relative inline-flex', className)}
      {...props}
    >
      <SlidingSelection trackRef={ref} selection={active} part="SegmentedControl.pill" />
      {options.map((o) => {
        const on = o === active
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            data-part="SegmentedControl.item"
            data-sliding-active={on ? 'true' : undefined}
            onClick={() => { setInner(o); onValueChange?.(o) }}
            className="relative cursor-pointer border-0 bg-transparent outline-none transition-colors duration-150"
          >
            <span className="relative">{o}</span>
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
