// The Save & Share hub — the center column IS the export surface: a tabbed
// file preview (tokens.json · variables.css · README.md) with Copy / Download
// and an Export-all action, over the saved-systems registry. Identity, the
// Figma/GitHub connections and the summary chips live in the right panel
// (SaveSidePanel — "Current Design System").

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../../lib/tokenGenerator'
import { buildCSS, buildMarkdown } from '../../lib/exporters'
import { slugify } from '../../lib/utils'
import { syncUrl as buildSyncUrl } from '../../lib/figmaSync'
import { getIconLibrary } from '../../lib/iconLibraries'
import { COMPONENT_KEYS } from '../../lib/componentCatalogue'

interface SaveViewProps {
  /** Opens the Import-your-design-system modal (owned by the shell). */
  onImport: () => void
  /** Opens the guided New-design-system modal (owned by the shell). */
  onNewSystem: () => void
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
function GitHubGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

// ── Saved systems list: open, remove (local only), or start a new one ───────
function SavedSystemsList({ onAddNew, onImport }: { onAddNew: () => void; onImport: () => void }) {
  const { savedSystems, loadSystem, removeSavedSystem } = useDesignStore()
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm text-fg-muted uppercase tracking-wide">My design systems</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {savedSystems.map((sys) => (
          <div
            key={sys.id}
            role="button"
            tabIndex={0}
            onClick={() => confirmingDelete !== sys.id && loadSystem(sys.id)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && confirmingDelete !== sys.id) {
                e.preventDefault()
                loadSystem(sys.id)
              }
            }}
            className="relative rounded-xl bg-surface border border-line p-4 flex flex-col gap-2 text-left cursor-pointer hover:border-line-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-app"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmingDelete(sys.id) }}
              aria-label={`Remove ${sys.name}`}
              className="absolute top-3 right-3 p-1 rounded-md text-fg-faint hover:text-red-500 hover:bg-elevated transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
              </svg>
            </button>
            <div className="flex items-center gap-2 pr-6 min-w-0">
              <p className="text-sm font-semibold text-fg truncate">{sys.name}</p>
              {sys.source === 'imported' && (
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide bg-elevated text-fg-faint">Imported</span>
              )}
            </div>
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
            {confirmingDelete === sys.id && (
              <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
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
            )}
          </div>
        ))}

        {/* Create or import — one tile, two actions */}
        <div className="rounded-xl border-2 border-dashed border-line-strong bg-surface/50 p-4 flex flex-col items-center justify-center gap-3 text-fg-muted min-h-28">
          <span className="text-sm font-medium">Create or import a design system</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-muted hover:text-fg border border-line hover:border-line-strong transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </button>
            <button
              onClick={onImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-muted hover:text-fg border border-line hover:border-line-strong transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 15V3m0 0L7 8m5-5 5 5M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
              </svg>
              Import JSON
            </button>
          </div>
        </div>
      </div>
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

type FileTab = 'tokens' | 'css' | 'markdown'

// ── The portable-context card — tabbed file preview (tokens.json · variables.css
// · README.md) with Copy / Download / Export-all and the live endpoint footer.
// Shared by the Save & Share hub and the header Share modal. ──────────────────
export function FilePreviewCard() {
  const { projectName, primaryColor } = useDesignStore()

  const [activeTab, setActiveTab] = useState<FileTab>('tokens')
  const [copiedTab, setCopiedTab] = useState<FileTab | null>(null)
  const [justDownloaded, setJustDownloaded] = useState<FileTab | 'all' | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const isDeployed =
    typeof window !== 'undefined' &&
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1')
  const syncUrl = typeof window !== 'undefined' ? buildSyncUrl() : ''

  const slug = slugify(projectName) || 'scalable-designs'

  // tokens.json is the contract the Figma plugin imports — badge it so users
  // know exactly which file feeds the plugin.
  const FILES: { id: FileTab; label: string; badge?: string; filename: string; mime: string; content: () => string }[] = [
    { id: 'tokens',   label: 'tokens.json', badge: 'Figma plugin', filename: `${slug}-tokens.json`,   mime: 'application/json', content: () => JSON.stringify(generateTokenJSON(), null, 2) },
    { id: 'css',      label: 'variables.css',                      filename: `${slug}-variables.css`, mime: 'text/css',         content: () => buildCSS(useDesignStore.getState()) },
    { id: 'markdown', label: 'README.md',                          filename: `${slug}-README.md`,     mime: 'text/markdown',    content: () => buildMarkdown(useDesignStore.getState()) },
  ]
  const activeFile = FILES.find((f) => f.id === activeTab) ?? FILES[0]

  function copyActive() {
    navigator.clipboard.writeText(activeFile.content())
    setCopiedTab(activeFile.id)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  function downloadActive() {
    download(activeFile.content(), activeFile.filename, activeFile.mime)
    setJustDownloaded(activeFile.id)
    setTimeout(() => setJustDownloaded(null), 2500)
  }

  function downloadAll() {
    FILES.forEach((f, i) => setTimeout(() => download(f.content(), f.filename, f.mime), i * 200))
    setJustDownloaded('all')
    setTimeout(() => setJustDownloaded(null), 2500)
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(syncUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line pr-3">
        <div className="flex min-w-0 overflow-x-auto">
          {FILES.map((f) => {
            const active = f.id === activeTab
            return (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-mono whitespace-nowrap transition-all border-b-2 -mb-px ${
                  active ? 'text-fg font-semibold' : 'text-fg-faint border-transparent hover:text-fg-muted'
                }`}
                style={active ? { borderColor: primaryColor } : undefined}
              >
                {f.label}
                {f.badge && (
                  <span
                    className={`text-[9px] font-sans px-1.5 py-px rounded-full whitespace-nowrap ${
                      active ? 'text-white' : 'bg-elevated text-fg-faint border border-line'
                    }`}
                    style={active ? { backgroundColor: primaryColor } : undefined}
                  >
                    {f.badge}
                  </span>
                )}
              </button>
            )
          })}
          {/* Export all — an action styled as the last tab, like the design */}
          <button
            onClick={downloadAll}
            className="px-4 py-3 text-[13px] font-mono whitespace-nowrap text-fg-faint hover:text-fg-muted transition-colors border-b-2 border-transparent -mb-px"
          >
            {justDownloaded === 'all' ? '✓ Downloaded' : 'Export all files'}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={copyActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-fg text-app hover:opacity-90 transition-opacity"
          >
            {copiedTab === activeTab ? (
              <>✓ Copied</>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden><rect x="1" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8" stroke="currentColor" strokeWidth="1.2"/></svg>
                Copy
              </>
            )}
          </button>
          <button
            onClick={downloadActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-elevated text-fg-muted border border-line hover:text-fg hover:border-line-strong transition-colors"
          >
            {justDownloaded === activeTab ? (
              <>✓ Saved</>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden><path d="M5.5 1v6M3 5l2.5 2.5L8 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 8.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                Download
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-auto h-80 bg-surface"
        >
          <pre className="p-5 text-[11px] font-mono leading-relaxed text-fg-muted whitespace-pre">
            {activeFile.content()}
          </pre>
        </motion.div>
      </AnimatePresence>

      {/* Live endpoint — the URL any tool can read the tokens from */}
      <div className="px-5 py-3 border-t border-line bg-app/60">
        {isDeployed ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-faint flex-shrink-0">Live endpoint</span>
            <code className="text-xs text-[#5AADFF] flex-1 truncate font-mono">{syncUrl}</code>
            <button
              onClick={copyShareUrl}
              className="text-[11px] font-medium text-fg-muted hover:text-fg transition flex-shrink-0"
            >
              {copiedUrl ? '✓ Copied' : 'Copy'}
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
  )
}

export default function SaveView({ onImport, onNewSystem }: SaveViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-9 max-w-6xl"
    >
      {/* ── The portable context — tabbed file preview with Copy / Download ── */}
      <FilePreviewCard />

      {/* ── My design systems: open a saved one, create or import ── */}
      <SavedSystemsList onAddNew={onNewSystem} onImport={onImport} />
    </motion.div>
  )
}

// ── Save's right panel — "Current Design System": identity, connections and
// the summary chips, mounted in the shell's aside (same chrome/divider as
// Components Preview and Quick edit). ────────────────────────────────────────
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
    projectName, setProjectName,
    projectDescription, setProjectDescription,
    savedSystems, saveCurrentSystem,
    primaryColor, themeOrder, selectedComponents, iconLibrary,
    figmaLastPublishAt, githubRepo, githubLastPushAt,
  } = useDesignStore()

  const [justSaved, setJustSaved] = useState(false)

  // Reflect the matching registry entry (same id the store's saveCurrentSystem builds).
  const savedId = githubRepo ?? `local:${slugify(projectName) || 'design-system'}`
  const savedEntry = savedSystems.find((s) => s.id === savedId)

  function handleSave() {
    saveCurrentSystem()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2200)
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      <header className="flex items-center gap-2 px-5 h-[60px] border-b border-line/60 flex-shrink-0">
        <h2 className="text-sm font-semibold text-fg">Current Design System</h2>
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Collapse panel"
            title="Collapse panel"
            className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
            </svg>
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Identity — what the system saves, exports and syncs under */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ds-name" className="text-xs text-fg-muted">
            Design system name
          </label>
          <input
            id="ds-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Acme Design System"
            className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ds-description" className="text-xs text-fg-muted">
            Description
          </label>
          <textarea
            id="ds-description"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="What is this design system for? Who uses it?"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-fg outline-none resize-none transition-colors placeholder:text-fg-faint focus:border-line-strong"
          />
          <p className="text-xs text-fg-faint">Shown in your README.</p>
        </div>

        {/* Connections — two solid pills, status underneath */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={onOpenFigma}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-fg text-app hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Bring to Figma
            </button>
            <button
              onClick={onOpenGithub}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-fg text-app hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <GitHubGlyph size={11} />
              {githubRepo ? 'Push to GitHub' : 'Connect with GitHub'}
            </button>
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-fg-faint">
            <span className="flex items-center gap-1.5 min-w-0">
              <StatusDot ok={!!figmaLastPublishAt} />
              <span className="truncate">
                {figmaLastPublishAt ? `Figma — published ${timeAgo(figmaLastPublishAt)}` : 'Figma — not published yet'}
              </span>
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <StatusDot ok={!!githubRepo} />
              <span className="truncate">
                {githubRepo
                  ? `${githubRepo}${githubLastPushAt ? ` · pushed ${timeAgo(githubLastPushAt)}` : ''}`
                  : 'GitHub — not connected'}
              </span>
            </span>
          </div>
        </div>

        {/* System overview */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryChip label="Accent" value={primaryColor} swatch={primaryColor} />
          <SummaryChip label="Themes" value={`${themeOrder.length} (${themeOrder.join(', ')})`} />
          <SummaryChip label="Components" value={`${selectedComponents.length} of ${COMPONENT_KEYS.length}`} />
          <SummaryChip label="Icons" value={getIconLibrary(iconLibrary)?.label ?? iconLibrary} />
        </div>

        {/* Save to the local registry */}
        <div className="flex flex-col gap-1.5 pt-4 border-t border-line/60 mt-auto">
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-app"
            style={{ backgroundColor: justSaved ? '#10b981' : primaryColor, ['--tw-ring-color' as string]: primaryColor }}
          >
            {justSaved ? '✓ Saved' : savedEntry ? 'Save changes' : 'Save design system'}
          </motion.button>
          <span className="text-xs text-fg-faint text-center">
            {justSaved
              ? 'Saved to your systems.'
              : savedEntry
                ? `Last saved ${timeAgo(savedEntry.savedAt)}.`
                : 'Not saved yet.'}
          </span>
        </div>
      </div>
    </div>
  )
}
