import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { InspectorToggle } from './ThemePreviewHub'
import { InspectorModeProvider, InspectorOverlay } from '../preview/artefacts/TokenInspector'
import { activeLibraryId, useDesignStore } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { MY_THEME_FULL_ERROR, canAddMyTheme, myThemeKeys } from '../../lib/themeLibrary'
import { COLLAGE_TILE_COUNT } from '../../lib/randomTheme'
import { backgroundFromBase, generateColorScale, generateLightNeutralScale, generateDarkColorScale, generateFamilyDarkScale } from '../../lib/colorUtils'
import { useEntitlement } from '../../lib/useEntitlement'
import { addBrandFromPayload } from '../../lib/importBrand'
import { useAccess, useNeedsProForAnotherTheme } from '../../lib/access'
import { useI18n } from '../../lib/i18n'
import { resetThemeSemantics } from '../../lib/stylePreviewOverlay'
import { SETUP_STEPS, finishThemeSetup, forgetUnsavedBrand, markBrandUnsaved, useThemeSetup } from '../../lib/themeSetup'
import { flushLibraryAutosave, useUnsavedBrands } from '../../lib/libraryStatus'
import { FolderIcon } from './VariableCollectionRail'
import { InspectorPortal } from './WorkspaceInspector'
import { INSPECTOR_TABS_H } from './themeWorkspaceLayout'
import type { GridViewport } from '../../lib/layoutTokens'
import { MintedThemeIdentity, ThemeForm, type CreateDraft } from './ThemePanel'
import { SystemCollage } from '../preview/artefacts/SystemCollage'
import { ComponentCoversGrid } from './docs/ComponentAvatars'
import { BoardViewSwitch, boardTabId, type BoardView } from './BoardViewSwitch'
import ThemeQuickSettingsRail from './ThemeQuickSettingsRail'
import { AccountCloudStatus } from './AccountCloudStatus'
import { CreateStudioFooter, type ShipActions } from './ThemeSaveBar'
import { useTheme } from '../../lib/theme'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DeleteMyThemesConfirmation,
  LibraryOptionsIcon,
} from './ThemeLibraryRail'
import { UpgradeToProDialog } from './UpgradeToProNotice'
import SystemDashboard from './dashboard/SystemDashboard'
import { DEFAULT_DOC_KEY } from './dashboard/dashboardData'
import type { DocsExits } from './docs/getStarted'
import type { ThemeAppearance } from '../../lib/themeModes'
import { DASH_PAGE_LABEL, type DashPage } from './dashboard/dashboardData'
import { NavGroup, NavRow } from './dashboard/parts'
import { otherDesignSystems } from '../../lib/savedSystemList'

// HOME — the design system on screen, as its dashboard (`systemOnly`, the
// Generator's `system` tab, first in the rail and labelled "Home"). Each brand
// is a column on Overview; Add brand, Export all and the ⋯ menu sit in the
// header; the right panel lists the pages and every design system
// (`DesignSystemsNav`) — the ONLY door to the others.
//
// The same component also hosts the CREATE STUDIO (the internal `library` tab,
// `creating` / `studioOnly`). The old Home file browser (Recents, System
// styles, folders, Pinned) was removed: design-plans/home-into-system.md.

const noop = () => {}
/** Home never draws Docs; the System tab passes the real exits. */
const NO_DOCS_EXITS: DocsExits = { onOpenFigmaDownload: noop, onOpenFigmaSync: noop, onOpenExport: noop, onOpenSave: noop, onOpenGithub: noop }

function useTimeAgo(): (iso: string) => string {
  const { t } = useI18n()
  return (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return t('just now')
    if (s < 3600) return t('{n}m ago', { n: Math.floor(s / 60) })
    if (s < 86400) return t('{n}h ago', { n: Math.floor(s / 3600) })
    return t('{n}d ago', { n: Math.floor(s / 86400) })
  }
}

// ── Glyphs (nav) ─────────────────────────────────────────────────────────────
const svg = (d: string) => () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)
const PlusGlyph = svg('M12 5v14M5 12h14')
// ── Theme card ───────────────────────────────────────────────────────────────

// ── Header pieces ────────────────────────────────────────────────────────────

