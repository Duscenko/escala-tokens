import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePreviewTokens, resolvePreviewTokens } from '../../lib/previewTokens'
import { resolveStylePreviewTokens, stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'
import { useDesignStore } from '../../store/useDesignStore'
import { readableInk } from '../../lib/colorUtils'
import { themeDisplayName } from '../../lib/themeSources'
import { COMPONENTS } from '../../lib/componentCatalogue'
import { SystemCollage } from '../preview/artefacts/SystemCollage'
import { COLLAGE_TILE_COUNT } from '../../lib/randomTheme'
import { INSPECT_EXEMPT_ATTR, InspectorModeProvider, InspectorOverlay } from '../preview/artefacts/TokenInspector'
import { PhosphorWeightProvider, ICON_SLOTS, snippetFor, type AxisValues } from './docs/specimens'
import type { PreviewTokens } from '../preview/ButtonPreview'
import { axisDefaults, ComponentCatalogueHero } from './docs/componentArticle'
import { PHOSPHOR_LIBRARY } from '../../lib/iconLibraries'
import ThemeQuickSettingsRail, { isQuickPanelFoundation, PLATFORM_QUICK_PANELS, QUICK_SETTINGS_ID, type QuickPanelFoundation } from './ThemeQuickSettingsRail'
import ThemeContrastGrid from './ThemeContrastGrid'
import SemanticTokenDrawer from './SemanticTokenGroups'
import GitHubConnectView from './GitHubConnectView'
import FigmaSyncView from './FigmaSyncView'
import IntegrationStatusRail from './IntegrationStatusRail'
import DocsView, { OVERVIEW_KEY } from './DocsView'
import { FOUNDATION_DOCS, foundationDoc } from './docs/foundationDocs'
import { PANEL_W, THEME_BAND_H } from './colorControls'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL, SHELL_CHROME, WORKSPACE_CHROME } from './themeWorkspaceLayout'
import type { FigmaPublishState } from '../../lib/figmaSync'
import type { FigmaSyncMode, FigmaViewport } from '../../lib/figmaSyncModes'
import type { GitHubPushState } from '../../lib/github'
import { appearanceFromModeKey, themeModeKey, type ThemeAppearance } from '../../lib/themeModes'
import type { GridViewport } from '../../lib/layoutTokens'
import { themeHasEdits } from '../../lib/adoptPreset'
import { useI18n } from '../../lib/i18n'
import { ThemeHubHeaderActionsProvider } from './themeHubHeaderActions'
import { InspectGlyph } from '../ui/icons'
import { adoptPreset } from '../../lib/adoptPreset'
import { myThemeKeys } from '../../lib/themeLibrary'
import { showToast } from '../ui/Toast'
import NeedMyThemeEmpty from './NeedMyThemeEmpty'

// No `code` view here: the workspace's own tab strip already carries
// `Code Format` one row up, and two doors to the same screen read as two
// screens. Don't re-add it as a fourth icon — route to the tab instead.
export type ThemeHubSurface = 'artefacts' | 'github' | 'figma'

function IntegrationContextBar({ view, onBack }: { view: 'github' | 'figma'; onBack: () => void }) {
  const { t } = useI18n()
  return (
    <header className={`flex h-[54px] flex-shrink-0 items-center gap-2 border-b border-line ${WORKSPACE_CHROME} px-4`}>
      <HubBreadcrumb section={t(view === 'github' ? 'GitHub' : 'Figma')} onBack={onBack} />
    </header>
  )
}

function HubBreadcrumb({ section, onBack }: { section: string; onBack?: () => void }) {
  const { t } = useI18n()
  return (
    <nav aria-label={t('Breadcrumb')} className="min-w-0 flex items-center gap-2 text-mini text-fg-faint">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('Back to Theme preview')}
          className="inline-flex min-w-0 items-center gap-1 rounded px-1 py-1 -ml-1 font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7.5 2.5 4 6l3.5 3.5" />
          </svg>
          <span className="truncate">{t('Theme preview')}</span>
        </button>
      ) : (
        <span className="truncate">{t('Theme preview')}</span>
      )}
      <span aria-hidden>/</span>
      <span className="truncate font-medium text-fg">{section}</span>
    </nav>
  )
}

