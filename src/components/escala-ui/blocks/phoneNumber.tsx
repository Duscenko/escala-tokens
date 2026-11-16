// Escala blocks · PhoneNumberInput: the phone field with its country. A composition, not a new component: the Figma
// `Input` Type=phone (its addon + caret + the number) whose addon shows the chosen country's flag and calling code
// (🇺🇸 +1 ⌄), and opens a `ComboboxPopover` of `ComboboxItem` rows — flag · country · code, the chosen one checked —
// with a search field on top ("Country or code"; "+44" searches the calling code). Roles only, through the recipes of
// Input, ComboboxPopover and ComboboxItem. The Figma file does not draw the country list yet: when it does, this
// becomes the Input's own `phone` behaviour.
//
// Keyboard: the addon is a button (Enter / Space / ArrowDown open the list); in the list ArrowUp / ArrowDown move the
// one highlight, Enter picks, Escape closes and returns focus to the addon. A click outside closes it.
import * as React from 'react'
import { createPortal } from 'react-dom'
import { glyph } from '../../../lib/icons'
import { PHONE_COUNTRIES, phoneCountry, searchPhoneCountries, type PhoneCountry } from '../../../lib/phoneCountries'
import { ComboboxItem, ComboboxPopover } from '../combobox'
import { Input, type InputProps } from '../input'
import { usePortalContainer } from '../portal-scope'

export interface PhoneNumberInputProps extends Omit<InputProps, 'type' | 'addon' | 'addonOptions' | 'addonControl' | 'onAddonChange'> {
  /** The chosen country (ISO 3166-1 alpha-2). */
  country?: string
  defaultCountry?: string
  onCountryChange?: (iso: string, country: PhoneCountry) => void
  countries?: PhoneCountry[]
  /** The translatable copy of the picker. */
  pickerLabels?: Partial<Record<'button' | 'search' | 'list' | 'empty', string>>
}

/** A flag glyph: the emoji at the size of the field's text, never a picture of its own. */
const Flag = ({ country }: { country: PhoneCountry }) => <span aria-hidden>{country.flag}</span>

export function PhoneNumberInput({
  country, defaultCountry = 'US', onCountryChange, countries = PHONE_COUNTRIES, pickerLabels, size = 'default', disabled, ...props
}: PhoneNumberInputProps) {
  const [inner, setInner] = React.useState(defaultCountry)
  const iso = country ?? inner
  const chosen = phoneCountry(iso) ?? countries[0]
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const shown = searchPhoneCountries(query, countries)
  const [active, setActive] = React.useState(0)
  const wrap = React.useRef<HTMLDivElement>(null)
  const button = React.useRef<HTMLButtonElement>(null)
  const search = React.useRef<HTMLInputElement>(null)
  const panel = React.useRef<HTMLDivElement>(null)
  const container = usePortalContainer()
  // The list is portaled (a card that clips its content would cut it) and pinned under the field.
  const [at, setAt] = React.useState<{ left: number; top: number; width: number } | null>(null)
  const listId = React.useId()
  const optionId = (i: number) => `${listId}-c${i}`

  const openList = () => {
    setQuery('')
    setActive(Math.max(0, countries.findIndex((c) => c.iso === chosen.iso)))
    setOpen(true)
  }
  const close = (refocus = true) => { setOpen(false); setAt(null); if (refocus) button.current?.focus() }
  const pick = (c: PhoneCountry) => {
    setInner(c.iso)
    onCountryChange?.(c.iso, c)
    close()
  }

  // Search gets focus on open; the chosen (or highlighted) country scrolls into view.
  const placed = at !== null
  React.useEffect(() => { if (open && placed) search.current?.focus() }, [open, placed])
  React.useEffect(() => {
    if (!open) return
    // Scroll the LIST only (scrollIntoView would scroll the page too).
    const row = document.getElementById(optionId(active))
    const list = row?.parentElement
    if (!row || !list) return
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight
  }, [open, active, at]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = wrap.current?.querySelector('[data-escala="Input"]')?.getBoundingClientRect()
      if (r) setAt({ left: r.left, top: r.bottom, width: r.width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])
  // A pointer down outside the field closes the list.
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!wrap.current?.contains(t) && !panel.current?.contains(t)) close(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const addon = (
    <button
      ref={button}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-label={`${pickerLabels?.button ?? 'Country'}: ${chosen.name} ${chosen.dial}`}
      disabled={disabled}
      onClick={() => (open ? close() : openList())}
      onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openList() } }}
      className="inline-flex shrink-0 cursor-pointer items-center gap-[var(--spacing-gap-control)] rounded-[inherit] border-0 bg-transparent p-0 [color:inherit] [font:inherit] outline-none focus-visible:underline disabled:cursor-not-allowed"
    >
      <span data-part="Input.addon" className="inline-flex shrink-0 items-center gap-[var(--spacing-gap-tight)] whitespace-nowrap">
        <Flag country={chosen} />{chosen.dial}
      </span>
      <span data-part="Input.icon" data-icon="chevron" aria-hidden className={`inline-flex shrink-0 items-center justify-center [&>svg]:size-full ${open ? 'rotate-180' : ''}`}>
        {glyph('chevron-down')}
      </span>
    </button>
  )

  return (
    <div ref={wrap} data-part="phone-number" className="relative w-full">
      <Input type="phone" size={size} disabled={disabled} addonControl={addon} {...props} />
      {open && at && createPortal(
        <ComboboxPopover
          ref={panel}
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
          listId={listId}
          listLabel={pickerLabels?.list ?? 'Countries'}
          content={shown.length ? 'list' : 'empty'}
          emptyText={pickerLabels?.empty ?? 'No country matches'}
          // Five rows tall: 5 × Size/control-xl (56) — the list scrolls past it.
          maxListHeight="calc(var(--size-control-xl, 56px) * 5)"
          className="fixed z-50 mt-[var(--spacing-gap-control)]"
          style={{ left: at.left, top: at.top, width: at.width }}
          header={(
            <Input
              ref={search}
              type="search"
              size={size}
              shortcut={null}
              placeholder={pickerLabels?.search ?? 'Country or code'}
              aria-label={pickerLabels?.search ?? 'Country or code'}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={shown[active] ? optionId(active) : undefined}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((a) => Math.min(shown.length - 1, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))))
                } else if (e.key === 'Enter' && shown[active]) {
                  e.preventDefault(); pick(shown[active])
                } else if (e.key === 'Escape') {
                  e.preventDefault(); close()
                }
              }}
            />
          )}
        >
          {shown.map((c, i) => (
            <ComboboxItem
              key={c.iso}
              id={optionId(i)}
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
              selected={c.iso === chosen.iso}
              highlighted={i === active}
              icon={<Flag country={c} />}
              trailing={c.dial}
              onMouseDown={(e) => { e.preventDefault(); pick(c) }}
              onMouseEnter={() => setActive(i)}
            >
              {c.name}
            </ComboboxItem>
          ))}
        </ComboboxPopover>,
        container ?? document.body,
      )}
    </div>
  )
}
