import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePreviewTokens } from '../../lib/previewTokens'
import { type PreviewTokens } from './ButtonPreview'
import { SPECIMENS, Live } from '../configurator/docs/specimens'
import { CopyButton, Prose, CodeBlock, CountBadge, ShipsAs } from '../configurator/docs/blocks'
import {
  useSystemDoc, foundationDoc, type FoundationDoc,
} from '../configurator/docs/foundationDocs'
import { buildSectionExport, ALL_SECTIONS, type SectionKey } from '../../lib/sectionExport'
import { SignUpCardPreview } from './atoms/SignUpCardPreview'
import { SEMANTIC_SPECIMENS, SEMANTIC_SPECIMEN_TITLE, SemanticGroupIndex, type SemanticFocusKey } from './atoms/SemanticSpecimens'
import { ChromeTabBackground } from '../ui/ChromeTabShape'
import { IconSpecimenPreview } from './atoms/IconSpecimenPreview'
import { FontFamilyPreview } from './atoms/FontFamilyPreview'
import { TypeRolesPreview } from './atoms/TypeRolesPreview'
import { RadiusRolesPreview } from './atoms/RadiusRolesPreview'
import { LayoutRolesPreview } from './atoms/LayoutRolesPreview'
import type { TypeFocus } from '../configurator/TypeSemantics'
import { GridPreview } from './atoms/GridPreview'
import { ShadowPreview } from './atoms/ShadowPreview'
import { getIconLibrary } from '../../lib/iconLibraries'
import { useDesignStore } from '../../store/useDesignStore'
import type { SemanticFocus } from '../configurator/Step3_SemanticTokens'

// Catalogue renderers reused verbatim — keys are plugin gates ('Toggle' ships
// with the display name "Switch").
const ButtonSpec = SPECIMENS.Button
const BadgeSpec = SPECIMENS.Badge
const SwitchSpec = SPECIMENS.Toggle
const SliderSpec = SPECIMENS.Slider
const StatusBadgeSpec = SPECIMENS.StatusBadge
const ToastSpec = SPECIMENS.Toast
const InputGroupSpec = SPECIMENS.InputGroup
const PasswordStrengthSpec = SPECIMENS.PasswordStrength
const TabMenuSpec = SPECIMENS.TabMenu
const AvatarSpec = SPECIMENS.Avatar

// When the shell focuses a semantic group, the panel becomes a specimen for it.
// Titles + renderers both come from the specimen module, so a new focus can't
// be half-wired (a title with no specimen, or the reverse).
const FOCUS_TITLE = SEMANTIC_SPECIMEN_TITLE

// When no semantic focus is active, the panel instead tailors itself to the
// active Variables foundation — same idea (a live specimen for what you're
// editing), one level up. Only foundations with a dedicated set below get a
// title here; anything else (Icons) keeps the generic one.
const CATEGORY_TITLE: Record<string, string> = {
  color: 'Color preview',
  typography: 'Font preview',
  radius: 'Radius preview',
  spacing: 'Spacing preview',
  sizes: 'Sizes preview',
  grid: 'Grid preview',
  shadow: 'Shadow preview',
}

// ── Layout helpers ──────────────────────────────────────────────────────────
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <span className="text-[10px] uppercase tracking-widest text-fg-faint px-0.5">{title}</span>
      {children}
    </section>
  )
}

// A tile painted with the user's design-system surface, so brand-on-surface
// contrast reads correctly regardless of the app chrome theme.
function Tile({ tokens, children }: { tokens: PreviewTokens; children: ReactNode }) {
  return (
    <div
      className="p-4 flex flex-wrap items-center gap-3"
      style={{ background: tokens.surface, border: `1px solid ${tokens.borderDefault || tokens.border || '#eaecf0'}`, borderRadius: 14 }}
    >
      {children}
    </div>
  )
}

// ── Color collage ──────────────────────────────────────────────────────────
// The Color foundation's specimen is ONE composite surface, not a stack of
// titled tiles. Two reasons it's built this way:
//  · Density — the old one-Group-per-component layout spent most of its height
//    on captions and tile borders, so only two or three components were ever
//    on screen at once. Colour is the foundation with the widest blast radius,
//    and you can only judge it by seeing many components repaint TOGETHER.
//  · Systemic connection — every specimen here reads the same tokens (radius,
//    sizes, type scale, semantic colours) off `t`, so moving the Radius slider
//    or the accent visibly moves buttons, inputs, the uploader and the toast in
//    lockstep. Sharing one surface is what makes that legible; separate tiles
//    read as unrelated samples.
// Keep the components token-driven catalogue SPECIMENS (never hand-rolled
// markup) so this can't drift from what the plugin ships.
function ColorCollage({
  tokens, iconPrefix, onEditGroup,
}: {
  tokens: PreviewTokens
  iconPrefix: string
  onEditGroup?: (key: SemanticFocusKey) => void
}) {
  // Icons come from the system's OWN library, so the collage's lead button is
  // one more thing that repaints when a foundation changes.
  const icons = { prefix: iconPrefix, leading: true, trailing: true }
  return (
    <div className="flex flex-col gap-3.5">
      {onEditGroup && <SemanticGroupIndex onEditGroup={onEditGroup} />}
      <div
        className="flex flex-col gap-3.5 p-4"
        style={{
          background: tokens.surface,
          borderRadius: 14,
        }}
      >
      {/* `Live` wraps whatever should respond to the cursor. It drives each
          specimen's OWN State axis from real pointer/focus events, so a hover
          here paints the exact variant the plugin ships — the collage is where
          you judge the system, and a system is judged in motion, not at rest.
          Components with no State axis (badges, avatar) stay visually still;
          see the wrapper's own notes for why that's deliberate. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Live c="Button" t={tokens} v={{ Style: 'Solid' }} icons={icons} />
        <Live c="Button" t={tokens} v={{ Style: 'Outline' }} />
        <Live c="Button" t={tokens} v={{ Style: 'Soft' }} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadgeSpec t={tokens} v={{ Status: 'Online' }} />
        <StatusBadgeSpec t={tokens} v={{ Status: 'Away' }} />
        <StatusBadgeSpec t={tokens} v={{ Status: 'Busy' }} />
        <StatusBadgeSpec t={tokens} v={{ Status: 'Offline' }} />
      </div>

      <SliderSpec t={tokens} v={{}} />

      {/* One switch, not an on/off pair — each Switch specimen renders its own
          "Notifications" label, so two of them read as a duplicated row.
          Both actually flip on click (`toggle`), which is the only way to see
          the brand fill arrive and leave the way it will in the product. */}
      <div className="flex flex-wrap items-center gap-4">
        <Live c="Checkbox" t={tokens} v={{ Checked: 'True' }} toggle="Checked" />
        <Live c="Toggle" t={tokens} v={{ On: 'True' }} toggle="On" />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <BadgeSpec t={tokens} v={{ Style: 'Solid', Color: 'Brand' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Brand' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Outline', Color: 'Neutral' }} />
      </div>

      {/* Semantic states — the four status ramps, side by side, so an edit to
          any one of them is visible without leaving the Color foundation. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Error' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Success' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Warning' }} />
        <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Info' }} />
      </div>

      <ToastSpec t={tokens} v={{ Status: 'Success' }} />
      {/* Dropzone names its hover-equivalent 'Dragging' — hovering an uploader
          IS what a drag looks like, and it's a shipped variant, not invented. */}
      <Live c="Dropzone" t={tokens} hoverState="Dragging" />
      <Live c="Select" t={tokens} />
      <InputGroupSpec t={tokens} v={{}} />
      <PasswordStrengthSpec t={tokens} v={{ Strength: 'Weak' }} />

      <div className="flex items-center justify-between gap-3">
        <TabMenuSpec t={tokens} v={{}} />
        <AvatarSpec t={tokens} v={{ Size: 'MD' }} />
      </div>
      </div>
    </div>
  )
}

// ── Panel tabs ──────────────────────────────────────────────────────────────
// The aside is the only column that is ALWAYS looking at the foundation you're
// editing, which makes it the cheapest place to reach for the two things that
// otherwise cost a navigation: the section's markdown (today: open the Export
// wizard, pick a scope, pick a format) and its reference page (today: leave
// Variables for the Docs destination and lose the editor). Both are now a tab
// away and stay scoped to whatever the centre column is on.
//
// Everything here is a READING of what already exists — `buildSectionExport`
// for the markdown, `FOUNDATION_DOCS` for the reference. Nothing is re-authored
// for this column, so the panel can't tell you something the export or the docs
// site would contradict.

