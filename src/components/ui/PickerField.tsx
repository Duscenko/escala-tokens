/**
 * PickerField — the inspector's labelled select: ONE row that names what it
 * sets (plain text on the left) and shows what it is set to (a control on the
 * right: value + chevron), opening a list that can be searched.
 *
 * The row is `FIELD_ROW`, shared with the Colour edition's role rows
 * (`ColorRolesPanel` · RoleRow) and the extra-palette rows: the name is bare
 * text on the panel's own inset, and only the CONTROL is a surface — a 58%
 * pill on the right, inset-edged on hover and marked while open. That is the
 * property-panel shape (name | control) the reference inspectors use; the
 * name used to sit inside the pill too, which made every row one wide button
 * and hid where the control began. So a font, a type scale and an icon weight
 * read as the same control as Accent · Neutral · the states, one card up.
 *
 * The list is PORTALED and `fixed`: the inspector's scroll column clips an
 * absolute panel, and 60-odd typefaces are taller than the room under a field
 * low on the page. It flips above the field when there is more room there.
 * Search appears by itself once a list is long enough to need it.
 */
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'

export type PickerOption<T extends string> = {
  value: T
  label: string
  description?: string
  /** Eyebrow the list breaks on; a header renders only where it changes. */
  group?: string
}

/** Name | control: the control takes a fixed share of the row so every field's
 *  value starts on one line, and the name gets what is left. */
export const FIELD_ROW = 'grid h-8 w-full min-w-0 grid-cols-[minmax(0,1fr)_58%] items-center gap-x-2'
/** The name: bare text, muted at rest, full ink while the row is hot. */
export const FIELD_NAME = 'min-w-0 truncate text-left text-ui transition-colors'
/** The control: the one surface on the row. Pass `FIELD_CONTROL_ON` while it
 *  is open or selected; the rest state picks up `group-hover` from the row. */
export const FIELD_CONTROL = 'flex h-8 min-w-0 items-center gap-2 rounded-lg bg-surface pl-[3px] pr-2.5 transition-shadow duration-150'
export const FIELD_CONTROL_ON = 'shadow-[inset_0_0_0_1px_var(--line-selected)]'
export const FIELD_CONTROL_REST = 'group-hover:shadow-[inset_0_0_0_1px_var(--line-strong)]'
/** What leads the control — a colour swatch, an icon. Square, the field's
 *  height less a 3px inset, so it sits the SAME 3px from top, bottom and left
 *  (`pl-[3px]` above), and its radius is the field's less that inset:
 *  concentric with the field at either root size (h-8 / rounded-lg are rem). */
export const FIELD_LEAD = 'h-[calc(100%-6px)] aspect-square flex-shrink-0 rounded-[calc(0.5rem-3px)]'

