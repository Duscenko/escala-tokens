// Skeleton: shadcn/ui `bases/radix/ui/item.tsx` (MIT, see LICENSE-shadcn.md):
// a list row — media, title, description and actions — `variant` default |
// outline | muted × `size` default | sm | xs; ItemMedia `variant` default |
// icon | image. Appearance: recipe (Item).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'
import { Separator } from './separator'

export const ITEM_VARIANTS = ['default', 'outline', 'muted'] as const
export const ITEM_SIZES = ['default', 'sm', 'xs'] as const
export type ItemVariant = (typeof ITEM_VARIANTS)[number]
export type ItemSize = (typeof ITEM_SIZES)[number]

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="list" data-slot="item-group" className={cn('flex w-full flex-col gap-2', className)} {...props} />
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn('my-2', className)} {...props} />
}

function Item({
  className, variant = 'default', size = 'default', asChild = false, ...props
}: React.ComponentProps<'div'> & { variant?: ItemVariant; size?: ItemSize; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="item"
      data-escala="Item"
      data-variant={variant}
      data-size={size}
      className={cn('flex w-full flex-wrap items-center outline-none transition-colors duration-100', className)}
      {...props}
    />
  )
}

function ItemMedia({ className, variant = 'default', ...props }: React.ComponentProps<'div'> & { variant?: 'default' | 'icon' | 'image' }) {
  return (
    <div
      data-slot="item-media"
      data-part="Item.media"
      data-variant={variant}
      className={cn('flex shrink-0 items-center justify-center overflow-hidden [&_img]:size-full [&_img]:object-cover', className)}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-content" data-part="Item.content" className={cn('flex flex-1 flex-col', className)} {...props} />
}

function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-title" data-part="Item.title" className={cn('line-clamp-1 flex w-fit items-center', className)} {...props} />
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="item-description" data-part="Item.description" className={cn('m-0 line-clamp-2 [&>a]:underline [&>a]:underline-offset-4', className)} {...props} />
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-actions" data-part="Item.actions" className={cn('flex items-center', className)} {...props} />
}

function ItemHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-header" className={cn('flex basis-full items-center justify-between', className)} {...props} />
}

function ItemFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-footer" className={cn('flex basis-full items-center justify-between', className)} {...props} />
}

export { Item, ItemMedia, ItemContent, ItemActions, ItemGroup, ItemSeparator, ItemTitle, ItemDescription, ItemHeader, ItemFooter }