/** Library ⋯ — Reset and Delete my themes. */
function LibraryOptions({ hasOwnThemes, onReset, onDeleteMyThemes, onDeleteSystem }: {
  hasOwnThemes: boolean
  onReset?: () => void
  onDeleteMyThemes: () => void
  onDeleteSystem: () => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
  const item = 'flex h-8 w-full items-center rounded-md px-2.5 text-left text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset'
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('Design system options')}
        title={t('Design system options')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${open ? 'bg-elevated text-fg' : ''}`}
      >
        <LibraryOptionsIcon />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            aria-label={t('Design system options')}
            className="absolute right-0 top-full z-[60] mt-1.5 w-48 origin-top-right overflow-hidden rounded-lg border border-line-strong bg-app p-1.5 shadow-xl"
          >
            {onReset && (
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onReset() }} className={`${item} text-fg-muted hover:bg-elevated hover:text-fg focus-visible:ring-accent-ui/50`}>
                {t('Reset')}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              disabled={!hasOwnThemes}
              onClick={() => { setOpen(false); onDeleteMyThemes() }}
              className={`${item} text-status-danger hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-status-danger/50`}
            >
              {t('Delete my brands')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onDeleteSystem() }}
              className={`${item} text-status-danger hover:bg-status-danger/10 focus-visible:ring-status-danger/50`}
            >
              {t('Delete design system')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Adds a brand to the system on screen. Sits beside the options menu, on the
 *  Brands page, because that is where the brands are listed. */
function AddBrandButton({ onClick, disabled, title }: { onClick: () => void; disabled: boolean; title?: string }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? t('Add brand')}
      className={`inline-flex h-8 items-center gap-2 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:opacity-90'
      }`}
    >
      <PlusGlyph />
      {t('Add brand')}
    </button>
  )
}

/** Pins to the top of the Home card — same band as Theme preview's canvas
 *  header. Transparent fill; the file list scrolls under it. */
function HomeStickyBar({ trail, action }: { trail: string; action?: ReactNode }) {
  return (
    <div
      className="flex flex-shrink-0 items-center gap-3 border-b border-line bg-transparent px-8 dark:border-white/[0.08]"
      style={{ height: INSPECTOR_TABS_H }}
    >
      <h1 className="min-w-0 flex-1 truncate text-left text-title font-semibold text-fg">{trail}</h1>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ── Library rows (saved copies) ──────────────────────────────────────────────

// ── Left-column menu (inspector home slot) ───────────────────────────────────

const CREATE_STEPS = [
  { key: 'color', label: 'Color' },
  { key: 'typography', label: 'Font' },
  { key: 'radius', label: 'Radius' },
  { key: 'sizes', label: 'Spacing' },
  { key: 'shadow', label: 'Shadow' },
  { key: 'icons', label: 'Icons' },
] as const
type CreateStep = (typeof CREATE_STEPS)[number]['key']

/** A theme key that is never persisted. The colour step paints the board from it. */
const CREATE_DRAFT_KEY = '__create-draft'

function scratchPreviewStore(store: ReturnType<typeof useDesignStore.getState>, draft: CreateDraft) {
  const { slots, kind, tint, shift, foundations, semantics } = draft
  const light = backgroundFromBase(slots.gray, 'light', tint)
  const dark = backgroundFromBase(slots.gray, 'dark', tint)
  const alg = store.colorAlgorithm
  const gen = (hex: string, neutral = false) =>
    neutral ? generateLightNeutralScale(hex, alg, shift, light, tint) : generateColorScale(hex, alg, shift, light, 'light')
  const genDark = (hex: string, neutral = false) =>
    neutral
      ? generateDarkColorScale(hex, alg, shift, dark, tint)
      : generateFamilyDarkScale(hex, alg, shift, dark)
  return {
    ...store,
    neutralTint: tint,
    pageBackground: light,
    darkBackground: dark,
    primaryColor: slots.brand,
    grayBaseColor: slots.gray,
    errorColor: slots.error,
    warningColor: slots.warning,
    successColor: slots.success,
    infoColor: slots.info,
    primaryScale: gen(slots.brand),
    primaryDarkScale: genDark(slots.brand),
    grayLightScale: gen(slots.gray, true),
    grayDarkScale: genDark(slots.gray, true),
    errorScale: gen(slots.error),
    errorDarkScale: genDark(slots.error),
    warningScale: gen(slots.warning),
    warningDarkScale: genDark(slots.warning),
    successScale: gen(slots.success),
    successDarkScale: genDark(slots.success),
    infoScale: gen(slots.info),
    infoDarkScale: genDark(slots.info),
    themeKinds: { ...store.themeKinds, [CREATE_DRAFT_KEY]: kind },
    themeFoundations: foundations
      ? { ...store.themeFoundations, [CREATE_DRAFT_KEY]: foundations }
      : store.themeFoundations,
    architectureOverrides: semantics
      ? resetThemeSemantics(store.architectureOverrides, semantics, CREATE_DRAFT_KEY)
      : store.architectureOverrides,
  }
}

/** The studio's title lives on the CANVAS, not in the inspector: it names the
 *  screen, and the inspector is the tool you use on it. The number is the step
 *  the footer counts, so the two never disagree. The hint is behind "?" —
 *  one sentence nobody needs twice. */
function CreateBoardHeader({ title, stepLabel, lead, trailing }: {
  title: string
  stepLabel: string
  /** The board's view switch. It leads, as in the Generator's header. */
  lead?: ReactNode
  /** The Inspector toggle, on the right as in the Generator's header. */
  trailing?: ReactNode
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center gap-4 border-b border-line px-5"
      style={{ minHeight: INSPECTOR_TABS_H }}
    >
      {lead}
      <h2 className="flex min-w-0 flex-1 items-baseline gap-2 text-ui font-semibold text-fg">
        <span className="truncate">{title}</span>
        <span className="flex-shrink-0 font-normal text-fg-muted">· {stepLabel}</span>
      </h2>
      {trailing}
    </div>
  )
}

function CreateBoard({
  store, themeKey, appearance, title, stepLabel, platform = 'desktop', onOpenComponent,
}: {
  /** Components view: a cover's ↗ opens that component's page. Only once the
   *  brand exists — a draft has no page to show it on. */
  onOpenComponent?: (key: string) => void
  store: ReturnType<typeof useDesignStore.getState>
  /** The studio's platform switch: the board resolves against this viewport. */
  platform?: GridViewport
  themeKey: string
  appearance: 'light' | 'dark'
  title: string
  stepLabel: string
}) {
  // What the board shows: the bento board, or every component as a cover.
  // Light / Dark is the panel's Theme row — the board has no second toggle.
  const [view, setView] = useState<BoardView>('theme')
  // Inspector mode, as in the Generator: on by default, so pointing at a
  // component names the tokens that paint it while the brand is being made.
  // There is no Token Details here, so the list is read-only (no `onPick`).
  const [inspecting, setInspecting] = useState(true)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const panelId = `create-board-${useId().replace(/:/g, '')}`
  const tokensByAppearance = useMemo(() => ({
    light: resolvePreviewTokens(store, themeKey, 'light', platform),
    dark: resolvePreviewTokens(store, themeKey, 'dark', platform),
  }), [store, themeKey, platform])
  const stage = tokensByAppearance[appearance]
  const tiles = useMemo(
    () => Array.from({ length: COLLAGE_TILE_COUNT }, () => appearance),
    [appearance],
  )
  const page = stage.archTokens?.['surface.page'] ?? stage.pageBackground ?? stage.surface
  return (
    <div className={`flex min-h-0 flex-1 flex-col ${appearance === 'dark' ? 'dark' : 'light'}`} style={{ background: page }}>
      <CreateBoardHeader
        title={title}
        stepLabel={stepLabel}
        lead={<BoardViewSwitch value={view} onChange={setView} panelId={panelId} />}
        trailing={<InspectorToggle active={inspecting} onChange={setInspecting} accent={stage.brandSolid} ink={stage.onBrand} />}
      />
      <div ref={canvasRef} id={panelId} role="tabpanel" aria-labelledby={boardTabId(panelId, view)} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div style={inspecting ? { cursor: 'crosshair' } : undefined}>
        <InspectorModeProvider active={inspecting}>
        {view === 'theme' ? (
          <SystemCollage
            layout={platform === 'desktop' ? 'board' : 'phones'}
            frameTokens={stage}
            tokensByAppearance={tokensByAppearance}
            tileAppearances={tiles}
            projectName={store.projectName}
          />
        ) : (
          <ComponentCoversGrid tokens={stage} onOpen={onOpenComponent ? (def) => onOpenComponent(def.key) : undefined} />
        )}
        </InspectorModeProvider>
        </div>
      </div>
      <InspectorOverlay
        active={inspecting}
        rootRef={canvasRef}
        tokensByAppearance={tokensByAppearance}
        defaultAppearance={appearance}
        onExitMode={() => setInspecting(false)}
      />
    </div>
  )
}

/**
 * Home's right panel, under the pages: every design system this account holds.
 * The one on screen is lit; another loads in place (asking first only when the
 * one on screen holds work that is not kept anywhere). This is the ONLY door to
 * the other systems — the old Home file browser is gone
 * (design-plans/home-into-system.md).
 */
function DesignSystemsNav({ onNewSystem }: { onNewSystem: () => void }) {
  const { t } = useI18n()
  const store = useDesignStore()
  const { guest } = useAccess()
  const unsavedBrands = useUnsavedBrands()
  const [pendingLoad, setPendingLoad] = useState<string | null>(null)
  const currentId = activeLibraryId(store)
  const others = otherDesignSystems(store.savedSystems, store)
  const mine = myThemeKeys(store.themeOrder, store.themes)
  // A guest has one system in this browser and nowhere to keep a second.
  if (guest && others.length === 0) return null
  const load = (id: string) => {
    flushLibraryAutosave()
    store.loadSystem(id)
    setPendingLoad(null)
  }
  const requestLoad = (id: string) => {
    // The system on screen is kept (saved, nothing still a draft): switching
    // loses nothing, so there is nothing to confirm.
    const kept = mine.length === 0
      || (store.savedSystems.some((sys) => sys.id === currentId) && !mine.some((key) => unsavedBrands.has(key)))
    if (kept) load(id)
    else setPendingLoad(id)
  }
  const iconBtn = 'flex h-6 w-6 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  return (
    <NavGroup
      label={t('Design systems')}
      action={(
        <button type="button" onClick={onNewSystem} aria-label={t('New design system')} title={t('New design system')} className={iconBtn}><PlusGlyph /></button>
      )}
    >
      <NavRow
        on
        icon={<FolderIcon size={13} />}
        label={store.projectName}
        title={t('{name} — the design system on screen', { name: store.projectName })}
        onClick={() => setPendingLoad(null)}
      />
      {others.map((sys) => (
        <div key={sys.id} className="flex flex-col gap-1">
          <NavRow
            on={false}
            icon={<FolderIcon size={13} />}
            label={sys.name}
            title={t('Open {name}', { name: sys.name })}
            onClick={() => requestLoad(sys.id)}
          />
          {pendingLoad === sys.id && (
            <div className="mx-1 mb-1 flex flex-col gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2">
              <span className="text-micro leading-relaxed text-fg-muted">{t('Replace what is on screen?')}</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => load(sys.id)} className="text-caption font-semibold text-accent-ui hover:underline">{t('Load')}</button>
                <button type="button" onClick={() => setPendingLoad(null)} className="text-caption text-fg-faint hover:text-fg">{t('Cancel')}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </NavGroup>
  )
}

// ── System styles ────────────────────────────────────────────────────────────

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ThemeLibraryPage({
  previewTheme,
  onSelectTheme,
  onOpenPreview,
  onGuestBrandCreated,
  onGetCode,
  onGetAgentContext,
  onShip,
  onExportBrand,
  onExportAll,
  onSyncFigma,
  onShareGithub,
  onCreateTheme,
  createPending = false,
  onCreateHandled,
  onOpenReset,
  onNewSystem,
  onEditFoundation,
  onOpenBrand,
  onOpenColorTheme,
  onCreatingChange,
  studioOnly = false,
  onOpenComponent,
  systemOnly = false,
  onEditRole,
  systemPlace,
  onSystemPlace,
  previewAppearance = 'light',
  docsExits,
}: {
  previewTheme: string
  /** Make this the theme every other page reads, without leaving Home. */
  onSelectTheme: (key: string) => void
  onOpenPreview: (key: string) => void
  /** Finish (or Skip setup) kept a brand for a visitor with no account. */
  onGuestBrandCreated?: (key: string) => void
  onGetCode: (key: string) => void
  /** The Code tab on Agent context for that brand (Home's column menu). */
  onGetAgentContext?: (key: string) => void
  /** The create studio footer's three doors out for the brand it just made. */
  onShip?: (key: string) => ShipActions
  /** Home's brand column Export: the wizard scoped to that brand. Falls back to Code. */
  onExportBrand?: (key: string) => void
  /** Home's Export all: the wizard with every brand checked (the bundle). */
  onExportAll?: () => void
  /** A brand column's Export menu → Sync with Figma for that brand. */
  onSyncFigma?: (key: string) => void
  /** Preview the theme and open the GitHub page. */
  onShareGithub: (key: string) => void
  /** Opens the theme sheet on its create view (owned by the shell). */
  onCreateTheme: () => void
  /** Another door asked to create a theme: open the form, then report back. */
  createPending?: boolean
  onCreateHandled?: () => void
  /** The Reset modal (this theme / whole system), owned by the shell. */
  onOpenReset?: () => void
  /** Opens the guided New-system modal (owned by the shell). */
  onNewSystem: () => void
  /** "Go to advanced edition" leaves the studio for that foundation's table. */
  onEditFoundation?: (foundationKey: string) => void
  /** Overview's Color card opens the brand preview. */
  onOpenBrand?: () => void
  /** A theme chip on Brands opens Variables · Color for that brand in that appearance. */
  onOpenColorTheme?: (brand: string, appearance: 'light' | 'dark') => void
  /** Create studio uses the right inspector; Home's left file menu must yield. */
  onCreatingChange?: (creating: boolean) => void
  /** A visitor with no account and no theme: only the create studio is shown,
   *  never the file list, and there is nothing to cancel back to. */
  studioOnly?: boolean
  /** Dashboard: open a component's own page. */
  onOpenComponent?: (key: string) => void
  /** The Generator's System tab: only the dashboard of the design system on
   *  screen, with its menu in the inspector. Home's file list is not drawn. */
  systemOnly?: boolean
  /** System tab: gate the role editor. Return `false` to keep it closed. */
  onEditRole?: (roleId: string) => boolean | void
  /** The dashboard's open page and Docs page, held by the shell so the tab resumes where it was. */
  systemPlace?: { page: DashPage; doc: string }
  onSystemPlace?: (next: { page: DashPage; doc: string }) => void
  /** Docs paints the brand's ramps in this appearance. */
  previewAppearance?: ThemeAppearance
  docsExits?: DocsExits
}) {
  const { t } = useI18n()
  const timeAgo = useTimeAgo()
  const { guest, tier } = useAccess()
  // How many brands this plan holds — the Overview's empty slot states it.
  const { maxThemes } = useEntitlement()
  const needsPro = useNeedsProForAnotherTheme()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const store = useDesignStore()
  const chromeAppearance = useTheme() === 'dark' ? 'dark' : 'light'
  const [creating, setCreating] = useState(studioOnly)
  const [identityHost, setIdentityHost] = useState<HTMLDivElement | null>(null)
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null)
  const onDraftChange = useCallback((draft: CreateDraft) => setCreateDraft(draft), [])
  const [createStep, setCreateStep] = useState<CreateStep>('color')
  const [studioPlatform, setStudioPlatform] = useState<GridViewport>('desktop')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const pendingStep = useRef<CreateStep | null>(null)
  const submitHandle = useRef<(() => void) | null>(null)
  // The embedded rail's Random, for the footer's die.
  const randomHandle = useRef<(() => void) | null>(null)
  const skipHandle = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (creating) return
    setCreateStep('color')
    setCreatedKey(null)
    setCreateError(null)
    setCreateDraft(null)
    pendingStep.current = null
  }, [creating])
  useEffect(() => {
    onCreatingChange?.(creating)
    return () => onCreatingChange?.(false)
  }, [creating, onCreatingChange])
  useEffect(() => {
    if (!createPending) return
    onCreateHandled?.()
    if (needsPro) { setUpgradeOpen(true); return }
    onCreatingChange?.(true)
    setCreating(true)
  }, [createPending, onCreateHandled, needsPro, onCreatingChange])
  const { themeOrder, themes, removeTheme } = store
  const mine = myThemeKeys(themeOrder, themes)
  // Brands made here and not saved yet stay out of the design system's own
  // views (its card, its dashboard) until the designer saves.
  const unsavedBrands = useUnsavedBrands()
  // Refresh in the guest studio: Colour already minted a draft. Resume that
  // brand instead of starting a second Colour step on top of it.
  useEffect(() => {
    if (!studioOnly || createdKey) return
    const key = mine.find((item) => unsavedBrands.has(item))
    if (!key) return
    setCreatedKey(key)
    const at = useThemeSetup.getState().drafts[key]
    const step = at != null ? SETUP_STEPS[at] : 'color'
    if (step && CREATE_STEPS.some((item) => item.key === step)) setCreateStep(step)
  }, [studioOnly, createdKey, mine, unsavedBrands])
  const savedMine = mine.filter((key) => !unsavedBrands.has(key))
  // The design system on screen opens as a dashboard; this is its open page.
  // Kept while Home is open, so coming back resumes on the same page.
  const [localPlace, setLocalPlace] = useState<{ page: DashPage; doc: string }>({ page: 'overview', doc: DEFAULT_DOC_KEY })
  const place = systemPlace ?? localPlace
  const setPlace = onSystemPlace ?? setLocalPlace
  const dashPage = place.page
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmDeleteSystem, setConfirmDeleteSystem] = useState(false)
  const deleteTheme = (key: string) => {
    if (key === previewTheme) {
      const next = mine.find((k) => k !== key) ?? themeOrder.find((k) => k !== key && themes[k])
      if (next) onSelectTheme(next)
    }
    removeTheme(key)
  }
  // A brand that was never saved does not outlive the screen it was made on:
  // opening Home drops whatever draft is left behind, so Recently and the
  // system never disagree about what exists.
  const draftCleanupRef = useRef(false)
  useEffect(() => {
    if (draftCleanupRef.current || systemOnly || studioOnly || creating) return
    draftCleanupRef.current = true
    const stale = mine.filter((key) => unsavedBrands.has(key))
    stale.forEach((key) => {
      finishThemeSetup(key)
      forgetUnsavedBrand(key)
      deleteTheme(key)
    })
    Object.keys(useThemeSetup.getState().unsaved)
      .filter((key) => !mine.includes(key))
      .forEach((key) => forgetUnsavedBrand(key))
    useDesignStore.getState().reconcileSavedSystems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const deleteMyThemes = () => {
    const fallback = themeOrder.find((k) => !mine.includes(k) && themes[k])
    if (mine.includes(previewTheme) && fallback) onSelectTheme(fallback)
    mine.forEach((key) => removeTheme(key))
    setConfirmDeleteAll(false)
  }

  const homeTrail = `${store.projectName} · ${t(DASH_PAGE_LABEL[dashPage])}`

  // Home is the design system on screen, as its dashboard: each brand is a
  // column on Overview, Add brand is the last one, and the right panel lists
  // the other design systems (design-plans/home-into-system.md).
  const body: ReactNode = (
      <SystemDashboard
        page={dashPage}
        onPage={(page) => setPlace({ ...place, page })}
        docKey={place.doc}
        onDocKey={(doc) => setPlace({ page: 'docs', doc })}
        brand={previewTheme}
        appearance={previewAppearance}
        docsExits={docsExits ?? NO_DOCS_EXITS}
        navExtra={<DesignSystemsNav onNewSystem={onNewSystem} />}
        timeAgo={timeAgo}
        onOpenGithub={() => onShareGithub(previewTheme)}
        onEditFoundation={onEditFoundation}
        onOpenBrand={onOpenBrand}
        onOpenColorTheme={onOpenColorTheme}
        onSelectBrand={onSelectTheme}
        onEditBrand={onOpenPreview}
        onEditRole={onEditRole}
        onOpenComponent={onOpenComponent}
        onExportBrand={onExportBrand ?? onGetCode}
        // CSS · Figma · Agent open in the inspector (`onShip`); the pages are
        // the fallback where no shell provides the panel.
        brandExport={onShip
          ? { all: onExportAll, code: (k) => onShip(k).css(), figma: (k) => onShip(k).figma(), agent: (k) => onShip(k).agent(), github: onShareGithub }
          : { all: onExportAll, figma: onSyncFigma, code: onGetCode, agent: onGetAgentContext, github: onShareGithub }}
        onAddBrand={onCreateTheme}
        onImportBrand={(json, name) => {
          const res = addBrandFromPayload(json, name)
          if ('error' in res) return res
          // Kept like a brand the studio makes (saved to the account when there
          // is one), and put on screen so its card is the one lit.
          keepCreatedBrand(res.key)
          onSelectTheme(res.key)
          return res
        }}
        addBrandBlocked={canAddMyTheme(mine.length) ? undefined : t(MY_THEME_FULL_ERROR, { count: mine.length })}
        maxBrands={maxThemes}
        overviewHeader={() => (
          <>
            {confirmDeleteSystem && (
              <div className="flex max-w-md flex-wrap items-center gap-x-3 gap-y-1 self-end rounded-lg border border-line bg-surface px-3 py-2">
                <span className="text-caption text-fg-muted">
                  {mine.length > 0
                    ? t('Delete “{name}” and its {n} brands? This cannot be undone.', { name: store.projectName, n: mine.length })
                    : t('Delete “{name}”? It has no brands.', { name: store.projectName })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteSystem(false)
                    store.deleteCurrentSystem()
                  }}
                  className="text-caption font-semibold text-status-danger hover:underline"
                >
                  {t('Delete')}
                </button>
                <button type="button" onClick={() => setConfirmDeleteSystem(false)} className="text-caption text-fg-faint hover:text-fg">{t('Cancel')}</button>
              </div>
            )}
            <AnimatePresence initial={false}>
              {confirmDeleteAll && (
                <div className="max-w-sm self-end">
                  <DeleteMyThemesConfirmation
                    count={mine.length}
                    onCancel={() => setConfirmDeleteAll(false)}
                    onConfirm={deleteMyThemes}
                  />
                </div>
              )}
            </AnimatePresence>
            <AccountCloudStatus />
          </>
        )}
      />
  )


  const onColorCommitted = (key: string) => {
    // Made here, not saved yet: the System tab and Variables wait for Save.
    markBrandUnsaved(key)
    setCreatedKey(key)
    const jump = pendingStep.current
    pendingStep.current = null
    setCreateStep(jump && jump !== 'color' ? jump : 'typography')
  }
  // Leaving the studio forward (Finish, Skip setup, the advanced editor) keeps
  // the brand. While it stayed a draft, the empty-board guard reopened the
  // studio on Colour — Finish jumped back to the first step. The library write
  // still waits for an account; a guest saves from the brand's own bar.
  const keepCreatedBrand = (key: string) => {
    finishThemeSetup(key)
    forgetUnsavedBrand(key)
    if (tier === 'anon') return
    useDesignStore.getState().saveCurrentSystem()
  }
  const finishCreate = (key: string) => {
    keepCreatedBrand(key)
    setCreating(false)
    onOpenPreview(key)
    if (guest) onGuestBrandCreated?.(key)
  }
  /** Leave the studio and drop the theme if Colour already minted one. */
  const cancelCreate = () => {
    if (createdKey) {
      finishThemeSetup(createdKey)
      forgetUnsavedBrand(createdKey)
      deleteTheme(createdKey)
    }
    setCreating(false)
  }
  const createIndex = CREATE_STEPS.findIndex((item) => item.key === createStep)
  // The first system this browser makes: the studio says so, and what is on
  // the board is a draft until Create brand.
  const firstSystem = mine.every((key) => key === createdKey)
  const getCreatedCode = (key: string) => {
    keepCreatedBrand(key)
    setCreating(false)
    onGetCode(key)
  }
  /** Every door out of the studio keeps the brand first, like Get code did. */
  const shipCreated = (key: string): ShipActions | undefined => {
    const ship = onShip?.(key)
    if (!ship) return undefined
    const leave = (go: () => void) => () => { keepCreatedBrand(key); setCreating(false); go() }
    return { css: leave(ship.css), figma: leave(ship.figma), agent: leave(ship.agent) }
  }
  const openAdvanced = (foundation: string) => {
    if (!createdKey) return
    keepCreatedBrand(createdKey)
    onSelectTheme(createdKey)
    setCreating(false)
    onEditFoundation?.(foundation)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {creating ? (
        <>
          <InspectorPortal>
            <div className="flex h-full min-h-0 flex-col">
              {/* The name sits on the same band the canvas title used to share. */}
              <div
                ref={setIdentityHost}
                className="flex flex-shrink-0 items-center border-b border-line"
                style={{ height: INSPECTOR_TABS_H }}
              >
                {/* Once the brand exists its name lives here on every row,
                    Color included. Before that, ThemeForm portals its own
                    name field into this band (pinIdentity). */}
                {createdKey && (
                  <div className="w-full px-3"><MintedThemeIdentity themeKey={createdKey} showAppearance={false} /></div>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {!createdKey ? (
                  <ThemeForm
                    key={createdKey ?? 'new'}
                    firstStep
                    holdAfterCreate
                    hideFooter
                    pinIdentity
                    identityHost={identityHost}
                    editKey={createdKey}
                    submitHandle={submitHandle}
                    skipHandle={skipHandle}
                    onErrorChange={setCreateError}
                    appearance={chromeAppearance}
                    onClose={cancelCreate}
                    onCreated={onColorCommitted}
                    onFinishEarly={finishCreate}
                    onDraftChange={onDraftChange}
                  />
                ) : (
                  // Every foundation at once, as an accordion: open any row in
                  // any order. There are no steps left to walk.
                  <ThemeQuickSettingsRail
                    embed
                    randomHandle={randomHandle}
                    key={createdKey}
                    previewTheme={createdKey}
                    previewAppearance={store.themeKinds[createdKey] === 'dark' ? 'dark' : 'light'}
                    activePanel={createStep}
                    onSelectPanel={setCreateStep}
                    onOpenAdvanced={openAdvanced}
                    previewPlatform={studioPlatform}
                    onPreviewPlatformChange={setStudioPlatform}
                  />
                )}
              </div>
              <CreateStudioFooter
                error={createError}
                committed={Boolean(createdKey)}
                guest={guest}
                // The first system has nothing to go back to: Cancel would only
                // drop the user on an empty Home.
                onCancel={studioOnly || firstSystem ? undefined : cancelCreate}
                firstSystem={firstSystem}
                onCreate={() => submitHandle.current?.()}
                onSave={() => { if (createdKey) finishCreate(createdKey) }}
                onGetCode={() => { if (createdKey) getCreatedCode(createdKey) }}
                ship={createdKey ? shipCreated(createdKey) : undefined}
                onRandom={() => randomHandle.current?.()}
              />
            </div>
          </InspectorPortal>
          <CreateBoard
            store={createdKey ? store : (createDraft ? scratchPreviewStore(store, createDraft) : store)}
            platform={createdKey ? studioPlatform : 'desktop'}
            themeKey={createdKey ?? CREATE_DRAFT_KEY}
            appearance={createdKey
              ? (store.themeKinds[createdKey] === 'dark' ? 'dark' : 'light')
              : (createDraft?.kind ?? 'dark')}
            title={firstSystem ? t('Customize your design system') : t('New brand')}
            stepLabel={t(CREATE_STEPS[Math.max(0, createIndex)].label)}
            onOpenComponent={createdKey ? onOpenComponent : undefined}
          />
        </>
      ) : !systemOnly ? null : (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <HomeStickyBar
          trail={homeTrail}
          action={(
            <div className="flex items-center gap-2">
              {dashPage === 'overview' && (
                <AddBrandButton
                  onClick={onCreateTheme}
                  disabled={!canAddMyTheme(mine.length)}
                  title={canAddMyTheme(mine.length) ? undefined : t(MY_THEME_FULL_ERROR, { count: mine.length })}
                />
              )}
              <LibraryOptions
                hasOwnThemes={savedMine.length > 0}
                onReset={onOpenReset}
                onDeleteMyThemes={() => setConfirmDeleteAll(true)}
                onDeleteSystem={() => setConfirmDeleteSystem(true)}
              />
            </div>
          )}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          {dashPage === 'docs' ? (
            // A Docs article scrolls itself and sets its own column.
            <div className="h-full min-h-0">{body}</div>
          ) : (
            <div className="h-full min-h-0 overflow-y-auto">
              <div className="flex w-full min-w-0 flex-col gap-8 px-5 pb-7 pt-6">{body}</div>
            </div>
          )}
        </div>
      </div>
      )}
      <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
