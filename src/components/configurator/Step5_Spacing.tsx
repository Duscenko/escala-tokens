import { useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'
import RailSelect from '../ui/RailSelect'
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

export default function Step5_Spacing({ tabBar }: { tabBar?: ReactNode } = {}) {
  const { spacing, setSpacing, padding, setPadding, primaryColor, themes } = useDesignStore()

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
        railBody={
          <>
            <div className="flex flex-col gap-1 px-4 pt-3 pb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Base unit</span>
              <RailSelect
                value={baseUnit}
                options={BASE_PRESETS.map((p) => ({ value: p.value, label: p.label.replace(/\s+/g, ' ') }))}
                onChange={applyBase}
                ariaLabel="Spacing base unit"
                icon={<RulerIcon />}
              />
            </div>
            <nav aria-label="Spacing collections" className="py-1.5 px-2 flex flex-col gap-0.5 border-t border-line/60">
              {SPACING_COLLECTIONS.map((c) => {
                const isActive = c.key === collection
                return (
                  <button
                    key={c.key}
                    onClick={() => setCollection(c.key)}
                    aria-current={isActive}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                    }`}
                  >
                    <span className="text-[13px] flex-1 min-w-0 truncate">{c.label}</span>
                    <span className={`text-[11px] font-mono tabular-nums ${isActive ? 'text-fg-muted' : 'text-fg-faint'}`}>{counts[c.key]}</span>
                  </button>
                )
              })}
            </nav>
          </>
        }
        groups={[{ valueLabel: 'Value', rows: collection === 'scale' ? scaleRows : paddingRows }]}
      />
    </div>
  )
}
