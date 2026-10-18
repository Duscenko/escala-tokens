// Skeleton: shadcn/ui `bases/radix/ui/avatar.tsx` (MIT, see LICENSE-shadcn.md):
// Avatar, AvatarImage, AvatarFallback. Appearance: recipe (Avatar).
import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

function Avatar({ size = 'md', className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root> & { size?: AvatarSize }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-escala="Avatar"
      data-size={size.toUpperCase()}
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
