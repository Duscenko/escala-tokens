import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'
import { useDesignStore } from '../../store/useDesignStore'
import { readableInk } from '../../lib/colorUtils'
import { themeDisplayName } from '../../lib/themeSources'
import { SystemCollage } from '../preview/artefacts/SystemCollage'
import { ComponentCoversGrid } from './docs/ComponentAvatars'
import { BoardViewSwitch, boardTabId, type BoardView } from './BoardViewSwitch'

/** The Generator board — the region Theme · Components switches. */
const BOARD_PANEL_ID = 'generator-board'
import { COLLAGE_TILE_COUNT } from '../../lib/randomTheme'
import { InspectorModeProvider, InspectorOverlay } from '../preview/artefacts/TokenInspector'
import type { PreviewTokens } from '../preview/ButtonPreview'
import { COMPONENTS, type ComponentDef } from '../../lib/componentCatalogue'
import ThemeQuickSettingsRail, { ThemeNameField, isQuickPanelFoundation, QUICK_SETTINGS_ID, type QuickPanelFoundation } from './ThemeQuickSettingsRail'
import ThemeContrastGrid from './ThemeContrastGrid'
import SemanticTokenDrawer from './SemanticTokenGroups'
import GitHubConnectView from './GitHubConnectView'
import FigmaSyncView from './FigmaSyncView'
import IntegrationStatusRail from './IntegrationStatusRail'
import DocsView, { OVERVIEW_KEY } from './DocsView'
import { FOUNDATION_DOCS, foundationDoc } from './docs/foundationDocs'
import { PANEL_W, THEME_BAND_H } from './colorControls'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL, INSPECTOR_TABS_H, SHELL_CHROME, WORKSPACE_CHROME } from './themeWorkspaceLayout'
import type { FigmaPublishState } from '../../lib/figmaSync'
import type { FigmaSyncMode, FigmaViewport } from '../../lib/figmaSyncModes'
import type { GitHubPushState } from '../../lib/github'
import { type ThemeAppearance } from '../../lib/themeModes'
import type { GridViewport } from '../../lib/layoutTokens'
import { themeHasEdits } from '../../lib/adoptPreset'
import { useI18n } from '../../lib/i18n'
import { useAccess } from '../../lib/access'
import { BoardHistoryControls, type ShipActions } from './ThemeSaveBar'
import { ThemeHubHeaderActionsProvider } from './themeHubHeaderActions'
import { InspectGlyph } from '../ui/icons'
import { HintTip } from '../ui/HintTip'
import { FigmaGlyph } from './TopNav'
import { myThemeKeys } from '../../lib/themeLibrary'
import { showToast } from '../ui/Toast'
import NeedMyThemeEmpty from './NeedMyThemeEmpty'
import { ThemeResetButton, useThemeReset } from './ThemeResetButton'
import { redoEdit, resetEditHistory, undoEdit, useEditHistory } from '../../lib/editHistory'

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
          aria-label={t('Back to Brand')}
          className="inline-flex min-w-0 items-center gap-1 rounded px-1 py-1 -ml-1 font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7.5 2.5 4 6l3.5 3.5" />
          </svg>
          <span className="truncate">{t('Brand')}</span>
        </button>
      ) : (
        <span className="truncate">{t('Brand')}</span>
      )}
      <span aria-hidden>/</span>
      <span className="truncate font-medium text-fg">{section}</span>
    </nav>
  )
}

/** The label of an icon-first header control. Collapsed at rest (the icon
 *  alone), it slides open on hover and keyboard focus, and stays open while
 *  `open` — the control is in a state worth naming (inspecting, syncing). */
function RevealLabel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <span
      className={`flex items-center gap-1.5 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${
        open
          ? 'ml-1.5 max-w-[10rem] opacity-100'
          : 'ml-0 max-w-0 opacity-0 group-hover:ml-1.5 group-hover:max-w-[10rem] group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-[10rem] group-focus-visible:opacity-100'
      }`}
    >
      {children}
    </span>
  )
}

/** Inner button of the header controls: square at rest (the 16px glyph
 *  centred in the 28px track), widening only by its label. */
const HEADER_CONTROL_BTN = 'group flex h-7 items-center rounded-md px-[calc((1.75rem_-_16px)/2)] text-caption font-medium tracking-[0.18px] transition-[color,box-shadow,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui focus-visible:ring-offset-1 focus-visible:ring-offset-app'

/**
 * Inspector mode toggle — Figma `41:1544` / `41:1545` (Button - Inspect tokens).
 * Outline shell — dashed `border-line` (same vocabulary as the Token Inspector
 * overlay and dashed add-rows), no `bg-tab-bar` fill; the Figma door beside it
 * keeps a solid edge so the two read as mode vs destination.
 *
 * It's a TOGGLE, not a momentary key: reading a role, going to the rail and
 * coming back for the next one is a sequence, and a mode that dropped every
 * time the pointer left the canvas couldn't survive it.
 *
 * Icon-only at rest; hover/focus slides out **Inspector**. Armed it fills with
 * the previewed theme's brand solid and stays open reading **Exit inspector**,
 * so the way out is written on the control itself, not only in a tooltip.
 */
const HEADER_CONTROL_DISABLED = 'opacity-40 cursor-not-allowed'

export function InspectorToggle({ active, pinned = false, onChange, accent, ink, disabled = false, disabledTitle, bare = false }: {
  active: boolean
  /** Something is docked in the inspector. Only then does the control read
   *  "Exit inspector": armed with nothing pinned (the first screen — the mode
   *  starts on) it says what it is, not how to leave something you have not
   *  entered. */
  pinned?: boolean
  onChange: (v: boolean) => void
  /** The PREVIEWED theme's brand solid + its solved label ink. This is the one
   *  chrome control that deliberately follows the theme, not Escala's violet:
   *  armed, it is the theme's own accent telling you what you're inspecting. */
  accent?: string
  ink?: string
  disabled?: boolean
  disabledTitle?: string
  /** No pill of its own: it is a segment inside `BoardHistoryControls`, which
   *  owns the frame. Armed, the button alone carries the brand fill. */
  bare?: boolean
}) {
  const { t } = useI18n()
  // The name is the ACTION, so it says what a press does ("Inspector" /
  // "Exit inspector") and matches the visible text (WCAG 2.5.3). Pairing a
  // changing name with `aria-pressed` made a screen reader announce "Exit
  // inspector, toggle button, pressed" — two answers to one question.
  const label = active && pinned ? t('Exit inspector') : t('Inspector')
  const hint = disabled && disabledTitle
    ? disabledTitle
    : active
      ? t('Return to normal interaction on the canvas')
      : `${t('Inspect tokens')} — ${t('point at a component or the page to see the roles that paint it')}`
  const button = (
    <button
      type="button"
      // `aria-disabled`, not `disabled`: a disabled button leaves the tab
      // order and drops its tooltip, so the reason it is off was unreachable.
      onClick={() => { if (!disabled) onChange(!active) }}
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-keyshortcuts={active ? 'Escape' : undefined}
      // The toolbar segment gets the dark hint (name, no paragraph); the
      // standalone pill keeps the native tooltip with the longer explanation.
      title={bare && !(disabled && disabledTitle) ? undefined : hint}
      // In the toolbar it is drawn exactly like the Theme · Components tabs
      // beside it: a 28px pill in a recessed track, faint when off, and when
      // on the same raised pill (light top edge, soft drop) — only filled with
      // the theme's accent instead of grey.
      className={bare
        ? `${HEADER_CONTROL_BTN.replace('focus-visible:ring-offset-1 focus-visible:ring-offset-app', '').replace('transition-[color,box-shadow,transform]', 'transition-[color,background-color,box-shadow,transform]')} ${
          active && !disabled
            ? `font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.4)] ${accent ? '' : 'bg-accent-solid text-accent-ink'}`
            : disabled ? `text-fg-faint ${HEADER_CONTROL_DISABLED}` : 'text-fg-faint hover:bg-fg/[0.06] hover:text-fg'
        }`
        : `${HEADER_CONTROL_BTN.replace('rounded-md', 'rounded-lg')} ${
          active && !disabled
            ? (accent ? '' : 'bg-accent-solid text-accent-ink')
            : `text-fg ${disabled ? '' : CHROME_CONTROL_HOVER}`
        }`}
      style={active && accent && !disabled ? { backgroundColor: accent, color: ink } : undefined}
    >
      <InspectGlyph size={16} hint={!active} />
      <RevealLabel open={active}>{label}</RevealLabel>
    </button>
  )
  if (bare) {
    // The same recessed track the view tabs sit in.
    const track = <span className="flex h-8 flex-shrink-0 items-center rounded-lg bg-fg/[0.04] p-0.5">{button}</span>
    return disabled && disabledTitle ? track : <HintTip label={label} shortcut={active ? 'Esc' : undefined}>{track}</HintTip>
  }
  return (
    // Same pill as Theme · Components beside it: the frame colour (`bg-nav`),
    // a solid hairline, h-9 / rounded-xl, no shadow. The dashed edge it used
    // to wear read as a drop target next to a solid control.
    <div
      className={`flex h-9 items-center rounded-xl border bg-nav p-1 transition-colors duration-150 ease-[var(--ease-out-quint)] ${
        disabled
          ? `border-line ${HEADER_CONTROL_DISABLED}`
          : active ? (accent ? '' : 'border-accent-ui/50') : 'border-line hover:border-line-strong'
      }`}
      style={active && accent && !disabled ? { borderColor: `color-mix(in srgb, ${accent} 50%, transparent)` } : undefined}
    >
      {button}
    </div>
  )
}

