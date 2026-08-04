import { useDesignStore, OPACITY_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

// Parse "40%" | "0.4" | "40" into a 0–1 alpha for the preview swatch.
function toAlpha(value: string): number {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return 1
  return value.includes('%') || n > 1 ? Math.min(n / 100, 1) : n
}

const CHECKER = {
  backgroundImage: 'repeating-conic-gradient(var(--elevated) 0% 25%, var(--surface) 0% 50%)',
} as const

export default function Step6_Opacity() {
  const { opacity, setOpacity, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor

  return (
    // Flush + railed, like every other foundation table. No global control to
    // put in a row-1 cell (the steps are a fixed 0–100 ramp), so the 198px
    // gutter is empty and exists purely for alignment — see Sizes.
    <div className="h-full flex flex-col">
      <VariablesTable
        title="Opacity tokens"
        searchLabel="Filter opacity tokens"
        railed
        groups={[
          {
            valueLabel: 'Opacity',
            rows: Object.entries(opacity).map(([key, value]) => {
              const standard = OPACITY_DEFAULT[key]
              return {
                name: `opacity-${key}`,
                value,
                modified: standard !== undefined && value !== standard,
                onChange: (v: string) => setOpacity({ ...opacity, [key]: v }),
                onReset: () => setOpacity({ ...opacity, [key]: standard ?? value }),
                preview: (
                  <div className="w-10 h-5 rounded border border-line flex-shrink-0" style={{ ...CHECKER, backgroundSize: '10px 10px' }}>
                    <div className="w-full h-full rounded" style={{ backgroundColor: accent, opacity: toAlpha(value) }} />
                  </div>
                ),
              }
            }),
          },
        ]}
        footer={
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Opacity scale</span>
            <div
              className="flex rounded-xl overflow-hidden border border-line"
              style={{ ...CHECKER, backgroundSize: '14px 14px' }}
            >
              {Object.entries(opacity).map(([key, value]) => (
                <div key={key} className="flex-1 flex flex-col items-center">
                  <div className="w-full h-14" style={{ backgroundColor: accent, opacity: toAlpha(value) }} />
                  <span className="text-[10px] font-mono text-fg-faint py-1.5 bg-surface w-full text-center border-t border-line">
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  )
}
