// Skeleton: shadcn/ui `bases/radix/ui/calendar.tsx` (MIT, see LICENSE-shadcn.md):
// react-day-picker with shadcn's layout — caption, ghost icon-sm nav Buttons,
// weekdays and day buttons that mark selected / range / today / outside with
// `data-*` (shadcn's own attributes). `mode` single | range is DayPicker's.
// Icons come in as props. Appearance: recipe (Calendar, Button).
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
import { DayPicker, getDefaultClassNames, type DayButtonProps } from 'react-day-picker'
import { cn } from '../../lib/utils'
import { Button } from './button'

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Previous / next month glyphs. */
  prevIcon?: React.ReactNode
  nextIcon?: React.ReactNode
}

function Calendar({ className, classNames, showOutsideDays = true, components, prevIcon = '‹', nextIcon = '›', ...props }: CalendarProps) {
  const d = getDefaultClassNames()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-fit', className)}
      classNames={{
        root: cn('w-fit', d.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', d.months),
        month: cn('flex w-full flex-col gap-4', d.month),
        nav: cn('absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1', d.nav),
        month_caption: cn('flex w-full items-center justify-center', d.month_caption),
        month_grid: cn('w-full border-collapse', d.month_grid),
        weekdays: cn('flex', d.weekdays),
        week: cn('mt-2 flex w-full', d.week),
        day: cn('relative flex-1 p-0 text-center select-none', d.day),
        hidden: cn('invisible', d.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: c, rootRef, ...rest }) => <div data-slot="calendar" data-escala="Calendar" ref={rootRef} className={c} {...rest} />,
        CaptionLabel: (p) => <span data-part="Calendar.caption" {...p} />,
        Weekday: ({ className: c, ...rest }) => <th data-part="Calendar.weekday" className={cn('flex-1 font-normal', c)} {...rest} />,
        PreviousMonthButton: ({ className: c, ...rest }) => (
          <Button variant="ghost" size="icon-sm" className={cn('z-10', c)} {...rest}>{prevIcon}</Button>
        ),
        NextMonthButton: ({ className: c, ...rest }) => (
          <Button variant="ghost" size="icon-sm" className={cn('z-10', c)} {...rest}>{nextIcon}</Button>
        ),
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({ className, day, modifiers, ...props }: DayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => { if (modifiers.focused) ref.current?.focus() }, [modifiers.focused])
  const single = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
  return (
    <button
      ref={ref}
      type="button"
      data-part="Calendar.day"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={single ? 'true' : undefined}
      data-range-start={modifiers.range_start ? 'true' : undefined}
      data-range-end={modifiers.range_end ? 'true' : undefined}
      data-range-middle={modifiers.range_middle ? 'true' : undefined}
      data-today={modifiers.today && !modifiers.selected ? 'true' : undefined}
      data-outside={modifiers.outside ? 'true' : undefined}
      className={cn('inline-flex aspect-square w-full cursor-pointer items-center justify-center border-0 bg-transparent outline-none', className)}
      {...props}
    />
  )
}

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
  /** The range (range mode). Default: the 10th to the 18th. */
  range?: { from: Date; to?: Date }
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
  const base = month ?? day0(2026, 10, 1)
  const y = base.getFullYear()
  const m = base.getMonth()
  const first = day0(y, m, 1)
  const lead = first.getDay()
  const count = new Date(y, m + 1, 0).getDate()
  const weeks = Math.ceil((lead + count) / 7)
  const todayKey = dayKey(today ?? day0(y, m, 7))
  const picked = new Set((selected ?? (mode === 'multiple' ? [4, 12, 19, 30] : [12]).map((d) => day0(y, m, d))).map(dayKey))
  const span = mode === 'range' ? (range ?? { from: day0(y, m, 10), to: day0(y, m, 18) }) : undefined
  const from = span ? dayKey(span.from) : ''
  const to = span?.to ? dayKey(span.to) : ''
  const between = (d: Date) => !!span?.to && d.getTime() > span.from.getTime() && d.getTime() < span.to.getTime()
  const off = new Set((disabledDays ?? [day0(y, m, 24), day0(y, m, 25)]).map(dayKey))
  const gone = new Set((unavailableDays ?? [day0(y, m, 27)]).map(dayKey))

  const stateOf = (d: Date): CalendarDayState => {
    const k = dayKey(d)
    if (d.getMonth() !== m) return 'Outside'
    if (gone.has(k)) return 'Unavailable'
    if (off.has(k)) return 'Disabled'
    if (mode === 'range') {
      if (k === from) return 'RangeStart'
      if (to && k === to) return 'RangeEnd'
      if (between(d)) return 'RangeMiddle'
    } else if (picked.has(k)) return 'Selected'
    if (k === todayKey) return 'Today'
    return 'Default'
  }

  return (
    <div
      data-slot="calendar-month"
      data-escala="CalendarMonth"
      data-size={size}
      data-mode={mode}
      data-variant={variant}
      className={cn('flex flex-col', className)}
      {...props}
    >
      <div data-part="CalendarMonth.weekdays" className="flex">
        {WEEKDAY_NAMES.map((n) => (
          <span key={n} data-part="CalendarMonth.weekday" className="inline-flex shrink-0 items-center justify-center">{n}</span>
        ))}
      </div>
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} data-part="CalendarMonth.week" className="flex">
          {Array.from({ length: 7 }, (_, i) => {
            const d = day0(y, m, 1 - lead + w * 7 + i)
            return (
              <CalendarDay
                key={i}
                size={size}
                variant={variant}
                state={stateOf(d)}
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

export { Calendar, CalendarDayButton, CalendarDay, CalendarHeader, CalendarMonth, CalendarPresets, CalendarFooter }
