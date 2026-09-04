import { useEffect, useState, type ReactNode } from 'react'
import { tableHeaderClass, tableRowClass } from './tableChrome'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
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
import SemanticGroupRail from './SemanticGroupRail'
import VariablesPreviewPane from './VariablesPreviewPane'
import { usePreviewTokens } from '../../lib/previewTokens'
import type { ThemeAppearance } from '../../lib/themeModes'
import { GridPreview } from '../preview/atoms/GridPreview'

const GRID = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_2.5rem]'

const rowClass = (index: number) => tableRowClass(index, GRID)

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
      className="min-w-0 w-full h-7 px-1.5 rounded-md border border-line bg-app text-caption font-mono text-fg-muted hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export default function GridSemantics({
  tabBar,
  query,
  revealRole,
  railCollapsed = false,
  previewTheme = 'light',
  previewAppearance,
}: {
  family?: unknown
  tabBar?: ReactNode
  /** Workspace "Search tokens" — when set, drop the section's own heading bar
   *  (this list has no search of its own; the bar was pure duplicate chrome). */
  query?: string
  revealRole?: { key: string; seq: number } | null
  railCollapsed?: boolean
  previewTheme?: string
  previewAppearance?: ThemeAppearance
} = {}) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const { grid, spacing, breakpointRoles, gridFrame } = foundations
  const setBreakpointRoles = (value: Record<string, string>) => patch({ breakpointRoles: value })
  const setGridFrame = (value: typeof gridFrame) => patch({ gridFrame: value })
  const bps = extractBreakpoints(grid)
  const cuts = mergeLayoutRoles('breakpoint', breakpointRoles)
  const frame = mergeGridFrame(gridFrame)
  const [group, setGroup] = useState<'all' | 'viewport' | 'frame'>('all')
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const previewTokens = usePreviewTokens(previewTheme, previewAppearance)

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
  const revealFromPreview = (key: string) => {
    const isViewport = BREAKPOINT_ROLES.some((role) => role.key === key)
    const isFrame = GRID_FRAME_FIELDS.some((field) => field.key === key)
    if (!isViewport && !isFrame) return
    setGroup(isViewport ? 'viewport' : 'frame')
    setFlashKey(key)
    const id = isViewport ? `layout-role-breakpoint-${key}` : `layout-role-grid-${key}`
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40)
    window.setTimeout(() => setFlashKey(null), 1400)
  }

  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <SemanticGroupRail
          ariaLabel="Grid role groups"
          active={group}
          collapsed={railCollapsed}
          onChange={setGroup}
          items={[
            { id: 'all' as const, label: 'All', n: BREAKPOINT_ROLES.length + GRID_FRAME_FIELDS.length },
            { id: 'viewport' as const, label: 'Viewport', n: BREAKPOINT_ROLES.length },
            { id: 'frame' as const, label: 'Frame', n: GRID_FRAME_FIELDS.length },
          ].map((item) => ({ key: item.id, label: item.label, count: item.n, shortLabel: item.id === 'all' ? 'ALL' : undefined }))}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {query === undefined && (
            <div className="foundation-layer-bar flex items-stretch flex-shrink-0 h-[52px] gap-3 pr-3">
              <div className="foundation-layer-title flex flex-1 min-w-0 items-center px-5">{tabBar}</div>
            </div>
          )}

          <div className="flex flex-1 min-w-0 min-h-0">
          <div className="flex-1 min-w-0 overflow-auto">
            <div className="min-w-[40rem]">
              {showViewport && (
                <>
                  <div className={tableHeaderClass(GRID)}>
                    <div className="px-4 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Viewport</div>
                    <div className="px-3 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Aliases</div>
                    <div className="px-3 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Query</div>
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
                            <code className="font-mono text-body text-fg-muted truncate">breakpoint-{role.key}</code>
                            {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
                          </span>
                          <span className="text-caption text-fg-faint truncate">{role.description}</span>
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
                          <span className="text-caption font-mono text-fg-faint tabular-nums truncate">{query}</span>
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
                  <div className={`${tableHeaderClass(GRID)} ${showViewport ? 'mt-6' : ''}`}>
                    <div className="px-4 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Frame</div>
                    <div className="px-3 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Desktop</div>
                    <div className="px-3 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Mobile</div>
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
                            <code className="font-mono text-body text-fg-muted truncate">grid-{field.key}</code>
                            {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
                          </span>
                          <span className="text-caption text-fg-faint truncate">{field.description}</span>
                        </div>
                        <div className="flex flex-col justify-center gap-0.5 px-3 py-2 border-r border-line min-w-0">
                          <Select
                            label={`desktop ${field.key}`}
                            value={d}
                            onChange={(v) => patchFrame('desktop', field.key, v)}
                            options={optionsFor(field.key)}
                          />
                          <span className="text-mini font-mono text-fg-faint">{live('desktop', field.key)}</span>
                        </div>
                        <div className="flex flex-col justify-center gap-0.5 px-3 py-2 border-r border-line min-w-0">
                          <Select
                            label={`mobile ${field.key}`}
                            value={m}
                            onChange={(v) => patchFrame('mobile', field.key, v)}
                            options={optionsFor(field.key)}
                          />
                          <span className="text-mini font-mono text-fg-faint">{live('mobile', field.key)}</span>
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
          <VariablesPreviewPane watch={`${group}/${previewTheme}/${previewAppearance}`} scope={group}>
            <GridPreview tokens={previewTokens} onEditRole={revealFromPreview} />
          </VariablesPreviewPane>
          </div>
        </div>
      </div>
    </div>
  )
}
