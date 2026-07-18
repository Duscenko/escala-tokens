// The Save hub — SHARE-first: the system's reason to exist is leaving as
// portable context (README.md / variables.css / tokens.json you can paste into
// Stitch, Claude or Codex), so the Share module owns the center column with
// per-file Copy + Download. The right rail carries the overview (summary
// chips) and the Figma/GitHub connections. Identity, save-to-registry and the
// saved-systems list follow below Share in the center.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../../lib/tokenGenerator'
import { buildCSS, buildMarkdown } from '../../lib/exporters'
import { slugify } from '../../lib/utils'
import { syncUrl as buildSyncUrl } from '../../lib/figmaSync'
import { getIconLibrary } from '../../lib/iconLibraries'
import { COMPONENT_KEYS } from '../../lib/componentCatalogue'

interface SaveViewProps {
  /** Opens the Save to GitHub view (export mode lives in the shell). */
  onOpenGithub: () => void
  /** Opens the code-export view (tokens.json · CSS · README). */
  onOpenExport: () => void
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-line-strong'}`}
      aria-hidden
    />
  )
}

function SummaryChip({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-surface border border-line min-w-0">
      <span className="text-[10px] text-fg-faint uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        {swatch && <span className="w-3 h-3 rounded-full ring-1 ring-black/10 flex-shrink-0" style={{ backgroundColor: swatch }} />}
        <span className="text-sm font-medium text-fg truncate">{value}</span>
      </div>
    </div>
  )
}

// GitHub brand mark — monochrome, tracks currentColor.
function GitHubGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

