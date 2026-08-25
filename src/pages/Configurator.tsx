import { useState, useEffect, useRef, type ComponentType, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../store/useDesignStore'
import { useTheme, getTheme, setTheme } from '../lib/theme'
import { chromeAccent, readableInk, solidInkPair } from '../lib/colorUtils'
import { useAutoFigmaSync } from '../lib/figmaSync'
import { useLoadActiveFonts } from '../lib/fonts'
import { useRegenerateScalesOnScaleSettings } from '../lib/colorActions'
import { RAIL_WIDTH, RAIL_COLLAPSED_WIDTH } from '../components/configurator/SectionRail'
import FoundationIconRail from '../components/configurator/FoundationIconRail'
import FoundationWorkbench from '../components/configurator/FoundationWorkbench'
import TopNav, { type TopNavKey } from '../components/configurator/TopNav'
import { AboutHome, COPYRIGHT_LINE } from '../components/configurator/AboutMenu'
import { hasOnboarded, markOnboarded } from '../lib/onboarding'
import { ChromeTabDefs } from '../components/ui/ChromeTabShape'

// Four tabs, matching the four top-nav destinations: read "what this is"
// ('about' — the landing surface for new visitors, see `hasOnboarded()`
// below), EDIT the system ('foundations' — the Variables Generator), browse
// the catalogue ('components'), or read the token reference ('docs').
// Components and Docs used to be folded into one 'docs' tab (a single rail
// with two groups); split back into their own tabs, each with its own
// single-purpose rail.
type Tab = 'about' | 'foundations' | 'components' | 'docs'
import PreviewPanel from '../components/preview/PreviewPanel'
import ExportView from '../components/configurator/ExportView'
import FigmaSyncView from '../components/configurator/FigmaSyncView'
import FigmaDownloadView from '../components/configurator/FigmaDownloadView'
import GitHubConnectView from '../components/configurator/GitHubConnectView'
import IconLibrary from '../components/configurator/IconLibrary'
import ComponentsRail from '../components/configurator/ComponentsRail'
import ComponentsView from '../components/configurator/ComponentsView'
import DocsView, { GET_STARTED_KEY, OVERVIEW_KEY, CHANGELOG_KEY } from '../components/configurator/DocsView'
import DocsRail, { type DocsRailRow } from '../components/configurator/DocsRail'
import { FOUNDATION_DOCS } from '../components/configurator/docs/foundationDocs'
import { GUIDE_AI_KEY, GUIDE_CODE_KEY, GUIDE_FIGMA_KEY } from '../components/configurator/docs/getStarted'
import SaveView, { SaveSidePanel } from '../components/configurator/SaveView'
import HomeActions from '../components/configurator/HomeActions'
import Step2_ColorPalette from '../components/configurator/Step2_ColorPalette'
import ColorHub, { type ColorTab } from '../components/configurator/ColorHub'
import TypeHub, { type TypeTab } from '../components/configurator/TypeHub'
import { COLOR_RAIL_WIDTH, COLOR_RAIL_COLLAPSED_WIDTH } from '../components/configurator/colorControls'
import { type SemanticFocus } from '../components/configurator/Step3_SemanticTokens'
import { type TypeFocus } from '../components/configurator/TypeSemantics'
import ExportWizard from '../components/configurator/ExportWizard'
import { type WizardCollection } from '../lib/exportWizard'
import ImportSystemModal from '../components/configurator/ImportSystemModal'
import NewSystemModal from '../components/configurator/NewSystemModal'
import Step4_Typography from '../components/configurator/Step4_Typography'
import Step5_Spacing from '../components/configurator/Step5_Spacing'
import StepRadius from '../components/configurator/StepRadius'
import Step7_Shadow from '../components/configurator/Step7_Shadow'
import Step8_Grid from '../components/configurator/Step8_Grid'
import Step9_Sizes from '../components/configurator/Step9_Sizes'
import StepStroke from '../components/configurator/StepStroke'
import LayoutHub from '../components/configurator/LayoutHub'
import GridSemantics from '../components/configurator/GridSemantics'
import { COMPONENTS, type ComponentDef } from '../lib/componentCatalogue'
import { PaletteIcon } from '../components/ui/icons'

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
  /** Workbench column heading — names this family, not a generic “Groups”. */
  variablesLabel: string
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
    variablesLabel: 'Color Variables',
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
    hint: 'Primitive scale + text roles',
    title: 'Typography',
    variablesLabel: 'Text Variables',
    subtitle: 'Primitives for the scale, then semantic text styles — labels, placeholders, headings — mapped for desktop and mobile.',
    Component: Step4_Typography,
    Icon: ic('M8 7H16M12 7V17M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z'),
  },
  {
    key: 'radius',
    label: 'Border Radius',
    short: 'Radius',
    hint: 'Corner-radius personality',
    title: 'Border Radius',
    variablesLabel: 'Radius Variables',
    subtitle: 'Primitives for the scale, then semantic aliases — action, container, overlay — mapped onto that ramp.',
    Component: StepRadius,
    Icon: ic('M5 19V11C5 7.68629 7.68629 5 11 5H19', '1.8'),
  },
  {
    key: 'spacing',
    label: 'Spacing',
    short: 'Spacing',
    hint: 'Base spacing scale',
    title: 'Spacing',
    variablesLabel: 'Spacing Variables',
    subtitle: 'Primitives for the 4px grid, then semantic aliases — gaps and insets — mapped onto that scale.',
    Component: Step5_Spacing,
    Icon: ic('M21 21V3M3 21V3M9 8V16C9 16.9319 9 17.3978 9.15224 17.7654C9.35523 18.2554 9.74458 18.6448 10.2346 18.8478C10.6022 19 11.0681 19 12 19C12.9319 19 13.3978 19 13.7654 18.8478C14.2554 18.6448 14.6448 18.2554 14.8478 17.7654C15 17.3978 15 16.9319 15 16V8C15 7.06812 15 6.60218 14.8478 6.23463C14.6448 5.74458 14.2554 5.35523 13.7654 5.15224C13.3978 5 12.9319 5 12 5C11.0681 5 10.6022 5 10.2346 5.15224C9.74458 5.35523 9.35523 5.74458 9.15224 6.23463C9 6.60218 9 7.06812 9 8Z'),
  },
  {
    key: 'shadow',
    label: 'Shadow',
    short: 'Shadow',
    hint: 'Elevation levels',
    title: 'Shadow',
    variablesLabel: 'Shadow Variables',
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
    variablesLabel: 'Grid Variables',
    subtitle: 'Breakpoint primitives, then desktop / mobile aliases — the cut Type and the layout grid share.',
    Component: Step8_Grid,
    Icon: ic('M7.5 12h.01m8.99 0h.01M12 12h.01M12 16.5h.01m-.01-9h.01M3 7.8v8.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 21 6.12 21 7.8 21h8.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 18.72 21 17.88 21 16.2V7.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C18.72 3 17.88 3 16.2 3H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 5.28 3 6.12 3 7.8Z'),
  },
  {
    key: 'sizes',
    label: 'Sizes',
    short: 'Sizes',
    hint: 'Component size scale',
    title: 'Sizes',
    variablesLabel: 'Size Variables',
    subtitle: 'Control heights, then semantic aliases — compact, control, touch — mapped onto that ramp.',
    Component: Step9_Sizes,
    Icon: ic('M4 20V4M20 20V4M8 12h8M8 12l2.5-2.5M8 12l2.5 2.5M16 12l-2.5-2.5M16 12l-2.5 2.5', '1.8'),
  },
  {
    key: 'stroke',
    label: 'Stroke',
    short: 'Stroke',
    hint: 'Border width & focus ring',
    title: 'Stroke',
    variablesLabel: 'Stroke Variables',
    subtitle: 'Line weight primitives, then semantic aliases — divider, control, focus — not paint.',
    Component: StepStroke,
    Icon: ic('M3 3h.01M3 12h.01M3 21h.01M3 16.5h.01M3 7.5h.01M7.5 3h.01m-.01 9h.01m-.01 9h.01M16.5 3h.01m-.01 9h.01m-.01 9h.01M21 3h.01M21 12h.01M21 21h.01M21 16.5h.01m-.01-9h.01M12 21V3'),
  },
  {
    key: 'icons',
    label: 'Icon Library',
    short: 'Icons',
    hint: 'Best icon libraries',
    title: 'Icon Library',
    variablesLabel: 'Icon Library',
    subtitle: 'Pick the icon set your system standardizes on — referenced in your tokens and docs.',
    Component: IconLibrary,
    Icon: ic('M20.5 7.27783L12 12.0001M12 12.0001L3.49997 7.27783M12 12.0001L12 21.5001M21 16.0586V7.94153C21 7.59889 21 7.42757 20.9495 7.27477C20.9049 7.13959 20.8318 7.01551 20.7354 6.91082C20.6263 6.79248 20.4766 6.70928 20.177 6.54288L12.777 2.43177C12.4934 2.27421 12.3516 2.19543 12.2015 2.16454C12.0685 2.13721 11.9315 2.13721 11.7986 2.16454C11.6484 2.19543 11.5066 2.27421 11.223 2.43177L3.82297 6.54288C3.52345 6.70928 3.37369 6.79248 3.26463 6.91082C3.16816 7.01551 3.09515 7.13959 3.05048 7.27477C3 7.42757 3 7.59889 3 7.94153V16.0586C3 16.4013 3 16.5726 3.05048 16.7254C3.09515 16.8606 3.16816 16.9847 3.26463 17.0893C3.37369 17.2077 3.52345 17.2909 3.82297 17.4573L11.223 21.5684C11.5066 21.726 11.6484 21.8047 11.7986 21.8356C11.9315 21.863 12.0685 21.863 12.2015 21.8356C12.3516 21.8047 12.4934 21.726 12.777 21.5684L20.177 17.4573C20.4766 17.2909 20.6263 17.2077 20.7354 17.0893C20.8318 16.9847 20.9049 16.8606 20.9495 16.7254C21 16.5726 21 16.4013 21 16.0586Z'),
  },
]

