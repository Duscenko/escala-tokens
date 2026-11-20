import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_DEFAULT_THRESHOLDS,
  activityLevel,
  buildActivityGrid,
  describeActivityDay,
  moveActivityFocus,
  parseActivityDate,
} from '../activityHeatmap'
import { COMPONENT_RECIPES, recipeTokenRefs } from '../componentRecipes'
import { ACTIVITY_HEATMAP_CELL_STATES, ACTIVITY_HEATMAP_CELL_VALUES } from '../recipes/activityHeatmap'
import { ACTIVITY_HEATMAP_CELL_STATES as COMPONENT_CELL_STATES, ACTIVITY_HEATMAP_CELL_VALUES as COMPONENT_CELL_VALUES } from '../../components/escala-ui/activity-heatmap'

// The Figma file's picture (2400:58): 52 full weeks from Sunday 2024-12-29 and three days of the last one, ending Tuesday 2025-12-30.
const END = '2025-12-30'
const grid = buildActivityGrid({ data: [{ date: '2025-03-18', count: 8 }], endDate: END })

describe('activityLevel', () => {
  it('is 0 for no activity and climbs one level at each threshold', () => {
    expect(activityLevel(0)).toBe(0)
    const levels = [1, 2, 3, 5, 6, 9, 10, 14, 15, 99].map((n) => activityLevel(n))
    expect(levels).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
  })
  it('keeps a zero count at 0 even when the first step is 0', () => {
    expect(activityLevel(0, [0, 2, 4, 6, 8])).toBe(0)
    expect(activityLevel(1, [0, 2, 4, 6, 8])).toBe(1)
  })
  it('the default steps are the counts the sample data uses to hit each level', () => {
    ACTIVITY_DEFAULT_THRESHOLDS.forEach((step, i) => expect(activityLevel(step)).toBe(i + 1))
  })
})

describe('buildActivityGrid', () => {
  it('is 53 week columns by 7 weekday rows, weeks from Sunday', () => {
    expect(grid.weeks).toBe(53)
    expect(grid.rows).toHaveLength(7)
    expect(grid.rows.every((r) => r.length === 53)).toBe(true)
    expect(grid.start).toBe('2024-12-29')
    expect(new Date(parseActivityDate(grid.start)).getUTCDay()).toBe(0)
  })
  it('ends on the end date: the last column holds Sunday to Tuesday (the file draws three cells there)', () => {
    expect(grid.end).toBe(END)
    expect(grid.cells).toHaveLength(52 * 7 + 3)
    expect(grid.rows.map((r) => r[52] !== null)).toEqual([true, true, true, false, false, false, false])
  })
  it('paints the count a day has and level 0 for a day left out', () => {
    const day = grid.rows[2][11]!
    expect(day).toMatchObject({ date: '2025-03-18', count: 8, level: 3, week: 11, weekday: 2 })
    expect(grid.rows[3][11]).toMatchObject({ date: '2025-03-19', count: 0, level: 0 })
  })
  it('sums repeated dates, ignores negative counts, and ends on the latest date when none is given', () => {
    const g = buildActivityGrid({ data: [{ date: '2025-06-10', count: 2 }, { date: '2025-06-10', count: 3 }, { date: '2025-06-11', count: -4 }] })
    expect(g.end).toBe('2025-06-11')
    expect(g.cells.find((c) => c.date === '2025-06-10')?.count).toBe(5)
    expect(g.cells.find((c) => c.date === '2025-06-11')?.count).toBe(0)
  })
  it('is deterministic: the same input gives the same grid', () => {
    expect(buildActivityGrid({ data: [{ date: '2025-03-18', count: 8 }], endDate: END })).toEqual(grid)
  })
  it('labels each month on the week that holds its 1st, as the file does (Nov at 43 here, hand-placed at 44 in the file)', () => {
    expect(grid.months.map((m) => [m.label, m.week])).toEqual([
      ['Jan', 0], ['Feb', 4], ['Mar', 8], ['Apr', 13], ['May', 17], ['Jun', 22], ['Jul', 26], ['Aug', 30], ['Sep', 35], ['Oct', 39], ['Nov', 43], ['Dec', 48],
    ])
  })
  it('never labels a month that starts after the end date', () => {
    expect(grid.months.some((m) => m.week === 52)).toBe(false)
  })
  it('labels the first column with its own month only when the next label is three columns away', () => {
    // Window from Sun 2025-01-19: February's 1st is in column 1, so the lead "Jan" would crash into it and is dropped.
    const crowded = buildActivityGrid({ data: [], endDate: '2026-01-24' })
    expect(crowded.months[0]).toMatchObject({ label: 'Feb', week: 1 })
    // Window from Sun 2025-01-05: February's 1st is in column 3, so the lead "Jan" stays.
    const roomy = buildActivityGrid({ data: [], endDate: '2026-01-04' })
    expect(roomy.months.slice(0, 2).map((m) => [m.label, m.week])).toEqual([['Jan', 0], ['Feb', 3]])
  })
  it('rejects a date that is not ISO or not real', () => {
    expect(() => parseActivityDate('03/18/2025')).toThrow(/ISO/)
    expect(() => parseActivityDate('2025-02-30')).toThrow(/real calendar/)
  })
})

