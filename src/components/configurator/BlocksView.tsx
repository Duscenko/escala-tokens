// Blocks — the Figma file's composed blocks (Auth · Marketing · Navigation ·
// Overlay), drawn live with the brand on screen. Same shape as Components:
// [icon rail] [page CARD] [directory]; the directory is `BlocksRail`.
//
// The index shows every block as a card (a scaled picture of the real block).
// A block's page is a component page's stage: the tool bar at its foot (Edit
// theme · Block settings · Inspector · Light / Dark · zoom) and the block's
// controls in the right-hand panel (the story's args: Container, Status,
// Layout…, plus the Desktop · Tablet · Mobile frame), the real dialog for an
// Overlay block, then what its contract says: the components it is built
// from, accessibility and motion.
//
// The Screens tab is this same view (`catalogue="screens"`): a screen's page is a
// block's page, and the pieces the screen is made of sit on it as its parts.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { usePreviewTokens } from '../../lib/previewTokens'
import { useDesignStore } from '../../store/useDesignStore'
import type { GridViewport } from '../../lib/layoutTokens'
import type { ThemeAppearance } from '../../lib/themeModes'
import { COMPONENTS, type ComponentDef } from '../../lib/componentCatalogue'
import { cssVarOf } from '../../lib/componentRecipes'
import { PLATFORM_FOLDERS, familiesIn, isPlatformComponent } from '../../lib/platformCatalogue'
import { RecipeScope } from './docs/skeleton/scope'
import { FittedSpecimen } from './docs/ComponentAvatars'
import { SectionHeading } from './docs/blocks'
import { CatalogueSwitcher } from './docs/CatalogueSwitcher'
import { PreviewStage } from './docs/PreviewStage'
import { StageActions } from './docs/stageActions'
import { FigmaLinkButton } from './docs/FigmaLinkButton'
import { figmaPreviewPageUrl } from '../../lib/figmaPreviewPages'
import { StorybookLinkButton } from './docs/StorybookLinkButton'
import { blockStorybookUrl } from '../../lib/storybookLinks'
import { CanvasBar, CanvasSidePanel, readInspectPref, writeInspectPref, type CanvasFrameOption, type CanvasPanel } from './docs/componentArticle'
import { PickerField } from '../ui/PickerField'
import { InspectorModeProvider, InspectorOverlay, inspectGroupAttrs } from '../preview/artefacts/TokenInspector'
import SemanticTokenDrawer from './SemanticTokenGroups'
import ThemeQuickSettingsRail, { type QuickPanelFoundation } from './ThemeQuickSettingsRail'
import { AuthDeviceFrameContext } from '../escala-ui/blocks/auth'
import { DESKTOP_FRAME, DesktopWindow, PHONE_FRAME, PhoneFrame, TABLET_FRAME } from '../escala-ui/blocks/frames'
import { LISTED_BLOCKS, blockDefaults, blocksIn, catalogue, catalogueOf, matchesBlock, partsOf, stageBlockValues, type BlockCatalogue, type BlockDef } from './blocks/blockRegistry'

/** The width a wide block is laid out at before a card scales it down. */
const THUMB_LAYOUT_WIDTH = 1200
/** What a block is drawn in. `canvas` is the bare block; the others are the Figma prototypes' device frames. */
type StageFrame = 'canvas' | GridViewport
/** The width a bare block lays out at on the canvas: room for a 480 dialog and its shadow. */
const BARE_LAYOUT_WIDTH = 560
/** Fit never draws a bare block above this: at 1:1 a sign-in card sits in the reader's face. */
const BARE_FIT_CAP = 0.75
const FRAME_LAYOUT_WIDTH: Record<GridViewport, number> = { desktop: DESKTOP_FRAME.width, tablet: TABLET_FRAME.width, mobile: PHONE_FRAME.width }
/** The viewport an Auth block answers to on the stage: the frame's, never the window the platform runs in. */
const PHONE_DEVICE = { tabletUp: false }
const WIDE_DEVICE = { tabletUp: true }

