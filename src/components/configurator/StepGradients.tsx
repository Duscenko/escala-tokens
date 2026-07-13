// Gradients foundation — create named gradients (linear/radial, angle, stops),
// assign them to preview surfaces (card covers, avatars), and ship them in the
// export. Store-driven: every edit writes straight to `gradients` /
// `gradientAssignments`, so the live previews + tokens.json track instantly.

import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { gradientToCss, gradientSlug, makeGradient, type GradientDef, type GradientType } from '../../lib/gradients'
import ColorField from '../ui/ColorField'

const TYPE_OPTIONS: { key: GradientType; label: string }[] = [
  { key: 'linear', label: 'Linear' },
  { key: 'radial', label: 'Radial' },
]

function AssignSelect({ label, value, onChange, gradients }: {
  label: string
  value: string | null
  onChange: (id: string | null) => void
  gradients: GradientDef[]
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-fg-muted w-24 flex-shrink-0">{label}</span>
      <div className="relative flex-1">
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded ring-1 ring-black/10 pointer-events-none"
          style={{ background: value ? gradientToCss(gradients.find((g) => g.id === value) ?? gradients[0]) : 'transparent' }}
          aria-hidden
        />
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-line bg-surface text-[13px] text-fg outline-none focus:border-line-strong appearance-none cursor-pointer"
        >
          <option value="">None</option>
          {gradients.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>
    </label>
  )
}

export default function StepGradients() {
  const {
    gradients, gradientAssignments,
    addGradient, updateGradient, removeGradient, setGradientAssignment,
  } = useDesignStore()

  const [selectedId, setSelectedId] = useState<string | null>(gradients[0]?.id ?? null)
  const selected = gradients.find((g) => g.id === selectedId) ?? gradients[0] ?? null

  function create() {
    const g = makeGradient()
    addGradient(g)
    setSelectedId(g.id)
  }

  function patch(updates: Partial<Omit<GradientDef, 'id'>>) {
    if (selected) updateGradient(selected.id, updates)
  }

  function updateStop(i: number, key: 'color' | 'pos', v: string | number) {
    if (!selected) return
    const stops = selected.stops.map((s, idx) => (idx === i ? { ...s, [key]: v } : s))
    patch({ stops })
  }

  function addStop() {
    if (!selected) return
    const last = selected.stops[selected.stops.length - 1]
    patch({ stops: [...selected.stops, { color: last?.color ?? '#7f56d9', pos: 100 }] })
  }

  function removeStop(i: number) {
    if (!selected || selected.stops.length <= 2) return
    patch({ stops: selected.stops.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Assignments — which gradient drives each preview surface */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-fg">Assignments</h3>
          <p className="text-xs text-fg-faint">Pick which gradient renders on each surface in the live previews.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <AssignSelect label="Card cover" value={gradientAssignments.cover} gradients={gradients} onChange={(id) => setGradientAssignment('cover', id)} />
          <AssignSelect label="Avatars" value={gradientAssignments.avatar} gradients={gradients} onChange={(id) => setGradientAssignment('avatar', id)} />
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Gradient library */}
        <div className="lg:w-64 flex-shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Gradients</h3>
            <button
              type="button"
              onClick={create}
              className="flex items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              New
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {gradients.map((g) => {
              const active = g.id === selectedId
              const assigned = gradientAssignments.cover === g.id || gradientAssignments.avatar === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={`group flex items-center gap-2.5 px-2 py-2 rounded-xl border text-left transition-colors ${
                    active ? 'border-line-strong bg-elevated' : 'border-line hover:bg-surface'
                  }`}
                >
                  <span className="w-9 h-9 rounded-lg flex-shrink-0 ring-1 ring-black/10" style={{ background: gradientToCss(g) }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-fg truncate">{g.name}</span>
                    <span className="block text-[10px] text-fg-faint truncate capitalize">{g.type} · {g.stops.length} stops{assigned ? ' · in use' : ''}</span>
                  </span>
                  {gradients.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); if (selectedId === g.id) setSelectedId(gradients.find((x) => x.id !== g.id)?.id ?? null); removeGradient(g.id) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeGradient(g.id) } }}
                      aria-label={`Delete ${g.name}`}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-fg-faint hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Editor */}
        {selected ? (
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Big live preview */}
            <div className="h-44 rounded-2xl ring-1 ring-line overflow-hidden" style={{ background: gradientToCss(selected) }} />

            {/* Name + type */}
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 flex flex-col gap-1">
                <span className="text-xs text-fg-muted">Name</span>
                <input
                  value={selected.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-line bg-surface text-[13px] text-fg outline-none focus:border-line-strong"
                />
                <span className="text-[10px] font-mono text-fg-faint">--gradient-{gradientSlug(selected)}</span>
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-fg-muted">Type</span>
                <div className="flex gap-0.5 rounded-lg border border-line bg-surface p-0.5">
                  {TYPE_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => patch({ type: o.key })}
                      aria-pressed={o.key === selected.type}
                      className={`px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                        o.key === selected.type ? 'bg-elevated text-fg font-semibold shadow-sm' : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Angle (linear only) */}
            {selected.type === 'linear' && (
              <label className="flex items-center gap-3">
                <span className="text-xs text-fg-muted w-12 flex-shrink-0">Angle</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={selected.angle}
                  onChange={(e) => patch({ angle: Number(e.target.value) })}
                  className="flex-1 accent-fg"
                  aria-label="Gradient angle"
                />
                <span className="text-[12px] font-mono tabular-nums text-fg w-12 text-right">{selected.angle}°</span>
              </label>
            )}

            {/* Stops */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">Stops</span>
                <button type="button" onClick={addStop} className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                  Add stop
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {selected.stops.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <ColorField value={s.color} onChange={(hex) => updateStop(i, 'color', hex)} ariaLabel={`Stop ${i + 1} color`} size={26} />
                    <span className="flex-1 min-w-0 text-[12px] font-mono text-fg-muted truncate">{s.color.toUpperCase()}</span>
                    <div className="flex items-center w-16 px-2 py-1.5 rounded-lg border border-line bg-surface">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.pos}
                        onChange={(e) => updateStop(i, 'pos', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        aria-label={`Stop ${i + 1} position`}
                        className="w-full bg-transparent text-[12px] font-mono tabular-nums text-fg outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] text-fg-faint">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      disabled={selected.stops.length <= 2}
                      aria-label={`Remove stop ${i + 1}`}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-faint hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-faint"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-fg-faint">
            No gradients yet — create one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
