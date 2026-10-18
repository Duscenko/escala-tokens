// Skeleton: shadcn/ui `bases/radix/ui/avatar.tsx` (MIT, see LICENSE-shadcn.md):
// Avatar, AvatarImage, AvatarFallback, `size` default | sm | lg as in shadcn.
// Appearance: recipe (Avatar).
import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const AVATAR_SIZES = ['default', 'sm', 'lg'] as const
export type AvatarSize = (typeof AVATAR_SIZES)[number]

function Avatar({ size = 'default', className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root> & { size?: AvatarSize }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-escala="Avatar"
      data-size={size}
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none', className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image data-slot="avatar-image" data-part="Avatar.image" className={cn('aspect-square size-full object-cover', className)} {...props} />
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return <AvatarPrimitive.Fallback data-slot="avatar-fallback" data-part="Avatar.fallback" className={cn('flex size-full items-center justify-center', className)} {...props} />
}

export { Avatar, AvatarImage, AvatarFallback }
