// Escala components: Combobox · ComboboxPopover · ComboboxItem · ComboboxGroupLabel — the
// Figma `Combobox` page (design-plans/combobox-contract.md).
//  · Combobox (413:1478): a text field that filters a listbox. `size` sm · default · lg,
//    `variant` default (fills its width) · compact (hugs its content), `shape` rounded · pill,
//    State Default · Hover · Focused · Open · Invalid · Disabled · Loading (Hover and Focused
//    come from the pointer and keyboard, Open from the list; `aria-invalid`, `disabled` and
//    `loading` pin the others; `forceState` pins one for docs). Value (placeholder · filled)
//    needs no prop: the field shows the chosen option's label, or the placeholder.
//    Leading glyph, ✕ and chevron are the file's IconLeadingVisible / IconLeadingIcon,
//    ClearVisible and ChevronVisible. The list opens 8px (gap-control) below the trigger,
//    aligned to its start, and closes on Escape.
//  · ComboboxPopover (415:489): the panel — `content` list · grouped · empty, `size`, an
//    optional footer (FooterVisible / FooterText) and EmptyText.
//  · ComboboxItem (406:140): an option row — `size`, State Default · Focused · Selected ·
//    Disabled, optional leading icon, description, trailing text and the check indicator.
//  · ComboboxGroupLabel (406:147): the heading of a group of options.
// Paint: the Combobox, ComboboxPopover, ComboboxItem and ComboboxGroupLabel recipes.
import * as React from 'react'
import { cn } from '../../lib/utils'

export const COMBOBOX_SIZES = ['sm', 'default', 'lg'] as const
export const COMBOBOX_VARIANTS = ['default', 'compact'] as const
export const COMBOBOX_SHAPES = ['rounded', 'pill'] as const
export const COMBOBOX_POPOVER_CONTENTS = ['list', 'grouped', 'empty'] as const
export type ComboboxSize = (typeof COMBOBOX_SIZES)[number]
export type ComboboxVariant = (typeof COMBOBOX_VARIANTS)[number]
export type ComboboxShape = (typeof COMBOBOX_SHAPES)[number]
export type ComboboxPopoverContent = (typeof COMBOBOX_POPOVER_CONTENTS)[number]
export type ComboboxState = 'Default' | 'Hover' | 'Focused' | 'Open' | 'Invalid' | 'Disabled' | 'Loading'
export type ComboboxItemState = 'Default' | 'Focused' | 'Selected' | 'Disabled'

/** Phosphor regular bodies, as the file's glyphs draw them. */
const GLYPHS = {
  search: 'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z',
  close: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
  chevron: 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z',
  check: 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
  notch: 'M232,128a104,104,0,0,1-208,0c0-41,23.81-78.36,60.66-95.27a8,8,0,0,1,6.68,14.54C60.15,61.59,40,93.27,40,128a88,88,0,0,0,176,0c0-34.73-20.15-66.41-51.34-80.73a8,8,0,0,1,6.68-14.54C208.19,49.64,232,87,232,128Z',
} as const

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false" className={className}>
      <path d={d} />
    </svg>
  )
}

/** A glyph box sized by its recipe; the svg fills it. */
const iconBox = 'inline-flex shrink-0 items-center justify-center [&>svg]:size-full'

// ── ComboboxGroupLabel ──────────────────────────────────────────────────────

export interface ComboboxGroupLabelProps extends React.ComponentProps<'div'> {
  size?: ComboboxSize
}

function ComboboxGroupLabel({ size = 'default', className, ...props }: ComboboxGroupLabelProps) {
  return (
    <div
      data-slot="combobox-group-label"
      data-escala="ComboboxGroupLabel"
      data-size={size}
      className={cn('flex w-full shrink-0 items-center', className)}
      {...props}
    />
  )
}

/** A group of options: a `role="group"` named by its ComboboxGroupLabel. */
function ComboboxGroup({ label, size = 'default', children, ...props }: React.ComponentProps<'div'> & { label: React.ReactNode; size?: ComboboxSize }) {
  const id = React.useId()
  return (
    <div role="group" aria-labelledby={id} data-slot="combobox-group" className="flex w-full flex-col" {...props}>
      <ComboboxGroupLabel id={id} size={size}>{label}</ComboboxGroupLabel>
      {children}
    </div>
  )
}

// ── ComboboxItem ────────────────────────────────────────────────────────────

