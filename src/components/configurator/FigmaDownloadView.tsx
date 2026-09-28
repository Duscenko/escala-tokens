import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { FIGMA_PLUGIN_COMMUNITY } from '../../lib/utils'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../lib/pluginVersion'
import { FigmaLogo, Step, BackToEditor } from './figmaShared'

interface FigmaDownloadViewProps {
  onClose?: () => void
  /** Cross-link to the sibling destination — the Sync hub's two rows both
   *  route here eventually, so each screen offers the way to the other one
   *  rather than dead-ending someone who landed on the wrong half first. */
  onOpenSync?: () => void
}

// Install is the Figma Community listing. No auto-publish here: opening
// Community has no reason to hit /api/tokens. That only happens on FigmaSyncView.
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
            <span key={s} className="text-caption px-2 py-1 rounded-full bg-elevated text-fg-muted border border-line">
              {s}
            </span>
          ))}
        </div>
      </div>

      <Step n={1} title="Install from Figma Community">
        {updateAvailable ? (
          <p className="text-xs leading-relaxed text-accent-ui bg-accent-ui/10 border border-accent-ui/20 rounded-lg px-3 py-2">
            A newer plugin build is on Figma Community (<span className="font-semibold">v{PLUGIN_VERSION}</span>). Open the listing to install it.
          </p>
        ) : (
          <p className="text-caption text-fg-faint">Current version: <span className="font-medium text-fg-muted">v{PLUGIN_VERSION}</span></p>
        )}
        <a
          href={FIGMA_PLUGIN_COMMUNITY}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setPluginBuildSeen(PLUGIN_BUILD)}
          className="self-start mt-1 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-app bg-fg hover:opacity-90 shadow-sm transition-all"
        >
          Open in Figma Community
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4.5 2.5 8 6l-3.5 3.5" />
          </svg>
        </a>
      </Step>

      <Step n={2} title="Run it on a file">
        <p className="text-xs text-fg-faint leading-relaxed">
          In the Figma desktop app, open the file and run <span className="text-fg-muted">Plugins → Escala Tokens</span>.
        </p>
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
