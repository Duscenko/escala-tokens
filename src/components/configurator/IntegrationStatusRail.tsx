import { useDesignStore } from '../../store/useDesignStore'
import { getStoredToken, type GitHubPushState } from '../../lib/github'
import { syncProjectId, type FigmaPublishState } from '../../lib/figmaSync'
import type { ThemeAppearance } from '../../lib/themeModes'
import { GitHubGlyph } from '../ui/icons'
import { FigmaLogo, relativeTime } from './figmaShared'
import { QUICK_SETTINGS_WIDTH, ThemeIdentityBand } from './ThemeQuickSettingsRail'

type IntegrationProvider = 'github' | 'figma'

function StatusDot({ active, busy, error }: { active: boolean; busy?: boolean; error?: boolean }) {
  const color = error ? 'bg-status-danger-solid' : busy ? 'bg-status-warning-solid' : active ? 'bg-status-success-solid' : 'bg-fg-faint'
  return <span aria-hidden className={`h-2 w-2 flex-shrink-0 rounded-full ${color} ${busy ? 'animate-pulse' : ''}`} />
}

function StatusRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-2 py-2.5">
      <dt className="text-mini uppercase tracking-[0.12em] text-fg-faint">{label}</dt>
      <dd className={`min-w-0 break-words text-right text-caption leading-relaxed text-fg-muted ${mono ? 'font-mono' : ''}`}>{value}</dd>
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
  previewTheme,
  previewAppearance: _previewAppearance,
  githubPushState,
  figmaPublishState,
}: {
  provider: IntegrationProvider
  previewTheme: string
  previewAppearance: ThemeAppearance
  githubPushState: GitHubPushState
  figmaPublishState: FigmaPublishState
}) {
  const { githubRepo, githubLastPushAt, figmaLastPublishAt, autoSyncFigma } = useDesignStore()
  const githubCredentialSaved = Boolean(getStoredToken())
  const isGithub = provider === 'github'
  const connected = isGithub ? githubCredentialSaved : Boolean(figmaLastPublishAt)
  const busy = isGithub ? githubPushState === 'pushing' : figmaPublishState === 'publishing'
  const error = isGithub ? githubPushState === 'error' : figmaPublishState === 'error'

  return (
    <aside
      aria-label={`${isGithub ? 'GitHub' : 'Figma'} integration status`}
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-line bg-app"
      style={{ width: QUICK_SETTINGS_WIDTH }}
    >
      <ThemeIdentityBand previewTheme={previewTheme} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-3 pb-4">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-line bg-surface text-fg">
            {isGithub ? <GitHubGlyph size={17} /> : <FigmaLogo size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-fg">{isGithub ? 'GitHub' : 'Figma'}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-caption text-fg-faint">
              <StatusDot active={connected} busy={busy} error={error} />
              {error ? 'Needs attention' : busy ? stateLabel(isGithub ? githubPushState : figmaPublishState) : connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>

        <section aria-labelledby={`${provider}-connection-heading`} className="border-t border-line/70 pt-4">
          <h2 id={`${provider}-connection-heading`} className="text-mini font-semibold uppercase tracking-[0.16em] text-fg-faint">Connection</h2>
          <dl className="mt-2 divide-y divide-line/60">
            {isGithub ? (
              <>
                <StatusRow label="Account" value={githubCredentialSaved ? 'Credentials saved' : 'Not connected'} />
                <StatusRow label="Repository" value={githubRepo ?? 'Not selected'} mono={Boolean(githubRepo)} />
                <StatusRow label="Latest push" value={relativeTime(githubLastPushAt)} />
                <StatusRow label="Push status" value={stateLabel(githubPushState)} />
              </>
            ) : (
              <>
                <StatusRow label="Endpoint" value={`/api/tokens · ${syncProjectId()}`} mono />
                <StatusRow label="Auto sync" value={autoSyncFigma ? 'On' : 'Off'} />
                <StatusRow label="Published" value={relativeTime(figmaLastPublishAt)} />
                <StatusRow label="Sync status" value={stateLabel(figmaPublishState)} />
              </>
            )}
          </dl>
        </section>

        <section aria-labelledby={`${provider}-protocol-heading`} className="mt-5 border-t border-line/70 pt-4">
          <h2 id={`${provider}-protocol-heading`} className="text-mini font-semibold uppercase tracking-[0.16em] text-fg-faint">Protocol</h2>
          {isGithub ? (
            <>
              <dl className="mt-2 divide-y divide-line/60">
                <StatusRow label="Snapshot" value={githubRepo ? '.escala/system.json' : 'On first push'} mono />
                <StatusRow label="Visibility" value="Private recommended" />
                <StatusRow label="Backup" value={githubRepo ? 'Repository linked' : 'Not configured'} />
              </dl>
              <p className="mt-3 text-mini leading-relaxed text-fg-faint">Pushes tokens, CSS, documentation, and the recoverable editor snapshot.</p>
            </>
          ) : (
            <>
              <dl className="mt-2 divide-y divide-line/60">
                <StatusRow label="Transport" value="Published endpoint" />
                <StatusRow label="Scope" value="Active design system" />
                <StatusRow label="Backup" value={githubRepo ? githubRepo : 'No repository'} mono={Boolean(githubRepo)} />
              </dl>
              <p className="mt-3 text-mini leading-relaxed text-fg-faint">The plugin reads the current token payload from this system’s scoped endpoint.</p>
            </>
          )}
        </section>
      </div>
    </aside>
  )
}
