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
// The tabs themselves are plain, spaced-out text with an underline on the
// active one — not a segmented pill — matching the Figma reference exactly
// (a pill-shaped `bg-elevated` container read as a heavier, more "controls
// panel" chrome than the reference's quieter text-tab treatment, closer to
// TopNav's own section nav than to a settings toggle).
export default function ColorHub({
  colorTab,
  onColorTabChange,
  onFocusChange,
  previewTheme,
  onPreviewThemeChange,
  focusFamilyKey,
  onOpenAddTheme,
  railCollapsed,
  onToggleRail,
}: {
  colorTab: ColorTab
  onColorTabChange: (t: ColorTab) => void
  onFocusChange?: (f: SemanticFocus | 'all') => void
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** Forwarded to ColorPrimitives — switches its active family (e.g. a family
   *  NewTokenWizard just created). */
  focusFamilyKey?: string | null
  /** Forwarded to Step3 — see its own doc comment. Only reachable while
   *  `colorTab === 'semantics'`, since that's the only tab with a "+ Theme"
   *  trigger, but it's a required prop on this component regardless: the
   *  panel it opens is docked in the shell's right aside, which Configurator
   *  owns, so the callback has to exist before Semantics is ever visited.
   *  An `editKey` opens the panel already pointed at that existing theme
   *  (rename it, re-point one of its slots) instead of a blank "create". */
  onOpenAddTheme: (editKey?: string) => void
  /** Forwarded to ColorPrimitives — collapses its 198px left column. Owned by
   *  `Configurator` because TopNav's brand block sizes its divider from the
   *  same value; see ColorPrimitives' own note. */
  railCollapsed?: boolean
  onToggleRail?: () => void
}) {
  // Each tab is a FULL-HEIGHT cell of the 52px row, not a text label with a
  // hairline under it: the active one reads as a tinted block whose accent bar
  // sits on the row's bottom edge, flush against the table header below. That
  // only works if the buttons stretch (`items-stretch` + `h-full`) — with
  // `items-center` the tint would float as a pill inside the row instead.
  //
  // The three cells SPLIT the row evenly (`flex-1`, equal basis) rather than
  // each hugging its own label. Sized to content they clustered at the left
  // and left a wide dead gap before the search field, and because the labels
  // differ in length the cells came out three different widths — a row of
  // blocks that was neither filled nor even. Every call site wraps this in the
  // same `flex-1 min-w-0` cell (Primitives, Semantics, Gradients), so one
  // basis rule gives all three tabs an identical row. Padding drops to `px-4`
  // and only guards the label at narrow widths now that width comes from the
  // basis; `justify-center` is what actually centres the label in its share.
  const tabBar = (
    <div className="flex items-stretch h-full w-full">
      {TABS.map((t) => {
        const active = colorTab === t.key
        return (
          <button
            key={t.key}
            onClick={() => onColorTabChange(t.key)}
            aria-pressed={active}
            className={`relative h-full flex-1 min-w-0 px-4 flex items-center justify-center text-[15px] whitespace-nowrap transition-colors ${
              active
                ? 'font-semibold text-fg bg-accent-ui/[0.07]'
                : 'font-medium text-fg-faint hover:text-fg-muted hover:bg-elevated/40'
            }`}
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
            {active && (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-accent-ui" />
            )}
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
            onOpenAddTheme={onOpenAddTheme}
          />
        </div>
      ) : (
        // Gradients owns the same three-row shell as the other two tabs now —
        // flush, no padding wrapper, tabBar rendered inside its own header row.
        <div className="flex-1 min-h-0">
          <StepGradients tabBar={tabBar} previewTheme={previewTheme} onPreviewThemeChange={onPreviewThemeChange} />
        </div>
      )}
    </div>
  )
}
