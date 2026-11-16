/**
 * Specimens whose components pull a large library (Recharts, Embla) or are
 * large themselves (the Calendar and its parts). `specimens.tsx` loads this module lazily, so none of it
 * lands in the bundle until one of these pages is opened.
 */
import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { Calendar as SkCalendar, type CalendarHeaderKind, type CalendarMode, type CalendarSize, type CalendarValue, CalendarDay as SkCalendarDay, CalendarHeader as SkCalendarHeader, CalendarMonth as SkCalendarMonth, CalendarPresets as SkCalendarPresets, CalendarFooter as SkCalendarFooter, type CalendarFooterSize, type CalendarPresetsSize, type CalendarPresetsVariant, type CalendarMonthMode, type CalendarMonthSize, type CalendarMonthVariant, type CalendarHeaderHeader, type CalendarHeaderSize, type CalendarDaySize, type CalendarDayState, type CalendarDayVariant } from '../../../escala-ui/calendar'
import { DatePickerPopover as SkDatePickerPopover, type DatePickerPopoverMode, type DatePickerPopoverSize } from '../../../escala-ui/date-picker'
import { RecipeScope } from './scope'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { CALENDAR_PLAY } from '../../../preview/artefacts/boardScripts'

const BOARD_MONTH = new Date(2026, 9, 1)

/** The Figma Calendar: Size × Mode × Header over the file's November 2026 sample. On the Board
 *  (`children` = the selected day's event) it shows October and its selection hops through the
 *  board script's days. */
export function SkeletonCalendarSpecimen({ t, v, children }: SpecimenProps) {
  const size = (v.Size ?? 'default') as CalendarSize
  const mode = (v.Mode ?? 'single') as CalendarMode
  const header = (v.Header ?? 'single') as CalendarHeaderKind
  const [picked, setPicked] = useState<CalendarValue>(new Date(2026, 9, 14))
  const step = useAutoplayStep(CALENDAR_PLAY.days.length, CALENDAR_PLAY.ms)
  if (children == null) {
    return (
      <RecipeScope t={t}>
        <SkCalendar key={mode} size={size} mode={mode} header={header} presets={v.PresetsVisible === 'True'} footer={v.FooterVisible === 'True'} />
      </RecipeScope>
    )
  }
  const value = step == null ? picked : new Date(2026, 9, CALENDAR_PLAY.days[step].day)
  return (
    <RecipeScope t={t}>
      <SkCalendar size={size} mode="single" header={header} defaultMonth={BOARD_MONTH} today={new Date(2026, 9, 12)} value={value} onValueChange={setPicked}>
        {children}
      </SkCalendar>
    </RecipeScope>
  )
}

/** The Figma CalendarDay: Size × State × Variant, the file's own "15". */
export function SkeletonCalendarDaySpecimen({ t, v }: SpecimenProps) {
  const state = (v.State ?? 'Default') as CalendarDayState
  return (
    <RecipeScope t={t}>
      <SkCalendarDay
        size={(v.Size ?? 'default') as CalendarDaySize}
        variant={(v.Variant ?? 'default') as CalendarDayVariant}
        forceState={state === 'Default' ? undefined : state}
      />
    </RecipeScope>
  )
}

/** The Figma CalendarHeader: Size × Header with the file's own November 2026. */
export function SkeletonCalendarHeaderSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkCalendarHeader size={(v.Size ?? 'default') as CalendarHeaderSize} header={(v.Header ?? 'single') as CalendarHeaderHeader} />
    </RecipeScope>
  )
}

/** The Figma CalendarMonth: Size × Mode × Variant over the file's own November 2026 sample. */
export function SkeletonCalendarMonthSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkCalendarMonth size={(v.Size ?? 'default') as CalendarMonthSize} mode={(v.Mode ?? 'single') as CalendarMonthMode} variant={(v.Variant ?? 'default') as CalendarMonthVariant} />
    </RecipeScope>
  )
}

/** The Figma CalendarPresets: Size × Variant with the file's five presets, "Last 7 days" selected. */
export function SkeletonCalendarPresetsSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkCalendarPresets size={(v.Size ?? 'default') as CalendarPresetsSize} variant={(v.Variant ?? 'default') as CalendarPresetsVariant} />
    </RecipeScope>
  )
}

/** The Figma CalendarFooter: Today · Clear · Apply at the file's Size. */
export function SkeletonCalendarFooterSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkCalendarFooter size={(v.Size ?? 'default') as CalendarFooterSize} />
    </RecipeScope>
  )
}

/** The Figma DatePickerPopover: the shell (Radius/overlay + Shadow/lg) around the file's Calendar
 *  (presets beside a range, the footer under both). Size and Mode are the file's. */
export function SkeletonDatePickerPopoverSpecimen({ t, v }: SpecimenProps) {
  const mode = (v.Mode ?? 'single') as DatePickerPopoverMode
  const size = (v.Size ?? 'default') as DatePickerPopoverSize
  return (
    <RecipeScope t={t}>
      <SkDatePickerPopover inline size={size} mode={mode}>
        <SkCalendar key={mode} size={size} mode={mode} presets={mode === 'range'} footer />
      </SkDatePickerPopover>
    </RecipeScope>
  )
}



