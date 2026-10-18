// Skeleton: shadcn/ui `bases/radix/ui/radio-group.tsx` (MIT, see LICENSE-shadcn.md):
// RadioGroup + RadioGroupItem, no labels (use `Label` / a horizontal `Field`).
// Appearance: recipe (RadioGroup) — the item's checked look keys on Radix's
// own `data-state="checked"`.
import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      data-escala="RadioGroup"
      className={cn('grid w-full', className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      data-part="RadioGroup.item"
      className={cn(
        'group/radio-group-item peer relative inline-flex aspect-square shrink-0 items-center justify-center p-0 outline-none',
        'transition-[background-color,border-color,box-shadow] duration-150 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" data-part="RadioGroup.indicator" className="block" />
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
