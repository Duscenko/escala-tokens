import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore, type SavedSystem } from '../../store/useDesignStore'
import { isLiveEnvironment, syncUrl as buildSyncUrl, type FigmaPublishState } from '../../lib/figmaSync'
import { applyFigmaEditsPatch, isFigmaEditsPatch } from '../../lib/figmaEdits'
import { useApplyAccentColor, useApplyStateColor } from '../../lib/colorActions'
import { slugify } from '../../lib/utils'
import { FigmaLogo, BackToEditor, relativeTime, PluginInstallPromo } from './figmaShared'
import { CopyGlyph } from '../ui/icons'
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
  /** Specific reason for the current 'error' state (a lost claim vs. a network
   *  hiccup) — same string the Sync pill's tooltip shows. Null outside 'error'. */
  publishError?: string | null
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
  publishState, publishError, onRequestSync,
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
  const [figmaPatchText, setFigmaPatchText] = useState('')
  const [figmaPatchMsg, setFigmaPatchMsg] = useState<string | null>(null)
  // A primitive-colour edit in the patch has to go through the SAME
  // re-derivation a hand-typed hex in the picker gets (ramp regen, linked
  // neutral/states cascade, page re-anchor) — see figmaEdits.ts. Both are
  // hooks, so they're obtained here and handed down, not called inside the
  // plain `applyFigmaEditsPatch` function.
  const applyAccentColor = useApplyAccentColor()
  const applyStateColor = useApplyStateColor()

  // ── "Your design systems" — see SystemRow above. Only one row is ever
  // renaming/confirming a delete at a time, so this lives here rather than
  // as local state per row (same shape SaveView's SavedSystemsList uses).
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  function applyFigmaPatch() {
    setFigmaPatchMsg(null)
    try {
      const parsed = JSON.parse(figmaPatchText) as unknown
      if (!isFigmaEditsPatch(parsed)) {
        setFigmaPatchMsg('Not an Escala Figma edits patch (expected kind: escala-figma-edits/v1).')
        return
      }
      const { applied, skipped } = applyFigmaEditsPatch(parsed, { applyAccentColor, applyStateColor })
      if (applied === 0) {
        setFigmaPatchMsg(skipped[0] ?? 'Nothing to apply.')
        return
      }
      setFigmaPatchMsg(
        `Applied ${applied} value edit${applied === 1 ? '' : 's'}`
        + (skipped.length ? ` · ${skipped.join(' · ')}` : '')
        + '. Publish again so Live Sync stays aligned.',
      )
      setFigmaPatchText('')
    } catch {
      setFigmaPatchMsg('Invalid JSON — paste the patch downloaded from the plugin.')
    }
  }

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

  // The sync URL is `/api/tokens?project=<slugify(projectName)>` — renaming
  // the project silently moves it to a NEW url. The plugin has no way to know
  // that; it keeps polling the old blob forever, reporting "Up to date" (it
  // genuinely is — nothing is publishing there any more) while every edit
  // here goes unpublished. Reported as "el plugin no se actualiza" with no
  // other symptom. `renameChangedUrl` flags exactly that so the banner below
  // only shows up when the URL actually moved, not on every rename.
  const [renameChangedUrl, setRenameChangedUrl] = useState(false)
  function commitName(next: string) {
    if (next.trim() === projectName) {
      setNameDraft(projectName)
      setNameError(null)
      return true
    }
    const oldSlug = slugify(projectName)
    const result = renameActiveSystem(next)
    if (result.ok) {
      setNameError(null)
      if (slugify(next.trim()) !== oldSlug) setRenameChangedUrl(true)
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
        {/* Title row: identity on the left, the plugin's own download cluster
            on the right. The name is a HEADING here, not an input — the
            labelled field below is the single control that changes it. It used
            to be a bare underline-on-hover input occupying the title slot,
            which read as a heading and hid the one thing on this page that
            moves the endpoint. */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <FigmaLogo size={32} />
            <div className="min-w-0">
              <h2 className="truncate text-title font-semibold leading-tight text-fg">{projectName || 'Untitled'}</h2>
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

        {/* The name, as a LABELLED field. "File name" is the vocabulary that
            fits this screen — one system, one Figma file — and the label is
            what makes the rename discoverable at all. It still commits on
            blur/Enter rather than per keystroke: the sync URL and the saved
            entry's id are both derived from this string. */}
        <label className={`flex flex-col gap-0.5 rounded-xl border bg-app px-3.5 py-2.5 transition-colors focus-within:border-accent-ui/70 ${nameError ? 'border-status-danger/70' : 'border-line'}`}>
          <span className="text-caption text-fg-faint">File name</span>
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
            aria-invalid={Boolean(nameError) || undefined}
            title="Renaming this changes the sync URL below"
            className="w-full min-w-0 bg-transparent text-strong font-medium leading-snug text-fg outline-none placeholder:text-fg-faint"
          />
        </label>
        {nameError && <p className="-mt-2 text-caption text-status-danger">{nameError}</p>}
      </div>

      {isDeployed ? (
        <div className="flex flex-col rounded-xl border border-line bg-surface/50">
          {/* Header band + a full-width divider, so the card reads as
              title-then-body instead of a stack of paragraphs that happen to
              start with a bold line. Nothing else sits on this row: the
              publish action moved down beside the URL it publishes. */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-line px-5 py-3">
            <p className="text-sm font-semibold text-fg">Your live sync URL</p>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-fg-faint leading-relaxed">
                In the plugin&apos;s <span className="text-fg-muted">Live Sync</span> tab, paste this endpoint, use <span className="text-fg-muted">Sync now</span> to publish your current tokens, then hit sync in Figma.
              </p>
              {/* The URL and the publish action share ONE row: Sync now
                  publishes to exactly this endpoint, so putting it in the
                  card's title row (where it used to sit) separated the verb
                  from its object and gave the header two jobs. Copy is an
                  icon rather than the word "Copy" — beside a labelled button
                  two words competed for the same glance. */}
              <div className="mt-1 flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-app px-3 py-2">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-fg-faint" aria-hidden>
                    <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M8 7.1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="8" cy="4.9" r=".8" fill="currentColor" />
                  </svg>
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-[#5AADFF]">{syncUrl}</code>
                  <button
                    onClick={copyUrl}
                    aria-label={copied ? 'Sync URL copied' : 'Copy sync URL'}
                    title={copied ? 'Copied' : 'Copy'}
                    className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                  >
                    {copied ? (
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-status-success" aria-hidden>
                        <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <CopyGlyph size={13} />
                    )}
                  </button>
                </div>
                {/* SECONDARY, not the filled `bg-fg` it used to be: the hero's
                    plugin Download is already the one filled action on this
                    screen, and two white pills 200px apart read as two
                    competing primaries. `min-w` so swapping "Sync now" →
                    "Publishing…" → "Retry sync" can't resize the URL field
                    mid-request. */}
                <button
                  onClick={onRequestSync}
                  disabled={publishState === 'publishing'}
                  className="inline-flex h-[38px] min-w-[112px] flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-elevated px-3 text-xs font-semibold text-fg transition-colors hover:border-line-strong hover:bg-surface disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
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
              {/* This is the whole "protocol": the URL is a function of the
                  FILE NAME above, full stop — never colours, themes, radius,
                  or anything else you edit. Editing a token republishes the
                  SAME URL's contents (see the publish status below); only
                  renaming the file changes which URL that is. Said explicitly
                  here so it reads as "by design" rather than as a
                  stale/broken URL the next time a colour edit doesn't move
                  it. It sits UNDER the URL now: a caveat about a value is
                  unreadable before the value it qualifies is on screen. */}
              <p className="text-caption text-fg-faint leading-relaxed">
                This URL only changes when you rename the file (the field above) — never when you edit colours, themes, or any other token.
              </p>
              {/* Renaming the project just moved the URL above — the plugin's
                  saved connection still points at the OLD one and will keep
                  reporting "up to date" (true, in the sense that nothing new is
                  landing there) forever unless re-pasted. This is the one
                  moment that's cheap to catch it — surface it here instead of
                  leaving it to be found as "my changes aren't syncing" later. */}
              {renameChangedUrl && (
                <div className="mt-1 flex items-start justify-between gap-3 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2">
                  <p className="text-caption text-status-warning leading-relaxed">
                    This renamed the file, so the URL above changed too. Paste the new one into the plugin&apos;s <span className="font-medium">Live Sync</span> tab — the old URL will stop receiving updates.
                  </p>
                  <button
                    onClick={() => setRenameChangedUrl(false)}
                    className="text-caption text-status-warning/80 hover:text-status-warning transition flex-shrink-0"
                  >
                    Got it
                  </button>
                </div>
              )}
              {publishState !== 'idle' && (
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {publishState === 'publishing' && (
                    <><span className="w-1.5 h-1.5 rounded-full bg-status-warning-solid animate-pulse" /><span className="text-fg-faint">Publishing your tokens…</span></>
                  )}
                  {publishState === 'done' && (
                    <><span className="text-status-success">✓</span><span className="text-fg-muted">Tokens published — the plugin picks them up on its next sync.</span></>
                  )}
                  {publishState === 'error' && (
                    <><span className="w-1.5 h-1.5 rounded-full bg-status-danger-solid" /><span className="text-fg-faint">{publishError || "Couldn't publish your tokens. Retry sync, or use the plugin's Import tab to paste them manually."}</span></>
                  )}
                </div>
              )}
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
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface/50 p-5">
          <p className="text-xs text-fg-faint leading-relaxed">
            Live sync runs against your deployed app. Deploy to a live URL first, then use <span className="text-fg-muted">Sync now</span> to publish your tokens to{' '}
            <code className="text-caption px-1 py-0.5 rounded bg-elevated text-fg-muted">/api/tokens</code>. For now, use the plugin&apos;s <span className="text-fg-muted">Import</span> tab with the exported <code className="text-caption px-1 py-0.5 rounded bg-elevated text-fg-muted">tokens.json</code>.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/50 p-5">
        <div>
          <p className="text-sm font-semibold text-fg">Apply edits from Figma</p>
          <p className="text-xs text-fg-faint leading-relaxed mt-1">
            In the plugin Overview, use <span className="text-fg-muted">Check local edits</span> → download the patch.
            Font family, and a family&apos;s anchor colour (tone 9 — Accent, or any status
            family), round-trip. New variables, renames, new components, and any other ramp
            tone (those are derived, not stored on their own) are rejected — those aren&apos;t
            part of the system settings.
          </p>
        </div>
        <textarea
          value={figmaPatchText}
          onChange={(e) => setFigmaPatchText(e.target.value)}
          rows={4}
          spellCheck={false}
          aria-label="Paste Figma edits patch JSON"
          placeholder='{"kind":"escala-figma-edits/v1",…}'
          className="w-full rounded-lg border border-line bg-app px-3 py-2 font-mono text-caption text-fg placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-accent-ui"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={applyFigmaPatch}
            disabled={!figmaPatchText.trim()}
            className="rounded-lg bg-fg px-3 py-1.5 text-xs font-semibold text-app disabled:opacity-40"
          >
            Apply patch
          </button>
          {figmaPatchMsg && <p className="text-caption text-fg-muted leading-relaxed">{figmaPatchMsg}</p>}
        </div>
      </div>

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
