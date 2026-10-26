// Skeleton: shadcn/ui `bases/radix/ui/navigation-menu.tsx` (MIT, see LICENSE-shadcn.md):
// the Radix NavigationMenu — triggers that open a panel of links in a shared
// viewport. Appearance: recipe (NavigationMenu).
import * as React from 'react'
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function NavigationMenu({
  className, children, viewport = true, ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & { viewport?: boolean }) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-escala="NavigationMenu"
      data-viewport={viewport}
      className={cn('relative flex max-w-max flex-1 items-center justify-center', className)}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return <NavigationMenuPrimitive.List data-slot="navigation-menu-list" className={cn('m-0 flex flex-1 list-none items-center justify-center p-0', className)} {...props} />
}

function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={cn('relative', className)} {...props} />
}

function NavigationMenuTrigger({
  className, children, icon = '⌄', ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger> & { icon?: React.ReactNode }) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      data-part="NavigationMenu.trigger"
      className={cn('group inline-flex w-max cursor-pointer items-center justify-center border-0 bg-transparent outline-none disabled:pointer-events-none', className)}
      {...props}
    >
      {children}
      <span aria-hidden className="ml-1 inline-flex [transition:transform_var(--motion-use-disclosure-in,150ms_cubic-bezier(0.4,0,0.2,1))] group-data-[state=open]:rotate-180">{icon}</span>
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return <NavigationMenuPrimitive.Content data-slot="navigation-menu-content" data-part="NavigationMenu.content" className={cn('top-0 left-0 w-full md:absolute md:w-auto', className)} {...props} />
}

function NavigationMenuViewport({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className="absolute top-full left-0 isolate z-50 flex justify-center">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        data-part="NavigationMenu.viewport"
        className={cn('relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden md:w-(--radix-navigation-menu-viewport-width)', className)}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return <NavigationMenuPrimitive.Link data-slot="navigation-menu-link" data-part="NavigationMenu.link" className={cn('flex flex-col no-underline outline-none', className)} {...props} />
}

export {
  NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuContent, NavigationMenuTrigger,
  NavigationMenuLink, NavigationMenuViewport,
}
