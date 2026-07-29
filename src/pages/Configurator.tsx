import { useState, useEffect, type ComponentType, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../store/useDesignStore'
import { useTheme, getTheme, setTheme } from '../lib/theme'
import { readableAccent } from '../lib/colorUtils'
import { useAutoFigmaSync } from '../lib/figmaSync'
import SectionRail, { RAIL_WIDTH } from '../components/configurator/SectionRail'
import TopNav, { type TopNavKey } from '../components/configurator/TopNav'

type Tab = 'foundations' | 'components' | 'docs'
import PreviewPanel from '../components/preview/PreviewPanel'
import ComponentDocPane from '../components/configurator/ComponentDocPane'
import ExportView from '../components/configurator/ExportView'
import FigmaConnectView from '../components/configurator/FigmaConnectView'
import GitHubConnectView from '../components/configurator/GitHubConnectView'
import IconLibrary from '../components/configurator/IconLibrary'
import DocsView from '../components/configurator/DocsView'
import SaveView, { SaveSidePanel } from '../components/configurator/SaveView'
import HomeActions from '../components/configurator/HomeActions'
import Step2_ColorPalette from '../components/configurator/Step2_ColorPalette'
import ColorHub, { type ColorTab } from '../components/configurator/ColorHub'
import { type PickerFocusTarget } from '../components/configurator/PickerColor'
import { type SemanticCategory } from '../components/configurator/Step3_SemanticTokens'
import ExportWizard from '../components/configurator/ExportWizard'
import { type WizardCollection } from '../lib/exportWizard'
import ImportSystemModal from '../components/configurator/ImportSystemModal'
import NewSystemModal from '../components/configurator/NewSystemModal'
import NewTokenWizard, { type TokenCategory } from '../components/configurator/NewTokenWizard'
import Step4_Typography from '../components/configurator/Step4_Typography'
import Step5_Spacing from '../components/configurator/Step5_Spacing'
import StepRadius from '../components/configurator/StepRadius'
import Step6_Opacity from '../components/configurator/Step6_Opacity'
import Step7_Shadow from '../components/configurator/Step7_Shadow'
import Step8_Grid from '../components/configurator/Step8_Grid'
import Step9_Sizes from '../components/configurator/Step9_Sizes'
import QuickFoundationsPanel from '../components/configurator/QuickFoundationsPanel'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../lib/componentCatalogue'
import { PaletteIcon } from '../components/ui/icons'
import HeaderPill from '../components/ui/HeaderPill'

// Copy-to-clipboard mark for the section Export pill.
const ExportIcon: ComponentType = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

// ── Stroke-icon factory (16px on a 24 grid, tracks currentColor) ────────────
// Multiple subpaths: separate them with "|".
const ic = (d: string, sw = '2'): ComponentType => () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
)

// ── Foundation sections: metadata + the prop-less, store-driven component ─────
interface FoundationSection {
  key: string
  label: string
  short: string // compact label for the icon rail
  hint: string
  title: string
  subtitle: string
  Component: ComponentType
  Icon: ComponentType
}

