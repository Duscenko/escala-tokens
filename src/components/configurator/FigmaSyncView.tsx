import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { useDesignStore } from '../../store/useDesignStore'
import { buildFigmaContext } from '../../lib/figmaContext'
import { showToast } from '../ui/Toast'
import { BASE_TONE } from '../../lib/colorUtils'
import { figmaSyncThemeKeys } from '../../lib/themeLibrary'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import {
  brandThemesFromSyncModes,
  FIGMA_SYNC_MODE_CAP,
  FIGMA_VIEWPORTS,
  FIGMA_VIEWPORT_LABEL,
  toggleFigmaViewport,
  type FigmaViewport,
  hasFigmaSyncMode,
  toggleFigmaSyncAppearance,
  toggleFigmaSyncTheme,
  type FigmaSyncMode,
} from '../../lib/figmaSyncModes'
import { brandThemesSummary, soleShippedAppearance } from '../../lib/brandThemes'
import { BackToEditor, PluginInstallPromo } from './figmaShared'
import { AppearanceGlyph } from './colorControls'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../lib/pluginVersion'
import { FREE_MAX_THEMES } from '../../lib/entitlement'
import { useEntitlement } from '../../lib/useEntitlement'
import { useFreeTier } from '../../lib/access'
import type { ThemeAppearance } from '../../lib/themeModes'
import { LicenceModal } from './LicenceModal'
import { UpgradeToProDialog } from './UpgradeToProNotice'

interface FigmaSyncViewProps {
  onClose?: () => void
  embedded?: boolean
  /** Cross-link to the sibling destination — see FigmaDownloadView's own note. */
  onOpenDownload?: () => void
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

const SYNC_CONTROL = 'h-10 rounded-lg'
/** Chrome-page ink, not `--accent-ui`. Accent here tracks the previewed
 *  theme, so a gold Core row would paint the URL and the selected radio
 *  gold — this surface is chrome, not a specimen. */
const SYNC_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`flex-shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-90' : ''}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function CheckMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded border-2 ${
        selected ? 'border-fg bg-fg text-app' : 'border-line-strong'
      }`}
      aria-hidden
    >
      {selected ? (
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

function EditIcon() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 flex-shrink-0 bg-current"
      style={{
        WebkitMask: "url('/icons/settings/edit.svg') center / contain no-repeat",
        mask: "url('/icons/settings/edit.svg') center / contain no-repeat",
      }}
    />
  )
}

