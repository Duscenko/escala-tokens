// Skeleton: shadcn/ui `bases/radix/ui/context-menu.tsx` (MIT, see LICENSE-shadcn.md).
// The panel portals into the theme scope (portal-scope.ts); `inline` draws it in
// place, open, with no Radix state (docs, previews), like Popover and Tooltip.
// Appearance: recipe (ContextMenu).
import * as React from 'react'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const ContextMenu = ContextMenuPrimitive.Root
const ContextMenuTrigger = ContextMenuPrimitive.Trigger
const ContextMenuGroup = ContextMenuPrimitive.Group

/** True inside an `inline` panel: the parts render as plain elements, not Radix items. */
const Inline = React.createContext(false)

const CONTENT = 'z-50 min-w-40 overflow-hidden outline-none'
const ITEM = 'flex cursor-pointer items-center justify-between outline-none select-none data-[disabled]:cursor-not-allowed'

export interface ContextMenuContentProps extends React.ComponentProps<typeof ContextMenuPrimitive.Content> {
  inline?: boolean
}

function ContextMenuContent({ inline, className, children, ...props }: ContextMenuContentProps) {
  const container = usePortalContainer()
  if (inline) {
    return (
      <Inline.Provider value>
        <div role="menu" data-slot="context-menu-content" data-escala="ContextMenu" className={cn(CONTENT, className)} style={props.style}>
          {children}
        </div>
      </Inline.Provider>
    )
  }
  return (
    <ContextMenuPrimitive.Portal container={container}>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        data-escala="ContextMenu"
        
        className={cn(CONTENT, className)}
        {...props}
      >
        {children}
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  )
}

/** `highlighted` forces the highlighted look (inline only; live menus get it from focus). */
function ContextMenuItem({ variant, highlighted, className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Item> & { variant?: 'danger'; highlighted?: boolean }) {
  const inline = React.useContext(Inline)
  const attrs = {
    'data-slot': 'context-menu-item',
    'data-part': 'ContextMenu.item',
    'data-variant': variant,
    className: cn(ITEM, className),
  }
  if (inline) {
    const { asChild: _a, onSelect: _s, textValue: _t, ...rest } = props
    return <div role="menuitem" {...attrs} data-highlighted={highlighted ? '' : undefined} {...(rest as React.ComponentProps<'div'>)} />
  }
  return <ContextMenuPrimitive.Item {...attrs} {...props} />
}

function ContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  const inline = React.useContext(Inline)
  const attrs = { 'data-slot': 'context-menu-separator', 'data-part': 'ContextMenu.separator', className: cn('my-1', className) }
  if (inline) return <div role="separator" {...attrs} />
  return <ContextMenuPrimitive.Separator {...attrs} {...props} />
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="context-menu-shortcut" data-part="ContextMenu.shortcut" className={className} {...props} />
}

export { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger }
