import Step3_SemanticTokens, { type SemanticCategory } from './Step3_SemanticTokens'
import StepGradients from './StepGradients'
import ColorPrimitives from './ColorPrimitives'

export type ColorTab = 'primary' | 'gradients' | 'semantics'

const TABS: { key: ColorTab; label: string }[] = [
  { key: 'primary', label: 'Primary Color' },
  { key: 'semantics', label: 'Alias / Semantics' },
  { key: 'gradients', label: 'Gradients' },
]

// The Color hub unifies the primitive families (ColorPrimitives), the semantic
// alias matrix (Step3) and the gradient tokens (StepGradients) under one
// foundation, switched by a three-tab pill bar. On Primary the bar sits BELOW
// the quick bar, directly above the families table (passed down as `tabsSlot`);
// the other tabs keep it pinned on top. Primary and Gradients scroll normally;
// the Alias tab self-manages its internal scroll, so it lives in a bounded
// min-h-0 flex parent.
export default function ColorHub({
  colorTab,
  onColorTabChange,
  activeCategory,
  onCategoryChange,
  previewTheme,
  onPreviewThemeChange,
}: {
  colorTab: ColorTab
  onColorTabChange: (t: ColorTab) => void
  activeCategory?: SemanticCategory
  onCategoryChange?: (c: SemanticCategory) => void
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
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
      {colorTab === 'primary' ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-8">
          <ColorPrimitives
            previewTheme={previewTheme}
            onPreviewThemeChange={onPreviewThemeChange}
            tabsSlot={tabBar}
          />
        </div>
      ) : colorTab === 'gradients' ? (
        <>
          <div className="flex-shrink-0 px-8 pt-6">{tabBar}</div>
          <div className="flex-1 min-h-0 overflow-y-auto p-8">
            <StepGradients />
          </div>
        </>
      ) : (
        <>
          <div className="flex-shrink-0 px-8 pt-6">{tabBar}</div>
          <div className="flex-1 min-h-0 flex flex-col p-8">
            <Step3_SemanticTokens
              activeCategory={activeCategory}
              onCategoryChange={onCategoryChange}
              previewTheme={previewTheme}
              onPreviewThemeChange={onPreviewThemeChange}
            />
          </div>
        </>
      )}
    </div>
  )
}
