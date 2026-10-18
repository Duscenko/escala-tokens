// Skeleton: shadcn/ui `bases/radix/ui/toggle-group.tsx` (MIT, see LICENSE-shadcn.md):
// the Radix ToggleGroup with shadcn's toggle `variant` default | outline and
// `size` default | sm | lg (`data-variant`, `data-size` on the group; items
// inherit them). Radix writes `data-state="on"` on a pressed item.
// Appearance: recipe (ToggleGroup).
import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const TOGGLE_GROUP_VARIANTS = ['default', 'outline'] as const
export const TOGGLE_GROUP_SIZES = ['default', 'sm', 'lg'] as const
export type ToggleGroupVariant = (typeof TOGGLE_GROUP_VARIANTS)[number]
export type ToggleGroupSize = (typeof TOGGLE_GROUP_SIZES)[number]

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleGroupVariant
  size?: ToggleGroupSize
}

function ToggleGroup({ className, variant = 'default', size = 'default', orientation = 'horizontal', ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-escala="ToggleGroup"
      data-variant={variant}
      data-size={size}
      data-orientation={orientation}
      orientation={orientation}
      className={cn('flex w-fit items-center data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch', className)}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-part="ToggleGroup.item"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap outline-none transition-colors duration-150',
        'focus-visible:z-10 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
