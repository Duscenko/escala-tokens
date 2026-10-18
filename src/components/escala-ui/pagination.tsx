// Skeleton: shadcn/ui `bases/radix/ui/pagination.tsx` (MIT, see LICENSE-shadcn.md),
// as a compact bar whose current page is a sliding mark. Appearance: recipe (Pagination).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { SlidingSelection } from './sliding-selection'

export interface PaginationProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
  /** Page numbers to show; `'…'` is an ellipsis. */
  pages: (number | '…')[]
  page: number
  onPageChange: (page: number) => void
  prevIcon?: React.ReactNode
  nextIcon?: React.ReactNode
}

function Pagination({ pages, page, onPageChange, prevIcon = '‹', nextIcon = '›', className, ...props }: PaginationProps) {
  const ref = React.useRef<HTMLElement>(null)
  const numbers = pages.filter((p): p is number => p !== '…')
  const at = numbers.indexOf(page)
  const go = (n: number) => onPageChange(numbers[Math.min(numbers.length - 1, Math.max(0, n))] ?? page)
  const cell = 'relative inline-flex cursor-pointer items-center justify-center border-0 bg-transparent outline-none transition-colors duration-150 disabled:cursor-default'
  return (
    <nav ref={ref} aria-label="Pagination" data-slot="pagination" data-escala="Pagination" className={cn('relative flex items-center', className)} {...props}>
      <SlidingSelection trackRef={ref} selection={page} part="Pagination.pill" />
      <button type="button" aria-label="Previous page" data-part="Pagination.cell" className={cell} onClick={() => go(at - 1)}>{prevIcon}</button>
      {pages.map((p, i) => p === '…' ? (
        <button key={`e${i}`} type="button" disabled data-part="Pagination.cell" className={cell}>…</button>
      ) : (
        <button
          key={p} type="button" data-part="Pagination.cell"
          aria-current={p === page ? 'page' : undefined}
          data-sliding-active={p === page ? 'true' : undefined}
          className={cell} onClick={() => onPageChange(p)}
        >
          <span className="relative">{p}</span>
        </button>
      ))}
      <button type="button" aria-label="Next page" data-part="Pagination.cell" className={cell} onClick={() => go(at + 1)}>{nextIcon}</button>
    </nav>
  )
}

export { Pagination }
