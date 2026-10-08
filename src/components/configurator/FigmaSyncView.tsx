import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { useDesignStore } from '../../store/useDesignStore'
import { isLiveEnvironment, syncProjectId, type FigmaPublishState } from '../../lib/figmaSync'
import { BASE_TONE } from '../../lib/colorUtils'
import { figmaSyncThemeKeys } from '../../lib/themeLibrary'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import {
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
import { BackToEditor, PluginInstallPromo } from './figmaShared'
import { AppearanceGlyph } from './colorControls'
import { PLUGIN_BUILD, PLUGIN_VERSION } from '../../lib/pluginVersion'
import { PRICING_PATH, PRO_MAX_THEMES } from '../../lib/entitlement'
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
  /** Shared manual-publish feedback from Configurator, so this screen and the
   *  persistent header always report the same request. */
  publishState: FigmaPublishState
  /** Specific reason for the current 'error' state (a lost claim vs. a network
   *  hiccup) — same string the Sync pill's tooltip shows. Null outside 'error'. */
  publishError?: string | null
  onRequestSync: () => void
  /** Theme the canvas is previewing — selecting a sync row also previews it. */
  previewTheme: string
  /** The appearance on screen. Free keeps this one; the other stays visible and locked. */
  previewAppearance?: ThemeAppearance
  onSelectTheme: (key: string) => void
  /** Figma file name and `/api/tokens?project=` slug (`slugify` of this).
   *  Defaults to the first theme. Does not rename the editor project. */
  fileName: string
  onFileNameChange: (name: string) => void
  /** Selected Figma columns — theme × Light/Dark, capped at `FIGMA_SYNC_MODE_CAP`. */
  syncModes: FigmaSyncMode[]
  onSyncModesChange: (modes: FigmaSyncMode[]) => void
  /** Viewports that become Dimension Semantics' Figma modes (≥ 1). */
  viewports: FigmaViewport[]
  onViewportsChange: (viewports: FigmaViewport[]) => void
  /** Kept so existing callers still compile. The plugin signs in; this screen
   *  no longer shows a page URL. */
  section?: string
}

/** Theme radios, the sync URL field, and Sync now — one height, one radius. */
/** Whether the ID currently resolves to a published payload. Deliberately a
 *  dot + one word, next to the label rather than in the field: it annotates the
 *  ID, and the field itself is what gets copied. `unknown` renders nothing —
 *  a probe that could not run must not claim either answer. */
