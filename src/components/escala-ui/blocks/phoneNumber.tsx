// Escala blocks · PhoneNumberInput: the phone field with its country. A composition, not a new component: the Figma
// `Input` Type=phone (its addon + caret + the number) whose addon shows the chosen country's flag and calling code
// (🇫🇷 +33 ⌄) and opens an anchored `Popover` (Radix: non-modal, Escape and outside click close it) on EVERY viewport,
// a phone included — a Sheet is for drawers, filters and menus, not for a list tied to one field (owner, 16 Nov 2026).
// The panel is the system's `ComboboxPopover` (Surface/layer-2, Radius/overlay, Shadow/md, the list padded by
// Spacing/inset-control so the rows at Radius/action are concentric): a search `Input` on top ("Search country or
// +code"; "+44" searches the calling code) and `ComboboxItem` rows — flag · country · calling code, the chosen one
// checked. Roles only; nothing here is drawn from a value of its own.
//
// Behaviour: width = the field's (`--radix-popover-trigger-width`, the Anchor being the whole Input); it flips above
// the field when there is no room below (`avoidCollisions`) and its height follows the VISUAL viewport (a keyboard
// shrinks it), never 100vh; the search is NOT focused on a touch device (it would raise the keyboard before the list is
// visible); the detected country (from the browser's languages) is listed first; ~240 rows are windowed (only the rows
// in view are drawn). The trigger is a real combobox: aria-expanded / aria-controls, ArrowDown opens, typing a letter
// opens the list with it as the query; in the list the search is the combobox (aria-activedescendant, ArrowUp / Down /
// Home / End / PageUp / PageDown move the highlight, Enter picks, Escape closes and returns focus to the trigger).
// Motion: the panel enters and leaves on `popover-enter` / `popover-exit` (the Popover recipe's choreography).
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { glyph } from '../../../lib/icons'
import { PHONE_COUNTRIES, detectCountry, phoneCountry, searchPhoneCountries, surfaceCountry, virtualWindow, type PhoneCountry } from '../../../lib/phoneCountries'
import { ComboboxItem, ComboboxPopover } from '../combobox'
import { Input, type InputProps } from '../input'
import { Popover, PopoverAnchor } from '../popover'
import { usePortalContainer } from '../portal-scope'
import { useVisualViewport } from '../visual-viewport'

export interface PhoneNumberInputProps extends Omit<InputProps, 'type' | 'addon' | 'addonOptions' | 'addonControl' | 'onAddonChange'> {
  /** The chosen country (ISO 3166-1 alpha-2). */
  country?: string
  /** Where it starts: the country the browser's languages name, else the US. */
  defaultCountry?: string
  onCountryChange?: (iso: string, country: PhoneCountry) => void
  countries?: PhoneCountry[]
  /** The translatable copy of the picker. */
  pickerLabels?: Partial<Record<'button' | 'dialog' | 'search' | 'list' | 'empty', string>>
  /** Docs and tests: the visible part of the page, replacing the live `visualViewport` (a phone frame in a story, a keyboard). */
  viewport?: { height: number; bottom: number }
  /** Docs and tests: the box the picker flips inside (a phone frame in a story). Defaults to the browser viewport. */
  collisionBoundary?: Element | null
}

