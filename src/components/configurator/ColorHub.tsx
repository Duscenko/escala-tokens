import Step3_SemanticTokens, { type SemanticCategory } from './Step3_SemanticTokens'
import StepGradients from './StepGradients'
import ColorPrimitives from './ColorPrimitives'
import PickerColor, { type PickerFocusTarget } from './PickerColor'

export type ColorTab = 'picker' | 'primary' | 'semantics' | 'gradients'

const TABS: { key: ColorTab; label: string }[] = [
  { key: 'picker', label: 'Picker Color' },
  { key: 'primary', label: 'Primary Color' },
  { key: 'semantics', label: 'Alias / Semantics' },
  { key: 'gradients', label: 'Gradients' },
]

// The Color hub unifies palette DEFINITION (PickerColor: Color families,
// Gray/Neutral, State Colors — each with its full scale always visible), the
// primitive families' USAGE table (ColorPrimitives), the semantic alias
// matrix (Step3) and the gradient tokens (StepGradients) under one
// foundation, switched by a four-tab pill bar. The bar is always pinned above
// the content — same position for every tab — so jumping between "define"
// and "use" never requires scrolling back up first.
export default function ColorHub({
  colorTab,
  onColorTabChange,
  activeCategory,
  onCategoryChange,
  previewTheme,
  onPreviewThemeChange,
  focusFamilyKey,
  pickerFocusTarget,
  onPickerFocusHandled,
  onEditInPicker,
}: {
  colorTab: ColorTab
  onColorTabChange: (t: ColorTab) => void
  activeCategory?: SemanticCategory
  onCategoryChange?: (c: SemanticCategory) => void
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
  /** Forwarded to ColorPrimitives — switches its active family (e.g. a family
   *  NewTokenWizard just created). */
  focusFamilyKey?: string | null
  /** Forwarded to PickerColor — scrolls + pulses the requested section. */
  pickerFocusTarget?: PickerFocusTarget
  onPickerFocusHandled?: () => void
  /** Forwarded to ColorPrimitives — "Edit in Picker Color" switches to that
   *  tab AND focuses the family the link was clicked from. */
  onEditInPicker?: (target: Exclude<PickerFocusTarget, null>) => void
}) {
  const tabBar = (
    <div className="flex items-center gap-1 p-1 rounded-full bg-elevated/60 border border-line w-full">
      {TABS.map((t) => {
        const active = colorTab === t.key
        return (
          <button
            key={t.key}
            onClick={() => onColorTabChange(t.key)}
            aria-pressed={active}
            className={`flex-1 px-3.5 py-2 rounded-full text-[13px] font-medium text-center transition-colors ${
              active ? 'bg-app text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-shrink-0 px-8 pt-6">{tabBar}</div>
      {colorTab === 'picker' ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-8 pt-6">
          <PickerColor
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
            focusTarget={pickerFocusTarget}
            onFocusHandled={onPickerFocusHandled}
          />
        </div>
      ) : colorTab === 'primary' ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-8 pt-6">
          <ColorPrimitives
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
            focusFamilyKey={focusFamilyKey}
            onEditInPicker={onEditInPicker}
          />
        </div>
      ) : colorTab === 'gradients' ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-8 pt-6">
          <StepGradients />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col p-8 pt-6">
          <Step3_SemanticTokens
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
          />
        </div>
      )}
    </div>
  )
}
