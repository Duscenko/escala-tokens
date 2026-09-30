import { useState } from 'react'
import Step3_SemanticTokens, { type SemanticFocus } from './Step3_SemanticTokens'
import StepGradients from './StepGradients'
import ColorPrimitives from './ColorPrimitives'
import type { ThemeAppearance } from '../../lib/themeModes'
import { useDesignStore } from '../../store/useDesignStore'

export type ColorTab = 'primary' | 'semantics' | 'gradients'

// The workspace owns the depth (Primitives / Semantics). Gradients is a group
// under States in the primitives rail, so that rail stays mounted while the
// gradient editor replaces the family table.
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
   *  tab (families / token categories). Gradients uses that same rail, so it
   *  collapses too. Owned by `Configurator` because TopNav's brand block sizes
   *  its divider from the same value; see `colorControls`' note. */
  railCollapsed?: boolean
  /** Preview specimen asked to open this token's row (`key` + `seq` so repeats work). */
  revealRole?: { key: string; seq: number; as?: 'token' | 'group' | 'row' } | null
  /** A Semantics ramp-grid label asked to select this family in the Primitives
   *  table (`key` = family vocabulary name; `seq` so repeats re-fire). */
  revealFamily?: { key: string; seq: number } | null
  /** The Themes Library is the sole owner of theme selection and lifecycle. */
  managedThemesExternally?: boolean
  /** Opens the Gradients group. Color primitives stays the highlighted collection. */
  onOpenGradients?: () => void
  onBackToSystemColors?: () => void
  /** Semantics ramp-grid → jump to a family in Color · Primitives. */
  onOpenPrimitiveFamily?: (family: string) => void
}) {
  const gradients = useDesignStore((s) => s.gradients)
  const [selectedGradientId, setSelectedGradientId] = useState<string | null>(null)
  const activeGradientId = selectedGradientId ?? gradients[0]?.id ?? null
  const theme = previewTheme ?? 'light'
  const primitives = mode === 'primary' || mode === 'gradients'

  return (
    <div className="h-full flex flex-col min-h-0">
      {primitives ? (
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
            gradientsOpen={mode === 'gradients'}
            selectedGradientId={activeGradientId}
            onSelectGradient={(id) => {
              setSelectedGradientId(id)
              onOpenGradients?.()
            }}
            onOpenGradients={onOpenGradients}
            onLeaveGradients={onBackToSystemColors}
            gradientEditor={mode === 'gradients' ? (
              <StepGradients
                embedded
                previewTheme={theme}
                onPreviewThemeChange={onPreviewThemeChange}
                selectedId={activeGradientId}
                onSelectedIdChange={setSelectedGradientId}
              />
            ) : null}
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
      ) : null}
    </div>
  )
}
