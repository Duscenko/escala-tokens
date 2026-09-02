import { useState, type ReactNode } from 'react'
import { SIZES_DEFAULT } from '../../store/useDesignStore'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import VariablesTable from './VariablesTable'
import { RailGroupNav } from './VariableCollectionRail'
import { SIZE_STEPS, SELECTOR_STEPS, SELECTOR_STANDARD } from '../../lib/layoutTokens'

// Two collections, one foundation. Both answer "how big is this control", but
// they are not one ramp: a control HEIGHT and the SQUARE a checkbox is drawn in
// scale differently, and 24px is `size` xs while it is `selector` xl. Same
// split Spacing already makes between its scale and surface paddings.
type SizeCollection = 'heights' | 'selectors'

const COLLECTIONS: { key: SizeCollection; label: string }[] = [
  { key: 'heights', label: 'Control heights' },
  { key: 'selectors', label: 'Selectors' },
]

export default function Step9_Sizes({ tabBar, query, previewTheme }: { tabBar?: ReactNode; query?: string; previewTheme?: string } = {}) {
  const { store, foundations, patch } = useThemeFoundations(previewTheme)
  const { primaryColor, primaryScale } = store
  const { sizes, selector } = foundations
  const setSizes = (value: Record<string, string>) => patch({ sizes: value })
  const setSelector = (value: Record<string, string>) => patch({ selector: value })
  const accent = primaryScale[9] ?? primaryColor
  const [collection, setCollection] = useState<SizeCollection>('heights')

  const bar = (px: number, peak: number) => (
    <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max((px / peak) * 100, 2)}%`, backgroundColor: accent + '88' }} />
    </div>
  )

  const heightPeak = Math.max(...Object.values(sizes).map((v) => parseFloat(v) || 0), 1)
  const heightRows = SIZE_STEPS.map((key) => {
    const value = sizes[key] ?? SIZES_DEFAULT[key]
    const standard = SIZES_DEFAULT[key]
    return {
      name: `size-${key}`,
      value,
      modified: standard !== undefined && value !== standard,
      onChange: (v: string) => setSizes({ ...sizes, [key]: v }),
      onReset: () => setSizes({ ...sizes, [key]: standard ?? value }),
      preview: bar(parseFloat(value) || 0, heightPeak),
    }
  })

  const selectorPeak = Math.max(...Object.values(selector ?? {}).map((v) => parseFloat(v) || 0), 1)
  const selectorRows = SELECTOR_STEPS.map((key) => {
    const value = selector?.[key] ?? SELECTOR_STANDARD[key]
    const standard = SELECTOR_STANDARD[key]
    return {
      name: `selector-${key}`,
      value,
      modified: standard !== undefined && value !== standard,
      onChange: (v: string) => setSelector({ ...selector, [key]: v }),
      onReset: () => setSelector({ ...selector, [key]: standard ?? value }),
      preview: bar(parseFloat(value) || 0, selectorPeak),
    }
  })

  const counts: Record<SizeCollection, number> = { heights: heightRows.length, selectors: selectorRows.length }
  const showingHeights = collection === 'heights'
  const specimenSteps = showingHeights ? SIZE_STEPS : SELECTOR_STEPS
  const specimenValues: Record<string, string> = showingHeights ? sizes : (selector ?? SELECTOR_STANDARD)

  return (
    // Flush + railed, like every other foundation table.
    <div className="h-full flex flex-col">
      <VariablesTable
        title={showingHeights ? 'Control heights' : 'Selectors'}
        searchLabel="Filter size tokens"
        railed
        tabBar={tabBar}
        query={query}
        railBody={
          <RailGroupNav
            ariaLabel="Size collections"
            items={COLLECTIONS.map((c) => ({ key: c.key, label: c.label, count: counts[c.key] }))}
            active={collection}
            onChange={setCollection}
          />
        }
        groups={[{ valueLabel: showingHeights ? 'Height' : 'Square', rows: showingHeights ? heightRows : selectorRows }]}
        // The comparative specimen rides INSIDE the table's scroll column (see
        // VariablesTable's `footer`) — outside it, a railed section would put
        // this block beside the gutter instead of under the rows it explains.
        footer={
          <div className="flex flex-col gap-3">
            <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">
              {showingHeights ? 'Component sizes' : 'Selector glyphs'}
            </span>
            <div className="flex items-end justify-center gap-4 rounded-xl border border-line bg-app p-6">
              {specimenSteps.map((key) => {
                const value = specimenValues[key] ?? '0px'
                const px = parseFloat(value) || 0
                return (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div
                      className="rounded-lg flex items-center justify-center text-mini font-mono"
                      style={{
                        // A selector is a SQUARE — showing it in the 64px-wide
                        // box the heights use would misrepresent the token.
                        width: showingHeights ? 64 : px,
                        height: px,
                        backgroundColor: accent + '22',
                        border: `1.5px solid ${accent}66`,
                        color: accent,
                      }}
                    >
                      {showingHeights ? value : ''}
                    </div>
                    <span className="text-caption font-mono text-fg-faint">{key}</span>
                    {!showingHeights && <span className="text-mini font-mono text-fg-faint">{value}</span>}
                  </div>
                )
              })}
            </div>
            {!showingHeights && (
              <p className="text-caption leading-snug text-fg-muted">
                A selector below 24px does not meet WCAG 2.2 target size on its own — pair it
                with a transparent hit area (<code className="font-mono text-mini">--size-hit</code>)
                rather than growing the glyph.
              </p>
            )}
          </div>
        }
      />
    </div>
  )
}
