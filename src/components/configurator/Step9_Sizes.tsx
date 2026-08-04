import { useDesignStore, SIZES_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'

export default function Step9_Sizes() {
  const { sizes, setSizes, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor

  const maxPx = Math.max(...Object.values(sizes).map((v) => parseFloat(v) || 0), 1)

  return (
    // Flush + railed, like every other foundation table. Sizes has no global
    // control to put in a row-1 cell (there's no "size preset" — each height is
    // its own token), so it starts at the Collections row the way Typography
    // does; the 198px gutter is empty and exists purely so this table's left
    // edge lands on the same line as Color's and Spacing's navs.
    <div className="h-full flex flex-col">
      <VariablesTable
        title="Size tokens"
        searchLabel="Filter size tokens"
        railed
        groups={[
          {
            valueLabel: 'Height',
            rows: Object.entries(sizes).map(([key, value]) => {
              const px = parseFloat(value) || 0
              const standard = SIZES_DEFAULT[key]
              return {
                name: `size-${key}`,
                value,
                modified: standard !== undefined && value !== standard,
                onChange: (v: string) => setSizes({ ...sizes, [key]: v }),
                onReset: () => setSizes({ ...sizes, [key]: standard ?? value }),
                preview: (
                  <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((px / maxPx) * 100, 2)}%`,
                        backgroundColor: accent + '88',
                      }}
                    />
                  </div>
                ),
              }
            }),
          },
        ]}
        // The comparative specimen rides INSIDE the table's scroll column (see
        // VariablesTable's `footer`) — outside it, a railed section would put
        // this block beside the gutter instead of under the rows it explains.
        // No enter animation: the foundation tables all dropped theirs.
        footer={
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Component sizes</span>
            <div className="flex items-end justify-center gap-4 rounded-xl border border-line bg-app p-6">
              {Object.entries(sizes).map(([key, value]) => {
                const px = parseFloat(value) || 0
                return (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 rounded-lg flex items-center justify-center text-[10px] font-mono"
                      style={{
                        height: px,
                        backgroundColor: accent + '22',
                        border: `1.5px solid ${accent}66`,
                        color: accent,
                      }}
                    >
                      {value}
                    </div>
                    <span className="text-[11px] font-mono text-fg-faint">{key}</span>
                  </div>
                )
              })}
            </div>
          </div>
        }
      />
    </div>
  )
}
