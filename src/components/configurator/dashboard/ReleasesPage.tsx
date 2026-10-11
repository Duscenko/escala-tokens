// RELEASES — what changed since the last release, and the releases on file.
// A release is a record kept in this design system: it sends nothing to Figma
// or GitHub by itself, and the page says so.

import { useState } from 'react'
import { useI18n } from '../../../lib/i18n'
import { buildRelease, changeCollection, nextVersion } from '../../../lib/systemDashboard'
import type { ReleaseBump, ReleaseChange, ReleaseRecord } from '../../../lib/systemDashboardTypes'
import { BTN, BTN_PRIMARY, Card, EmptyRow, Mark, PageHeader, Swatch, Tag } from './parts'
import type { Dashboard, MarkState, Tone } from './dashboardData'

const BUMPS: ReleaseBump[] = ['patch', 'minor', 'major']
const BUMP_LABEL: Record<ReleaseBump, string> = { patch: 'Patch', minor: 'Minor', major: 'Major' }
const KIND_LABEL: Record<ReleaseChange['kind'], string> = { added: 'Added', changed: 'Changed', removed: 'Removed' }
const KIND_TONE: Record<ReleaseChange['kind'], Tone> = { added: 'success', changed: 'info', removed: 'danger' }
/** Changes drawn in the list. The counts above it always hold the real totals. */
const SHOWN_CHANGES = 80

const isColour = (value: string | undefined) => !!value && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)

function Value({ value }: { value: string | undefined }) {
  if (value === undefined) return <span className="text-fg-faint">—</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-micro">
      {isColour(value) && <Swatch css={value} size={12} />}
      <span className="truncate">{value}</span>
    </span>
  )
}

function ChangeList({ changes, total }: { changes: readonly ReleaseChange[]; total: number }) {
  const { t } = useI18n()
  const shown = changes.slice(0, SHOWN_CHANGES)
  const groups = new Map<string, ReleaseChange[]>()
  for (const change of shown) {
    const key = changeCollection(change.path)
    const list = groups.get(key)
    if (list) list.push(change)
    else groups.set(key, [change])
  }
  return (
    <div className="flex flex-col gap-3">
      {[...groups].map(([collection, list]) => (
        <div key={collection} className="flex flex-col">
          <span className="pb-1 font-mono text-micro font-medium text-fg-faint">{collection}</span>
          <ul className="flex flex-col">
            {list.map((change) => (
              <li key={change.path} className="grid items-center gap-x-3 gap-y-1 border-t border-line py-1.5 text-caption [grid-template-columns:4.5rem_minmax(0,1.2fr)_minmax(0,1fr)]">
                <Tag tone={KIND_TONE[change.kind]}>{t(KIND_LABEL[change.kind])}</Tag>
                <span className="truncate font-mono text-micro text-fg" title={change.path}>{change.path.slice(collection.length + 1) || change.path}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-fg-muted">
                  {change.kind !== 'added' && <Value value={change.before} />}
                  {change.kind === 'changed' && <span aria-hidden>→</span>}
                  {change.kind !== 'removed' && <Value value={change.after} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {total > shown.length && (
        <p className="text-caption text-fg-faint">{t('And {n} more.', { n: total - shown.length })}</p>
      )}
    </div>
  )
}

function Counts({ counts }: { counts: ReleaseRecord['counts'] }) {
  const { t } = useI18n()
  const cell = (label: string, value: number) => (
    <div className="flex flex-col gap-0.5 rounded-lg border border-line px-3 py-2">
      <span className="text-caption text-fg-muted">{label}</span>
      <span className="text-title font-semibold tabular-nums text-fg">{value}</span>
    </div>
  )
  return (
    <div className="grid grid-cols-3 gap-2">
      {cell(t('Added'), counts.added)}
      {cell(t('Changed'), counts.changed)}
      {cell(t('Removed'), counts.removed)}
    </div>
  )
}

export default function ReleasesPage({ dash, timeAgo, onOpenStatus, onOpenIntegrations }: {
  dash: Dashboard
  timeAgo: (iso: string) => string
  onOpenStatus: () => void
  onOpenIntegrations: () => void
}) {
  const { t } = useI18n()
  const { store, draft, contrast, waiting, figma, github } = dash
  const releases = store.releases ?? []
  const [selected, setSelected] = useState<string>('draft')
  const [bumpChoice, setBumpChoice] = useState<ReleaseBump | null>(null)
  const [note, setNote] = useState('')

  const total = draft.counts.added + draft.counts.changed + draft.counts.removed
  const nothingToRelease = !draft.first && total === 0
  const bump = draft.first ? 'major' : (bumpChoice ?? draft.suggested ?? 'patch')
  const version = nextVersion(draft.lastVersion, bump)
  const past = releases.find((release) => release.version === selected)

  const publish = () => {
    const release = buildRelease(draft, bump, note, new Date().toISOString())
    store.publishRelease(release, draft.current)
    setNote('')
    setBumpChoice(null)
    setSelected(release.version)
  }

  const checklist: { state: MarkState; text: string; action?: { label: string; run: () => void } }[] = [
    contrast.failing.length === 0
      ? { state: 'pass', text: t('{n} contrast pairs pass WCAG AA', { n: contrast.measured }) }
      : { state: 'fail', text: t('{n} contrast pairs fail WCAG AA', { n: contrast.failing.length }), action: { label: t('Open status board'), run: onOpenStatus } },
    waiting === 0
      ? { state: 'pass', text: t('No element is waiting for a decision') }
      : { state: 'info', text: t('{n} elements are proposed or in review', { n: waiting }), action: { label: t('Open status board'), run: onOpenStatus } },
    figma === 'synced'
      ? { state: 'pass', text: t('Figma has the latest changes') }
      : { state: 'info', text: figma === 'never' ? t('Nothing was published to Figma yet') : t('Figma is behind the latest changes'), action: { label: t('Integrations'), run: onOpenIntegrations } },
    github === 'synced'
      ? { state: 'pass', text: t('GitHub has the latest changes') }
      : { state: 'info', text: github === 'never' ? t('No GitHub repository holds this system yet') : t('GitHub is behind the latest changes'), action: { label: t('Integrations'), run: onOpenIntegrations } },
  ]

  const versionRow = (key: string, title: string, tag: React.ReactNode, detail: string) => (
    <li key={key}>
      <button
        type="button"
        onClick={() => setSelected(key)}
        aria-current={selected === key ? 'true' : undefined}
        className={`flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
          selected === key ? 'bg-accent-ui/[0.12]' : 'hover:bg-fg/[0.05]'
        }`}
      >
        <span className="flex items-center gap-2 text-caption font-semibold text-fg">{title}{tag}</span>
        <span className="text-micro text-fg-faint">{detail}</span>
      </button>
    </li>
  )

  return (
    <>
      <PageHeader
        title={t('Releases')}
        detail={t('What changed since the last release, and every release on file. A release is a record kept in this design system; it sends nothing to Figma or GitHub by itself.')}
      />

      <div className="grid items-start gap-4 lg:[grid-template-columns:15rem_minmax(0,1fr)]">
        <Card title={t('Versions')}>
          <ul className="-mx-1 flex flex-col gap-0.5">
            {versionRow(
              'draft',
              `v${version}`,
              <Tag tone="accent">{t('Draft')}</Tag>,
              draft.first ? t('First release') : nothingToRelease ? t('No changes yet') : t('{n} changes', { n: total }),
            )}
            {releases.map((release) => versionRow(
              release.version,
              `v${release.version}`,
              <Tag tone="success">{t('Published')}</Tag>,
              `${timeAgo(release.at)} · ${t('{n} changes', { n: release.counts.added + release.counts.changed + release.counts.removed })}`,
            ))}
          </ul>
        </Card>

        {past ? (
          <Card title={`v${past.version}`} right={<Tag>{t(BUMP_LABEL[past.bump])}</Tag>}>
            <p className="text-caption text-fg-muted">{t('Published {when}.', { when: timeAgo(past.at) })}{past.note ? ` ${past.note}` : ''}</p>
            <Counts counts={past.counts} />
            {past.changes.length === 0
              ? <EmptyRow>{t('The first release recorded the whole system, so there was nothing to compare it with.')}</EmptyRow>
              : <ChangeList changes={past.changes} total={past.counts.added + past.counts.changed + past.counts.removed} />}
          </Card>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <Card
              title={`v${version} — ${t('Draft')}`}
              right={!draft.first && draft.suggested && <Tag tone="accent">{t('Suggested: {bump}', { bump: t(BUMP_LABEL[draft.suggested]) })}</Tag>}
            >
              {draft.first ? (
                <p className="text-caption text-fg-muted">
                  {t('The first release records the whole system as it is now: {n} tokens and components. Later releases show what changed since.', { n: total })}
                </p>
              ) : (
                <>
                  <Counts counts={draft.counts} />
                  {nothingToRelease
                    ? <EmptyRow>{t('Nothing changed since v{version}.', { version: draft.lastVersion ?? '' })}</EmptyRow>
                    : <ChangeList changes={draft.changes} total={total} />}
                </>
              )}
            </Card>

            <Card title={t('Before you publish')}>
              <ul className="flex flex-col">
                {checklist.map((item) => (
                  <li key={item.text} className="flex items-center gap-2 border-t border-line py-2 text-caption text-fg first:border-t-0">
                    <Mark state={item.state} />
                    <span className="min-w-0 flex-1">{item.text}</span>
                    {item.action && (
                      <button type="button" onClick={item.action.run} className="flex-shrink-0 rounded-sm text-caption font-medium text-accent-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">
                        {item.action.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
                {!draft.first && (
                  <div className="flex flex-col gap-1">
                    <span className="text-micro font-medium text-fg-faint">{t('Version bump')}</span>
                    <div role="group" aria-label={t('Version bump')} className="flex h-8 items-center rounded-lg border border-line p-0.5">
                      {BUMPS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setBumpChoice(key)}
                          aria-pressed={bump === key}
                          className={`h-7 rounded-md px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                            bump === key ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'
                          }`}
                        >
                          {t(BUMP_LABEL[key])}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
                  <span className="text-micro font-medium text-fg-faint">{t('Note')}</span>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={160}
                    placeholder={t('What this release is about')}
                    className="h-8 rounded-lg border border-line bg-transparent px-2.5 text-caption text-fg placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                  />
                </label>
                <button type="button" onClick={onOpenIntegrations} className={BTN}>{t('Integrations')}</button>
                <button type="button" onClick={publish} disabled={nothingToRelease} className={BTN_PRIMARY}>
                  {t('Publish v{version}', { version })}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
