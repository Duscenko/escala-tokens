import { useState, type ReactNode } from 'react'
import { usePreviewTokens } from '../../lib/previewTokens'
import type { ThemeAppearance } from '../../lib/themeModes'
import { type PreviewTokens } from './ButtonPreview'
import { SPECIMENS, Live, PhosphorWeightProvider } from '../configurator/docs/specimens'
import { CopyButton } from '../configurator/docs/blocks'
import { ARTEFACTS, type Artefact } from './artefacts'
import { CompactCarousel } from './artefacts/CompactCarousel'
import { buildSectionExport, ALL_SECTIONS, type SectionKey } from '../../lib/sectionExport'
import { SignUpCardPreview } from './atoms/SignUpCardPreview'
import { SEMANTIC_SPECIMENS, SEMANTIC_SPECIMEN_TITLE, SemanticGroupIndex, type SemanticFocusKey } from './atoms/SemanticSpecimens'
import { ChromeTabBackground } from '../ui/ChromeTabShape'
import { IconSpecimenPreview } from './atoms/IconSpecimenPreview'
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
      <span className="text-mini uppercase tracking-widest text-fg-faint px-0.5">{title}</span>
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
// The aside is the only column that is ALWAYS looking at the system you're
// editing, which makes it the cheapest place to reach the two things that
// otherwise cost a navigation: a real composed SCREEN built from your tokens
// (`Artefacts`) and the section's markdown (`.MD` — otherwise: open the Export
// wizard, pick a scope, pick a format).
//
// The two are scoped differently, on purpose. `.MD` follows the centre column,
// because markdown for "the foundation you're editing" is the useful scope. An
// artefact is whole-SYSTEM: it's the one view where every foundation is on
// screen at once, which is the only way to see them working together.
//
// Everything here is a READING of what already exists — `buildSectionExport`
// for the markdown, the catalogue's `SPECIMENS` for the artefact's controls.
// Nothing is re-authored for this column, so the panel can't tell you something
// the export or the Figma plugin would contradict.
//
// A third tab, `Documentation`, used to sit here: the foundation's own Docs page
// re-laid-out as an accordion. It was retired for this one. Nothing was lost —
// the Docs destination carries every one of those pages at full width, with the
// TOC, prev/next and side-by-side ramps a 400px column could never show, so the
// accordion was always the lesser copy of a page one click away.

export type PanelTab = 'preview' | 'artefacts' | 'md'

const PANEL_TABS: { key: PanelTab; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'artefacts', label: 'Artefacts' },
  { key: 'md', label: '.MD' },
]

/** Same Chrome-style strip `ColorHub` uses for Primitives / Semantics /
 *  Gradients: recessed `foundation-layer-bar`, active tab lifts on `bg-app`
 *  with concave bottom corners. Height stays `h-[52px]` so this row lines up
 *  with CenterHeader. Type stays 12px — a 400px column splits into 133px cells,
 *  and ColorHub's 15px would put the longest label close to truncating. */
