// Skeleton: shadcn/ui `bases/radix/ui/input-group.tsx` (MIT, see LICENSE-shadcn.md):
// InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton. Appearance: recipe.
import * as React from 'react'
import { cn } from '../../lib/utils'

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="group"
      data-slot="input-group"
      data-escala="InputGroup"
      className={cn('flex min-w-0 items-stretch overflow-hidden', className)}
      {...props}
    />
  )
}

function InputGroupAddon({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="input-group-addon" data-part="InputGroup.addon" className={cn('inline-flex items-center whitespace-nowrap', className)} {...props} />
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-control"
      data-part="InputGroup.input"
      className={cn('min-w-0 flex-1 border-0 bg-transparent outline-none', className)}
      {...props}
    />
  )
}

function InputGroupButton({ className, type = 'button', ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      data-slot="input-group-button"
      data-part="InputGroup.button"
      className={cn('inline-flex cursor-pointer items-center border-0 bg-transparent outline-none', className)}
      {...props}
    />
  )
}

function InputGroupSeparator({ className, ...props }: React.ComponentProps<'span'>) {
  return <span role="separator" aria-orientation="vertical" data-part="InputGroup.separator" className={cn('self-stretch', className)} {...props} />
}

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton, InputGroupSeparator }