/**
 * Get code in the 32px header shell (Variables card header). Theme preview
 * keeps the door in the inspector footer only — one Get code per screen.
 */
export function GetCodeButton({ onOpen, disabled = false, disabledTitle }: { onOpen: () => void; disabled?: boolean; disabledTitle?: string }) {
  const { t } = useI18n()
  const label = t('Get code')
  const title = disabled && disabledTitle ? disabledTitle : label
  return (
    // The travelling conic border is Random's (`.random-theme-border`): Code is
    // where a finished theme is handed to an agent, so it wears the same "this
    // is the next move" mark. It overlays the pill's own 1px border (-inset-px).
    <div className={`random-border-host relative flex h-8 items-center rounded-lg border border-line p-0.5 transition-colors duration-150 ease-[var(--ease-out-quint)] ${disabled ? HEADER_CONTROL_DISABLED : 'hover:border-line-strong'}`}>
      {!disabled && <span aria-hidden className="random-theme-border pointer-events-none absolute -inset-px rounded-lg" />}
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        aria-label={label}
        title={title}
        className={`${HEADER_CONTROL_BTN} text-fg ${disabled ? '' : CHROME_CONTROL_HOVER}`}
      >
        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
            <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
          </svg>
        </span>
        <RevealLabel open>{label}</RevealLabel>
      </button>
    </div>
  )
}

/**
 * Reset — the whole-theme way back to its origin, shown only once the theme
 * differs from the style it was made from. Undo and Redo are NOT here: they
 * are `BoardHistoryControls`, right beside it on the same header — ONE Undo on
 * screen (two read as two different things, reported).
 */
