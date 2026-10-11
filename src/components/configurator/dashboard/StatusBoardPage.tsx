// STATUS BOARD — every role and component of the system, its checks and its
// status. The checks recommend; the person decides. A status nobody decided
// follows the system (see `automaticStatus`).

import { useMemo, useState } from 'react'
import { useI18n } from '../../../lib/i18n'
import { sortForDecision, type Suggestion } from '../../../lib/systemDashboard'
import { ELEMENT_STATUSES, type ElementStatus } from '../../../lib/systemDashboardTypes'
import { BTN, Card, EmptyRow, Mark, PageHeader, ROW, StatusPill, Swatch, TD, TH, Tag } from './parts'
import { STATUS_LABEL, headlineCheck, useCheckText, type Dashboard, type Tone } from './dashboardData'

export type StatusFilter = ElementStatus | 'all'
type KindFilter = 'all' | 'token' | 'component'

const SUGGESTION_LABEL: Record<Suggestion, string> = {
  approve: 'Approve',
  changes: 'Request changes',
  keep: 'Keep as is',
}
const SUGGESTION_TONE: Record<Suggestion, Tone> = { approve: 'success', changes: 'warning', keep: 'neutral' }
/** The status a suggestion maps to. `keep` changes nothing. */
const SUGGESTED_STATUS: Record<Suggestion, ElementStatus | null> = { approve: 'approved', changes: 'review', keep: null }

const KINDS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'token', label: 'Tokens' },
  { key: 'component', label: 'Components' },
]

export default function StatusBoardPage({ dash, filter, onFilter, selected, onSelect, timeAgo }: {
  dash: Dashboard
  filter: StatusFilter
  onFilter: (next: StatusFilter) => void
  selected: string | null
  onSelect: (id: string) => void
  timeAgo: (iso: string) => string
}) {
  const { t } = useI18n()
  const checkText = useCheckText()
  const [kind, setKind] = useState<KindFilter>('all')
  const { store, elements, counts, roles } = dash

  const shown = useMemo(
    () => sortForDecision(elements).filter((el) => (filter === 'all' || el.status === filter) && (kind === 'all' || el.kind === kind)),
    [elements, filter, kind],
  )
  const current = shown.find((el) => el.id === selected) ?? shown[0] ?? null
  const role = current?.kind === 'token' ? roles.roles.find((r) => r.id === current.name) : undefined

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
        detail={t('Every role and component of this design system, with the checks Escala runs on it. The checks recommend a status; you decide.')}
        right={(
          <div role="group" aria-label={t('Element type')} className="flex h-8 items-center rounded-lg border border-line p-0.5">
            {KINDS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setKind(item.key)}
                aria-pressed={kind === item.key}
                className={`h-7 rounded-md px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  kind === item.key ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        )}
      />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr))]">
        {counter('all', t('All'), elements.length)}
        {ELEMENT_STATUSES.map((status) => counter(status, t(STATUS_LABEL[status]), counts[status]))}
      </div>

      <div className="grid items-start gap-4 lg:[grid-template-columns:minmax(0,1fr)_20rem]">
        <Card title={t('Elements')} right={<span className="text-caption text-fg-faint">{t('What needs a decision comes first')}</span>}>
          {shown.length === 0 ? <EmptyRow>{t('No element has this status.')}</EmptyRow> : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>{t('Element')}</th>
                    <th className={TH}>{t('Status')}</th>
                    <th className={TH}>{t('Check')}</th>
                    <th className={TH}>{t('Suggested')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((el) => {
                    const line = checkText(headlineCheck(el.checks))
                    const on = current?.id === el.id
                    return (
                      <tr
                        key={el.id}
                        onClick={() => onSelect(el.id)}
                        className={`${ROW} cursor-pointer transition-colors ${on ? 'bg-accent-ui/[0.08]' : 'hover:bg-fg/[0.03]'}`}
                      >
                        <td className={TD}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSelect(el.id) }}
                            aria-current={on ? 'true' : undefined}
                            className="flex flex-col items-start rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                          >
                            <span className={`font-semibold text-fg ${el.kind === 'token' ? 'font-mono text-micro' : ''}`}>{el.name}</span>
                            <span className="text-micro text-fg-faint">{el.kind === 'token' ? t('Token') : t('Component')} · {el.group}</span>
                          </button>
                        </td>
                        <td className={TD}><StatusPill status={el.status} /></td>
                        <td className={TD}>
                          <span className="flex items-center gap-1.5 text-fg-muted">
                            <Mark state={line.state} />
                            <span className="min-w-0">{line.text}</span>
                          </span>
                        </td>
                        <td className={TD}><Tag tone={SUGGESTION_TONE[el.suggestion]}>{t(SUGGESTION_LABEL[el.suggestion])}</Tag></td>
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
            title={<span className={current.kind === 'token' ? 'font-mono text-caption' : ''}>{current.name}</span>}
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
          {t('A status nobody set follows the system: what changed since the last release is Proposed, the rest is Live. Before the first release, everything is Approved until it is published. Publishing a release turns Approved into Live.')}
        </p>
      </Card>
    </>
  )
}
