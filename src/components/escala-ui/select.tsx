// Skeleton: shadcn/ui `bases/radix/ui/select.tsx` (MIT, see LICENSE-shadcn.md).
// The list portals INTO the theme scope (portal-scope.ts), so a Select opened in
// a preview paints with the previewed theme. Appearance: recipe.
import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

export const SELECT_SIZES = ['default', 'sm'] as const
export type SelectSize = (typeof SELECT_SIZES)[number]

export interface SelectTriggerProps extends React.ComponentProps<typeof SelectPrimitive.Trigger> {
  /** shadcn's trigger sizes. */
  size?: SelectSize
  forceState?: 'Default' | 'Hover' | 'Focused' | 'Error' | 'Disabled'
  /** The chevron. */
  icon?: React.ReactNode
}

function SelectTrigger({ size = 'default', forceState, icon, className, children, disabled, ...props }: SelectTriggerProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-escala="Select"
      data-size={size}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      aria-invalid={forceState === 'Error' ? true : props['aria-invalid']}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-between text-left outline-none',
        'aria-disabled:cursor-not-allowed cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <span data-part="Select.icon" className="inline-flex shrink-0">{icon ?? '⌄'}</span>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, position = 'popper', ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const container = usePortalContainer()
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-part="Select.content"
        position={position}
        sideOffset={4}
        className={cn('relative z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden', className)}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-part="Select.item"
      className={cn('relative flex w-full cursor-pointer items-center outline-none select-none data-[disabled]:cursor-not-allowed', className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue }
