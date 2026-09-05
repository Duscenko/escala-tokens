import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { isLiveEnvironment, syncUrl as buildSyncUrl, type FigmaPublishState } from '../../lib/figmaSync'
import { BASE_TONE } from '../../lib/colorUtils'
import { myThemeKeys } from '../../lib/themeLibrary'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { BackToEditor, PluginInstallPromo } from './figmaShared'
import { AppearanceGlyph } from './colorControls'
import { CopyGlyph } from '../ui/icons'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../lib/pluginVersion'

interface FigmaSyncViewProps {
  onClose?: () => void
  embedded?: boolean
  /** Cross-link to the sibling destination — see FigmaDownloadView's own note. */
  onOpenDownload?: () => void
  /** Shared manual-publish feedback from Configurator, so this screen and the
   *  persistent header always report the same request. */
  publishState: FigmaPublishState
  /** Specific reason for the current 'error' state (a lost claim vs. a network
   *  hiccup) — same string the Sync pill's tooltip shows. Null outside 'error'. */
  publishError?: string | null
  onRequestSync: () => void
  /** Theme the next publish will ship — one radio, one payload. */
  previewTheme: string
  onSelectTheme: (key: string) => void
}

/** Theme radios, the sync URL field, and Sync now — one height, one radius. */
const SYNC_CONTROL = 'h-10 rounded-lg'
/** Chrome-page ink, not `--accent-ui`. Accent here tracks the previewed
 *  theme, so a gold Core row would paint the URL and the selected radio
 *  gold — this surface is chrome, not a specimen. */