const FOUNDATIONS: FoundationSection[] = [
  {
    key: 'color',
    label: 'Color',
    short: 'Color',
    hint: 'Brand, neutrals & state scales',
    title: 'Color',
    subtitle: 'Map your semantic aliases and craft the gradients your system ships with.',
    Component: Step2_ColorPalette,
    // The same palette mark the token tables use for color rows — one official
    // "color" glyph across rail, header and tables.
    Icon: () => <PaletteIcon size={16} />,
  },
  {
    key: 'typography',
    label: 'Typography',
    short: 'Font',
    hint: 'Fonts, sizes & weights',
    title: 'Typography',
    subtitle: 'Pair a heading and body font, then tune the size scale and weights.',
    Component: Step4_Typography,
    Icon: ic('M8 7H16M12 7V17M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z'),
  },
  {
    key: 'radius',
    label: 'Border Radius',
    short: 'Radius',
    hint: 'Corner-radius personality',
    title: 'Border Radius',
    subtitle: 'Choose the corner-radius personality of your system — from sharp to pill.',
    Component: StepRadius,
    Icon: ic('M5 19V11C5 7.68629 7.68629 5 11 5H19', '1.8'),
  },
  {
    key: 'icons',
    label: 'Icon Library',
    short: 'Icons',
    hint: 'Best icon libraries',
    title: 'Icon Library',
    subtitle: 'Pick the icon set your system standardizes on — referenced in your tokens and docs.',
    Component: IconLibrary,
    Icon: ic('M20.5 7.27783L12 12.0001M12 12.0001L3.49997 7.27783M12 12.0001L12 21.5001M21 16.0586V7.94153C21 7.59889 21 7.42757 20.9495 7.27477C20.9049 7.13959 20.8318 7.01551 20.7354 6.91082C20.6263 6.79248 20.4766 6.70928 20.177 6.54288L12.777 2.43177C12.4934 2.27421 12.3516 2.19543 12.2015 2.16454C12.0685 2.13721 11.9315 2.13721 11.7986 2.16454C11.6484 2.19543 11.5066 2.27421 11.223 2.43177L3.82297 6.54288C3.52345 6.70928 3.37369 6.79248 3.26463 6.91082C3.16816 7.01551 3.09515 7.13959 3.05048 7.27477C3 7.42757 3 7.59889 3 7.94153V16.0586C3 16.4013 3 16.5726 3.05048 16.7254C3.09515 16.8606 3.16816 16.9847 3.26463 17.0893C3.37369 17.2077 3.52345 17.2909 3.82297 17.4573L11.223 21.5684C11.5066 21.726 11.6484 21.8047 11.7986 21.8356C11.9315 21.863 12.0685 21.863 12.2015 21.8356C12.3516 21.8047 12.4934 21.726 12.777 21.5684L20.177 17.4573C20.4766 17.2909 20.6263 17.2077 20.7354 17.0893C20.8318 16.9847 20.9049 16.8606 20.9495 16.7254C21 16.5726 21 16.4013 21 16.0586Z'),
  },
  {
    key: 'spacing',
    label: 'Spacing',
    short: 'Spacing',
    hint: 'Base spacing scale',
    title: 'Spacing',
    subtitle: 'Set the base unit that drives every margin, padding and gap in your system.',
    Component: Step5_Spacing,
    Icon: ic('M21 21V3M3 21V3M9 8V16C9 16.9319 9 17.3978 9.15224 17.7654C9.35523 18.2554 9.74458 18.6448 10.2346 18.8478C10.6022 19 11.0681 19 12 19C12.9319 19 13.3978 19 13.7654 18.8478C14.2554 18.6448 14.6448 18.2554 14.8478 17.7654C15 17.3978 15 16.9319 15 16V8C15 7.06812 15 6.60218 14.8478 6.23463C14.6448 5.74458 14.2554 5.35523 13.7654 5.15224C13.3978 5 12.9319 5 12 5C11.0681 5 10.6022 5 10.2346 5.15224C9.74458 5.35523 9.35523 5.74458 9.15224 6.23463C9 6.60218 9 7.06812 9 8Z'),
  },
  {
    key: 'opacity',
    label: 'Opacity',
    short: 'Opacity',
    hint: 'Transparency scale',
    title: 'Opacity',
    subtitle: 'Define the transparency steps your overlays, scrims and disabled states rely on.',
    Component: Step6_Opacity,
    Icon: ic('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 3v18M12 7.5h7M12 12h9M12 16.5h7', '1.8'),
  },
  {
    key: 'shadow',
    label: 'Shadow',
    short: 'Shadow',
    hint: 'Elevation levels',
    title: 'Shadow',
    subtitle: 'Tune the elevation ramp — from subtle cards to floating dialogs.',
    Component: Step7_Shadow,
    Icon: ic('M8 4h10a2 2 0 0 1 2 2v10M4 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z', '1.8'),
  },
  {
    key: 'grid',
    label: 'Grid',
    short: 'Grid',
    hint: 'Columns, gutters & breakpoints',
    title: 'Grid',
    subtitle: 'Set the layout grid — columns, gutter, margins, container and breakpoints.',
    Component: Step8_Grid,
    Icon: ic('M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', '1.8'),
  },
  {
    key: 'sizes',
    label: 'Sizes',
    short: 'Sizes',
    hint: 'Component size scale',
    title: 'Sizes',
    subtitle: 'Standardize component heights — from compact controls to hero CTAs.',
    Component: Step9_Sizes,
    Icon: ic('M4 20V4M20 20V4M8 12h8M8 12l2.5-2.5M8 12l2.5 2.5M16 12l-2.5-2.5M16 12l-2.5 2.5', '1.8'),
  },
]

