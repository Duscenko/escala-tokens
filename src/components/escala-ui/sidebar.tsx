// Escala component (shadcn's Sidebar, reduced to its navigation list): rows with a
// glyph and a label, the current one marked by a sliding selection. Arrow keys
// move between rows. Appearance: recipe (Sidebar).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { SlidingSelection } from './sliding-selection'

export interface SidebarItem { label: string; icon?: React.ReactNode }

export interface SidebarProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
  items: SidebarItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function Sidebar({ items, value, defaultValue, onValueChange, className, ...props }: SidebarProps) {
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.label)
  const active = value ?? inner
  const ref = React.useRef<HTMLElement>(null)
  const select = (v: string) => { setInner(v); onValueChange?.(v) }
  return (
    <nav ref={ref} aria-label="Sidebar" data-slot="sidebar" data-escala="Sidebar" className={cn('relative flex flex-col', className)} {...props}>
      <SlidingSelection trackRef={ref} selection={active} part="Sidebar.pill" />
      {items.map((item, i) => {
        const on = item.label === active
        return (
          <button
            key={item.label}
            type="button"
            aria-current={on ? 'page' : undefined}
            tabIndex={on ? 0 : -1}
            data-part="Sidebar.item"
            data-sliding-active={on ? 'true' : undefined}
            onClick={() => select(item.label)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
                select(items[next].label)
                e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('button')[next]?.focus()
              }
            }}
            className="relative flex w-full cursor-pointer items-center border-0 bg-transparent text-left outline-none transition-colors duration-150"
          >
            <span className="relative inline-flex items-center" style={{ gap: 'inherit' }}>
              {item.icon != null && <span data-part="Sidebar.icon" className="inline-flex shrink-0">{item.icon}</span>}
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export { Sidebar }