/**
 * Inspector mode toggle — Figma `41:1544` / `41:1545` (Button - Inspect tokens).
 * Outline shell — dashed `border-line` (same vocabulary as the Token Inspector
 * overlay and dashed add-rows), no `bg-tab-bar` fill. Sync beside it uses a
 * solid filled track so the two read as mode vs destination. The view switcher
 * keeps the filled track because it is a segmented control, not an outline action.
 *
 * It's a TOGGLE, not a momentary key: reading a role, going to the rail and
 * coming back for the next one is a sequence, and a mode that dropped every
 * time the pointer left the canvas couldn't survive it.
 *
 * Inspect-on fills the inner pill with `--accent-solid` / `--accent-ink` so
 * the mode reads as armed without inventing a second selected-chip language.
 * The visible label switches — **Inspect tokens** to enter, **Exit inspector**
 * to leave — so the exit is on the control itself, not only in the tooltip.
 */
function InspectorToggle({ active, onChange, accent, ink }: {
  active: boolean
  onChange: (v: boolean) => void
  /** The PREVIEWED theme's brand solid + its solved label ink. This is the one
   *  chrome control that deliberately follows the theme, not Escala's violet:
   *  armed, it is the theme's own accent telling you what you're inspecting. */
  accent?: string
  ink?: string
}) {
  const { t } = useI18n()
  const label = active ? t('Exit inspector') : t('Inspect tokens')
  return (
    <div
      className={`flex h-8 items-center rounded-lg border border-dashed p-0.5 transition-colors duration-150 ease-[var(--ease-out-quint)] ${
        active ? (accent ? '' : 'border-accent-ui/50') : 'border-line hover:border-line-strong'
      }`}
      style={active && accent ? { borderColor: `color-mix(in srgb, ${accent} 50%, transparent)` } : undefined}
    >
      <button
        type="button"
        onClick={() => onChange(!active)}
        aria-pressed={active}
        aria-label={label}
        title={active
          ? t('Return to normal interaction on the canvas')
          : `${t('Inspect tokens')} — ${t('point at a component or the page to see the roles that paint it')}`}
        className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-caption font-medium tracking-[0.18px] transition-[color,box-shadow,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
          active
            ? (accent ? '' : 'bg-accent-solid text-accent-ink')
            : `text-fg ${CHROME_CONTROL_HOVER}`
        }`}
        style={active && accent ? { backgroundColor: accent, color: ink } : undefined}
      >
        <InspectGlyph size={16} hint={!active} />
        {label}
      </button>
    </div>
  )
}

function DocsPanelButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { t } = useI18n()
  const mask = `url('/icons/theme-hub-icons/Icon/doc.svg') center / contain no-repeat`
  return (
    <div className="flex h-8 items-center rounded-lg border border-line bg-tab-bar p-0.5">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={t('Docs')}
        title={t('Docs')}
        className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-caption tracking-[0.18px] transition-[color,box-shadow,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${active
          ? 'bg-elevated font-medium text-fg shadow-sm'
          : `font-normal text-fg ${CHROME_CONTROL_HOVER}`
        }`}
      >
        <span aria-hidden className="h-3.5 w-3.5 bg-current" style={{ WebkitMask: mask, mask }} />
        {t('Docs')}
      </button>
    </div>
  )
}


// Hue dragging is a VIEW-ONLY optimistic paint on resolved preview tokens.
function withAccentPreview(tokens: PreviewTokens, accentPreview: string | null): PreviewTokens {
  if (!accentPreview) return tokens
  return {
    ...tokens,
    brandSolid: accentPreview,
    brandText: accentPreview,
    onBrand: readableInk(accentPreview, tokens.neutralText, tokens.surface),
    archTokens: tokens.archTokens ? {
      ...tokens.archTokens,
      'action.primary.default': accentPreview,
      'content.accent': accentPreview,
      'border.focus': accentPreview,
    } : undefined,
  }
}

// The quick-settings rail stays outside the framed canvas so its property
// controls remain fixed while the artefacts themselves scroll.
/** Breathing room between the docked drawer's edge and the first artefact —
 *  without it the board butts straight against the panel. */
const DRAWER_GUTTER = 24

