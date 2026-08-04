// Gradients foundation — create named gradients (linear/radial, angle, stops),
// assign them to preview surfaces (card covers, avatars), and ship them in the
// export. Store-driven: every edit writes straight to `gradients` /
// `gradientAssignments`, so the live previews + tokens.json track instantly.
//
// Layout mirrors ColorPrimitives / Step3_SemanticTokens exactly — the three
// tabs of the Color hub must not reshuffle the page when you switch between
// them. Row 1 = a 198px labelled control cell + a wide "what it produces"
// cell; row 2 = the nav's header sharing a line with the tab bar + search;
// row 3 = the 198px nav against a flush, full-bleed table. The per-tab
// mapping of row 1 is: Primitives → family hex + its ramp · Semantics →
// architecture + its contrast chips · Gradients → gradient type + the live bar.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { gradientToCss, gradientSlug, makeGradient, isLinkable, linkedStopsFor, type GradientDef, type GradientType } from '../../lib/gradients'
import { usePopoverPlacement, ScaleRow } from './colorControls'
import { NAMING_SCHEMES, BASE_TONE } from '../../lib/colorUtils'
import ColorField from '../ui/ColorField'
import RailSelect from '../ui/RailSelect'
import { SlidersIcon } from '../ui/icons'

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

export default function StepGradients({ tabBar }: { tabBar?: ReactNode } = {}) {
  const {
    gradients, gradientAssignments, primaryColor, primaryScale, colorNaming,
    addGradient, updateGradient, removeGradient, setGradientAssignment,
  } = useDesignStore()

  const [selectedId, setSelectedId] = useState<string | null>(gradients[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsPlace = usePopoverPlacement(settingsRef, settingsOpen, { prefer: 360, max: 520 })
  const selected = gradients.find((g) => g.id === selectedId) ?? gradients[0] ?? null

  useEffect(() => {
    if (!settingsOpen) return
    function onDown(e: MouseEvent) { if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSettingsOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [settingsOpen])

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

  // Adding a stop works while LINKED too — it used to be disabled there, which
  // read as "a linked gradient is frozen." Linking only says where a stop's
  // COLOUR comes from (a tone of the accent ramp); how many stops there are and
  // where they sit is still the user's call. A linked gradient therefore grows
  // a tone-backed stop, and `linkedStopsFor` preserves it on the next retint.
  function addStop() {
    if (!selected) return
    const last = selected.stops[selected.stops.length - 1]
    const pos = Math.min(100, Math.max(0, Math.round(((last?.pos ?? 0) + 100) / 2)))
    const stop = locked
      ? { tone: last?.tone ?? BASE_TONE, color: primaryScale[last?.tone ?? BASE_TONE] ?? primaryColor, pos }
      : { color: last?.color ?? primaryColor, pos }
    patch({ stops: [...selected.stops, stop] })
  }

  /** Re-point a linked stop at another tone of the accent ramp. */
  function setStopTone(i: number, tone: number) {
    if (!selected) return
    const stops = selected.stops.map((s, idx) =>
      idx === i ? { ...s, tone, color: primaryScale[tone] ?? s.color } : s)
    patch({ stops })
  }

  function removeStop(i: number) {
    if (!selected || selected.stops.length <= 2) return
    patch({ stops: selected.stops.filter((_, idx) => idx !== i) })
  }

  const q = query.trim().toLowerCase()
  const visible = q ? gradients.filter((g) => g.name.toLowerCase().includes(q)) : gradients

  const linkable = selected ? isLinkable(selected.id) : false
  const locked = !!selected && linkable && selected.linked === true
  const toneNames = (NAMING_SCHEMES.find((s) => s.key === colorNaming) ?? NAMING_SCHEMES[0]).labels
  /** The exported primitive a linked stop references, e.g. `accent-9`. */
  const tokenNameFor = (tone: number) => `accent-${toneNames[tone - 1] ?? tone}`

  // Three tracks, matching the reference: position · color · row actions.
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: 'minmax(9rem,1fr) minmax(12rem,1.6fr) minmax(10rem,1fr)',
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Row 1 — gradient type + the live bar it produces ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line/60">
        <div className="w-[198px] flex-shrink-0 border-r border-line flex flex-col justify-center gap-1.5 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Gradient type</span>
          {selected ? (
            <RailSelect
              value={selected.type}
              options={TYPE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              onChange={(t) => patch({ type: t })}
              ariaLabel="Gradient type"
              icon={
                <span
                  className="block w-4 h-4 rounded-full ring-1 ring-black/10"
                  style={{ background: gradientToCss(selected) }}
                  aria-hidden
                />
              }
            />
          ) : (
            <span className="text-[13px] text-fg-faint">—</span>
          )}
        </div>
        {/* pr-3 (12px) — mirrors ColorPrimitives' matching row. */}
        <div className="flex-1 min-w-0 flex items-center gap-4 pl-6 lg:pl-8 pr-3 py-5">
          {selected ? (
            <>
              {/* The bar IS the preview — same role the ramp plays on
                  Primitives: row 1's right cell always shows the thing the
                  left cell's control defines. */}
              <div
                className="flex-1 min-w-0 h-11 rounded-[10px] ring-1 ring-line"
                style={{ background: gradientToCss(selected) }}
                title={`--gradient-${gradientSlug(selected)}`}
              />
              {selected.type === 'linear' && (
                <label className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-fg-faint">Angle</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selected.angle}
                    onChange={(e) => patch({ angle: Number(e.target.value) })}
                    className="w-28 accent-fg"
                    aria-label="Gradient angle"
                  />
                  <span className="text-[12px] font-mono tabular-nums text-fg w-9 text-right">{selected.angle}°</span>
                </label>
              )}
              {/* Gear — the name, CSS var and surface assignments. Mirrors
                  Primitives' scale-settings gear in the same spot: the
                  "everything else about this thing" affordance. */}
              <div ref={settingsRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((o) => !o)}
                  aria-haspopup="dialog"
                  aria-expanded={settingsOpen}
                  aria-label="Gradient settings — name and surface assignments"
                  title="Gradient settings"
                  className={`w-9 h-9 rounded-[13px] flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
                    settingsOpen ? 'bg-elevated border-line-strong text-fg' : 'border-line-strong bg-surface text-fg-muted hover:text-fg hover:border-fg-faint'
                  }`}
                >
                  <SlidersIcon />
                </button>
                {settingsOpen && (
                  <div
                    role="dialog"
                    aria-label="Gradient settings"
                    style={{ maxHeight: settingsPlace.max }}
                    className={`absolute right-0 z-30 w-80 rounded-2xl border border-line bg-app shadow-xl overflow-y-auto p-4 flex flex-col gap-4 ${
                      settingsPlace.up ? 'bottom-full mb-2' : 'top-full mt-2'
                    }`}
                  >
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-fg-muted">Name</span>
                      <input
                        value={selected.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-line bg-surface text-[13px] text-fg outline-none focus:border-line-strong"
                      />
                      <span className="text-[10px] font-mono text-fg-faint">--gradient-{gradientSlug(selected)}</span>
                    </label>
                    <div className="flex flex-col gap-2 border-t border-line pt-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-fg">Assignments</span>
                        <span className="text-[11px] text-fg-faint">Which gradient renders on each surface in the live previews.</span>
                      </div>
                      <AssignSelect label="Card cover" value={gradientAssignments.cover} gradients={gradients} onChange={(id) => setGradientAssignment('cover', id)} />
                      <AssignSelect label="Avatars" value={gradientAssignments.avatar} gradients={gradients} onChange={(id) => setGradientAssignment('avatar', id)} />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm text-fg-faint">No gradients yet — create one to get started.</span>
          )}
        </div>
      </div>

      {/* ── Row 2 — "Collections" + the tab bar + search, on one line ── */}
      <div className="flex items-stretch flex-shrink-0 border-b border-line">
        <div className="w-[198px] flex-shrink-0 flex items-center justify-between px-4 h-[52px] border-r border-line">
          <span className="text-[13px] font-semibold text-fg">Collections</span>
          <button
            type="button"
            onClick={create}
            aria-label="New gradient"
            title="Create a new gradient"
            className="flex items-center justify-center w-6 h-6 rounded-md text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
          </button>
        </div>
        {/* Mirrors ColorPrimitives' matching row — pr-3 (12px) clearance. */}
        <div className="flex-1 min-w-0 flex items-stretch gap-3 pr-3">
          <div className="flex-1 min-w-0">{tabBar}</div>
          <div className="self-center flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line w-48 max-w-[45%] focus-within:border-line-strong transition-colors flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-fg-muted placeholder:text-fg-faint outline-none"
              aria-label="Filter gradients"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3 — gradient nav + the stops table ── */}
      <div className="flex-1 min-h-0 flex items-stretch">
        <nav aria-label="Gradients" className="w-[198px] flex-shrink-0 h-full border-r border-line py-1.5 px-2 flex flex-col gap-0.5 bg-app overflow-y-auto">
          {visible.map((g) => {
            const active = g.id === selectedId
            const assigned = gradientAssignments.cover === g.id || gradientAssignments.avatar === g.id
            return (
              <div key={g.id} className="group relative flex items-center">
                <button
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  aria-current={active}
                  className={`flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    active ? 'bg-elevated text-accent-ui shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                  }`}
                >
                  <span className="w-4 h-4 rounded flex-shrink-0 ring-1 ring-black/10" style={{ background: gradientToCss(g) }} aria-hidden />
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{g.name}</span>
                  {assigned && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent-ui" title="In use" aria-hidden />}
                </button>
                {gradients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => { if (selectedId === g.id) setSelectedId(gradients.find((x) => x.id !== g.id)?.id ?? null); removeGradient(g.id) }}
                    aria-label={`Delete ${g.name}`}
                    title={`Delete ${g.name}`}
                    className="absolute right-1.5 w-5 h-5 flex items-center justify-center rounded text-fg-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-elevated"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            )
          })}
          {visible.length === 0 && (
            <p className="px-2.5 py-3 text-[12px] text-fg-faint">No gradients match “{query}”.</p>
          )}
        </nav>

        <div className="flex-1 min-w-0 overflow-auto">
          {selected ? (
            <div className="min-w-[28rem]">
              <div
                className="grid items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint sticky top-0 z-10"
                style={gridStyle}
              >
                <span className="pl-4 py-3 border-r border-line">Transparency</span>
                <span className="flex items-center gap-2 border-r border-line px-4 py-3">
                  Stops
                  {/* Link-to-accent lives in the STOPS header because it's a
                      statement about where every stop's COLOR comes from, not
                      about one row. Only the two built-ins can derive. */}
                  {linkable && (
                    <button
                      type="button"
                      onClick={() => {
                        if (locked) patch({ linked: false })
                        else patch({ linked: true, stops: linkedStopsFor(selected.id, primaryScale, selected.stops) ?? selected.stops })
                      }}
                      aria-pressed={locked}
                      title={locked
                        ? 'Colors follow the accent. Unlock to edit the stops by hand.'
                        : 'Relink to the accent — replaces the stops with accent-derived colors.'}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium normal-case tracking-normal transition-colors ${
                        locked ? 'bg-elevated text-fg ring-1 ring-line' : 'text-fg-faint hover:text-fg'
                      }`}
                    >
                      {locked ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                      )}
                      {locked ? 'Linked to accent' : 'Link to accent'}
                    </button>
                  )}
                </span>
                <span className="flex items-center justify-between gap-2 px-4 py-1.5">
                  Add gradient stop
                  <button
                    type="button"
                    onClick={addStop}
                    aria-label="Add gradient stop"
                    title={locked ? 'Add a stop — it reads an accent tone too' : 'Add a gradient stop'}
                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-line text-fg-faint hover:text-fg hover:border-line-strong hover:bg-elevated transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-faint disabled:hover:border-line"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
                  </button>
                </span>
              </div>

              {locked && (
                <p className="px-4 py-2 text-[11px] text-fg-faint border-b border-line/40">
                  Each stop reads a <strong className="font-semibold text-fg-muted">tone of your accent ramp</strong>, so the gradient
                  re-resolves through the primitives whenever the accent changes. Pick a different tone below, or unlock to use a
                  free colour instead.
                </p>
              )}

              {selected.stops.map((s, i) => (
                <div
                  key={i}
                  className={`grid items-center border-t border-line/40 transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04] ${
                    i % 2 === 1 ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''
                  }`}
                  style={gridStyle}
                >
                  <div className="pl-4 pr-3 py-2.5 border-r border-line">
                    <div className="flex items-center w-24 px-2 py-1.5 rounded-lg border border-line bg-surface">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.pos}
                        onChange={(e) => updateStop(i, 'pos', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        aria-label={`Stop ${i + 1} position`}
                        className="w-full bg-transparent text-[12px] font-mono tabular-nums text-fg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] text-fg-faint">%</span>
                    </div>
                  </div>

                  {/* Linked → the stop IS a primitive, so it names the token
                      and offers the ramp to re-point at. Unlinked → a free
                      colour, so it keeps the raw picker + hex. Showing bare hex
                      for a linked stop was the bug: it named a value that lived
                      nowhere in the system. */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-r border-line min-w-0">
                    {locked && typeof s.tone === 'number' ? (
                      <>
                        <span
                          className="w-[22px] h-[22px] rounded-md flex-shrink-0 ring-1 ring-black/10"
                          style={{ background: s.color }}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className="text-[12px] font-mono text-fg-muted truncate" title={`${tokenNameFor(s.tone)} — ${s.color.toUpperCase()}`}>
                            {tokenNameFor(s.tone)}
                          </span>
                          <ScaleRow
                            scale={primaryScale}
                            labels={toneNames}
                            selectedIndex={s.tone}
                            onSelect={(tone) => setStopTone(i, tone)}
                            ariaLabel={`Stop ${i + 1} accent tone`}
                            showNumbers={false}
                            size="thin"
                            joined
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <ColorField value={s.color} onChange={(hex) => updateStop(i, 'color', hex)} ariaLabel={`Stop ${i + 1} color`} size={22} />
                        <span className="flex-1 min-w-0 text-[12px] font-mono text-fg-muted truncate">{s.color.toUpperCase()}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      disabled={selected.stops.length <= 2}
                      aria-label={`Remove stop ${i + 1}`}
                      title={selected.stops.length <= 2 ? 'A gradient needs at least two stops' : `Remove stop ${i + 1}`}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-faint hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-faint"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-fg-faint">
              No gradients yet — create one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
