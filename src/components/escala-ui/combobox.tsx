// Escala component on the shadcn Command / Popover idea (shadcn's Combobox is
// Popover + Command): a text field that filters a listbox. No cmdk dependency.
// Appearance: its recipe (Combobox).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ComboboxOption { label: string; value: string }

export interface ComboboxProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  options: ComboboxOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  /** Keep the list open (docs, previews). */
  forceOpen?: boolean
  /** The chevron. */
  icon?: React.ReactNode
  width?: number | string
}

function Combobox({
  options, value, defaultValue, onValueChange, placeholder = 'Search…', forceOpen, icon = '⌄', width, className, ...props
}: ComboboxProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const selected = value ?? inner
  const [query, setQuery] = React.useState('')
  const [focus, setFocus] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const listId = React.useId()
  const open = forceOpen || focus
  const matches = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  const chosen = options.find((o) => o.value === selected)
  const pick = (o: ComboboxOption) => {
    setInner(o.value); onValueChange?.(o.value); setQuery('')
  }
  return (
    <div
      data-slot="combobox"
      data-escala="Combobox"
      data-force-state={forceOpen ? 'Open' : undefined}
      className={cn('relative flex flex-col justify-center', className)}
      style={{ width }}
      {...props}
    >
      <div data-part="Combobox.field" className="contents">
        <div role="presentation" className="flex h-full min-w-0 items-center gap-[var(--spacing-gap-control)]" data-part="Combobox.row">
          <input
            data-part="Combobox.input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={focus || forceOpen ? query : chosen?.label ?? ''}
            placeholder={chosen?.label ?? placeholder}
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
              else if (e.key === 'Enter' && matches[active]) { e.preventDefault(); pick(matches[active]) }
              else if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
            }}
          />
          <span data-part="Combobox.icon" aria-hidden className="pointer-events-none inline-flex shrink-0">{icon}</span>
        </div>
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          data-part="Combobox.content"
          className="absolute top-full left-0 z-50 mt-1 w-full"
        >
          {matches.length === 0 && <div data-part="Combobox.item" aria-disabled>No results</div>}
          {matches.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === selected}
              data-part="Combobox.item"
              data-highlighted={i === active ? '' : undefined}
              data-state={o.value === selected ? 'checked' : 'unchecked'}
              className="flex cursor-pointer items-center"
              onMouseDown={(e) => { e.preventDefault(); pick(o) }}
              onMouseEnter={() => setActive(i)}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { Combobox }
