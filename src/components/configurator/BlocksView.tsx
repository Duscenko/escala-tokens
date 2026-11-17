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

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { usePreviewTokens } from '../../lib/previewTokens'
import { useDesignStore } from '../../store/useDesignStore'
import type { GridViewport } from '../../lib/layoutTokens'
import type { ThemeAppearance } from '../../lib/themeModes'
import { COMPONENTS, type ComponentDef } from '../../lib/componentCatalogue'
import { isPlatformComponent } from '../../lib/platformCatalogue'
import { RecipeScope } from './docs/skeleton/scope'
import { FittedSpecimen } from './docs/ComponentAvatars'
import { SectionHeading, BlockChrome } from './docs/blocks'
import { CatalogueSwitcher } from './docs/CatalogueSwitcher'
import { CanvasBar, CanvasSidePanel, readInspectPref, writeInspectPref, type CanvasPanel } from './docs/componentArticle'
import { PickerField } from '../ui/PickerField'
import { InspectorModeProvider, InspectorOverlay, inspectGroupAttrs } from '../preview/artefacts/TokenInspector'
import SemanticTokenDrawer from './SemanticTokenGroups'
import ThemeQuickSettingsRail, { type QuickPanelFoundation } from './ThemeQuickSettingsRail'
import { BLOCK_GROUPS, blockDefaults, blocksIn, matchesBlock, type BlockDef } from './blocks/blockRegistry'

/** The width a wide block is laid out at before a card scales it down. */
const THUMB_LAYOUT_WIDTH = 1200
/** Frame widths per viewport: the Grid's mobile and tablet frames. */
const FRAME_WIDTH: Record<GridViewport, number | null> = { desktop: null, tablet: 768, mobile: 390 }
const VIEWPORTS: GridViewport[] = ['desktop', 'tablet', 'mobile']
/** What a block stage's "100 %" draws at: half true size. */
const BLOCK_STAGE_BASE = 0.5

export default function BlocksView({
  previewTheme = 'light', active, onSelect, onOpenComponent, onInspectRole, onOpenFoundation, search = '', onClearSearch,
}: {
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
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto">
      <motion.div
        key={active?.id ?? 'index'}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="pb-8"
      >
        {active
          ? <BlockPage block={active} onSelect={onSelect} previewTheme={previewTheme} onOpenComponent={onOpenComponent} onInspectRole={onInspectRole} onOpenFoundation={onOpenFoundation} />
          : <BlocksIndex previewTheme={previewTheme} onSelect={onSelect} search={search} onClearSearch={onClearSearch} />}
      </motion.div>
    </div>
  )
}

function useAppearance(previewTheme: string): ThemeAppearance {
  const kind = useDesignStore((s) => s.themeKinds[previewTheme])
  return kind === 'dark' ? 'dark' : 'light'
}

// ── Index ────────────────────────────────────────────────────────────────────

