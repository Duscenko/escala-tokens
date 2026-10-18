// shadcn/ui ships a Spinner (a spinning icon); Escala's is a ring with a coloured
// arc, sized by its own recipe (Spinner).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SpinnerProps extends React.ComponentProps<'span'> {
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label (screen readers only). */
  label?: string
}

function Spinner({ size = 'md', label = 'Loading…', className, ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      data-slot="spinner"
      data-escala="Spinner"
      data-size={size.toUpperCase()}
      className={cn('inline-block animate-spin motion-reduce:animate-none', className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </span>
  )
}

export { Spinner }
