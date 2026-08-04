import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import VariablesTable from './VariablesTable'
import RailSelect from '../ui/RailSelect'

// Ruler glyph — the same mark the foundation rail uses for Spacing, so the
// base-unit trigger reads as "spacing" at a glance.
function RulerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 21V3M3 21V3M9 8v8M15 8v8" />
    </svg>
  )
}

/** The two token collections the rail switches between. */
const SPACING_COLLECTIONS = [
  { key: 'scale', label: 'Spacing scale' },
  { key: 'padding', label: 'Surface paddings' },
] as const
type SpacingCollection = (typeof SPACING_COLLECTIONS)[number]['key']

// Base unit presets — also used by NewTokenWizard's Spacing step.
export const BASE_PRESETS = [
  { label: '4px  (default)', value: 4 },
  { label: '8px  (spacious)', value: 8 },
  { label: '5px  (5-grid)',   value: 5 },
]

export const SPACING_STEPS = ['1', '2', '3', '4', '6', '8', '10', '12', '16'] as const
const DEFAULT_BASE = 4

function pxToNum(val: string): number {
  return parseFloat(val.replace('px', '')) || 0
}

export function buildSpacingFromBase(base: number): Record<string, string> {
  const result: Record<string, string> = {}
  SPACING_STEPS.forEach((step) => {
    result[step] = `${Number(step) * base}px`
  })
  return result
}

const PADDING_SIDES = [
  { key: 'top', label: 'Top' },
  { key: 'right', label: 'Right' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
] as const

const PADDING_STANDARD = '20px'

// Mini card showing which side the padding token insets.
function PaddingPreview({ side, value }: { side: 'top' | 'right' | 'bottom' | 'left'; value: string }) {
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

export default function Step5_Spacing() {
  const { spacing, setSpacing, padding, setPadding, primaryColor, themes } = useDesignStore()

  // Infer the active base from step 1 so the control reflects a saved 8px scale.
  const [baseUnit, setBaseUnit] = useState(() => pxToNum(spacing['1'] ?? '4px') || DEFAULT_BASE)
  // The rail's selection. The two groups used to stack in one scroll behind
  // sticky sub-headers; with a rail they become real collections, the same way
  // Typography's categories and Color's families do.
  const [collection, setCollection] = useState<SpacingCollection>('scale')

  const accentColor = themes.light?.primary || primaryColor || '#9522e9'

  const valueOf = (step: string) => spacing[step] ?? `${Number(step) * baseUnit}px`
  const maxSpacingPx = Math.max(...SPACING_STEPS.map((s) => pxToNum(valueOf(s))), 1)

  function applyBase(base: number) {
    setBaseUnit(base)
    setSpacing(buildSpacingFromBase(base))
  }

  const scaleRows = SPACING_STEPS.map((step) => {
    const value = valueOf(step)
    const standard = `${Number(step) * DEFAULT_BASE}px`
    const barW = (pxToNum(value) / maxSpacingPx) * 100
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
            style={{ width: `${Math.max(barW, 2)}%`, backgroundColor: accentColor + '88' }}
          />
        </div>
      ),
    }
  })

  // Per-side inset padded surfaces use (cards, tiles, panels) — the same
  // `padding` token Quick edit's Padding row writes.
  const paddingRows = PADDING_SIDES.map((side) => {
    const value = padding?.[side.key] ?? PADDING_STANDARD
    return {
      name: `padding-${side.key}`,
      value,
      modified: value !== PADDING_STANDARD,
      onChange: (v: string) => setPadding({ ...padding, [side.key]: v }),
      onReset: () => setPadding({ ...padding, [side.key]: PADDING_STANDARD }),
      preview: <PaddingPreview side={side.key} value={value} />,
    }
  })

  const counts: Record<SpacingCollection, number> = { scale: scaleRows.length, padding: paddingRows.length }
  const active = SPACING_COLLECTIONS.find((c) => c.key === collection) ?? SPACING_COLLECTIONS[0]

  return (
    // Same three rows as Color / Typography / Radius: a 198px labelled control
    // cell over a 198px nav, against a flush table. Was a `p-8` stack with both
    // groups in one scroll behind sticky sub-headers.
    <div className="h-full flex flex-col">
      {/* ── Row 1 — the base unit | the scale it generates ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div className="w-[198px] flex-shrink-0 border-r border-line flex flex-col justify-center gap-1.5 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Base unit</span>
          <RailSelect
            value={baseUnit}
            options={BASE_PRESETS.map((p) => ({ value: p.value, label: p.label.replace(/\s+/g, ' ') }))}
            onChange={applyBase}
            ariaLabel="Spacing base unit"
            icon={<RulerIcon />}
          />
        </div>
        {/* What the base unit PRODUCES — the same job row 1's right cell does
            on every other foundation (Color's ramp, Radius' slider+chip,
            Gradients' bar): every step drawn to scale, so changing the base
            visibly redraws the whole system in one glance. */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 pl-6 lg:pl-8 pr-3 py-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Scale</span>
            <span className="text-[11px] font-mono text-fg-muted tabular-nums">
              {valueOf('1')} → {valueOf('16')}
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-9">
            {SPACING_STEPS.map((step) => (
              <div
                key={step}
                className="flex-1 min-w-0 rounded-sm"
                style={{
                  height: `${Math.max((pxToNum(valueOf(step)) / maxSpacingPx) * 100, 6)}%`,
                  backgroundColor: accentColor + '88',
                }}
                title={`spacing-${step} — ${valueOf(step)}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Rows 2+3 — the rail's collections against the flush table ── */}
      <VariablesTable
        title={active.label}
        searchLabel="Filter spacing tokens"
        railed
        railTop={<span className="text-[13px] font-semibold text-fg">Collections</span>}
        railBody={
          <nav aria-label="Spacing collections" className="py-1.5 px-2 flex flex-col gap-0.5">
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
        }
        groups={[{ valueLabel: 'Value', rows: collection === 'scale' ? scaleRows : paddingRows }]}
      />
    </div>
  )
}