// The "Variables" half of the rail (Styles = icons/shadow) —
// also the exact category list HomeActions' "New" menu offers, so the two
// can never drift apart.
const VARIABLE_FOUNDATIONS = FOUNDATIONS.filter((f) => !['icons', 'shadow'].includes(f.key))

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
  shadow: ['shadow'],
  grid: ['grid'],
  sizes: ['sizes'],
  stroke: ['stroke'],
  icons: ['icons'],
}

const ComponentsIcon = ic('M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8')
// Docs (the token reference) — a ruled page, distinct from DocIcon's plain
// sheet (the README export).
const RulesIcon = ic('M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z|M8 7h8|M8 12h8|M8 17h5', '1.8')
const StartIcon = ic('M12 3l2.1 6.4H21l-5.4 3.9 2.1 6.4L12 16.8 6.3 19.7 8.4 13.3 3 9.4h6.9z', '1.8')
const SparkIcon = ic('M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1', '1.8')
const CodeIcon = ic('M16 18l6-6-6-6M8 6l-6 6 6 6')
const ClockIcon: ComponentType = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
)
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

/** Docs rail — Get started first, then the token sheet, then foundations. */
const DOCS_RAIL_ROWS: DocsRailRow[] = [
  { key: GET_STARTED_KEY, label: 'Get started', Icon: StartIcon, heading: 'Start' },
  { key: GUIDE_FIGMA_KEY, label: 'Use in Figma', Icon: FigmaIcon },
  { key: GUIDE_CODE_KEY, label: 'Use in code', Icon: CodeIcon },
  { key: GUIDE_AI_KEY, label: 'Use with AI', Icon: SparkIcon },
  { key: CHANGELOG_KEY, label: 'Changelog', Icon: ClockIcon },
  { key: OVERVIEW_KEY, label: 'System reference', Icon: RulesIcon, heading: 'Reference' },
  ...FOUNDATION_DOCS.map((d) => {
    const section = FOUNDATIONS.find((f) => f.key === d.key)
    return { key: d.key, label: d.label, Icon: section?.Icon }
  }),
]

type ExportMode = 'code' | 'md' | 'figma-sync' | 'figma-download' | 'github' | 'save' | null

