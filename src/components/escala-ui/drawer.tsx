// Skeleton: shadcn/ui `bases/radix/ui/drawer.tsx` (MIT, see LICENSE-shadcn.md):
// vaul's Drawer — a panel dragged in from an edge (`direction` bottom | top |
// left | right) with a handle on the bottom one. `inline` draws it in place,
// open, with no vaul state (docs, previews). Appearance: recipe (Drawer).
import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

export type DrawerDirection = 'bottom' | 'top' | 'left' | 'right'

const Inline = React.createContext(false)

function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return <DrawerPrimitive.Overlay data-slot="drawer-overlay" data-part="Drawer.overlay" className={cn('fixed inset-0 z-50', className)} {...props} />
}

const EDGE: Record<DrawerDirection, string> = {
  bottom: 'inset-x-0 bottom-0 mt-24 max-h-[80vh]',
  top: 'inset-x-0 top-0 mb-24 max-h-[80vh]',
  left: 'inset-y-0 left-0 w-3/4 sm:max-w-sm',
  right: 'inset-y-0 right-0 w-3/4 sm:max-w-sm',
}

function DrawerContent({
  className, children, inline = false, direction = 'bottom', ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & { inline?: boolean; direction?: DrawerDirection }) {
  const container = usePortalContainer()
  const handle = direction === 'bottom' ? <div data-part="Drawer.handle" className="mx-auto mt-4 h-1 w-[100px] shrink-0" /> : null
  const cls = cn('flex h-auto flex-col outline-none', className)
  if (inline) {
    return (
      <Inline.Provider value>
        <div data-slot="drawer-content" data-escala="Drawer" data-direction={direction} className={cls} style={props.style}>
          {handle}
          {children}
        </div>
      </Inline.Provider>
    )
  }
  return (
    <DrawerPrimitive.Portal container={container}>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        data-escala="Drawer"
        data-direction={direction}
        className={cn('fixed z-50', EDGE[direction], cls)}
        {...props}
      >
        {handle}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="drawer-header" data-part="Drawer.header" className={cn('flex flex-col', className)} {...props} />
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="drawer-footer" data-part="Drawer.footer" className={cn('mt-auto flex flex-col', className)} {...props} />
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  const inline = React.useContext(Inline)
  const attrs = { 'data-slot': 'drawer-title', 'data-part': 'Drawer.title', className: cn('m-0', className) }
  if (inline) return <h2 {...attrs} {...(props as React.ComponentProps<'h2'>)} />
  return <DrawerPrimitive.Title {...attrs} {...props} />
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  const inline = React.useContext(Inline)
  const attrs = { 'data-slot': 'drawer-description', 'data-part': 'Drawer.description', className: cn('m-0', className) }
  if (inline) return <p {...attrs} {...(props as React.ComponentProps<'p'>)} />
  return <DrawerPrimitive.Description {...attrs} {...props} />
}

export { Drawer, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription }
