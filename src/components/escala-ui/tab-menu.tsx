// Escala component on the shadcn Tabs idea: a pill that slides between items.
// Roving tabindex + arrow keys (the ARIA automatic-activation tablist).
// Appearance: recipe (TabMenu).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { SlidingSelection } from './sliding-selection'

export interface TabMenuProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  items: string[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Items share the width equally. */
  fill?: boolean
}

function TabMenu({ items, value, defaultValue, onValueChange, fill, className, ...props }: TabMenuProps) {
  const [inner, setInner] = React.useState(defaultValue ?? items[0])
  const active = value ?? inner
  const ref = React.useRef<HTMLDivElement>(null)
  const select = (v: string) => { setInner(v); onValueChange?.(v) }
  return (
    <div
      ref={ref}
      role="tablist"
      data-slot="tab-menu"
      data-escala="TabMenu"
      className={cn('relative flex max-w-full min-w-0', fill && 'w-full', className)}
      {...props}
    >
      <SlidingSelection trackRef={ref} selection={active} part="TabMenu.pill" />
      {items.map((item, i) => {
        const on = item === active
        return (
          <span
            key={item}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            data-part="TabMenu.item"
            data-sliding-active={on ? 'true' : undefined}
            onClick={() => select(item)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
                select(items[next])
                e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
              } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(item) }
            }}
            className={cn('relative cursor-pointer outline-none', fill && 'min-w-0 flex-1 text-center')}
          >
            <span className="relative">{item}</span>
          </span>
        )
      })}
    </div>
  )
}

export { TabMenu }
