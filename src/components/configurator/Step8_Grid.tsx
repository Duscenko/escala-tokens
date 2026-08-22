import { type ReactNode } from 'react'
import { useDesignStore, GRID_DEFAULT } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'
import { BREAKPOINT_STEPS, breakpointKey } from '../../lib/layoutTokens'

const KEYS = BREAKPOINT_STEPS.map(breakpointKey)

export default function Step8_Grid({ tabBar }: { tabBar?: ReactNode } = {}) {
  const { grid, setGrid, primaryColor, primaryScale } = useDesignStore()
  const accent = primaryScale[9] ?? primaryColor

  const rows = KEYS
    .filter((key) => grid[key] !== undefined)
    .map((key) => {
      const value = grid[key]
      const standard = GRID_DEFAULT[key]
      const px = parseFloat(value) || 0
      const pct = Math.min((px / 1536) * 100, 100)
      return {
        name: key,
        value,
        modified: standard !== undefined && value !== standard,
        onChange: (v: string) => setGrid({ ...grid, [key]: v }),
        onReset: () => setGrid({ ...grid, [key]: standard ?? value }),
        preview: (
          <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: accent + '88' }}
            />
          </div>
        ),
      }
    })

  return (
    <div className="h-full flex flex-col">
      <VariablesTable
        title="Breakpoints"
        searchLabel="Filter breakpoints"
        tabBar={tabBar}
        groups={[{ valueLabel: 'Min width', rows }]}
      />
    </div>
  )
}
