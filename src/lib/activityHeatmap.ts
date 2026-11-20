// ActivityHeatmap — the grid arithmetic, DOM-free and deterministic (no `Date.now()` unless the caller gives no date at all).
// Dates are ISO `YYYY-MM-DD` strings handled in UTC, so a day is the same day in every time zone.
// Layout (Figma, design-plans/activityheatmap-contract.md): 53 week COLUMNS × 7 weekday ROWS, weeks start on Sunday,
// the last column holds the days up to the end date and no more.

export interface ActivityDay {
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  /** What happened that day (contributions, commits, sessions…). Never negative. */
  count: number
}

/** The count at which levels 1 to 5 begin, ascending. Level 0 is "no activity" (a count of 0, or under the first step). */
export type ActivityThresholds = readonly [number, number, number, number, number]
export type ActivityLevel = 0 | 1 | 2 | 3 | 4 | 5

export const ACTIVITY_WEEKS = 53
export const ACTIVITY_DAYS_PER_WEEK = 7
export const ACTIVITY_DEFAULT_THRESHOLDS: ActivityThresholds = [1, 3, 6, 10, 15]

const DAY_MS = 86_400_000
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** `YYYY-MM-DD` → UTC milliseconds. Throws on anything else: a wrong date must not paint a wrong square. */
export function parseActivityDate(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) throw new Error(`ActivityHeatmap: "${date}" is not an ISO date (YYYY-MM-DD)`)
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3])
  if (formatActivityDate(ms) !== date) throw new Error(`ActivityHeatmap: "${date}" is not a real calendar date`)
  return ms
}

export function formatActivityDate(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** The level a count paints: 0 below the first step, then 1 to 5 as it reaches each step. */
export function activityLevel(count: number, thresholds: ActivityThresholds = ACTIVITY_DEFAULT_THRESHOLDS): ActivityLevel {
  let level = 0
  for (let i = 0; i < thresholds.length; i++) if (count >= thresholds[i] && count > 0) level = i + 1
  return level as ActivityLevel
}

/** One square of the grid. */
export interface ActivityCell extends ActivityDay {
  /** Week column, 0 to 52. */
  week: number
  /** Weekday row, 0 (Sunday) to 6 (Saturday). */
  weekday: number
  level: ActivityLevel
}

export interface ActivityMonthMark {
  /** The week column the label starts on. */
  week: number
  /** 0 to 11. */
  month: number
  /** `Jan`. */
  label: string
}

export interface ActivityGrid {
  /** `rows[weekday][week]`, `null` after the end date in the last column. */
  rows: (ActivityCell | null)[][]
  /** Every cell, week by week, day by day. */
  cells: ActivityCell[]
  weeks: number
  months: ActivityMonthMark[]
  start: string
  end: string
}

interface GridOptions {
  data: readonly ActivityDay[]
  /** The last day shown (default: the latest date in `data`; with no data, today in UTC). */
  endDate?: string
  thresholds?: ActivityThresholds
  weeks?: number
}

/** Month labels: one on the week column holding the 1st of each month (a 1st after the end date has no square to label). The first column is labelled with its own month only
 *  when the next label is at least three columns away (it would crash into it otherwise). */
function monthMarks(startMs: number, endMs: number, weeks: number): ActivityMonthMark[] {
  const marks: ActivityMonthMark[] = []
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < ACTIVITY_DAYS_PER_WEEK; d++) {
      const ms = startMs + (w * ACTIVITY_DAYS_PER_WEEK + d) * DAY_MS
      if (ms > endMs) continue
      const day = new Date(ms)
      if (day.getUTCDate() === 1) marks.push({ week: w, month: day.getUTCMonth(), label: MONTHS_SHORT[day.getUTCMonth()] })
    }
  }
  if (!marks.length || marks[0].week > 0) {
    const first = new Date(startMs)
    const lead: ActivityMonthMark = { week: 0, month: first.getUTCMonth(), label: MONTHS_SHORT[first.getUTCMonth()] }
    if (!marks.length || marks[0].week - lead.week >= 3) marks.unshift(lead)
  }
  return marks
}

