// Skeleton: shadcn/ui `bases/radix/ui/context-menu.tsx` (MIT, see LICENSE-shadcn.md).
// Appearance: recipe (ContextMenu).
import * as React from 'react'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const ContextMenu = ContextMenuPrimitive.Root
const ContextMenuTrigger = ContextMenuPrimitive.Trigger

function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  const container = usePortalContainer()
  return (
    <ContextMenuPrimitive.Portal container={container}>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        data-escala="ContextMenu"
        className={cn('z-50 min-w-40 overflow-hidden outline-none', className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({ variant, className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Item> & { variant?: 'danger' }) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-part="ContextMenu.item"
      data-variant={variant}
      className={cn('flex cursor-pointer items-center justify-between outline-none select-none data-[disabled]:cursor-not-allowed', className)}
      {...props}
    />
  )
}

function ContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" data-part="ContextMenu.separator" className={cn('my-1', className)} {...props} />
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="context-menu-shortcut" data-part="ContextMenu.shortcut" className={className} {...props} />
}

export { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger }
