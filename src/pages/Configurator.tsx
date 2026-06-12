import { useState, useEffect, type ComponentType, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../store/useDesignStore'
import { useTheme } from '../lib/theme'
import Sidebar, { type Tab } from '../components/configurator/Sidebar'
import TopNav from '../components/configurator/TopNav'
import PreviewPanel from '../components/preview/PreviewPanel'
import ComponentDocPane from '../components/configurator/ComponentDocPane'
import ExportView from '../components/configurator/ExportView'
import FigmaConnectView from '../components/configurator/FigmaConnectView'
import GitHubConnectView from '../components/configurator/GitHubConnectView'
import IconLibrary from '../components/configurator/IconLibrary'
import HomeView from '../components/configurator/HomeView'
import Step2_ColorPalette from '../components/configurator/Step2_ColorPalette'
import Step3_SemanticTokens, { type SemanticCategory } from '../components/configurator/Step3_SemanticTokens'
import Step4_Typography from '../components/configurator/Step4_Typography'
import Step5_SpacingRadius from '../components/configurator/Step5_SpacingRadius'
import Step6_Opacity from '../components/configurator/Step6_Opacity'
import Step7_Shadow from '../components/configurator/Step7_Shadow'
import Step8_Grid from '../components/configurator/Step8_Grid'
import Step9_Sizes from '../components/configurator/Step9_Sizes'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../lib/componentCatalogue'

// ── Stroke-icon factory (16px on a 24 grid, tracks currentColor) ────────────
const ic = (d: string, sw = '2'): ComponentType => () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
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
    key: 'home',
    label: 'Home',
    short: 'Home',
    hint: 'Name, connections & sharing',
    title: 'Home',
    subtitle: 'Name your design system, check your connections and share it.',
    // Rendered via a special case in the shell (needs the onOpenFigma callback).
    Component: () => null,
    Icon: ic('M3 10.5 12 3l9 7.5M5 9.5V20h4.5v-5.5h5V20H19V9.5', '1.8'),
  },
  {
    key: 'color',
    label: 'Color',
    short: 'Color',
    hint: 'Brand, neutrals & state scales',
    title: 'Color',
    subtitle: 'Choose from the curated palette, each hue is vetted to generate an accessible scale.',
    Component: Step2_ColorPalette,
    Icon: ic('M12 22a7 7 0 0 0 7-7c0-3-7-12-7-12S5 12 5 15a7 7 0 0 0 7 7Z', '1.8'),
  },
  {
    key: 'semantic',
    label: 'Semantic Tokens',
    short: 'Semantic Tokens',
    hint: 'Map scales to roles',
    title: 'Semantic Tokens',
    subtitle: 'Map each color scale to a semantic role — text, border, foreground and background.',
    Component: Step3_SemanticTokens,
    Icon: ic('M12 20.4722C13.0615 21.4223 14.4633 22 16 22C19.3137 22 22 19.3137 22 16C22 13.2331 20.1271 10.9036 17.5798 10.2102M6.42018 10.2102C3.87293 10.9036 2 13.2331 2 16C2 19.3137 4.68629 22 8 22C11.3137 22 14 19.3137 14 16C14 15.2195 13.851 14.4738 13.5798 13.7898M18 8C18 11.3137 15.3137 14 12 14C8.68629 14 6 11.3137 6 8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8Z'),
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
    label: 'Spacing & Radius',
    short: 'Spacing & Radius',
    hint: 'Spacing scale & corners',
    title: 'Spacing & Radius',
    subtitle: 'Set the base spacing unit and the corner-radius personality of your system.',
    Component: Step5_SpacingRadius,
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

const ComponentsIcon = ic('M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8')
const CodeIcon = ic('M16 18l6-6-6-6M8 6l-6 6 6 6')
const DocIcon = ic('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6')

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
      <path d="M2 5.2 4 7.2 8 2.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type ExportMode = 'code' | 'md' | 'figma' | 'github' | null

// ── Center header (icon + colored title + | + subtitle) ──────────────────────
function CenterHeader({ Icon, title, subtitle }: { Icon: ComponentType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5 px-6 lg:px-8 h-[60px] border-b border-line/60 flex-shrink-0">
      <span className="text-[#0088FF] flex-shrink-0">
        <Icon />
      </span>
      <h1 className="text-sm font-semibold text-[#0088FF] flex-shrink-0">{title}</h1>
      <span className="text-line-strong flex-shrink-0">|</span>
      <p className="text-sm text-fg-faint truncate">{subtitle}</p>
    </div>
  )
}

export default function Configurator() {
  const { primaryScale, primaryColor, selectedComponents, toggleComponent, markFoundationComplete, projectCreated } = useDesignStore()
  const theme = useTheme()
  const [tab, setTab] = useState<Tab>('foundations')
  const [activeFoundation, setActiveFoundation] = useState<string>('home')
  const [activeComponent, setActiveComponent] = useState<ComponentDef | null>(
    () => COMPONENTS.find((c) => c.key === 'Button') ?? null,
  )
  const [exportMode, setExportMode] = useState<ExportMode>(null)
  // Active Semantic category — shared with the table (master nav) and the preview,
  // so the right panel mirrors whichever token group is being edited.
  const [semanticCategory, setSemanticCategory] = useState<SemanticCategory>('all')
  // Theme shown in the right-hand preview — toggled by the eye icons in the
  // Semantic table's column headers. Defaults to the built-in light theme.
  const [previewTheme, setPreviewTheme] = useState('light')

  const section = FOUNDATIONS.find((s) => s.key === activeFoundation) ?? FOUNDATIONS[0]

  // Land cleanly on Home whenever there's no active design system (startNewSystem,
  // persist rehydration) — pre-creation the rest of the workspace is gated off.
  useEffect(() => {
    if (!projectCreated) {
      setTab('foundations')
      setActiveFoundation('home')
      setExportMode(null)
    }
  }, [projectCreated])

  // ── Layer 0: brand-derived gradient (re-derives live with brand + theme) ──
  const s = primaryScale
  const gradient =
    theme === 'dark'
      ? `linear-gradient(160deg, ${s[12] ?? '#1c1c1c'} 0%, #0a0a0a 48%)`
      : `linear-gradient(160deg, ${s[3] ?? s[2] ?? primaryColor ?? '#ede9fe'} 0%, ${s[1] ?? '#faf5ff'} 42%, #ffffff 100%)`

  // ── Navigation handlers (selecting anything leaves export mode) ──
  // Marking happens on *leave*: a foundation counts as visited for the Home
  // overview checklist once the user navigates away from it.
  const commitVisit = () => {
    if (!exportMode && tab === 'foundations' && activeFoundation !== 'home') {
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
  // Home overview checklist navigation — 'components' opens the catalogue tab.
  const openFromHome = (key: string) => {
    if (key === 'components') changeTab('components')
    else selectFoundation(key)
  }

  // ── Resolve center header + body for the current mode ──
  let header: { Icon: ComponentType; title: string; subtitle: string }
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
  } else if (tab === 'foundations') {
    header = { Icon: section.Icon, title: section.title, subtitle: section.subtitle }
    const Active = section.Component
    body = section.key === 'semantic' ? (
      // Semantic owns its own internal scroll so the table's top bar + column
      // header can stay pinned — no outer overflow here.
      <div className="h-full p-8 flex flex-col min-h-0">
        <Step3_SemanticTokens
          activeCategory={semanticCategory}
          onCategoryChange={setSemanticCategory}
          previewTheme={previewTheme}
          onPreviewThemeChange={setPreviewTheme}
        />
      </div>
    ) : (
      <div className="h-full overflow-y-auto p-8">
        {section.key === 'home' ? (
          <HomeView
            onOpenFigma={() => openExport('figma')}
            onOpenGithub={() => openExport('github')}
            onOpenFoundation={openFromHome}
            onOpenExport={() => openExport('code')}
          />
        ) : (
          <Active />
        )}
      </div>
    )
    centerKey = `f-${section.key}`
  } else {
    header = {
      Icon: ComponentsIcon,
      title: 'Components',
      subtitle: 'Browse the catalogue — toggle any component to include or remove it.',
    }
    body = (
      <div className="h-full flex min-h-0">
        {/* Master list (relocated from the old wide sidebar) */}
        <div className="w-52 flex-shrink-0 border-r border-line overflow-y-auto p-3 flex flex-col gap-3">
          {CATEGORIES.map((cat) => {
            const items = COMPONENTS.filter((c) => c.category === cat)
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
                          isSelected ? 'bg-[#0088FF]' : 'bg-elevated border border-line-strong'
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
          })}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
          <ComponentDocPane component={activeComponent} />
        </div>
      </div>
    )
    centerKey = `c-${activeComponent?.key ?? 'none'}`
  }

  const showPreview = tab !== 'components'
  const railActive = !exportMode && tab === 'foundations' ? activeFoundation : null

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col relative isolate bg-app">
      {/* ── Layer 0: brand gradient ── */}
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: gradient }} />

      {/* ── Top navigation (transparent over the gradient) ── */}
      <TopNav
        tab={tab}
        exportMode={exportMode}
        onTabChange={changeTab}
        onDocs={() => openExport('md')}
        onGithub={() => openExport('github')}
      />

      {/* ── Body: 80px rail + floating white panel ── */}
      <div className="flex-1 min-h-0 flex">
        <Sidebar
          foundations={FOUNDATIONS
            .filter((f) => f.key !== 'home')
            .map((f) => ({
              key: f.key,
              short: f.short,
              Icon: f.Icon,
              secondary: ['opacity', 'shadow', 'grid', 'sizes'].includes(f.key),
            }))}
          activeFoundation={railActive}
          onFoundationSelect={selectFoundation}
          exportMode={exportMode}
          onGetFigma={() => openExport('figma')}
          onHub={() => selectFoundation('home')}
          hubActive={railActive === 'home'}
        />

        {/* ── Layer 1: white panel (rounded top, flush right & bottom) ── */}
        <div className="flex-1 min-w-0 flex mt-2 rounded-t-2xl overflow-hidden bg-app ring-1 ring-line/70 shadow-[0_-1px_28px_-8px_rgba(0,0,0,0.18)]">
          {/* Center editor */}
          <main className="flex-1 min-w-0 flex flex-col">
            <CenterHeader Icon={header.Icon} title={header.title} subtitle={header.subtitle} />
            <div className="flex-1 min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={centerKey}
                  className="h-full"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {body}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Right live preview (hidden in components tab — full width for docs) */}
          {showPreview && (
            <aside className="hidden xl:flex w-[400px] flex-shrink-0 overflow-hidden border-l border-line">
              <PreviewPanel
                focus={!exportMode && tab === 'foundations' && activeFoundation === 'semantic' ? semanticCategory : null}
                previewTheme={previewTheme}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
