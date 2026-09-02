import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore, type SavedSystem } from '../../store/useDesignStore'
import { isLiveEnvironment, syncUrl as buildSyncUrl, type FigmaPublishState } from '../../lib/figmaSync'
import { slugify } from '../../lib/utils'
import { FigmaLogo, BackToEditor, relativeTime, PluginInstallPromo } from './figmaShared'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../lib/pluginVersion'

interface FigmaSyncViewProps {
  onClose?: () => void
  embedded?: boolean
  /** Cross-link to the sibling destination — see FigmaDownloadView's own note. */
  onOpenDownload?: () => void
  /** Opens GitHubConnectView — surfaced as a nudge when unconnected, see below. */
  onOpenGithub?: () => void
  /** Opens the System library — used only by the systems list's empty state, to
   *  create/import a system rather than rebuilding that flow here. */
  onOpenSave?: () => void
  /** Shared manual-publish feedback from Configurator, so this screen and the
   *  persistent header always report the same request. */
  publishState: FigmaPublishState
  onRequestSync: () => void
}

// One row in "Your design systems" for a NON-active saved entry — the active
// one renders inline in the parent instead (just a name + badge, nothing
// interactive), so this only ever has to handle load/rename/delete.
function SystemRow({
  sys, isRenaming, renameValue, renameError,
  onStartRename, onRenameChange, onRenameSubmit, onRenameCancel,
  onLoad, isConfirmingDelete, onStartDelete, onConfirmDelete, onCancelDelete,
}: {
  sys: SavedSystem
  isRenaming: boolean
  renameValue: string
  renameError: string | null
  onStartRename: () => void
  onRenameChange: (v: string) => void
  onRenameSubmit: () => void
  onRenameCancel: () => void
  onLoad: () => void
  isConfirmingDelete: boolean
  onStartDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  if (isRenaming) {
    return (
      <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-line-strong bg-app">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit()
              if (e.key === 'Escape') onRenameCancel()
            }}
            aria-label={`Rename ${sys.name}`}
            className="flex-1 min-w-0 text-xs text-fg bg-transparent outline-none border-b border-line-strong"
          />
          <button onClick={onRenameSubmit} className="text-mini font-medium text-status-success hover:text-status-success flex-shrink-0">Save</button>
          <button onClick={onRenameCancel} className="text-mini text-fg-faint hover:text-fg flex-shrink-0">Cancel</button>
        </div>
        {renameError && <p className="text-mini text-status-danger">{renameError}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-elevated/60 transition-colors group">
      <button onClick={onLoad} className="flex-1 min-w-0 text-left text-xs text-fg-muted hover:text-fg transition-colors truncate">
        {sys.name}
      </button>
      {!isConfirmingDelete ? (
        <>
          {/* `relativeTime` (figmaShared), not a second local formatter: the
              hero above already prints "Last published 5m ago" with it, and a
              copied-in variant rendered "5 min ago" one card lower — two
              vocabularies for one concept on one screen. */}
          <span className="text-mini text-fg-faint flex-shrink-0 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">saved {relativeTime(sys.savedAt)}</span>
          <button onClick={onStartRename} aria-label={`Rename ${sys.name}`} className="p-1 rounded text-fg-faint hover:text-fg hover:bg-elevated transition-colors flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          </button>
          <button onClick={onStartDelete} aria-label={`Remove ${sys.name}`} className="p-1 rounded text-fg-faint hover:text-status-danger hover:bg-elevated transition-colors flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" /></svg>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-mini text-fg-faint">Remove?</span>
          <button onClick={onConfirmDelete} className="text-mini font-medium text-status-danger hover:text-status-danger transition-colors">Remove</button>
          <button onClick={onCancelDelete} className="text-mini text-fg-faint hover:text-fg transition-colors">Cancel</button>
        </div>
      )}
    </div>
  )
}

// ─── Sync status and explicit publish ───────────────────────────────────────
// Opening this surface is intentionally read-only. Its parent owns the manual
// publish request and status so the top-nav Sync control and this screen always
// show the same in-flight feedback. Downloading the plugin never invokes
// /api/tokens.
export default function FigmaSyncView({
  onClose, embedded = false, onOpenDownload, onOpenGithub, onOpenSave,
  publishState, onRequestSync,
}: FigmaSyncViewProps) {
  const {
    projectName, autoSyncFigma, setAutoSyncFigma, figmaLastPublishAt,
    githubRepo, savedSystems, loadSystem, removeSavedSystem, renameSavedSystem,
    renameActiveSystem, pluginBuildSeen,
  } = useDesignStore()

  const [isDeployed] = useState(isLiveEnvironment)
  // Per-system scoped endpoint (re-reads projectName each render so it stays current).
  const syncUrl = buildSyncUrl()

  const [copied, setCopied] = useState(false)

  // ── "Your design systems" — see SystemRow above. Only one row is ever
  // renaming/confirming a delete at a time, so this lives here rather than
  // as local state per row (same shape SaveView's SavedSystemsList uses).
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  // Same expression SaveSidePanel already uses to know which saved entry the
  // live editor state corresponds to (SaveView.tsx) — one rule for "which
  // system am I on," not a second one invented here.
  const activeId = githubRepo ?? `local:${slugify(projectName) || 'design-system'}`
  const otherSystems = savedSystems.filter((s) => s.id !== activeId)

  function startRename(sys: SavedSystem) {
    setRenamingId(sys.id)
    setRenameValue(sys.name)
    setRenameError(null)
  }
  function cancelRename() {
    setRenamingId(null)
    setRenameError(null)
  }
  function submitRename() {
    if (!renamingId) return
    const result = renameSavedSystem(renamingId, renameValue)
    if (result.ok) {
      setRenamingId(null)
      setRenameError(null)
    } else {
      setRenameError(result.error ?? 'Could not rename')
    }
  }

  // ── Renaming the ACTIVE system ────────────────────────────────────────────
  // Two entry points, ONE action: the hero's name field and the Active row in
  // the list below. Both go through `renameActiveSystem`, which also carries
  // the saved registry entry across — `setProjectName` on its own left the
  // entry behind under the old slug, which then showed up in this very list as
  // a second, orphaned system.
  //
  // The hero holds a DRAFT and commits on blur/Enter rather than writing on
  // every keystroke: the sync URL is derived from this name, so per-keystroke
  // commits meant the URL (and the id of the saved entry) churned through
  // every half-typed slug.
  const [nameDraft, setNameDraft] = useState(projectName)
  const [nameError, setNameError] = useState<string | null>(null)
  // Re-sync the draft whenever the active system changes underneath us —
  // loading another system from the list is exactly that.
  useEffect(() => {
    setNameDraft(projectName)
    setNameError(null)
  }, [projectName])

  function commitName(next: string) {
    if (next.trim() === projectName) {
      setNameDraft(projectName)
      setNameError(null)
      return true
    }
    const result = renameActiveSystem(next)
    if (result.ok) {
      setNameError(null)
      return true
    }
    setNameError(result.error ?? 'Could not rename')
    return false
  }

  const [renamingActive, setRenamingActive] = useState(false)
  const [activeDraft, setActiveDraft] = useState('')
  function submitActiveRename() {
    if (commitName(activeDraft)) setRenamingActive(false)
  }

  function copyUrl() {
    navigator.clipboard.writeText(syncUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // "Connected" here means "has ever published" — Figma sync has no login/
  // session identity to check the way GitHub does; the plugin just polls
  // whatever this endpoint last published, so `figmaLastPublishAt` IS the
  // connection signal.
  const connected = Boolean(figmaLastPublishAt)
  const pluginUpdateAvailable = pluginBuildSeen != null && pluginBuildSeen !== PLUGIN_BUILD

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex flex-col max-w-3xl ${embedded ? 'gap-5 p-6' : 'gap-8 p-8'}`}
    >
      {onClose && <BackToEditor onClose={onClose} />}

      {/* ── Hero — status-first, not the install pitch FigmaDownloadView
          leads with: this screen exists for "is it connected / when did it
          last sync", so that's the first thing on it.
          The project name is EDITABLE right here, not just displayed — the
          sync URL below is `/api/tokens?project=<slugify(projectName)>`
          (see `syncProjectId()` in `lib/figmaSync.ts`), so this is the one
          thing on the page that actually changes it. Reported as confusing:
          the name in the heading ("pink-2 · Figma sync") didn't match what
          the user was doing (picking a new accent colour) and the URL never
          moved when the colour did, which read as a bug rather than as "the
          URL is scoped to something else entirely." Matches the same
          editable-name pattern ExportView's own "Project" pill already uses,
          so there's one convention for "rename the project" across the app,
          not a second one invented here. ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/50 p-5">
        <div className="flex items-center gap-3.5">
          <FigmaLogo size={32} />
          <div className="min-w-0 flex-1">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              // Commit what the FIELD holds, not the `nameDraft` closure:
              // this handler captures the value from the render it was
              // attached in, so a blur landing before React re-renders (a
              // paste-then-tab, a programmatic blur) would commit a stale
              // name. `currentTarget.value` is always the real one.
              onBlur={(e) => commitName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  // Put the field back before blurring, or onBlur above
                  // would read the typed value and commit the very edit
                  // Escape is meant to abandon.
                  const el = e.currentTarget
                  setNameDraft(projectName)
                  setNameError(null)
                  el.value = projectName
                  el.blur()
                }
              }}
              placeholder="Escala"
              aria-label="Project name"
              title="Renaming your project changes the sync URL below"
              className="block text-title font-semibold text-fg bg-transparent outline-none border-b border-transparent hover:border-line-strong focus:border-line-strong leading-tight min-w-0"
              style={{ width: `${Math.max(nameDraft.length, 4)}ch` }}
            />
            {nameError ? (
              <p className="mt-1 text-caption text-status-danger">{nameError}</p>
            ) : (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-status-success-solid' : 'bg-fg-faint'}`} aria-hidden />
                  {connected
                    ? <>Published {relativeTime(figmaLastPublishAt)}</>
                    : 'Not published yet'}
                </span>
                {onOpenGithub && !githubRepo && (
                  <>
                    <span className="text-fg-faint" aria-hidden>·</span>
                    <button
                      type="button"
                      onClick={onOpenGithub}
                      title="This system only exists in this browser until you connect a repo"
                      className="inline-flex items-center gap-1 hover:text-fg transition-colors"
                    >
                      Connect GitHub
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4.5 2.5 8 6l-3.5 3.5" />
                      </svg>
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {onOpenDownload && (
          <PluginInstallPromo
            version={PLUGIN_VERSION}
            updateAvailable={pluginUpdateAvailable}
            onOpenInstall={onOpenDownload}
          />
        )}
      </div>

      {isDeployed ? (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface/50 p-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-fg">Your live sync URL</p>
              <button
                onClick={onRequestSync}
                disabled={publishState === 'publishing'}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-fg px-3 py-1.5 text-xs font-semibold text-app transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {publishState === 'publishing' ? (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 2a6 6 0 1 1-5.2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M13.5 5.5A6 6 0 1 0 14 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M13.5 1.8v3.7H9.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {publishState === 'publishing' ? 'Publishing…' : publishState === 'error' ? 'Retry sync' : 'Sync now'}
              </button>
            </div>
            <p className="text-xs text-fg-faint leading-relaxed">
              In the plugin&apos;s <span className="text-fg-muted">Live Sync</span> tab, paste this endpoint, use <span className="text-fg-muted">Sync now</span> to publish your current tokens, then hit sync in Figma.
            </p>
            {/* This is the whole "protocol": the URL is a function of the
                PROJECT NAME above, full stop — never colours, themes, radius,
                or anything else you edit. Editing a token republishes the
                SAME URL's contents (see the publish status below); only
                renaming the project changes which URL that is. Said
                explicitly here so it reads as "by design" rather than as a
                stale/broken URL the next time a colour edit doesn't move it. */}
            <p className="text-caption text-fg-faint leading-relaxed">
              This URL only changes when you rename the project (the field above) — never when you edit colours, themes, or any other token.
            </p>
            <div className="flex items-center gap-2 bg-app border border-line rounded-lg px-3 py-2 mt-1">
              <code className="text-xs text-[#5AADFF] flex-1 truncate font-mono">{syncUrl}</code>
              <button onClick={copyUrl} className="text-mini text-fg-faint hover:text-fg transition flex-shrink-0">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {publishState === 'publishing' && (
                <><span className="w-1.5 h-1.5 rounded-full bg-status-warning-solid animate-pulse" /><span className="text-fg-faint">Publishing your tokens…</span></>
              )}
              {publishState === 'done' && (
                <><span className="text-status-success">✓</span><span className="text-fg-muted">Tokens published — the plugin picks them up on its next sync.</span></>
              )}
              {publishState === 'error' && (
                <><span className="w-1.5 h-1.5 rounded-full bg-status-danger-solid" /><span className="text-fg-faint">Couldn&apos;t publish your tokens. Retry sync, or use the plugin&apos;s Import tab to paste them manually.</span></>
              )}
            </div>
          </div>

          {/* ── Auto-sync toggle ── */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-fg">Keep Figma in sync</p>
              <p className="text-caption text-fg-faint leading-relaxed mt-0.5">
                Re-publish automatically after every edit.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={autoSyncFigma}
              aria-label="Toggle auto-sync to Figma"
              onClick={() => setAutoSyncFigma(!autoSyncFigma)}
              className={`relative flex-shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors ${
                autoSyncFigma ? 'bg-status-success-solid' : 'bg-line-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  autoSyncFigma ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface/50 p-5">
          <p className="text-xs text-fg-faint leading-relaxed">
            Live sync runs against your deployed app. Deploy to a live URL first, then use <span className="text-fg-muted">Sync now</span> to publish your tokens to{' '}
            <code className="text-caption px-1 py-0.5 rounded bg-elevated text-fg-muted">/api/tokens</code>. For now, use the plugin&apos;s <span className="text-fg-muted">Import</span> tab with the exported <code className="text-caption px-1 py-0.5 rounded bg-elevated text-fg-muted">tokens.json</code>.
          </p>
        </div>
      )}

      {/* Managing several systems across several Figma files means the
          question "which one am I about to paste into THIS file" needs an
          answer right here, not two screens away in the System library. Reuses the
          same registry/actions that screen's grid does — this is a second
          VIEW of it, not a second copy. Loading a row only changes the
          endpoint; publish it deliberately with Sync now. */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs text-fg-faint uppercase tracking-wide px-1">Your design systems</h3>
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface/50 p-2">
          {/* The active row renames too — same pencil → input → Save the other
              rows use. It writes through `renameActiveSystem`, so the hero
              name, the sync URL and the saved entry all move together. */}
          {renamingActive ? (
            <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-line-strong bg-app">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={activeDraft}
                  onChange={(e) => setActiveDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitActiveRename()
                    if (e.key === 'Escape') { setRenamingActive(false); setNameError(null) }
                  }}
                  aria-label={`Rename ${projectName}`}
                  className="flex-1 min-w-0 text-xs text-fg bg-transparent outline-none border-b border-line-strong"
                />
                <button onClick={submitActiveRename} className="text-mini font-medium text-status-success hover:text-status-success flex-shrink-0">Save</button>
                <button onClick={() => { setRenamingActive(false); setNameError(null) }} className="text-mini text-fg-faint hover:text-fg flex-shrink-0">Cancel</button>
              </div>
              {nameError && <p className="text-mini text-status-danger">{nameError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-elevated/60 group">
              <span className="text-xs font-medium text-fg truncate flex-1">{projectName || 'Untitled'}</span>
              <button
                onClick={() => { setActiveDraft(projectName); setNameError(null); setRenamingActive(true) }}
                aria-label={`Rename ${projectName}`}
                className="p-1 rounded text-fg-faint hover:text-fg hover:bg-elevated transition-colors flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-micro font-semibold uppercase tracking-wide bg-status-success/15 text-status-success">Active</span>
            </div>
          )}

          {otherSystems.length === 0 ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <p className="text-caption text-fg-faint">
                {savedSystems.length === 0
                  ? "You haven't saved this design system yet."
                  : 'Save another system to switch between them here.'}
              </p>
              {onOpenSave && (
                <button onClick={onOpenSave} className="text-caption text-fg-muted hover:text-fg transition-colors flex-shrink-0">
                  {savedSystems.length === 0 ? 'Save it →' : 'System library →'}
                </button>
              )}
            </div>
          ) : (
            otherSystems.map((sys) => (
              <SystemRow
                key={sys.id}
                sys={sys}
                isRenaming={renamingId === sys.id}
                renameValue={renameValue}
                renameError={renamingId === sys.id ? renameError : null}
                onStartRename={() => startRename(sys)}
                onRenameChange={setRenameValue}
                onRenameSubmit={submitRename}
                onRenameCancel={cancelRename}
                onLoad={() => loadSystem(sys.id)}
                isConfirmingDelete={confirmingDeleteId === sys.id}
                onStartDelete={() => setConfirmingDeleteId(sys.id)}
                onConfirmDelete={() => { removeSavedSystem(sys.id); setConfirmingDeleteId(null) }}
                onCancelDelete={() => setConfirmingDeleteId(null)}
              />
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
