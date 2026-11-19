/** The platform's specimens of the Figma `❖ ActivityHeatmap (PRO)` page (2397:80): the year grid and one cell. The grid draws a
 *  deterministic sample year (the same one DashboardActivityCard uses) on the brand's Chart/sequential ladder. */
import type { SpecimenProps } from '../specimens'
import { ActivityHeatmap as SkActivityHeatmap, ActivityHeatmapCell as SkActivityHeatmapCell, type ActivityHeatmapCellState, type ActivityLevel } from '../../../escala-ui/activity-heatmap'
import { DASHBOARD_ACTIVITY_END, DASHBOARD_ACTIVITY_SAMPLE } from '../../../escala-ui/blocks/dashboardSample'
import { RecipeScope } from './scope'

export function SkeletonActivityHeatmapSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkActivityHeatmap data={DASHBOARD_ACTIVITY_SAMPLE} endDate={DASHBOARD_ACTIVITY_END} aria-label="Contributions in 2025" />
    </RecipeScope>
  )
}

export function SkeletonActivityHeatmapCellSpecimen({ t, v }: SpecimenProps) {
  const state = (v.State ?? 'Default') as ActivityHeatmapCellState
  return (
    <RecipeScope t={t}>
      <SkActivityHeatmapCell role="img" aria-label="Tuesday, March 18: 8 contributions" value={Number(v.Value ?? 3) as ActivityLevel} forceState={state === 'Default' ? undefined : state} />
    </RecipeScope>
  )
}
