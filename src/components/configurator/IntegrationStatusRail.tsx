import { type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { getStoredToken, type GitHubPushState } from '../../lib/github'
import { syncProjectId, type FigmaPublishState } from '../../lib/figmaSync'
import { GitHubGlyph } from '../ui/icons'
import { FigmaLogo, relativeTime } from './figmaShared'
import { QUICK_SETTINGS_WIDTH, ThemeRailScrollRegion } from './ThemeQuickSettingsRail'
import { THEME_BAND_H } from './colorControls'

type IntegrationProvider = 'github' | 'figma'

function StatusDot({ active, busy, error }: { active: boolean; busy?: boolean; error?: boolean }) {
  const color = error ? 'bg-status-danger-solid' : busy ? 'bg-status-warning-solid' : active ? 'bg-status-success-solid' : 'bg-fg-faint'
  return <span aria-hidden className={`h-2 w-2 flex-shrink-0 rounded-full ${color} ${busy ? 'animate-pulse' : ''}`} />
}

// `dot` is only ever passed to the STATUS row — the one row whose value is a
// live state rather than a stored fact. It used to live in a provider header
// above this list, which meant the column stated its identity twice (band +
// header) and the dot annotated the provider name instead of the state it
// actually reports.
function StatusRow({ label, value, mono = false, dot }: { label: string; value: string; mono?: boolean; dot?: ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-2 py-2.5">
      <dt className="text-mini uppercase tracking-[0.12em] text-fg-faint">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-1.5 text-caption leading-relaxed text-fg-muted">
        {dot}
        <span className={`min-w-0 break-words text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
      </dd>
    </div>
  )
}

function stateLabel(state: GitHubPushState | FigmaPublishState) {
  if (state === 'pushing') return 'Pushing…'
  if (state === 'publishing') return 'Publishing…'
  if (state === 'done') return 'Complete'
  if (state === 'error') return 'Needs attention'
  return 'Idle'
}

export default function IntegrationStatusRail({
  provider,
  githubPushState,
  figmaPublishState,
}: {
  provider: IntegrationProvider
  githubPushState: GitHubPushState
  figmaPublishState: FigmaPublishState
}) {
  const { githubRepo, githubLastPushAt, figmaLastPublishAt, autoSyncFigma } = useDesignStore()
  const githubCredentialSaved = Boolean(getStoredToken())
  const isGithub = provider === 'github'
  const connected = isGithub ? githubCredentialSaved : Boolean(figmaLastPublishAt)
  const busy = isGithub ? githubPushState === 'pushing' : figmaPublishState === 'publishing'
  const error = isGithub ? githubPushState === 'error' : figmaPublishState === 'error'
  // The header's own expression, moved onto the status ROW: in-flight and
  // failed states outrank "connected", which is only a resting fact.
  const statusValue = error
    ? 'Needs attention'
    : busy
      ? stateLabel(isGithub ? githubPushState : figmaPublishState)
      : connected ? 'Connected' : 'Not connected'

  return (
    <aside
      aria-label={`${isGithub ? 'GitHub' : 'Figma'} integration status`}
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-line bg-app"
      style={{ width: QUICK_SETTINGS_WIDTH }}
    >
      {/* Provider band. `THEME_BAND_H` + `border-b` because it sits on the SAME
          row as `IntegrationContextBar`'s breadcrumb in the column beside it —
          without the border the divider started at the rail's right edge and
          the two top rows read as different heights. It names the PROVIDER,
          not the previewed theme: a theme name is meaningless on an
          integration screen, which is why `ThemeIdentityBand` isn't used here. */}
      <div
        className="flex flex-shrink-0 items-center gap-2.5 border-b border-line px-4"
        style={{ height: THEME_BAND_H }}
      >
        <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg border border-line bg-surface text-fg">
          {isGithub ? <GitHubGlyph size={14} /> : <FigmaLogo size={16} />}
        </span>
        <span className="min-w-0 truncate text-ui font-semibold text-fg">{isGithub ? 'GitHub' : 'Figma'}</span>
      </div>
      <ThemeRailScrollRegion padClass="px-4 py-4">
        <section aria-labelledby={`${provider}-connection-heading`}>
          <h2 id={`${provider}-connection-heading`} className="text-mini font-semibold uppercase tracking-[0.16em] text-fg-faint">Connection</h2>
          <dl className="mt-2 divide-y divide-line">
            {isGithub ? (
              <>
                <StatusRow label="Push status" value={statusValue} dot={<StatusDot active={connected} busy={busy} error={error} />} />
                <StatusRow label="Latest push" value={relativeTime(githubLastPushAt)} />
                <StatusRow label="Repository" value={githubRepo ?? 'Not selected'} mono={Boolean(githubRepo)} />
                <StatusRow label="Account" value={githubCredentialSaved ? 'Credentials saved' : 'Not connected'} />
              </>
            ) : (
              <>
                <StatusRow label="Sync status" value={statusValue} dot={<StatusDot active={connected} busy={busy} error={error} />} />
                <StatusRow label="Published" value={relativeTime(figmaLastPublishAt)} />
                <StatusRow label="Endpoint" value={`/api/tokens · ${syncProjectId()}`} mono />
                <StatusRow label="Auto sync" value={autoSyncFigma ? 'On' : 'Off'} />
              </>
            )}
          </dl>
        </section>

        <section aria-labelledby={`${provider}-protocol-heading`} className="mt-5 border-t border-line pt-4">
          <h2 id={`${provider}-protocol-heading`} className="text-mini font-semibold uppercase tracking-[0.16em] text-fg-faint">Protocol</h2>
          {isGithub ? (
            <>
              <dl className="mt-2 divide-y divide-line">
                <StatusRow label="Snapshot" value={githubRepo ? '.escala/system.json' : 'On first push'} mono />
                <StatusRow label="Visibility" value="Private recommended" />
                <StatusRow label="Backup" value={githubRepo ? 'Repository linked' : 'Not configured'} />
              </dl>
              <p className="mt-3 text-mini leading-relaxed text-fg-faint">Pushes tokens, CSS, documentation, and the recoverable editor snapshot.</p>
            </>
          ) : (
            <>
              <dl className="mt-2 divide-y divide-line">
                <StatusRow label="Transport" value="Published endpoint" />
                <StatusRow label="Scope" value="Active design system" />
                <StatusRow label="Backup" value={githubRepo ? githubRepo : 'No repository'} mono={Boolean(githubRepo)} />
              </dl>
              <p className="mt-3 text-mini leading-relaxed text-fg-faint">The plugin reads the current token payload from this system’s scoped endpoint.</p>
            </>
          )}
        </section>
      </ThemeRailScrollRegion>
    </aside>
  )
}
