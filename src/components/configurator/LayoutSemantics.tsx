import { useEffect, useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  LAYOUT_ROLE_GROUPS,
  LAYOUT_ROLES,
  LAYOUT_PRIMITIVE_STEPS,
  extractBreakpoints,
  layoutRoleIsDefault,
  layoutRolesInGroup,
  mergeLayoutRoles,
  resolveLayoutRole,
  type LayoutFamily,
} from '../../lib/layoutTokens'

const GRID = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(8rem,0.9fr)_minmax(8rem,1.2fr)_2.5rem]'

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

function RolePreview({
  family,
  value,
  accent,
}: {
  family: LayoutFamily
  value: string
  accent: string
}) {
  if (family === 'radius') {
    return (
      <div
        className="flex-shrink-0"
        style={{
          width: 28, height: 28, borderRadius: value,
          backgroundColor: accent + '22', border: `1.5px solid ${accent}55`,
        }}
      />
    )
  }
  if (family === 'stroke') {
    const px = parseFloat(value) || 0
    return (
      <div className="flex-1 flex items-center">
        <div className="w-full rounded-full" style={{ height: Math.max(px, 1), backgroundColor: accent, opacity: 0.85 }} />
      </div>
    )
  }
  if (family === 'breakpoint') {
    const px = parseFloat(value) || 0
    return (
      <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max((px / 1536) * 100, 2)}%`, backgroundColor: accent + '88' }} />
      </div>
    )
  }
  const px = parseFloat(value) || 0
  const max = family === 'size' ? 64 : 64
  return (
    <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max((px / max) * 100, 2)}%`, backgroundColor: accent + '88' }} />
    </div>
  )
}

export default function LayoutSemantics({
  family,
  tabBar,
  revealRole,
}: {
  family: LayoutFamily
  tabBar?: ReactNode
  revealRole?: { key: string; seq: number } | null
}) {
  const store = useDesignStore()
  const {
    radius, spacing, sizes, stroke, grid,
    radiusRoles, spacingRoles, sizeRoles, strokeRoles, breakpointRoles,
    setRadiusRoles, setSpacingRoles, setSizeRoles, setStrokeRoles, setBreakpointRoles,
    primaryColor, primaryScale,
  } = store
  const accent = primaryScale[9] ?? primaryColor
  const [group, setGroup] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [flashKey, setFlashKey] = useState<string | null>(null)

  const primitives =
    family === 'radius' ? radius
    : family === 'spacing' ? spacing
    : family === 'size' ? sizes
    : family === 'stroke' ? stroke
    : extractBreakpoints(grid)
  const stored =
    family === 'radius' ? radiusRoles
    : family === 'spacing' ? spacingRoles
    : family === 'size' ? sizeRoles
    : family === 'stroke' ? strokeRoles
    : breakpointRoles
  const roles = mergeLayoutRoles(family, stored)
  const setRoles =
    family === 'radius' ? setRadiusRoles
    : family === 'spacing' ? setSpacingRoles
    : family === 'size' ? setSizeRoles
    : family === 'stroke' ? setStrokeRoles
    : setBreakpointRoles

  const groups = LAYOUT_ROLE_GROUPS[family]
  const q = query.trim().toLowerCase()
  const rows = layoutRolesInGroup(family, group).filter((r) =>
    !q || r.key.includes(q) || r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
  )
  const steps = LAYOUT_PRIMITIVE_STEPS[family]

  useEffect(() => {
    if (!revealRole?.key) return
    const spec = LAYOUT_ROLES[family].find((r) => r.key === revealRole.key)
    if (!spec) return
    setQuery('')
    setGroup((g) => (g === 'all' || g === spec.group ? g : spec.group))
    setFlashKey(revealRole.key)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = `layout-role-${family}-${revealRole.key}`
    const t0 = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    }, 40)
    const t1 = window.setTimeout(() => setFlashKey(null), 1400)
    return () => {
      window.clearTimeout(t0)
      window.clearTimeout(t1)
    }
  }, [family, revealRole?.key, revealRole?.seq])

  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <nav aria-label="Role groups" className="w-[198px] flex-shrink-0 h-full border-r border-line py-1.5 px-2 flex flex-col gap-0.5 bg-app overflow-y-auto">
          <button
            type="button"
            onClick={() => setGroup('all')}
            aria-current={group === 'all'}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
              group === 'all' ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
            }`}
          >
            <span className="text-[13px] flex-1 min-w-0 truncate">All</span>
            <span className={`text-[11px] font-mono tabular-nums ${group === 'all' ? 'text-fg-muted' : 'text-fg-faint'}`}>{LAYOUT_ROLES[family].length}</span>
          </button>
          {groups.map((g) => {
            const n = layoutRolesInGroup(family, g.id).length
            const on = group === g.id
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                aria-current={on}
                title={g.hint}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  on ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                }`}
              >
                <span className="text-[13px] flex-1 min-w-0 truncate">{g.label}</span>
                <span className={`text-[11px] font-mono tabular-nums ${on ? 'text-fg-muted' : 'text-fg-faint'}`}>{n}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="foundation-layer-bar flex items-stretch flex-shrink-0 h-[52px] gap-3 pr-3">
            <div className="flex-1 min-w-0">{tabBar}</div>
            <div className="self-center flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line-strong w-48 max-w-[45%] focus-within:border-fg transition-colors flex-shrink-0">
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
                aria-label="Filter roles"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-auto">
            <div className="min-w-[36rem]">
              <div className={`${GRID} items-center px-0 bg-app sticky top-0 z-10 border-b border-line`}>
                <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Role</div>
                <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Aliases</div>
                <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Preview</div>
                <div />
              </div>
              {rows.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No roles match “{query}”.</div>
              ) : rows.map((role, i) => {
                const step = roles[role.key]
                const modified = !layoutRoleIsDefault(family, role.key, step)
                const resolved = resolveLayoutRole(family, roles, primitives, role.key, '')
                return (
                  <div
                    key={role.key}
                    id={`layout-role-${family}-${role.key}`}
                    className={`${rowClass(i)} ${flashKey === role.key ? 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35' : ''}`}
                  >
                    <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
                      <span className="flex items-center gap-2 min-w-0">
                        <code className="font-mono text-[12px] text-fg-muted truncate">{family}-{role.key}</code>
                        {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
                      </span>
                      <span className="text-[11px] text-fg-faint truncate">{role.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2 border-r border-line min-w-0">
                      <select
                        aria-label={`${role.key} primitive`}
                        value={step}
                        onChange={(e) => setRoles({ ...roles, [role.key]: e.target.value })}
                        className="min-w-0 h-7 px-1.5 rounded-md border border-line bg-app text-[11px] font-mono text-fg-muted hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                      >
                        {steps.map((s) => (
                          <option key={s} value={s}>{s} · {primitives[s] ?? '—'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-3 py-2 border-r border-line overflow-hidden gap-2">
                      <RolePreview family={family} value={resolved} accent={accent} />
                      <span className="text-[11px] font-mono text-fg-faint tabular-nums flex-shrink-0">{resolved || '—'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRoles({ ...roles, [role.key]: role.primitive })}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
