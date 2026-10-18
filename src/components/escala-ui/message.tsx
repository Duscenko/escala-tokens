// Skeleton: shadcn/ui `bases/radix/ui/message.tsx` (MIT, see LICENSE-shadcn.md):
// one chat message — avatar, header, the content (a Bubble) and a footer —
// `align` start | end. Appearance: recipe (Message).
import * as React from 'react'
import { cn } from '../../lib/utils'

function MessageGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="message-group" className={cn('flex min-w-0 flex-col gap-4', className)} {...props} />
}

function Message({ className, align = 'start', ...props }: React.ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-slot="message"
      data-escala="Message"
      data-align={align}
      className={cn('group/message relative flex w-full min-w-0', align === 'end' && 'flex-row-reverse', className)}
      {...props}
    />
  )
}

function MessageAvatar({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="message-avatar" data-part="Message.avatar" className={cn('flex w-fit shrink-0 items-center justify-center self-end overflow-hidden', className)} {...props} />
}

function MessageContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-content"
      data-part="Message.content"
      className={cn('flex w-full min-w-0 flex-col break-words group-data-[align=end]/message:items-end', className)}
      {...props}
    />
  )
}

function MessageHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="message-header" data-part="Message.header" className={cn('flex max-w-full min-w-0 items-center', className)} {...props} />
}

function MessageFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="message-footer" data-part="Message.footer" className={cn('flex max-w-full min-w-0 items-center group-data-[align=end]/message:justify-end', className)} {...props} />
}

export { MessageGroup, Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader }
