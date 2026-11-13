// Calendar is the FIGMA `Calendar` set (design-plans/calendar-contract.md, 424:4667): the date panel,
// a Surface/layer-1 card (Border/default edge, Radius/container) holding an optional CalendarPresets
// rail (`presets`, Figma PresetsVisible) beside a column: the body (CalendarHeader over CalendarMonth)
// and an optional CalendarFooter (`footer`, Figma FooterVisible). `size` default · sm, `mode` single ·
// multiple · range and `header` single · multiple · plain are the file's axes. Month navigation,
// selection and arrow-key movement between days are code. With no month and no value it shows the
// file's own November 2026 sample. It replaced the shadcn / react-day-picker calendar (2026-11-12).
//
// CalendarDay is the FIGMA `CalendarDay` set (design-plans/calendar-day-contract.md, 421:309):
// one day cell, Size default 40 · sm 32 × State × Variant default · secondary. Hover and Focused
// come from the pointer and keyboard; `state` pins the data states (Today, Selected, RangeMiddle,
// RangeStart, RangeEnd, Outside, Disabled, Unavailable) and `forceState` pins any state for docs.
// A pinned state stops the pointer rules (a selected day has no hover look). `indicator` is
// Figma IndicatorVisible (the dash under the date); `children` is the TEXT property Day.
// `shape` is the file's instance override: rounded · pill · square. Paint: the CalendarDay recipe.
//
// CalendarHeader is the FIGMA `CalendarHeader` set (design-plans/calendar-header-contract.md, 422:355):
// the row above the days, as wide as seven cells. `size` default · sm, `header` single (one
// "Month Year" chip) · multiple (a month chip and a year chip) · plain (the bare label); `label`,
// `month` and `year` are the file's TEXT properties. Arrows flank the title. Paint: the CalendarHeader recipe.
//
// CalendarMonth is the FIGMA `CalendarMonth` set (design-plans/calendar-month-contract.md, 422:1713):
// one visible month, Sunday first, seven cells wide: a weekday row over the weeks of CalendarDay
// cells. `size` default · sm, `mode` single · multiple · range and `variant` default · secondary are
// the file's axes. With no data it shows the file's own November 2026 sample (today the 7th; selected
// the 12th, the 4th, 12th, 19th and 30th, or the range 10–18; 24 and 25 disabled, 27 unavailable).
// Paint: the CalendarMonth recipe; the cells are CalendarDay.
//
// CalendarPresets is the FIGMA `CalendarPresets` set (design-plans/calendar-presets-contract.md, 423:988):
// the rail beside a range Calendar, a "PRESETS" label over a list of quick ranges with a divider on its
// right edge. `size` default · sm and `variant` default · secondary (CalendarDay's) are the file's axes;
// `presets`, `selected` and `onSelect` are code. The selected preset takes the range tint.
// Paint: the CalendarPresets recipe.
//
// CalendarFooter is the FIGMA `CalendarFooter` set (design-plans/calendar-footer-contract.md, 423:963):
// the bar under the Calendar body, a top divider, "Today" (Button link) at the start and "Clear"
// (Button outline secondary) + "Apply" (Button solid) at the end, all at the footer's `size`
// (default · sm, the only axis). Labels and handlers are code. Paint: the CalendarFooter recipe + Button.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'

export const CALENDAR_DAY_SIZES = ['default', 'sm'] as const
export type CalendarDaySize = (typeof CALENDAR_DAY_SIZES)[number]
export const CALENDAR_DAY_VARIANTS = ['default', 'secondary'] as const
export type CalendarDayVariant = (typeof CALENDAR_DAY_VARIANTS)[number]
export const CALENDAR_DAY_STATES = ['Default', 'Hover', 'Today', 'Selected', 'RangeMiddle', 'RangeStart', 'RangeEnd', 'Outside', 'Disabled', 'Unavailable', 'Focused'] as const
export type CalendarDayState = (typeof CALENDAR_DAY_STATES)[number]
export type CalendarDayShape = 'rounded' | 'pill' | 'square'

export interface CalendarDayProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  size?: CalendarDaySize
  variant?: CalendarDayVariant
  /** Figma State. Hover and Focused come from the pointer and keyboard unless pinned with `forceState`. */
  state?: CalendarDayState
  /** Pin any state without a pointer (docs, Storybook, Figma parity). */
  forceState?: CalendarDayState
  /** Figma IndicatorVisible: the 12×2 dash under the date. */
  indicator?: boolean
  /** The file's instance override for the cell's corner. */
  shape?: CalendarDayShape
  /** Figma Day (default "15"). */
  children?: React.ReactNode
}

function CalendarDay({
  size = 'default', variant = 'default', state, forceState, indicator = false, shape = 'rounded', children = '15',
  disabled, className, ref, ...props
}: CalendarDayProps) {
  const pinned = forceState ?? (state && state !== 'Default' ? state : undefined)
  const off = !!disabled || pinned === 'Disabled' || pinned === 'Unavailable'
  const effective: CalendarDayState | undefined = off && pinned !== 'Unavailable' ? 'Disabled' : pinned
  const band = pinned === 'RangeMiddle' ? 'full' : pinned === 'RangeStart' ? 'start' : pinned === 'RangeEnd' ? 'end' : undefined
  return (
    <button
      ref={ref}
      type="button"
      data-slot="calendar-day"
      data-escala="CalendarDay"
      data-size={size}
      data-variant={variant}
      data-force-state={effective}
      aria-disabled={off || undefined}
      disabled={off}
      className={cn('relative inline-flex shrink-0 items-center justify-center border-0 bg-transparent p-0 outline-none select-none disabled:cursor-not-allowed', className)}
      {...props}
    >
      {band && (
        <span
          data-part="CalendarDay.band"
          aria-hidden
          className={cn('absolute inset-y-0', band === 'full' && 'inset-x-0', band === 'start' && 'left-1/2 right-0', band === 'end' && 'left-0 right-1/2')}
        />
      )}
      <span data-part="CalendarDay.cell" data-shape={shape} className="relative inline-flex size-full items-center justify-center">
        <span data-part="CalendarDay.day" className="tabular-nums">{children}</span>
      </span>
      {indicator && (
        <span data-part="CalendarDay.indicator" aria-hidden className="absolute bottom-[var(--spacing-1)] left-1/2 -translate-x-1/2" />
      )}
    </button>
  )
}

export const CALENDAR_HEADER_SIZES = ['default', 'sm'] as const
export type CalendarHeaderSize = (typeof CALENDAR_HEADER_SIZES)[number]
export const CALENDAR_HEADER_HEADERS = ['single', 'multiple', 'plain'] as const
export type CalendarHeaderHeader = (typeof CALENDAR_HEADER_HEADERS)[number]

function CaretGlyph({ d }: { d: string }) {
  return <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false" className="size-full"><path d={d} /></svg>
}
// Phosphor caret-left · caret-right · caret-down (regular), the file's icon/chevron-*.
const CARET_LEFT = 'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z'
const CARET_RIGHT = 'M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z'
const CARET_DOWN = 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z'

export interface CalendarHeaderProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  size?: CalendarHeaderSize
  /** single: one combined chip · multiple: month and year chips · plain: static heading. */
  header?: CalendarHeaderHeader
  /** Figma Label (single · plain), default "November 2026". */
  label?: React.ReactNode
  /** Figma Month (multiple), default "November". */
  month?: React.ReactNode
  /** Figma Year (multiple), default "2026". */
  year?: React.ReactNode
  onPreviousMonth?: () => void
  onNextMonth?: () => void
  /** Click of the combined chip (single). */
  onLabelClick?: () => void
  onMonthClick?: () => void
  onYearClick?: () => void
}

function CalendarHeader({
  size = 'default', header = 'single', label = 'November 2026', month = 'November', year = '2026',
  onPreviousMonth, onNextMonth, onLabelClick, onMonthClick, onYearClick, className, ...props
}: CalendarHeaderProps) {
  const chip = (name: string, text: React.ReactNode, onClick?: () => void) => (
    <button type="button" data-part="CalendarHeader.chip" data-chip={name} onClick={onClick} className="inline-flex cursor-pointer items-center border-0 bg-transparent outline-none">
      <span data-part="CalendarHeader.label">{text}</span>
      <span data-part="CalendarHeader.chevron" aria-hidden className="inline-flex shrink-0"><CaretGlyph d={CARET_DOWN} /></span>
    </button>
  )
  return (
    <div
      data-slot="calendar-header"
      data-escala="CalendarHeader"
      data-size={size}
      data-header={header}
      className={cn('flex items-center justify-between', className)}
      {...props}
    >
      <button type="button" aria-label="Previous month" data-part="CalendarHeader.nav" onClick={onPreviousMonth} className="inline-flex shrink-0 cursor-pointer items-center justify-center bg-transparent p-0 outline-none">
        <span data-part="CalendarHeader.navIcon" className="inline-flex"><CaretGlyph d={CARET_LEFT} /></span>
      </button>
      <div data-part="CalendarHeader.title" className="flex items-center">
        {header === 'single' && chip('month-year', label, onLabelClick)}
        {header === 'multiple' && (<>{chip('month', month, onMonthClick)}{chip('year', year, onYearClick)}</>)}
        {header === 'plain' && <span data-part="CalendarHeader.label">{label}</span>}
      </div>
      <button type="button" aria-label="Next month" data-part="CalendarHeader.nav" onClick={onNextMonth} className="inline-flex shrink-0 cursor-pointer items-center justify-center bg-transparent p-0 outline-none">
        <span data-part="CalendarHeader.navIcon" className="inline-flex"><CaretGlyph d={CARET_RIGHT} /></span>
      </button>
    </div>
  )
}

