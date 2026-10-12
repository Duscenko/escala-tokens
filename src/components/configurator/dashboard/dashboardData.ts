// What the dashboard pages read and the words they share. No JSX here, so the
// component files next to it stay component-only.

import { useMemo } from 'react'
import { useDesignStore } from '../../../store/useDesignStore'
import { useI18n } from '../../../lib/i18n'
import { INTENT_THRESHOLDS } from '../../../lib/color/apca'
import {
  buildElements, componentRows, contrastSummary, latestChange, releaseDraft, resolveSystemRoles,
  RELEASE_COMPONENT_PREFIX, sourceState, statusCounts,
  type ElementCheck, type SourceState,
} from '../../../lib/systemDashboard'
import type { ElementStatus } from '../../../lib/systemDashboardTypes'
import { SPECIMENS } from '../docs/specimens'
import { FOUNDATION_DOCS } from '../docs/foundationDocs'

export type DashPage = 'overview' | 'docs' | 'status' | 'components' | 'releases' | 'integrations'

/** The foundations the System tab's Docs lists. Icons is not one: its
 *  library is picked and browsed in Variables, and a docs page for it only
 *  repeated that. */
export const DASH_DOCS = FOUNDATION_DOCS.filter((doc) => doc.key !== 'icons')

/** The foundation Docs opens on when no page was picked yet. */
export const DEFAULT_DOC_KEY = DASH_DOCS[0].key

/** The foundation doc keys whose Docs page carries a role table. Shadow, Grid
 *  and Icons do not: their own page already shows the ramp. */
export const ROLE_TABLE_KEYS: ReadonlySet<string> = new Set(['typography', 'radius', 'spacing', 'sizes', 'stroke'])

/** Components with a live preview: the catalogue's own specimen registry. */
const PREVIEW_KEYS: ReadonlySet<string> = new Set(Object.keys(SPECIMENS))

/** Everything the dashboard shows for one brand, rebuilt when the system changes. */
export function useDashboard(brand: string) {
  const store = useDesignStore()
  return useMemo(() => {
    const roles = resolveSystemRoles(store, brand)
    const draft = releaseDraft(store)
    const elements = buildElements({ store, roles, previewKeys: PREVIEW_KEYS, changes: draft.changes })
    const counts = statusCounts(elements)
    const changedAt = latestChange(store.themeUpdatedAt)
    const tokenCount = Object.keys(draft.current).filter((path) => !path.startsWith(RELEASE_COMPONENT_PREFIX)).length
    return {
      store,
      roles,
      draft,
      elements,
      counts,
      waiting: counts.proposed + counts.review,
      contrast: contrastSummary(roles.findings),
      components: componentRows(store.selectedComponents, PREVIEW_KEYS),
      tokenCount,
      changedAt,
      figma: sourceState(store.figmaLastPublishAt, changedAt),
      github: (store.githubRepo ? sourceState(store.githubLastPushAt, changedAt) : 'never') as SourceState,
    }
  }, [store, brand])
}

export type Dashboard = ReturnType<typeof useDashboard>

export const DASH_PAGE_LABEL: Record<DashPage, string> = {
  overview: 'Overview',
  status: 'Status board',
  docs: 'Docs',
  components: 'Components',
  releases: 'Releases',
  integrations: 'Integrations',
}

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export const STATUS_LABEL: Record<ElementStatus, string> = {
  proposed: 'Proposed',
  review: 'In review',
  approved: 'Approved',
  live: 'Live',
  deprecated: 'Deprecated',
}

export const STATUS_TONE: Record<ElementStatus, Tone> = {
  proposed: 'accent',
  review: 'warning',
  approved: 'info',
  live: 'success',
  deprecated: 'neutral',
}

export type MarkState = 'pass' | 'fail' | 'info' | 'none'

// ── Checks, in words ─────────────────────────────────────────────────────────

const ratio = (value: number) => value.toFixed(2).replace(/\.?0+$/, '')

/** One sentence per check, plus the mark to draw beside it. */
export function useCheckText(): (check: ElementCheck) => { state: MarkState; text: string } {
  const { t } = useI18n()
  return (check) => {
    switch (check.kind) {
      case 'contrast': {
        if (check.state === 'none' || !check.worst) return { state: 'none', text: t('No contrast pair to measure') }
        const vars = { ratio: ratio(check.worst.wcag), against: check.worst.against }
        if (check.state === 'pass') return { state: 'pass', text: t('Contrast {ratio}:1 on {against}', vars) }
        const min = INTENT_THRESHOLDS[check.worst.intent].wcag ?? 0
        return { state: 'fail', text: t('Contrast {ratio}:1 on {against}, needs {min}:1', { ...vars, min: ratio(min) }) }
      }
      case 'naming':
        return check.state === 'pass'
          ? { state: 'pass', text: t('Name follows the convention') }
          : { state: 'fail', text: t('Name breaks the convention') }
      case 'duplicate':
        return check.of
          ? { state: 'info', text: t('Same value as {token} in every theme', { token: check.of }) }
          : { state: 'pass', text: t('No other role shares its value') }
      case 'usage':
        return check.components.length
          ? { state: 'pass', text: t('Read by {n} components in this system', { n: check.components.length }) }
          : { state: 'info', text: t('No component in this system reads it') }
      case 'figma':
        return check.state === 'pass'
          ? { state: 'pass', text: t('{n} component sets in Figma', { n: check.sets }) }
          : { state: 'fail', text: t('Not in the Figma library yet') }
      case 'docs':
        return check.state === 'pass'
          ? { state: 'pass', text: t('Usage, accessibility and props are written') }
          : { state: 'fail', text: t('Documentation is incomplete') }
      case 'preview':
        return check.state === 'pass'
          ? { state: 'pass', text: t('Has a live preview') }
          : { state: 'info', text: t('No live preview') }
      case 'roles':
        return check.state === 'pass'
          ? { state: 'pass', text: t('Reads {n} colour roles, all pass contrast', { n: check.total }) }
          : { state: 'fail', text: t('Reads a role that fails contrast: {roles}', { roles: check.failing.join(', ') }) }
    }
  }
}

/** The first failing check of an element, or its first check when none fails. */
export function headlineCheck(checks: readonly ElementCheck[]): ElementCheck {
  return checks.find((check) => check.state === 'fail') ?? checks[0]
}
