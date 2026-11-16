// Escala blocks · CurrencyInput: the amount field with its currency. A composition, not a new component: the Figma `Input`
// Type=currency-select (its addon + caret + divider + the amount) whose addon shows the chosen currency's code (USD ⌄) and opens an
// anchored `Popover` — the same behaviour as PhoneNumberInput's country picker: non-modal, Escape and outside click close it, a search
// `Input` on top ("Search currency"), `ComboboxItem` rows (symbol · name · code, the chosen one checked), the panel as wide as the field.
// The trigger is a real combobox (ArrowDown opens, a letter opens the list with it as the query); in the list the search is the combobox
// (aria-activedescendant, ArrowUp / Down / Home / End move the highlight, Enter picks, Escape returns focus to the trigger).
// Motion: the panel enters and leaves on `popover-enter` / `popover-exit`. Roles only.
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { glyph } from '../../../lib/icons'
import { CURRENCIES, currencyOf, searchCurrencies, type Currency } from '../../../lib/currencies'
import { ComboboxItem, ComboboxPopover } from '../combobox'
import { Input, type InputProps } from '../input'
import { Popover, PopoverAnchor } from '../popover'
import { usePortalContainer } from '../portal-scope'

export interface CurrencyInputProps extends Omit<InputProps, 'type' | 'addon' | 'addonOptions' | 'addonControl' | 'onAddonChange'> {
  /** The chosen currency (ISO 4217). */
  currency?: string
  defaultCurrency?: string
  onCurrencyChange?: (code: string, currency: Currency) => void
  currencies?: Currency[]
  /** The translatable copy of the picker. */
  pickerLabels?: Partial<Record<'button' | 'dialog' | 'search' | 'list' | 'empty', string>>
}

const VISIBLE_ROWS = 7

export function CurrencyInput({ currency, defaultCurrency = 'USD', onCurrencyChange, currencies = CURRENCIES, pickerLabels, size = 'default', disabled, ...props }: CurrencyInputProps) {
  const [inner, setInner] = React.useState(defaultCurrency)
  const code = currency ?? inner
  const chosen = currencyOf(code) ?? currencies[0]
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const shown = React.useMemo(() => searchCurrencies(query, currencies), [query, currencies])
  const button = React.useRef<HTMLButtonElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  const container = usePortalContainer()
  const listId = React.useId()
  const optionId = (i: number) => `${listId}-c${i}`
  const rowSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'
  const [listEl, setListEl] = React.useState<HTMLDivElement | null>(null)

  const openList = (seed = '') => {
    setQuery(seed)
    setActive(seed ? 0 : Math.max(0, currencies.findIndex((c) => c.code === chosen.code)))
    setOpen(true)
  }
  const pick = (c: Currency) => { setInner(c.code); onCurrencyChange?.(c.code, c); setOpen(false) }
  const move = (to: number) => setActive(Math.min(shown.length - 1, Math.max(0, to)))
  // Keep the highlighted row in view by the list's own scroll.
  React.useEffect(() => {
    if (!open || !listEl) return
    listEl.querySelector<HTMLElement>(`[id="${optionId(active)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, listEl, shown.length])

  const addon = (
    <PopoverPrimitive.Trigger asChild>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${pickerLabels?.button ?? 'Currency'}: ${chosen.name} ${chosen.code}`}
        disabled={disabled}
        onClick={(e) => { e.preventDefault(); if (open) setOpen(false); else openList() }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openList() }
          else if (!open && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== ' ') { e.preventDefault(); openList(e.key) }
        }}
        className="inline-flex shrink-0 cursor-pointer items-center gap-[var(--spacing-gap-control)] rounded-[inherit] border-0 bg-transparent p-0 [color:inherit] [font:inherit] outline-none focus-visible:underline disabled:cursor-not-allowed"
      >
        <span data-part="Input.addon" className="inline-flex shrink-0 items-center whitespace-nowrap">{chosen.code}</span>
        <span data-part="Input.icon" data-icon="chevron" aria-hidden className={`inline-flex shrink-0 items-center justify-center [&>svg]:size-full ${open ? 'rotate-180' : ''}`}>{glyph('chevron-down')}</span>
      </button>
    </PopoverPrimitive.Trigger>
  )

  const searchLabel = pickerLabels?.search ?? 'Search currency'
  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div data-part="currency-input" className="relative w-full">
          <Input type="currency-select" size={size} disabled={disabled} addonControl={addon} {...props} />
        </div>
      </PopoverAnchor>
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Content
          ref={content}
          data-escala="Popover"
          data-part="CurrencyInput.picker"
          side="bottom"
          align="start"
          avoidCollisions
          tabIndex={-1}
          aria-label={pickerLabels?.dialog ?? 'Choose a currency'}
          className="z-50 outline-none"
          style={{ width: 'var(--radix-popover-trigger-width)', maxHeight: 'var(--radix-popover-content-available-height)', display: 'flex', flexDirection: 'column', paddingBlock: 'var(--spacing-gap-tight)' }}
          onCloseAutoFocus={(e) => { e.preventDefault(); button.current?.focus() }}
        >
          <ComboboxPopover
            size={rowSize}
            listId={listId}
            listLabel={pickerLabels?.list ?? 'Currencies'}
            content={shown.length ? 'list' : 'empty'}
            emptyText={pickerLabels?.empty ?? 'No currency matches'}
            maxListHeight={`calc(var(--size-control-sm) * ${VISIBLE_ROWS} + var(--spacing-inset-control) + var(--spacing-gap-tight))`}
            listRef={setListEl}
            style={{ minHeight: 0, flex: '1 1 auto' }}
            header={(
              <Input
                type="search"
                size={size}
                shortcut={null}
                placeholder={searchLabel}
                aria-label={searchLabel}
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={shown[active] ? optionId(active) : undefined}
                autoComplete="off"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); move(active + 1) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); move(active - 1) }
                  else if (e.key === 'PageDown') { e.preventDefault(); move(active + VISIBLE_ROWS) }
                  else if (e.key === 'PageUp') { e.preventDefault(); move(active - VISIBLE_ROWS) }
                  else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); move(0) }
                  else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); move(shown.length - 1) }
                  else if (e.key === 'Enter' && shown[active]) { e.preventDefault(); pick(shown[active]) }
                }}
              />
            )}
          >
            {shown.map((c, i) => (
              <ComboboxItem
                key={c.code}
                id={optionId(i)}
                size={rowSize}
                selected={c.code === chosen.code}
                highlighted={i === active}
                trailing={c.code}
                aria-setsize={shown.length}
                aria-posinset={i + 1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseMove={() => { if (i !== active) setActive(i) }}
              >
                {c.symbol} · {c.name}
              </ComboboxItem>
            ))}
          </ComboboxPopover>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  )
}