function PanelTabBar({
  tab, onChange, workspace = false,
}: {
  tab: PanelTab
  onChange: (t: PanelTab) => void
  workspace?: boolean
}) {
  const tabs = workspace
    ? PANEL_TABS.filter((item) => item.key !== 'md').map((item) => ({
        ...item,
        label: item.key === 'preview' ? 'Components' : item.label,
      }))
    : PANEL_TABS
  return (
    <div className="foundation-layer-bar flex items-stretch flex-shrink-0 h-[52px]">
      <div role="tablist" aria-label="Panel view" className="color-hub-tab-strip flex items-end h-full w-full min-w-0">
        {tabs.map((t) => {
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
      <div className="flex items-center gap-2 px-4 h-9 border-b border-line flex-shrink-0">
        <span className="text-caption font-mono text-fg-faint truncate">{file}</span>
        <span className="ml-auto flex-shrink-0"><CopyButton text={md} label="Copy" /></span>
      </div>
      {/* `whitespace-pre` + its own x-scroll: markdown tables are wider than
          400px and wrapping them would destroy the alignment that makes them
          readable as tables. */}
      <pre className="flex-1 min-h-0 min-w-0 overflow-auto px-4 py-3 text-caption font-mono leading-relaxed text-fg-muted whitespace-pre">
        {md}
      </pre>
    </div>
  )
}

/** The `Artefacts` tab — a composed screen built from the catalogue.
 *
 *  Whole-system, not scoped to the active foundation: an artefact's whole point
 *  is that colour, type, radius, spacing, sizes and the grid are all visible at
 *  once, working together. Switching foundations in the centre column doesn't
 *  change what's rendered here — it changes which of these tokens you're about
 *  to move.
 *
 *  Opens on the COMPACT carousel — a photograph-scale thumbnail per
 *  `ARTEFACTS` entry — and tapping one expands it to true size, where every
 *  measurement (page margin, control heights, type) is at the exact px the
 *  system ships. `expanded` is LOCAL: the tab unmounts on switch (see the
 *  panel's "only the active tab is mounted" rule), so returning here always
 *  lands back on the carousel — that unmount is what makes "compact by
 *  default" true without any reset logic to write. */
function ArtefactsPane({ tokens }: { tokens: PreviewTokens }) {
  const [expanded, setExpanded] = useState<Artefact | null>(null)

  const inner = (() => {
  if (expanded) {
    return (
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 flex flex-col gap-3">
        <button
          onClick={() => setExpanded(null)}
          className="self-start flex-shrink-0 flex items-center gap-1.5 text-caption text-fg-faint hover:text-fg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7.5 2.5 4 6l3.5 3.5" />
          </svg>
          All artefacts
        </button>
        {/* Centers the frame in whatever room is left, rather than pinning it
            under the back row and leaving the rest of a tall window as dead
            space below it (measured: 266px of blank pane on a 1200px-tall
            screen). `min-h-0` is what lets this wrapper actually SHRINK to
            less than the frame's height when the window is short — without it
            `justify-center` has nothing to center within, and the frame just
            sits at the top either way. When the frame genuinely doesn't fit,
            the wrapper grows past its flex-basis instead of clipping, and the
            OUTER `overflow-y-auto` scrolls the whole column — centering never
            traps the top of the content off-screen. */}
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          {expanded.render({ t: tokens })}
        </div>
      </div>
    )
  }

  return <CompactCarousel tokens={tokens} onExpand={setExpanded} />
  })()
  return <PhosphorWeightProvider weight={tokens.iconWeight}>{inner}</PhosphorWeightProvider>
}

// ── Panel ─────────────────────────────────────────────────────────────────
export default function PreviewPanel({
  focus = null,
  typeFocus = null,
  categoryKey = null,
  mdWholeSystem = false,
  previewTheme = 'light',
  previewAppearance,
  iconLibraryKey = null,
  onCollapse,
  onEditTypeRole,
  onEditLayoutRole,
  onEditColorToken,
  onEditColorGroup,
  workspace = false,
}: {
  focus?: SemanticFocus | 'all' | null
  /** Active text-role group while Typography · Semantics is open. */
  typeFocus?: TypeFocus | null
  /** Active Variables foundation key (`color`|`typography`|`radius`|…) — tailors
   *  the generic fallback below to a live specimen set for that foundation. */
  categoryKey?: string | null
  /** Forces the `.MD` tab to the whole-system export instead of `categoryKey`'s
   *  own section. Computed by the caller (Configurator knows Color's own
   *  Primitives/Semantics/Gradients sub-tab; this panel deliberately doesn't)
   *  so `.MD` can read "everything" while skimming Primitives or Gradients and
   *  narrow to just `color.md` once Semantics is the deliberate, focused task. */
  mdWholeSystem?: boolean
  /** Theme whose tokens the atoms render in — driven by the Semantic eye toggle. */
  previewTheme?: string
  /** Light/Dark appearance inside the selected library theme. */
  previewAppearance?: ThemeAppearance
  /** When set (Icons foundation), the panel previews that library's glyphs. */
  iconLibraryKey?: string | null
  /** When set, shows a header button to collapse the panel. */
  onCollapse?: () => void
  /** Jump Typography · Semantics to a text-role row (preview specimen → table). */
  onEditTypeRole?: (key: string) => void
  /** Jump a layout foundation's Semantics table to a role row. */
  onEditLayoutRole?: (key: string) => void
  /** Jump Color · Semantics to a token row (`slot.label`). */
  onEditColorToken?: (id: string) => void
  /** Jump Color · Semantics to a group (collage overview → category). */
  onEditColorGroup?: (key: SemanticFocusKey) => void
  /** Promotes the existing artefacts/specimens into the central Themes canvas. */
  workspace?: boolean
}) {
  const tokens = usePreviewTokens(previewTheme, previewAppearance)
  const specimen = focus && focus !== 'all' ? focus : null

  // Tab state is LOCAL, deliberately: nothing outside this panel reads it (the
  // way `previewCollapsed` has to be lifted because TopNav sizes its divider
  // from the column's width). It survives foundation switches — the panel is a
  // separate tree from the centre column's `AnimatePresence`, so editing
  // Color then Radius keeps you on `.MD` — and resets when the whole aside is
  // handed to another panel (Save, "+ Theme"), which is the right moment to
  // land back on the specimen.
  const [tab, setTab] = useState<PanelTab>(() => workspace ? 'artefacts' : 'preview')

  // The section both new tabs are scoped to. `PreviewPanel` only ever renders
  // inside the Variables Generator (see `showPreview` in Configurator), so
  // `categoryKey` is in practice always a foundation — but it's typed nullable,
  // and 'all' (the whole-system export) is the honest answer when it isn't set
  // rather than picking a foundation at random. `mdWholeSystem` overrides this
  // to 'all' even with a real `categoryKey` — Color's Primitives/Gradients tabs
  // want the big export, only Semantics wants the narrow one.
  const section: SectionKey | 'all' =
    mdWholeSystem ? 'all'
    : categoryKey && (ALL_SECTIONS as string[]).includes(categoryKey) ? (categoryKey as SectionKey) : 'all'
  const mdFile = section === 'all' ? 'design-system.md' : `${section}.md`

  // One entry today, so there is nothing to pick between — see the registry.
  const artefact = ARTEFACTS[0] as Artefact | undefined

  const previewTitle = iconLibraryKey
    ? `${getIconLibrary(iconLibraryKey)?.label ?? 'Icon'} preview`
    : specimen
    ? FOCUS_TITLE[specimen]
    : (categoryKey && CATEGORY_TITLE[categoryKey]) || 'Components Preview'
  // 'Artefacts' regardless of which one is open (compact carousel) or expanded
  // — a per-artefact title would have to flip the moment expanding/collapsing
  // did, and "Login" vs "Artefacts" depending on a click is a title that moves
  // under you. The specific screen is already named on its own card/back row.
  const title =
    workspace ? 'Theme Preview'
    : tab === 'md' ? mdFile
    : tab === 'artefacts' ? 'Artefacts'
    : previewTitle
  // Show which theme is on display when it isn't the default light one. Both
  // the specimen and the artefact are painted in ONE theme, so both claim it;
  // the markdown ships every theme's values, so it can't. `iconLibraryKey` only
  // suppresses it on Preview — a glyph sheet has no theme, but the artefact is
  // still painted in one even while Icons is the active foundation.
  const themeInTab = tab === 'artefacts' || (tab === 'preview' && !iconLibraryKey)
  const themeBadge = (workspace || themeInTab) && previewTheme && (workspace || previewTheme !== 'light') ? previewTheme : null
  const collageIconPrefix = 'untitled'

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-app">
      {/* Header */}
      <header className="flex items-center gap-2 px-5 h-[52px] border-b border-line flex-shrink-0">
        <h2 className="text-sm font-semibold text-fg truncate">{title}</h2>
        {themeBadge && (
          <span className="px-1.5 py-0.5 rounded-md bg-elevated text-mini font-medium text-accent-ui capitalize">
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

      <PanelTabBar tab={tab} onChange={setTab} workspace={workspace} />

      {/* Only the ACTIVE tab is mounted. `.MD` rebuilds a few hundred tokens of
          markdown and the artefact runs a dozen specimens — neither should pay
          that while you're looking at the other, in a panel that repaints on
          every token edit. */}
      {tab === 'md' ? (
        <MarkdownPane section={section} file={mdFile} />
      ) : tab === 'artefacts' ? (
        artefact ? (
          <ArtefactsPane tokens={tokens} />
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center px-8 text-center text-body text-fg-faint">
            No artefacts yet.
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
          <TypeRolesPreview
            tokens={tokens}
            focus={typeFocus && typeFocus !== 'all' ? typeFocus : 'all'}
            onEditRole={onEditTypeRole}
          />
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