// The "Variables" half of the rail (Styles = icons/opacity/shadow/grid) —
// also the exact category list HomeActions' "New" menu offers, so the two
// can never drift apart.
const VARIABLE_FOUNDATIONS = FOUNDATIONS.filter((f) => !['icons', 'opacity', 'shadow', 'grid'].includes(f.key))

// Component categories get icons too, so the Components/Documentation rail
// reads exactly like the Variables one (same row shape, icon + label).
const CATEGORY_ICONS: Record<string, ComponentType> = {
  'Button & Actions':    ic('M9 3v11l2.5-2.5L14 17l2.5-1-2.5-5.5H18z', '1.8'),
  'Form Controls':       ic('M3 7.5h18|M3 16.5h18|M8 5v5|M16 14v5', '1.8'),
  'Indicators':          ic('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z|M12 8v4.5|M12 16h.01', '1.8'),
  'Content & Surfaces':  ic('M4 5h16v14H4z|M4 10h16', '1.8'),
  'Feedback':            ic('M21 14a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z', '1.8'),
  'Navigation':          ic('M4 6h16|M4 12h9|M4 18h16', '1.8'),
}

// Which export-wizard collections a foundation opens pre-checked, so "Export"
// starts scoped to the section you're looking at (still fully re-selectable).
const COLLECTIONS_OF: Record<string, WizardCollection[]> = {
  color: ['primitives', 'semantics'],
  typography: ['typography'],
  spacing: ['spacing'],
  radius: ['radius'],
  opacity: ['opacity'],
  shadow: ['shadow'],
  grid: ['grid'],
  sizes: ['sizes'],
  icons: ['icons'],
}

const ComponentsIcon = ic('M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8')
const CodeIcon = ic('M16 18l6-6-6-6M8 6l-6 6 6 6')
const DocIcon = ic('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6')
const SaveIcon: ComponentType = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
)

// Figma brand mark (monochrome — tracks currentColor so it inherits the header tint).
const FigmaIcon: ComponentType = () => (
  <svg width="11" height="16" viewBox="0 0 38 57" fill="currentColor" aria-hidden>
    <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
    <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
    <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
    <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
    <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
  </svg>
)

// GitHub brand mark (monochrome — tracks currentColor like the Figma glyph).
const GitHubIcon: ComponentType = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
)

function CatalogueCheck() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <path d="M2 5.2 4 7.2 8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type ExportMode = 'code' | 'md' | 'figma' | 'github' | 'save' | null

