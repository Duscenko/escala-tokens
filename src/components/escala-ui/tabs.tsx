// Skeleton: shadcn/ui `bases/radix/ui/tabs.tsx` (MIT, see LICENSE-shadcn.md): the
// underline tabs. The list carries the recipe (Tabs).
import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" data-escala="Tabs" className={cn('flex', className)} {...props} />
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-part="Tabs.trigger"
      className={cn('-mb-px cursor-pointer border-0 bg-transparent outline-none transition-[color,border-color] duration-150 disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
