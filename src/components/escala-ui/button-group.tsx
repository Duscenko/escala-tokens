// Skeleton: shadcn/ui `bases/radix/ui/button-group.tsx` (MIT, see LICENSE-shadcn.md).
// ButtonGroup · ButtonGroupText · ButtonGroupSeparator, items are Buttons. The
// attached-edge layout is shadcn's own (structure, not appearance); colour and
// geometry come from the recipes (ButtonGroup, Button).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

export const BUTTON_GROUP_ORIENTATIONS = ['horizontal', 'vertical'] as const
export type ButtonGroupOrientation = (typeof BUTTON_GROUP_ORIENTATIONS)[number]

// `!`: the recipe sheet (unlayered) paints each Button's radius and border; the
// group's joins must win over it, as shadcn's own style sheet does with `!`.
const ORIENTATION: Record<ButtonGroupOrientation, string> = {
  horizontal:
    '[&>*:not(:first-child)]:rounded-l-none! [&>*:not(:first-child)]:border-l-0! [&>*:not(:last-child)]:rounded-r-none!',
  vertical:
    'flex-col [&>*:not(:first-child)]:rounded-t-none! [&>*:not(:first-child)]:border-t-0! [&>*:not(:last-child)]:rounded-b-none!',
}

function ButtonGroup({
  className, orientation = 'horizontal', ...props
}: React.ComponentProps<'div'> & { orientation?: ButtonGroupOrientation }) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-escala="ButtonGroup"
      data-orientation={orientation}
      className={cn(
        'group/button-group flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 [&>input]:flex-1',
        ORIENTATION[orientation],
        className,
      )}
      {...props}
    />
  )
}

function ButtonGroupText({
  className, asChild = false, ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="button-group-text"
      data-part="ButtonGroup.text"
      className={cn('flex items-center [&_svg]:pointer-events-none', className)}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className, orientation = 'vertical', ...props
}: React.ComponentProps<'div'> & { orientation?: ButtonGroupOrientation }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-slot="button-group-separator"
      data-part="ButtonGroup.separator"
      data-orientation={orientation}
      className={cn('relative self-stretch', className)}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText }
