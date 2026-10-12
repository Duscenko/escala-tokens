// STATUS BOARD — two boards, never one list: the semantic roles (Tokens) and
// the components. Each has its own counters and its own columns, because a
// role is judged on its colours and a component on what exists for it.
// The checks recommend; the person decides. A status nobody decided follows
// the system (see `automaticStatus`).

import { useMemo } from 'react'
import { useI18n } from '../../../lib/i18n'
import { sortForDecision, statusCounts, type DashboardElement, type ElementCheck, type ElementKind, type Suggestion } from '../../../lib/systemDashboard'
import { ELEMENT_STATUSES, type ElementStatus } from '../../../lib/systemDashboardTypes'
import { BTN, Card, EmptyRow, Mark, PageHeader, ROW, StatusPill, Swatch, TD, TH, Tag, YesNo } from './parts'
import { StatusMenu } from './StatusMenu'
import { STATUS_LABEL, useCheckText, type Dashboard, type Tone } from './dashboardData'

export type StatusFilter = ElementStatus | 'all'
export type StatusKind = ElementKind

const SUGGESTION_LABEL: Record<Suggestion, string> = {
  approve: 'Allow sync',
  changes: 'Request changes',
  keep: 'Keep as is',
}
const SUGGESTION_TONE: Record<Suggestion, Tone> = { approve: 'success', changes: 'warning', keep: 'neutral' }
/** The status a suggestion maps to. `keep` changes nothing. */
const SUGGESTED_STATUS: Record<Suggestion, ElementStatus | null> = { approve: 'approved', changes: 'review', keep: null }

const KINDS: { key: StatusKind; label: string }[] = [
  { key: 'token', label: 'Tokens' },
  { key: 'component', label: 'Components' },
]

const checkOf = <K extends ElementCheck['kind']>(el: DashboardElement, kind: K) =>
  el.checks.find((check): check is Extract<ElementCheck, { kind: K }> => check.kind === kind)

export default function StatusBoardPage({ dash, kind, onKind, filter, onFilter, selected, onSelect, timeAgo }: {
  dash: Dashboard
  kind: StatusKind
  onKind: (next: StatusKind) => void
  filter: StatusFilter
  onFilter: (next: StatusFilter) => void
  selected: string | null
  onSelect: (id: string) => void
  timeAgo: (iso: string) => string
}) {
  const { t } = useI18n()
  const checkText = useCheckText()
  const { store, elements, roles } = dash
  const tokens = kind === 'token'
  // Everything below reads one kind only: its elements, its counters.
  const ofKind = useMemo(() => elements.filter((el) => el.kind === kind), [elements, kind])
  const counts = useMemo(() => statusCounts(ofKind), [ofKind])

  const shown = useMemo(
    () => sortForDecision(ofKind).filter((el) => filter === 'all' || el.status === filter),
    [ofKind, filter],
  )
  const current = shown.find((el) => el.id === selected) ?? shown[0] ?? null
  const roleById = useMemo(() => new Map(roles.roles.map((r) => [r.id, r])), [roles])
  const role = current && tokens ? roleById.get(current.name) : undefined

  const counter = (key: StatusFilter, label: string, count: number) => (
    <button
      key={key}
      type="button"
      onClick={() => onFilter(key)}
      aria-pressed={filter === key}
      className={`flex min-w-0 flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
        filter === key ? 'border-accent-ui/60 bg-accent-ui/[0.08]' : 'border-line bg-surface hover:border-line-strong'
      }`}
    >
      <span className="text-caption text-fg-muted">{label}</span>
      <span className="text-heading font-semibold tabular-nums text-fg">{count}</span>
    </button>
  )

  const suggestedStatus = current ? SUGGESTED_STATUS[current.suggestion] : null

  return (
    <>
      <PageHeader
        title={t('Status board')}
        detail={tokens
          ? t('Every semantic role of this brand, with its colours and its contrast. The checks recommend a status; you decide.')
          : t('Every component of this design system, and what exists for it: Figma, documentation, a live preview. The checks recommend a status; you decide.')}
        right={(
          <div role="group" aria-label={t('Element type')} className="flex h-8 items-center rounded-lg border border-line p-0.5">
            {KINDS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onKind(item.key)}
                aria-pressed={kind === item.key}
                className={`h-7 rounded-md px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  kind === item.key ? 'bg-fg/[0.10] text-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        )}
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr))]">
        {counter('all', t('All'), ofKind.length)}
        {ELEMENT_STATUSES.map((status) => counter(status, t(STATUS_LABEL[status]), counts[status]))}
      </div>

      <div className="grid items-start gap-4 lg:[grid-template-columns:minmax(0,1fr)_20rem]">
        <Card title={tokens ? t('Tokens') : t('Components')} right={<span className="text-caption text-fg-faint">{t('What needs a decision comes first')}</span>}>
          {shown.length === 0 ? <EmptyRow>{tokens ? t('No token has this status.') : t('No component has this status.')}</EmptyRow> : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse">
                <thead>
                  {tokens ? (
                    <tr>
                      <th className={TH}>{t('Token')}</th>
                      <th className={TH}>{t('Values')}</th>
                      <th className={TH}>{t('Status')}</th>
                      <th className={TH}>{t('Contrast')}</th>
                      <th className={TH}>{t('Suggested')}</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className={TH}>{t('Component')}</th>
                      <th className={TH}>{t('Status')}</th>
                      <th className={TH}>Figma</th>
                      <th className={TH}>{t('Docs')}</th>
                      <th className={TH}>{t('Preview')}</th>
                      <th className={TH}>{t('Suggested')}</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {shown.map((el) => {
                    const on = current?.id === el.id
                    const name = (
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelect(el.id) }}
                          aria-current={on ? 'true' : undefined}
                          className="flex flex-col items-start rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                        >
                          <span className={`font-semibold text-fg ${tokens ? 'font-mono text-micro' : ''}`}>{el.name}</span>
                          <span className="text-micro text-fg-faint">{el.group}</span>
                        </button>
                      </td>
                    )
                    const suggested = <td className={TD}><Tag tone={SUGGESTION_TONE[el.suggestion]}>{t(SUGGESTION_LABEL[el.suggestion])}</Tag></td>
                    const rowClass = `${ROW} cursor-pointer transition-colors ${on ? 'bg-accent-ui/[0.08]' : 'hover:bg-fg/[0.03]'}`
                    if (tokens) {
                      const contrast = checkOf(el, 'contrast')
                      const line = contrast ? checkText(contrast) : null
                      const entry = roleById.get(el.name)
                      return (
                        <tr key={el.id} onClick={() => onSelect(el.id)} className={rowClass}>
                          {name}
                          <td className={TD}>
                            <span className="flex items-center gap-1">
                              {roles.modeKeys.map((mode) => <Swatch key={mode} css={entry?.modes[mode]?.css ?? 'transparent'} size={16} />)}
                            </span>
                          </td>
                          <td className={TD}><StatusMenu element={el} /></td>
                          <td className={TD}>
                            {line && (
                              <span className="flex items-center gap-1.5 text-fg-muted">
                                <Mark state={line.state} />
                                <span className="min-w-0">{line.text}</span>
                              </span>
                            )}
                          </td>
                          {suggested}
                        </tr>
                      )
                    }
                    return (
                      <tr key={el.id} onClick={() => onSelect(el.id)} className={rowClass}>
                        {name}
                        <td className={TD}><StatusMenu element={el} /></td>
                        <td className={TD}><YesNo yes={checkOf(el, 'figma')?.state === 'pass'} yesLabel={t('In the Figma library')} noLabel={t('Not in the Figma library yet')} /></td>
                        <td className={TD}><YesNo yes={checkOf(el, 'docs')?.state === 'pass'} yesLabel={t('Documented')} noLabel={t('Documentation is incomplete')} /></td>
                        <td className={TD}><YesNo yes={checkOf(el, 'preview')?.state === 'pass'} yesLabel={t('Has a live preview')} noLabel={t('No live preview')} /></td>
                        {suggested}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {current && (
          <Card
            className="lg:sticky lg:top-0"
            title={<span className={tokens ? 'font-mono text-caption' : ''}>{current.name}</span>}
            right={<StatusPill status={current.status} />}
          >
            {role && (
              <ul className="flex flex-col gap-1.5 rounded-lg border border-line p-2.5">
                {roles.modeKeys.map((mode) => (
                  <li key={mode} className="flex items-center gap-2 text-caption">
                    <Swatch css={role.modes[mode]?.css ?? 'transparent'} size={18} />
                    <span className="w-10 flex-shrink-0 text-fg-muted">{roles.appearanceOf[mode] === 'dark' ? t('Dark') : t('Light')}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-micro text-fg">{role.modes[mode]?.label}</span>
                    <span className="flex-shrink-0 font-mono text-micro text-fg-faint">{role.modes[mode]?.css}</span>
                  </li>
                ))}
              </ul>
            )}

            <ul className="flex flex-col">
              {current.checks.map((check) => {
                const line = checkText(check)
                return (
                  <li key={check.kind} className="flex items-start gap-2 border-t border-line py-2 text-caption text-fg first:border-t-0">
                    <span className="pt-0.5"><Mark state={line.state} /></span>
                    <span className="min-w-0">{line.text}</span>
                  </li>
                )
              })}
            </ul>

            <p className="text-caption text-fg-muted">
              {current.decided && current.decidedAt
                ? t('You set this status {when}.', { when: timeAgo(current.decidedAt) })
                : current.changedSinceRelease
                  ? t('Automatic: it changed since the last release.')
                  : t('Automatic: it follows the system.')}
            </p>

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <span className="text-micro font-medium text-fg-faint">{t('Set status')}</span>
              <div className="flex flex-wrap gap-1.5">
                {ELEMENT_STATUSES.map((status) => {
                  const on = current.decided && current.status === status
                  const hinted = !on && suggestedStatus === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => store.setElementStatus(current.id, status)}
                      aria-pressed={on}
                      title={hinted ? t('The checks suggest this') : undefined}
                      className={`h-7 rounded-md border px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                        on
                          ? 'border-transparent bg-accent-solid text-accent-ink'
                          : hinted
                            ? 'border-accent-ui/60 text-accent-ui hover:bg-accent-ui/[0.08]'
                            : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                      }`}
                    >
                      {t(STATUS_LABEL[status])}
                    </button>
                  )
                })}
              </div>
              {current.decided && (
                <button type="button" onClick={() => store.setElementStatus(current.id, null)} className={`${BTN} self-start`}>
                  {t('Back to automatic')}
                </button>
              )}
            </div>
          </Card>
        )}
      </div>

      <Card title={t('How status works')}>
        <p className="text-caption text-fg-muted">
          {store.releaseBaseline
            ? t('A status nobody set follows the system: what changed since the last release is Pending, the rest is Live.')
            : t('A status nobody set follows the system: Pending until the system is published to Figma, Live after.')}
        </p>
      </Card>
    </>
  )
}