const frameIcon = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
)
const FRAME_ICONS: Record<StageFrame, ReactNode> = {
  canvas: frameIcon('M3 5.5v-2.5h2.5M10.5 3H13v2.5M13 10.5V13h-2.5M5.5 13H3v-2.5M6.5 8h3M8 6.5v3'),
  desktop: frameIcon('M2.5 3.5h11v7.5h-11zM6 13.5h4M8 11v2.5'),
  tablet: frameIcon('M4 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM7.5 12h1'),
  mobile: frameIcon('M5.5 1.75h5a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V2.75a1 1 0 0 1 1-1zM7.5 12.25h1'),
}

/** The block in the frame on the stage. A page section runs edge to edge from the top of the screen; a card or a dialog
 *  sits in its middle. A screen taller than its device scrolls inside it, like the real thing. */
function FramedBlock({ block, values, frame }: { block: BlockDef; values: Record<string, string>; frame: StageFrame }) {
  if (frame === 'canvas') return <div style={{ display: 'flex', justifyContent: 'center' }}>{block.render(values)}</div>
  const layout = frame === 'mobile' ? 'mobile' : 'desktop'
  if (block.mockup && frame !== 'tablet') return <>{block.mockup(values, layout)}</>
  // A plain block has no card of its own: it sits straight on the page.
  const onPage = block.wide || values.container === 'plain'
  const edgeToEdge = block.wide && !(block.phoneInset && frame === 'mobile')
  const page = `var(${cssVarOf(onPage ? 'color.surface.page' : 'color.surface.layer-1')})`
  const screen: CSSProperties = {
    flexDirection: 'column', alignItems: 'stretch', overflowY: 'auto', scrollbarWidth: 'none', background: page,
    ...(edgeToEdge ? null : { padding: `var(${cssVarOf('spacing.inset-surface')})` }),
    ...(frame === 'mobile' ? { paddingBottom: 34 } : null),
  }
  const content = edgeToEdge
    ? <div style={{ flexShrink: 0 }}>{block.render(values)}</div>
    : <div style={{ margin: 'auto 0', flexShrink: 0, display: 'flex', justifyContent: 'center', minWidth: 0 }}>{block.render(values)}</div>
  if (frame === 'mobile') return <PhoneFrame label={`${block.name} in a phone`} screen={screen}>{content}</PhoneFrame>
  return (
    <DesktopWindow label={`${block.name} in a ${frame} window`} screen={screen} size={frame === 'tablet' ? TABLET_FRAME : DESKTOP_FRAME}>
      {content}
    </DesktopWindow>
  )
}

