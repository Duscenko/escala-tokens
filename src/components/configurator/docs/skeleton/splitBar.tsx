/** The platform's specimens of the Figma `❖ SplitBar (PRO)` page: the bar, a segment, a legend item. The Preview card draws them
 *  with the system's roles, so a brand sees its own chart colours; the sample is the file's (traffic by source, 99,300 sessions). */
import type { SpecimenProps } from '../specimens'
import {
  SplitBar as SkSplitBar, SplitBarSegment as SkSplitBarSegment, SplitBarLegendItem as SkSplitBarLegendItem,
  type SplitBarSegmentData, type SplitBarSeries, type SplitBarSegmentState, type SplitBarLegendItemState,
} from '../../../escala-ui/split-bar'
import { RecipeScope } from './scope'

const TRAFFIC: SplitBarSegmentData[] = [
  { id: 'organic', label: 'Organic search', value: 41_300, series: 1 },
  { id: 'direct', label: 'Direct', value: 24_600, series: 2 },
  { id: 'paid', label: 'Paid search', value: 19_000, series: 3 },
  { id: 'social', label: 'Social', value: 9_800, series: 4 },
  { id: 'referral', label: 'Referral', value: 3_100, series: 5 },
  { id: 'other', label: 'Other', value: 1_500, series: 6 },
]

export function SkeletonSplitBarSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? '100%', maxWidth: '100%' }}>
        <SkSplitBar aria-label="Traffic by source" segments={TRAFFIC} valueUnit="sessions" />
      </div>
    </RecipeScope>
  )
}

export function SkeletonSplitBarSegmentSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as SplitBarSegmentState
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 240, maxWidth: '100%' }}>
        <SkSplitBarSegment series={(v.Series ?? '1') as SplitBarSeries} forceState={state === 'Default' ? undefined : state} aria-label="Organic search, 41.6 %" />
      </div>
    </RecipeScope>
  )
}

export function SkeletonSplitBarLegendItemSpecimen({ t, v }: SpecimenProps) {
  const state = (v.State ?? 'Default') as SplitBarLegendItemState
  return (
    <RecipeScope t={t}>
      <SkSplitBarLegendItem series={(v.Series ?? '1') as SplitBarSeries} checked={(v.Checked ?? 'true') === 'true'} forceState={state === 'Default' ? undefined : state} />
    </RecipeScope>
  )
}
