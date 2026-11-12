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

export { Calendar, CalendarDayButton, CalendarDay }