export default function BlocksView({
  catalogue: kind = 'blocks', previewTheme = 'light', active, onSelect, onOpenComponent, onInspectRole, onOpenFoundation, search = '', onClearSearch,
}: {
  /** Blocks or Screens: the same view, two catalogues. */
  catalogue?: BlockCatalogue
  /** A role named by the inspector: opens that token in Variables. */
  onInspectRole?: (roleId: string) => void
  /** The Theme panel's "Go to advanced edition". */
  onOpenFoundation?: (key: string) => void
  previewTheme?: string
  /** null = the index (every block as a card). */
  active: BlockDef | null
  onSelect: (b: BlockDef) => void
  /** Opens a component a block is built from. */
  onOpenComponent?: (c: ComponentDef) => void
  search?: string
  onClearSearch?: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [active])
  return (
    <div ref={scrollRef} data-stage-scroller="" className="h-full min-h-0 overflow-y-auto">
      <motion.div
        key={active?.id ?? 'index'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="pb-8"
      >
        {active
          ? <BlockPage block={active} onSelect={onSelect} previewTheme={previewTheme} onOpenComponent={onOpenComponent} onInspectRole={onInspectRole} onOpenFoundation={onOpenFoundation} />
          : <BlocksIndex kind={kind} previewTheme={previewTheme} onSelect={onSelect} search={search} onClearSearch={onClearSearch} />}
      </motion.div>
    </div>
  )
}

function useAppearance(previewTheme: string): ThemeAppearance {
  const kind = useDesignStore((s) => s.themeKinds[previewTheme])
  return kind === 'dark' ? 'dark' : 'light'
}

// ── Index ────────────────────────────────────────────────────────────────────

const INDEX_COPY: Record<BlockCatalogue, { title: string; lead: string; one: string; many: string; none: string }> = {
  blocks: {
    title: 'Blocks',
    lead: 'Ready-made screens and sections built only from Escala components and your tokens. Open one to try its options and see what it is made of.',
    one: 'block', many: 'blocks', none: 'No blocks match',
  },
  screens: {
    title: 'Screens',
    lead: 'Whole screens composed only from Escala components and your tokens. Each one keeps the pieces it is made of on its own page.',
    one: 'screen', many: 'screens', none: 'No screens match',
  },
}

function BlocksIndex({ kind, previewTheme, onSelect, search, onClearSearch }: {
  kind: BlockCatalogue
  previewTheme: string
  onSelect: (b: BlockDef) => void
  search: string
  onClearSearch?: () => void
}) {
  const { t } = useI18n()
  const appearance = useAppearance(previewTheme)
  const tokens = usePreviewTokens(previewTheme, appearance)
  const groups = catalogue(kind).groups
    .map((g) => ({ g, items: blocksIn(g).filter((b) => matchesBlock(b, search)) }))
    .filter((x) => x.items.length > 0)
  const count = groups.reduce((n, x) => n + x.items.length, 0)
  const copy = INDEX_COPY[kind]
  // One group (Screens) needs no heading of its own: the page's title already names it.
  const single = catalogue(kind).groups.length === 1

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-display font-semibold tracking-tight text-fg">{t(copy.title)}</h1>
        <p className="mt-2 max-w-2xl text-strong leading-relaxed text-fg-muted">
          {t(copy.lead)}
        </p>
        <p className="mt-2 text-caption text-fg-faint">{count} {t(count === 1 ? copy.one : copy.many)}</p>
      </header>
      {count === 0 ? (
        <div role="status" className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line px-6 py-10">
          <p className="text-strong text-fg">{t(copy.none)} “{search.trim()}”.</p>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="h-8 rounded-lg border border-line bg-surface px-3 text-caption font-medium text-fg hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ui"
            >
              {t('Clear search')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(({ g, items }) => (
            <section key={g} className="flex flex-col gap-3">
              {!single && (
                <h2 className="text-strong font-semibold text-fg">
                  {t(g)} <span className="ml-1 text-caption font-normal text-fg-faint">{items.length}</span>
                </h2>
              )}
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                {items.map((b) => (
                  <li key={b.id}>
                    <BlockCard block={b} appearance={appearance} surface={tokens.surface} tokens={tokens} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function BlockCard({ block, appearance, surface, tokens, onSelect }: {
  block: BlockDef
  appearance: ThemeAppearance
  surface: string
  tokens: ReturnType<typeof usePreviewTokens>
  onSelect: (b: BlockDef) => void
}) {
  const { t } = useI18n()
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-accent-ui/50">
      <span
        aria-hidden
        inert
        className={`relative block h-[180px] w-full overflow-hidden border-b border-line ${appearance}`}
        style={{ background: surface }}
      >
        <span className="absolute inset-3 transition-transform duration-200 ease-out group-hover:scale-[1.02]">
          <FittedSpecimen>
            <RecipeScope t={tokens}>
              <div style={{ width: block.wide ? THUMB_LAYOUT_WIDTH : undefined }}>
                {block.render(blockDefaults(block))}
              </div>
            </RecipeScope>
          </FittedSpecimen>
        </span>
      </span>
      <span aria-hidden className="flex flex-col gap-0.5 px-3.5 py-3">
        <span className="truncate text-caption text-fg-faint">{t(block.group)}</span>
        <span className="truncate text-strong font-medium text-fg">{block.name}</span>
      </span>
      <button
        type="button"
        aria-label={`${block.name}, ${t(block.group)}`}
        onClick={() => onSelect(block)}
        className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-none"
      />
    </div>
  )
}

// ── A block's page ───────────────────────────────────────────────────────────
//
// The same page a component has: a stage painted in the brand, the tool bar
// docked at its foot (Edit theme · Block settings · Inspector · Light / Dark ·
// zoom), and the right-hand panel holding the block's controls — its story's
// args and the Desktop · Tablet · Mobile frame. The bar and the panels are the
// component page's own (`CanvasBar`, `CanvasSidePanel`), not a copy.

/** The inspector reads `[data-inspect]` markers. A block is a composition of
 *  recipe components (`[data-escala]`), so while inspecting each of them is
 *  stamped with its own key: pointing at the button inside a sign-in card
 *  traces the Button, pointing between them traces the block as a group. */
function useInspectMarkers(ref: RefObject<HTMLElement | null>, on: boolean) {
  useEffect(() => {
    const root = ref.current
    if (!root || !on) return
    const stamp = () => {
      root.querySelectorAll('[data-escala]').forEach((el) => {
        const key = el.getAttribute('data-escala') ?? ''
        if (el.getAttribute('data-inspect') !== key) el.setAttribute('data-inspect', key)
      })
      // The block's own box (a sign-in card, a pricing card): its fill, border, corner and padding are tokens too.
      root.querySelectorAll('[data-block]:not([data-escala])').forEach((el) => {
        const key = el.getAttribute('data-block') ?? ''
        if (el.getAttribute('data-inspect') !== key) el.setAttribute('data-inspect', key)
      })
    }
    stamp()
    // A control change re-renders the block: new nodes need their marker.
    const observer = new MutationObserver(stamp)
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-escala', 'data-block'] })
    return () => {
      observer.disconnect()
      root.querySelectorAll('[data-inspect]').forEach((el) => el.removeAttribute('data-inspect'))
    }
  }, [ref, on])
}

function BlockPage({ block, onSelect, previewTheme, onOpenComponent, onInspectRole, onOpenFoundation }: {
  block: BlockDef
  onSelect: (b: BlockDef) => void
  previewTheme: string
  onOpenComponent?: (c: ComponentDef) => void
  onInspectRole?: (roleId: string) => void
  onOpenFoundation?: (key: string) => void
}) {
  const { t } = useI18n()
  const kind = catalogueOf(block)
  const screen = kind === 'screens'
  const settingsTitle = t(screen ? 'Screen settings' : 'Block settings')
  const appearance = useAppearance(previewTheme)
  const [values, setValues] = useState(() => blockDefaults(block))
  // A page section opens in its desktop window; a card or a dialog on the bare canvas, as large as it fits.
  const [pickedFrame, setFrame] = useState<StageFrame>(block.wide || block.mockup ? 'desktop' : 'canvas')
  // A plain block has no card to hold it together: alone on the canvas it reads as loose text, so it
  // always shows in a window, like the headers. Back on `card`, the canvas returns.
  const plain = values.container === 'plain'
  const frame: StageFrame = pickedFrame === 'canvas' && plain ? 'desktop' : pickedFrame
  const viewport: GridViewport = frame === 'canvas' ? 'desktop' : frame
  const [open, setOpen] = useState(false)
  // Block settings is home: the block's controls sit beside it, as a
  // component's do. Edit theme returns to it (‹ back, ✕, Esc).
  const [panel, setPanel] = useState<CanvasPanel | null>('settings')
  const closePanel = useCallback(() => setPanel('settings'), [])
  const backToHome = { label: settingsTitle, onBack: closePanel }
  const [quickPanel, setQuickPanel] = useState<QuickPanelFoundation>('color')
  // Only this stage flips Light / Dark; the brand on screen stays.
  const [canvasAppearance, setCanvasAppearance] = useState<ThemeAppearance>(appearance)
  const tokens = usePreviewTokens(previewTheme, canvasAppearance, viewport)
  const [inspecting, setInspecting] = useState(readInspectPref)
  const toggleInspecting = () => {
    const next = !inspecting
    setInspecting(next)
    writeInspectPref(next)
  }
  const [editing, setEditing] = useState<{ id: string; css: string; appearance: ThemeAppearance } | null>(null)
  const [selection, setSelection] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  useInspectMarkers(stageRef, inspecting)

  const stageValues = stageBlockValues(block, values, frame)
  const frameOptions: CanvasFrameOption<StageFrame>[] = ([...(block.wide || block.mockup || plain ? [] : ['canvas']), 'desktop', 'tablet', 'mobile'] as StageFrame[])
    .map((value) => ({ value, icon: FRAME_ICONS[value], label: { canvas: t('Bare canvas'), desktop: t('Desktop'), tablet: t('Tablet'), mobile: t('Mobile') }[value] }))
  const frameSize = frame === 'canvas' ? t('Bare canvas')
    : frame === 'mobile' ? `${t('Mobile')} · iPhone ${PHONE_FRAME.screenWidth} × ${PHONE_FRAME.screenHeight}`
      : frame === 'tablet' ? `${t('Tablet')} · ${TABLET_FRAME.width} × ${TABLET_FRAME.height}`
        : `${t('Desktop')} · ${DESKTOP_FRAME.width} × ${DESKTOP_FRAME.height}`
  const parts = partsOf(block)
  // Where the catalogues meet: Elements → Blocks → Screens, each end leads to its neighbour.
  const lastComponent = PLATFORM_FOLDERS.flatMap((folder) => familiesIn(folder)).at(-1)?.lead
  const lastBlock = LISTED_BLOCKS.at(-1)
  const firstScreen = catalogue('screens').listed[0]
  const contract = block.contract
  const noun = screen ? 'screen' : 'block'
  // What it nests, less its own parts: those are drawn above, with their page.
  const builtFrom = [...new Set(contract?.nests ?? [])].filter((n) => !parts.some((p) => p.name === n))

  return (
    <div className="flex flex-col gap-8">
      <StageActions>
        <CatalogueSwitcher
          noun={noun}
          groups={catalogue(kind).groups.map((g) => ({ label: g, items: blocksIn(g).map((b) => ({ id: b.id, label: b.name })) }))}
          currentId={block.id}
          onPick={(id) => { const b = catalogue(kind).listed.find((x) => x.id === id); if (b) onSelect(b) }}
          bridgePrev={screen
            ? (lastBlock ? { label: t('Blocks'), hint: `${t('Previous')}: ${lastBlock.name}`, onGo: () => onSelect(lastBlock) } : undefined)
            : lastComponent && onOpenComponent
              ? { label: t('Elements'), hint: `${t('Previous')}: ${lastComponent.label}`, onGo: () => onOpenComponent(lastComponent) }
              : undefined}
          bridgeNext={!screen && firstScreen
            ? { label: t('Screens'), hint: `${t('Next')}: ${firstScreen.name}`, onGo: () => onSelect(firstScreen) }
            : undefined}
        />
        <StorybookLinkButton href={blockStorybookUrl(block.id)} />
        <FigmaLinkButton href={figmaPreviewPageUrl(contract?.name ?? block.name, parts.map((p) => p.name))} name={block.name} />
      </StageActions>

      <InspectorModeProvider active={inspecting}>
        <div className={canvasAppearance}>
          <PreviewStage
            rootRef={canvasRef}
            canvasStyle={{ background: tokens.surface, cursor: inspecting ? 'crosshair' : undefined }}
            title={block.name}
            ink={tokens.archTokens?.['content.secondary'] ?? tokens.neutralText}
            fitCap={frame === 'canvas' ? BARE_FIT_CAP : 1}
            contentWidth={frame === 'canvas' ? BARE_LAYOUT_WIDTH : FRAME_LAYOUT_WIDTH[frame]}
            resetKey={frame}
            aside={
              // "Open as dialog" shows the block as the product would: at true
              // size over the page, never at the stage's zoom (owner, 2026-11-17).
              // Its own scope, so its layers portal outside the zoomed stage.
              block.dialog ? <RecipeScope t={tokens}>{block.dialog({ open, onOpenChange: setOpen })}</RecipeScope> : undefined
            }
            bar={(stage) => (
              <CanvasBar
                panel={panel}
                onPanel={setPanel}
                inspecting={inspecting}
                onInspect={toggleInspecting}
                appearance={canvasAppearance}
                onAppearance={setCanvasAppearance}
                hasSettings
                hasContext={false}
                settingsLabel={settingsTitle}
                toolbarLabel={t(screen ? 'Screen tools' : 'Block tools')}
                stage={stage}
                frames={{ value: frame, options: frameOptions, onChange: (v) => setFrame(v as StageFrame) }}
              />
            )}
            status={
              <>
                <span className="min-w-0 truncate">
                  {inspecting
                    ? t(screen ? 'Hover the screen to see the components it is made of and the tokens that paint them.' : 'Hover the block to see the components it is made of and the tokens that paint them.')
                    : t(screen ? 'Inspector off — the screen responds to clicks and typing.' : 'Inspector off — the block responds to clicks and typing.')}
                </span>
                <span className="flex-shrink-0 tabular-nums">{frameSize}</span>
              </>
            }
          >
            <RecipeScope t={tokens}>
              <div ref={stageRef} {...inspectGroupAttrs(inspecting)} className="relative flex flex-col">
                <AuthDeviceFrameContext.Provider value={frame === 'mobile' ? PHONE_DEVICE : WIDE_DEVICE}>
                  <FramedBlock block={block} values={stageValues} frame={frame} />
                </AuthDeviceFrameContext.Provider>
              </div>
            </RecipeScope>
          </PreviewStage>
        </div>
        <InspectorOverlay
          active={inspecting}
          rootRef={canvasRef}
          tokensByAppearance={{ light: tokens, dark: tokens }}
          defaultAppearance={canvasAppearance}
          onPick={(roleId, css, a) => setEditing({ id: roleId, css, appearance: a })}
          onOpenTable={onInspectRole}
          editing={editing != null}
          onSelectionChange={setSelection}
          onExitMode={() => { setInspecting(false); writeInspectPref(false) }}
        />
        <SemanticTokenDrawer
          previewTheme={previewTheme}
          previewAppearance={editing?.appearance ?? canvasAppearance}
          tokenId={editing?.id ?? null}
          inspectedCss={editing?.css ?? null}
          onClose={() => setEditing(null)}
          onOpenInVariables={onInspectRole}
          backLabel={inspecting ? selection : null}
        />
      </InspectorModeProvider>

      {panel === 'settings' && (
        <CanvasSidePanel title={settingsTitle}>
          <div className="flex flex-col gap-2 p-[var(--inspector-inset,12px)]">
            {block.controls.map((c) => (
              <PickerField
                key={c.key}
                label={c.label}
                value={values[c.key] ?? c.default}
                options={c.options.map((o) => ({ value: o, label: o }))}
                onChange={(v) => setValues((prev) => ({ ...prev, [c.key]: v }))}
                searchable={false}
              />
            ))}
            {block.dialog && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ui"
              >
                {t('Open as dialog')}
              </button>
            )}
          </div>
          <p className="px-[var(--inspector-inset,12px)] pb-4 text-mini leading-relaxed text-fg-faint">
            {block.controls.length
              ? t('Same options as the block’s story in Storybook. The frame buttons under the canvas show it on desktop, tablet and phone.')
              : t(screen ? 'This screen has no options of its own. The frame buttons under the canvas show it on desktop, tablet and phone.' : 'This block has no options of its own. The frame buttons under the canvas show it on desktop, tablet and phone.')}
          </p>
        </CanvasSidePanel>
      )}
      {panel === 'theme' && (
        // The Board's own quick edition: change a colour, font or radius and
        // watch the block follow, without leaving it.
        <CanvasSidePanel title={t('Edit theme')} back={backToHome}>
          <ThemeQuickSettingsRail
            embed
            previewTheme={previewTheme}
            previewAppearance={canvasAppearance}
            colorAppearance={canvasAppearance}
            onColorAppearanceChange={setCanvasAppearance}
            activePanel={quickPanel}
            onSelectPanel={setQuickPanel}
            onOpenAdvanced={(key) => onOpenFoundation?.(key)}
          />
        </CanvasSidePanel>
      )}

      <div className="flex max-w-4xl flex-col gap-8 px-6 lg:px-8">
        <div className="flex flex-col gap-1.5">
          <p className="text-caption text-fg-faint">{screen ? t('Screens') : `${t('Blocks')} / ${t(block.group)}`}</p>
          <h1 className="text-heading font-semibold tracking-tight text-fg">{block.name}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">{t(block.description)}</p>
        </div>

        {parts.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading id={screen ? 'parts' : 'complementary'}>{t(screen ? 'Parts' : 'Complementary')}</SectionHeading>
            {screen && (
              <p className="text-ui leading-relaxed text-fg-muted">
                {t('The pieces this screen is made of. They live here, not as loose components in Elements.')}
              </p>
            )}
            {parts.map((part) => (
              <div key={part.id} className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:gap-6">
                <div className={`flex flex-shrink-0 justify-center rounded-lg p-4 ${canvasAppearance}`} style={{ background: tokens.surface }}>
                  <RecipeScope t={tokens}>
                    <div style={{ width: 280 }}>{part.render(blockDefaults(part))}</div>
                  </RecipeScope>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="text-strong font-semibold text-fg">{part.name}</h3>
                  <p className="text-ui leading-relaxed text-fg-muted">{t(part.description)}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {builtFrom.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading id="built-from">{t('Built from')}</SectionHeading>
            <p className="text-ui leading-relaxed text-fg-muted">
              {t(screen ? 'Every part of this screen is an Escala component. Change the brand and the screen follows.' : 'Every part of this block is an Escala component. Change the brand and the block follows.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {builtFrom.map((name) => <NestChip key={name} name={name} onOpen={onOpenComponent} />)}
            </div>
          </section>
        )}

        {contract && contract.a11y.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <SectionHeading id="accessibility">{t('Accessibility')}</SectionHeading>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-ui leading-relaxed text-fg-muted">
              {contract.a11y.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>
        )}

        {contract && contract.motion.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <SectionHeading id="motion">{t('Motion')}</SectionHeading>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-ui">
                <thead className="bg-surface/60 text-caption text-fg-faint">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Moment')}</th>
                    <th className="px-3 py-2 font-medium">{t('Role')}</th>
                    <th className="px-3 py-2 font-medium">{t('Reduced motion')}</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.motion.map((m) => (
                    <tr key={m.moment} className="border-t border-line align-top">
                      <td className="px-3 py-2 text-fg">{m.moment}<span className="block text-caption text-fg-faint">{m.mechanism}</span></td>
                      <td className="px-3 py-2 font-mono text-caption text-fg-muted">{m.role}</td>
                      <td className="px-3 py-2 text-fg-muted">{m.reduced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {contract && (
          <section className="flex flex-col gap-2.5">
            <SectionHeading id="figma">{t('Figma')}</SectionHeading>
            <p className="text-ui text-fg-muted">
              {screen
                ? t('Page {name} in the Escala Figma file, with its pieces as component sets.', { name: contract.name })
                : t('Block {name} in the Escala Figma file, {n} variants.', { name: contract.name, n: contract.variants })}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

/** A component the block nests. Escala's own components open their page;
 *  anything else is named, not linked. */
function NestChip({ name, onOpen }: { name: string; onOpen?: (c: ComponentDef) => void }): ReactNode {
  const def = COMPONENTS.find((c) => c.key === name && isPlatformComponent(c.key))
  // The Figma set name, as the block's contract and the Storybook write it.
  const label = name
  const className = 'inline-flex h-7 items-center rounded-full border border-line px-3 text-caption font-medium'
  if (!def || !onOpen) return <span className={`${className} text-fg-muted`}>{label}</span>
  return (
    <button
      type="button"
      onClick={() => onOpen(def)}
      className={`${className} text-fg transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
    >
      {label}
    </button>
  )
}
