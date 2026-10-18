// Skeleton: shadcn/ui `bases/radix/ui/separator.tsx` (MIT, see LICENSE-shadcn.md):
// the Radix Separator, `orientation` horizontal | vertical (Radix writes the
// same lowercase `data-orientation` the recipe reads). Appearance: recipe (Separator).
import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function Separator({
  className, orientation = 'horizontal', decorative = true, ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-escala="Separator"
      decorative={decorative}
      orientation={orientation}
      className={cn('shrink-0 data-[orientation=horizontal]:w-full data-[orientation=vertical]:self-stretch', className)}
      {...props}
    />
  )
}

export { Separator }