export function buildActivityGrid({ data, endDate, thresholds = ACTIVITY_DEFAULT_THRESHOLDS, weeks = ACTIVITY_WEEKS }: GridOptions): ActivityGrid {
  const counts = new Map<string, number>()
  let latest = -Infinity
  for (const { date, count } of data) {
    const ms = parseActivityDate(date)
    if (ms > latest) latest = ms
    counts.set(date, (counts.get(date) ?? 0) + Math.max(0, count))
  }
  const endMs = endDate ? parseActivityDate(endDate) : Number.isFinite(latest) ? latest : parseActivityDate(formatActivityDate(Date.now()))
  const endWeekday = new Date(endMs).getUTCDay()
  const startMs = endMs - endWeekday * DAY_MS - (weeks - 1) * ACTIVITY_DAYS_PER_WEEK * DAY_MS
  const rows: (ActivityCell | null)[][] = Array.from({ length: ACTIVITY_DAYS_PER_WEEK }, () => Array<ActivityCell | null>(weeks).fill(null))
  const cells: ActivityCell[] = []
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < ACTIVITY_DAYS_PER_WEEK; d++) {
      const ms = startMs + (w * ACTIVITY_DAYS_PER_WEEK + d) * DAY_MS
      if (ms > endMs) continue
      const date = formatActivityDate(ms)
      const count = counts.get(date) ?? 0
      const cell: ActivityCell = { date, count, week: w, weekday: d, level: activityLevel(count, thresholds) }
      rows[d][w] = cell
      cells.push(cell)
    }
  }
  return { rows, cells, weeks, months: monthMarks(startMs, endMs, weeks), start: formatActivityDate(startMs), end: formatActivityDate(endMs) }
}

/** The accessible name of a day: "Tuesday, March 18: 8 contributions" (the level never relies on colour alone). */
export function describeActivityDay({ date, count }: ActivityDay): string {
  const d = new Date(parseActivityDate(date))
  const noun = count === 1 ? 'contribution' : 'contributions'
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}: ${count} ${noun}`
}

export type ActivityKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'
export const ACTIVITY_KEYS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

/** Where a key takes the focus. Arrows move on the picture: left and right by week, up and down by day, never wrapping.
 *  Home and End go to the first and last day of the week (Sunday and Saturday; in the last column, the last day there is).
 *  With Ctrl: the first and the last day of the grid. In the last column, a move stays on a day that exists. */
export function moveActivityFocus(grid: ActivityGrid, from: { week: number; weekday: number }, key: ActivityKey, ctrl = false): { week: number; weekday: number } {
  const lastWeek = grid.weeks - 1
  const lastDay = (week: number) => {
    for (let d = ACTIVITY_DAYS_PER_WEEK - 1; d >= 0; d--) if (grid.rows[d][week]) return d
    return 0
  }
  const clamp = (week: number, weekday: number) => ({ week, weekday: Math.min(weekday, lastDay(week)) })
  switch (key) {
    case 'ArrowRight': return from.week < lastWeek ? clamp(from.week + 1, from.weekday) : from
    case 'ArrowLeft': return from.week > 0 ? clamp(from.week - 1, from.weekday) : from
    case 'ArrowDown': return from.weekday < lastDay(from.week) ? { week: from.week, weekday: from.weekday + 1 } : from
    case 'ArrowUp': return from.weekday > 0 ? { week: from.week, weekday: from.weekday - 1 } : from
    case 'Home': return ctrl ? { week: 0, weekday: 0 } : { week: from.week, weekday: 0 }
    case 'End': return ctrl ? { week: lastWeek, weekday: lastDay(lastWeek) } : { week: from.week, weekday: lastDay(from.week) }
  }
}
