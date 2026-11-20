// Deterministic sample data for the ActivityHeatmap stories: no Math.random, no Date.now. Same data on every render and every machine.
import { ACTIVITY_DEFAULT_THRESHOLDS, formatActivityDate, parseActivityDate, type ActivityDay } from '../../../src/lib/activityHeatmap'

/** The Figma component's own picture: the Value of every cell, week by week, seven days from Sunday (the last week holds three).
 *  Read from the instances of `ActivityHeatmap` (2400:58). A letter F marks the one Focused cell the file leaves in. */
const FIGMA_WEEKS = [
  '0300130', '2312430', '0030310', '0550250', '0331050', '0320410', '0505201', '0430020', '0133520', '0142100', '2004451',
  '243F3010', '0234050', '0310521', '2104500', '0433402', '0000341', '0200100', '0240001', '0201201', '0425430', '0050000',
  '0312350', '0053152', '0551241', '2353410', '2331440', '0540212', '1030030', '0530201', '0425312', '0125300', '0013200',
  '1235010', '0004400', '0204102', '1525410', '0043500', '0053440', '2045310', '0302440', '0310021', '2514201', '0000212',
  '1330200', '0033031', '0002102', '0012351', '0045442', '1023030', '0530340', '0010020', '050',
]

/** The Sunday the sample starts on, and the Tuesday it ends on: 52 full weeks and three days, as the file draws it. */
export const SAMPLE_START = '2024-12-29'
export const SAMPLE_END = '2025-12-30'
/** The day the file's Focused cell sits on (week 11, Tuesday: the label the contract quotes). */
export const SAMPLE_FOCUSED_DATE = '2025-03-18'

const DAY_MS = 86_400_000

/** The count that paints each level with the default thresholds: exactly its first step. */
const COUNT_OF_LEVEL = [0, ...ACTIVITY_DEFAULT_THRESHOLDS]

/** The Figma picture as data: every level n becomes the count that starts level n, so the colours match the file cell for cell. */
export const FIGMA_SAMPLE: ActivityDay[] = FIGMA_WEEKS.flatMap((week, w) =>
  [...week.replace('F', '')].flatMap((digit, d) => {
    const count = COUNT_OF_LEVEL[Number(digit)]
    return count ? [{ date: formatActivityDate(parseActivityDate(SAMPLE_START) + (w * 7 + d) * DAY_MS), count }] : []
  }),
)

/** A small seeded generator (mulberry32): the same sequence for the same seed. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A year of days between the sample's start and end, `density` of them active, busier on weekdays. Deterministic per seed. */
export function generatedSample(seed: number, density: number, peak = 24): ActivityDay[] {
  const next = seeded(seed)
  const out: ActivityDay[] = []
  const start = parseActivityDate(SAMPLE_START)
  const end = parseActivityDate(SAMPLE_END)
  for (let ms = start; ms <= end; ms += DAY_MS) {
    const weekday = new Date(ms).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    if (next() > density * (weekend ? 0.45 : 1)) continue
    out.push({ date: formatActivityDate(ms), count: 1 + Math.floor(next() ** 2 * peak) })
  }
  return out
}

export const SPARSE_SAMPLE = generatedSample(7, 0.22, 8)
export const DENSE_SAMPLE = generatedSample(11, 0.9, 30)

export const DATASETS = { 'Figma sample': FIGMA_SAMPLE, Sparse: SPARSE_SAMPLE, Dense: DENSE_SAMPLE, Empty: [] as ActivityDay[] } as const
export type DatasetName = keyof typeof DATASETS
