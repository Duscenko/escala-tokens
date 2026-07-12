import Step2_ColorPalette from './Step2_ColorPalette'
import Step3_SemanticTokens, { type SemanticCategory } from './Step3_SemanticTokens'

export type ColorTab = 'primitives' | 'semantics'

const TABS: { key: ColorTab; label: string }[] = [
  { key: 'semantics', label: 'Alias / Semantics' },
  { key: 'primitives', label: 'Primitives' },
]

// The Color hub unifies the primitive scales (Step2) and the semantic alias
// matrix (Step3) under one foundation, switched by a two-tab header. Primitives
// scrolls normally; the Alias tab self-manages its internal scroll, so it lives
// in a bounded min-h-0 flex parent.
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
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Tab switcher — spans the full content width */}
      <div className="flex-shrink-0 px-8 pt-6">
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
      </div>

      {colorTab === 'primitives' ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-8">
          <Step2_ColorPalette />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col p-8">
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
