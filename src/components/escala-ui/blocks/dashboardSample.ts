// Deterministic sample for DashboardActivityCard's default: a year of days (no Math.random, no Date.now), the same on every
// render and machine. The Figma file's own picture lives with the ActivityHeatmap stories (activityHeatmapSample.ts).
import { formatActivityDate, parseActivityDate, type ActivityDay } from '../../../lib/activityHeatmap'

const DAY_MS = 86_400_000
export const DASHBOARD_ACTIVITY_START = '2024-12-29'
export const DASHBOARD_ACTIVITY_END = '2025-12-30'

/** mulberry32: the same sequence for the same seed. */
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

function generate(seed: number, density: number, peak: number): ActivityDay[] {
  const next = seeded(seed)
  const out: ActivityDay[] = []
  for (let ms = parseActivityDate(DASHBOARD_ACTIVITY_START); ms <= parseActivityDate(DASHBOARD_ACTIVITY_END); ms += DAY_MS) {
    const weekday = new Date(ms).getUTCDay()
    if (next() > density * (weekday === 0 || weekday === 6 ? 0.45 : 1)) continue
    out.push({ date: formatActivityDate(ms), count: 1 + Math.floor(next() ** 2 * peak) })
  }
  return out
}

export const DASHBOARD_ACTIVITY_SAMPLE: ActivityDay[] = generate(11, 0.7, 20)
