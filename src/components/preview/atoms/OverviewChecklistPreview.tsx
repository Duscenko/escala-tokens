import { useDesignStore } from '../../../store/useDesignStore'

const OVERVIEW_ITEMS: { key: string; label: string }[] = [
  { key: 'color', label: 'Color' },
  { key: 'typography', label: 'Typography' },
  { key: 'icons', label: 'Icon Library' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'radius', label: 'Border Radius' },
  { key: 'opacity', label: 'Opacity' },
  { key: 'shadow', label: 'Shadow' },
  { key: 'grid', label: 'Grid' },
  { key: 'sizes', label: 'Sizes' },
  { key: 'components', label: 'Components' },
]

export function OverviewChecklistPreview({ onOpenFoundation }: { onOpenFoundation: (key: string) => void }) {
  const { completedFoundations } = useDesignStore()
  const doneCount = OVERVIEW_ITEMS.filter((i) => completedFoundations.includes(i.key)).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm text-fg-muted uppercase tracking-wide">Overview</h3>
        <span className="text-[11px] text-fg-faint">{doneCount} of {OVERVIEW_ITEMS.length} configured</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {OVERVIEW_ITEMS.map((item) => {
          const done = completedFoundations.includes(item.key)
          return (
            <button
              key={item.key}
              onClick={() => onOpenFoundation(item.key)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-line bg-surface hover:bg-elevated/40 text-left transition-colors group"
            >
              {done ? (
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0" aria-hidden>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.2 4 7.2 8 2.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full border border-line-strong flex-shrink-0" aria-hidden />
              )}
              <span className="text-[13px] text-fg flex-1 truncate">{item.label}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-fg-faint group-hover:text-fg-muted flex-shrink-0 transition-colors" aria-hidden>
                <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
