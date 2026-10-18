// Skeleton: shadcn/ui `bases/radix/ui/hover-card.tsx` (MIT, see LICENSE-shadcn.md):
// a preview card opened by hovering a link. Portals into the theme scope;
// `inline` draws it in place (docs, previews). Appearance: recipe (HoverCard).
import * as React from 'react'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { usePortalContainer } from './portal-scope'

function HoverCard(props: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger(props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

function HoverCardContent({
  className, align = 'center', sideOffset = 4, inline = false, ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content> & { inline?: boolean }) {
  const container = usePortalContainer()
  const cls = cn('z-50 flex w-64 flex-col outline-none', className)
  if (inline) {
    const { asChild: _a, forceMount: _f, ...rest } = props
    return <div data-slot="hover-card-content" data-escala="HoverCard" className={cls} {...(rest as React.ComponentProps<'div'>)} />
  }
  return (
    <HoverCardPrimitive.Portal container={container}>
      <HoverCardPrimitive.Content data-slot="hover-card-content" data-escala="HoverCard" align={align} sideOffset={sideOffset} className={cls} {...props} />
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
