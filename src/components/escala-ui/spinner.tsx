// Skeleton: shadcn/ui `bases/radix/ui/spinner.tsx` (MIT, see LICENSE-shadcn.md):
// a spinning loader glyph, `size-4` unless the class says otherwise, no
// variants. The glyph is lucide's Loader2 path (shadcn's default icon) drawn
// with currentColor. Appearance: recipe (Spinner).
import * as React from 'react'
import { cn } from '../../lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      data-slot="spinner"
      data-escala="Spinner"
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 animate-spin motion-reduce:animate-none', className)}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export { Spinner }