const SYNC_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border-2 ${
        selected ? 'border-fg' : 'border-line-strong'
      }`}
      aria-hidden
    >
      {selected ? <span className="h-1.5 w-1.5 rounded-full bg-fg" /> : null}
    </span>
  )
}

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 7.1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r=".8" fill="currentColor" />
    </svg>
  )
}

/** Click-only, same interaction as the quick-settings `InfoHint`. The two
 *  tutorial lines used to sit under the URL and crowded the hero; they stay
 *  reachable from the info mark without occupying a row. */
function SyncUrlInfo({ deployed }: { deployed: boolean }) {
  const tooltipId = useId()
  const anchor = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const updatePosition = useCallback(() => {
    const rect = anchor.current?.getBoundingClientRect()
    if (!rect) return
    const width = 288
    setPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.left)),
      top: rect.bottom + 6,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (anchor.current?.contains(target) || panel.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, updatePosition])

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-label="About this sync URL"
        onClick={() => setOpen((next) => !next)}
        className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-fg/8 hover:text-fg ${SYNC_FOCUS}`}
      >
        <InfoIcon />
      </button>
      {open && position && createPortal(
        <div
          ref={panel}
          id={tooltipId}
          role="tooltip"
          className="fixed z-[70] w-72 rounded-lg border border-line-strong bg-app px-3 py-2.5 text-caption leading-relaxed text-fg-muted shadow-lg"
          style={position}
        >
          <p>Paste this in the plugin&apos;s Live Sync tab, then use Sync now to publish your tokens.</p>
          <p className="mt-2">This URL only changes when you rename the file — never when you edit colours or themes.</p>
          {!deployed && (
            <p className="mt-2">
              Live publish needs the deployed app — on localhost, copy this URL for production or use the plugin&apos;s Import tab with exported tokens.json.
            </p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Sync status and explicit publish ───────────────────────────────────────
// Opening this surface is intentionally read-only. Its parent owns the manual
// publish request and status so the top-nav Sync control and this screen always
// show the same in-flight feedback. Downloading the plugin never invokes
// /api/tokens.
export default function FigmaSyncView({
  onClose, embedded = false, onOpenDownload,
  publishState, publishError, onRequestSync, previewTheme, onSelectTheme,
}: FigmaSyncViewProps) {
  const store = useDesignStore()
  const {
    autoSyncFigma, setAutoSyncFigma, pluginBuildSeen,
    themeOrder, themes, themeLabels, themeKinds, themeSources,
  } = store
  const syncThemes = useMemo(() => {
    const own = myThemeKeys(themeOrder, themes)
    return own.length ? own : themeOrder.filter((key) => Boolean(themes[key]))
  }, [themeOrder, themes])
  const selectedTheme = syncThemes.includes(previewTheme) ? previewTheme : (syncThemes[0] ?? previewTheme)

  const [isDeployed] = useState(isLiveEnvironment)
  // Per-system scoped endpoint (re-reads projectName each render so it stays current).
  const syncUrl = buildSyncUrl()

  const [copied, setCopied] = useState(false)

  function copyUrl() {
    navigator.clipboard.writeText(syncUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pluginUpdateAvailable = pluginBuildSeen != null && pluginBuildSeen !== PLUGIN_BUILD

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex flex-col max-w-3xl ${embedded ? 'gap-5 p-6' : 'gap-8 p-8'}`}
    >
      {onClose && <BackToEditor onClose={onClose} />}

      {!embedded && onOpenDownload ? (
        <PluginInstallPromo
          version={PLUGIN_VERSION}
          updateAvailable={pluginUpdateAvailable}
          onOpenInstall={onOpenDownload}
        />
      ) : null}

      {/* Choose first, publish second. Identity (file name, GitHub) lives on
          the Connection rail — repeating it here was a second door to the
          same facts and hid the actual task. */}
      {syncThemes.length > 0 && (
        <div className="flex flex-col rounded-xl border border-line bg-surface/50">
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-line px-5 py-3">
            <p className="text-sm font-semibold text-fg">Theme to sync</p>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <p className="text-caption text-fg-faint leading-relaxed">
              Figma receives this theme only — its colours, type and spacing. Other themes stay in the library.
            </p>
            <div role="radiogroup" aria-label="Theme to sync" className="flex flex-col gap-1">
              {syncThemes.map((key) => {
                const selected = key === selectedTheme
                const ramp = themeBrandRamp(key, themeSources, themeKinds, store)
                const swatch = ramp?.[BASE_TONE] ?? store.primaryColor
                const name = themeDisplayName(key, themeLabels)
                const kind = (themeKinds[key] ?? 'light') as 'light' | 'dark'
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onSelectTheme(key)}
                    className={`flex min-w-0 items-center gap-2.5 border px-3 text-left transition-colors ${SYNC_CONTROL} ${SYNC_FOCUS} ${
                      selected
                        ? 'border-fg bg-fg/8 text-fg'
                        : 'border-line text-fg-muted hover:border-fg/40 hover:bg-fg/6 hover:text-fg'
                    }`}
                  >
                    <RadioMark selected={selected} />
                    <span
                      className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
                      style={{ background: swatch }}
                      aria-hidden
                    />
                    <span className={`min-w-0 flex-1 truncate text-body ${selected ? 'font-semibold text-fg' : 'font-medium'}`}>
                      {name}
                    </span>
                    <AppearanceGlyph kind={kind} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/50 p-5">
        <div className="flex items-stretch gap-2">
          <div className={`flex min-w-0 flex-1 items-center gap-2 border border-line bg-app px-3 ${SYNC_CONTROL}`}>
            <SyncUrlInfo deployed={isDeployed} />
            <code className="min-w-0 flex-1 truncate font-mono text-caption text-fg">{syncUrl}</code>
            <button
              type="button"
              onClick={copyUrl}
              aria-label={copied ? 'Sync URL copied' : 'Copy sync URL'}
              title={copied ? 'Copied' : 'Copy'}
              className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-fg/8 hover:text-fg ${SYNC_FOCUS}`}
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
          <button
            type="button"
            onClick={onRequestSync}
            disabled={publishState === 'publishing'}
            className={`inline-flex min-w-[112px] flex-shrink-0 items-center justify-center gap-2 bg-fg px-3 text-caption font-semibold text-app shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${SYNC_CONTROL} ${SYNC_FOCUS}`}
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
        {publishState !== 'idle' && (
          <div className="flex items-center gap-1.5 text-caption">
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
        {isDeployed && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-fg">Keep Figma in sync</p>
              <p className="mt-0.5 text-caption leading-relaxed text-fg-faint">
                Re-publish automatically after every edit.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSyncFigma}
              aria-label="Toggle auto-sync to Figma"
              onClick={() => setAutoSyncFigma(!autoSyncFigma)}
              className={`relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                autoSyncFigma ? 'bg-status-success-solid' : 'bg-line-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  autoSyncFigma ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
