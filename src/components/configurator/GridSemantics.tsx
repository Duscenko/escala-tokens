import { useEffect, useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  BREAKPOINT_ROLES,
  BREAKPOINT_STEPS,
  GRID_COLUMN_STEPS,
  GRID_CONTAINER_STEPS,
  GRID_FRAME_FIELDS,
  GRID_FRAME_STANDARD,
  SPACING_STEPS,
  breakpointMobileMax,
  extractBreakpoints,
  layoutRoleIsDefault,
  mergeGridFrame,
  mergeLayoutRoles,
  resolveGridFrame,
  type GridFrameAlias,
  type GridViewport,
} from '../../lib/layoutTokens'

const GRID = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_2.5rem]'

function rowClass(index: number) {
  const isEven = index % 2 === 1
  return `${GRID} items-stretch border-t border-line/40 group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04] ${
    isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''
  }`
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
    </svg>
  )
}

function Select({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 w-full h-7 px-1.5 rounded-md border border-line bg-app text-[11px] font-mono text-fg-muted hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export default function GridSemantics({
  tabBar,
  revealRole,
}: {
  family?: unknown
  tabBar?: ReactNode
  revealRole?: { key: string; seq: number } | null
} = {}) {
  const {
    grid, spacing, breakpointRoles, setBreakpointRoles, gridFrame, setGridFrame,
  } = useDesignStore()
  const bps = extractBreakpoints(grid)
  const cuts = mergeLayoutRoles('breakpoint', breakpointRoles)
  const frame = mergeGridFrame(gridFrame)
  const [group, setGroup] = useState<'all' | 'viewport' | 'frame'>('all')
  const [flashKey, setFlashKey] = useState<string | null>(null)

  const mobileMax = breakpointMobileMax(cuts, bps)
  const desktopMin = bps[cuts.desktop] ?? '768px'

  useEffect(() => {
    if (!revealRole?.key) return
    const viewport = BREAKPOINT_ROLES.some((r) => r.key === revealRole.key)
    const frameHit = GRID_FRAME_FIELDS.some((f) => f.key === revealRole.key)
    if (!viewport && !frameHit) return
    setGroup((g) => {
      if (g === 'all') return g
      if (viewport) return g === 'viewport' ? g : 'viewport'
      return g === 'frame' ? g : 'frame'
    })
    setFlashKey(revealRole.key)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = viewport
      ? `layout-role-breakpoint-${revealRole.key}`
      : `layout-role-grid-${revealRole.key}`
    const t0 = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    }, 40)
    const t1 = window.setTimeout(() => setFlashKey(null), 1400)
    return () => {
      window.clearTimeout(t0)
      window.clearTimeout(t1)
    }
  }, [revealRole?.key, revealRole?.seq])

  function patchCut(key: string, step: string) {
    setBreakpointRoles({ ...cuts, [key]: step })
  }

  function patchFrame(viewport: GridViewport, key: keyof GridFrameAlias, value: string) {
    setGridFrame({
      ...frame,
      [viewport]: { ...frame[viewport], [key]: value },
    })
  }

  const stepOpts = BREAKPOINT_STEPS.map((s) => ({ value: s, label: `${s} · ${bps[s] ?? '—'}` }))
  const colOpts = GRID_COLUMN_STEPS.map((s) => ({ value: s, label: s }))
  const spaceOpts = SPACING_STEPS.map((s) => ({ value: s, label: `${s} · ${spacing[s] ?? '—'}` }))
  const containerOpts = GRID_CONTAINER_STEPS.map((s) => ({
    value: s,
    label: s === 'none' ? 'none' : `${s} · ${bps[s] ?? '—'}`,
  }))

  const optionsFor = (key: keyof GridFrameAlias) =>
    key === 'columns' ? colOpts : key === 'container' ? containerOpts : spaceOpts

  const live = (viewport: GridViewport, key: keyof GridFrameAlias) => {
    const resolved = resolveGridFrame(viewport, frame, spacing, bps)
    if (key === 'columns') return String(resolved.columns)
    return resolved[key]
  }

  const showViewport = group === 'all' || group === 'viewport'
  const showFrame = group === 'all' || group === 'frame'

  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <nav aria-label="Grid role groups" className="w-[198px] flex-shrink-0 h-full border-r border-line py-1.5 px-2 flex flex-col gap-0.5 bg-app overflow-y-auto">
          {([
            { id: 'all' as const, label: 'All', n: BREAKPOINT_ROLES.length + GRID_FRAME_FIELDS.length },
            { id: 'viewport' as const, label: 'Viewport', n: BREAKPOINT_ROLES.length },
            { id: 'frame' as const, label: 'Frame', n: GRID_FRAME_FIELDS.length },
          ]).map((g) => {
            const on = group === g.id
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                aria-current={on}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  on ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                }`}
              >
                <span className="text-[13px] flex-1 min-w-0 truncate">{g.label}</span>
                <span className={`text-[11px] font-mono tabular-nums ${on ? 'text-fg-muted' : 'text-fg-faint'}`}>{g.n}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="foundation-layer-bar flex items-stretch flex-shrink-0 h-[52px] gap-3 pr-3">
            <div className="flex-1 min-w-0">{tabBar}</div>
          </div>

          <div className="flex-1 min-w-0 overflow-auto">
            <div className="min-w-[40rem]">
              {showViewport && (
                <>
                  <div className={`${GRID} items-center px-0 bg-app sticky top-0 z-10 border-b border-line`}>
                    <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Viewport</div>
                    <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Aliases</div>
                    <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Query</div>
                    <div />
                  </div>
                  {BREAKPOINT_ROLES.map((role, i) => {
                    const step = cuts[role.key]
                    const modified = !layoutRoleIsDefault('breakpoint', role.key, step)
                    const query = role.key === 'desktop'
                      ? `min-width: ${desktopMin}`
                      : `max-width: ${mobileMax}`
                    return (
                      <div
                        key={role.key}
                        id={`layout-role-breakpoint-${role.key}`}
                        className={`${rowClass(i)} ${flashKey === role.key ? 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35' : ''}`}
                      >
                        <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
                          <span className="flex items-center gap-2 min-w-0">
                            <code className="font-mono text-[12px] text-fg-muted truncate">breakpoint-{role.key}</code>
                            {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
                          </span>
                          <span className="text-[11px] text-fg-faint truncate">{role.description}</span>
                        </div>
                        <div className="flex items-center px-3 py-2 border-r border-line min-w-0">
                          <Select
                            label={`${role.key} primitive`}
                            value={step}
                            onChange={(v) => patchCut(role.key, v)}
                            options={stepOpts}
                          />
                        </div>
                        <div className="flex items-center px-3 py-2 border-r border-line overflow-hidden">
                          <span className="text-[11px] font-mono text-fg-faint tabular-nums truncate">{query}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => patchCut(role.key, role.primitive)}
                          disabled={!modified}
                          title="Reset to standard"
                          aria-label={`Reset ${role.label}`}
                          className="flex items-center justify-center w-full h-full py-3 text-fg-faint hover:text-fg disabled:opacity-25 disabled:hover:text-fg-faint transition-colors"
                        >
                          <ResetIcon />
                        </button>
                      </div>
                    )
                  })}
                </>
              )}

              {showFrame && (
                <>
                  <div className={`${GRID} items-center px-0 bg-app sticky top-0 z-10 border-b border-line ${showViewport ? 'mt-4' : ''}`}>
                    <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Frame</div>
                    <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Desktop</div>
                    <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Mobile</div>
                    <div />
                  </div>
                  {GRID_FRAME_FIELDS.map((field, i) => {
                    const d = frame.desktop[field.key]
                    const m = frame.mobile[field.key]
                    const modified = d !== GRID_FRAME_STANDARD.desktop[field.key] || m !== GRID_FRAME_STANDARD.mobile[field.key]
                    return (
                      <div
                        key={field.key}
                        id={`layout-role-grid-${field.key}`}
                        className={`${rowClass(i)} ${flashKey === field.key ? 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35' : ''}`}
                      >
                        <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
                          <span className="flex items-center gap-2 min-w-0">
                            <code className="font-mono text-[12px] text-fg-muted truncate">grid-{field.key}</code>
                            {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
                          </span>
                          <span className="text-[11px] text-fg-faint truncate">{field.description}</span>
                        </div>
                        <div className="flex flex-col justify-center gap-0.5 px-3 py-2 border-r border-line min-w-0">
                          <Select
                            label={`desktop ${field.key}`}
                            value={d}
                            onChange={(v) => patchFrame('desktop', field.key, v)}
                            options={optionsFor(field.key)}
                          />
                          <span className="text-[10px] font-mono text-fg-faint">{live('desktop', field.key)}</span>
                        </div>
                        <div className="flex flex-col justify-center gap-0.5 px-3 py-2 border-r border-line min-w-0">
                          <Select
                            label={`mobile ${field.key}`}
                            value={m}
                            onChange={(v) => patchFrame('mobile', field.key, v)}
                            options={optionsFor(field.key)}
                          />
                          <span className="text-[10px] font-mono text-fg-faint">{live('mobile', field.key)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGridFrame({
                            ...frame,
                            desktop: { ...frame.desktop, [field.key]: GRID_FRAME_STANDARD.desktop[field.key] },
                            mobile: { ...frame.mobile, [field.key]: GRID_FRAME_STANDARD.mobile[field.key] },
                          })}
                          disabled={!modified}
                          title="Reset to standard"
                          aria-label={`Reset ${field.label}`}
                          className="flex items-center justify-center w-full h-full py-3 text-fg-faint hover:text-fg disabled:opacity-25 disabled:hover:text-fg-faint transition-colors"
                        >
                          <ResetIcon />
                        </button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
