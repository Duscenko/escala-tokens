import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { isLiveEnvironment, publishTokens, syncUrl as buildSyncUrl } from '../../lib/figmaSync'
import { FigmaLogo, BackToEditor, relativeTime } from './figmaShared'

interface FigmaSyncViewProps {
  onClose?: () => void
  /** Cross-link to the sibling destination — see FigmaDownloadView's own note. */
  onOpenDownload?: () => void
}

type PublishState = 'idle' | 'publishing' | 'done' | 'error'

// ─── Sync status — a RECURRING check, not a procedure. This is the one place
// that still auto-publishes on mount (moved verbatim from the retired
// `FigmaConnectView`, see figmaShared.tsx): opening THIS screen is what
// "check my sync status" means, so publishing the instant it opens is the
// correct default — FigmaDownloadView has no such effect any more, since
// downloading a file was never a reason to hit /api/tokens. ──────────────────
export default function FigmaSyncView({ onClose, onOpenDownload }: FigmaSyncViewProps = {}) {
  const { projectName, autoSyncFigma, setAutoSyncFigma, figmaLastPublishAt } = useDesignStore()

  const [isDeployed] = useState(isLiveEnvironment)
  // Per-system scoped endpoint (re-reads projectName each render so it stays current).
  const syncUrl = buildSyncUrl()

  const [publishState, setPublishState] = useState<PublishState>('idle')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isDeployed) return
    let cancelled = false
    setPublishState('publishing')
    publishTokens().then((ok) => {
      if (!cancelled) setPublishState(ok ? 'done' : 'error')
    })
    return () => {
      cancelled = true
    }
  }, [isDeployed])

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8 max-w-2xl p-8"
    >
      {onClose && <BackToEditor onClose={onClose} />}

      {/* ── Hero — status-first, not the install pitch FigmaDownloadView
          leads with: this screen exists for "is it connected / when did it
          last sync", so that's the first thing on it. ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/50 p-6">
        <div className="flex items-center gap-4">
          <FigmaLogo size={44} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-fg">
              <span className="text-fg">{projectName}</span> · Figma sync
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-fg-faint">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-500' : 'bg-line-strong'}`} aria-hidden />
              {connected ? <>Last published <span className="text-fg-muted">{relativeTime(figmaLastPublishAt)}</span></> : 'Not synced yet'}
            </p>
          </div>
        </div>
      </div>

      {isDeployed ? (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface/50 p-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-fg">Your live sync URL</p>
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
          </div>

          {/* ── Auto-sync toggle ── */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-fg">Keep Figma in sync</p>
              <p className="text-[11px] text-fg-faint leading-relaxed mt-0.5">
                Re-publish automatically after every edit.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={autoSyncFigma}
              aria-label="Toggle auto-sync to Figma"
              onClick={() => setAutoSyncFigma(!autoSyncFigma)}
              className={`relative flex-shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors ${
                autoSyncFigma ? 'bg-emerald-500' : 'bg-line-strong'
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
            Live sync runs against your deployed app. Deploy to a live URL first, then reopen this screen to publish your tokens to{' '}
            <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">/api/tokens</code> automatically. For now, use the plugin&apos;s <span className="text-fg-muted">Import</span> tab with the exported <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">tokens.json</code>.
          </p>
        </div>
      )}

      {onOpenDownload && (
        <button
          onClick={onOpenDownload}
          className="self-start flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
        >
          Haven&apos;t installed the plugin yet? Download it
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2.5 8 6l-3.5 3.5" /></svg>
        </button>
      )}
    </motion.div>
  )
}
