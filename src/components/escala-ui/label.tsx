// Skeleton: shadcn/ui `bases/radix/ui/label.tsx` (MIT, see LICENSE-shadcn.md).
// Appearance: recipe (Label).
import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      data-escala="Label"
      className={cn('flex items-center gap-2 select-none peer-disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
}

export { Label }
