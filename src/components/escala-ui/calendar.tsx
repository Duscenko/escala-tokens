// Skeleton: shadcn/ui `bases/radix/ui/calendar.tsx` (MIT, see LICENSE-shadcn.md):
// react-day-picker with shadcn's layout — caption, ghost icon-sm nav Buttons,
// weekdays and day buttons that mark selected / range / today / outside with
// `data-*` (shadcn's own attributes). `mode` single | range is DayPicker's.
// Icons come in as props. Appearance: recipe (Calendar, Button).
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

export { Calendar, CalendarDayButton }