export interface ComboboxItemProps extends React.ComponentProps<'div'> {
  size?: ComboboxSize
  /** Pin a state (docs, Storybook, Figma parity). Live: `highlighted` → Focused, `selected` → Selected. */
  forceState?: ComboboxItemState
  /** The listbox's `aria-selected` (Figma State Selected). */
  selected?: boolean
  /** The keyboard / pointer highlight (`aria-activedescendant`; Figma State Focused). */
  highlighted?: boolean
  disabled?: boolean
  /** Figma IconLeadingVisible + IconLeadingIcon. */
  icon?: React.ReactNode
  /** Figma DescriptionVisible + Description. */
  description?: React.ReactNode
  /** Figma TrailingVisible + Trailing (a shortcut, a count). */
  trailing?: React.ReactNode
  /** Figma IndicatorVisible: the check of the selected row (default on). */
  indicator?: boolean
}

function ComboboxItem({
  size = 'default', forceState, selected, highlighted, disabled, icon, description, trailing, indicator = true,
  children, className, ...props
}: ComboboxItemProps) {
  const isDisabled = !!disabled || forceState === 'Disabled'
  const isSelected = forceState ? forceState === 'Selected' : !!selected
  const state: ComboboxItemState | undefined = forceState && forceState !== 'Default'
    ? forceState
    : isDisabled ? 'Disabled' : highlighted ? 'Focused' : isSelected ? 'Selected' : undefined
  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={isDisabled || undefined}
      data-slot="combobox-item"
      data-escala="ComboboxItem"
      data-size={size}
      data-force-state={state}
      data-highlighted={highlighted ? '' : undefined}
      className={cn('flex w-full shrink-0 cursor-pointer items-center aria-disabled:cursor-not-allowed', className)}
      {...props}
    >
      {icon != null && <span data-part="ComboboxItem.icon" aria-hidden className={iconBox}>{icon}</span>}
      <span data-part="ComboboxItem.text" className="flex min-w-0 flex-1 flex-col items-start">
        <span data-part="ComboboxItem.label" className="max-w-full truncate">{children}</span>
        {description != null && <span data-part="ComboboxItem.description" className="max-w-full truncate">{description}</span>}
      </span>
      {trailing != null && <span data-part="ComboboxItem.trailing" className="shrink-0 whitespace-nowrap">{trailing}</span>}
      {isSelected && indicator && (
        <span data-part="ComboboxItem.indicator" aria-hidden className={iconBox}><Glyph d={GLYPHS.check} /></span>
      )}
    </div>
  )
}

// ── ComboboxPopover ─────────────────────────────────────────────────────────

export interface ComboboxPopoverProps extends React.ComponentProps<'div'> {
  size?: ComboboxSize
  /** Figma Content: list · grouped draw the children; empty draws EmptyText. */
  content?: ComboboxPopoverContent
  /** Figma EmptyText (default "No match"). */
  emptyText?: React.ReactNode
  /** Figma FooterVisible + FooterText. */
  footer?: React.ReactNode
  /** The listbox's id (the trigger's `aria-controls`). */
  listId?: string
  /** The listbox's accessible name (default "Options"); the Combobox passes its own. */
  listLabel?: string
  listLabelledBy?: string
  width?: number | string
}

function ComboboxPopover({
  size = 'default', content = 'list', emptyText = 'No match', footer, listId, listLabel, listLabelledBy, width, children, className, style, ...props
}: ComboboxPopoverProps) {
  return (
    <div
      data-slot="combobox-popover"
      data-escala="ComboboxPopover"
      data-size={size}
      data-content={content}
      className={cn('flex flex-col overflow-hidden', className)}
      style={{ width, ...style }}
      {...props}
    >
      <div
        id={listId}
        role={content === 'empty' ? undefined : 'listbox'}
        aria-label={content === 'empty' || listLabelledBy ? undefined : listLabel ?? 'Options'}
        aria-labelledby={content === 'empty' ? undefined : listLabelledBy}
        data-part="ComboboxPopover.list"
        className="flex flex-col"
      >
        {content === 'empty'
          ? <div data-part="ComboboxPopover.empty" role="status" className="text-center">{emptyText}</div>
          : children}
      </div>
      {footer != null && <div data-part="ComboboxPopover.footer" className="flex items-center">{footer}</div>}
    </div>
  )
}

/** The rule between two groups of a grouped list. */
function ComboboxSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-part="ComboboxPopover.separator" role="none" aria-hidden className={cn('w-full', className)} {...props}>
      <div data-part="ComboboxPopover.line" className="w-full" />
    </div>
  )
}

// ── Combobox ────────────────────────────────────────────────────────────────

export interface ComboboxOption {
  label: string
  value: string
  /** Options sharing a group are listed under its ComboboxGroupLabel. */
  group?: string
  description?: React.ReactNode
  icon?: React.ReactNode
  trailing?: React.ReactNode
  disabled?: boolean
}