const SEARCH_FROM = 9
const LIST_GAP = 6
const VIEWPORT_PAD = 12

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className={`flex-shrink-0 text-fg-faint transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden className="flex-shrink-0 text-fg-faint">
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function PickerField<T extends string>({
  label, value, valueLabel, options, onChange, ariaLabel, leading, render, info, optionVisual,
  searchPlaceholder = 'Search', emptyLabel = 'No matches', searchable, footer,
}: {
  label: string
  value: string
  /** What the field shows when `value` is not among the options ("Custom"). */
  valueLabel?: string
  options: PickerOption<T>[]
  onChange: (value: T) => void
  ariaLabel?: string
  /** A glyph or swatch before the value — the role row's swatch slot. */
  leading?: React.ReactNode
  /** Per-value style, e.g. a typeface rendered in its own face. */
  render?: (value: string) => React.CSSProperties
  /** A drawing per option (a corner, a lifted tile, a density frame) shown
   *  beside its name, so a preset is chosen by what it looks like. */
  optionVisual?: (value: T, selected: boolean) => React.ReactNode
  /** What this choice reaches, as the inspector's ⓘ hint beside the name.
   *  Not a line inside the list: the panel explains a setting in ONE way, and
   *  a note you only meet after opening the list is a second, hidden one. */
  info?: React.ReactNode
  searchPlaceholder?: string
  emptyLabel?: string
  /** Defaults to on for lists of `SEARCH_FROM` options or more. */
  searchable?: boolean
  /** A row pinned under the list (e.g. "Add font"); gets a closer. */
  footer?: (close: () => void) => React.ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const withSearch = searchable ?? options.length >= SEARCH_FROM

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => `${o.label} ${o.group ?? ''} ${o.description ?? ''}`.toLowerCase().includes(q))
  }, [options, query])

  const current = options.find((o) => o.value === value)
  const shown = current ? t(current.label) : (valueLabel ?? value)

  const close = (refocus = true) => {
    setOpen(false)
    setPlace(null)
    setQuery('')
    if (refocus) triggerRef.current?.focus()
  }

  // Measure on open, resize and any scroll (the inspector scrolls under it).
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - VIEWPORT_PAD - LIST_GAP
      const above = r.top - VIEWPORT_PAD - LIST_GAP
      const want = 340
      const up = below < Math.min(want, 220) && above > below
      setPlace(up
        ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + LIST_GAP, max: Math.min(want, above) }
        : { left: r.left, width: r.width, top: r.bottom + LIST_GAP, max: Math.min(want, below) })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Open on the selected option; focus the search (or the list) once mounted.
  const openList = () => {
    const i = options.findIndex((o) => o.value === value)
    setActive(i < 0 ? 0 : i)
    setOpen(true)
  }
  const placed = place !== null
  useEffect(() => {
    if (!open || !placed) return
    ;(withSearch ? searchRef.current : listRef.current)?.focus()
  }, [open, placed, withSearch])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const pick = (option: PickerOption<T>) => {
    onChange(option.value)
    close()
  }

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    if (event.key === 'Home' && !withSearch) { event.preventDefault(); setActive(0) }
    if (event.key === 'End' && !withSearch) { event.preventDefault(); setActive(filtered.length - 1) }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[active]
      if (option) pick(option)
    }
  }

  return (
    <>
      {/* The CONTROL is the button; the name beside it opens it too, and keeps
          room for the ⓘ hint (a button inside a button is not allowed). */}
      <div className={`group ${FIELD_ROW}`}>
        <span className="flex min-w-0 items-center gap-0.5">
          <span
            aria-hidden
            onClick={() => (open ? close(false) : openList())}
            className={`${FIELD_NAME} cursor-pointer ${open ? 'text-fg' : 'text-fg-muted group-hover:text-fg'}`}
          >
            {t(label)}
          </span>
          {info}
        </span>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close(false) : openList())}
          onKeyDown={(event) => {
            if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); openList() }
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`${t(ariaLabel ?? label)}: ${shown}`}
          // No leading item: the text keeps the same inset as the chevron side.
          className={`${FIELD_CONTROL} ${leading ? '' : '!pl-2.5'} ${open ? FIELD_CONTROL_ON : FIELD_CONTROL_REST} text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
        >
          {leading ?<span aria-hidden className={`${FIELD_LEAD} flex items-center justify-center text-fg-muted`}>{leading}</span> : null}
          <span className="min-w-0 flex-1 truncate text-ui text-fg" style={render?.(value)}>{shown}</span>
          <Chevron open={open} />
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {open && place && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: place.top != null ? -4 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: place.top != null ? -4 : 4 }}
              transition={{ duration: 0.12 }}
              onKeyDown={onKey}
              className="fixed z-[70] flex flex-col overflow-hidden rounded-[10px] border border-line-strong bg-app shadow-lg"
              style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.max }}
            >
              {withSearch && (
                <label className="flex h-9 flex-shrink-0 items-center gap-2 border-b border-line px-3">
                  <SearchGlyph />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setActive(0) }}
                    placeholder={t(searchPlaceholder)}
                    aria-label={t(searchPlaceholder)}
                    aria-controls={listId}
                    aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
                    spellCheck={false}
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent text-ui text-fg outline-none placeholder:text-fg-faint"
                  />
                  {query && (
                    <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label={t('Clear search')} className="rounded px-1 text-mini text-fg-faint hover:text-fg">
                      ✕
                    </button>
                  )}
                </label>
              )}
              <div
                ref={listRef}
                id={listId}
                role="listbox"
                tabIndex={withSearch ? -1 : 0}
                aria-label={t(ariaLabel ?? label)}
                aria-activedescendant={!withSearch && filtered[active] ? `${listId}-${active}` : undefined}
                className="min-h-0 flex-1 overflow-y-auto p-1 outline-none"
              >
                {filtered.length === 0 && (
                  <p className="px-2.5 py-3 text-center text-caption text-fg-faint">{t(emptyLabel)}</p>
                )}
                {filtered.map((option, index) => {
                  const selected = option.value === value
                  const hot = index === active
                  return (
                    <Fragment key={option.value}>
                      {option.group && option.group !== filtered[index - 1]?.group ? (
                        <div className={`px-2.5 pb-1 text-micro font-semibold uppercase tracking-[0.14em] text-fg-faint ${index ? 'mt-1.5 border-t border-line pt-2' : 'pt-1'}`}>
                          {t(option.group)}
                        </div>
                      ) : null}
                      <div
                        id={`${listId}-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActive(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => pick(option)}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors ${
                          hot ? 'bg-surface text-fg' : selected ? 'text-fg' : 'text-fg-muted'
                        }`}
                      >
                        {optionVisual ? <span aria-hidden className="flex flex-shrink-0 items-center">{optionVisual(option.value, selected)}</span> : null}
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-ui ${selected ? 'font-medium' : ''}`} style={render?.(option.value)}>{t(option.label)}</span>
                          {option.description ? <span className="mt-0.5 block truncate text-mini text-fg-faint">{t(option.description)}</span> : null}
                        </span>
                        {selected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="flex-shrink-0 text-accent-ui">
                            <path d="M2.5 6.25L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </Fragment>
                  )
                })}
              </div>
              {footer ? <div className="flex-shrink-0 border-t border-line p-1">{footer(() => close(false))}</div> : null}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
