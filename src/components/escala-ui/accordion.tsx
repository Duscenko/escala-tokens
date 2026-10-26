// Skeleton: shadcn/ui `bases/radix/ui/accordion.tsx` (MIT, see LICENSE-shadcn.md).
// Appearance: recipe (Accordion).
import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" data-escala="Accordion" className={cn('w-full overflow-hidden', className)} {...props} />
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" data-part="Accordion.item" className={className} {...props} />
}

function AccordionTrigger({
  className, children, icon = '⌄', ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & { icon?: React.ReactNode }) {
  return (
    <AccordionPrimitive.Header className="m-0 flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        data-part="Accordion.trigger"
        className={cn(
          'flex w-full cursor-pointer items-center justify-between border-0 bg-transparent text-left outline-none',
          '[&[data-state=open]_[data-part="Accordion.icon"]]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <span data-part="Accordion.icon" className="inline-flex shrink-0">{icon}</span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content data-slot="accordion-content" data-part="Accordion.content" className={className} {...props}>
      {children}
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
