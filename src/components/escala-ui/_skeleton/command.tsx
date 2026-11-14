// shadcn/ui `command.tsx` wraps `cmdk`; this keeps the same anatomy (Command,
// CommandInput, CommandList, CommandGroup, CommandItem) with a small built-in
// filter and no dependency. Appearance: recipe (Command).
import * as React from 'react'
import { cn } from '../../../lib/utils'
import { Kbd, KbdGroup } from '../kbd'

/** `⌘K` → `⌘` `K`; `Ctrl K` → `Ctrl` `K`; `Esc` → `Esc`: one key cap per key, never a whole shortcut in one. */
function shortcutKeys(shortcut: string): string[] {
  const words = shortcut.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return words
  const chars = [...(words[0] ?? '')]
  let i = 0
  while (i < chars.length - 1 && '⌘⌥⇧⌃'.includes(chars[i])) i++
  return [...chars.slice(0, i), chars.slice(i).join('')].filter(Boolean)
}

/** A shortcut drawn with the Figma Kbd, one cap per key. A node is rendered as given. */
function CommandShortcut({ children, size = 'xs', className, ...props }: Omit<React.ComponentProps<'span'>, 'children'> & { children: React.ReactNode; size?: 'xs' | 'sm' | 'default' }) {
  return (
    <span data-slot="command-shortcut" className={cn('ml-auto inline-flex shrink-0', className)} {...props}>
      {typeof children === 'string'
        ? <KbdGroup>{shortcutKeys(children).map((k, i) => <Kbd key={`${k}-${i}`} size={size}>{k}</Kbd>)}</KbdGroup>
        : children}
    </span>
  )
}

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
      {shortcut != null && <CommandShortcut className="ml-0">{shortcut}</CommandShortcut>}
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

export { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut }
