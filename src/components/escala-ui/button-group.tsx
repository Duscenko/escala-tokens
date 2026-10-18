// Skeleton: shadcn/ui `bases/radix/ui/button-group.tsx` (MIT, see LICENSE-shadcn.md):
// ButtonGroup + ButtonGroupSeparator, items are buttons. Appearance: recipe.
import * as React from 'react'
import { cn } from '../../lib/utils'

export type ButtonGroupSize = 'sm' | 'md' | 'lg'
const SIZE: Record<ButtonGroupSize, string> = { sm: 'SM', md: 'MD', lg: 'LG' }

function ButtonGroup({
  className, size = 'md', ...props
}: React.ComponentProps<'div'> & { size?: ButtonGroupSize }) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-escala="ButtonGroup"
      data-size={SIZE[size]}
      className={cn('inline-flex items-stretch overflow-hidden', className)}
      {...props}
    />
  )
}

/** One segment. `selected` is the group's current choice. */
function ButtonGroupItem({
  className, selected = false, ...props
}: React.ComponentProps<'button'> & { selected?: boolean }) {
  return (
    <button
      type="button"
      data-slot="button-group-item"
      data-part={selected ? 'ButtonGroup.itemSelected' : 'ButtonGroup.item'}
      aria-pressed={selected}
      className={cn(
        'inline-flex cursor-pointer items-center whitespace-nowrap border-0 outline-none',
        'transition-colors duration-150',
        className,
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      data-slot="button-group-separator"
      data-part="ButtonGroup.separator"
      className={cn('self-stretch', className)}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupItem, ButtonGroupSeparator }
