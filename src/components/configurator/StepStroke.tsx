import { type ReactNode } from 'react'
import { STROKE_DEFAULT } from '../../store/useDesignStore'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import VariablesTable from './VariablesTable'
import { STROKE_STEPS, STROKE_STANDARD } from '../../lib/layoutTokens'

export default function StepStroke({ tabBar, query, previewTheme }: { tabBar?: ReactNode; query?: string; previewTheme?: string } = {}) {
  const { store, foundations, patch } = useThemeFoundations(previewTheme)
  const { primaryColor, primaryScale } = store
  const stroke = foundations.stroke
  const setStroke = (value: Record<string, string>) => patch({ stroke: value })
  const accent = primaryScale[9] ?? primaryColor
  const map = Object.keys(stroke).length ? stroke : STROKE_DEFAULT

  return (
    <div className="h-full flex flex-col">
      <VariablesTable
        title="Stroke tokens"
        searchLabel="Filter stroke tokens"
        railed
        tabBar={tabBar}
        query={query}
        groups={[
          {
            valueLabel: 'Width',
            rows: STROKE_STEPS.map((key) => {
              const value = map[key] ?? STROKE_STANDARD[key]
              const px = parseFloat(value) || 0
              const standard = STROKE_STANDARD[key]
              return {
                name: `stroke-${key}`,
                value,
                modified: value !== standard,
                onChange: (v: string) => setStroke({ ...map, [key]: v }),
                onReset: () => setStroke({ ...map, [key]: standard }),
                preview: (
                  <div className="flex-1 flex items-center">
                    <div
                      className="w-full rounded-full"
                      style={{
                        height: Math.max(px, 1),
                        backgroundColor: accent,
                        opacity: key === 'none' ? 0.2 : 0.85,
                      }}
                    />
                  </div>
                ),
              }
            }),
          },
        ]}
      />
    </div>
  )
}
