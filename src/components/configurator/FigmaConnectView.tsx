import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../../lib/tokenGenerator'

interface FigmaConnectViewProps {
  /** Back-to-editor affordance shown when rendered inside the shell. */
  onClose?: () => void
}

/** Static asset bundled in /public — refreshed via `npm run bundle:plugin`. */
const PLUGIN_ZIP = '/scalable-designs-figma-plugin.zip'

type PublishState = 'idle' | 'publishing' | 'done' | 'error'

// ─── Figma brand mark (full color) ────────────────────────────────────────────
function FigmaLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={(size * 38) / 57} height={size} viewBox="0 0 38 57" fill="none" aria-hidden>
      <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" fill="#0ACF83" />
      <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" fill="#A259FF" />
      <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" fill="#F24E1E" />
      <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" fill="#FF7262" />
      <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" fill="#1ABCFE" />
    </svg>
  )
}

// ─── Numbered step card ───────────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface/50 p-5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0088FF]/10 text-[#0088FF] text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {children}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FigmaConnectView({ onClose }: FigmaConnectViewProps = {}) {
  const { projectName, selectedComponents } = useDesignStore()

  const [isDeployed] = useState(() => {
    if (typeof window === 'undefined') return false
    const o = window.location.origin
    return !o.includes('localhost') && !o.includes('127.0.0.1')
  })
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const syncUrl = `${origin}/api/tokens`

  const [publishState, setPublishState] = useState<PublishState>('idle')
  const [copied, setCopied] = useState(false)

  // Auto-publish the current token set so an installed plugin picks it up on its
  // next sync — only when live (no /api/tokens function under `vite dev`).
  useEffect(() => {
    if (!isDeployed) return
    let cancelled = false
    setPublishState('publishing')
    fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generateTokenJSON()),
    })
      .then((r) => {
        if (cancelled) return
        setPublishState(r.ok ? 'done' : 'error')
        if (r.ok) useDesignStore.getState().setFigmaLastPublishAt(new Date().toISOString())
      })
      .catch(() => !cancelled && setPublishState('error'))
    return () => {
      cancelled = true
    }
  }, [isDeployed])

  function copyUrl() {
    navigator.clipboard.writeText(syncUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const synced = ['Colors', 'Typography', 'Spacing', 'Radius', 'Icons', `${selectedComponents.length} components`]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8 max-w-2xl"
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

      {/* ── Hero ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/50 p-6">
        <div className="flex items-center gap-4">
          <FigmaLogo size={44} />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-fg">
              Bring <span className="text-[#0088FF]">{projectName}</span> to Figma
            </h2>
            <p className="text-sm text-fg-faint">
              Install the sync plugin and your tokens land as Figma variables & styles.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {synced.map((s) => (
            <span key={s} className="text-[11px] px-2 py-1 rounded-full bg-elevated text-fg-muted border border-line">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Step 1 — Download ── */}
      <Step n={1} title="Download the plugin">
        <p className="text-xs text-fg-faint leading-relaxed">
          A small package with the plugin&apos;s <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">manifest.json</code> and build output.
        </p>
        <a
          href={PLUGIN_ZIP}
          download
          className="self-start mt-1 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0088FF] hover:bg-[#006ECC] shadow-sm shadow-[#0088FF]/30 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1.5v8M3.5 6.5 7 10l3.5-3.5" />
            <path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" />
          </svg>
          Download plugin (.zip)
        </a>
      </Step>

      {/* ── Step 2 — Import ── */}
      <Step n={2} title="Import it into Figma">
        <ol className="flex flex-col gap-1.5 text-xs text-fg-faint leading-relaxed list-decimal pl-4">
          <li>Unzip the download.</li>
          <li>In the Figma desktop app: <span className="text-fg-muted">Plugins → Development → Import plugin from manifest…</span></li>
          <li>Select the unzipped <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">manifest.json</code>.</li>
          <li>Run it from <span className="text-fg-muted">Plugins → Development → Scalable Designs Sync</span>.</li>
        </ol>
      </Step>

      {/* ── Step 3 — Live sync ── */}
      <Step n={3} title="Sync your tokens">
        {isDeployed ? (
          <>
            <p className="text-xs text-fg-faint leading-relaxed">
              In the plugin&apos;s <span className="text-fg-muted">Live Sync</span> tab, paste this endpoint and hit sync — your latest tokens are already published here.
            </p>
            <div className="flex items-center gap-2 bg-app border border-line rounded-lg px-3 py-2 mt-1">
              <code className="text-xs text-[#5AADFF] flex-1 truncate font-mono">{syncUrl}</code>
              <button onClick={copyUrl} className="text-[10px] text-fg-faint hover:text-fg transition flex-shrink-0">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {publishState === 'publishing' && (
                <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /><span className="text-fg-faint">Publishing your tokens…</span></>
              )}
              {publishState === 'done' && (
                <><span className="text-emerald-500">✓</span><span className="text-fg-muted">Tokens published — the plugin picks them up on its next sync.</span></>
              )}
              {publishState === 'error' && (
                <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-fg-faint">Couldn&apos;t publish automatically — open the plugin&apos;s Import tab to paste tokens manually.</span></>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-fg-faint leading-relaxed">
            Live sync runs against your deployed app. Deploy to a live URL first, then reopen this view to publish your tokens to{' '}
            <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">/api/tokens</code> automatically. For now, use the plugin&apos;s <span className="text-fg-muted">Import</span> tab with the exported <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">tokens.json</code>.
          </p>
        )}
      </Step>
    </motion.div>
  )
}
