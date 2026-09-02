import { useState, type ReactNode } from 'react'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import VariablesTable from './VariablesTable'
import RailSelect from '../ui/RailSelect'
import { RailControl, RailDivider, RailGroupNav } from './VariableCollectionRail'
import {
  PADDING_SIDES,
  PADDING_STANDARD,
  SPACING_BASE_PRESETS,
  SPACING_DEFAULT_BASE,
  SPACING_STANDARD,
  SPACING_STEPS,
  buildSpacingFromBase,
} from '../../lib/layoutTokens'

export const BASE_PRESETS: { label: string; value: number }[] = SPACING_BASE_PRESETS.map((p) => ({ label: p.label, value: p.value }))
export { SPACING_STEPS, buildSpacingFromBase }

function RulerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 21V3M3 21V3M9 8v8M15 8v8" />
    </svg>
  )
}

const SPACING_COLLECTIONS = [
  { key: 'scale', label: 'Spacing scale' },
  { key: 'padding', label: 'Surface paddings' },
] as const
type SpacingCollection = (typeof SPACING_COLLECTIONS)[number]['key']

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

function PaddingPreview({ side, value }: { side: typeof PADDING_SIDES[number]; value: string }) {
  const px = Math.max(2, Math.min(pxToNum(value) / 2, 12))
  const pos =
    side === 'top' ? { top: 0, left: 0, right: 0, height: px }
    : side === 'bottom' ? { bottom: 0, left: 0, right: 0, height: px }
    : side === 'left' ? { left: 0, top: 0, bottom: 0, width: px }
    : { right: 0, top: 0, bottom: 0, width: px }
  return (
    <div className="relative w-12 h-7 rounded border border-line-strong bg-elevated overflow-hidden flex-shrink-0">
      <div className="absolute bg-fg/25" style={pos} />
    </div>
  )
}

export default function Step5_Spacing({ tabBar, query, previewTheme }: { tabBar?: ReactNode; query?: string; previewTheme?: string } = {}) {
  const { store, foundations, patch } = useThemeFoundations(previewTheme)
  const { primaryColor, themes } = store
  const { spacing, padding } = foundations
  const setSpacing = (value: Record<string, string>) => patch({ spacing: value })
  const setPadding = (value: Record<string, string>) => patch({ padding: value })

  const [baseUnit, setBaseUnit] = useState(() => pxToNum(spacing['1'] ?? '4px') || SPACING_DEFAULT_BASE)
  const [collection, setCollection] = useState<SpacingCollection>('scale')

  const accentColor = themes.light?.primary || primaryColor || '#9522e9'

  const valueOf = (step: string) => spacing[step] ?? `${Number(step) * baseUnit}px`
  const maxSpacingPx = Math.max(...SPACING_STEPS.map((s) => pxToNum(valueOf(s))), 1)

  function applyBase(base: number) {
    setBaseUnit(base)
    const next = buildSpacingFromBase(base)
    setSpacing(next)
    // Surface inset aliases spacing-5 — keep the four sides on that step.
    const inset = next['5']
    setPadding({ top: inset, right: inset, bottom: inset, left: inset })
  }

  const scaleRows = SPACING_STEPS.map((step) => {
    const value = valueOf(step)
    const standard = SPACING_STANDARD[step]
    const barW = maxSpacingPx > 0 ? (pxToNum(value) / maxSpacingPx) * 100 : 0
    return {
      name: `spacing-${step}`,
      value,
      modified: value !== standard,
      onChange: (v: string) => setSpacing({ ...spacing, [step]: v }),
      onReset: () => setSpacing({ ...spacing, [step]: standard }),
      preview: (
        <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(barW, step === '0' ? 0 : 2)}%`, backgroundColor: accentColor + '88' }}
          />
        </div>
      ),
    }
  })

  const paddingRows = PADDING_SIDES.map((side) => {
    const value = padding?.[side] ?? PADDING_STANDARD[side]
    return {
      name: `padding-${side}`,
      value,
      modified: value !== PADDING_STANDARD[side],
      onChange: (v: string) => setPadding({ ...padding, [side]: v }),
      onReset: () => setPadding({ ...padding, [side]: PADDING_STANDARD[side] }),
      preview: <PaddingPreview side={side} value={value} />,
    }
  })

  const counts: Record<SpacingCollection, number> = { scale: scaleRows.length, padding: paddingRows.length }
  const active = SPACING_COLLECTIONS.find((c) => c.key === collection) ?? SPACING_COLLECTIONS[0]

  return (
    <div className="h-full flex flex-col">
      <VariablesTable
        title={active.label}
        searchLabel="Filter spacing tokens"
        railed
        tabBar={tabBar}
        query={query}
        railBody={
          <>
            <RailControl label="Base unit">
              <RailSelect
                value={baseUnit}
                options={BASE_PRESETS.map((p) => ({ value: p.value, label: p.label.replace(/\s+/g, ' ') }))}
                onChange={applyBase}
                ariaLabel="Spacing base unit"
                icon={<RulerIcon />}
              />
            </RailControl>
            <RailDivider />
            <RailGroupNav
              ariaLabel="Spacing collections"
              items={SPACING_COLLECTIONS.map((c) => ({ key: c.key, label: c.label, count: counts[c.key] }))}
              active={collection}
              onChange={setCollection}
            />
          </>
        }
        groups={[{ valueLabel: 'Value', rows: collection === 'scale' ? scaleRows : paddingRows }]}
      />
    </div>
  )
}
