import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../../lib/tokenGenerator'
import { buildCSS, buildMarkdown } from '../../lib/exporters'
import { syncUrl as buildSyncUrl } from '../../lib/figmaSync'

type Tab = 'tokens' | 'css' | 'markdown'

interface ExportViewProps {
  /** Which file tab opens first — "Get code" → tokens, "Get MD" → markdown. */
  initialTab?: Tab
  /** Optional back-to-editor affordance shown when rendered inside the shell. */
  onClose?: () => void
}

// ─── Download helpers ────────────────────────────────────────────────────────

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Summary pill ────────────────────────────────────────────────────────────

function Pill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-surface border border-line min-w-0">
      <span className="text-mini text-fg-faint uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        {color && (
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        )}
        <span className="text-sm font-medium text-fg truncate">{value}</span>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ExportView({ initialTab = 'tokens', onClose }: ExportViewProps = {}) {
  const { projectName, primaryColor, selectedComponents, setProjectName } = useDesignStore()
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [copiedTab, setCopiedTab] = useState<Tab | null>(null)
  const [justDownloaded, setJustDownloaded] = useState<string | null>(null)

  const [isDeployed, setIsDeployed] = useState(false)
  useEffect(() => {
    const origin = window.location.origin
    setIsDeployed(!origin.includes('localhost') && !origin.includes('127.0.0.1'))
  }, [])

  const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'scalable-designs'

  const tokenJSON = JSON.stringify(generateTokenJSON(), null, 2)
  const cssVars   = buildCSS(useDesignStore.getState())
  const markdown  = buildMarkdown(useDesignStore.getState())

  // tokens.json is the contract the Figma plugin imports — badge it so users
  // know exactly which file feeds the plugin.
  const TABS: { id: Tab; label: string; badge?: string }[] = [
    { id: 'tokens',   label: 'tokens.json', badge: 'Figma plugin' },
    { id: 'css',      label: 'variables.css' },
    { id: 'markdown', label: 'README.md' },
  ]

  const content: Record<Tab, string> = { tokens: tokenJSON, css: cssVars, markdown }

  async function copyTab(tab: Tab) {
    await navigator.clipboard.writeText(content[tab])
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  function downloadAll() {
    download(tokenJSON, `${slug}-tokens.json`, 'application/json')
    setTimeout(() => download(cssVars, `${slug}-variables.css`, 'text/css'), 200)
    setTimeout(() => download(markdown, `${slug}-README.md`, 'text/markdown'), 400)
    setJustDownloaded('all')
    setTimeout(() => setJustDownloaded(null), 2500)
  }

  function downloadOne(tab: Tab) {
    const ext: Record<Tab, string> = { tokens: 'tokens.json', css: 'variables.css', markdown: 'README.md' }
    const mime: Record<Tab, string> = { tokens: 'application/json', css: 'text/css', markdown: 'text/markdown' }
    download(content[tab], `${slug}-${ext[tab]}`, mime[tab])
    setJustDownloaded(tab)
    setTimeout(() => setJustDownloaded(null), 2500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6 px-6 lg:px-8 py-6 max-w-4xl"
    >
      {onClose && (
        <button
          onClick={onClose}
          className="self-start flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 2.5 4 6l3.5 3.5" />
          </svg>
          Back to editor
        </button>
      )}

      {/* ── Summary ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Editable project name (used as the README title / token namespace) */}
        <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-surface border border-line min-w-0">
          <span className="text-mini text-fg-faint uppercase tracking-wider">Project</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Escala"
            aria-label="Project name"
            className="text-sm font-medium text-fg bg-transparent outline-none border-b border-transparent focus:border-line-strong w-full"
          />
        </div>
        <Pill label="Primary"   value={primaryColor}       color={primaryColor} />
        <Pill label="Components" value={`${selectedComponents.length} selected`} />
      </div>

      {/* ── File tabs ── */}
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between border-b border-line">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono transition-all border-b-2 ${
                  activeTab === t.id
                    ? 'text-fg border-fg'
                    : 'text-fg-faint border-transparent hover:text-fg-muted'
                }`}
              >
                {t.label}
                {t.badge && (
                  <span className="text-micro font-sans px-1.5 py-px rounded-full bg-elevated text-fg-faint border border-line whitespace-nowrap">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pr-1">
            <button
              onClick={() => copyTab(activeTab)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-elevated text-fg-muted hover:bg-line-strong transition border border-line-strong"
            >
              {copiedTab === activeTab ? (
                <><span className="text-status-success">✓</span> Copied</>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8" stroke="currentColor" strokeWidth="1.2"/></svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={() => downloadOne(activeTab)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-elevated text-fg-muted hover:bg-line-strong transition border border-line-strong"
            >
              {justDownloaded === activeTab ? (
                <><span className="text-status-success">✓</span> Saved</>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v6M3 5l2.5 2.5L8 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 8.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
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
            className="bg-app border border-t-0 border-line rounded-b-xl overflow-auto max-h-72"
          >
            <pre className="p-4 text-caption font-mono leading-relaxed text-fg-muted whitespace-pre">
              {content[activeTab]}
            </pre>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Download all CTA ── */}
      <div className="flex flex-col gap-3 items-center rounded-xl border border-line bg-surface/50 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor + '22', border: `1px solid ${primaryColor}44` }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v10M5.5 8l3.5 4 3.5-4" stroke={primaryColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 13.5v1.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5" stroke={primaryColor} strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">Export all files</p>
            <p className="text-xs text-fg-faint">tokens.json · variables.css · README.md</p>
          </div>
        </div>

        <motion.button
          onClick={downloadAll}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            backgroundColor: justDownloaded === 'all' ? '#10b981' : primaryColor,
            color: '#fff',
            boxShadow: `0 4px 20px ${primaryColor}44`,
          }}
        >
          {justDownloaded === 'all' ? '✓ Downloaded!' : `Download ${slug}-tokens`}
        </motion.button>
      </div>

      {/* ── What's next ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: '⌗',
            title: 'Use in code',
            desc: 'Import variables.css and reference tokens via CSS custom properties in any framework.',
          },
          {
            icon: '⬡',
            title: 'Figma sync',
            desc: isDeployed
              ? 'Publish tokens to /api/tokens so your Figma plugin can poll and sync them automatically.'
              : 'Deploy to a live URL first, then use the publish endpoint to sync with Figma plugins.',
          },
          {
            icon: '↻',
            title: 'Iterate',
            desc: 'Your configuration is saved automatically. Come back any time to refine your tokens.',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl bg-surface border border-line p-4 flex flex-col gap-2">
            <span className="text-xl">{item.icon}</span>
            <p className="text-sm font-medium text-fg">{item.title}</p>
            <p className="text-xs text-fg-faint leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Publish endpoint — only shown when deployed ── */}
      {isDeployed && (
        <div className="rounded-xl border border-line bg-surface/50 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-status-success-solid animate-pulse" />
            <p className="text-sm font-semibold text-fg">Live publish endpoint</p>
          </div>
          <p className="text-xs text-fg-faint">
            POST to <code className="text-[#5AADFF] text-caption px-1 py-0.5 rounded bg-elevated">/api/tokens</code> to push your current token set. This system has its own scoped URL — paste it into your Figma plugin's live sync.
          </p>
          <div className="flex items-center gap-2 bg-app border border-line rounded-lg px-3 py-2">
            <code className="text-xs text-[#5AADFF] flex-1 truncate font-mono">
              {buildSyncUrl()}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(buildSyncUrl())}
              className="text-mini text-fg-faint hover:text-fg transition flex-shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