describe('describeActivityDay', () => {
  it('names the day and the count', () => {
    expect(describeActivityDay({ date: '2025-03-18', count: 8 })).toBe('Tuesday, March 18: 8 contributions')
    expect(describeActivityDay({ date: '2025-03-18', count: 1 })).toBe('Tuesday, March 18: 1 contribution')
    expect(describeActivityDay({ date: '2025-03-18', count: 0 })).toBe('Tuesday, March 18: 0 contributions')
  })
})

describe('moveActivityFocus', () => {
  const at = (week: number, weekday: number) => ({ week, weekday })
  it('left and right move by week, up and down by day, never wrapping', () => {
    expect(moveActivityFocus(grid, at(10, 3), 'ArrowRight')).toEqual(at(11, 3))
    expect(moveActivityFocus(grid, at(10, 3), 'ArrowLeft')).toEqual(at(9, 3))
    expect(moveActivityFocus(grid, at(10, 3), 'ArrowDown')).toEqual(at(10, 4))
    expect(moveActivityFocus(grid, at(10, 3), 'ArrowUp')).toEqual(at(10, 2))
    expect(moveActivityFocus(grid, at(0, 0), 'ArrowLeft')).toEqual(at(0, 0))
    expect(moveActivityFocus(grid, at(0, 0), 'ArrowUp')).toEqual(at(0, 0))
    expect(moveActivityFocus(grid, at(10, 6), 'ArrowDown')).toEqual(at(10, 6))
  })
  it('stays on a day that exists in the last column', () => {
    expect(moveActivityFocus(grid, at(51, 5), 'ArrowRight')).toEqual(at(52, 2))
    expect(moveActivityFocus(grid, at(52, 2), 'ArrowDown')).toEqual(at(52, 2))
    expect(moveActivityFocus(grid, at(52, 2), 'ArrowRight')).toEqual(at(52, 2))
  })
  it('Home and End go to the first and last day of the week; with Ctrl, of the grid', () => {
    expect(moveActivityFocus(grid, at(10, 3), 'Home')).toEqual(at(10, 0))
    expect(moveActivityFocus(grid, at(10, 3), 'End')).toEqual(at(10, 6))
    expect(moveActivityFocus(grid, at(52, 0), 'End')).toEqual(at(52, 2))
    expect(moveActivityFocus(grid, at(10, 3), 'Home', true)).toEqual(at(0, 0))
    expect(moveActivityFocus(grid, at(10, 3), 'End', true)).toEqual(at(52, 2))
  })
})

describe('recipes', () => {
  it('the cell has one entry per Value × State and every value is a role', () => {
    const cell = COMPONENT_RECIPES.ActivityHeatmapCell
    expect(cell.parts.find((p) => p.axes[0] === 'Value')?.values).toHaveProperty(['5'])
    for (const v of ACTIVITY_HEATMAP_CELL_VALUES) {
      const part = cell.parts.find((p) => p.axes[0] === 'Value')!
      expect(part.values[v].root.fill).toBe(`color.chart.sequential.${v}`)
    }
    expect(ACTIVITY_HEATMAP_CELL_STATES).toEqual(['Default', 'Focused'])
    // The component ships its own copy (the registry serves it without the recipe module): both lists stay equal.
    expect(COMPONENT_CELL_STATES).toEqual(ACTIVITY_HEATMAP_CELL_STATES)
    expect(COMPONENT_CELL_VALUES).toEqual(ACTIVITY_HEATMAP_CELL_VALUES)
    expect(recipeTokenRefs(cell).length).toBeGreaterThan(0)
  })
})
