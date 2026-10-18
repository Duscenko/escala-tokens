// Skeleton: shadcn/ui `bases/radix/ui/table.tsx` (MIT, see LICENSE-shadcn.md):
// Table · Header · Body · Footer · Row · Head · Cell · Caption. Rows take
// `data-state="selected"`, as shadcn. Appearance: recipe (Table).
import * as React from 'react'
import { cn } from '../../lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" data-escala="Table" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom border-collapse text-left', className)} {...props} />
    </div>
  )
}

function TableHeader(props: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-b-0', className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return <tfoot data-slot="table-footer" data-part="Table.footer" className={cn('[&>tr]:last:border-b-0', className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" data-part="Table.row" className={cn('transition-colors', className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th data-slot="table-head" data-part="Table.head" className={cn('text-left align-middle whitespace-nowrap', className)} {...props} />
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td data-slot="table-cell" data-part="Table.cell" className={cn('align-middle whitespace-nowrap', className)} {...props} />
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return <caption data-slot="table-caption" data-part="Table.caption" className={cn('mt-4', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