function BlocksIndex({ previewTheme, onSelect, search, onClearSearch }: {
  previewTheme: string
  onSelect: (b: BlockDef) => void
  search: string
  onClearSearch?: () => void
}) {
  const { t } = useI18n()
  const appearance = useAppearance(previewTheme)
  const tokens = usePreviewTokens(previewTheme, appearance)
  const groups = BLOCK_GROUPS
    .map((g) => ({ g, items: blocksIn(g).filter((b) => matchesBlock(b, search)) }))
    .filter((x) => x.items.length > 0)
  const count = groups.reduce((n, x) => n + x.items.length, 0)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-display font-semibold tracking-tight text-fg">{t('Blocks')}</h1>
        <p className="mt-2 max-w-2xl text-strong leading-relaxed text-fg-muted">
          {t('Ready-made screens and sections built only from Escala components and your tokens. Open one to try its options and see what it is made of.')}
        </p>
        <p className="mt-2 text-caption text-fg-faint">{count} {t(count === 1 ? 'block' : 'blocks')}</p>
      </header>
      {count === 0 ? (
        <div role="status" className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line px-6 py-10">
          <p className="text-strong text-fg">{t('No blocks match')} “{search.trim()}”.</p>
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
              <h2 className="text-strong font-semibold text-fg">
                {t(g)} <span className="ml-1 text-caption font-normal text-fg-faint">{items.length}</span>
              </h2>
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
    }
    stamp()
    // A control change re-renders the block: new nodes need their marker.
    const observer = new MutationObserver(stamp)
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-escala'] })
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
  const appearance = useAppearance(previewTheme)
  const [values, setValues] = useState(() => blockDefaults(block))
  const [viewport, setViewport] = useState<GridViewport>('desktop')
  const [open, setOpen] = useState(false)
  // Block settings is home: the block's controls sit beside it, as a
  // component's do. Edit theme returns to it (‹ back, ✕, Esc).
  const [panel, setPanel] = useState<CanvasPanel | null>('settings')
  const closePanel = useCallback(() => setPanel('settings'), [])
  const backToHome = { label: t('Block settings'), onBack: closePanel }
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
  // The stage's 100 % is HALF true size (`BLOCK_STAGE_BASE`, owner's call
  // 2026-11-17): at 1:1 a sign-in card filled the canvas and sat in the
  // reader's face. − / + step relative to it, like a component page's stage;
  // 200 % is true pixel size.
  const [zoom, setZoom] = useState(1)
  const scale = zoom * BLOCK_STAGE_BASE
  const canvasRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  useInspectMarkers(stageRef, inspecting)

  const frame = FRAME_WIDTH[viewport]
  const contract = block.contract
  const viewportLabel: Record<string, string> = { desktop: t('Desktop'), tablet: t('Tablet'), mobile: t('Mobile') }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="overflow-clip border-b border-line">
          <BlockChrome
            left={
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-elevated px-2.5 py-1 text-caption font-medium text-fg">{t('{name} preview', { name: block.name })}</span>
                <span className="text-mini text-fg-faint">{viewportLabel[viewport]}{frame ? ` · ${frame}px` : ''}</span>
              </span>
            }
          >
            <span className="flex items-center gap-1.5">
            {block.dialog && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-caption font-medium text-fg transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
              >
                {t('Open as dialog')}
              </button>
            )}
            <CatalogueSwitcher
              noun="block"
              groups={BLOCK_GROUPS.map((g) => ({ label: g, items: blocksIn(g).map((b) => ({ id: b.id, label: b.name })) }))}
              currentId={block.id}
              onPick={(id) => { const b = BLOCK_GROUPS.flatMap((g) => blocksIn(g)).find((x) => x.id === id); if (b) onSelect(b) }}
            />
            </span>
          </BlockChrome>

          <InspectorModeProvider active={inspecting}>
            {/* `overflow-clip`, not `hidden`: the tool bar's `sticky` pins to
                the page's scroll view, not to this stage. */}
            <div
              ref={canvasRef}
              className={`relative flex flex-col overflow-clip ${canvasAppearance}`}
              style={{ background: tokens.surface, cursor: inspecting ? 'crosshair' : undefined }}
            >
              {/* The empty stage is not a page to inspect. */}
              {inspecting && <div data-inspect-exempt="" className="absolute inset-0" aria-hidden />}
              {/* A frame narrower than the card centres; a wider block scrolls.
                  `zoom`, not a transform: the stage keeps the scaled size. */}
              <div className="relative overflow-x-auto pb-20">
                <div
                  className="mx-auto flex min-h-[420px] flex-col"
                  style={{
                    zoom: scale,
                    // Inside a zoomed box a percentage resolves in its own scale:
                    // 100 % at zoom 0.5 lays the section out twice as wide. The
                    // desktop frame stays the stage's width, only drawn smaller.
                    width: frame ?? `${zoom * 100}%`,
                    maxWidth: frame ?? undefined,
                    boxShadow: frame ? '0 0 0 1px var(--color-border-subtle, rgba(127,127,127,.25))' : undefined,
                  } as CSSProperties}
                >
                  <RecipeScope t={tokens}>
                    <div
                      ref={stageRef}
                      {...inspectGroupAttrs(inspecting)}
                      className="relative flex flex-1 flex-col"
                      style={block.wide ? undefined : { padding: 32, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {block.render(values)}
                    </div>
                    {block.dialog?.({ open, onOpenChange: setOpen })}
                  </RecipeScope>
                </div>
              </div>
              <CanvasBar
                panel={panel}
                onPanel={setPanel}
                inspecting={inspecting}
                onInspect={toggleInspecting}
                appearance={canvasAppearance}
                onAppearance={setCanvasAppearance}
                hasSettings
                hasContext={false}
                settingsLabel={t('Block settings')}
                toolbarLabel={t('Block tools')}
                zoom={zoom}
                onZoom={setZoom}
              />
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
        </div>
        <p className="px-6 text-mini text-fg-faint lg:px-8">
          {inspecting
            ? t('Hover the block to see the components it is made of and the tokens that paint them.')
            : t('Inspector off — the block responds to clicks and typing.')}
        </p>
      </div>

      {panel === 'settings' && (
        <CanvasSidePanel title={t('Block settings')}>
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
            <PickerField
              label={t('Frame')}
              value={viewport}
              options={VIEWPORTS.map((o) => ({ value: o, label: viewportLabel[o] ?? o }))}
              onChange={(v) => setViewport(v as GridViewport)}
              searchable={false}
            />
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
              ? t('Same options as the block’s story in Storybook. Frame draws it at the Grid’s tablet and mobile widths.')
              : t('This block has no options of its own. Frame draws it at the Grid’s tablet and mobile widths.')}
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
          <p className="text-caption text-fg-faint">{t('Blocks')} / {t(block.group)}</p>
          <h1 className="text-heading font-semibold tracking-tight text-fg">{block.name}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">{t(block.description)}</p>
        </div>

        {contract && contract.nests.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading id="built-from">{t('Built from')}</SectionHeading>
            <p className="text-ui leading-relaxed text-fg-muted">
              {t('Every part of this block is an Escala component. Change the brand and the block follows.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(contract.nests)].map((name) => <NestChip key={name} name={name} onOpen={onOpenComponent} />)}
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
              {t('Block {name} in the Escala Figma file, {n} variants.', { name: contract.name, n: contract.variants })}
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
