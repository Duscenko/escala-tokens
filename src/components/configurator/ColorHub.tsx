import { type ReactNode } from 'react'
import Step3_SemanticTokens, { type SemanticFocus } from './Step3_SemanticTokens'
import StepGradients from './StepGradients'
import ColorPrimitives from './ColorPrimitives'

export type ColorTab = 'primary' | 'semantics' | 'gradients'

const TABS: { key: ColorTab; label: string }[] = [
  { key: 'primary', label: 'Primitives' },
  { key: 'semantics', label: 'Semantics' },
  { key: 'gradients', label: 'Gradients' },
]

// The Color hub unifies the primitive families' DEFINE-and-USE table
// (ColorPrimitives — family nav, per-family quick edit and the usage table
// all live there now, Picker Color's old job folded in), the semantic alias
// matrix (Step3) and the gradient tokens (StepGradients) under one
// foundation, switched by a three-tab pill bar. The bar is always pinned
// above the content — same position for every tab.
//
// The tabs themselves use a Chrome-style strip: the active tab lifts on
// `bg-app` with concave bottom corners; inactive tabs stay flat on a lightly
// tinted strip — lighter than the old full-width tint block + bottom bar.
export default function ColorHub({
  colorTab,
  onColorTabChange,
  onFocusChange,
  previewTheme,
  onPreviewThemeChange,
  focusFamilyKey,
  railCollapsed,
  onToggleRail,
  toolbar,
  toolbarWash,
}: {
  colorTab: ColorTab
  onColorTabChange: (t: ColorTab) => void
  onFocusChange?: (f: SemanticFocus | 'all') => void
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** Forwarded to ColorPrimitives — switches its active family (e.g. a family
   *  NewTokenWizard just created). */
  focusFamilyKey?: string | null
  /** Collapses the hub's 198px left column to 56px. Forwarded to BOTH
   *  Primitives and Semantics — it's one column that changes what it LISTS per
   *  tab (families / token categories), so a collapse that only held on one of
   *  them read as two different columns. Gradients still keeps its full width:
   *  its rail is the gradient list, whose rows are named swatches with nothing
   *  glyph-sized to collapse to. Owned by `Configurator` because TopNav's brand
   *  block sizes its divider from the same value; see `colorControls`' note. */
  railCollapsed?: boolean
  onToggleRail?: () => void
  /** Foundation switcher + Reset/Save. Renders in the Groups header's band so
   *  Groups sits under the Escala logo and this chrome starts at Groups' edge. */
  toolbar?: ReactNode
  toolbarWash?: string
}) {
  // Chrome-style tab strip — three equal cells, active one merges into the
  // content panel below via matching `bg-app` + concave bottom corners.
  const tabBar = (
    <div className="color-hub-tab-strip flex items-end h-full w-full min-w-0">
      {TABS.map((t) => {
        const active = colorTab === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onColorTabChange(t.key)}
            aria-pressed={active}
            className={`color-hub-tab ${active ? 'color-hub-tab-active' : ''}`}
          >
            {/* The label is stacked over an invisible SEMIBOLD copy of itself,
                which reserves the widest state's width. Without it, activating
                a tab thickens its text, widening the button and nudging the
                tabs after it a couple of pixels — a small but constant wobble
                every time you switch. */}
            <span className="relative grid place-items-center">
              <span aria-hidden className="invisible font-semibold col-start-1 row-start-1">{t.label}</span>
              <span className="col-start-1 row-start-1">{t.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="h-full flex flex-col min-h-0">
      {colorTab === 'primary' ? (
        // No standalone tabBar row here — Primitives shares that row with its
        // own "Groups" nav header (same line, per the Figma reference), so
        // ColorPrimitives places the tabs itself instead of receiving them
        // pre-wrapped. Flush, no padding wrapper either — the family nav needs
        // to reach the full height/left edge (it's the promoted sidebar now,
        // in the position the outer SectionRail used to occupy). It owns its
        // own padding + scroll internally for the table side.
        <div className="flex-1 min-h-0">
          <ColorPrimitives
            tabBar={tabBar}
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
            focusFamilyKey={focusFamilyKey}
            railCollapsed={railCollapsed}
            onToggleRail={onToggleRail}
            toolbar={toolbar}
            toolbarWash={toolbarWash}
          />
        </div>
      ) : colorTab === 'semantics' ? (
        // Same treatment as Primitives — flush, no padding wrapper and no
        // standalone tabBar row: Step3 shares that row with its own "Tokens"
        // header, so the tabs land in the SAME place on both tabs instead of
        // jumping to a separate strip above the content.
        <div className="flex-1 min-h-0">
          <Step3_SemanticTokens
            tabBar={tabBar}
            onFocusChange={onFocusChange}
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
            railCollapsed={railCollapsed}
            onToggleRail={onToggleRail}
            toolbar={toolbar}
            toolbarWash={toolbarWash}
          />
        </div>
      ) : (
        // Gradients owns the same three-row shell as the other two tabs now —
        // flush, no padding wrapper, tabBar rendered inside its own header row.
        <div className="flex-1 min-h-0">
          <StepGradients
            tabBar={tabBar}
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
            toolbar={toolbar}
            toolbarWash={toolbarWash}
          />
        </div>
      )}
    </div>
  )
}