export const CALENDAR_MONTH_SIZES = ['default', 'sm'] as const
export type CalendarMonthSize = (typeof CALENDAR_MONTH_SIZES)[number]
export const CALENDAR_MONTH_MODES = ['single', 'multiple', 'range'] as const
export type CalendarMonthMode = (typeof CALENDAR_MONTH_MODES)[number]
export const CALENDAR_MONTH_VARIANTS = ['default', 'secondary'] as const
export type CalendarMonthVariant = (typeof CALENDAR_MONTH_VARIANTS)[number]

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const day0 = (y: number, m: number, d: number) => new Date(y, m, d)

export interface CalendarMonthProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> {
  size?: CalendarMonthSize
  /** single and multiple mark `selected`; range marks `range`. */
  mode?: CalendarMonthMode
  variant?: CalendarMonthVariant
  /** The month shown (any day of it). Default: November 2026, the file's sample. */
  month?: Date
  /** Today. Default: the 7th of the month. */
  today?: Date
  /** Selected days (single · multiple). Default: the file's sample for the mode. */
  selected?: Date[]
  /** The range (range mode); null = none. Default without a month: the 10th to the 18th. */
  range?: CalendarDateRange | null
  /** Days drawn Disabled. Default: the 24th and 25th. */
  disabledDays?: Date[]
  /** Days drawn Unavailable. Default: the 27th. */
  unavailableDays?: Date[]
  /** A day was pressed. */
  onDayClick?: (date: Date) => void
}

