// Skeleton: shadcn/ui `bases/radix/ui/dropdown-menu.tsx` (MIT, see LICENSE-shadcn.md).
// The panel portals into the theme scope (portal-scope.ts); `inline` draws it in
// place, open, with no Radix state (docs, previews), like Popover and Tooltip.
// Appearance: recipe (DropdownMenu).
import * as React from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group

/** True inside an `inline` panel: the parts render as plain elements, not Radix items. */
const Inline = React.createContext(false)

const CONTENT = 'z-50 min-w-40 overflow-hidden outline-none'
const ITEM = 'flex cursor-pointer items-center justify-between outline-none select-none data-[disabled]:cursor-not-allowed'

export interface DropdownMenuContentProps extends React.ComponentProps<typeof DropdownMenuPrimitive.Content> {
  inline?: boolean
}

function DropdownMenuContent({ inline, sideOffset = 6, className, children, ...props }: DropdownMenuContentProps) {
  const container = usePortalContainer()
  if (inline) {
    return (
      <Inline.Provider value>
        <div role="menu" data-slot="dropdown-menu-content" data-escala="DropdownMenu" className={cn(CONTENT, className)} style={props.style}>
          {children}
        </div>
      </Inline.Provider>
    )
  }
  return (
    <DropdownMenuPrimitive.Portal container={container}>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        data-escala="DropdownMenu"
        sideOffset={sideOffset}
        className={cn(CONTENT, className)}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

/** `highlighted` forces the highlighted look (inline only; live menus get it from focus). */
function DropdownMenuItem({ variant, highlighted, className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: 'default' | 'destructive'; highlighted?: boolean }) {
  const inline = React.useContext(Inline)
  const attrs = {
    'data-slot': 'dropdown-menu-item',
    'data-part': 'DropdownMenu.item',
    'data-variant': variant,
    className: cn(ITEM, className),
  }
  if (inline) {
    const { asChild: _a, onSelect: _s, textValue: _t, ...rest } = props
    return <div role="menuitem" {...attrs} data-highlighted={highlighted ? '' : undefined} {...(rest as React.ComponentProps<'div'>)} />
  }
  return <DropdownMenuPrimitive.Item {...attrs} {...props} />
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  const inline = React.useContext(Inline)
  const attrs = { 'data-slot': 'dropdown-menu-separator', 'data-part': 'DropdownMenu.separator', className: cn('my-1', className) }
  if (inline) return <div role="separator" {...attrs} />
  return <DropdownMenuPrimitive.Separator {...attrs} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="dropdown-menu-shortcut" data-part="DropdownMenu.shortcut" className={className} {...props} />
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger }
