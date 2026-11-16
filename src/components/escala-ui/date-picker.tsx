// Escala components: DatePickerTrigger — the Figma `DatePickerTrigger` set
// (design-plans/date-picker-trigger-contract.md, 425:199). DatePickerPopover (425:2276,
// design-plans/date-picker-popover-contract.md), the panel it opens, lives in this file too.
//  · DatePickerTrigger: an input-styled button that opens the popover — the calendar glyph
//    and the placeholder or the formatted date. `size` sm · default · lg, State Default ·
//    Hover · Focused · Invalid · Disabled · Loading (Hover and Focused come from the pointer
//    and keyboard; `aria-invalid`, `loading` and `disabled` pin the others; `forceState` pins
//    one for docs). Value (placeholder · filled) needs no prop: with no `valueText`
//    the placeholder shows. Loading swaps the glyph for the Spinner. A label and the error text
//    come from Field, which wires `id`, `aria-describedby`, `aria-invalid` and `disabled`.
// Paint: the DatePickerTrigger recipe.
//  · DatePickerPopover: the THIN SHELL of the file's set — Radius/overlay and the Shadow/lg lift around
//    one Calendar (the Calendar paints the panel: fill, edge, header, days, footer, presets). It opens
//    below the trigger with an 8px offset (`sideOffset`), closes on Escape (Radix) and, when a day is
//    chosen, as the caller decides. `size` and `mode` are the file's Size · Mode: they surface as
//    `data-size` / `data-mode`; the Calendar you pass picks the 322 · 250 · 482 · 390 widths.
// Paint: the DatePickerPopover recipe.
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { Spinner } from './spinner'
import { Calendar, type CalendarMode, type CalendarSize, type CalendarValue } from './calendar'
import { Popover, PopoverTrigger } from './popover'
import { usePortalContainer } from './portal-scope'

export const DATE_PICKER_TRIGGER_SIZES = ['default', 'sm', 'lg'] as const
export type DatePickerTriggerSize = (typeof DATE_PICKER_TRIGGER_SIZES)[number]
export type DatePickerTriggerState = 'Default' | 'Hover' | 'Focused' | 'Invalid' | 'Disabled' | 'Loading'

/** Phosphor `calendar-blank` (regular), the file's icon/calendar. */
function CalendarGlyph() {
  return (
    glyph('calendar-blank')
  )
}