function PublishStateBadge({ state }: { state: 'unknown' | 'live' | 'missing' }) {
  const { t } = useI18n()
  if (state === 'unknown') return null
  const live = state === 'live'
  return (
    <span
      className={`inline-flex items-center gap-1 text-mini font-semibold uppercase tracking-[0.12em] ${live ? 'text-status-success' : 'text-status-warning'}`}
      title={live
        ? t('The plugin can fetch this ID right now.')
        : t('Nothing published under this ID yet — the plugin would answer 404.')}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-status-success-solid' : 'bg-status-warning-solid'}`} />
      {live ? t('Live') : t('Not published')}
    </span>
  )
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

/** Progressive disclosure for the cases Sync now cannot finish in Figma.
 *  Closed by default — the success banner already names Update now. */
function SyncStuckHelp() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex items-center gap-1.5 rounded-md text-caption text-fg-muted transition-colors hover:text-fg ${SYNC_FOCUS}`}
      >
        <Chevron open={open} />
        {t('No sync yet? Help')}
      </button>
      {open ? (
        <ol id={panelId} className="mt-2 list-decimal space-y-2 pl-5 text-caption leading-relaxed text-fg-muted">
          <li>{t('Open the Escala plugin in Figma and sign in, then press Sync on this folder.')}</li>
          <li>{t('A hand-imported tokens.json stays a snapshot. Keep updating that file yourself — Live Sync will not rewrite a pasted import.')}</li>
          <li>{t('Renamed or newly added variables cannot merge onto an existing collection. Use Import into this file, or Reset this file — not another Sync now here.')}</li>
        </ol>
      ) : null}
    </div>
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

/** Launch promo strip at the head of File & modes — the screen where several
 *  themes and viewports are chosen, i.e. where the Pro limits will later bite.
 *  States the rule that follows the promo up front, so November 1 is not the
 *  first time anyone hears of it. Static: no shimmer, no ticking seconds — the
 *  countdown's unit is a day. The PRO pill is the one accent FILL on this
 *  chrome surface, so it takes `--accent-solid` + its solved `--accent-ink`. */
function PromoBanner({ daysLeft }: { daysLeft: number }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-shrink-0 items-center gap-3 border-b border-line bg-accent-ui/[0.08] px-5 py-3">
      <span className="flex-shrink-0 rounded-full bg-accent-solid px-1.5 py-0.5 text-nano font-semibold tracking-[0.1em] text-accent-ink">
        PRO
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-fg">{t('Every theme and viewport is free until October 31')}</p>
        <p className="mt-0.5 text-caption leading-relaxed text-fg-muted">
          {t('After that: 1 theme and Desktop are free. Up to {max} themes and every viewport with Pro.', { max: String(PRO_MAX_THEMES) })}{' '}
          <a href={PRICING_PATH} className={`text-accent-ui underline-offset-2 hover:underline ${SYNC_FOCUS}`}>{t('See pricing')}</a>
        </p>
      </div>
      <p className="flex-shrink-0 text-right">
        <span className="block font-mono text-heading font-medium leading-none tabular-nums text-accent-ui">{daysLeft}</span>
        <span className="mt-1 block text-mini text-fg-faint">{daysLeft === 1 ? t('day left') : t('days left')}</span>
      </p>
    </div>
  )
}

/** After the free promo, hosted sync is an Escala Pro feature. Says so at the
 *  head of File & modes — the screen that offers it — instead of letting the
 *  first clue be a failed publish. Two exits, both to something that works:
 *  the pricing page, or pasting a key already bought. */
function ProRequiredBanner({ onOpenLicence }: { onOpenLicence: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-line bg-accent-ui/[0.08] px-5 py-3">
      <span className="flex-shrink-0 rounded-full bg-accent-solid px-1.5 py-0.5 text-nano font-semibold tracking-[0.1em] text-accent-ink">
        PRO
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-fg">{t('Hosted sync is part of Escala Pro')}</p>
        <p className="mt-0.5 text-caption leading-relaxed text-fg-muted">
          {t('You can still import tokens.json in the plugin by hand: 1 theme and Desktop are free.')}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenLicence}
          className={`h-8 rounded-lg border border-line px-3 text-caption font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg ${SYNC_FOCUS}`}
        >
          {t('I have a key')}
        </button>
        <a
          href={PRICING_PATH}
          className={`inline-flex h-8 items-center rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 ${SYNC_FOCUS}`}
        >
          {t('See pricing')}
        </a>
      </div>
    </div>
  )
}

// ─── Sync status and explicit publish ───────────────────────────────────────
// Opening this surface is intentionally read-only. Its parent owns the manual
// publish request and status so the top-nav Sync control and this screen always
// show the same in-flight feedback. Downloading the plugin never invokes
// /api/tokens.
export default function FigmaSyncView({
  onClose, embedded = false, onOpenDownload,
  publishState, publishError, onRequestSync, previewTheme, previewAppearance = 'light', onSelectTheme,
  fileName, onFileNameChange, syncModes, onSyncModesChange, viewports, onViewportsChange,
}: FigmaSyncViewProps) {
  const store = useDesignStore()
  const {
    autoSyncFigma, setAutoSyncFigma, pluginBuildSeen,
    themeOrder, themes, themeLabels, themeKinds, themeSources,
  } = store
  const syncThemes = useMemo(
    () => figmaSyncThemeKeys(themeOrder, themes),
    [themeOrder, themes],
  )
  const cannotSync = syncThemes.length === 0
  const [isDeployed] = useState(isLiveEnvironment)
  // Mint the stable id the moment this screen opens — this IS the screen where
  // someone sets up the connection, so it is the honest place for it, and the
  // alternative (minting inside `makeDesignDefaults`) would burn an identity on
  // every reset and every module load. Idempotent, so a re-render is free.
  //
  // NOT gated on `isDeployed`: minting touches no network, and a dev build that
  // showed a stale name-slug in a field labelled "ID to plugin" would be
  // teaching the wrong thing. The PROBE below IS gated, for the opposite
  // reason — `vite dev` answers any unknown path with index.html and HTTP 200,
  // so an unguarded probe there would report a system as Live that isn't.
  const ensurePublishId = store.ensurePublishId
  useEffect(() => { ensurePublishId() }, [ensurePublishId])
  const pluginSlug = syncProjectId(fileName)

  const { t, locale } = useI18n()
  const free = useFreeTier()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [licenceOpen, setLicenceOpen] = useState(false)
  // A selection saved while Pro was on (or during the beta) must not keep
  // shipping the other appearance or a phone viewport once the account is Free.
  useEffect(() => {
    if (!free) return
    const nextModes: FigmaSyncMode[] = []
    const seen = new Set<string>()
    for (const mode of syncModes) {
      if (mode.appearance === previewAppearance) {
        const id = `${mode.theme}::${mode.appearance}`
        if (seen.has(id)) continue
        seen.add(id)
        nextModes.push(mode)
        continue
      }
      const id = `${mode.theme}::${previewAppearance}`
      if (seen.has(id) || syncModes.some((other) => other.theme === mode.theme && other.appearance === previewAppearance)) continue
      seen.add(id)
      nextModes.push({ theme: mode.theme, appearance: previewAppearance })
    }
    const modesSame = nextModes.length === syncModes.length
      && nextModes.every((mode, index) => mode.theme === syncModes[index]?.theme && mode.appearance === syncModes[index]?.appearance)
    if (!modesSame) onSyncModesChange(nextModes)
    if (viewports.length !== 1 || viewports[0] !== 'desktop') onViewportsChange(['desktop'])
  }, [free, previewAppearance, syncModes, viewports, onSyncModesChange, onViewportsChange])
  const entitlement = useEntitlement()
  const fileHintId = useId()
  const fileNameRef = useRef<HTMLInputElement>(null)
  // ── Does this ID actually serve anything? ─────────────────────────────────
  // The screen used to hand out a copyable key with no idea whether a blob
  // existed behind it, and a key that has never been published answers 404 —
  // which is exactly what the plugin reported, as a bare "HTTP 404" that read
  // like an outage. One GET settles it, and it is the same request the plugin
  // will make, so it cannot disagree.
  //
  // Keyed by the id it answered FOR, and read back as derived state: a result
  // for a previous id (after "New ID", or a slower response overtaking a
  // faster one) can then never be shown against the current one.
  const [probe, setProbe] = useState<{ key: string; ok: boolean } | null>(null)
  useEffect(() => {
    if (!isDeployed || !pluginSlug) return
    let cancelled = false
    fetch(`/api/tokens?project=${encodeURIComponent(pluginSlug)}`, { cache: 'no-store' })
      .then((res) => { if (!cancelled) setProbe({ key: pluginSlug, ok: res.ok }) })
      // A network failure is not "unpublished" — leave it unknown rather than
      // telling someone to re-publish something that is already there.
      .catch(() => { if (!cancelled) setProbe(null) })
    return () => { cancelled = true }
  }, [pluginSlug, isDeployed, publishState])
  const publishedState: 'unknown' | 'live' | 'missing' =
    probe && probe.key === pluginSlug ? (probe.ok ? 'live' : 'missing') : 'unknown'
  const [handoff, setHandoff] = useState(false)

  function requestSync() {
    // Without Pro the server answers 402 — say so BEFORE the request, with a way
    // forward, instead of a red "couldn't publish" the user cannot act on.
    if (!entitlement.pro) { setLicenceOpen(true); return }
    setHandoff(true)
    onRequestSync()
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

      {/* Modes first, then File name + ID to plugin as one link. Scaffold
          light/dark are not My themes — an empty library shows an empty
          list, never a default-blue "Dark" row. */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface/50">
          {entitlement.promo
            ? <PromoBanner daysLeft={entitlement.daysLeft} />
            : !entitlement.pro ? <ProRequiredBanner onOpenLicence={() => setLicenceOpen(true)} /> : null}
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
                  ? t('Add a System style or create a theme. Trying one on does not add it.')
                  : t('Figma gets Light and Dark as columns for each selected theme. Pick up to {max} modes.', { max: String(FIGMA_SYNC_MODE_CAP) })}
              </p>
              {cannotSync ? (
                <p className="text-body font-medium text-fg-muted">{t('Nothing in My themes yet.')}</p>
              ) : (
              <div role="group" aria-label={t('Modes to sync')} className="flex flex-col gap-1">
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
                          const locked = free && appearance !== previewAppearance
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
              <div role="group" aria-label={t('Viewports to sync')} className="flex flex-wrap gap-1.5">
                {FIGMA_VIEWPORTS.map((viewport: FigmaViewport) => {
                  const on = viewports.includes(viewport)
                  const locked = free && viewport !== 'desktop'
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
        <div className="flex flex-col gap-3">
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
          <div className="flex items-center gap-2">
            <PublishStateBadge state={publishedState} />
            <button
              type="button"
              onClick={requestSync}
              disabled={publishState === 'publishing' || cannotSync}
              className={`inline-flex h-9 items-center justify-center gap-2 bg-fg px-4 text-caption font-semibold text-app shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-60 ${cannotSync ? 'disabled:cursor-not-allowed' : 'disabled:cursor-wait'} ${SYNC_CONTROL} ${SYNC_FOCUS}`}
            >
              {publishState === 'publishing' ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 2a6 6 0 1 1-5.2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : null}
              {publishState === 'publishing'
                ? t('Publishing…')
                : publishState === 'error'
                  ? t('Try again')
                  : t('Sync now')}
            </button>
          </div>
          {cannotSync && (
            <p className="text-caption leading-relaxed text-status-warning">
              {t('Add a System style to My themes first — there is nothing to publish yet.')}
            </p>
          )}
          <p id={fileHintId} className="text-caption leading-relaxed text-fg-faint">
            {publishedState === 'missing'
              ? t('Nothing published yet. Press Sync now, then sign in from the Escala plugin in Figma.')
              : t('In Figma, open the Escala plugin and sign in. This folder shows up there — press Sync to start.')}
          </p>
        </div>
        {publishState === 'publishing' && (
          <div className="flex items-center gap-1.5 text-caption">
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning-solid animate-pulse" />
            <span className="text-fg-faint">Publishing your tokens…</span>
          </div>
        )}
        {publishState === 'error' && (
          <div className="flex items-center gap-1.5 text-caption">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-status-danger-solid" />
            <span className="text-fg-faint">{publishError || "Couldn't publish your tokens. Retry sync, or use the plugin's Import tab to paste them manually."}</span>
          </div>
        )}
        {/* The payoff, and deliberately NOT a toast. The next step happens in
            another application — the user has to leave this window, open Figma,
            find the plugin and paste. An instruction you act on somewhere else
            must not expire after two seconds, so this card stays until the
            state that produced it changes. It is also why the old copy ("This
            only published the URL") is gone: that described the mechanism,
            which is precisely the half the user cannot see and does not need. */}
        {handoff && publishState !== 'publishing' && publishState !== 'error' && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-lg bg-fg/6 px-3 py-2.5"
          >
            <span className="mt-0.5 text-status-success" aria-hidden>✓</span>
            <div className="min-w-0">
              <p className="text-caption font-semibold text-fg">
                {t('Published. Sign in from the plugin to sync this folder.')}
              </p>
              <p className="mt-0.5 text-caption leading-relaxed text-fg-muted">
                {t('In Figma: open the Escala plugin, press Sign in, then Sync on this folder.')}
              </p>
            </div>
          </div>
        )}
        <SyncStuckHelp />
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
      {licenceOpen ? <LicenceModal onClose={() => setLicenceOpen(false)} /> : null}
      <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </motion.div>
  )
}

function LockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className="flex-shrink-0">
      <rect x="3.25" y="7" width="9.5" height="6.25" rx="1.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.5 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
