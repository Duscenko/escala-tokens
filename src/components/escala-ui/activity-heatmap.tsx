// Escala components: ActivityHeatmap and ActivityHeatmapCell — the Figma `ActivityHeatmap` component (2400:58) and the
// `ActivityHeatmapCell` set (2400:57), 1:1 (design-plans/activityheatmap-contract.md). A year of activity, one square per day,
// one column per week: 53 × 7, weeks starting on Sunday. The square's fill is the chart's sequential ladder (`Chart/sequential/0…5`).
// Behaviour (code owns it): a `role="grid"` of `gridcell`s with ONE roving tab stop; left/right move by week, up/down by day,
// Home/End to the week's edges. Every cell names its day and count ("Tuesday, March 18: 8 contributions"), so the level never
// relies on colour alone. Appearance: recipes ActivityHeatmap and ActivityHeatmapCell (lib/recipes/activityHeatmap.ts).
// No motion on load; the ring follows `use-focus` (lib/recipes/motion.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'
import {
  ACTIVITY_DEFAULT_THRESHOLDS,
  ACTIVITY_KEYS,
  buildActivityGrid,
  describeActivityDay,
  moveActivityFocus,
  type ActivityCell,
  type ActivityDay,
  type ActivityKey,
  type ActivityLevel,
  type ActivityThresholds,
} from '../../lib/activityHeatmap'

export { ACTIVITY_DEFAULT_THRESHOLDS } from '../../lib/activityHeatmap'
export type { ActivityDay, ActivityLevel, ActivityThresholds } from '../../lib/activityHeatmap'
export { ACTIVITY_HEATMAP_CELL_STATES, ACTIVITY_HEATMAP_CELL_VALUES } from '../../lib/recipes/activityHeatmap'

export type ActivityHeatmapCellState = 'Default' | 'Focused'

export interface ActivityHeatmapCellProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Value 0–5 → `Chart/sequential/<value>`: 0 = no activity, 5 = the most. */
  value?: ActivityLevel
  /** Pins a state for docs and previews (Figma State). The live ring comes from the keyboard (`:focus-visible`). */
  forceState?: ActivityHeatmapCellState
}

/** Figma ActivityHeatmapCell: a 12 px square. Inside the heatmap it is a `gridcell` named by its day and count. */
function ActivityHeatmapCell({ value = 0, forceState, className, role = 'gridcell', ...props }: ActivityHeatmapCellProps) {
  return (
    <div
      data-slot="activity-heatmap-cell"
      data-escala="ActivityHeatmapCell"
      data-value={value}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      role={role}
      className={cn('shrink-0 outline-none', className)}
      {...props}
    />
  )
}

/** The weekdays that carry a label (Monday, Wednesday, Friday), by row: Figma leaves the others empty. */
const DAY_LABELS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' }
const WEEKDAY_ROWS = [0, 1, 2, 3, 4, 5, 6] as const
const LEGEND_LEVELS = [0, 1, 2, 3, 4, 5] as const

export interface ActivityHeatmapProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** One entry per day with activity (a day left out counts as 0). Dates are ISO `YYYY-MM-DD`. */
  data: readonly ActivityDay[]
  /** The count at which levels 1 to 5 begin (ascending). Default `[1, 3, 6, 10, 15]`. */
  thresholds?: ActivityThresholds
  /** The last day shown: the grid ends on the week that holds it. Default: the latest date in `data`. */
  endDate?: string
  /** Figma LegendVisible (default true): "Less ▢▢▢▢▢▢ More" under the grid. */
  showLegend?: boolean
  /** Figma MonthLabelsVisible (default true). */
  showMonthLabels?: boolean
  /** Figma DayLabelsVisible (default true): Mon · Wed · Fri. */
  showDayLabels?: boolean
  /** The focused day changed (arrow keys, Tab in, click); `null` once focus leaves the grid. Show it in a caption below. */
  onFocusDay?: (day: ActivityDay | null) => void
  /** The accessible name of a day. Default: "Tuesday, March 18: 8 contributions". */
  getCellLabel?: (day: ActivityDay) => string
  /** Pins the Focused look on one day (docs): `forceState="Focused"` on that cell. */
  forceFocusedDate?: string
  /** Legend ends. */
  lessLabel?: string
  moreLabel?: string
  /** The grid's accessible name. */
  'aria-label'?: string
}