function themeLabel(key: string): string {
  if (key === 'light') return 'Light'
  if (key === 'dark') return 'Dark'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/** One Theme menu for any count. A Light/Dark segment only works for the
 *  default pair — extra style themes are named keys (`forest`, `brand-b`),
 *  each with its own palette and a light/dark kind. Same trigger at 2 or 12. */
function PreviewThemeSwitch({
  themes,
  kinds,
  value,
  onChange,
}: {
  themes: string[]
  kinds: Record<string, 'light' | 'dark'>
  value: string
  onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = themes.includes(value) ? value : themes[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (themes.length < 2 || !current) return null

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Preview theme ${themeLabel(current)}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg border border-line bg-app text-[12px] font-medium hover:border-line-strong transition-colors"
      >
        <span className="text-fg-faint font-normal">Theme</span>
        <span className="text-fg truncate max-w-[8rem]">{themeLabel(current)}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" className="text-fg-faint" strokeWidth="1.6" aria-hidden>
          <path d="M3 4.5 6 8l3-3.5" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Preview theme"
          className="absolute right-0 top-full mt-1 z-50 w-56 max-h-64 overflow-y-auto py-1 rounded-lg border border-line bg-surface shadow-[0_12px_32px_-12px_rgba(0,0,0,0.28)]"
        >
          {themes.map((t) => {
            const on = t === current
            const kind = kinds[t] ?? 'light'
            return (
              <li key={t}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => { onChange(t); setOpen(false) }}
                  className={`w-full flex items-center justify-between gap-3 px-2.5 py-1.5 text-left transition-colors ${
                    on ? 'bg-accent-ui/[0.06]' : 'hover:bg-elevated/60'
                  }`}
                >
                  <span className={`text-[12px] font-medium truncate ${on ? 'text-accent-ui' : 'text-fg'}`}>
                    {themeLabel(t)}
                  </span>
                  <span className="text-[11px] text-fg-faint capitalize flex-shrink-0">{kind}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Center header (icon + colored title + | + subtitle [+ export]) ───────────
function CenterHeader({ Icon, title, subtitle, accentColor, right }: { Icon: ComponentType; title: string; subtitle: string; accentColor?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-6 lg:px-8 h-[52px] border-b border-line/60 flex-shrink-0">
      <span className="flex-shrink-0" style={{ color: accentColor }}>
        <Icon />
      </span>
      <h1 className="text-sm font-semibold flex-shrink-0" style={{ color: accentColor }}>{title}</h1>
      <span className="text-line-strong flex-shrink-0">|</span>
      <p className="text-sm text-fg-faint truncate min-w-0 max-w-md">{subtitle}</p>
      {right && <div className="flex-shrink-0 ml-auto">{right}</div>}
    </div>
  )
}

export default function Configurator() {
  const reduceMotion = useReducedMotion() ?? false
  // `selectedComponents`/`toggleComponent` are no longer read here — the
  // include checkbox moved into ComponentsView along with the master list.
  const { primaryScale, primaryDarkScale, primaryColor, markFoundationComplete, iconLibrary, themeKinds, themeOrder, themes, projectCreated } = useDesignStore()
  const theme = useTheme()
  // Re-publish to /api/tokens after edits while auto-sync is on (no-op otherwise).
  useAutoFigmaSync()
  // Fetches the configured typeface's webfont — mounted here (not inside the
  // Typography foundation) so every foundation's PreviewPanel actually
  // renders in it from first paint, not just after a visit to Font.
  useLoadActiveFonts()
  // Rebuilds every ramp when the contrast shift changes — mounted here, not in
  // a foundation, so it can't be orphaned by which component the Color section
  // happens to render (see the hook's own note).
  useRegenerateScalesOnScaleSettings()
  // Every session lands on Variables · Color — EXCEPT a first-time visitor
  // (no persisted store in this browser yet, `hasOnboarded()` in
  // `lib/onboarding.ts`), who lands on About instead. This is the one
  // exception to "no separate landing screen": About is a real tab a
  // returning user can still switch to any time, not a wizard step.
  const [tab, setTab] = useState<Tab>(() => (hasOnboarded() ? 'foundations' : 'about'))
  // Leaving About for anything else marks this browser onboarded, so the
  // NEXT reload lands on Variables · Color instead. Every existing path that
  // changes tabs (`selectFoundation`, `changeTab`, `selectComponent`,
  // `openDocs`) already calls `setTab`, so this one effect covers all of
  // them without a second call site to remember.
  useEffect(() => {
    if (tab !== 'about') markOnboarded()
  }, [tab])
  const [activeFoundation, setActiveFoundation] = useState<string>('color')
  const [activeComponent, setActiveComponent] = useState<ComponentDef | null>(
    () => COMPONENTS.find((c) => c.key === 'Button') ?? null,
  )
  const [exportMode, setExportMode] = useState<ExportMode>(null)
  // Which semantic GROUP the preview should specimen — reported by
  // Step3_SemanticTokens, normalized so it means the same thing whichever
  // architecture is active. The table owns its own nav selection; this is
  // report-only. (They were one shared value before, which is what kept the
  // non-flat architectures' preview stuck on the generic overview.)
  const [semanticFocus, setSemanticFocus] = useState<SemanticFocus | 'all'>('all')
  // Sub-tab within the Color hub (Primitives ↔ Semantics ↔ Gradients). The
  // preview mirrors the semantic category only while the semantics tab is
  // active.
  const [colorTab, setColorTab] = useState<ColorTab>('primary')
  const [typeTab, setTypeTab] = useState<TypeTab>('primary')
  const [typeFocus, setTypeFocus] = useState<TypeFocus>('all')
  const [typeReveal, setTypeReveal] = useState<{ key: string; seq: number } | null>(null)
  const [layoutReveal, setLayoutReveal] = useState<{ key: string; seq: number } | null>(null)
  const [colorReveal, setColorReveal] = useState<{ key: string; seq: number; as?: 'token' | 'group' } | null>(null)
  // Primitives' own 198px left column (accent-color cell · Groups · family
  // nav), collapsed to a swatch strip. Lifted for the same reason `colorTab`
  // is: TopNav's brand block continues this column's divider up through the
  // header (`brandWidth` below), so the shell has to know the width to keep
  // that one rule unbroken. Not persisted — a per-session working preference,
  // like `previewCollapsed`.
  const [colorRailCollapsed, setColorRailCollapsed] = useState(false)
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
  const [previewThemeRaw, setPreviewTheme] = useState(() => {
    if (getTheme() !== 'dark') return 'light'
    if (themeKinds.dark === 'dark') return 'dark'
    return Object.keys(themeKinds).find((k) => themeKinds[k] === 'dark') ?? 'light'
  })
  // CLAMPED to a theme the current system actually has. `previewThemeRaw` can
  // point at a theme that no longer exists, and nothing used to notice:
  //
  //  · **Loading a theme-scoped system.** Saving "just one theme" narrows
  //    `themeOrder` (see `scopeSnapshotToTheme`), so loading a Dark-only kit
  //    while previewing light left `previewTheme === 'light'` against a system
  //    with no light theme. Measured: `resolvePreviewTokens(state, 'light')`
  //    fell through `themes[key] ?? themes.light ?? {}` to an empty map and
  //    `themeKinds[key] ?? 'light'`, rendering surface `#fdfdfd` / text
  //    `#0a0d12` — a fully LIGHT preview of a system whose only theme is dark,
  //    beside a Semantics table showing one Dark column.
  //  · **Deleting the previewed theme.** `removeTheme` drops the key and never
  //    looks at what is being previewed — the same dangling reference by
  //    another route.
  //
  // Derived rather than corrected through an effect on purpose: a `useEffect`
  // that calls `setPreviewTheme` is the cascading-render pattern the React
  // lint rule flags, and it would fight `changePreviewTheme` on every load.
  // The RAW value is deliberately kept, so re-loading a system that has the
  // user's preferred theme again snaps back to it instead of stranding them on
  // whatever the narrow system happened to carry.
  const previewTheme = themeOrder.includes(previewThemeRaw) ? previewThemeRaw : (themeOrder[0] ?? 'light')
  // Picking a theme also flips the app chrome to that theme's kind, so a dark
  // preview (built-in dark or any future dark-kind theme) reads on dark chrome.
  const changePreviewTheme = (key: string) => {
    setPreviewTheme(key)
    setTheme((themeKinds[key] ?? 'light') === 'dark' ? 'dark' : 'light')
  }
  // Chrome follows the CLAMPED theme, not the raw one — otherwise the clamp
  // above fixes the preview's tokens and leaves the app painted in the other
  // appearance, which is the same "previewed theme and chrome flip together"
  // contract broken one layer down. This is an effect because its target is
  // the document's own class (`lib/theme.ts`), an external system — not React
  // state, so it is not the cascading-render pattern the note above avoids.
  useEffect(() => {
    setTheme((themeKinds[previewTheme] ?? 'light') === 'dark' ? 'dark' : 'light')
  }, [previewTheme, themeKinds])
  // Right preview panel can be collapsed for more center width; re-expanded
  // via the slim strip that replaces it while collapsed. Starts EXPANDED: it's
  // a persistent, always-visible specimen of the category being edited, not an
  // opt-in extra — collapsing is still available for anyone who wants the width.
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  // Left section rail (SectionRail) collapsed to an icon-only strip — mirrors
  // the right preview panel's own collapse pattern. TopNav's brand block
  // reads this too (via `railCollapsed` below), so the wordmark drops out in
  // step with the rail instead of leaving orphaned empty space beside it.
  const [railCollapsed, setRailCollapsed] = useState(false)
  // Per-section export window (CSS · Tailwind · Tokens · MD) — opened from the header.
  const [sectionExportOpen, setSectionExportOpen] = useState(false)
  // Which primitive color families the NEXT export run starts scoped to.
  // `null` = whatever the collection default is (every family) — set only by
  // Primitives' per-family export icon, and cleared again whenever the generic
  // Export pill opens the wizard, so a quick export never leaks its narrow
  // scope into the next full one.
  // Bumped on every open so the wizard REMOUNTS. Its step/format/family state
  // is internal, and closing then reopening inside the 0.15s exit animation
  // reuses the same AnimatePresence child — so a narrowed run (a few families,
  // already on step 3) could hand that state to the next export. A fresh key
  // per open makes "opened again" mean "started again".
  const [exportRun, setExportRun] = useState(0)
  const openSectionExport = () => {
    setExportRun((n) => n + 1)
    setSectionExportOpen(true)
  }
  // Import-your-design-system modal (paste/drop a tokens JSON → review → adopt).
  const [importOpen, setImportOpen] = useState(false)
  const [newSystemOpen, setNewSystemOpen] = useState(false)
  // Components catalogue — filters the master list by label/key. ONE search
  // state now: Documentation carried a second, identical one (`docsSearch`)
  // over the same catalogue, so a filter typed in one section was invisible in
  // the other. Rendered in CenterHeader's row, not inside the master list's
  // column — the box used to open that column with a gap under the header.
  const [componentSearch, setComponentSearch] = useState('')
  // Docs' master-list selection — a Get started key, OVERVIEW_KEY for the
  // whole-system sheet, or a foundation key. Lifted so leaving Docs and
  // coming back resumes on the same place instead of resetting.
  const [docFoundationKey, setDocFoundationKey] = useState<string>(GET_STARTED_KEY)

  const section = FOUNDATIONS.find((s) => s.key === activeFoundation) ?? FOUNDATIONS[0]

  // ── Chrome accent — the UI's own highlight color (table active states,
  // modified dots, previewed-theme tints via `accent-ui`) tracks the system's
  // primary, adjusted for readability on dark chrome like the header/rail.
  // It used to be `primaryScale[9]` raw in light chrome — the anchor tone, i.e.
  // the user's hex verbatim. That's the one tone with NO contrast guarantee, so
  // a light accent gave 3:1 section titles and 3:1 white-on-fill buttons while
  // the Color preview panel right beside them rendered a correctly-darkened
  // button (the token side anchors `action-primary` to `accessibleSolidTone`).
  // Same anchor now drives the chrome, resolved against the chrome's own page —
  // and each appearance walks its OWN ramp, so dark chrome reads the dark twin
  // instead of brightening a light-ramp tone by hand.
  // The contrast target is `--app` (the chrome PAGE), deliberately — the same
  // reference the role catalogue uses for every text role
  // (`contrastAgainst: 'background-primary'`). Aiming at `--elevated`
  // (#e8e8ea) instead would be stricter, but for a pale accent it forces tone
  // 12 — near-black — and the chrome stops reading as the user's colour at
  // all. Residual: accent text sitting ON `bg-elevated` (active table rows)
  // lands around 3.8:1 — fine as a UI component, short of AA for body text.
  // Fixing THAT means moving those rows off `bg-elevated` onto an accent tint,
  // which is a visual-design change, not a token one.
  const uiAccent =
    theme === 'dark'
      ? chromeAccent(primaryDarkScale, '#0a0a0a', primaryColor)
      : chromeAccent(primaryScale, '#ffffff', primaryColor)
  // ── …and the chrome accent as a FILL, which is a different question ──
  // `chromeAccent` walks UP the ramp until the tone clears 4.5:1 against the
  // chrome PAGE. That is the right rule for INK, and the wrong one for a solid
  // fill: a fill isn't read against the page, its LABEL is read against the
  // fill. Solving both with one value visibly desaturated the fill — measured
  // on accent `#a317e6` in dark chrome, `--accent-ui` landed on dark-ramp tone
  // 11 (`#a557d7`, a washed lavender) while the Color preview's Primary button
  // rendered the anchor `#a317e6`. Same accent, two colours on screen, which is
  // exactly what the chrome's accent buttons looked wrong against.
  //
  // The fill now uses `solidInkPair` on the previewed ramp — the SAME rule
  // `{accent.solid}` resolves through in every architecture (Categorical's
  // `action.primary`, Astryx's `accent.solid`, shadcn's `primary.fill`) and the
  // same one the flat catalogue's `background-brand-solid` anchors to. So an
  // accent-filled chrome control is the user's brand solid, hex for hex with
  // the preview. It also keeps the fill ON the anchor for most accents, because
  // flipping the ink is cheaper than darkening the fill (see `solidInkPair`).
  const fillRamp = theme === 'dark' ? primaryDarkScale : primaryScale
  const uiAccentSolid = (() => {
    const inks = ['#ffffff', '#0a0d12']
    const ramp = fillRamp && Object.keys(fillRamp).length ? fillRamp : null
    if (!ramp) return primaryColor
    return ramp[solidInkPair(ramp, inks).tone] ?? primaryColor
  })()
  // The ink for an `--accent-solid` fill, solved against THAT fill — not
  // against `--accent-ui`, which is a different colour now.
  const uiAccentInk = readableInk(uiAccentSolid)
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-ui', uiAccent)
    document.documentElement.style.setProperty('--accent-solid', uiAccentSolid)
    document.documentElement.style.setProperty('--accent-ink', uiAccentInk)
  }, [uiAccent, uiAccentSolid, uiAccentInk])

  // ── Layer 0: brand-derived gradient (re-derives live with brand + theme) ──
  const s = primaryScale
  const gradient =
    theme === 'dark'
      ? `linear-gradient(160deg, ${s[12] ?? '#1c1c1c'} 0%, #0a0a0a 48%)`
      : `linear-gradient(160deg, ${s[3] ?? s[2] ?? primaryColor ?? '#ede9fe'} 0%, ${s[1] ?? '#faf5ff'} 42%, #ffffff 100%)`

  // ── Foundation-switcher toolbar wash — same brand-derived language as Layer
  // 0, scoped to just the Reset/Save row instead of the whole canvas. That row
  // sits on the opaque `bg-app` surface two levels up (unlike SectionRail,
  // which is deliberately transparent so Layer 0 shows through it), so without
  // its own background it reads as flat white/black no matter what the accent
  // is — reported as wanting the same accent-derived gradient feel there too,
  // "para crear un lindo contraste" between the icon rail and the Reset/Save
  // pills sitting at its trailing edge.
  // Built from `--accent-ui`, not the raw ramp or `primaryColor`. `uiAccent` is
  // already the "no-text graphical mark" token this file computes two blocks
  // up — solved for contrast against the chrome PAGE, exactly the case
  // CLAUDE.md's own accent-derivation note reserves it for ("small graphical
  // marks that need to be visible on the chrome... the /[0.06]-[0.08] tints").
  // A ramp tone (2 or 3) was tried first and was nearly invisible: those steps
  // are Radix's near-white "background" band, meant to disappear, so fading
  // one to transparent over a wide row read as plain white — no contrast at
  // all, the opposite of what was asked for. `color-mix` at 10% sits just
  // above that established 6-8% range (a gradient's peak has to read where a
  // flat fill's average already does) and still stays a wash, not a swatch.
  // LEFT-TO-RIGHT, not the page backdrop's 160deg diagonal: the row is 52px
  // tall and full-width, so a wash has to travel horizontally to read as
  // anything more than a flat tint. Tinted behind the icon rail, fading to
  // transparent by ~45% width — roughly where that cluster ends — so the
  // Reset/Save pills sit on a neutral patch and keep their own border as
  // their contrast, rather than competing with more colour behind them.
  const toolbarWash = `linear-gradient(90deg, color-mix(in srgb, ${uiAccent} 10%, transparent) 0%, transparent 45%)`

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
  /** Docs destination, opened at a specific foundation — the reverse of
   *  `FoundationArticle`'s own "Edit tokens" link. Used by the preview aside's
   *  Documentation tab, whose accordion is a reading surface for the column,
   *  not a replacement for the full-width page. */
  const openDocs = (key: string) => {
    commitVisit()
    setExportMode(null)
    setTab('docs')
    setDocFoundationKey(key)
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

  const foundationsToolbar = (
    <>
      <FoundationIconRail
        active={activeFoundation}
        onSelect={selectFoundation}
        groups={[
          { label: 'Variables', items: VARIABLE_FOUNDATIONS.map((f) => ({ key: f.key, label: f.short, Icon: f.Icon })) },
          { label: 'Styles', items: FOUNDATIONS.filter((f) => !VARIABLE_FOUNDATIONS.includes(f)).map((f) => ({ key: f.key, label: f.short, Icon: f.Icon })) },
        ]}
      />
      <div className="ml-auto flex-shrink-0 flex items-center gap-2">
        <HomeActions
          previewTheme={previewTheme}
          onOpenEditor={() => selectFoundation('color')}
          onReviewInDocs={() => openDocs(OVERVIEW_KEY)}
          onConnectGithub={() => openExport('github')}
          onOpenSaveHub={() => openExport('save')}
          onPreviewTheme={changePreviewTheme}
        />
      </div>
    </>
  )

  // ── Resolve center header + body for the current mode ──
  let header: { Icon: ComponentType; title: string; subtitle: string; right?: ReactNode }
  let body: ReactNode
  let centerKey: string

  if (exportMode === 'github') {
    header = { Icon: GitHubIcon, title: 'GitHub', subtitle: 'Version your design system in a repository.' }
    body = (
      <div className="h-full overflow-y-auto">
        <GitHubConnectView onClose={() => setExportMode(null)} />
      </div>
    )
    centerKey = 'export-github'
  } else if (exportMode === 'figma-sync') {
    header = { Icon: FigmaIcon, title: 'Figma', subtitle: 'Check your connection and live sync URL.' }
    body = (
      <div className="h-full overflow-y-auto">
        <FigmaSyncView
          onClose={() => setExportMode(null)}
          onOpenDownload={() => setExportMode('figma-download')}
          onOpenGithub={() => openExport('github')}
          onOpenSave={() => openExport('save')}
        />
      </div>
    )
    centerKey = 'export-figma-sync'
  } else if (exportMode === 'figma-download') {
    header = { Icon: FigmaIcon, title: 'Figma', subtitle: 'Get the plugin and install it in Figma.' }
    body = (
      <div className="h-full overflow-y-auto">
        <FigmaDownloadView onClose={() => setExportMode(null)} onOpenSync={() => setExportMode('figma-sync')} />
      </div>
    )
    centerKey = 'export-figma-download'
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
    // Subtitle covers all THREE halves of this view — the systems grid, the
    // file preview and the connections panel. It used to describe only the
    // middle one ("Copy the README or the CSS into Stitch, Claude or Codex…"),
    // which was fine while the sole way in was a Docs link about exporting
    // CSS, and became a mismatch the moment the Systems popover started
    // routing here promising "every system side by side" and the connections.
    header = { Icon: SaveIcon, title: 'Save & Share', subtitle: 'Every saved system, the export files, and your Figma / GitHub connections.' }
    body = (
      <div className="h-full overflow-y-auto p-8">
        <SaveView onImport={() => setImportOpen(true)} onNewSystem={() => setNewSystemOpen(true)} />
      </div>
    )
    centerKey = 'export-save'
  } else if (tab === 'about') {
    // header is unused — About skips CenterHeader entirely (see the
    // `skipCenterHeader` note below) in favor of its own hero. StartIcon is
    // just a harmless placeholder to satisfy the type.
    header = { Icon: StartIcon, title: 'About', subtitle: '' }
    body = (
      <AboutHome
        onStart={() => selectFoundation('color')}
        onLearnAI={() => openDocs(GUIDE_AI_KEY)}
        foundationCount={FOUNDATIONS.length}
      />
    )
    centerKey = 'about'
  } else if (tab === 'foundations') {
    header = { Icon: section.Icon, title: section.title, subtitle: section.subtitle }
    // HomeActions (Reset/Save) lives in the Groups | icon-rail band
    // (ColorHub / FoundationWorkbench), not in CenterHeader — Variables
    // foundations no longer render that header. Export is transversal, so it
    // stays in TopNav.
    const Active = section.Component
    // Inner body only — Groups | icon-rail is the STABLE shell
    // (FoundationWorkbench, mounted outside the keyed motion below) so
    // Color → Font doesn't remount the switcher.
    body = section.key === 'color' ? (
      <ColorHub
        colorTab={colorTab}
        onColorTabChange={setColorTab}
        onFocusChange={setSemanticFocus}
        previewTheme={previewTheme}
        onPreviewThemeChange={changePreviewTheme}
        railCollapsed={colorRailCollapsed}
        revealRole={colorReveal}
      />
    ) : section.key === 'typography' ? (
      <TypeHub
        typeTab={typeTab}
        onTypeTabChange={setTypeTab}
        onFocusChange={setTypeFocus}
        revealRole={typeReveal}
      />
    ) : section.key === 'icons' ? (
      <div className="h-full overflow-y-auto p-8">
        <Active />
      </div>
    ) : section.key === 'radius' || section.key === 'spacing' || section.key === 'sizes' || section.key === 'stroke' ? (
      <LayoutHub
        family={section.key === 'sizes' ? 'size' : section.key}
        Primitives={Active}
        revealRole={layoutReveal}
      />
    ) : section.key === 'grid' ? (
      <LayoutHub
        family="breakpoint"
        Primitives={Active}
        Semantics={GridSemantics}
        revealRole={layoutReveal}
      />
    ) : (
      <Active />
    )
    centerKey = `f-${section.key}`
  } else if (tab === 'components') {
    header = {
      Icon: ComponentsIcon,
      title: 'Components',
      subtitle: 'One page per component — live playground, examples, accessibility, Figma and API.',
      // Search stays last. Theme switch + Edit Color sit in the gap the
      // subtitle already yields (`truncate`). Same `previewTheme` as the
      // playground — not a second switcher.
      right: (
        <div className="flex items-center gap-2">
          <PreviewThemeSwitch
            themes={themeOrder.filter((t) => themes[t])}
            kinds={themeKinds}
            value={previewTheme}
            onChange={changePreviewTheme}
          />
          <button
            type="button"
            onClick={() => selectFoundation('color')}
            className="h-8 px-2 text-[12px] font-medium text-fg-muted hover:text-fg transition-colors flex-shrink-0"
          >
            Edit Color
          </button>
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line w-44 lg:w-52 min-w-[8rem] focus-within:border-line-strong transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={componentSearch}
              onChange={(e) => setComponentSearch(e.target.value)}
              placeholder="Search components"
              aria-label="Search components"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-fg-muted placeholder:text-fg-faint outline-none"
            />
            {componentSearch && (
              <button onClick={() => setComponentSearch('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
            )}
          </div>
        </div>
      ),
    }
    body = (
      <ComponentsView
        previewTheme={previewTheme}
        active={activeComponent}
        onSelect={selectComponent}
      />
    )
    // Constant, NOT keyed on the open component: the view owns its own article
    // remount, and re-keying here would rebuild the master list — losing its
    // scroll position — on every pick.
    centerKey = 'components'
  } else {
    // tab === 'docs'
    header = {
      // A ruled page, distinct from DocIcon's plain sheet (the README export)
      // — Docs and the README were always two different concepts, now they're
      // also two different destinations.
      Icon: RulesIcon,
      title: 'Docs',
      subtitle: 'Where this system goes — Figma, code, or an AI assistant — then the token reference.',
    }
    body = (
      <DocsView
        activeFoundationKey={docFoundationKey}
        onSelectFoundationKey={setDocFoundationKey}
        onEditFoundation={selectFoundation}
        exits={{
          onOpenFigmaDownload: () => openExport('figma-download'),
          onOpenFigmaSync: () => openExport('figma-sync'),
          onOpenExport: openSectionExport,
          onOpenSave: () => openExport('save'),
          onOpenGithub: () => openExport('github'),
        }}
      />
    )
    // Constant, same reasoning as Components above.
    centerKey = 'docs'
  }

  // Preview is hidden in Components (the page goes full-width and carries its
  // own live playground) and in Docs (a full-width reference sheet) — and in
  // every export/connect view (Code · Docs · Figma · GitHub), which own the
  // full panel. Save keeps the aside: it hosts the Overview + Connections
  // panel.
  const showPreview = (tab === 'foundations' && !exportMode) || exportMode === 'save'

  // The section rail shows in every editing view and in none of the export /
  // connect views — those own the full width, in every section alike.
  const railVisible = projectCreated && !exportMode
  // Components and Docs share the outer left rail (gradient shows through;
  // TopNav brand block tracks its width). Variables uses the horizontal
  // FoundationIconRail instead — no outer column there.
  const outerRailVisible = railVisible && (tab === 'components' || tab === 'docs')
  // Every Variables foundation paints a 198px Groups column (Color owns it
  // inside ColorHub; the rest wrap with FoundationWorkbench). It's not an
  // outer SectionRail, so `outerRailVisible` above stays false — but the
  // brand block's divider still needs to continue unbroken into that column.
  const groupsColumnVisible = tab === 'foundations' && !exportMode
  // Color's Groups column can COLLAPSE on Primitives AND Semantics (Gradients
  // keeps its full width — its rail is the gradient list, whose rows are named
  // swatches with nothing glyph-sized to collapse to). Other foundations stay
  // at 198px. Read from `colorControls`' own exported constants rather than
  // repeating the numbers, since a mismatch here is exactly a broken line.
  const groupsColumnCollapsed =
    groupsColumnVisible && activeFoundation === 'color' && colorTab !== 'gradients' && colorRailCollapsed
  const groupsColumnWidth = groupsColumnCollapsed
    ? COLOR_RAIL_COLLAPSED_WIDTH
    : COLOR_RAIL_WIDTH

  // The global TopNav is mounted in EVERY view; this maps the current shell
  // state to its lit section.
  const navActive: TopNavKey | null =
    (!exportMode && tab === 'about') ? 'about'
    : (!exportMode && tab === 'components') ? 'components'
    : (!exportMode && tab === 'docs') ? 'docs'
    : (!exportMode && tab === 'foundations') ? 'variables'
    : null
  const handleNav = (key: TopNavKey) => {
    if (key === 'variables') selectFoundation('color')
    else changeTab(key)
  }

  const foundationCanvas = tab === 'foundations' && !exportMode
  // About gets its own hero instead of the dense-editor CenterHeader row —
  // same opt-out `foundationCanvas` already makes for a different reason.
  const skipCenterHeader = foundationCanvas || tab === 'about'

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col relative isolate bg-app">
      {/* Chrome tab geometry — mounted once, referenced by every `.color-hub-tab-bg`
          (Color/Type/Layout hub tabs, PreviewPanel's Preview/Artefacts/.MD). */}
      <ChromeTabDefs />
      {/* ── Layer 0: brand gradient ── */}
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: gradient }} />

      {/* ── Row 1: the global top bar — brand block + section nav + actions ── */}
      <TopNav
        nav={navActive}
        onNav={handleNav}
        exportMode={exportMode}
        onOpenSync={() => openExport('figma-sync')}
        onOpenDownload={() => openExport('figma-download')}
        onExport={openSectionExport}
        exportOpen={sectionExportOpen}
        brandWidth={outerRailVisible ? (railCollapsed ? RAIL_COLLAPSED_WIDTH : RAIL_WIDTH) : groupsColumnVisible ? groupsColumnWidth : null}
        // Drops the wordmark, leaving just the mark. Either narrow-brand-block
        // case has to set this, not only the Components rail: at 56px the
        // lockup overflows its own block by ~67px (measured) and the two lines
        // spill past the divider they're supposed to sit inside.
        railCollapsed={(outerRailVisible && railCollapsed) || groupsColumnCollapsed}
        previewTheme={previewTheme}
        onThemeChange={changePreviewTheme}
      />

      <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* ── Body: section sub-rail + floating white panel ── */}
      <div className="flex-1 min-h-0 flex">
        {/* Components' rail — component categories only, now that Docs owns
            its own page and no longer shares this column (see DocsView). Its
            entries come straight from `CATEGORIES`, so the rail can never
            offer a category the catalogue doesn't have.
            Variables reserves no outer column at all — switching lives in the
            horizontal FoundationIconRail docked in its header, freeing this
            width for a foundation's own sub-nav (Color's family Groups tree,
            promoted inside ColorPrimitives). */}
        {railVisible && tab === 'components' && (
          <ComponentsRail
            icons={CATEGORY_ICONS}
            active={activeComponent}
            onSelect={selectComponent}
            search={componentSearch}
            collapsed={railCollapsed}
            onToggleCollapse={() => setRailCollapsed((v) => !v)}
          />
        )}
        {railVisible && tab === 'docs' && (
          <DocsRail
            rows={DOCS_RAIL_ROWS}
            activeKey={docFoundationKey}
            onSelect={setDocFoundationKey}
            collapsed={railCollapsed}
            onToggleCollapse={() => setRailCollapsed((v) => !v)}
          />
        )}

        {/* ── Layer 1: the content surface, flush under the top bar ──
            Variables' Groups column IS the outer rail (under the logo), so
            this wrapper stays transparent there. Components / Docs / export
            views paint `bg-app` and the hairline from the first column. */}
        <div className={`flex-1 min-w-0 flex overflow-hidden ${foundationCanvas ? '' : 'bg-app border-l border-line'}`}>
          {/* Center editor */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* Foundation switcher lives in Groups' own 52px band so Groups
                sits under the logo. No CenterHeader — the icons ARE the
                section title. The band is OUTSIDE the keyed motion so
                switching Color → Font fades the table, not the chrome. */}
            {!skipCenterHeader && (
              <CenterHeader
                Icon={header.Icon}
                title={header.title}
                subtitle={header.subtitle}
                // Same derivation as --accent-ui, not a second copy of it: this
                // title WAS the raw anchor tone, the most visible 3:1 failure.
                accentColor={uiAccent}
                right={header.right}
              />
            )}
            <div className="flex-1 min-h-0">
              {/* No `exit` animation and no AnimatePresence: the header (above)
                  and this body both derive from `activeFoundation` in the same
                  render, so they must swap in the same commit. An exit-then-enter
                  sequence (mode="wait") would hold the OLD body on screen under the
                  NEW header for the fade-out duration — a title/content mismatch.
                  Opacity only — a y-nudge on the whole canvas made Groups and
                  the icon rail jump even after they were the same layout. */}
              {foundationCanvas ? (
                <FoundationWorkbench
                  toolbar={foundationsToolbar}
                  toolbarWash={toolbarWash}
                  railCollapsed={groupsColumnCollapsed}
                  onToggleRail={
                    activeFoundation === 'color' && colorTab !== 'gradients'
                      ? () => setColorRailCollapsed((c) => !c)
                      : undefined
                  }
                  label={section.variablesLabel}
                  gutter={activeFoundation === 'icons'}
                >
                  <motion.div
                    key={centerKey}
                    className="h-full"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {body}
                  </motion.div>
                </FoundationWorkbench>
              ) : (
                <motion.div
                  key={centerKey}
                  className="h-full"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  {body}
                </motion.div>
              )}
            </div>
          </main>

          {/* Right live preview (hidden in components tab — full width for docs)

              The threshold is an EXPLICIT `min-[1180px]:`, not `xl:`. Tailwind's
              breakpoints are rem-based and `:root` sets `font: 18px/…`, so `xl`
              resolves to 80rem = **1440px** here, not the 1280 the utility name
              implies. That hid the panel on every window below 1440 — including a
              16" MacBook Pro on any scaled resolution under 1512, or full-screen
              with the window not maximised — and the live specimen is half the
              point of the workspace, not a wide-screen bonus.
              1180 is MEASURED, not guessed: with the full 400px aside, nothing
              inside `main` overflows down to that width (the Primitives table
              still shows both light and dark columns, and every railed section
              keeps its 198px gutter). Below it the token tables start clipping,
              so that's where the panel genuinely has to go. The collage's own
              floor is 380px (at 360 its tiles overflow), which is why the aside
              keeps ONE width instead of shrinking — there is no useful range
              between 380 and 400 to trade the center 20px for. */}
          {showPreview && (previewCollapsed ? (
            <button
              onClick={() => setPreviewCollapsed(false)}
              aria-label="Expand preview"
              title="Expand preview"
              className="hidden min-[1180px]:flex w-8 flex-shrink-0 items-center justify-center border-l border-line bg-app hover:bg-elevated/50 text-fg-faint hover:text-fg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          ) : (
            <aside className="hidden min-[1180px]:flex w-[400px] flex-shrink-0 overflow-hidden border-l border-line">
              {exportMode === 'save' ? (
                // Save pairs the share/identity center with the system overview.
                <SaveSidePanel
                  onOpenFigma={() => openExport('figma-sync')}
                  onOpenGithub={() => openExport('github')}
                  onCollapse={() => setPreviewCollapsed(true)}
                />
              ) : (
                <PreviewPanel
                  focus={!exportMode && tab === 'foundations' && activeFoundation === 'color' && colorTab === 'semantics' ? semanticFocus : null}
                  typeFocus={!exportMode && tab === 'foundations' && activeFoundation === 'typography' && typeTab === 'semantics' ? typeFocus : null}
                  categoryKey={!exportMode && tab === 'foundations' ? activeFoundation : null}
                  mdWholeSystem={
                    !exportMode && tab === 'foundations' && activeFoundation === 'color' && colorTab !== 'semantics'
                  }
                  previewTheme={previewTheme}
                  iconLibraryKey={!exportMode && tab === 'foundations' && activeFoundation === 'icons' ? iconLibrary : null}
                  onCollapse={() => setPreviewCollapsed(true)}
                  onEditTypeRole={(key) => {
                    setTypeTab('semantics')
                    setTypeReveal((prev) => ({ key, seq: (prev?.seq ?? 0) + 1 }))
                  }}
                  onEditLayoutRole={(key) => {
                    setLayoutReveal((prev) => ({ key, seq: (prev?.seq ?? 0) + 1 }))
                  }}
                  onEditColorToken={(key) => {
                    setColorTab('semantics')
                    setColorReveal((prev) => ({ key, seq: (prev?.seq ?? 0) + 1, as: 'token' }))
                  }}
                  onEditColorGroup={(key) => {
                    setColorTab('semantics')
                    setColorReveal((prev) => ({ key, seq: (prev?.seq ?? 0) + 1, as: 'group' }))
                  }}
                />
              )}
            </aside>
          ))}
        </div>
      </div>
      </div>
      </div>

      {/* ── Row 3: the footer hairline ──
          The shell is a fixed-viewport app (h-screen, no page scroll), so there
          is no "bottom of the page" for a conventional footer to sit at. This is
          a 28px rule instead — attribution only, no links: the About TAB already
          carries the full story (how it works, changelog, legal), so repeating
          entry points here just competed for attention. One quiet line on a
          step-up surface (`bg-surface`, not `bg-app`) so the rule reads as a
          distinct strip instead of text floating on the page. */}
      <footer className="flex-shrink-0 h-7 flex items-center px-4 lg:px-5 border-t border-line bg-surface">
        <span className="text-[10.5px] text-fg-faint truncate">
          {COPYRIGHT_LINE} · Built by Cesar Duscenko
        </span>
      </footer>

      {/* Guided export — Source → Format → Export. TRANSVERSAL now: reachable
          from TopNav regardless of `tab`/`exportMode`, so this modal overlay
          (its own fixed backdrop) isn't gated to Variables any more. Only
          while actively editing a foundation does it still start pre-scoped
          to what's on screen (`COLLECTIONS_OF`) — from Documentation, or from
          inside another connect view, it falls back to the wizard's own
          whole-system-leaning default. */}
      <AnimatePresence>
        {sectionExportOpen && (
          <ExportWizard
            key={exportRun}
            initialCollections={tab === 'foundations' ? (COLLECTIONS_OF[activeFoundation] ?? ['primitives', 'semantics']) : undefined}
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
    </div>
  )
}