function CalendarMonth({
  size = 'default', mode = 'single', variant = 'default', month, today, selected, range, disabledDays, unavailableDays, onDayClick, className, ...props
}: CalendarMonthProps) {
  // Without a month it shows the file's sample (November 2026); with one, only the data it is given.
  const sample = !month
  const base = month ?? day0(2026, 10, 1)
  const y = base.getFullYear()
  const m = base.getMonth()
  const first = day0(y, m, 1)
  const lead = first.getDay()
  const count = new Date(y, m + 1, 0).getDate()
  const weeks = Math.ceil((lead + count) / 7)
  const todayKey = dayKey(today ?? (sample ? day0(y, m, 7) : new Date()))
  const picked = new Set((selected ?? (sample ? (mode === 'multiple' ? [4, 12, 19, 30] : [12]).map((d) => day0(y, m, d)) : [])).map(dayKey))
  const span = mode === 'range' ? (range === undefined ? (sample ? { from: day0(y, m, 10), to: day0(y, m, 18) } : null) : range) : null
  const from = span ? dayKey(span.from) : ''
  const to = span?.to ? dayKey(span.to) : ''
  const between = (d: Date) => !!span?.to && d.getTime() > span.from.getTime() && d.getTime() < span.to.getTime()
  const off = new Set((disabledDays ?? (sample ? [day0(y, m, 24), day0(y, m, 25)] : [])).map(dayKey))
  const gone = new Set((unavailableDays ?? (sample ? [day0(y, m, 27)] : [])).map(dayKey))

  const stateOf = (d: Date): CalendarDayState => {
    const k = dayKey(d)
    if (d.getMonth() !== m) return 'Outside'
    if (gone.has(k)) return 'Unavailable'
    if (off.has(k)) return 'Disabled'
    if (mode === 'range') {
      // A range with only its first day (or one day) reads as a selected day.
      if (k === from && (!to || to === from)) return 'Selected'
      if (k === from) return 'RangeStart'
      if (to && k === to) return 'RangeEnd'
      if (between(d)) return 'RangeMiddle'
    } else if (picked.has(k)) return 'Selected'
    if (k === todayKey) return 'Today'
    return 'Default'
  }

  const days = Array.from({ length: weeks * 7 }, (_, i) => day0(y, m, 1 - lead + i))
  const states = days.map(stateOf)
  // One day takes Tab (the selection, else today, else the first enabled day of the month);
  // the arrows move between the others.
  const inMonth = (i: number) => days[i].getMonth() === m && states[i] !== 'Disabled' && states[i] !== 'Unavailable'
  const tabbable = [states.findIndex((st) => st === 'Selected' || st === 'RangeStart'), states.findIndex((st) => st === 'Today'), days.findIndex((_, i) => inMonth(i))].find((i) => i >= 0 && inMonth(i)) ?? -1
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-escala="CalendarDay"]')]
    let i = buttons.indexOf(e.target as HTMLButtonElement)
    if (i < 0) return
    e.preventDefault()
    for (i += step; i >= 0 && i < buttons.length; i += step) {
      if (!buttons[i].disabled) { buttons[i].focus(); break }
    }
  }
  const fullDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div
      data-slot="calendar-month"
      data-escala="CalendarMonth"
      data-size={size}
      data-mode={mode}
      data-variant={variant}
      className={cn('flex flex-col', className)}
      onKeyDown={onKeyDown}
      {...props}
    >
      <div data-part="CalendarMonth.weekdays" className="flex">
        {WEEKDAY_NAMES.map((n) => (
          <span key={n} data-part="CalendarMonth.weekday" className="inline-flex shrink-0 items-center justify-center">{n}</span>
        ))}
      </div>
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} data-part="CalendarMonth.week" className="flex">
          {Array.from({ length: 7 }, (_, c) => {
            const i = w * 7 + c
            const d = days[i]
            const st = states[i]
            return (
              <CalendarDay
                key={c}
                size={size}
                variant={variant}
                state={st}
                tabIndex={i === tabbable ? 0 : -1}
                aria-label={fullDate(d)}
                aria-pressed={st === 'Selected' || st === 'RangeStart' || st === 'RangeEnd' || st === 'RangeMiddle'}
                onClick={onDayClick ? () => onDayClick(d) : undefined}
              >
                {d.getDate()}
              </CalendarDay>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export const CALENDAR_PRESETS_SIZES = ['default', 'sm'] as const
export type CalendarPresetsSize = (typeof CALENDAR_PRESETS_SIZES)[number]
export const CALENDAR_PRESETS_VARIANTS = ['default', 'secondary'] as const
export type CalendarPresetsVariant = (typeof CALENDAR_PRESETS_VARIANTS)[number]
/** The file's five presets, in its order. */
export const CALENDAR_PRESET_LABELS = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'This month']

export interface CalendarPresetsProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> {
  size?: CalendarPresetsSize
  /** Matches CalendarDay's Variant: the tint of the selected preset. */
  variant?: CalendarPresetsVariant
  /** The rail's heading. Default "PRESETS", as the file writes it. */
  label?: React.ReactNode
  /** The presets, in order. Default: the file's five. */
  presets?: string[]
  /** The preset whose range is the selection. Default "Last 7 days", the file's sample. */
  selected?: string | null
  onSelect?: (preset: string) => void
}

function CalendarPresets({
  size = 'default', variant = 'default', label = 'PRESETS', presets = CALENDAR_PRESET_LABELS, selected = 'Last 7 days', onSelect, className, ...props
}: CalendarPresetsProps) {
  return (
    <div
      data-slot="calendar-presets"
      data-escala="CalendarPresets"
      data-size={size}
      data-variant={variant}
      className={cn('flex shrink-0 flex-col', className)}
      {...props}
    >
      <span data-part="CalendarPresets.label">{label}</span>
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          data-part="CalendarPresets.preset"
          data-selected={p === selected ? 'true' : undefined}
          aria-pressed={p === selected}
          onClick={onSelect ? () => onSelect(p) : undefined}
          className="flex w-full shrink-0 cursor-pointer items-center border-0 bg-transparent text-left outline-none"
        >
          {p}
        </button>
      ))}
    </div>
  )
}

export const CALENDAR_FOOTER_SIZES = ['default', 'sm'] as const
export type CalendarFooterSize = (typeof CALENDAR_FOOTER_SIZES)[number]