function ArtefactsView({
  previewTheme, previewAppearance, previewPlatform, accentPreview, stylePreview, drawerOpen,
  inspecting, onInspectingChange, tileAppearances, boardAppearance, onPickRole, onOpenRoleInVariables, editingRole,
  onOpenComponents,
}: {
  previewTheme: string
  previewAppearance: ThemeAppearance
  previewPlatform: GridViewport
  accentPreview: string | null
  stylePreview: StylePreview | null
  onOpenComponents: () => void
  /** One appearance for every tile — the whole board is light or dark. */
  tileAppearances: ThemeAppearance[]
  /** Uniform board appearance — all tiles share light or dark. */
  boardAppearance: ThemeAppearance
  /** Inspector mode — point at a specimen, get the roles that paint it. Lives
   *  in the hub (the toggle is in the canvas header, a sibling of this view),
   *  never local here. */
  inspecting: boolean
  onInspectingChange: (active: boolean) => void
  onPickRole: (roleId: string, css: string, appearance: ThemeAppearance) => void
  /** A role picked here is open in Token Details — the overlay holds its pin
   *  for the duration and drops it when the drawer closes. */
  editingRole: boolean
  /** The badge's own exit to the full Semantics table — the same door Token
   *  Details carries, one step earlier in the flow. */
  onOpenRoleInVariables: (roleId: string) => void
  /** The quick rail's colour fly-out is open. It flies out FROM the canvas's
   *  own left edge, so the width it covers is the width the canvas cedes. */
  drawerOpen: boolean
}) {
  const store = useDesignStore()
  const overlayStore = useMemo(
    () => (stylePreview ? stylePreviewStore(store, stylePreview, previewTheme) : store),
    [stylePreview, store, previewTheme],
  )
  // Artefacts follow the platform switch: desktop = masonry board at the
  // 12-col recipe; tablet/mobile = phone photographs at their frame.
  const collagePlatform = previewPlatform
  const tokensByAppearance = useMemo(() => ({
    light: withAccentPreview(resolvePreviewTokens(overlayStore, previewTheme, 'light', collagePlatform), accentPreview),
    dark: withAccentPreview(resolvePreviewTokens(overlayStore, previewTheme, 'dark', collagePlatform), accentPreview),
  }), [overlayStore, previewTheme, accentPreview, collagePlatform])
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const stageTokens = tokensByAppearance[boardAppearance]
  // Token Details sits ON Color edition, not beside Themes library. The
  // canvas only needs to cede whatever of the 360px drawer actually crosses
  // its left edge — typically ~120px, never a full extra column.
  const [dockInset, setDockInset] = useState(0)
  useEffect(() => {
    if (!editingRole) { setDockInset(0); return }
    const measure = () => {
      const el = canvasRef.current
      if (!el) return
      const rail = document.getElementById(QUICK_SETTINGS_ID)?.getBoundingClientRect()
      const drawerLeft = rail && rail.left >= 0 ? rail.left : 0
      const overlap = drawerLeft + PANEL_W - el.getBoundingClientRect().left
      setDockInset(overlap > 0 ? Math.round(overlap) + DRAWER_GUTTER : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (canvasRef.current) ro.observe(canvasRef.current)
    const railEl = document.getElementById(QUICK_SETTINGS_ID)
    if (railEl) ro.observe(railEl)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [editingRole])
  // Both can be open at once; the wider claim wins.
  const padLeft = Math.max(drawerOpen ? PANEL_W : 0, dockInset)
  return (
    <div
      ref={canvasRef}
      className="@container flex-1 min-w-0 min-h-0 overflow-y-auto px-5 py-5 @min-[820px]:px-7 @min-[820px]:py-6 transition-[padding-left] duration-200 ease-out motion-reduce:transition-none"
      style={padLeft ? { paddingLeft: padLeft } : undefined}
    >
      <div className="mx-auto w-full">
        <div style={inspecting ? { cursor: 'crosshair' } : undefined}>
          <InspectorModeProvider active={inspecting}>
            <SystemCollage
              layout={previewPlatform === 'desktop' ? 'board' : 'phones'}
              frameTokens={stageTokens}
              tokensByAppearance={tokensByAppearance}
              tileAppearances={tileAppearances}
              projectName={store.projectName}
            />
          </InspectorModeProvider>
        </div>
        <ComponentsButtonTeaser
          previewTheme={previewTheme}
          previewAppearance={previewAppearance}
          previewPlatform={previewPlatform}
          stylePreview={stylePreview}
          onOpenComponents={onOpenComponents}
        />
      </div>
      <InspectorOverlay
        active={inspecting}
        rootRef={canvasRef}
        tokensByAppearance={tokensByAppearance}
        defaultAppearance={boardAppearance}
        onPick={onPickRole}
        onOpenTable={onOpenRoleInVariables}
        editing={editingRole}
        onExitMode={() => onInspectingChange(false)}
      />
    </div>
  )
}


/** Button playground under the bento — same hero + axis rail as Components →
 *  Button. Opts out of inspector hit-testing. */
function ComponentsButtonTeaser({
  previewTheme, previewAppearance, previewPlatform, stylePreview, onOpenComponents,
}: {
  previewTheme: string
  previewAppearance: ThemeAppearance
  previewPlatform: GridViewport
  stylePreview: StylePreview | null
  onOpenComponents: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const def = COMPONENTS.find((c) => c.key === 'Button')
  const liveTokens = usePreviewTokens(previewTheme, previewAppearance, previewPlatform)
  const previewTokens = useMemo(
    () => (stylePreview ? resolveStylePreviewTokens(store, stylePreview, previewTheme, previewPlatform) : null),
    [stylePreview, store, previewTheme, previewPlatform],
  )
  const tokens = previewTokens ?? liveTokens
  const [values, setValues] = useState<AxisValues>(() => (def ? axisDefaults(def) : {}))
  const [leadingIcon, setLeadingIcon] = useState(false)
  const [trailingIcon, setTrailingIcon] = useState(false)
  const slots = def ? ICON_SLOTS[def.key] : undefined
  const icons = slots
    ? { prefix: tokens.iconPrefix ?? PHOSPHOR_LIBRARY.key, leading: leadingIcon, trailing: trailingIcon }
    : undefined
  const snippet = def ? snippetFor(def, values, icons) : ''

  if (!def) return null

  return (
    <PhosphorWeightProvider weight={tokens.iconWeight}>
      <div
        {...{ [INSPECT_EXEMPT_ATTR]: '' }}
        className="mx-auto mt-10 w-full max-w-[1120px] border-t border-line/60 pt-8 cursor-default"
      >
        <h3 className="mb-5 text-ui font-semibold text-fg">{t('Components')}</h3>
        <ComponentCatalogueHero
          def={def}
          tokens={tokens}
          values={values}
          onValuesChange={setValues}
          icons={icons}
          leadingIcon={leadingIcon}
          onLeadingIconChange={setLeadingIcon}
          trailingIcon={trailingIcon}
          onTrailingIconChange={setTrailingIcon}
          snippet={snippet}
          headerTrailing={
            <button
              type="button"
              onClick={onOpenComponents}
              className="flex items-center gap-1.5 text-caption text-fg-muted hover:text-fg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded"
            >
              {t('Catalogue')} · {COMPONENTS.length} →
            </button>
          }
        />
      </div>
    </PhosphorWeightProvider>
  )
}

// The doc list is a SIBLING of the context bar now (see the hub's return), like
// the showcase rail — that's what lands its header band on the view-switcher's
// row instead of one row below it, and what lets both columns share `HubRail`.
function DocumentationView({ onEditFoundation, exits, active, onChange, overviewTitle, previewTheme, stylePreview }: {
  onEditFoundation: (key: string) => void
  exits: Parameters<typeof DocsView>[0]['exits']
  active: string
  onChange: (key: string) => void
  /** The previewed theme's name — the whole-system sheet's title, so it reads
   *  as THIS theme's spec rather than a generic "System reference". */
  overviewTitle: string
  previewTheme: string
  stylePreview: StylePreview | null
}) {
  return (
    <div className="flex-1 min-w-0 min-h-0">
      <DocsView
        activeFoundationKey={active}
        onSelectFoundationKey={onChange}
        onEditFoundation={onEditFoundation}
        exits={exits}
        overviewTitle={overviewTitle}
        hubMode
        docScope={{ themeKey: previewTheme, stylePreview }}
      />
    </div>
  )
}

export default function ThemePreviewHub({
  docsOpen,
  onDocsOpenChange,
  surface, onSurfaceChange,
  previewTheme, previewAppearance, previewPlatform = 'desktop', stylePreview, onAdoptStyle, onCreateTheme, onSelectTheme, onPreviewAppearanceChange, onPreviewPlatformChange,
  onOpenComponents,
  onEditFoundation, onSyncFoundationFromDoc, activeFoundation, onOpenPrimitiveFamily, onOpenInVariables, figmaPublishState, workspaceSection, onRequestFigmaSync, onOpenFigmaDownload,
  figmaFileName, onFigmaFileNameChange, figmaSyncModes, onFigmaSyncModesChange, figmaViewports, onFigmaViewportsChange,
  githubPushState, onGithubPushStateChange, docsExits,
}: {
  docsOpen: boolean
  onDocsOpenChange: (open: boolean) => void
  surface: ThemeHubSurface
  onSurfaceChange: (surface: ThemeHubSurface) => void
  previewTheme: string
  previewAppearance: ThemeAppearance
  /** Workspace desktop / mobile cut — Type roles and Grid frames follow this. */
  previewPlatform?: GridViewport
  onPreviewPlatformChange?: (platform: GridViewport) => void
  /** Ephemeral System Style try-on from the Themes Library; store-free. */
  stylePreview: StylePreview | null
  /** A tried-on style was adopted into the system — re-point the preview at it
   *  and drop the ephemeral try-on. */
  onAdoptStyle: (themeKey: string) => void
  /** Opens the create-theme panel — the quick-settings rail's pinned footer. */
  onCreateTheme?: () => void
  onSelectTheme: (themeKey: string) => void
  onPreviewAppearanceChange: (appearance: ThemeAppearance) => void
  /** Open the Components destination — catalogue link in the Button teaser header. */
  onOpenComponents: () => void
  onEditFoundation: (key: string) => void
  /** Keep the Variables icon rail in sync when the reader jumps foundations in-doc. */
  onSyncFoundationFromDoc: (foundationKey: string) => void
  /** Foundation the workspace icon rail has selected — drives the contextual doc. */
  activeFoundation?: QuickPanelFoundation
  /** Jump to a family's ramp in Color · Primitives from the Semantics
   *  Token Details drawer (family vocabulary name). */
  onOpenPrimitiveFamily: (family: string) => void
  /** Open a semantic token's row in the full Color · Semantics table. */
  onOpenInVariables: (tokenId: string) => void
  figmaPublishState: FigmaPublishState
  /** This window's workspace section id — Sync card's This page link. */
  workspaceSection?: string
  onRequestFigmaSync: () => void
  onOpenFigmaDownload: () => void
  figmaFileName: string
  onFigmaFileNameChange: (name: string) => void
  figmaSyncModes: FigmaSyncMode[]
  onFigmaSyncModesChange: (modes: FigmaSyncMode[]) => void
  figmaViewports: FigmaViewport[]
  onFigmaViewportsChange: (viewports: FigmaViewport[]) => void
  githubPushState: GitHubPushState
  onGithubPushStateChange: (state: GitHubPushState) => void
  docsExits: Parameters<typeof DocsView>[0]['exits']
}) {
  const { t } = useI18n()
  const themeLabels = useDesignStore((s) => s.themeLabels)
  const themeName = themeDisplayName(previewTheme, themeLabels)
  const [accentPreview, setAccentPreview] = useState<string | null>(null)
  // Whether a contained colour picker from the quick rail is open — the canvas
  // cedes `PANEL_W` so artefacts reflow instead of sitting under the fly-out.
  const [quickEditOpen, setQuickEditOpen] = useState(false)
  // Inspector mode starts ON so pointing at a component names the roles that
  // paint it. The header toggle is the exit — click it again and hover goes
  // back to ordinary interaction. Not persisted and not part of
  // `DesignSnapshot`: it's a way of looking, like `previewCollapsed`.
  const [inspecting, setInspecting] = useState(true)
  const [contrastOpen, setContrastOpen] = useState(false)
  const [editingToken, setEditingToken] = useState<string | null>(null)
  const [inspectedCss, setInspectedCss] = useState<string | null>(null)
  /** Whole-board light/dark flip from Random — view-only, not workspace chrome. */
  const [randomBoardAppearance, setRandomBoardAppearance] = useState<ThemeAppearance | null>(null)
  const [inspectedAppearance, setInspectedAppearance] = useState<ThemeAppearance | null>(null)
  // Session picks on a try-on. `resetThemeSemantics` drops live-store
  // overrides so a leftover `surface.layer-1` cannot leak into Nature — which
  // also dropped a Token Details pick on the critical solid. These ride on
  // the overlay AFTER that reset, and die with the preset.
  const [tryOnEdits, setTryOnEdits] = useState<Record<string, Record<string, string>>>({})
  const tryOnPresetId = stylePreview?.preset.id ?? ''
  useEffect(() => { setTryOnEdits({}) }, [tryOnPresetId])
  const paintedPreview = useMemo<StylePreview | null>(() => {
    if (!stylePreview) return null
    if (!Object.keys(tryOnEdits).length) return stylePreview
    return { ...stylePreview, edits: tryOnEdits }
  }, [stylePreview, tryOnEdits])
  const store = useDesignStore()
  const hasOwnTheme = myThemeKeys(store.themeOrder, store.themes).length > 0
  const needsMyTheme = !hasOwnTheme && !stylePreview
  // A REAL pick (not a Reset-driven clear) during a try-on is a deliberate
  // edit, not a glance — it can't stay ephemeral the way `tryOnEdits` is,
  // because nothing ephemeral survives leaving the tab. So it adopts the
  // style into My themes on the spot, the same "first edit makes it real"
  // rule `ThemeQuickSettingsRail`'s `resolveWriteTarget` already applies to
  // the quick-edit rail. `mode` here is the PREVIEWED theme's own mode key
  // (`<previewTheme>::light|dark` — see `useArchitectureTokens`), which
  // still points at whatever real theme sits under the try-on; writing
  // straight to it would silently edit that committed theme instead of the
  // style being tried on, so the edit is re-targeted at the freshly minted
  // theme's OWN mode key (same appearance, new theme id) once adoption
  // hands one back.
  const recordTryOnEdit = (tokenId: string, mode: string, ref: string | null) => {
    if (ref && stylePreview) {
      const adopted = adoptPreset(stylePreview.preset, previewAppearance, { asCopy: true, copyWord: t('Copy (duplicated theme suffix)') })
      if ('error' in adopted) {
        showToast(t(adopted.error, { count: myThemeKeys(store.themeOrder, store.themes).length }))
        return
      }
      showToast(t('{name} added to My themes', { name: adopted.name }))
      onAdoptStyle(adopted.key)
      const appearance = appearanceFromModeKey(mode) ?? previewAppearance
      store.setArchitectureOverride(store.semanticArchitecture, tokenId, themeModeKey(adopted.key, appearance), ref)
      return
    }
    setTryOnEdits((prev) => {
      const nextToken = { ...(prev[tokenId] ?? {}) }
      if (ref) nextToken[mode] = ref
      else delete nextToken[mode]
      const next = { ...prev }
      if (Object.keys(nextToken).length) next[tokenId] = nextToken
      else delete next[tokenId]
      return next
    })
  }
  const [hubDocActions, setHubDocActions] = useState<ReactNode>(null)
  const [docPageOverride, setDocPageOverride] = useState<string | null>(null)
  const contextDocKey = useMemo(() => {
    const f = activeFoundation ?? 'color'
    return isQuickPanelFoundation(f) ? f : 'color'
  }, [activeFoundation])
  const boardPlatform: GridViewport = PLATFORM_QUICK_PANELS.has(contextDocKey) ? previewPlatform : 'desktop'
  useEffect(() => { setDocPageOverride(null) }, [contextDocKey])
  useEffect(() => { if (!docsOpen) setDocPageOverride(null) }, [docsOpen])
  useEffect(() => { if (docsOpen) setContrastOpen(false) }, [docsOpen])
  const activeDocKey = docPageOverride ?? contextDocKey
  const handleDocNavigate = (key: string) => {
    setDocPageOverride(key)
    if (foundationDoc(key)) onSyncFoundationFromDoc(key)
  }
  const hubRootRef = useRef<HTMLElement>(null)
  const hubViewLabel = contrastOpen && surface === 'artefacts' && !docsOpen
    ? t('Contrast grid')
    : docsOpen
      ? (activeDocKey === OVERVIEW_KEY
        ? t('Theme reference')
        : (FOUNDATION_DOCS.find((doc) => doc.key === activeDocKey)?.label ?? t('Docs')))
      : t('Artefacts')
  // Flip the PREVIEW's appearance (the board), not the workspace chrome.
  // Color edition's Light/Dark is the control. Clearing `accentPreview`
  // mirrors the rail's own wrapper so an optimistic hue paint doesn't linger.
  const handleAppearanceChange = (appearance: ThemeAppearance) => {
    setAccentPreview(null)
    setRandomBoardAppearance(null)
    onPreviewAppearanceChange(appearance)
  }
  useEffect(() => { setRandomBoardAppearance(null) }, [previewTheme])
  useEffect(() => { if (surface !== 'artefacts') setRandomBoardAppearance(null) }, [surface])
  useEffect(() => {
    if (activeFoundation !== 'color' || surface !== 'artefacts') setContrastOpen(false)
  }, [activeFoundation, surface])
  // Random paints a view-only light/dark on the board. Reset restores the
  // theme's tokens but used to leave that overlay on, so the canvas stayed
  // on the random appearance while everything else snapped back.
  const themeEdited = themeHasEdits(store, previewTheme)
  useEffect(() => { if (!themeEdited) setRandomBoardAppearance(null) }, [themeEdited])
  // A role picked on the canvas opens Token Details in the SAME dock as New
  // theme — flush to the Themes Library — not the Variables table. The table
  // is a second destination the drawer itself already carries a door to.
  const pickRole = (roleId: string, css?: string, appearance?: ThemeAppearance) => {
    setEditingToken(roleId)
    setInspectedCss(css ?? null)
    setInspectedAppearance(appearance ?? null)
  }
  // What the BOARD is showing: a live try-on renders from `stylePreview.appearance`,
  // a committed theme from `previewAppearance`. Color edition's Light/Dark
  // switch reads and writes this, so it works for both.
  const boardAppearance: ThemeAppearance = stylePreview?.appearance ?? previewAppearance
  const effectiveBoardAppearance: ThemeAppearance = randomBoardAppearance ?? boardAppearance
  const effectiveTileAppearances = useMemo(
    () => Array.from({ length: COLLAGE_TILE_COUNT }, () => effectiveBoardAppearance),
    [effectiveBoardAppearance],
  )
  const boardCanvasTokens = useMemo(() => {
    const overlay = paintedPreview
      ? stylePreviewStore(store, paintedPreview, previewTheme)
      : store
    return withAccentPreview(
      resolvePreviewTokens(overlay, previewTheme, effectiveBoardAppearance, boardPlatform),
      accentPreview,
    )
  }, [store, previewTheme, effectiveBoardAppearance, paintedPreview, accentPreview, boardPlatform])
  // The canvas is the theme's PAGE (`surface.page` / `background-primary`), not
  // workspace chrome (`--app` / `--surface`) — otherwise artefacts float on a
  // fill that isn't the background they ship on.
  const pageCanvasColor = boardCanvasTokens.archTokens?.['surface.page']
    ?? boardCanvasTokens.pageBackground
    ?? boardCanvasTokens.surface
  // Every left column is a sibling of the framed canvas, so its own scrolling
  // and collapse state cannot disturb the preview surface.
  return <section ref={hubRootRef} className="relative h-full min-h-0 flex flex-col bg-app" aria-label={t('Theme preview')}>
    <div className="flex-1 min-h-0 flex">
      {surface === 'artefacts' && !needsMyTheme && !docsOpen && (
        <ThemeQuickSettingsRail
          key={previewTheme}
          previewTheme={previewTheme}
          previewAppearance={previewAppearance}
          colorAppearance={effectiveBoardAppearance}
          onColorAppearanceChange={handleAppearanceChange}
          activePanel={activeFoundation ?? 'color'}
          // "Go to advanced edition" IS `selectFoundation` — the shell handler
          // that switches to the Variables tab on a given foundation. Passing
          // it straight through is what makes the button land on the very
          // foundation whose quick panel you were in.
          onOpenAdvanced={onEditFoundation}
          onAccentPreview={setAccentPreview}
          stylePreview={stylePreview}
          onAdoptStyle={onAdoptStyle}
          onCreateTheme={onCreateTheme}
          onQuickEditOpenChange={setQuickEditOpen}
          containedDrawerRootRef={hubRootRef}
          onRandomBoardAppearance={setRandomBoardAppearance}
          contrastOpen={contrastOpen}
          onContrastOpenChange={setContrastOpen}
          previewPlatform={previewPlatform}
          onPreviewPlatformChange={onPreviewPlatformChange}
        />
      )}
      {(surface === 'github' || surface === 'figma') && (
        <IntegrationStatusRail
          provider={surface}
          githubPushState={githubPushState}
          figmaPublishState={figmaPublishState}
          onOpenPluginDownload={surface === 'figma' ? onOpenFigmaDownload : undefined}
          onOpenGithub={surface === 'figma' ? () => onSurfaceChange('github') : undefined}
          workspaceSection={workspaceSection}
          fileName={figmaFileName}
          modeCount={figmaSyncModes.length}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {surface === 'artefacts' ? (
          // The column IS the theme page (`surface.page`). A `--nav` gutter
          // around a rounded board put workspace gray beside the theme, so
          // the page never owned the surface. The empty state still sits in
          // the shell well — there is no page color to show yet.
          <div
            className={`min-h-0 flex-1 ${needsMyTheme ? `${SHELL_CHROME} p-3` : effectiveBoardAppearance === 'dark' ? 'dark' : 'light'}`}
            style={needsMyTheme ? undefined : { background: pageCanvasColor }}
          >
            <section
              aria-label={needsMyTheme ? t('Theme preview') : `${themeName} preview canvas`}
              className={`flex h-full min-h-0 flex-col overflow-hidden ${needsMyTheme ? 'rounded-xl border border-line bg-app' : ''}`}
            >
              {/* One header band for every hub view — the active view's NAME
                  sits top-left; Inspect, Figma sync and Docs stay on the right.
                  Light/Dark lives on Color edition's header so the ramps and
                  the board cannot disagree. */}
              <div className="flex flex-shrink-0 items-center justify-between gap-3 px-3" style={{ height: THEME_BAND_H }}>
                {contrastOpen ? (
                  <HubBreadcrumb section={t('Contrast grid')} onBack={() => setContrastOpen(false)} />
                ) : docsOpen ? (
                  <HubBreadcrumb
                    section={activeDocKey === OVERVIEW_KEY ? hubViewLabel : t(hubViewLabel)}
                    onBack={() => onDocsOpenChange(false)}
                  />
                ) : (
                  <span className="min-w-0 flex flex-col">
                    <span className="truncate text-ui font-semibold text-fg">{hubViewLabel}</span>
                    <span aria-hidden className="mt-1 h-[3px] w-6 rounded-full bg-accent-ui" />
                  </span>
                )}
                <div className="flex flex-shrink-0 items-center gap-2">
                  {docsOpen && hubDocActions}
                  {!needsMyTheme && !contrastOpen && !docsOpen && (
                    <InspectorToggle
                      active={inspecting}
                      onChange={setInspecting}
                      accent={boardCanvasTokens.brandSolid}
                      ink={boardCanvasTokens.onBrand}
                    />
                  )}
                  <DocsPanelButton active={docsOpen} onClick={() => onDocsOpenChange(!docsOpen)} />
                </div>
              </div>
              <ThemeHubHeaderActionsProvider onActions={setHubDocActions}>
              <div className="flex min-h-0 flex-1 flex-col">
                {needsMyTheme ? (
                  <NeedMyThemeEmpty />
                ) : (
                  <>
                {contrastOpen ? (
                  <ThemeContrastGrid previewTheme={previewTheme} previewAppearance={effectiveBoardAppearance} />
                ) : null}
                {!contrastOpen && docsOpen ? (
                  <DocumentationView
                    active={activeDocKey}
                    onChange={handleDocNavigate}
                    onEditFoundation={onEditFoundation}
                    overviewTitle={themeName}
                    previewTheme={previewTheme}
                    stylePreview={paintedPreview}
                    exits={{ ...docsExits, onOpenFigmaSync: () => onSurfaceChange('figma'), onOpenGithub: () => onSurfaceChange('github') }}
                  />
                ) : null}
                {!contrastOpen && !docsOpen ? (
                  <ArtefactsView
                    previewTheme={previewTheme}
                    previewAppearance={effectiveBoardAppearance}
                    previewPlatform={boardPlatform}
                    accentPreview={accentPreview}
                    stylePreview={paintedPreview}
                    drawerOpen={quickEditOpen}
                    editingRole={editingToken != null}
                    inspecting={inspecting}
                    onInspectingChange={setInspecting}
                    tileAppearances={effectiveTileAppearances}
                    boardAppearance={effectiveBoardAppearance}
                    onPickRole={pickRole}
                    onOpenRoleInVariables={onOpenInVariables}
                    onOpenComponents={onOpenComponents}
                  />
                ) : null}
                  </>
                )}
              </div>
              </ThemeHubHeaderActionsProvider>
            </section>
          </div>
        ) : (
          <>
            <IntegrationContextBar view={surface === 'github' ? 'github' : 'figma'} onBack={() => onSurfaceChange('artefacts')} />
            <div className="flex min-h-0 flex-1 flex-col">
              {surface === 'github' ? <div className="flex-1 min-w-0 min-h-0 overflow-y-auto"><GitHubConnectView embedded onPushStateChange={onGithubPushStateChange} /></div> : null}
              {surface === 'figma' ? <div className="flex-1 min-w-0 min-h-0 overflow-y-auto"><FigmaSyncView embedded onOpenDownload={onOpenFigmaDownload} publishState={figmaPublishState} onRequestSync={onRequestFigmaSync} previewTheme={previewTheme} onSelectTheme={onSelectTheme} fileName={figmaFileName} onFileNameChange={onFigmaFileNameChange} syncModes={figmaSyncModes} onSyncModesChange={onFigmaSyncModesChange} viewports={figmaViewports} onViewportsChange={onFigmaViewportsChange} section={workspaceSection} /></div> : null}
            </div>
          </>
        )}
      </div>
    </div>
    <SemanticTokenDrawer
      previewTheme={previewTheme}
      previewAppearance={inspectedAppearance ?? effectiveBoardAppearance}
      tokenId={surface === 'artefacts' ? editingToken : null}
      inspectedCss={inspectedCss}
      stylePreview={paintedPreview}
      onTryOnEdit={stylePreview ? recordTryOnEdit : undefined}
      onClose={() => { setEditingToken(null); setInspectedCss(null); setInspectedAppearance(null) }}
      onOpenPrimitiveFamily={onOpenPrimitiveFamily}
      onOpenInVariables={onOpenInVariables}
    />
  </section>
}
