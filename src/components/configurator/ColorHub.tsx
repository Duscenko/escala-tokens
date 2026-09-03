import Step3_SemanticTokens, { type SemanticFocus } from './Step3_SemanticTokens'
import StepGradients from './StepGradients'
import ColorPrimitives from './ColorPrimitives'
import type { ThemeAppearance } from '../../lib/themeModes'

export type ColorTab = 'primary' | 'semantics' | 'gradients'

// The workspace owns the depth (Primitives / Semantics). Color owns only its
// content. Keeping a second depth selector here made the two rows disagree
// about the current task. Gradients is the one Color-local collection and is
// reached from the compact action in the foundation toolbar.
export default function ColorHub({
  mode,
  onFocusChange,
  previewTheme,
  previewAppearance,
  onPreviewThemeChange,
  onPreviewAppearanceChange,
  query,
  onQueryChange,
  focusFamilyKey,
  railCollapsed,
  revealRole,
  revealFamily,
  managedThemesExternally = false,
  onOpenGradients,
  onBackToSystemColors,
  onOpenPrimitiveFamily,
}: {
  mode: ColorTab
  onFocusChange?: (f: SemanticFocus | 'all') => void
  previewTheme?: string
  previewAppearance?: ThemeAppearance
  onPreviewThemeChange?: (theme: string) => void
  onPreviewAppearanceChange?: (appearance: ThemeAppearance) => void
  query?: string
  onQueryChange?: (value: string) => void
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
  /** Preview specimen asked to open this token's row (`key` + `seq` so repeats work). */
  revealRole?: { key: string; seq: number; as?: 'token' | 'group' | 'row' } | null
  /** A Semantics ramp-grid label asked to select this family in the Primitives
   *  table (`key` = family vocabulary name; `seq` so repeats re-fire). */
  revealFamily?: { key: string; seq: number } | null
  /** The Themes Library is the sole owner of theme selection and lifecycle. */
  managedThemesExternally?: boolean
  /** Gradients is a System colors collection, reached from its family rail. */
  onOpenGradients?: () => void
  onBackToSystemColors?: () => void
  /** Semantics ramp-grid → jump to a family in Color · Primitives. */
  onOpenPrimitiveFamily?: (family: string) => void
}) {
  return (
    <div className="h-full flex flex-col min-h-0">
      {mode === 'primary' ? (
        <div className="flex-1 min-h-0">
          <ColorPrimitives
            query={query}
            previewTheme={previewTheme}
            previewAppearance={previewAppearance}
            onPreviewThemeChange={onPreviewThemeChange}
            onPreviewAppearanceChange={onPreviewAppearanceChange}
            focusFamilyKey={focusFamilyKey}
            revealFamily={revealFamily}
            railCollapsed={railCollapsed}
            managedThemesExternally={managedThemesExternally}
            onOpenGradients={onOpenGradients}
          />
        </div>
      ) : mode === 'semantics' ? (
        <div className="flex-1 min-h-0">
          <Step3_SemanticTokens
            query={query}
            onQueryChange={onQueryChange}
            onFocusChange={onFocusChange}
            previewTheme={previewTheme}
            previewAppearance={previewAppearance}
            onPreviewThemeChange={onPreviewThemeChange}
            onPreviewAppearanceChange={onPreviewAppearanceChange}
            railCollapsed={railCollapsed}
            revealRole={revealRole}
            managedThemesExternally={managedThemesExternally}
            onOpenPrimitiveFamily={onOpenPrimitiveFamily}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <StepGradients
            tabBar={<span className="text-ui text-fg-muted"><span>Color / </span><strong className="font-semibold text-fg">Gradients</strong></span>}
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
            onBackToSystemColors={onBackToSystemColors}
          />
        </div>
      )}
    </div>
  )
}