export interface CalendarFooterProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  size?: CalendarFooterSize
  /** The link at the start. Default "Today". */
  todayLabel?: React.ReactNode
  /** The outline action. Default "Clear". */
  clearLabel?: React.ReactNode
  /** The solid action. Default "Apply". */
  applyLabel?: React.ReactNode
  onToday?: () => void
  onClear?: () => void
  onApply?: () => void
}

function CalendarFooter({
  size = 'default', todayLabel = 'Today', clearLabel = 'Clear', applyLabel = 'Apply', onToday, onClear, onApply, className, ...props
}: CalendarFooterProps) {
  return (
    <div
      data-slot="calendar-footer"
      data-escala="CalendarFooter"
      data-size={size}
      className={cn('flex shrink-0 items-center justify-between', className)}
      {...props}
    >
      <Button variant="default" appearance="link" size={size} onClick={onToday}>{todayLabel}</Button>
      <div data-part="CalendarFooter.actions" className="flex items-center">
        <Button variant="secondary" appearance="outline" size={size} onClick={onClear}>{clearLabel}</Button>
        <Button variant="default" appearance="solid" size={size} onClick={onApply}>{applyLabel}</Button>
      </div>
    </div>
  )
}

export interface CalendarDateRange { from: Date; to?: Date }
export const CALENDAR_SIZES = ['default', 'sm'] as const
export type CalendarSize = (typeof CALENDAR_SIZES)[number]
export const CALENDAR_MODES = ['single', 'multiple', 'range'] as const
export type CalendarMode = (typeof CALENDAR_MODES)[number]
export const CALENDAR_HEADERS = ['single', 'multiple', 'plain'] as const
export type CalendarHeaderKind = (typeof CALENDAR_HEADERS)[number]
/** single → a Date, multiple → Date[], range → { from, to }. */
export type CalendarValue = Date | Date[] | CalendarDateRange | undefined

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const sameDay = (a?: Date, b?: Date) => !!a && !!b && dayKey(a) === dayKey(b)
const addDays = (d: Date, n: number) => day0(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** The range each of the file's presets stands for, counted from `today`. */
export function calendarPresetRange(preset: string, today: Date): CalendarDateRange | undefined {
  const t = day0(today.getFullYear(), today.getMonth(), today.getDate())
  switch (preset) {
    case 'Today': return { from: t, to: t }
    case 'Yesterday': { const y = addDays(t, -1); return { from: y, to: y } }
    case 'Last 7 days': return { from: addDays(t, -6), to: t }
    case 'Last 30 days': return { from: addDays(t, -29), to: t }
    case 'This month': return { from: day0(t.getFullYear(), t.getMonth(), 1), to: day0(t.getFullYear(), t.getMonth() + 1, 0) }
    default: return undefined
  }
}

export interface CalendarProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  size?: CalendarSize
  /** What a click selects: one day, several days, or a range. */
  mode?: CalendarMode
  /** Figma Header: the month/year title as one chip, two chips, or plain text. */
  header?: CalendarHeaderKind
  /** Figma PresetsVisible: the presets rail at the start (range mode). */
  presets?: boolean
  /** Figma FooterVisible: Today · Clear · Apply under the month. */
  footer?: boolean
  /** Passed to the day cells and the presets rail (CalendarDay Variant). */
  variant?: CalendarDayVariant
  /** The month shown (controlled) and its first value (uncontrolled). */
  month?: Date
  defaultMonth?: Date
  onMonthChange?: (month: Date) => void
  /** The selection (controlled) and its first value (uncontrolled). */
  value?: CalendarValue
  defaultValue?: CalendarValue
  onValueChange?: (value: CalendarValue) => void
  /** Today. Default: the real date (the file's 7 November 2026 in the sample). */
  today?: Date
  disabledDays?: Date[]
  unavailableDays?: Date[]
  /** Footer Apply, with the selection. */
  onApply?: (value: CalendarValue) => void
  /** Rendered under the month inside the body (an event under the selected day, say). */
  children?: React.ReactNode
}