/** "Nov 12, 2026" — the file's own sample format. */
export function formatPickedDate(date: Date, locale = 'en-US') {
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

export interface DatePickerTriggerProps extends React.ComponentProps<'button'> {
  size?: DatePickerTriggerSize
  /** Pin a state without a pointer (docs, Storybook, Figma parity). */
  forceState?: DatePickerTriggerState
  /** State Loading: the Spinner in place of the glyph, `aria-busy`. */
  loading?: boolean
  /** Figma ValueText (Value filled): a Date is formatted as "Nov 12, 2026". Omit it for Value placeholder. */
  valueText?: Date | React.ReactNode
  /** Figma PlaceholderText (default "Select date"). */
  placeholderText?: React.ReactNode
}

function DatePickerTrigger({
  size = 'default', forceState, loading, valueText, placeholderText = 'Select date', disabled, className, ref, ...props
}: DatePickerTriggerProps) {
  const isDisabled = !!disabled || forceState === 'Disabled'
  const isLoading = !!loading || forceState === 'Loading'
  const ariaInvalid = props['aria-invalid']
  const invalid = forceState === 'Invalid' || ariaInvalid === true || ariaInvalid === 'true'
  // A live disabled, loading or invalid trigger pins its look (as Input does).
  const pinned = forceState && forceState !== 'Default'
    ? forceState
    : isDisabled ? 'Disabled' : isLoading ? 'Loading' : invalid ? 'Invalid' : undefined
  const text = valueText instanceof Date ? formatPickedDate(valueText) : valueText
  const filled = text != null && text !== ''
  return (
    <button
      ref={ref}
      type="button"
      data-slot="date-picker-trigger"
      data-escala="DatePickerTrigger"
      data-size={size}
      data-force-state={pinned}
      aria-disabled={isDisabled || undefined}
      aria-haspopup="dialog"
      aria-busy={isLoading || undefined}
      disabled={isDisabled}
      className={cn('flex w-full items-center text-left disabled:cursor-not-allowed', className)}
      {...props}
    >
      {isLoading ? (
        <span data-part="DatePickerTrigger.spinner" aria-hidden className="relative inline-flex shrink-0 overflow-visible">
          {/* The file's Spinner: a 16px glyph pinned top-left, whatever the frame. */}
          <Spinner aria-hidden role={undefined} aria-label={undefined} className="absolute left-0 top-0 size-4" />
        </span>
      ) : (
        <span data-part="DatePickerTrigger.icon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full"><CalendarGlyph /></span>
      )}
      <span data-part={filled ? 'DatePickerTrigger.text' : 'DatePickerTrigger.placeholder'} className="min-w-0 flex-1 truncate">
        {filled ? text : placeholderText}
      </span>
    </button>
  )
}

export const DATE_PICKER_POPOVER_SIZES = ['default', 'sm'] as const
export type DatePickerPopoverSize = (typeof DATE_PICKER_POPOVER_SIZES)[number]
export const DATE_PICKER_POPOVER_MODES = ['single', 'range'] as const
export type DatePickerPopoverMode = (typeof DATE_PICKER_POPOVER_MODES)[number]

export interface DatePickerPopoverProps extends React.ComponentProps<typeof PopoverPrimitive.Content> {
  /** Figma Size (default 322px / sm 250px wide in single mode). */
  size?: DatePickerPopoverSize
  /** Figma Mode: single date, or a range with the presets rail. */
  mode?: DatePickerPopoverMode
  /** Draw the panel in place instead of in a Portal (docs, previews). */
  inline?: boolean
}

/** Use inside `<Popover>`: `<PopoverTrigger asChild><DatePickerTrigger /></PopoverTrigger><DatePickerPopover>…Calendar…</DatePickerPopover>`. */
// The file's popover overrides its Calendar's body padding: Spacing/inset-surface at default (the
// Calendar set itself pads 16); sm keeps the Calendar's 12.
const BODY_INSET: Record<string, string> = {
  // `!`: the Calendar recipe's own body padding is a more specific rule.
  default: '[&_[data-part="Calendar.body"]]:p-[var(--spacing-inset-surface)]!',
  sm: '',
}

function DatePickerPopover({
  size = 'default', mode = 'single', inline, sideOffset = 8, align = 'start', className, children, ...props
}: DatePickerPopoverProps) {
  const container = usePortalContainer()
  if (inline) {
    return (
      <div
        data-slot="date-picker-popover"
        data-escala="DatePickerPopover"
        data-size={size}
        data-mode={mode}
        className={cn('relative flex w-fit flex-col', BODY_INSET[size], className)}
        {...(props as React.ComponentProps<'div'>)}
      >
        {children}
      </div>
    )
  }
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="date-picker-popover"
        data-escala="DatePickerPopover"
        data-size={size}
        data-mode={mode}
        sideOffset={sideOffset}
        align={align}
        className={cn('z-50 flex w-fit flex-col outline-none', BODY_INSET[size], className)}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

/** A selection as the trigger writes it: "Nov 12, 2026" · "Nov 10, 2026 – Nov 18, 2026" · "Nov 4, 2026, Nov 12, 2026". */
export function formatCalendarValue(value: CalendarValue): string | undefined {
  if (value instanceof Date) return formatPickedDate(value)
  if (Array.isArray(value)) return value.length ? value.map((d) => formatPickedDate(d)).join(', ') : undefined
  if (value && 'from' in value) return value.to && value.to.getTime() !== value.from.getTime() ? `${formatPickedDate(value.from)} – ${formatPickedDate(value.to)}` : formatPickedDate(value.from)
  return undefined
}

export interface DatePickerProps extends Omit<DatePickerTriggerProps, 'valueText' | 'defaultValue' | 'onChange' | 'value'> {
  /** Figma Mode of the popover's Calendar: one date, several, or a range (it adds the presets rail). */
  mode?: CalendarMode
  /** The popover's Size follows the trigger's: sm → 250 px, else 322 px. */
  calendarSize?: CalendarSize
  value?: CalendarValue
  defaultValue?: CalendarValue
  onValueChange?: (value: CalendarValue) => void
  /** Open state (controlled) and its first value. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/** The trigger and the popover it opens, wired: a click (or Enter / Space) opens the DatePickerPopover anchored 8px under the trigger on
 *  the popover's own motion (`popover-enter` / `popover-exit`); a day updates the trigger's text; Apply, Escape or a click outside close it
 *  and focus returns to the trigger. In `single` mode choosing a day closes it. */
function DatePicker({
  mode = 'single', size = 'default', calendarSize, value, defaultValue, onValueChange, open, defaultOpen = false, onOpenChange, ...triggerProps
}: DatePickerProps) {
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  const [ownValue, setOwnValue] = React.useState<CalendarValue>(defaultValue)
  const isOpen = open ?? ownOpen
  const current = value === undefined ? ownValue : value
  const setOpen = (next: boolean) => { if (open === undefined) setOwnOpen(next); onOpenChange?.(next) }
  const first = current instanceof Date ? current : Array.isArray(current) ? current[0] : current && 'from' in current ? current.from : undefined
  const panelSize = calendarSize ?? (size === 'sm' ? 'sm' : 'default')
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DatePickerTrigger size={size} valueText={formatCalendarValue(current)} {...triggerProps} />
      </PopoverTrigger>
      <DatePickerPopover size={panelSize} mode={mode === 'range' ? 'range' : 'single'}>
        <Calendar
          size={panelSize} mode={mode} presets={mode === 'range'} footer defaultMonth={first ?? new Date()}
          value={current}
          onValueChange={(next) => { if (value === undefined) setOwnValue(next); onValueChange?.(next); if (mode === 'single' && next instanceof Date) setOpen(false) }}
          onApply={() => setOpen(false)}
        />
      </DatePickerPopover>
    </Popover>
  )
}

export { DatePicker, DatePickerTrigger, DatePickerPopover }