/** A flag: the colour emoji of the ISO code, never inked (a colour glyph, not an icon). */
const Flag = ({ country }: { country: PhoneCountry }) => (
  <span aria-hidden data-part="Flag" style={{ color: 'initial', fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif', lineHeight: 1 }}>{country.flag}</span>
)

/** A touch screen: the picker must not raise the keyboard on open. */
const isTouch = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

/** How many rows the open list shows before it scrolls (the file draws seven). */
const VISIBLE_ROWS = 7

export function PhoneNumberInput({
  country, defaultCountry, onCountryChange, countries = PHONE_COUNTRIES, pickerLabels, viewport: viewportProp, collisionBoundary, size = 'default', disabled, ...props
}: PhoneNumberInputProps) {
  const detected = React.useMemo(() => detectCountry(), [])
  const [inner, setInner] = React.useState(() => defaultCountry ?? detected ?? 'US')
  const iso = country ?? inner
  const chosen = phoneCountry(iso) ?? countries[0]
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const ordered = React.useMemo(() => surfaceCountry(countries, detected), [countries, detected])
  const shown = React.useMemo(() => (query.trim() ? searchPhoneCountries(query, countries) : ordered), [query, countries, ordered])

  const button = React.useRef<HTMLButtonElement>(null)
  const search = React.useRef<HTMLInputElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  // The list is held in state, not a ref: Radix mounts the portal a render after `open`, and the measuring waits for it.
  const [listEl, setListEl] = React.useState<HTMLDivElement | null>(null)
  const container = usePortalContainer()
  const live = useVisualViewport(open && !viewportProp)
  const viewport = viewportProp ?? live
  const listId = React.useId()
  const optionId = (i: number) => `${listId}-c${i}`
  const rowSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'

  // The window: only the rows in view are drawn; the list keeps its scroll length with a spacer.
  const [rowH, setRowH] = React.useState(0)
  const [viewH, setViewH] = React.useState(0)
  const [scrollTop, setScrollTop] = React.useState(0)
  const pad = React.useRef({ top: 0, bottom: 0 })
  const win = virtualWindow(shown.length, rowH, Math.max(0, scrollTop - pad.current.top), viewH)
  const reveal = React.useRef<number | null>(null)

  const openList = (seed = '') => {
    setQuery(seed)
    const at = seed ? 0 : Math.max(0, ordered.findIndex((c) => c.iso === chosen.iso))
    setActive(at)
    reveal.current = at
    setScrollTop(0)
    setOpen(true)
  }
  const pick = (c: PhoneCountry) => {
    setInner(c.iso)
    onCountryChange?.(c.iso, c)
    setOpen(false)
  }

  // Measure one row and the list's window once it is on screen; follow the list's size (the viewport, a keyboard).
  React.useLayoutEffect(() => {
    const el = listEl
    if (!open || !el) return
    const measure = () => {
      const cs = getComputedStyle(el)
      pad.current = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }
      const row = el.querySelector('[role="option"]')
      if (row) setRowH(row.getBoundingClientRect().height)
      setViewH(el.clientHeight - pad.current.top - pad.current.bottom)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, listEl, shown.length, rowH > 0])

  // Bring a row into view by arithmetic (the row may not be drawn yet): the list's own scroll, never the page's.
  const revealRow = React.useCallback((i: number) => {
    const el = listEl
    if (!el || rowH <= 0) return
    const top = i * rowH
    const bottom = top + rowH
    const view = el.clientHeight - pad.current.top - pad.current.bottom
    const at = Math.max(0, el.scrollTop - pad.current.top)
    if (top < at) el.scrollTop = top
    else if (bottom > at + view) el.scrollTop = bottom - view + pad.current.top
    setScrollTop(el.scrollTop)
  }, [rowH, listEl])
  React.useLayoutEffect(() => {
    if (!open || !listEl || rowH <= 0 || viewH <= 0 || reveal.current === null) return
    const i = reveal.current
    reveal.current = null
    listEl.scrollTop = Math.max(0, i * rowH - (viewH - rowH) / 2)
    setScrollTop(listEl.scrollTop)
  }, [open, listEl, rowH, viewH])
  React.useEffect(() => { if (open) revealRow(active) }, [open, active, revealRow])

  const move = (to: number) => setActive(Math.min(shown.length - 1, Math.max(0, to)))

  const addon = (
    <PopoverPrimitive.Trigger asChild>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${pickerLabels?.button ?? 'Country'}: ${chosen.name} ${chosen.dial}`}
        disabled={disabled}
        onClick={(e) => { e.preventDefault(); if (open) setOpen(false); else openList() }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openList() }
          // Type-ahead: a letter or digit opens the list with it as the query.
          else if (!open && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== ' ') { e.preventDefault(); openList(e.key) }
        }}
        className="inline-flex shrink-0 cursor-pointer items-center gap-[var(--spacing-gap-control)] rounded-[inherit] border-0 bg-transparent p-0 [color:inherit] [font:inherit] outline-none focus-visible:underline disabled:cursor-not-allowed"
      >
        <span data-part="Input.addon" className="inline-flex shrink-0 items-center gap-[var(--spacing-gap-tight)] whitespace-nowrap">
          <Flag country={chosen} />{chosen.dial}
        </span>
        <span data-part="Input.icon" data-icon="chevron" aria-hidden className={`inline-flex shrink-0 items-center justify-center [&>svg]:size-full ${open ? 'rotate-180' : ''}`}>
          {glyph('chevron-down')}
        </span>
      </button>
    </PopoverPrimitive.Trigger>
  )

  const searchLabel = pickerLabels?.search ?? 'Search country or +code'
  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div data-part="phone-number" className="relative w-full">
          <Input type="phone" size={size} disabled={disabled} addonControl={addon} {...props} />
        </div>
      </PopoverAnchor>
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Content
          ref={content}
          data-escala="Popover"
          data-part="PhoneNumber.picker"
          side="bottom"
          align="start"
          avoidCollisions
          collisionBoundary={collisionBoundary ?? undefined}
          tabIndex={-1}
          aria-label={pickerLabels?.dialog ?? 'Choose a country'}
          className="z-50 outline-none"
          style={{
            width: 'var(--radix-popover-trigger-width)',
            // The visible part of the page (a keyboard shrinks it), and what Radix says is left on the side it opened on.
            maxHeight: viewport ? `min(var(--radix-popover-content-available-height), ${viewport.height}px)` : 'var(--radix-popover-content-available-height)',
            display: 'flex', flexDirection: 'column',
            // The 4 between the field and the panel is the content's own padding, so Radix counts it in the room it measures.
            paddingBlock: 'var(--spacing-gap-tight)',
          }}
          // A touch device keeps the keyboard down: focus the panel, not the search.
          onOpenAutoFocus={(e) => { if (isTouch()) { e.preventDefault(); content.current?.focus() } }}
          onCloseAutoFocus={(e) => { e.preventDefault(); button.current?.focus() }}
        >
          <ComboboxPopover
            size={rowSize}
            listId={listId}
            listLabel={pickerLabels?.list ?? 'Countries'}
            content={shown.length ? 'list' : 'empty'}
            emptyText={pickerLabels?.empty ?? 'No country matches'}
            // Seven rows tall (7 × Size/control-sm); the list scrolls past it, and shrinks with the visible area.
            maxListHeight={`calc(var(--size-control-sm) * ${VISIBLE_ROWS} + var(--spacing-inset-control) + var(--spacing-gap-tight))`}
            listRef={setListEl}
            onListScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            // The bottom padding of the list sits under its last row; clipped at rest, so the next row never peeks into it.
            className="[&_[data-part='ComboboxPopover.list']]:[clip-path:inset(0_0_var(--spacing-inset-control)_0)]"
            style={{ minHeight: 0, flex: '1 1 auto' }}
            header={(
              <Input
                ref={search}
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
                onChange={(e) => { setQuery(e.target.value); setActive(0); reveal.current = 0 }}
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
            <div role="none" style={{ paddingTop: win.before, paddingBottom: win.after }}>
              {shown.slice(win.start, win.end).map((c, k) => {
                const i = win.start + k
                return (
                  <ComboboxItem
                    key={c.iso}
                    id={optionId(i)}
                    size={rowSize}
                    selected={c.iso === chosen.iso}
                    highlighted={i === active}
                    icon={<Flag country={c} />}
                    trailing={c.dial}
                    aria-setsize={shown.length}
                    aria-posinset={i + 1}
                    // The search keeps focus (a mousedown would move it to the row).
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(c)}
                    onMouseMove={() => { if (i !== active) setActive(i) }}
                  >
                    {c.name}
                  </ComboboxItem>
                )
              })}
            </div>
          </ComboboxPopover>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  )
}