export interface ComboboxProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue' | 'placeholder'> {
  options: ComboboxOption[]
  size?: ComboboxSize
  variant?: ComboboxVariant
  shape?: ComboboxShape
  value?: string
  defaultValue?: string
  onValueChange?: (value: string | undefined) => void
  /** Figma Placeholder (default "Search framework..."). */
  placeholder?: string
  /** Pin a state (docs, Storybook, Figma parity). Open also draws the list. */
  forceState?: ComboboxState
  /** Keep the list open (docs, previews). */
  forceOpen?: boolean
  /** State Loading: the CircleNotch replaces the chevron. */
  loading?: boolean
  disabled?: boolean
  'aria-invalid'?: boolean | 'true' | 'false'
  /** Figma IconLeadingVisible + IconLeadingIcon: undefined = MagnifyingGlass, null hides it. */
  leading?: React.ReactNode
  /** Figma ClearVisible: the ✕ that empties the value. */
  clearable?: boolean
  /** Figma ChevronVisible (default on). */
  chevron?: boolean
  /** The popover's EmptyText and footer (FooterVisible + FooterText). */
  emptyText?: React.ReactNode
  footer?: React.ReactNode
  name?: string
  /** The trigger's width (variant default fills it; the file draws 280). */
  width?: number | string
  /** The list's width; at least the trigger's. */
  popoverWidth?: number | string
}

function Combobox({
  options, size = 'default', variant = 'default', shape = 'rounded', value, defaultValue, onValueChange,
  placeholder = 'Search framework...', forceState, forceOpen, loading, disabled, leading, clearable, chevron = true,
  emptyText, footer, name, id, width, popoverWidth, className, style, ...props
}: ComboboxProps) {
  const {
    'aria-invalid': ariaInvalid, 'aria-describedby': describedBy, 'aria-label': ariaLabel, 'aria-labelledby': labelledBy, ...rest
  } = props as React.ComponentProps<'div'> & { 'aria-invalid'?: boolean | 'true' | 'false' }
  const [inner, setInner] = React.useState(defaultValue)
  const selected = value !== undefined ? value : inner
  const [query, setQuery] = React.useState('')
  const [typing, setTyping] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [userOpen, setUserOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const input = React.useRef<HTMLInputElement>(null)
  const listId = React.useId()
  const optionId = (i: number) => `${listId}-o${i}`

  const isDisabled = !!disabled || forceState === 'Disabled'
  const isLoading = !!loading || forceState === 'Loading'
  const invalid = forceState === 'Invalid' || ariaInvalid === true || ariaInvalid === 'true'
  const open = !isDisabled && (!!forceOpen || forceState === 'Open' || (focused && userOpen))
  const pinned: ComboboxState | undefined = forceState && forceState !== 'Default'
    ? forceState
    : isDisabled ? 'Disabled' : isLoading ? 'Loading' : invalid ? 'Invalid' : open ? 'Open' : undefined

  const chosen = options.find((o) => o.value === selected)
  const shown = typing ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options
  const enabled = shown.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0)

  const commit = (next: string | undefined) => { setInner(next); onValueChange?.(next) }
  const pick = (o: ComboboxOption) => {
    if (o.disabled) return
    commit(o.value)
    setTyping(false); setQuery(''); setUserOpen(false)
  }
  const openList = () => {
    setUserOpen(true)
    const at = shown.findIndex((o) => o.value === selected && !o.disabled)
    setActive(at >= 0 ? at : enabled[0] ?? 0)
  }
  const move = (dir: 1 | -1) => {
    if (!enabled.length) return
    const at = enabled.indexOf(active)
    setActive(enabled[at < 0 ? 0 : Math.min(enabled.length - 1, Math.max(0, at + dir))])
  }

  // Grouped when any option names a group: one ComboboxGroup per group, a rule between groups.
  const grouped = shown.some((o) => o.group)
  const item = (o: ComboboxOption, i: number) => (
    <ComboboxItem
      key={o.value}
      id={optionId(i)}
      size={size}
      selected={o.value === selected}
      highlighted={i === active}
      disabled={o.disabled}
      icon={o.icon}
      description={o.description}
      trailing={o.trailing}
      onMouseDown={(e) => { e.preventDefault(); pick(o) }}
      onMouseEnter={() => { if (!o.disabled) setActive(i) }}
    >
      {o.label}
    </ComboboxItem>
  )
  const rows: React.ReactNode[] = []
  if (grouped) {
    const groups: { name: string | undefined; items: React.ReactNode[] }[] = []
    shown.forEach((o, i) => {
      if (!groups.length || groups[groups.length - 1].name !== o.group) groups.push({ name: o.group, items: [] })
      groups[groups.length - 1].items.push(item(o, i))
    })
    groups.forEach((g, gi) => {
      if (gi) rows.push(<ComboboxSeparator key={`sep-${gi}`} />)
      rows.push(g.name
        ? <ComboboxGroup key={`group-${gi}`} label={g.name} size={size}>{g.items}</ComboboxGroup>
        : <React.Fragment key={`group-${gi}`}>{g.items}</React.Fragment>)
    })
  } else shown.forEach((o, i) => rows.push(item(o, i)))

  const leadingGlyph = leading === undefined ? <Glyph d={GLYPHS.search} /> : leading
  return (
    <div
      data-slot="combobox-wrap"
      className={cn('relative', variant === 'compact' ? 'inline-flex w-fit' : 'flex w-full')}
      style={{ width: variant === 'compact' ? undefined : width, ...style }}
    >
      <div
        data-slot="combobox"
        data-escala="Combobox"
        data-size={size}
        data-variant={variant}
        data-shape={shape}
        data-force-state={pinned}
        aria-disabled={isDisabled || undefined}
        className={cn(
          'flex items-center',
          variant === 'compact' ? 'w-fit' : 'w-full min-w-0',
          isDisabled ? 'cursor-not-allowed' : 'cursor-text',
          className,
        )}
        onMouseDown={(e) => {
          if (isDisabled || e.target === input.current) return
          e.preventDefault()
          input.current?.focus()
          if (userOpen) setUserOpen(false)
          else openList()
        }}
        {...rest}
      >
        {leadingGlyph != null && <span data-part="Combobox.icon" aria-hidden className={iconBox}>{leadingGlyph}</span>}
        <input
          ref={input}
          id={id}
          name={name}
          data-part="Combobox.text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? optionId(active) : undefined}
          aria-invalid={invalid || undefined}
          aria-busy={isLoading || undefined}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          value={typing ? query : chosen?.label ?? ''}
          placeholder={placeholder}
          disabled={isDisabled}
          readOnly={isLoading || undefined}
          size={variant === 'compact' ? Math.max(1, (typing ? query : chosen?.label || placeholder).length) : undefined}
          className={cn(
            'min-w-0 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed',
            variant === 'compact' ? 'field-sizing-content' : 'flex-1 text-ellipsis',
          )}
          onChange={(e) => { setTyping(true); setQuery(e.target.value); setUserOpen(true); setActive(0) }}
          onFocus={() => setFocused(true)}
          onMouseDown={() => { if (!isDisabled && !userOpen) openList() }}
          onBlur={() => { setFocused(false); setUserOpen(false); setTyping(false); setQuery('') }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              if (!userOpen) openList()
              else move(e.key === 'ArrowDown' ? 1 : -1)
            } else if (e.key === 'Enter' && open && shown[active]) {
              e.preventDefault(); pick(shown[active])
            } else if (e.key === 'Escape' && userOpen) {
              e.preventDefault(); setUserOpen(false); setTyping(false); setQuery('')
            }
          }}
        />
        {clearable && (
          <button
            type="button"
            data-part="Combobox.icon"
            aria-label="Clear"
            tabIndex={-1}
            disabled={isDisabled}
            className={cn(iconBox, 'cursor-pointer border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed')}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); commit(undefined); setTyping(false); setQuery('') }}
          >
            <Glyph d={GLYPHS.close} />
          </button>
        )}
        {isLoading ? (
          <span data-part="Combobox.icon" aria-hidden className={iconBox}>
            <Glyph d={GLYPHS.notch} className="animate-spin motion-reduce:animate-none" />
          </span>
        ) : chevron ? (
          <span data-part="Combobox.icon" aria-hidden className={iconBox}><Glyph d={GLYPHS.chevron} /></span>
        ) : null}
      </div>
      {open && (
        <ComboboxPopover
          size={size}
          listId={listId}
          listLabel={ariaLabel}
          listLabelledBy={labelledBy}
          content={shown.length ? (grouped ? 'grouped' : 'list') : 'empty'}
          emptyText={emptyText}
          footer={footer}
          width={popoverWidth}
          className="absolute top-full left-0 z-50 mt-[var(--spacing-gap-control,8px)] min-w-full"
          onMouseDown={(e) => e.preventDefault()}
        >
          {rows}
        </ComboboxPopover>
      )}
    </div>
  )
}

export { Combobox, ComboboxPopover, ComboboxItem, ComboboxGroup, ComboboxGroupLabel, ComboboxSeparator }
