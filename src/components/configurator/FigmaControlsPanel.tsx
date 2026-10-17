import { useId, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { useDesignStore } from '../../store/useDesignStore'
import { BASE_TONE } from '../../lib/colorUtils'
import { figmaSyncThemeKeys } from '../../lib/themeLibrary'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import {
  brandThemesFromSyncModes,
  figmaModeCapFor,
  FIGMA_VIEWPORTS,
  FIGMA_VIEWPORT_LABEL,
  hasFigmaSyncMode,
  toggleFigmaSyncAppearance,
  toggleFigmaSyncTheme,
  toggleFigmaViewport,
  type FigmaSyncMode,
  type FigmaViewport,
} from '../../lib/figmaSyncModes'
import { brandThemesSummary } from '../../lib/brandThemes'
import { useEntitlement } from '../../lib/useEntitlement'
import { useFreeTier } from '../../lib/access'
import { UpgradeToProDialog } from './UpgradeToProNotice'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../lib/pluginVersion'
import { PRO_MAX_MODES } from '../../lib/entitlement'
import { FigmaLogo, PluginInstallPromo } from './figmaShared'
import { AppearanceGlyph, THEME_BAND_H } from './colorControls'
import { QUICK_RAIL_STACK_GAP, QUICK_SETTINGS_WIDTH, RailCard, ThemeRailScrollRegion } from './ThemeQuickSettingsRail'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { InspectorPortal } from './WorkspaceInspector'
import { LicenceModal } from './LicenceModal'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

function CheckMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded border-2 ${selected ? 'border-fg bg-fg text-app' : 'border-line-strong'}`}
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

export interface FigmaControlsProps {
  previewTheme: string
  onSelectTheme: (key: string) => void
  fileName: string
  onFileNameChange: (name: string) => void
  syncModes: FigmaSyncMode[]
  onSyncModesChange: (modes: FigmaSyncMode[], planCut?: boolean) => void
  viewports: FigmaViewport[]
  onViewportsChange: (viewports: FigmaViewport[]) => void
  onOpenGithub?: () => void
}

/**
 * The control panel for what the agent context carries: file name, brands ×
 * themes, viewports. Everything the centre's context is built from is picked
 * here, and the plugin + Community door is pinned at the foot. It portals
 * into the inspector (never a column inside the card), like every other
 * Generator side panel.
 */
export default function FigmaControlsPanel({
  previewTheme, onSelectTheme, fileName, onFileNameChange,
  syncModes, onSyncModesChange, viewports, onViewportsChange, onOpenGithub,
}: FigmaControlsProps) {
  const store = useDesignStore()
  const { themeOrder, themes, themeLabels, themeKinds, themeSources, pluginBuildSeen, githubRepo } = store
  const { t, locale } = useI18n()
  const entitlement = useEntitlement()
  const free = useFreeTier()
  const cap = figmaModeCapFor(free)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  /** Free stops at `cap` modes: the next column asks for Pro instead of silently dropping. */
  const commit = (next: FigmaSyncMode[]) => {
    if (free && next.length > cap) { setUpgradeOpen(true); onSyncModesChange(next.slice(0, cap), true); return }
    onSyncModesChange(next)
  }
  const [licenceOpen, setLicenceOpen] = useState(false)
  const fileNameRef = useRef<HTMLInputElement>(null)
  const fileId = useId()
  const syncThemes = useMemo(() => figmaSyncThemeKeys(themeOrder, themes), [themeOrder, themes])
  const cannotSync = syncThemes.length === 0

  const summary = useMemo(() => {
    const byBrand = brandThemesFromSyncModes(syncModes)
    const brands = syncThemes.filter((key) => byBrand[key]?.length)
    return brands
      .map((key) => `${themeDisplayName(key, themeLabels)} ${t(brandThemesSummary(byBrand[key]).replace(/ only$/, ''))}`)
      .join(' · ')
  }, [syncModes, syncThemes, themeLabels, t])

  const pluginUpdateAvailable = pluginBuildSeen != null && pluginBuildSeen !== PLUGIN_BUILD
  const valid = entitlement.licence.status === 'valid'

  return (
    <InspectorPortal>
      <aside
        aria-label={t('Agent context controls')}
        className={`flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-line ${WORKSPACE_CHROME}`}
        style={{ width: QUICK_SETTINGS_WIDTH }}
      >
        <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-line px-4" style={{ height: THEME_BAND_H }}>
          <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg border border-line bg-surface text-fg">
            <FigmaLogo size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate text-ui font-semibold text-fg">{t('Include in context')}</span>
        </div>

        <ThemeRailScrollRegion padClass="px-3 py-3">
          <div className={`flex flex-col ${QUICK_RAIL_STACK_GAP}`}>
            <RailCard title="File">
              <div className="flex flex-col gap-1.5 px-3 pb-3 pt-1">
                <label htmlFor={fileId} className="sr-only">{t('File name')}</label>
                <div className="group flex h-9 min-w-0 items-center gap-2 rounded-lg border border-line bg-surface pl-3 pr-2 focus-within:ring-2 focus-within:ring-fg/40">
                  <input
                    ref={fileNameRef}
                    id={fileId}
                    type="text"
                    value={fileName}
                    onChange={(e) => onFileNameChange(e.target.value)}
                    placeholder={syncThemes[0] ? themeDisplayName(syncThemes[0], themeLabels) : store.projectName}
                    className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none"
                  />
                  <span
                    aria-hidden
                    title={t('Rename file')}
                    onMouseDown={(e) => { e.preventDefault(); fileNameRef.current?.focus() }}
                    className="grid h-6 w-6 flex-shrink-0 cursor-text place-items-center rounded-md text-fg-faint transition-colors group-hover:text-fg"
                  >
                    <EditIcon />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLicenceOpen(true)}
                  className={`self-start rounded text-caption text-fg-faint transition-colors hover:text-fg ${FOCUS}`}
                >
                  {valid && entitlement.licence.expiresAt
                    ? t('Active until {date}', { date: new Date(entitlement.licence.expiresAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) })
                    : t('Have a licence key?')}
                </button>
              </div>
            </RailCard>

            <RailCard
              title="Brands & themes"
              trailing={<span className="text-caption text-fg-faint">{t('{count} of {max}', { count: String(syncModes.length), max: String(cap) })}</span>}
            >
              <div className="flex flex-col gap-1 px-2 pb-2.5 pt-1" role="group" aria-label={t('Modes to include')}>
                {cannotSync ? (
                  <p className="px-1 py-1 text-caption leading-relaxed text-fg-faint">{t('Add a System style or create a brand. Trying one on does not add it.')}</p>
                ) : syncThemes.map((key) => {
                  const lightOn = hasFigmaSyncMode(syncModes, key, 'light')
                  const darkOn = hasFigmaSyncMode(syncModes, key, 'dark')
                  const selected = lightOn || darkOn
                  const atCap = syncModes.length >= cap
                  const ramp = themeBrandRamp(key, themeSources, themeKinds, store)
                  const swatch = ramp?.[BASE_TONE] ?? store.primaryColor
                  const name = themeDisplayName(key, themeLabels)
                  return (
                    <div
                      key={key}
                      className={`flex min-w-0 items-center gap-2 rounded-lg border border-line px-2.5 h-10 ${selected ? 'bg-fg/8 text-fg' : 'text-fg-muted'}`}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-current={key === previewTheme ? 'true' : undefined}
                        onClick={() => {
                          commit(toggleFigmaSyncTheme(syncModes, key, themeKinds, PRO_MAX_MODES))
                          onSelectTheme(key)
                        }}
                        className={`flex min-w-0 flex-1 items-center gap-2 text-left ${FOCUS}`}
                      >
                        <CheckMark selected={selected} />
                        <span className="h-3 w-3 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15" style={{ background: swatch }} aria-hidden />
                        <span className={`min-w-0 flex-1 truncate text-caption ${selected ? 'font-semibold text-fg' : 'font-medium'}`}>{name}</span>
                      </button>
                      <div className="flex flex-shrink-0 items-center">
                        {(['light', 'dark'] as const).map((appearance) => {
                          const on = appearance === 'light' ? lightOn : darkOn
                          const blocked = false
                          const label = t(appearance === 'light' ? 'Light' : 'Dark')
                          return (
                            <button
                              key={appearance}
                              type="button"
                              aria-pressed={on}
                              disabled={blocked}
                              title={label}
                              aria-label={`${name} ${label}`}
                              onClick={() => {
                                if (!on && atCap && free) { setUpgradeOpen(true); return }
                                commit(toggleFigmaSyncAppearance(syncModes, key, appearance, PRO_MAX_MODES))
                                onSelectTheme(key)
                              }}
                              className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${FOCUS} ${
                                on ? 'bg-fg/14 text-fg' : blocked ? 'cursor-not-allowed text-fg-faint opacity-40' : 'text-fg-faint hover:bg-fg/8 hover:text-fg'
                              }`}
                            >
                              <AppearanceGlyph kind={appearance} size={13} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {!cannotSync && summary ? (
                  <p className="px-1 pt-1 text-caption leading-snug text-fg-faint" aria-live="polite">{summary}</p>
                ) : null}
              </div>
            </RailCard>

            <RailCard
              title="Viewports"
              trailing={<span className="text-caption text-fg-faint">{t('{count} of {max}', { count: String(viewports.length), max: String(FIGMA_VIEWPORTS.length) })}</span>}
            >
              <div className="flex flex-col gap-1 px-2 pb-2.5 pt-1" role="group" aria-label={t('Viewports to include')}>
                {FIGMA_VIEWPORTS.map((viewport) => {
                  const on = viewports.includes(viewport)
                  const last = on && viewports.length === 1
                  return (
                    <button
                      key={viewport}
                      type="button"
                      aria-pressed={on}
                      disabled={last}
                      title={last ? t('At least one viewport ships') : undefined}
                      onClick={() => onViewportsChange(toggleFigmaViewport(viewports, viewport))}
                      className={`flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-left text-caption transition-colors ${FOCUS} ${
                        on ? 'bg-fg/8 font-semibold text-fg' : 'text-fg-muted hover:bg-fg/8 hover:text-fg'
                      } ${last ? 'cursor-not-allowed' : ''}`}
                    >
                      <CheckMark selected={on} />
                      {t(FIGMA_VIEWPORT_LABEL[viewport])}
                    </button>
                  )
                })}
                <p className="px-1 pt-1 text-caption leading-snug text-fg-faint">
                  {t('Spacing, radius, size, stroke and grid get one Figma mode per viewport.')}
                </p>
              </div>
            </RailCard>

            {onOpenGithub ? (
              <RailCard title="Backup">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-caption">
                  <span className="min-w-0 truncate text-fg-muted">{githubRepo ?? t('No repository')}</span>
                  <button
                    type="button"
                    onClick={onOpenGithub}
                    className={`flex-shrink-0 rounded text-fg underline decoration-fg-faint underline-offset-2 transition-colors hover:decoration-fg ${FOCUS}`}
                  >
                    {githubRepo ? t('Open') : t('Connect')}
                  </button>
                </div>
              </RailCard>
            ) : null}
          </div>
        </ThemeRailScrollRegion>

        {/* Pinned: the plugin is the way IN, so it never scrolls away. */}
        <div className="flex-shrink-0 border-t border-line px-3 pb-3 pt-1">
          <PluginInstallPromo
            layout="stacked"
            version={PLUGIN_VERSION}
            updateAvailable={pluginUpdateAvailable}
            info="Sign in from the Escala plugin. Your folders show up there. Paste the agent context into Home → Agent Context and press Import."
          />
        </div>
      </aside>
      <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      {licenceOpen ? <LicenceModal onClose={() => setLicenceOpen(false)} /> : null}
    </InspectorPortal>
  )
}