/** Figma ActivityHeatmap: month labels, the day labels beside the weeks grid, and the legend row. */
function ActivityHeatmap({
  data, thresholds = ACTIVITY_DEFAULT_THRESHOLDS, endDate, showLegend = true, showMonthLabels = true, showDayLabels = true,
  onFocusDay, getCellLabel = describeActivityDay, forceFocusedDate, lessLabel = 'Less', moreLabel = 'More', className,
  'aria-label': ariaLabel = 'Activity by day', ...props
}: ActivityHeatmapProps) {
  const grid = React.useMemo(() => buildActivityGrid({ data, endDate, thresholds }), [data, endDate, thresholds])
  const last = grid.cells[grid.cells.length - 1]
  // Roving tab stop: one cell is in the Tab order, the one last focused (the end date at first).
  const [stop, setStop] = React.useState<{ week: number; weekday: number }>({ week: last.week, weekday: last.weekday })
  const gridRef = React.useRef<HTMLDivElement>(null)
  const stopCell = grid.rows[stop.weekday]?.[stop.week] ?? last
  const marks = new Map(grid.months.map((m) => [m.week, m.label]))

  const focusCell = (to: { week: number; weekday: number }) => {
    gridRef.current?.querySelector<HTMLElement>(`[data-week="${to.week}"][data-weekday="${to.weekday}"]`)?.focus()
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!ACTIVITY_KEYS.includes(event.key) || event.altKey || event.metaKey) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-week]')
    if (!target) return
    const from = { week: Number(target.dataset.week), weekday: Number(target.dataset.weekday) }
    event.preventDefault()
    const to = moveActivityFocus(grid, from, event.key as ActivityKey, event.ctrlKey)
    if (to.week !== from.week || to.weekday !== from.weekday) focusCell(to)
  }
  const onCellFocus = (cell: ActivityCell) => {
    setStop({ week: cell.week, weekday: cell.weekday })
    onFocusDay?.({ date: cell.date, count: cell.count })
  }
  const onGridBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onFocusDay?.(null)
  }

  return (
    <div data-slot="activity-heatmap" data-escala="ActivityHeatmap" className={cn('inline-flex max-w-full flex-col', className)} {...props}>
      {showMonthLabels && (
        <div data-part="ActivityHeatmap.monthLabels" aria-hidden className="flex">
          {showDayLabels && <div data-part="ActivityHeatmap.dayLabels" className="shrink-0" />}
          {Array.from({ length: grid.weeks }, (_, week) => (
            <div key={week} data-part="ActivityHeatmap.monthSlot" className="relative h-[1lh] shrink-0">
              {marks.has(week) && <span data-part="ActivityHeatmap.month" className="absolute top-0 left-0 whitespace-nowrap">{marks.get(week)}</span>}
            </div>
          ))}
        </div>
      )}
      <div data-part="ActivityHeatmap.body" className="flex">
        {showDayLabels && (
          <div data-part="ActivityHeatmap.dayLabels" aria-hidden className="flex shrink-0 flex-col">
            {WEEKDAY_ROWS.map((weekday) => (
              <div key={weekday} data-part="ActivityHeatmap.day" className="flex items-center">
                {DAY_LABELS[weekday] && <span data-part="ActivityHeatmap.dayLabel">{DAY_LABELS[weekday]}</span>}
              </div>
            ))}
          </div>
        )}
        {/* ARIA rows are the weekdays (each a line of the picture), so the arrows follow what the eye sees. */}
        <div ref={gridRef} role="grid" aria-label={ariaLabel} aria-rowcount={7} aria-colcount={grid.weeks} data-part="ActivityHeatmap.grid" className="flex flex-col" onKeyDown={onKeyDown} onBlur={onGridBlur}>
          {grid.rows.map((row, weekday) => (
            <div key={weekday} role="row" aria-rowindex={weekday + 1} data-part="ActivityHeatmap.row" className="flex">
              {row.map((cell, week) => cell && (
                <ActivityHeatmapCell
                  key={cell.date}
                  value={cell.level}
                  forceState={forceFocusedDate === cell.date ? 'Focused' : undefined}
                  aria-label={getCellLabel({ date: cell.date, count: cell.count })}
                  aria-colindex={week + 1}
                  data-week={week}
                  data-weekday={weekday}
                  tabIndex={cell === stopCell ? 0 : -1}
                  onFocus={() => onCellFocus(cell)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {showLegend && (
        <div data-part="ActivityHeatmap.legendRow" aria-hidden className="flex justify-end">
          <div data-part="ActivityHeatmap.legend" className="flex items-center">
            <span data-part="ActivityHeatmap.legendLabel">{lessLabel}</span>
            {LEGEND_LEVELS.map((level) => <ActivityHeatmapCell key={level} value={level} role="presentation" />)}
            <span data-part="ActivityHeatmap.legendLabel">{moreLabel}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export { ActivityHeatmap, ActivityHeatmapCell }