function Calendar({
  size = 'default', mode = 'single', header = 'single', presets = false, footer = false, variant = 'default',
  month, defaultMonth, onMonthChange, value, defaultValue, onValueChange, today, disabledDays, unavailableDays, onApply,
  children, className, ...props
}: CalendarProps) {
  // No month and no value anywhere: the file's own November 2026 sample.
  const sample = month === undefined && defaultMonth === undefined && value === undefined && defaultValue === undefined
  const sampleValue: CalendarValue = mode === 'multiple'
    ? [4, 12, 19, 30].map((d) => day0(2026, 10, d))
    : mode === 'range' ? { from: day0(2026, 10, 10), to: day0(2026, 10, 18) } : day0(2026, 10, 12)
  const [ownMonth, setOwnMonth] = React.useState<Date>(() => defaultMonth ?? (sample ? day0(2026, 10, 1) : new Date()))
  const [ownValue, setOwnValue] = React.useState<CalendarValue>(() => (sample ? sampleValue : defaultValue))
  const shown = month ?? ownMonth
  const current = value !== undefined ? value : ownValue
  const now = today ?? (sample ? day0(2026, 10, 7) : new Date())
  const off = disabledDays ?? (sample ? [day0(2026, 10, 24), day0(2026, 10, 25)] : undefined)
  const gone = unavailableDays ?? (sample ? [day0(2026, 10, 27)] : undefined)

  const setMonth = (d: Date) => { const first = day0(d.getFullYear(), d.getMonth(), 1); if (month === undefined) setOwnMonth(first); onMonthChange?.(first) }
  const setValue = (v: CalendarValue) => { if (value === undefined) setOwnValue(v); onValueChange?.(v) }

  const pick = (d: Date) => {
    if (d.getMonth() !== shown.getMonth()) setMonth(d)
    if (mode === 'single') return setValue(d)
    if (mode === 'multiple') {
      const list = Array.isArray(current) ? current : []
      return setValue(list.some((x) => sameDay(x, d)) ? list.filter((x) => !sameDay(x, d)) : [...list, d])
    }
    const r = current && !Array.isArray(current) && !(current instanceof Date) ? current : undefined
    if (!r || r.to) return setValue({ from: d })
    return setValue(d < r.from ? { from: d, to: r.from } : { from: r.from, to: d })
  }

  const single = current instanceof Date ? current : undefined
  const list = Array.isArray(current) ? current : undefined
  const range = current && !Array.isArray(current) && !(current instanceof Date) ? current : undefined
  const label = `${MONTH_NAMES[shown.getMonth()]} ${shown.getFullYear()}`
  const presetSelected = sample && mode === 'range'
    ? 'Last 7 days'
    : CALENDAR_PRESET_LABELS.find((p) => { const pr = calendarPresetRange(p, now); return !!pr && !!range && sameDay(pr.from, range.from) && sameDay(pr.to, range.to ?? range.from) }) ?? null

  return (
    <div
      data-slot="calendar"
      data-escala="Calendar"
      data-size={size}
      data-mode={mode}
      data-header={header}
      className={cn('inline-flex overflow-hidden', className)}
      {...props}
    >
      {presets && (
        <CalendarPresets
          size={size}
          variant={variant}
          selected={presetSelected}
          onSelect={(p) => { const r = calendarPresetRange(p, now); if (!r) return; setMonth(r.from); setValue(mode === 'range' ? r : mode === 'multiple' ? [r.from] : r.from) }}
        />
      )}
      <div data-part="Calendar.column" className="flex flex-col">
        <div data-part="Calendar.body" className="flex flex-col">
          <CalendarHeader
            size={size}
            header={header}
            label={label}
            month={MONTH_NAMES[shown.getMonth()]}
            year={String(shown.getFullYear())}
            onPreviousMonth={() => setMonth(day0(shown.getFullYear(), shown.getMonth() - 1, 1))}
            onNextMonth={() => setMonth(day0(shown.getFullYear(), shown.getMonth() + 1, 1))}
          />
          <CalendarMonth
            size={size}
            mode={mode}
            variant={variant}
            month={shown}
            today={now}
            selected={mode === 'single' ? (single ? [single] : []) : mode === 'multiple' ? (list ?? []) : undefined}
            range={mode === 'range' ? (range ?? null) : undefined}
            disabledDays={off}
            unavailableDays={gone}
            onDayClick={pick}
          />
          {children}
        </div>
        {footer && (
          <CalendarFooter
            size={size}
            onToday={() => { setMonth(now); if (mode !== 'range') setValue(mode === 'multiple' ? [now] : now) }}
            onClear={() => setValue(mode === 'multiple' ? [] : undefined)}
            onApply={() => onApply?.(current)}
          />
        )}
      </div>
    </div>
  )
}

export { Calendar, CalendarDay, CalendarHeader, CalendarMonth, CalendarPresets, CalendarFooter }