// ── Center header (icon + colored title + | + subtitle [+ export]) ───────────
function CenterHeader({ Icon, title, subtitle, onExport, accentColor, rightSlot }: { Icon: ComponentType; title: string; subtitle: string; onExport?: () => void; accentColor?: string; rightSlot?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-6 lg:px-8 h-[52px] border-b border-line/60 flex-shrink-0">
      <span className="flex-shrink-0" style={{ color: accentColor }}>
        <Icon />
      </span>
      <h1 className="text-sm font-semibold flex-shrink-0" style={{ color: accentColor }}>{title}</h1>
      <span className="text-line-strong flex-shrink-0">|</span>
      <p className="text-sm text-fg-faint truncate">{subtitle}</p>
      {(rightSlot || onExport) && (
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          {rightSlot}
          {onExport && (
            <HeaderPill
              Icon={ExportIcon}
              label="Export"
              onClick={onExport}
              title="Copy this section as CSS · Tailwind · Tokens · MD"
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Quick-edit trigger — a compact icon button that opens the shared
// QuickFoundationsPanel popover (Presets swatch row + the full accordion of
// quick controls). Shared by Variables and Components so "Quick edit" reads
// identically wherever it's parked in the header. ────────────────────────────
function QuickEditTrigger({
  open, onToggle, onClose, onOpenFoundations, previewTheme, onThemeChange, onAddTheme,
}: {
  open: boolean
  onToggle: () => void
  onClose: () => void
  onOpenFoundations: () => void
  previewTheme: string
  onThemeChange: (theme: string) => void
  onAddTheme: () => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-label="Quick edit foundations"
        aria-expanded={open}
        title="Quick edit — presets and foundations without leaving this view"
        className={`flex-shrink-0 p-1.5 rounded-lg border transition-colors ${
          open ? 'bg-elevated border-line-strong text-fg' : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      </button>
      <QuickFoundationsPanel
        open={open}
        onClose={onClose}
        onOpenFoundations={onOpenFoundations}
        previewTheme={previewTheme}
        onThemeChange={onThemeChange}
        onAddTheme={onAddTheme}
      />
    </div>
  )
}

export default function Configurator() {
  const { primaryScale, primaryColor, selectedComponents, toggleComponent, markFoundationComplete, iconLibrary, themeKinds, projectCreated } = useDesignStore()
  const theme = useTheme()
  // Re-publish to /api/tokens after edits while auto-sync is on (no-op otherwise).
  useAutoFigmaSync()
  const [tab, setTab] = useState<Tab>('foundations')
  // Every session lands on Variables · Color — no separate landing screen.
  const [activeFoundation, setActiveFoundation] = useState<string>('color')
  const [activeComponent, setActiveComponent] = useState<ComponentDef | null>(
    () => COMPONENTS.find((c) => c.key === 'Button') ?? null,
  )
  const [exportMode, setExportMode] = useState<ExportMode>(null)
  // Active Semantic category — shared with the table (master nav) and the preview,
  // so the right panel mirrors whichever token group is being edited.
  const [semanticCategory, setSemanticCategory] = useState<SemanticCategory>('all')
  // Sub-tab within the Color hub (Picker ↔ Primary ↔ Alias/Semantics ↔
  // Gradients). The preview mirrors the semantic category only while the
  // semantics tab is active.
  const [colorTab, setColorTab] = useState<ColorTab>('primary')
  // Primary Color's "Edit in Picker Color" link — switches to Picker Color
  // AND tells it which section (accent/neutral/error/warning/success/info) to
  // scroll to and pulse.
  const [pickerFocusTarget, setPickerFocusTarget] = useState<PickerFocusTarget>(null)
  const onEditInPicker = (target: Exclude<PickerFocusTarget, null>) => {
    setColorTab('picker')
    setPickerFocusTarget(target)
  }
  // Single preview theme shared across the whole workspace — Home's Quick edit
  // Theme row, the Semantic table's column eye toggles, the Components/Docs
  // playground and the right-hand Components Preview all read and write the
  // same state, so switching to Dark anywhere previews Dark everywhere.
  // Initialized from the PERSISTED chrome theme (`sd-theme`), not hardcoded to
  // 'light': previewTheme itself isn't persisted, but the chrome class is, so a
  // reload while dark chrome was active used to start every preview back on
  // light — Alias/Semantics' theme selector, Picker Color's transparency ramp,
  // and PreviewPanel would all read light tokens under dark chrome until the
  // user re-clicked the toggle twice to resync.
  const [previewTheme, setPreviewTheme] = useState(() => {
    if (getTheme() !== 'dark') return 'light'
    if (themeKinds.dark === 'dark') return 'dark'
    return Object.keys(themeKinds).find((k) => themeKinds[k] === 'dark') ?? 'light'
  })
  // Picking a theme also flips the app chrome to that theme's kind, so a dark
  // preview (built-in dark or any future dark-kind theme) reads on dark chrome.
  const changePreviewTheme = (key: string) => {
    setPreviewTheme(key)
    setTheme((themeKinds[key] ?? 'light') === 'dark' ? 'dark' : 'light')
  }
  // Right preview panel can be collapsed for more center width; re-expanded
  // via the slim strip that replaces it while collapsed. Starts EXPANDED: it's
  // a persistent, always-visible specimen of the category being edited, not an
  // opt-in extra — collapsing is still available for anyone who wants the width.
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  // Components catalogue — quick-edit popover for the Foundations you've already set.
  const [quickPanelOpen, setQuickPanelOpen] = useState(false)
  // Per-section export window (CSS · Tailwind · Tokens · MD) — opened from the header.
  const [sectionExportOpen, setSectionExportOpen] = useState(false)
  // Import-your-design-system modal (paste/drop a tokens JSON → review → adopt).
  const [importOpen, setImportOpen] = useState(false)
  const [newSystemOpen, setNewSystemOpen] = useState(false)
  // "New" in Variables — picking a category from HomeActions' menu opens the
  // guided NewTokenWizard scoped to it.
  const [newTokenCategory, setNewTokenCategory] = useState<TokenCategory | null>(null)
  // A color family the wizard just created — ColorPrimitives switches its
  // active family to this so the table actually shows what was just made.
  const [focusColorFamily, setFocusColorFamily] = useState<string | null>(null)
  // Components catalogue — filters the master list by label/key.
  const [componentSearch, setComponentSearch] = useState('')
  // Active component category (Components section sub-nav) — filters the list.
  const [componentCategory, setComponentCategory] = useState<string>(CATEGORIES[0])

  const section = FOUNDATIONS.find((s) => s.key === activeFoundation) ?? FOUNDATIONS[0]
  // Every foundation section can export its token slice.
  const canExportSection = tab === 'foundations' && !exportMode

  // ── Chrome accent — the UI's own highlight color (table active states,
  // modified dots, previewed-theme tints via `accent-ui`) tracks the system's
  // primary, adjusted for readability on dark chrome like the header/rail.
  const uiAccent =
    theme === 'dark'
      ? readableAccent(primaryScale[9] ?? primaryColor, '#0a0a0a')
      : primaryScale[9] ?? primaryColor
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-ui', uiAccent)
  }, [uiAccent])

  // ── Layer 0: brand-derived gradient (re-derives live with brand + theme) ──
  const s = primaryScale
  const gradient =
    theme === 'dark'
      ? `linear-gradient(160deg, ${s[12] ?? '#1c1c1c'} 0%, #0a0a0a 48%)`
      : `linear-gradient(160deg, ${s[3] ?? s[2] ?? primaryColor ?? '#ede9fe'} 0%, ${s[1] ?? '#faf5ff'} 42%, #ffffff 100%)`

  // ── Navigation handlers (selecting anything leaves export mode) ──
  // Marking happens on *leave*: a foundation counts as visited for the
  // progress checklist once the user navigates away from it.
  const commitVisit = () => {
    if (!exportMode && tab === 'foundations') {
      markFoundationComplete(activeFoundation)
    }
  }
  const selectFoundation = (key: string) => {
    commitVisit()
    setExportMode(null)
    setTab('foundations')
    setActiveFoundation(key)
  }
  const selectComponent = (c: ComponentDef) => {
    commitVisit()
    markFoundationComplete('components')
    setExportMode(null)
    setTab('components')
    setActiveComponent(c)
  }
  const changeTab = (t: Tab) => {
    commitVisit()
    if (t === 'components') markFoundationComplete('components')
    setExportMode(null)
    setTab(t)
  }
  const openExport = (mode: Exclude<ExportMode, null>) => {
    commitVisit()
    setExportMode(mode)
  }
  // ── Resolve center header + body for the current mode ──
  let header: { Icon: ComponentType; title: string; subtitle: string }
  let body: ReactNode
  let centerKey: string
  let centerRightSlot: ReactNode = null

  if (exportMode === 'github') {
    header = { Icon: GitHubIcon, title: 'GitHub', subtitle: 'Version your design system in a repository.' }
    body = (
      <div className="h-full overflow-y-auto">
        <GitHubConnectView onClose={() => setExportMode(null)} />
      </div>
    )
    centerKey = 'export-github'
  } else if (exportMode === 'figma') {
    header = { Icon: FigmaIcon, title: 'Figma', subtitle: 'Install the sync plugin and bring your tokens into Figma.' }
    body = (
      <div className="h-full overflow-y-auto">
        <FigmaConnectView onClose={() => setExportMode(null)} />
      </div>
    )
    centerKey = 'export-figma'
  } else if (exportMode === 'md') {
    header = { Icon: DocIcon, title: 'Docs', subtitle: 'Your didactic README — preview, copy or download it.' }
    body = (
      <div className="h-full overflow-y-auto">
        <ExportView initialTab="markdown" onClose={() => setExportMode(null)} />
      </div>
    )
    centerKey = 'export-md'
  } else if (exportMode === 'code') {
    header = { Icon: CodeIcon, title: 'Export', subtitle: 'tokens.json and variables.css for your codebase.' }
    body = (
      <div className="h-full overflow-y-auto">
        <ExportView initialTab="tokens" onClose={() => setExportMode(null)} />
      </div>
    )
    centerKey = 'export-code'
  } else if (exportMode === 'save') {
    header = { Icon: SaveIcon, title: 'Save & Share', subtitle: 'Copy the README or the CSS into Stitch, Claude or Codex or any IDE context!' }
    body = (
      <div className="h-full overflow-y-auto p-8">
        <SaveView onImport={() => setImportOpen(true)} onNewSystem={() => setNewSystemOpen(true)} />
      </div>
    )
    centerKey = 'export-save'
  } else if (tab === 'foundations') {
    header = { Icon: section.Icon, title: section.title, subtitle: section.subtitle }
    centerRightSlot = (
      <>
        <QuickEditTrigger
          open={quickPanelOpen}
          onToggle={() => setQuickPanelOpen((v) => !v)}
          onClose={() => setQuickPanelOpen(false)}
          onOpenFoundations={() => selectFoundation('color')}
          previewTheme={previewTheme}
          onThemeChange={changePreviewTheme}
          onAddTheme={() => { selectFoundation('color'); setColorTab('semantics') }}
        />
        <HomeActions
          onNew={(key) => setNewTokenCategory(key as TokenCategory)}
          onImport={() => setImportOpen(true)}
          tokenCategories={VARIABLE_FOUNDATIONS.map((f) => ({ key: f.key, label: f.short, Icon: f.Icon }))}
        />
      </>
    )
    const Active = section.Component
    body = section.key === 'color' ? (
      // Color hub manages its own per-tab scroll (Gradients scrolls; the Alias
      // table self-scrolls with pinned headers) — no outer overflow here.
      <div className="h-full min-h-0">
        <ColorHub
          colorTab={colorTab}
          onColorTabChange={setColorTab}
          activeCategory={semanticCategory}
          onCategoryChange={setSemanticCategory}
          previewTheme={previewTheme}
          onPreviewThemeChange={changePreviewTheme}
          focusFamilyKey={focusColorFamily}
          pickerFocusTarget={pickerFocusTarget}
          onPickerFocusHandled={() => setPickerFocusTarget(null)}
          onEditInPicker={onEditInPicker}
        />
      </div>
    ) : section.key === 'typography' ? (
      // Typography owns its own internal scroll so its top bar + section column
      // headers can stay pinned — no outer overflow here.
      <div className="h-full p-8 flex flex-col min-h-0">
        <Active />
      </div>
    ) : (
      <div className="h-full overflow-y-auto p-8">
        <Active />
      </div>
    )
    centerKey = `f-${section.key}`
  } else if (tab === 'docs') {
    header = {
      Icon: DocIcon,
      title: 'Documentation',
      subtitle: 'The full reference for every component — usage, examples, accessibility and API.',
    }
    body = <DocsView previewTheme={previewTheme} category={componentCategory} />
    centerKey = 'docs'
  } else {
    header = {
      Icon: ComponentsIcon,
      title: 'Components',
      subtitle: 'Browse the catalogue — toggle any component to include or remove it.',
    }
    centerRightSlot = (
      <QuickEditTrigger
        open={quickPanelOpen}
        onToggle={() => setQuickPanelOpen((v) => !v)}
        onClose={() => setQuickPanelOpen(false)}
        onOpenFoundations={() => selectFoundation('color')}
        previewTheme={previewTheme}
        onThemeChange={changePreviewTheme}
        onAddTheme={() => { selectFoundation('color'); setColorTab('semantics') }}
      />
    )
    body = (
      <div className="h-full flex min-h-0">
        {/* Master list (relocated from the old wide sidebar) */}
        <div className="w-52 flex-shrink-0 border-r border-line overflow-y-auto p-3 flex flex-col gap-3">
          <input
            value={componentSearch}
            onChange={(e) => setComponentSearch(e.target.value)}
            placeholder="Search components"
            aria-label="Search components"
            className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[12px] text-fg outline-none focus:border-line-strong placeholder:text-fg-faint"
          />
          {(() => { const q = componentSearch.trim().toLowerCase(); return CATEGORIES
            // No search → just the category picked in the sub-rail; searching
            // spans every category so nothing is hidden behind the filter.
            .filter((cat) => q ? true : cat === componentCategory)
            .map((cat) => {
            const items = COMPONENTS.filter(
              (c) => c.category === cat && (!q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
            )
            if (!items.length) return null
            return (
              <div key={cat} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-fg-faint uppercase tracking-widest px-1">{cat}</span>
                {items.map((comp) => {
                  const isSelected = selectedComponents.includes(comp.key)
                  const isActive = activeComponent?.key === comp.key
                  return (
                    <div
                      key={comp.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectComponent(comp)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          selectComponent(comp)
                        }
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${
                        isActive
                          ? 'bg-surface shadow-sm text-fg border border-line'
                          : 'text-fg-muted hover:bg-elevated/40 hover:text-fg border border-transparent'
                      }`}
                    >
                      <span>{comp.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleComponent(comp.key)
                        }}
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-fg text-app' : 'bg-elevated border border-line-strong'
                        }`}
                        aria-label={isSelected ? `Remove ${comp.label}` : `Add ${comp.label}`}
                      >
                        {isSelected && <CatalogueCheck />}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
            })
          })()}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
          <ComponentDocPane component={activeComponent} previewTheme={previewTheme} />
        </div>
      </div>
    )
    centerKey = `c-${activeComponent?.key ?? 'none'}`
  }

  // Preview is hidden in the Components tab (docs go full-width) and in every
  // export/connect view (Code · Docs · Figma · GitHub) — those own the full
  // panel. Save keeps the aside: it hosts the Overview + Connections panel.
  const showPreview = (tab !== 'components' && tab !== 'docs' && !exportMode) || exportMode === 'save'
  const railActive = !exportMode && tab === 'foundations' ? activeFoundation : null

  // The section rail shows in every editing view and in none of the export /
  // connect views — those own the full width, in every section alike.
  const railVisible = projectCreated && !exportMode

  // The global TopNav is mounted in EVERY view; this maps the current shell
  // state to its lit section.
  const navActive: TopNavKey | null =
    (!exportMode && tab === 'components') ? 'components'
    : (!exportMode && tab === 'docs') ? 'documentation'
    : (!exportMode && tab === 'foundations') ? 'variables'
    : null
  const handleNav = (key: TopNavKey) => {
    if (key === 'variables') selectFoundation('color')
    else if (key === 'components') changeTab('components')
    else changeTab('docs')
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col relative isolate bg-app">
      {/* ── Layer 0: brand gradient ── */}
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: gradient }} />

      {/* ── Row 1: the global top bar — brand block + section nav + actions ── */}
      <TopNav
        nav={navActive}
        onNav={handleNav}
        exportMode={exportMode}
        onGithub={() => openExport('github')}
        onGetFigma={() => openExport('figma')}
        brandWidth={railVisible ? RAIL_WIDTH : null}
        previewTheme={previewTheme}
        onThemeChange={changePreviewTheme}
      />

      <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* ── Body: section sub-rail + floating white panel ── */}
      <div className="flex-1 min-h-0 flex">
        {/* The second column is section-specific: the foundation rail on
            Foundations, the category rail on Components. Documentation carries
            its own catalogue sidebar (DocsView), so no rail there. */}
        {railVisible && tab === 'foundations' && (
          <SectionRail
            ariaLabel="Foundations"
            active={railActive}
            onSelect={selectFoundation}
            // Figma-style split: token tables are Variables; the rest are Styles.
            groups={[
              { label: 'Variables', items: VARIABLE_FOUNDATIONS.map((f) => ({ key: f.key, label: f.short, Icon: f.Icon })) },
              { label: 'Styles', items: FOUNDATIONS.filter((f) => !VARIABLE_FOUNDATIONS.includes(f)).map((f) => ({ key: f.key, label: f.short, Icon: f.Icon })) },
            ]}
          />
        )}
        {railVisible && (tab === 'components' || tab === 'docs') && (
          <SectionRail
            ariaLabel="Component categories"
            active={componentCategory}
            onSelect={setComponentCategory}
            groups={[{
              label: 'Categories',
              items: CATEGORIES.map((cat) => ({ key: cat, label: cat, Icon: CATEGORY_ICONS[cat] })),
            }]}
          />
        )}

        {/* ── Layer 1: the content surface, flush under the top bar ──
            No gap/rounding/lift here: the rail is separated by a single hairline,
            the exact seam the Generator uses between its own two columns. That
            also puts CenterHeader's title on the same line as the rail's group
            caption. */}
        <div className="flex-1 min-w-0 flex overflow-hidden bg-app border-l border-line">
          {/* Center editor */}
          <main className="flex-1 min-w-0 flex flex-col">
            <CenterHeader
              Icon={header.Icon}
              title={header.title}
              subtitle={header.subtitle}
              onExport={canExportSection ? () => setSectionExportOpen(true) : undefined}
              accentColor={theme === 'dark' ? readableAccent(primaryScale[9] ?? primaryColor, '#0a0a0a') : primaryScale[9] ?? primaryColor}
              rightSlot={centerRightSlot}
            />
            <div className="flex-1 min-h-0">
              {/* No `exit` animation and no AnimatePresence: the header (above)
                  and this body both derive from `activeFoundation` in the same
                  render, so they must swap in the same commit. An exit-then-enter
                  sequence (mode="wait") would hold the OLD body on screen under the
                  NEW header for the fade-out duration — a title/content mismatch. */}
              <motion.div
                key={centerKey}
                className="h-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                {body}
              </motion.div>
            </div>
          </main>

          {/* Right live preview (hidden in components tab — full width for docs) */}
          {showPreview && (previewCollapsed ? (
            <button
              onClick={() => setPreviewCollapsed(false)}
              aria-label="Expand preview"
              title="Expand preview"
              className="hidden xl:flex w-8 flex-shrink-0 items-center justify-center border-l border-line bg-app hover:bg-elevated/50 text-fg-faint hover:text-fg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          ) : (
            <aside className="hidden xl:flex w-[400px] flex-shrink-0 overflow-hidden border-l border-line">
              {exportMode === 'save' ? (
                // Save pairs the share/identity center with the system overview.
                <SaveSidePanel
                  onOpenFigma={() => openExport('figma')}
                  onOpenGithub={() => openExport('github')}
                  onCollapse={() => setPreviewCollapsed(true)}
                />
              ) : (
                <PreviewPanel
                  focus={!exportMode && tab === 'foundations' && activeFoundation === 'color' && colorTab === 'semantics' ? semanticCategory : null}
                  categoryKey={!exportMode && tab === 'foundations' ? activeFoundation : null}
                  previewTheme={previewTheme}
                  iconLibraryKey={!exportMode && tab === 'foundations' && activeFoundation === 'icons' ? iconLibrary : null}
                  onNavigateFoundation={(key) => {
                    if (key === 'components') { setTab('components') }
                    else { setTab('foundations'); setActiveFoundation(key) }
                  }}
                  onCollapse={() => setPreviewCollapsed(true)}
                />
              )}
            </aside>
          ))}
        </div>
      </div>
      </div>
      </div>

      {/* Guided export — Source → Format → Export */}
      <AnimatePresence>
        {sectionExportOpen && canExportSection && (
          <ExportWizard
            initialCollections={COLLECTIONS_OF[activeFoundation] ?? ['primitives', 'semantics']}
            onClose={() => setSectionExportOpen(false)}
            onConnectGithub={() => { setSectionExportOpen(false); openExport('github') }}
          />
        )}
      </AnimatePresence>

      {/* Import-your-design-system window */}
      <AnimatePresence>
        {importOpen && (
          <ImportSystemModal
            onClose={() => setImportOpen(false)}
            onImported={() => {
              setImportOpen(false)
              // Land on Variables · Color so the tables render the freshly imported system.
              setExportMode(null)
              setTab('foundations')
              setActiveFoundation('color')
            }}
          />
        )}
      </AnimatePresence>


      {/* New-design-system window — name + accent, then straight into Foundations */}
      <AnimatePresence>
        {newSystemOpen && (
          <NewSystemModal
            onClose={() => setNewSystemOpen(false)}
            onCreated={() => {
              setNewSystemOpen(false)
              // Land on Foundations · Color so the guided flow continues into tokens.
              setExportMode(null)
              setTab('foundations')
              setActiveFoundation('color')
              setColorTab('primary')
            }}
          />
        )}
      </AnimatePresence>

      {/* Guided token creation — Name/Target → Value/Scale → Confirm, so "New"
          never lands straight on the full table. */}
      <AnimatePresence>
        {newTokenCategory && (
          <NewTokenWizard
            category={newTokenCategory}
            Icon={FOUNDATIONS.find((f) => f.key === newTokenCategory)?.Icon ?? FOUNDATIONS[0].Icon}
            onClose={() => setNewTokenCategory(null)}
            onDone={(focusKey) => {
              const category = newTokenCategory
              setNewTokenCategory(null)
              selectFoundation(category)
              if (category === 'color' && focusKey) {
                // Land on the family the wizard just created (or the Accent it
                // just replaced), on the tab that renders the families table.
                setColorTab('primary')
                setFocusColorFamily(focusKey)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
