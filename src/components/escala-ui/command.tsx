// shadcn/ui `command.tsx` wraps `cmdk`; this keeps the same anatomy (Command,
// CommandInput, CommandList, CommandGroup, CommandItem) with a small built-in
// filter and no dependency. Appearance: recipe (Command).
import * as React from 'react'
import { cn } from '../../lib/utils'

const QueryContext = React.createContext<{ query: string; setQuery: (q: string) => void }>({ query: '', setQuery: () => undefined })

function Command({ className, ...props }: React.ComponentProps<'div'>) {
  const [query, setQuery] = React.useState('')
  return (
    <QueryContext.Provider value={{ query, setQuery }}>
      <div data-slot="command" data-escala="Command" className={cn('flex flex-col overflow-hidden', className)} {...props} />
    </QueryContext.Provider>
  )
}

function CommandInput({
  icon, shortcut, className, ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & { icon?: React.ReactNode; shortcut?: React.ReactNode }) {
  const { query, setQuery } = React.useContext(QueryContext)
  return (
    <div data-slot="command-input" data-part="Command.search" className="flex items-center">
      {icon != null && <span data-part="Command.icon" className="inline-flex shrink-0">{icon}</span>}
      <input
        data-part="Command.input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={cn('min-w-0 flex-1 border-0 bg-transparent p-0 outline-none', className)}
        {...props}
      />
      {shortcut != null && <span data-part="Command.kbd">{shortcut}</span>}
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="listbox" data-slot="command-list" data-part="Command.list" className={className} {...props} />
}

function CommandGroup({ heading, className, children, ...props }: Omit<React.ComponentProps<'div'>, 'title'> & { heading?: React.ReactNode }) {
  return (
    <div role="group" data-slot="command-group" className={className} {...props}>
      {heading != null && <span data-part="Command.heading" className="block uppercase" style={{ letterSpacing: '0.08em' }}>{heading}</span>}
      {children}
    </div>
  )
}

function CommandItem({
  highlighted, onSelect, className, children, ...props
}: Omit<React.ComponentProps<'div'>, 'onSelect'> & { highlighted?: boolean; onSelect?: () => void }) {
  const { query } = React.useContext(QueryContext)
  const text = typeof children === 'string' ? children : ''
  if (query && text && !text.toLowerCase().includes(query.toLowerCase())) return null
  return (
    <div
      role="option"
      aria-selected={highlighted || undefined}
      data-slot="command-item"
      data-part="Command.item"
      data-highlighted={highlighted ? '' : undefined}
      onClick={onSelect}
      className={cn('block cursor-pointer', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Command, CommandGroup, CommandInput, CommandItem, CommandList }