export type PanelTab = 'preview' | 'md' | 'docs'

const PANEL_TABS: { key: PanelTab; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'md', label: '.MD' },
  { key: 'docs', label: 'Documentation' },
]

/** Same Chrome-style strip `ColorHub` uses for Primitives / Semantics /
 *  Gradients: recessed `foundation-layer-bar`, active tab lifts on `bg-app`
 *  with concave bottom corners. Height stays `h-[52px]` so this row lines up
 *  with CenterHeader. Type stays 12px — "Documentation" at ColorHub's 15px
 *  would truncate in a 400px column. */
function PanelTabBar({ tab, onChange }: { tab: PanelTab; onChange: (t: PanelTab) => void }) {
  return (
    <div className="foundation-layer-bar flex items-stretch flex-shrink-0 h-[52px]">
      <div role="tablist" aria-label="Panel view" className="color-hub-tab-strip flex items-end h-full w-full min-w-0">
        {PANEL_TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={`color-hub-tab color-hub-tab-compact ${active ? 'color-hub-tab-active' : ''}`}
            >
              <ChromeTabBackground />
              <span className="relative grid place-items-center min-w-0">
                <span aria-hidden className="invisible font-semibold col-start-1 row-start-1">{t.label}</span>
                <span className="col-start-1 row-start-1 truncate">{t.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The `.MD` tab — the active foundation's markdown, live.
 *
 *  It is the EXACT string `buildSectionExport` hands the Export wizard, not a
 *  summary written for this column, so copying from here and exporting from
 *  the wizard produce the same bytes.
 *
 *  Mounted only while its tab is open (see the switch below): rebuilding a few
 *  hundred tokens of markdown on every keystroke of a hex field is cheap but
 *  not free, and there's no reason to pay it while someone is looking at the
 *  specimen. */
function MarkdownPane({ section, file }: { section: SectionKey | 'all'; file: string }) {
  const store = useDesignStore()
  const modes = store.themeOrder.filter((t) => store.themes[t])
  const md = buildSectionExport(section, 'md', 'hex', { modes: modes.length ? modes : ['light'] })

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <div className="flex items-center gap-2 px-4 h-9 border-b border-line/60 flex-shrink-0">
        <span className="text-[11px] font-mono text-fg-faint truncate">{file}</span>
        <span className="ml-auto flex-shrink-0"><CopyButton text={md} label="Copy" /></span>
      </div>
      {/* `whitespace-pre` + its own x-scroll: markdown tables are wider than
          400px and wrapping them would destroy the alignment that makes them
          readable as tables. */}
      <pre className="flex-1 min-h-0 min-w-0 overflow-auto px-4 py-3 text-[11px] font-mono leading-relaxed text-fg-muted whitespace-pre">
        {md}
      </pre>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/** One collapsible section of the docs pane.
 *
 *  Unlike `AboutAccordion` — the other reading-surface accordion in the app,
 *  whose visual language this matches — a closed section here renders NOTHING
 *  rather than animating to `height: 0` with the body still mounted. That
 *  pattern is right for About's four paragraphs and wrong here: Color's
 *  Primitives section alone is twelve 12-step ramps and its Semantics section
 *  resolves 89 roles, and paying for all of them on every repaint of a panel
 *  that repaints on every token edit is exactly the cost this column can't
 *  afford. Nothing inside opens a popover, so the `overflow-hidden` the height
 *  animation needs is harmless (see CLAUDE.md's note on animated-height
 *  containers that DO hold popovers). */
function DocRow({
  title, hint, open, onToggle, children,
}: {
  title: string
  hint?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-elevated/40 transition-colors"
      >
        <span className={`flex-shrink-0 mt-0.5 ${open ? 'text-accent-ui' : 'text-fg-faint'}`}>
          <Chevron open={open} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[12.5px] text-fg ${open ? 'font-semibold' : 'font-medium'}`}>{title}</span>
          {!open && hint && <span className="block text-[11px] text-fg-faint truncate">{hint}</span>}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 min-w-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The `Documentation` tab — the foundation's own Docs page, re-laid-out for a
 *  400px column.
 *
 *  Same CONTENT as `FoundationArticle` (lead · Why · Usage · the foundation's
 *  own token sections · Ships as), read from the same `FOUNDATION_DOCS` entry
 *  and rendered with the same `section.render(system)` bodies — so a foundation
 *  documented once is documented here too, with nothing to keep in sync. What
 *  changes is the SHAPE: the article's long single scroll becomes an accordion,
 *  which in a column this narrow doubles as the page's own table of contents.
 *  Closed by default — six labelled rows under the lead is a scannable index,
 *  where six expanded sections would be a scroll with no map.
 *
 *  The wide bodies (the primitive ramps, the 89-role table) already carry their
 *  own `overflow-x-auto`, so they scroll inside themselves here instead of
 *  breaking the column — which is why the article can be reused verbatim
 *  rather than forked into a "narrow" variant. */
function DocsPane({
  doc, onOpenFull,
}: {
  doc: FoundationDoc
  /** Opens the real Docs page for this foundation. The accordion is a reading
   *  surface, not a replacement — anything that wants the full width (side by
   *  side ramps, the TOC, prev/next) is one click away. */
  onOpenFull?: (key: string) => void
}) {
  const system = useSystemDoc()
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (id: string) => setOpen((cur) => (cur === id ? null : id))
  const count = doc.tokenCount(system)

  // Built from the doc entry in the SAME order the full article prints them.
  const rows = [
    {
      id: 'why',
      title: `Why ${doc.label.toLowerCase()} tokens`,
      hint: doc.why,
      body: <Prose text={doc.why} className="text-[12.5px] text-fg-muted leading-relaxed" />,
    },
    {
      id: 'usage',
      title: 'Usage',
      hint: doc.usage,
      body: (
        <div className="flex flex-col gap-3">
          <Prose text={doc.usage} className="text-[12.5px] text-fg-muted leading-relaxed" />
          <CodeBlock file="variables.css" code={doc.usageCode} />
        </div>
      ),
    },
    ...doc.sections.map((s) => ({
      id: s.id,
      title: s.title,
      hint: s.description,
      body: (
        <div className="flex flex-col gap-3">
          {s.description && <Prose text={s.description} className="text-[12.5px] text-fg-muted leading-relaxed" />}
          {s.render(system)}
        </div>
      ),
    })),
    {
      id: 'ships',
      title: 'Ships as',
      hint: 'What these tokens are called in tokens.json, variables.css and Figma.',
      body: <ShipsAs json={doc.ships.json} css={doc.ships.css} figma={doc.ships.figma} />,
    },
  ]

  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
      {/* Lead — always visible, so the tab never opens on a wall of closed
          rows with no content to orient against. */}
      <div className="px-4 py-4 flex flex-col gap-2.5 border-b border-line">
        <div className="flex items-center gap-2">
          <CountBadge>{count} token{count === 1 ? '' : 's'}</CountBadge>
          {onOpenFull && (
            <button
              onClick={() => onOpenFull(doc.key)}
              className="ml-auto flex items-center gap-1 text-[11px] text-fg-faint hover:text-fg transition-colors whitespace-nowrap"
              title={`Open Docs · ${doc.label}`}
            >
              Full page
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
        <Prose text={doc.lead} className="text-[12.5px] text-fg-muted leading-relaxed" />
      </div>

      {rows.map((r) => (
        <DocRow key={r.id} title={r.title} hint={r.hint} open={open === r.id} onToggle={() => toggle(r.id)}>
          {r.body}
        </DocRow>
      ))}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────
export default function PreviewPanel({
  focus = null,
  typeFocus = null,
  categoryKey = null,
  previewTheme = 'light',
  iconLibraryKey = null,
  onCollapse,
  onOpenDocs,
  onEditTypeRole,
  onEditLayoutRole,
  onEditColorToken,
  onEditColorGroup,
}: {
  focus?: SemanticFocus | 'all' | null
  /** Active text-role group while Typography · Semantics is open. */
  typeFocus?: TypeFocus | null
  /** Active Variables foundation key (`color`|`typography`|`radius`|…) — tailors
   *  the generic fallback below to a live specimen set for that foundation. */
  categoryKey?: string | null
  /** Theme whose tokens the atoms render in — driven by the Semantic eye toggle. */
  previewTheme?: string
  /** When set (Icons foundation), the panel previews that library's glyphs. */
  iconLibraryKey?: string | null
  /** When set, shows a header button to collapse the panel. */
  onCollapse?: () => void
  /** Opens the Docs destination at a foundation — the Documentation tab's
   *  "Full page" escape hatch. Optional: without it the tab still reads, it
   *  just doesn't offer the link. */
  onOpenDocs?: (foundationKey: string) => void
  /** Jump Typography · Semantics to a text-role row (preview specimen → table). */
  onEditTypeRole?: (key: string) => void
  /** Jump a layout foundation's Semantics table to a role row. */
  onEditLayoutRole?: (key: string) => void
  /** Jump Color · Semantics to a token row (`slot.label`). */
  onEditColorToken?: (id: string) => void
  /** Jump Color · Semantics to a group (collage overview → category). */
  onEditColorGroup?: (key: SemanticFocusKey) => void
}) {
  const tokens = usePreviewTokens(previewTheme)
  const specimen = focus && focus !== 'all' ? focus : null

  // Tab state is LOCAL, deliberately: nothing outside this panel reads it (the
  // way `previewCollapsed` has to be lifted because TopNav sizes its divider
  // from the column's width). It survives foundation switches — the panel is a
  // separate tree from the centre column's `AnimatePresence`, so editing
  // Color then Radius keeps you on `.MD` — and resets when the whole aside is
  // handed to another panel (Save, "+ Theme"), which is the right moment to
  // land back on the specimen.
  const [tab, setTab] = useState<PanelTab>('preview')

  // The section both new tabs are scoped to. `PreviewPanel` only ever renders
  // inside the Variables Generator (see `showPreview` in Configurator), so
  // `categoryKey` is in practice always a foundation — but it's typed nullable,
  // and 'all' (the whole-system export) is the honest answer when it isn't set
  // rather than picking a foundation at random.
  const section: SectionKey | 'all' =
    categoryKey && (ALL_SECTIONS as string[]).includes(categoryKey) ? (categoryKey as SectionKey) : 'all'
  const doc = section === 'all' ? undefined : foundationDoc(section)
  const mdFile = section === 'all' ? 'design-system.md' : `${section}.md`

  const previewTitle = iconLibraryKey
    ? `${getIconLibrary(iconLibraryKey)?.label ?? 'Icon'} preview`
    : specimen
    ? FOCUS_TITLE[specimen]
    : (categoryKey && CATEGORY_TITLE[categoryKey]) || 'Components Preview'
  const title = tab === 'md' ? mdFile : tab === 'docs' ? `${doc?.label ?? 'System'} docs` : previewTitle
  // Show which theme is on display when it isn't the default light one. Only
  // the specimen renders in a theme — the markdown ships every theme's values
  // and the docs pages print light and dark side by side, so the badge would
  // be claiming a scope those tabs don't have.
  const themeBadge =
    tab === 'preview' && !iconLibraryKey && previewTheme && previewTheme !== 'light' ? previewTheme : null
  const collageIconPrefix = 'untitled'

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      {/* Header */}
      <header className="flex items-center gap-2 px-5 h-[52px] border-b border-line/60 flex-shrink-0">
        <h2 className="text-sm font-semibold text-fg truncate">{title}</h2>
        {themeBadge && (
          <span className="px-1.5 py-0.5 rounded-md bg-elevated text-[10px] font-medium text-accent-ui capitalize">
            {themeBadge}
          </span>
        )}
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Collapse preview"
            title="Collapse preview"
            className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
            </svg>
          </button>
        )}
      </header>

      <PanelTabBar tab={tab} onChange={setTab} />

      {/* Only the ACTIVE tab is mounted. `.MD` rebuilds its string and
          `Documentation` resolves the whole system doc (89 roles, every family)
          — neither should run while you're looking at the specimen, and a
          hidden-but-mounted tab would pay both on every token edit. */}
      {tab === 'md' ? (
        <MarkdownPane section={section} file={mdFile} />
      ) : tab === 'docs' ? (
        doc ? (
          <DocsPane doc={doc} onOpenFull={onOpenDocs} />
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center px-8 text-center text-[12.5px] text-fg-faint">
            Pick a foundation in the Variables Generator to read its documentation here.
          </div>
        )
      ) : (

      /* Artboard — overview · icon set · a category specimen when focused · else component grid */
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-5 flex flex-col gap-6">
        {iconLibraryKey ? (
          <IconSpecimenPreview libraryKey={iconLibraryKey} />
        ) : specimen ? (
          SEMANTIC_SPECIMENS[specimen]({ tokens, onEditToken: onEditColorToken })
        ) : categoryKey === 'color' ? (
          <ColorCollage tokens={tokens} iconPrefix={collageIconPrefix} onEditGroup={onEditColorGroup} />
        ) : categoryKey === 'typography' ? (
          <>
            <Group title="Button">
              <Tile tokens={tokens}>
                <ButtonSpec t={tokens} v={{ Style: 'Solid' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Outline' }} />
              </Tile>
            </Group>

            <Group title="Font family">
              <FontFamilyPreview tokens={tokens} />
            </Group>

            <Group title="Text roles">
              <TypeRolesPreview
                tokens={tokens}
                focus={typeFocus && typeFocus !== 'all' ? typeFocus : 'all'}
                onEditRole={onEditTypeRole}
              />
            </Group>
          </>
        ) : categoryKey === 'radius' ? (
          <RadiusRolesPreview tokens={tokens} onEditRole={onEditLayoutRole} />
        ) : categoryKey === 'spacing' ? (
          <LayoutRolesPreview family="spacing" tokens={tokens} onEditRole={onEditLayoutRole} />
        ) : categoryKey === 'sizes' ? (
          <LayoutRolesPreview family="size" tokens={tokens} onEditRole={onEditLayoutRole} />
        ) : categoryKey === 'stroke' ? (
          <LayoutRolesPreview family="stroke" tokens={tokens} onEditRole={onEditLayoutRole} />
        ) : categoryKey === 'grid' ? (
          /* Grid is the one foundation whose tokens produce no COMPONENT —
             a button tells you nothing about a 12-column layout. Its specimen
             is the layout itself, drawn at every breakpoint the system
             defines. */
          <GridPreview tokens={tokens} onEditRole={onEditLayoutRole} />
        ) : categoryKey === 'shadow' ? (
          /* Elevation can only be judged by comparing steps, which the generic
             fallback (one `xs` on a button) never let you do. `t.shadows` is
             already the dark twin here when a dark theme is previewed — see
             `resolvePreviewTokens`. */
          <ShadowPreview tokens={tokens} />
        ) : (
          <>
            {/* The exact catalogue specimens (SPECIMENS — the same renderers the
                Components playground uses), so this panel can never drift from
                what the plugin ships: same heights (Sizes foundation), radius
                token, type scale and variant axes. */}
            <Group title="Button">
              <Tile tokens={tokens}>
                <ButtonSpec t={tokens} v={{ Style: 'Solid' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Soft' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Outline' }} />
                <ButtonSpec t={tokens} v={{ Style: 'Ghost' }} />
              </Tile>
            </Group>

            <Group title="Badge">
              <Tile tokens={tokens}>
                <BadgeSpec t={tokens} v={{ Style: 'Solid', Color: 'Brand' }} />
                <BadgeSpec t={tokens} v={{ Style: 'Soft', Color: 'Success' }} />
                <BadgeSpec t={tokens} v={{ Style: 'Outline', Color: 'Neutral' }} />
              </Tile>
            </Group>

            <Group title="Switch">
              <Tile tokens={tokens}>
                <SwitchSpec t={tokens} v={{ On: 'True' }} />
                <SwitchSpec t={tokens} v={{ On: 'False' }} />
              </Tile>
            </Group>

            <Group title="Form">
              <SignUpCardPreview tokens={tokens} />
            </Group>
          </>
        )}
      </div>
      )}
    </div>
  )
}
