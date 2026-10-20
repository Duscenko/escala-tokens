import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { useDesignStore } from '../../store/useDesignStore'
import { buildFigmaContext } from '../../lib/figmaContext'
import { showToast } from '../ui/Toast'
import { figmaSyncThemeKeys } from '../../lib/themeLibrary'
import { themeDisplayName } from '../../lib/themeSources'
import { brandThemesFromSyncModes, type FigmaViewport, type FigmaSyncMode } from '../../lib/figmaSyncModes'
import { BackToEditor } from './figmaShared'
import type { ThemeAppearance } from '../../lib/themeModes'
import FigmaControlsPanel from './FigmaControlsPanel'
interface FigmaSyncViewProps {
  onClose?: () => void
  embedded?: boolean
  /** Cross-link to the sibling destination — see FigmaDownloadView's own note. */
  onOpenDownload?: () => void
  /** Opens the GitHub surface (Backup row in the controls panel). */
  onOpenGithub?: () => void
  /** Theme the canvas is previewing — selecting a brand row also previews it. */
  previewTheme: string
  /** The appearance on screen. Free keeps this one; the other stays visible and locked. */
  previewAppearance?: ThemeAppearance
  onSelectTheme: (key: string) => void
  /** Figma file name written into the copied context's `project`.
   *  Defaults to the first theme. Does not rename the editor project. */
  fileName: string
  onFileNameChange: (name: string) => void
  /** Selected Figma columns — theme × Light/Dark, capped at `FIGMA_SYNC_MODE_CAP`. */
  syncModes: FigmaSyncMode[]
  /** `planCut` marks the Free narrowing: it changes what the context ships, not what the brand ships. */
  onSyncModesChange: (modes: FigmaSyncMode[], planCut?: boolean) => void
  /** Viewports that become Dimension Semantics' Figma modes (≥ 1). */
  viewports: FigmaViewport[]
  onViewportsChange: (viewports: FigmaViewport[]) => void
  /** Kept so existing callers still compile. This screen no longer shows a page URL. */
  section?: string
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

// ─── The agent context, as the page's one subject ───────────────────────────
// Hosted sync is off, so nothing is published from here. The page builds ONE
// message (`lib/figmaContext`): Markdown plus the Escala JSON scoped to what
// the controls panel has checked (file, brands × themes, viewports). The
// person pastes it into the plugin's context card. The controls live
// in `FigmaControlsPanel` (inspector); this surface only shows the stack.
export default function FigmaSyncView({
  onClose, embedded = false, onOpenGithub,
  previewTheme, onSelectTheme,
  fileName, onFileNameChange, syncModes, onSyncModesChange, viewports, onViewportsChange,
}: FigmaSyncViewProps) {
  const store = useDesignStore()
  const { themeOrder, themes, themeLabels } = store
  const { t } = useI18n()
  const syncThemes = useMemo(() => figmaSyncThemeKeys(themeOrder, themes), [themeOrder, themes])
  const cannotSync = syncThemes.length === 0
  const [copied, setCopied] = useState(false)
  const context = useMemo(
    () => (cannotSync || syncModes.length === 0
      ? null
      : buildFigmaContext({
        project: fileName || (syncThemes[0] ? themeDisplayName(syncThemes[0], themeLabels) : store.projectName),
        modes: syncModes,
        viewports,
        theme: previewTheme,
        brandName: (key) => themeDisplayName(key, themeLabels),
      })),
    // `store` changes on every edit, and the context has to follow the tokens.
    [cannotSync, syncModes, viewports, previewTheme, fileName, syncThemes, themeLabels, store],
  )
  useEffect(() => { setCopied(false) }, [context])

  const brandCount = Object.keys(brandThemesFromSyncModes(syncModes)).length
  const chips = [
    brandCount === 1 ? t('1 brand') : t('{count} brands', { count: String(brandCount) }),
    syncModes.length === 1 ? t('1 theme') : t('{count} themes', { count: String(syncModes.length) }),
    viewports.length === 1 ? t('1 viewport') : t('{count} viewports', { count: String(viewports.length) }),
    ...(context ? [formatBytes(context.bytes)] : []),
  ]

  async function copyContext() {
    if (!context) return
    try {
      await navigator.clipboard.writeText(context.text)
      setCopied(true)
      showToast(t('Copied. In Figma, open the Escala plugin and paste it in the context card.'))
    } catch {
      showToast(t('Couldn’t copy — try again'))
    }
  }

  const steps = [
    { title: t('Copy the context'), hint: t('Your system as one message, scoped by the panel on the right.') },
    // The plugin's own words: an empty file opens on "Set up your design
    // system", whose context card takes the paste; the button is "Import into
    // this file". A file that already holds a system pastes on its Import page.
    { title: t('Open the Escala plugin in Figma'), hint: t('A new file opens on “Set up your design system”.') },
    { title: t('Paste it in the context card'), hint: t('Press ⌘V, then Import into this file. A file that already has a system: paste it on Import.') },
  ]

  return (
    <div className="flex min-h-0 flex-1">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`flex min-w-0 flex-1 flex-col ${embedded ? 'gap-5 p-6' : 'gap-8 p-8'}`}
      >
        {onClose && <BackToEditor onClose={onClose} />}

        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-title font-semibold text-fg">{t('Agent context → Figma')}</h2>
          <p className="m-0 max-w-xl text-ui leading-relaxed text-fg-muted">
            {t('Your system as one message: the brands, themes and viewports checked on the right. Paste it into the Escala plugin, or into any AI agent.')}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1" aria-live="polite">
            {chips.map((c) => (
              <span key={c} className="rounded-full border border-line px-2.5 py-0.5 text-caption text-fg-muted">{c}</span>
            ))}
          </div>
        </div>

        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {steps.map((step, i) => (
            <li key={step.title} className="flex items-center gap-4 rounded-xl border border-line bg-surface/50 px-5 py-4">
              <span className="w-7 flex-shrink-0 font-mono text-heading tabular-nums text-fg-faint">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-strong font-semibold text-fg">{step.title}</p>
                <p className="m-0 text-caption leading-relaxed text-fg-faint">{step.hint}</p>
              </div>
              {i === 0 && (
                <button
                  type="button"
                  onClick={() => void copyContext()}
                  disabled={!context}
                  className={`inline-flex h-10 flex-shrink-0 items-center justify-center rounded-lg bg-fg px-5 text-ui font-semibold text-app shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
                >
                  {copied ? t('Copied') : t('Copy context')}
                </button>
              )}
            </li>
          ))}
        </ol>

        {cannotSync || syncModes.length === 0 ? (
          <p className="m-0 text-caption leading-relaxed text-status-warning">
            {cannotSync
              ? t('Add a System style to My brands first — there is nothing to copy yet.')
              : t('Check at least one brand and theme on the right.')}
          </p>
        ) : null}

        {context ? (
          <div className="flex min-h-0 flex-col gap-1.5">
            <p className="m-0 text-mini font-semibold uppercase tracking-[0.12em] text-fg-faint">{t('Preview')}</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-line bg-app p-4 font-mono text-caption leading-relaxed text-fg-muted">
              {context.text.length > 4000 ? `${context.text.slice(0, 4000)}\n…` : context.text}
            </pre>
          </div>
        ) : null}
      </motion.div>

      <FigmaControlsPanel
        previewTheme={previewTheme}
        onSelectTheme={onSelectTheme}
        fileName={fileName}
        onFileNameChange={onFileNameChange}
        syncModes={syncModes}
        onSyncModesChange={onSyncModesChange}
        viewports={viewports}
        onViewportsChange={onViewportsChange}
        onOpenGithub={onOpenGithub}
      />
    </div>
  )
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`
}
