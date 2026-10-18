// Skeleton: shadcn/ui `bases/radix/ui/menubar.tsx` (MIT, see LICENSE-shadcn.md):
// the Radix Menubar — a bar of triggers, each opening a menu (items with
// `variant` default | destructive, separators, shortcuts). Menus portal into the
// theme scope; `inline` draws one in place, open (docs, previews), like
// DropdownMenu. Appearance: recipe (Menubar).
import * as React from 'react'
import { Menubar as MenubarPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

const Inline = React.createContext(false)

function Menubar({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return <MenubarPrimitive.Root data-slot="menubar" data-escala="Menubar" className={cn('flex w-fit items-center', className)} {...props} />
}

function MenubarMenu(props: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />
}

const MenubarGroup = MenubarPrimitive.Group
const MenubarRadioGroup = MenubarPrimitive.RadioGroup
const MenubarSub = MenubarPrimitive.Sub

/** `active` forces the open look on a trigger (inline previews, where no menu is open). */
function MenubarTrigger({ className, active, ...props }: React.ComponentProps<typeof MenubarPrimitive.Trigger> & { active?: boolean }) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      data-part="Menubar.trigger"
      data-active={active ? 'true' : undefined}
      className={cn('flex cursor-pointer items-center border-0 bg-transparent outline-none select-none', className)}
      {...props}
    />
  )
}

const CONTENT = 'z-50 min-w-48 overflow-hidden outline-none'
const ITEM = 'flex cursor-pointer items-center justify-between outline-none select-none data-[disabled]:cursor-not-allowed'

function MenubarContent({
  className, align = 'start', alignOffset = -4, sideOffset = 8, inline = false, children, ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content> & { inline?: boolean }) {
  const container = usePortalContainer()
  if (inline) {
    return (
      <Inline.Provider value>
        <div role="menu" data-slot="menubar-content" data-part="Menubar.content" className={cn(CONTENT, className)} style={props.style}>
          {children}
        </div>
      </Inline.Provider>
    )
  }
  return (
    <MenubarPrimitive.Portal container={container}>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        data-part="Menubar.content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(CONTENT, className)}
        {...props}
      >
        {children}
      </MenubarPrimitive.Content>
    </MenubarPrimitive.Portal>
  )
}

function MenubarItem({
  className, inset, variant = 'default', highlighted, ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & { inset?: boolean; variant?: 'default' | 'destructive'; highlighted?: boolean }) {
  const inline = React.useContext(Inline)
  const attrs = {
    'data-slot': 'menubar-item',
    'data-part': 'Menubar.item',
    'data-inset': inset ? 'true' : undefined,
    'data-variant': variant,
    className: cn(ITEM, className),
  }
  if (inline) {
    const { asChild: _a, onSelect: _s, textValue: _t, ...rest } = props
    return <div role="menuitem" {...attrs} data-highlighted={highlighted ? '' : undefined} {...(rest as React.ComponentProps<'div'>)} />
  }
  return <MenubarPrimitive.Item {...attrs} {...props} />
}

function MenubarSeparator({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  const inline = React.useContext(Inline)
  const attrs = { 'data-slot': 'menubar-separator', 'data-part': 'Menubar.separator', className: cn('my-1', className) }
  if (inline) return <div role="separator" {...attrs} />
  return <MenubarPrimitive.Separator {...attrs} {...props} />
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="menubar-shortcut" data-part="Menubar.shortcut" className={cn('ml-auto', className)} {...props} />
}

function MenubarLabel({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Label>) {
  return <MenubarPrimitive.Label data-slot="menubar-label" data-part="Menubar.item" className={className} {...props} />
}

function MenubarSubTrigger({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.SubTrigger>) {
  return <MenubarPrimitive.SubTrigger data-slot="menubar-sub-trigger" data-part="Menubar.item" className={cn(ITEM, className)} {...props} />
}

function MenubarSubContent({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return <MenubarPrimitive.SubContent data-slot="menubar-sub-content" data-part="Menubar.content" className={cn(CONTENT, className)} {...props} />
}

export {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarGroup, MenubarSeparator, MenubarLabel, MenubarItem,
  MenubarShortcut, MenubarRadioGroup, MenubarSub, MenubarSubTrigger, MenubarSubContent,
}