// ── Saved systems list: open, remove (local only), or start a new one ───────
function SavedSystemsList({ onAddNew }: { onAddNew: () => void }) {
  const { savedSystems, loadSystem, removeSavedSystem } = useDesignStore()
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <h3 className="text-sm text-fg-muted uppercase tracking-wide">My design systems</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {savedSystems.map((sys) => (
          <div key={sys.id} className="rounded-xl bg-surface border border-line p-4 flex flex-col gap-2">
            <p className="text-sm font-semibold text-fg truncate">{sys.name}</p>
            {sys.description && (
              <p className="text-xs text-fg-faint leading-relaxed line-clamp-2">{sys.description}</p>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
              {sys.repo ? (
                <>
                  <GitHubGlyph />
                  <span className="font-mono truncate">{sys.repo}</span>
                </>
              ) : (
                <span className="truncate">Saved in this browser</span>
              )}
              <span className="ml-auto flex-shrink-0">saved {timeAgo(sys.savedAt)}</span>
            </div>
            {confirmingDelete === sys.id ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-fg-faint flex-1">Remove from this browser? The repository is untouched.</span>
                <button
                  onClick={() => { removeSavedSystem(sys.id); setConfirmingDelete(null) }}
                  className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
                <button
                  onClick={() => setConfirmingDelete(null)}
                  className="text-[11px] text-fg-faint hover:text-fg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => loadSystem(sys.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-fg text-app hover:opacity-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-app"
                >
                  Open
                </button>
                <button
                  onClick={() => setConfirmingDelete(sys.id)}
                  className="text-[11px] text-fg-faint hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add new */}
        <button
          onClick={onAddNew}
          className="rounded-xl border-2 border-dashed border-line-strong bg-surface/50 p-4 flex flex-col items-center justify-center gap-2 text-fg-muted hover:border-fg-faint hover:text-fg transition-colors min-h-28"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm font-medium">New Design System</span>
        </button>
      </div>
    </div>
  )
}

// ── Strip: save / switch affordances for the active system ──────────────────
function SystemsStrip({ onOpenGithub }: { onOpenGithub: () => void }) {
  const { savedSystems, githubRepo, startNewSystem } = useDesignStore()
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  return (
    <div className="rounded-xl bg-surface border border-line px-4 py-2.5 flex items-center gap-2 text-xs">
      {confirmingLeave ? (
        <>
          <span className="text-fg-muted flex-1 min-w-0">
            {githubRepo
              ? `Leave this system? Anything changed since your last push to ${githubRepo} will be lost.`
              : 'Leave this system? It was never saved to GitHub and will be lost.'}
          </span>
          <button
            onClick={() => { setConfirmingLeave(false); startNewSystem() }}
            className="font-medium text-red-500 hover:text-red-600 transition-colors flex-shrink-0"
          >
            Leave
          </button>
          <button
            onClick={() => setConfirmingLeave(false)}
            className="text-fg-faint hover:text-fg transition-colors flex-shrink-0"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-fg-muted flex-1 min-w-0 truncate">
            My design systems{savedSystems.length > 0 && <span className="text-fg-faint"> · {savedSystems.length} saved</span>}
          </span>
          <button
            onClick={onOpenGithub}
            className="font-medium text-fg hover:opacity-70 transition-colors flex-shrink-0"
          >
            {githubRepo ? 'Push to save' : 'Save to GitHub'}
          </button>
          <span className="text-line-strong">·</span>
          <button
            onClick={() => setConfirmingLeave(true)}
            className="text-fg-muted hover:text-fg transition-colors flex-shrink-0"
          >
            Switch / Add new
          </button>
        </>
      )}
    </div>
  )
}

// ── Download helper (all three export files) ─────────────────────────────────
function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function SaveView({ onOpenGithub, onOpenExport }: SaveViewProps) {
  const {
    projectName, setProjectName,
    projectDescription, setProjectDescription,
    savedSystems, startNewSystem, saveCurrentSystem,
    primaryColor, githubRepo,
  } = useDesignStore()

  const [copied, setCopied] = useState(false)
  const [copiedFile, setCopiedFile] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [justDownloaded, setJustDownloaded] = useState(false)
  const isDeployed =
    typeof window !== 'undefined' &&
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1')
  const syncUrl = typeof window !== 'undefined' ? buildSyncUrl() : ''

  // Reflect the matching registry entry (same id the store's saveCurrentSystem builds).
  const savedId = githubRepo ?? `local:${slugify(projectName) || 'design-system'}`
  const savedEntry = savedSystems.find((s) => s.id === savedId)

  function handleSave() {
    saveCurrentSystem()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2200)
  }

  function downloadAll() {
    const slug = slugify(projectName) || 'scalable-designs'
    const state = useDesignStore.getState()
    download(JSON.stringify(generateTokenJSON(), null, 2), `${slug}-tokens.json`, 'application/json')
    setTimeout(() => download(buildCSS(state), `${slug}-variables.css`, 'text/css'), 200)
    setTimeout(() => download(buildMarkdown(state), `${slug}-README.md`, 'text/markdown'), 400)
    setJustDownloaded(true)
    setTimeout(() => setJustDownloaded(false), 2500)
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(syncUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Share files — the portable context, one Copy/Download per file ──
  const slug = slugify(projectName) || 'scalable-designs'
  const shareFiles: { name: string; hint: string; content: () => string; filename: string; mime: string }[] = [
    {
      name: 'README.md',
      hint: 'The didactic doc — paste it into Claude, Stitch or Codex as design context.',
      content: () => buildMarkdown(useDesignStore.getState()),
      filename: `${slug}-README.md`,
      mime: 'text/markdown',
    },
    {
      name: 'variables.css',
      hint: 'Every token as CSS custom properties — drops straight into a codebase.',
      content: () => buildCSS(useDesignStore.getState()),
      filename: `${slug}-variables.css`,
      mime: 'text/css',
    },
    {
      name: 'tokens.json',
      hint: 'The machine contract — the Figma plugin and the sync API read this.',
      content: () => JSON.stringify(generateTokenJSON(), null, 2),
      filename: `${slug}-tokens.json`,
      mime: 'application/json',
    },
  ]

  function copyFile(name: string, content: () => string) {
    navigator.clipboard.writeText(content())
    setCopiedFile(name)
    setTimeout(() => setCopiedFile(null), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8 max-w-3xl"
    >
      {/* ── Share — the hub's hero: the system as portable AI context ── */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="p-6 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2 min-w-0">
              <h3 className="text-lg font-semibold text-fg">Share your design system</h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                Your system as portable context — copy the README or the CSS into{' '}
                <span className="font-medium text-fg">Stitch</span>,{' '}
                <span className="font-medium text-fg">Claude</span> or{' '}
                <span className="font-medium text-fg">Codex</span> and every token travels
                with your prompt.
              </p>
            </div>
            <button
              onClick={onOpenExport}
              className="flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold bg-fg text-app hover:opacity-90 transition-colors"
            >
              Open export view
            </button>
          </div>
        </div>

        {/* Per-file rows — Copy is the primary action (paste into a prompt) */}
        <div className="border-t border-line">
          {shareFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-3 px-6 py-3.5 border-b border-line/60 last:border-b-0">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <code className="text-[13px] font-mono text-fg">{f.name}</code>
                <span className="text-xs text-fg-faint leading-snug">{f.hint}</span>
              </div>
              <button
                onClick={() => copyFile(f.name, f.content)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  copiedFile === f.name
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-fg text-app hover:opacity-90'
                }`}
              >
                {copiedFile === f.name ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={() => download(f.content(), f.filename, f.mime)}
                title={`Download ${f.name}`}
                aria-label={`Download ${f.name}`}
                className="flex-shrink-0 p-2 rounded-lg text-fg-muted hover:text-fg border border-line hover:border-line-strong transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path d="M9 2v10M5.5 8l3.5 4 3.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 13.5v1.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Live endpoint — the URL any tool can read the tokens from */}
        <div className="px-6 py-3.5 border-t border-line bg-app/60">
          {isDeployed ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-faint flex-shrink-0">Live endpoint</span>
              <code className="text-xs text-[#5AADFF] flex-1 truncate font-mono">{syncUrl}</code>
              <button
                onClick={copyShareUrl}
                className="text-[11px] font-medium text-fg-muted hover:text-fg transition flex-shrink-0"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-fg-faint leading-relaxed">
              Deploy to a live URL and any tool can read your tokens from{' '}
              <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">/api/tokens</code>.
            </p>
          )}
        </div>
      </div>

      {/* ── Identity: name + description ──
          Both are real, bordered fields with their own label: unlabelled
          transparent text read as page headings, so the name — which is what
          the system saves, exports and syncs under — didn't look editable. */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ds-name" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Design system name
          </label>
          <input
            id="ds-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Acme Design System"
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-xl font-semibold text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
          />
          <p className="text-xs text-fg-faint">
            Saves as <code className="font-mono text-fg-muted">{slugify(projectName) || 'scalable-designs'}</code> — names your files, the Figma collection and the sync endpoint.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ds-description" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Description
          </label>
          <textarea
            id="ds-description"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="What is this design system for? Who uses it?"
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-fg outline-none resize-none transition-colors placeholder:text-fg-faint focus:border-line-strong"
          />
          <p className="text-xs text-fg-faint">Shown in your README.</p>
        </div>
      </div>

      {/* ── Save actions: persist to the registry + take the files ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-app"
          style={{ backgroundColor: justSaved ? '#10b981' : primaryColor, ['--tw-ring-color' as string]: primaryColor }}
        >
          {justSaved ? '✓ Saved' : savedEntry ? 'Save changes' : 'Save design system'}
        </motion.button>
        <motion.button
          onClick={downloadAll}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
          style={{ color: justDownloaded ? '#10b981' : primaryColor, borderColor: (justDownloaded ? '#10b981' : primaryColor) + '55' }}
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M9 2v10M5.5 8l3.5 4 3.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 13.5v1.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {justDownloaded ? 'Downloaded' : 'Download files'}
        </motion.button>
        <span className="text-xs text-fg-faint">
          {justSaved
            ? 'Saved to your systems.'
            : savedEntry
              ? `Last saved ${timeAgo(savedEntry.savedAt)}.`
              : 'Not saved yet.'}
        </span>
      </div>

      {/* ── My design systems: save / switch + open a saved one ── */}
      <SystemsStrip onOpenGithub={onOpenGithub} />
      {savedSystems.length > 0 && <SavedSystemsList onAddNew={startNewSystem} />}
    </motion.div>
  )
}

// ── Save's right panel — mounted in the shell's aside (same chrome/divider as
// Components Preview and Quick edit): the system overview + connections. ─────
export function SaveSidePanel({
  onOpenFigma,
  onOpenGithub,
  onCollapse,
}: {
  onOpenFigma: () => void
  onOpenGithub: () => void
  onCollapse?: () => void
}) {
  const {
    primaryColor, themeOrder, selectedComponents, iconLibrary,
    figmaLastPublishAt, githubRepo, githubLastPushAt,
  } = useDesignStore()
  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      <header className="flex items-center gap-2 px-5 h-[60px] border-b border-line/60 flex-shrink-0">
        <h2 className="text-sm font-semibold text-fg">Overview</h2>
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Collapse overview"
            title="Collapse overview"
            className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
            </svg>
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-6">
        {/* System overview */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryChip label="Accent" value={primaryColor} swatch={primaryColor} />
          <SummaryChip label="Themes" value={`${themeOrder.length} (${themeOrder.join(', ')})`} />
          <SummaryChip label="Components" value={`${selectedComponents.length} of ${COMPONENT_KEYS.length}`} />
          <SummaryChip label="Icons" value={getIconLibrary(iconLibrary)?.label ?? iconLibrary} />
        </div>

        {/* Connections */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs text-fg-muted uppercase tracking-wide">Connections</h3>
          {/* Figma */}
          <div className="rounded-xl bg-surface border border-line p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <StatusDot ok={!!figmaLastPublishAt} />
              <p className="text-sm font-semibold text-fg">Figma</p>
              <span className="text-[11px] text-fg-faint ml-auto truncate">
                {figmaLastPublishAt ? `Published ${timeAgo(figmaLastPublishAt)}` : 'Not published yet'}
              </span>
            </div>
            <p className="text-xs text-fg-faint leading-relaxed">
              Sync your tokens into Figma Variables with the companion plugin.
            </p>
            <button
              onClick={onOpenFigma}
              className="self-start px-3 py-1.5 rounded-lg text-xs font-medium bg-fg text-app hover:opacity-90 transition-colors"
            >
              Bring to Figma
            </button>
          </div>

          {/* GitHub */}
          <div className="rounded-xl bg-surface border border-line p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <StatusDot ok={!!githubRepo} />
              <p className="text-sm font-semibold text-fg">GitHub</p>
              <span className="text-[11px] text-fg-faint ml-auto truncate">
                {githubRepo
                  ? `${githubRepo}${githubLastPushAt ? ` · pushed ${timeAgo(githubLastPushAt)}` : ''}`
                  : 'Not connected'}
              </span>
            </div>
            <p className="text-xs text-fg-faint leading-relaxed">
              Version your design system in a repository — tokens, CSS and docs on every push.
            </p>
            <button
              onClick={onOpenGithub}
              className="self-start px-3 py-1.5 rounded-lg text-xs font-medium bg-fg text-app hover:opacity-90 transition-colors"
            >
              {githubRepo ? 'Manage connection' : 'Connect GitHub'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