// ─── File & modes, then the context the plugin imports ──────────────────────
// Hosted sync is off, so nothing is published from here. The page builds ONE
// message (`lib/figmaContext`): Markdown plus the Escala JSON scoped to the
// brands, themes and viewports checked below. The person copies it and pastes
// it into the plugin's Home → Agent Context. Nothing touches /api/tokens.
export default function FigmaSyncView({
  onClose, embedded = false, onOpenDownload,
  previewTheme, onSelectTheme,
  fileName, onFileNameChange, syncModes, onSyncModesChange, viewports, onViewportsChange,
}: FigmaSyncViewProps) {
  const store = useDesignStore()
  const {
    pluginBuildSeen,
    themeOrder, themes, themeLabels, themeKinds, themeSources,
  } = store
  const syncThemes = useMemo(
    () => figmaSyncThemeKeys(themeOrder, themes),
    [themeOrder, themes],
  )
  const cannotSync = syncThemes.length === 0
  const { t, locale } = useI18n()
  const free = useFreeTier()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [licenceOpen, setLicenceOpen] = useState(false)
  // Free (the /pricing tier, `freeFigmaScope`): up to FREE_MAX_THEMES brands,
  // Light and Dark, every viewport. A selection saved while Pro was on is
  // narrowed to that the moment the account is Free.
  useEffect(() => {
    if (!free) return
    const keep = new Set<string>()
    for (const mode of syncModes) {
      if (keep.size >= FREE_MAX_THEMES && !keep.has(mode.theme)) continue
      keep.add(mode.theme)
    }
    const nextModes = syncModes.filter((mode) => keep.has(mode.theme))
    if (nextModes.length !== syncModes.length) onSyncModesChange(nextModes, true)
  }, [free, syncModes, onSyncModesChange])
  const selectedBrands = useMemo(() => new Set(syncModes.map((mode) => mode.theme)), [syncModes])
  const entitlement = useEntitlement()
  // "3 brands · 4 themes: Acme Light + Dark · Kids Light · Partner Dark" —
  // what this publish carries, read off the selection itself so the sentence
  // and the checkboxes under it cannot disagree.
  const syncSummary = useMemo(() => {
    const byBrand = brandThemesFromSyncModes(syncModes)
    const brands = syncThemes.filter((key) => byBrand[key]?.length)
    const brandsPart = brands.length === 1 ? t('1 brand') : t('{count} brands', { count: String(brands.length) })
    const themesPart = syncModes.length === 1 ? t('1 theme') : t('{count} themes', { count: String(syncModes.length) })
    return {
      head: `${brandsPart} · ${themesPart}`,
      detail: brands
        .map((key) => `${themeDisplayName(key, themeLabels)} ${t(brandThemesSummary(byBrand[key]).replace(/ only$/, ''))}`)
        .join(' · '),
    }
  }, [syncModes, syncThemes, themeLabels, t])
  const fileHintId = useId()
  const fileNameRef = useRef<HTMLInputElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
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

  async function copyContext() {
    if (!context) return
    try {
      await navigator.clipboard.writeText(context.text)
      setCopied(true)
      showToast(t('Copied. In Figma, open the Escala plugin → Agent Context and paste it.'))
    } catch {
      showToast(t('Couldn’t copy — try again'))
    }
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
        />
      ) : null}

      {/* Modes first, then File name + the agent context the plugin imports.
          Scaffold light/dark are not My brands — an empty library shows an
          empty list, never a default-blue "Dark" row. */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface/50">
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-line px-5 py-3">
            <p className="text-sm font-semibold text-fg">{t('File & modes')}</p>
            {entitlement.licence.status === 'valid' && (
              <span className="rounded-full bg-accent-solid px-1.5 py-0.5 text-nano font-semibold tracking-[0.1em] text-accent-ink">PRO</span>
            )}
            <button
              type="button"
              onClick={() => setLicenceOpen(true)}
              className={`ml-auto rounded-md px-1.5 py-0.5 text-caption text-fg-faint transition-colors hover:bg-fg/8 hover:text-fg ${SYNC_FOCUS}`}
            >
              {entitlement.licence.status === 'valid' && entitlement.licence.expiresAt
                ? t('Active until {date}', { date: new Date(entitlement.licence.expiresAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) })
                : t('Have a licence key?')}
            </button>
            <p className="text-caption text-fg-faint">
              {t('{count} of {max}', { count: String(syncModes.length), max: String(FIGMA_SYNC_MODE_CAP) })}
            </p>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <p className="text-caption text-fg-faint leading-relaxed">
                {cannotSync
                  ? t('Add a System style or create a brand. Trying one on does not add it.')
                  : t('Each brand ships the themes checked here. In Figma every theme is one mode of Color Semantics. Pick up to {max}.', { max: String(FIGMA_SYNC_MODE_CAP) })}
              </p>
              {!cannotSync && (
                <p className="text-caption leading-relaxed text-fg-muted" aria-live="polite">
                  <span className="font-semibold text-fg">{syncSummary.head}</span>
                  {syncSummary.detail ? `: ${syncSummary.detail}` : ''}
                </p>
              )}
              {cannotSync ? (
                <p className="text-body font-medium text-fg-muted">{t('Nothing in My brands yet.')}</p>
              ) : (
              <div role="group" aria-label={t('Modes to include')} className="flex flex-col gap-1">
                {syncThemes.map((key) => {
                  const lightOn = hasFigmaSyncMode(syncModes, key, 'light')
                  const darkOn = hasFigmaSyncMode(syncModes, key, 'dark')
                  const selected = lightOn || darkOn
                  const atCap = syncModes.length >= FIGMA_SYNC_MODE_CAP
                  const ramp = themeBrandRamp(key, themeSources, themeKinds, store)
                  const swatch = ramp?.[BASE_TONE] ?? store.primaryColor
                  const name = themeDisplayName(key, themeLabels)
                  return (
                    <div
                      key={key}
                      className={`flex min-w-0 items-center gap-2.5 border border-line px-3 ${SYNC_CONTROL} ${
                        // Selection is the fill + the checkbox. A full-strength
                        // `border-fg` outline on top read as too loud.
                        selected ? 'bg-fg/8 text-fg' : 'text-fg-muted'
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-current={key === previewTheme ? 'true' : undefined}
                        onClick={() => {
                          if (free && !selected && selectedBrands.size >= FREE_MAX_THEMES) { setUpgradeOpen(true); return }
                          onSyncModesChange(toggleFigmaSyncTheme(syncModes, key, themeKinds))
                          onSelectTheme(key)
                        }}
                        className={`flex min-w-0 flex-1 items-center gap-2.5 text-left ${SYNC_FOCUS}`}
                      >
                        <CheckMark selected={selected} />
                        <span
                          className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
                          style={{ background: swatch }}
                          aria-hidden
                        />
                        <span className={`min-w-0 flex-1 truncate text-body ${selected ? 'font-semibold text-fg' : 'font-medium'}`}>
                          {name}
                        </span>
                      </button>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {(['light', 'dark'] as const).map((appearance) => {
                          const on = appearance === 'light' ? lightOn : darkOn
                          const locked = false
                          const blocked = !locked && !on && atCap
                          return (
                            <button
                              key={appearance}
                              type="button"
                              aria-pressed={on}
                              disabled={blocked}
                              title={locked ? t('Upgrade to Pro') : blocked ? t('Maximum {max} modes', { max: String(FIGMA_SYNC_MODE_CAP) }) : t(appearance === 'light' ? 'Light' : 'Dark')}
                              aria-label={`${name} ${appearance === 'light' ? t('Light') : t('Dark')}`}
                              onClick={() => {
                                if (locked) { setUpgradeOpen(true); return }
                                onSyncModesChange(toggleFigmaSyncAppearance(syncModes, key, appearance))
                                onSelectTheme(key)
                              }}
                              className={`inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-caption transition-colors ${SYNC_FOCUS} ${
                                locked
                                  ? 'text-fg-faint'
                                  : on
                                  ? 'bg-fg/12 text-fg'
                                  : blocked
                                    ? 'cursor-not-allowed text-fg-faint opacity-40'
                                    : 'text-fg-muted hover:bg-fg/8 hover:text-fg'
                              }`}
                            >
                              {locked ? <LockGlyph /> : <AppearanceGlyph kind={appearance} size={12} />}
                              <span className="hidden min-[520px]:inline">{t(appearance === 'light' ? 'Light' : 'Dark')}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 border-t border-line pt-4">
              <div className="flex items-center gap-3">
                <p className="text-mini font-semibold uppercase tracking-[0.12em] text-fg-faint">{t('Viewports')}</p>
                <p className="ml-auto text-caption text-fg-faint">
                  {t('{count} of {max}', { count: String(viewports.length), max: String(FIGMA_VIEWPORTS.length) })}
                </p>
              </div>
              <p className="text-caption text-fg-faint leading-relaxed">
                {t('Spacing, radius, size, stroke and grid get one Figma mode per viewport. Keep all three, or fewer if your plan limits modes per collection — at least one ships.')}
              </p>
              <div role="group" aria-label={t('Viewports to include')} className="flex flex-wrap gap-1.5">
                {FIGMA_VIEWPORTS.map((viewport: FigmaViewport) => {
                  const on = viewports.includes(viewport)
                  const locked = false
                  const last = !locked && on && viewports.length === 1
                  return (
                    <button
                      key={viewport}
                      type="button"
                      aria-pressed={on}
                      disabled={last}
                      title={locked ? t('Upgrade to Pro') : last ? t('At least one viewport ships') : undefined}
                      onClick={() => {
                        if (locked) { setUpgradeOpen(true); return }
                        onViewportsChange(toggleFigmaViewport(viewports, viewport))
                      }}
                      className={`inline-flex items-center gap-2 border border-line px-3 ${SYNC_CONTROL} text-body transition-colors ${SYNC_FOCUS} ${
                        locked
                          ? 'text-fg-faint'
                          : on ? 'bg-fg/8 font-semibold text-fg' : 'text-fg-muted hover:bg-fg/8 hover:text-fg'
                      } ${last ? 'cursor-not-allowed' : ''}`}
                    >
                      {locked ? <LockGlyph /> : <CheckMark selected={on} />}
                      {t(FIGMA_VIEWPORT_LABEL[viewport])}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface/50 p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="figma-file-name" className="text-mini font-semibold uppercase tracking-[0.12em] text-fg-faint">
            {t('File name')}
          </label>
          <div className={`group flex min-w-0 items-center gap-2 border border-line bg-app pl-3 pr-2 ${SYNC_CONTROL} focus-within:ring-2 focus-within:ring-fg/40`}>
            <input
              ref={fileNameRef}
              id="figma-file-name"
              type="text"
              value={fileName}
              onChange={(event) => onFileNameChange(event.target.value)}
              placeholder={syncThemes[0] ? themeDisplayName(syncThemes[0], themeLabels) : store.projectName}
              aria-describedby={fileHintId}
              className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none"
            />
            <span
              aria-hidden
              title={t('Rename file')}
              onMouseDown={(event) => {
                event.preventDefault()
                fileNameRef.current?.focus()
              }}
              className="grid h-6 w-6 flex-shrink-0 cursor-text place-items-center rounded-md text-fg-faint transition-colors group-hover:bg-fg/8 group-hover:text-fg group-focus-within:bg-fg/8 group-focus-within:text-fg"
            >
              <EditIcon />
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <p className="text-mini font-semibold uppercase tracking-[0.12em] text-fg-faint">{t('Agent context')}</p>
            {context ? (
              <p className="ml-auto text-caption text-fg-faint">
                {formatBytes(context.bytes)}
              </p>
            ) : null}
          </div>
          <p id={fileHintId} className="text-caption leading-relaxed text-fg-faint">
            {t('Your system as one message: the brands, themes and viewports checked above. Paste it into the Escala plugin, or into any AI agent.')}
          </p>
          <ol className="flex flex-col gap-1.5 text-caption leading-relaxed text-fg-muted">
            {[
              t('Copy the context.'),
              t('In Figma, open the Escala plugin. On Home, choose Agent Context.'),
              t('Paste it and press Import.'),
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-2">
                <span className="w-4 flex-shrink-0 font-mono tabular-nums text-fg-faint">{String(index + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copyContext()}
              disabled={!context}
              className={`inline-flex h-9 items-center justify-center gap-2 bg-fg px-4 text-caption font-semibold text-app shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${SYNC_CONTROL} ${SYNC_FOCUS}`}
            >
              {copied ? t('Copied') : t('Copy context')}
            </button>
            <button
              type="button"
              aria-expanded={previewOpen}
              disabled={!context}
              onClick={() => setPreviewOpen((open) => !open)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-caption font-medium text-fg-muted transition-colors hover:bg-fg/8 hover:text-fg disabled:opacity-60 ${SYNC_FOCUS}`}
            >
              <Chevron open={previewOpen} />
              {t('Preview')}
            </button>
          </div>
          {cannotSync || syncModes.length === 0 ? (
            <p className="text-caption leading-relaxed text-status-warning">
              {cannotSync
                ? t('Add a System style to My brands first — there is nothing to copy yet.')
                : t('Check at least one brand and theme above.')}
            </p>
          ) : null}
          {previewOpen && context ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-line bg-app p-3 font-mono text-caption leading-relaxed text-fg-muted">
              {context.text.length > 4000 ? `${context.text.slice(0, 4000)}\n…` : context.text}
            </pre>
          ) : null}
        </div>
      </div>
      {licenceOpen ? <LicenceModal onClose={() => setLicenceOpen(false)} /> : null}
      <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </motion.div>
  )
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`
}

function LockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className="flex-shrink-0">
      <rect x="3.25" y="7" width="9.5" height="6.25" rx="1.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.5 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
