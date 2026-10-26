// Skeleton: shadcn/ui `bases/radix/ui/sidebar.tsx` (MIT, see LICENSE-shadcn.md):
// the parts a sidebar is built from — Sidebar (`variant` sidebar | floating |
// inset, `side` left | right) · SidebarHeader · SidebarContent · SidebarGroup ·
// SidebarGroupLabel · SidebarGroupContent · SidebarMenu · SidebarMenuItem ·
// SidebarMenuButton (`isActive`, `variant` default | outline, `size` default |
// sm | lg) · SidebarFooter · SidebarSeparator. Static: shadcn's provider,
// trigger and collapse machinery belong to an app shell, not to this library.
// Appearance: recipe (Sidebar).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

export const SIDEBAR_VARIANTS = ['sidebar', 'floating', 'inset'] as const
export type SidebarVariant = (typeof SIDEBAR_VARIANTS)[number]

function Sidebar({
  className, variant = 'sidebar', side = 'left', ...props
}: React.ComponentProps<'div'> & { variant?: SidebarVariant; side?: 'left' | 'right' }) {
  return (
    <div
      data-slot="sidebar"
      data-escala="Sidebar"
      data-variant={variant}
      data-side={side}
      className={cn('group/sidebar flex h-full flex-col', className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" data-part="Sidebar.header" className={cn('flex flex-col', className)} {...props} />
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" data-part="Sidebar.footer" className={cn('flex flex-col', className)} {...props} />
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="none" data-slot="sidebar-separator" data-part="Sidebar.separator" className={cn('shrink-0', className)} {...props} />
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" data-part="Sidebar.content" className={cn('flex min-h-0 flex-1 flex-col overflow-auto', className)} {...props} />
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" data-part="Sidebar.group" className={cn('relative flex w-full min-w-0 flex-col', className)} {...props} />
}

function SidebarGroupLabel({ className, asChild = false, ...props }: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return <Comp data-slot="sidebar-group-label" data-part="Sidebar.label" className={cn('flex shrink-0 items-center outline-none', className)} {...props} />
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('w-full', className)} {...props} />
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" data-part="Sidebar.menu" className={cn('m-0 flex w-full min-w-0 list-none flex-col p-0', className)} {...props} />
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('group/menu-item relative', className)} {...props} />
}

function SidebarMenuButton({
  asChild = false, isActive = false, variant = 'default', size = 'default', className, ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean; isActive?: boolean; variant?: 'default' | 'outline'; size?: 'default' | 'sm' | 'lg'
}) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-part="Sidebar.button"
      data-active={isActive ? 'true' : undefined}
      data-variant={variant}
      data-size={size}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'peer/menu-button flex w-full cursor-pointer items-center overflow-hidden border-0 bg-transparent text-left outline-none',
        ' disabled:cursor-not-allowed [&>span:last-child]:truncate [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

export {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
}
