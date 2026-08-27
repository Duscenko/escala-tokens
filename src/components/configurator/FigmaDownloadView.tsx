import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { FIGMA_PLUGIN_ZIP as PLUGIN_ZIP } from '../../lib/utils'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../lib/pluginVersion'
import { FigmaLogo, Step, BackToEditor } from './figmaShared'

interface FigmaDownloadViewProps {
  onClose?: () => void
  /** Cross-link to the sibling destination — the Sync hub's two rows both
   *  route here eventually, so each screen offers the way to the other one
   *  rather than dead-ending someone who landed on the wrong half first. */
  onOpenSync?: () => void
}

// ─── Download + install — a ONE-TIME procedure, unchanged from what
// `FigmaConnectView` (retired, see figmaShared.tsx) used to call Steps 1–2.
// No auto-publish here on purpose: downloading a file has no reason to hit
// /api/tokens — that only happens on FigmaSyncView, which IS the sync screen. ──
export default function FigmaDownloadView({ onClose, onOpenSync }: FigmaDownloadViewProps = {}) {
  const { projectName, selectedComponents, pluginBuildSeen, setPluginBuildSeen } = useDesignStore()
  const synced = ['Colors', 'Typography', 'Spacing', 'Radius', 'Icons', `${selectedComponents.length} components`]
  const updateAvailable = pluginBuildSeen != null && pluginBuildSeen !== PLUGIN_BUILD

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8 max-w-2xl p-8"
    >
      {onClose && <BackToEditor onClose={onClose} />}

      {/* ── Hero ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/50 p-6">
        <div className="flex items-center gap-4">
          <FigmaLogo size={44} />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-fg">
              Bring <span className="text-fg">{projectName}</span> to Figma
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
        {updateAvailable ? (
          <p className="text-xs leading-relaxed text-accent-ui bg-accent-ui/10 border border-accent-ui/20 rounded-lg px-3 py-2">
            A newer plugin build is available (<span className="font-semibold">v{PLUGIN_VERSION}</span>). Re-download below and re-import it in Figma to pick up the latest changes.
          </p>
        ) : (
          <p className="text-[11px] text-fg-faint">Current version: <span className="font-medium text-fg-muted">v{PLUGIN_VERSION}</span></p>
        )}
        <a
          href={PLUGIN_ZIP}
          download
          onClick={() => setPluginBuildSeen(PLUGIN_BUILD)}
          className="self-start mt-1 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-app bg-fg hover:opacity-90 shadow-sm transition-all"
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
          <li>Run it from <span className="text-fg-muted">Plugins → Development → Escala DS</span>.</li>
        </ol>
      </Step>

      {onOpenSync && (
        <button
          onClick={onOpenSync}
          className="self-start flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
        >
          Already installed? Go to Sync
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2.5 8 6l-3.5 3.5" /></svg>
        </button>
      )}
    </motion.div>
  )
}
