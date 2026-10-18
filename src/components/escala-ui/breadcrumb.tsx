// Skeleton: shadcn/ui `bases/radix/ui/breadcrumb.tsx` (MIT, see LICENSE-shadcn.md):
// Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
// BreadcrumbSeparator. Appearance: recipe (Breadcrumb).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="Breadcrumb" data-slot="breadcrumb" data-escala="Breadcrumb" className={cn('flex items-center', className)} {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return <ol data-slot="breadcrumb-list" className={cn('m-0 flex list-none flex-wrap items-center p-0', className)} style={{ gap: 'inherit' }} {...props} />
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="breadcrumb-item" className={cn('inline-flex items-center', className)} {...props} />
}

function BreadcrumbLink({ asChild, className, ...props }: React.ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return <Comp data-slot="breadcrumb-link" data-part="Breadcrumb.link" className={cn('cursor-pointer no-underline', className)} {...props} />
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return <span role="link" aria-disabled="true" aria-current="page" data-slot="breadcrumb-page" data-part="Breadcrumb.page" className={className} {...props} />
}

function BreadcrumbSeparator({ children = '/', className, ...props }: React.ComponentProps<'li'>) {
  return <li role="presentation" aria-hidden data-slot="breadcrumb-separator" data-part="Breadcrumb.separator" className={cn('inline-flex', className)} {...props}>{children}</li>
}

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator }
