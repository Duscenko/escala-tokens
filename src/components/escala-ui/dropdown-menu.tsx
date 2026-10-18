// Skeleton: shadcn/ui `bases/radix/ui/dropdown-menu.tsx` (MIT, see LICENSE-shadcn.md).
// The panel portals into the theme scope (portal-scope.ts). Appearance: recipe (DropdownMenu).
import * as React from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group

function DropdownMenuContent({ sideOffset = 6, className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const container = usePortalContainer()
  return (
    <DropdownMenuPrimitive.Portal container={container}>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        data-escala="DropdownMenu"
        sideOffset={sideOffset}
        className={cn('z-50 min-w-40 overflow-hidden outline-none', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuItem({ variant, className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: 'danger' }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-part="DropdownMenu.item"
      data-variant={variant}
      className={cn('flex cursor-pointer items-center justify-between outline-none select-none data-[disabled]:cursor-not-allowed', className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" data-part="DropdownMenu.separator" className={cn('my-1', className)} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="dropdown-menu-shortcut" data-part="DropdownMenu.shortcut" className={className} {...props} />
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger }
