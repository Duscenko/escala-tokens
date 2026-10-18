// shadcn/ui `aspect-ratio.tsx` (MIT, see LICENSE-shadcn.md), as CSS `aspect-ratio`
// (no wrapper needed). Appearance: recipe (AspectRatio).
import * as React from 'react'
import { cn } from '../../lib/utils'

export type RatioName = '16:9' | '4:3' | '1:1'
const RATIO: Record<RatioName, number> = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1 }

export interface AspectRatioProps extends React.ComponentProps<'div'> {
  ratio?: RatioName | number
}

function AspectRatio({ ratio = '16:9', className, style, ...props }: AspectRatioProps) {
  const name = typeof ratio === 'string' ? ratio : undefined
  return (
    <div
      data-slot="aspect-ratio"
      data-escala="AspectRatio"
      data-ratio={name}
      className={cn('flex items-center justify-center overflow-hidden', className)}
      style={{ aspectRatio: String(typeof ratio === 'number' ? ratio : RATIO[ratio]), ...style }}
      {...props}
    />
  )
}

export { AspectRatio }
