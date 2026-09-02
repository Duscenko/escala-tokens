import { type ReactNode } from 'react'
import { GRID_DEFAULT } from '../../store/useDesignStore'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import VariablesTable from './VariablesTable'
import { BREAKPOINT_STEPS, breakpointKey } from '../../lib/layoutTokens'

const KEYS = BREAKPOINT_STEPS.map(breakpointKey)

export default function Step8_Grid({ tabBar, query, previewTheme }: { tabBar?: ReactNode; query?: string; previewTheme?: string } = {}) {
  const { store, foundations, patch } = useThemeFoundations(previewTheme)
  const { primaryColor, primaryScale } = store
  const grid = foundations.grid
  const setGrid = (value: Record<string, string>) => patch({ grid: value })
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
        // Railed like every other foundation: Grid was the one section with no
        // collections column at all, so its table started 240px left of
        // everyone else's and the Collections list it owns was unreachable.
        railed
        tabBar={tabBar}
        query={query}
        groups={[{ valueLabel: 'Min width', rows }]}
      />
    </div>
  )
}
