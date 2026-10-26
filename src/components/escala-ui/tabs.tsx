// Skeleton: shadcn/ui `bases/radix/ui/tabs.tsx` (MIT, see LICENSE-shadcn.md):
// TabsList `variant` default (a muted track, the active trigger raised) | line
// (an underline). The list carries the recipe (Tabs).
import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />
}

export const TABS_LIST_VARIANTS = ['default', 'line'] as const
export type TabsListVariant = (typeof TABS_LIST_VARIANTS)[number]

function TabsList({ className, variant = 'default', ...props }: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsListVariant }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-escala="Tabs"
      data-variant={variant}
      className={cn('group/tabs-list inline-flex w-fit items-center', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-part="Tabs.trigger"
      className={cn(
        'inline-flex flex-1 cursor-pointer items-center justify-center whitespace-nowrap bg-transparent outline-none',
        ' disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