function EditHistoryControls({ previewTheme }: { previewTheme: string }) {
  const reset = useThemeReset(previewTheme)
  if (!reset.show) return null
  return <ThemeResetButton mode={reset.mode} target={reset.target} onClick={reset.onClick} />
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
/** ONE horizontal inset for the board and the header above it, so the theme
 *  name, the header's controls and the bento's outer edges sit on the same
 *  two vertical lines. They were 13.5px (header) against 22.5–31.5px (board). */
const CANVAS_INSET = 'px-5'

function ArtefactsView({
  view, previewTheme, previewViewport, accentPreview, stylePreview, drawerOpen,
  inspecting, onInspectingChange, tileAppearances, boardAppearance, onPickRole, onOpenRoleInVariables, editingRole, onSelectionChange, onOpenComponent,
}: {
  /** Components view: a cover's ↗ opens that component's page. */
  onOpenComponent?: (def: ComponentDef) => void
  /** Theme (the bento board) or Components (every component as a cover). */
  view: BoardView
  previewTheme: string
  previewViewport: GridViewport
  accentPreview: string | null
  stylePreview: StylePreview | null
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
  /** The inspector's pinned element, for Token Details' back link. */
  onSelectionChange?: (label: string | null) => void
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
  const collagePlatform = previewViewport
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
      // Docked in the right-hand inspector, Token Details never crosses the
      // canvas — ceding width there slid the whole board out of view.
      if (document.getElementById(QUICK_SETTINGS_ID)?.closest('#workspace-inspector')) { setDockInset(0); return }
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
  // Both can be open at once; the wider claim wins. Neither claims anything
  // when the quick settings live in the right-hand inspector: the picker and
  // Token Details then open IN that column and never cross the board.
  const railInInspector = typeof document !== 'undefined'
    && Boolean(document.getElementById(QUICK_SETTINGS_ID)?.closest('#workspace-inspector'))
  const padLeft = railInInspector ? 0 : Math.max(drawerOpen ? PANEL_W : 0, dockInset)
  return (
    <div
      ref={canvasRef}
      id={BOARD_PANEL_ID}
      role="tabpanel"
      aria-labelledby={boardTabId(BOARD_PANEL_ID, view)}
      // `pb-20`: the board toolbar floats over the foot of this scrollport, so
      // the last row scrolls clear of it instead of ending underneath.
      className={`@container flex-1 min-w-0 min-h-0 overflow-y-auto ${CANVAS_INSET} pt-5 pb-20 transition-[padding-left] duration-200 ease-out motion-reduce:transition-none`}
      style={padLeft ? { paddingLeft: padLeft } : undefined}
    >
      <div className="mx-auto w-full">
        <div style={inspecting ? { cursor: 'crosshair' } : undefined}>
          <InspectorModeProvider active={inspecting}>
            {view === 'theme' ? (
              <SystemCollage
                layout={previewViewport === 'desktop' ? 'board' : 'phones'}
                frameTokens={stageTokens}
                tokensByAppearance={tokensByAppearance}
                tileAppearances={tileAppearances}
                projectName={store.projectName}
              />
            ) : (
              <div className={boardAppearance === 'dark' ? 'dark' : 'light'}>
                <ComponentCoversGrid tokens={stageTokens} onOpen={onOpenComponent} />
              </div>
            )}
          </InspectorModeProvider>
        </div>
      </div>
      <InspectorOverlay
        active={inspecting}
        rootRef={canvasRef}
        tokensByAppearance={tokensByAppearance}
        defaultAppearance={boardAppearance}
        onPick={onPickRole}
        onOpenTable={onOpenRoleInVariables}
        onOpenComponent={onOpenComponent ? (key) => {
          const def = COMPONENTS.find((c) => c.key === key)
          if (def) onOpenComponent(def)
        } : undefined}
        editing={editingRole}
        onExitMode={() => onInspectingChange(false)}
        onSelectionChange={onSelectionChange}
      />
    </div>
  )
}


// The doc list is a SIBLING of the context bar now (see the hub's return), like
// the showcase rail — that's what lands its header band on the view-switcher's
// row instead of one row below it, and what lets both columns share `HubRail`.
function DocumentationView({ onEditFoundation, exits, active, onChange, overviewTitle, previewTheme, previewAppearance, stylePreview }: {
  onEditFoundation: (key: string) => void
  exits: Parameters<typeof DocsView>[0]['exits']
  active: string
  onChange: (key: string) => void
  previewAppearance: ThemeAppearance
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
        appearance={previewAppearance}
        docScope={{ themeKey: previewTheme, stylePreview }}
      />
    </div>
  )
}

/** The board view last chosen this session (Theme · Components). */
let lastBoardView: BoardView = 'theme'

export default function ThemePreviewHub({
  docsOpen,
  onDocsOpenChange,
  surface, onSurfaceChange,
  previewTheme, previewAppearance, previewViewport = 'desktop', stylePreview, onNeedAccount, onOpenComponent, onAdoptStyle, onSelectTheme, onPreviewAppearanceChange, onPreviewPlatformChange,
  onEditFoundation, onSyncFoundationFromDoc, activeFoundation, onSelectFoundation, onOpenPrimitiveFamily, onOpenInVariables, figmaPublishState, workspaceSection, onOpenFigmaDownload,
  figmaFileName, onFigmaFileNameChange, figmaSyncModes, onFigmaSyncModesChange, figmaViewports, onFigmaViewportsChange,
  githubPushState, onGithubPushStateChange, docsExits, onGetCode, ship, onCreateTheme,
  exploringRandom = false, onExploringRandomEnd, randomDraft = false, onDiscardRandom, onBackHome, onBackToStyles,
}: {
  docsOpen: boolean
  onDocsOpenChange: (open: boolean) => void
  /** Opens the Code tab on this theme — the header's Get code door. */
  onGetCode?: () => void
  /** The inspector footer's three doors out (CSS · Figma · Agent). */
  ship?: ShipActions
  surface: ThemeHubSurface
  onSurfaceChange: (surface: ThemeHubSurface) => void
  previewTheme: string
  previewAppearance: ThemeAppearance
  /** Workspace desktop / mobile cut — Type roles and Grid frames follow this. */
  previewViewport?: GridViewport
  onPreviewPlatformChange?: (platform: GridViewport) => void
  /** Ephemeral System Style try-on from the Themes Library; store-free. */
  stylePreview: StylePreview | null
  onNeedAccount?: () => void
  /** A tried-on style was adopted into the system — re-point the preview at it
   *  and drop the ephemeral try-on. */
  onAdoptStyle: (themeKey: string) => void
  onSelectTheme: (themeKey: string) => void
  onPreviewAppearanceChange: (appearance: ThemeAppearance) => void
  /** Open the Components destination — catalogue link in the Button teaser header. */
  onOpenComponents: () => void
  /** Open one component's page — the ↗ on a board cover. */
  onOpenComponent?: (def: ComponentDef) => void
  onEditFoundation: (key: string) => void
  /** Keep the Variables icon rail in sync when the reader jumps foundations in-doc. */
  onSyncFoundationFromDoc: (foundationKey: string) => void
  /** Foundation the workspace icon rail has selected — drives the contextual doc. */
  activeFoundation?: QuickPanelFoundation
  /** Switch the quick edition — the icon rail's own handler. */
  onSelectFoundation?: (key: QuickPanelFoundation) => void
  /** Jump to a family's ramp in Color · Primitives from the Semantics
   *  Token Details drawer (family vocabulary name). */
  onOpenPrimitiveFamily: (family: string) => void
  /** Open a semantic token's row in the full Color · Semantics table. */
  onOpenInVariables: (tokenId: string) => void
  figmaPublishState: FigmaPublishState
  /** This window's workspace section id — Protocol card's window label. */
  workspaceSection?: string
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
  onCreateTheme?: () => void
  exploringRandom?: boolean
  onExploringRandomEnd?: () => void
  /** The theme on screen was minted by Random and is not saved yet. */
  randomDraft?: boolean
  /** A System style is only tried on: this returns to Home without adding it. */
  onBackHome?: () => void
  /** …and this one to Home's System styles list it was picked from. */
  onBackToStyles?: () => void
  /** Drop the unsaved Random theme and go back to Home. */
  onDiscardRandom?: () => void
}) {
  const { t } = useI18n()
  const themeLabels = useDesignStore((s) => s.themeLabels)
  const themeName = themeDisplayName(previewTheme, themeLabels)
  const { guest } = useAccess()
  // A Random theme is a draft until it is saved: the inspector would describe
  // a design system that does not exist yet.
  const headerActionsLockedHint = t('Save this brand to open code, Figma sync, Variables and Docs.')
  const [accentPreview, setAccentPreview] = useState<string | null>(null)
  // Whether a contained colour picker from the quick rail is open — the canvas
  // cedes `PANEL_W` so artefacts reflow instead of sitting under the fly-out.
  const [quickEditOpen, setQuickEditOpen] = useState(false)
  // Inspector mode starts ON so pointing at a component names the roles that
  // paint it. The header toggle is the exit — click it again and hover goes
  // back to ordinary interaction. Not persisted and not part of
  // `DesignSnapshot`: it's a way of looking, like `previewCollapsed`.
  // Open to guests and during the first setup pass too: naming the roles on
  // screen is how a first-time visitor learns what the colour step is setting.
  // Only an unsaved Random draft keeps it off.
  const [inspecting, setInspecting] = useState(true)
  // The rail owns "a whole new theme"; it hands it here so the die sits on
  // the board it repaints (`BoardHistoryControls`), not in the footer.
  const randomHandle = useRef<(() => void) | null>(null)
  // Random rewrites the brand in place, but every spin is ONE step of the
  // pill's own Undo (the rail's `commit`), so it is offered on a kept brand
  // too — to keep experimenting from what is on screen. A typed name is kept
  // (`randomLabelAfterTweak`). Hidden only during a style try-on, where the
  // rail has no theme to write to.
  const canRandom = !stylePreview
  // Survives the hub unmounting, so a cover's ↗ → the component page → "Brand"
  // lands back on the Components view instead of the bento board.
  const [boardView, setBoardViewState] = useState<BoardView>(() => lastBoardView)
  const setBoardView = (view: BoardView) => { lastBoardView = view; setBoardViewState(view) }
  useEffect(() => {
    if (randomDraft) setInspecting(false)
  }, [randomDraft])
  const [contrastOpen, setContrastOpen] = useState(false)
  const [editingToken, setEditingToken] = useState<string | null>(null)
  const [inspectedSelection, setInspectedSelection] = useState<string | null>(null)
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
  // Inspector edits during a try-on stay EPHEMERAL (`tryOnEdits`). They used
  // to adopt the style into My themes on the spot, as "<Style> Copy" — one of
  // the silent paths that filled My themes with themes nobody chose. Only
  // "Edit theme" (sheet or rail, `openStyleForEditing`) adds a style now.
  const recordTryOnEdit = (tokenId: string, mode: string, ref: string | null) => {
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
  // The platform switch heads the whole quick-settings panel now, so the board
  // follows it on every row (radius and spacing step down per viewport too).
  const boardPlatform: GridViewport = previewViewport
  // Docs is the system, not the foundation the icon rail last lit. Closing
  // the tab clears the pick so the next open is the theme reference again.
  useEffect(() => { if (!docsOpen) setDocPageOverride(null) }, [docsOpen])
  useEffect(() => { if (docsOpen) setContrastOpen(false) }, [docsOpen])
  const activeDocKey = docsOpen ? (docPageOverride ?? OVERVIEW_KEY) : contextDocKey
  const handleDocNavigate = (key: string) => {
    setDocPageOverride(key)
    // A foundation key may later open Variables on that table. It does not
    // decide which doc is showing — `docPageOverride` does.
    if (foundationDoc(key)) onSyncFoundationFromDoc(key)
  }
  const hubRootRef = useRef<HTMLElement>(null)
  const hubViewLabel = contrastOpen && surface === 'artefacts' && !docsOpen
    ? t('Contrast grid')
    : docsOpen
      ? (activeDocKey === OVERVIEW_KEY
        ? t('Brand reference')
        : t(activeDocKey === 'sizes' ? 'Spacing' : (FOUNDATION_DOCS.find((doc) => doc.key === activeDocKey)?.label ?? 'Docs')))
      : t('Brand preview')
  // Flip the PREVIEW's appearance (the board), not the workspace chrome.
  // Color edition's Light/Dark is the control. Clearing `accentPreview`
  // mirrors the rail's own wrapper so an optimistic hue paint doesn't linger.
  const handleAppearanceChange = (appearance: ThemeAppearance) => {
    setAccentPreview(null)
    setRandomBoardAppearance(null)
    onPreviewAppearanceChange(appearance)
  }
  useEffect(() => { setRandomBoardAppearance(null) }, [previewTheme])
  // The edit history belongs to ONE theme: undoing an edit made on another
  // theme while looking at this one would change something off screen.
  useEffect(() => { resetEditHistory() }, [previewTheme])
  // Undoing a Random spin puts the board back on the appearance it had: the
  // spin's light/dark is a view overlay, so the theme's own Undo can't.
  const lastRedoLabel = useEditHistory((h) => h.future[h.future.length - 1]?.label)
  useEffect(() => {
    if (lastRedoLabel === t('Random tweak applied')) setRandomBoardAppearance(null)
  }, [lastRedoLabel, t])
  // ⌘Z / ⇧⌘Z (Ctrl on other platforms) while the board is on screen. Never
  // while typing — a text field keeps its own native undo.
  const historyKeysActive = surface === 'artefacts' && !docsOpen
  useEffect(() => {
    if (!historyKeysActive) return
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      const el = event.target as HTMLElement | null
      // A text field keeps its own native undo. A <select> does not: the
      // primitive picker stays focused after a pick, and that was swallowing
      // the way back from a size, radius or text change.
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName))) return
      const done = event.shiftKey ? redoEdit() : undoEdit()
      if (done !== null) event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [historyKeysActive])
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
  return <section ref={hubRootRef} className="relative h-full min-h-0 flex flex-col bg-app" aria-label={t('Brand')}>
    <div className="flex-1 min-h-0 flex">
      {surface === 'artefacts' && !needsMyTheme && !docsOpen && (
        <ThemeQuickSettingsRail
          key={previewTheme}
          previewTheme={previewTheme}
          previewAppearance={previewAppearance}
          colorAppearance={effectiveBoardAppearance}
          onColorAppearanceChange={handleAppearanceChange}
          activePanel={activeFoundation ?? 'color'}
          onSelectPanel={onSelectFoundation}
          // "Go to advanced edition" IS `selectFoundation` — the shell handler
          // that switches to the Variables tab on a given foundation. Passing
          // it straight through is what makes the button land on the very
          // foundation whose quick panel you were in.
          onOpenAdvanced={onEditFoundation}
          onAccentPreview={setAccentPreview}
          stylePreview={stylePreview}
          onNeedAccount={onNeedAccount}
          onAdoptStyle={onAdoptStyle}
          onQuickEditOpenChange={setQuickEditOpen}
          containedDrawerRootRef={hubRootRef}
          onRandomBoardAppearance={setRandomBoardAppearance}
          contrastOpen={contrastOpen}
          onContrastOpenChange={setContrastOpen}
          previewViewport={previewViewport}
          onPreviewPlatformChange={onPreviewPlatformChange}
          exploringRandom={exploringRandom}
          onExploringRandomEnd={onExploringRandomEnd}
          onUseTheme={onGetCode}
          ship={ship}
          randomHandle={randomHandle}
          onDiscardRandom={onDiscardRandom}
        />
      )}
      {surface === 'github' && (
        <IntegrationStatusRail
          provider={surface}
          githubPushState={githubPushState}
          figmaPublishState={figmaPublishState}
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
              aria-label={needsMyTheme ? t('Brand') : `${themeName} preview canvas`}
              className={`flex h-full min-h-0 flex-col overflow-hidden ${needsMyTheme ? 'rounded-xl border border-line bg-app' : ''}`}
            >
              {/* One header band for every hub view — the active view's NAME
                  sits top-left; Inspect, Figma sync and Docs stay on the right.
                  Light/Dark lives on Color edition's header so the ramps and
                  the board cannot disagree. */}
              {/* `boardhead` container: on a narrow board the view switch
                  drops to icons (BoardViewSwitch) before anything clips. */}
              {/* The plain board has no band: its tools float at its foot. */}
              {(needsMyTheme || contrastOpen || docsOpen || stylePreview) && (
              <div className={`@container/boardhead flex flex-shrink-0 items-center justify-between gap-3 border-b border-line ${CANVAS_INSET}`} style={{ height: INSPECTOR_TABS_H }}>
                {contrastOpen ? (
                  <HubBreadcrumb section={t('Contrast grid')} onBack={() => setContrastOpen(false)} />
                ) : docsOpen ? (
                  <HubBreadcrumb
                    section={activeDocKey === OVERVIEW_KEY ? hubViewLabel : t(hubViewLabel)}
                    onBack={() => onDocsOpenChange(false)}
                  />
                ) : stylePreview && onBackHome ? (
                  // A System style is only tried on: say where it sits and let
                  // every level above it be a way back.
                  <nav aria-label={t('Breadcrumb')} className="flex min-w-0 items-center gap-1.5 text-ui text-fg-faint">
                    <button
                      type="button"
                      onClick={onBackHome}
                      className="flex-shrink-0 rounded px-1.5 py-1 font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                    >
                      {t('Home')}
                    </button>
                    <span aria-hidden>/</span>
                    <button
                      type="button"
                      onClick={onBackToStyles ?? onBackHome}
                      className="flex-shrink-0 rounded px-1.5 py-1 font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                    >
                      {t('System styles')}
                    </button>
                    <span aria-hidden>/</span>
                    <span aria-current="page" className="min-w-0 truncate px-1.5 font-semibold text-fg">{stylePreview.preset.label}</span>
                  </nav>
                ) : (
                  // The brand's name heads the inspector (ThemeQuickSettingsRail's
                  // header), next to Edit. The board only names what is not a
                  // brand of yours yet: the empty state, a style tried on.
                  // The board's view switch LEADS: it says what is on screen,
                  // like tabs. Inspect stays on the right, beside the panel
                  // its readings open in.
                  <span className="flex min-w-0 items-center gap-2">
                    {/* With the board toolbar on screen the switch is its last
                        group (see below); otherwise it stands here alone. */}
                    {!needsMyTheme && (contrastOpen || docsOpen || stylePreview) && (
                      <BoardViewSwitch value={boardView} onChange={setBoardView} panelId={BOARD_PANEL_ID} />
                    )}
                    {(needsMyTheme || stylePreview) && (
                      <span className={`min-w-0 ${needsMyTheme ? '-ml-2' : ''}`}>
                        <ThemeNameField
                          key={previewTheme}
                          previewTheme={previewTheme}
                          readOnlyLabel={needsMyTheme ? hubViewLabel : stylePreview?.preset.label}
                        />
                      </span>
                    )}
                  </span>
                )}
                <div className="flex flex-shrink-0 items-center gap-2">
                  {docsOpen && hubDocActions}
                  {/* The board toolbar floats over the board (below); with no
                      history (a style try-on) Inspector keeps its own pill here. */}
                  {!needsMyTheme && !contrastOpen && !docsOpen && stylePreview ? (
                    <InspectorToggle
                      active={inspecting}
                      pinned={Boolean(inspectedSelection)}
                      onChange={setInspecting}
                      accent={boardCanvasTokens.brandSolid}
                      ink={boardCanvasTokens.onBrand}
                      disabled={randomDraft}
                      disabledTitle={headerActionsLockedHint}
                    />
                  ) : null}
                </div>
              </div>
              )}
              <ThemeHubHeaderActionsProvider onActions={setHubDocActions}>
              {/* Also a `boardhead` container (same width as the header), so the
                  floating switch still drops to icons on a narrow board. */}
              <div className="@container/boardhead relative flex min-h-0 flex-1 flex-col">
                {/* Undo · Redo · Random · Inspector ‖ Theme · Components: ONE
                    toolbar floating at the board's foot, Figma's bottom bar —
                    the tools that act on the board, then what it shows. The
                    wrapper lets clicks through to the board beside the pill. */}
                {!needsMyTheme && !contrastOpen && !docsOpen && !stylePreview && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex items-center justify-center gap-2 px-4">
                    {/* Reset rides beside the bar for an account. */}
                    {!guest && (
                      <div className="pointer-events-auto rounded-lg bg-nav shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45),0_2px_6px_-2px_rgba(0,0,0,0.3)] empty:hidden">
                        <EditHistoryControls previewTheme={previewTheme} />
                      </div>
                    )}
                    <div className="pointer-events-auto rounded-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45),0_2px_6px_-2px_rgba(0,0,0,0.3)]">
                      <BoardHistoryControls
                        onRandom={canRandom ? () => randomHandle.current?.() : undefined}
                        trailing={<BoardViewSwitch inset value={boardView} onChange={setBoardView} panelId={BOARD_PANEL_ID} />}
                      >
                        <InspectorToggle
                          bare
                          active={inspecting}
                          pinned={Boolean(inspectedSelection)}
                          onChange={setInspecting}
                          accent={boardCanvasTokens.brandSolid}
                          ink={boardCanvasTokens.onBrand}
                          disabled={randomDraft}
                          disabledTitle={headerActionsLockedHint}
                        />
                      </BoardHistoryControls>
                    </div>
                  </div>
                )}
                {needsMyTheme ? (
                  <NeedMyThemeEmpty onCreateTheme={onCreateTheme} />
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
                    previewAppearance={previewAppearance}
                    stylePreview={paintedPreview}
                    exits={{ ...docsExits, onOpenFigmaSync: () => onSurfaceChange('figma'), onOpenGithub: () => onSurfaceChange('github') }}
                  />
                ) : null}
                {!contrastOpen && !docsOpen ? (
                  <ArtefactsView
                    view={boardView}
                    previewTheme={previewTheme}
                    previewViewport={boardPlatform}
                    accentPreview={accentPreview}
                    stylePreview={paintedPreview}
                    drawerOpen={quickEditOpen}
                    editingRole={editingToken != null}
                    inspecting={inspecting}
                    onInspectingChange={setInspecting}
                    tileAppearances={effectiveTileAppearances}
                    boardAppearance={effectiveBoardAppearance}
                    onPickRole={pickRole}
                    onSelectionChange={setInspectedSelection}
                    onOpenRoleInVariables={onOpenInVariables}
                    onOpenComponent={onOpenComponent}
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
              {surface === 'github' ? <div className="flex-1 min-w-0 min-h-0 overflow-y-auto"><GitHubConnectView embedded onPushStateChange={onGithubPushStateChange} theme={previewTheme} appearance={previewAppearance} /></div> : null}
              {surface === 'figma' ? <div className="flex-1 min-w-0 min-h-0 overflow-y-auto"><FigmaSyncView embedded onOpenDownload={onOpenFigmaDownload} onOpenGithub={() => onSurfaceChange('github')} previewTheme={previewTheme} previewAppearance={previewAppearance} onSelectTheme={onSelectTheme} fileName={figmaFileName} onFileNameChange={onFigmaFileNameChange} syncModes={figmaSyncModes} onSyncModesChange={onFigmaSyncModesChange} viewports={figmaViewports} onViewportsChange={onFigmaViewportsChange} section={workspaceSection} /></div> : null}
            </div>
          </>
        )}
      </div>
    </div>
    <SemanticTokenDrawer
      previewTheme={previewTheme}
      previewAppearance={inspectedAppearance ?? effectiveBoardAppearance}
      previewViewport={boardPlatform}
      tokenId={surface === 'artefacts' ? editingToken : null}
      inspectedCss={inspectedCss}
      stylePreview={paintedPreview}
      onTryOnEdit={stylePreview ? recordTryOnEdit : undefined}
      onClose={() => { setEditingToken(null); setInspectedCss(null); setInspectedAppearance(null) }}
      onOpenPrimitiveFamily={onOpenPrimitiveFamily}
      onOpenInVariables={onOpenInVariables}
      backLabel={inspecting ? inspectedSelection : null}
    />
  </section>
}
