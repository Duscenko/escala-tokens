import { useEffect, useState, type ReactNode } from 'react'
import { tableHeaderClass, tableRowClass } from './tableChrome'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
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
import SemanticGroupRail from './SemanticGroupRail'
import VariablesPreviewPane from './VariablesPreviewPane'
import { usePreviewTokens } from '../../lib/previewTokens'
import type { ThemeAppearance } from '../../lib/themeModes'
import { RadiusRolesPreview } from '../preview/atoms/RadiusRolesPreview'
import { LayoutRolesPreview } from '../preview/atoms/LayoutRolesPreview'

const GRID = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(8rem,0.9fr)_minmax(8rem,1.2fr)_2.5rem]'

const rowClass = (index: number) => tableRowClass(index, GRID)

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
  const max = family === 'selector' ? 24 : 64
  return (
    <div className="flex-1 h-2.5 bg-elevated rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max((px / max) * 100, 2)}%`, backgroundColor: accent + '88' }} />
    </div>
  )
}

export default function LayoutSemantics({
  family,
  tabBar,
  query,
  revealRole,
  railCollapsed = false,
  previewTheme = 'light',
  previewAppearance,
}: {
  family: LayoutFamily
  tabBar?: ReactNode
  /** Workspace "Search tokens" — when set (even `''`), the section's own
   *  heading + search bar is dropped; the workspace chrome owns both. */
  query?: string
  revealRole?: { key: string; seq: number } | null
  railCollapsed?: boolean
  previewTheme?: string
  previewAppearance?: ThemeAppearance
}) {
  const { store, foundations, patch } = useThemeFoundations(previewTheme)
  const {
    radius, spacing, sizes, selector, stroke, grid,
    radiusRoles, spacingRoles, sizeRoles, selectorRoles, strokeRoles, breakpointRoles,
  } = foundations
  const { primaryColor, primaryScale } = store
  const accent = primaryScale[9] ?? primaryColor
  const [group, setGroup] = useState<string>('all')
  const controlledQuery = query !== undefined
  const [innerQuery, setInnerQuery] = useState('')
  const setQuery = setInnerQuery
  const activeQuery = controlledQuery ? query : innerQuery
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const previewTokens = usePreviewTokens(previewTheme, previewAppearance)

  // Sizes owns two families (heights + selector glyphs). The primitive table
  // already splits them; semantics used to hand LayoutSemantics only `size`,
  // so selectorRoles exported with no editor. Combined here so one tab edits
  // both maps.
  const viewFamilies: LayoutFamily[] = family === 'size' ? ['size', 'selector'] : [family]

  const primitivesOf = (fam: LayoutFamily) =>
    fam === 'radius' ? radius
    : fam === 'spacing' ? spacing
    : fam === 'size' ? sizes
    : fam === 'selector' ? (selector ?? {})
    : fam === 'stroke' ? stroke
    : extractBreakpoints(grid)
  const rolesOf = (fam: LayoutFamily) =>
    mergeLayoutRoles(
      fam,
      fam === 'radius' ? radiusRoles
      : fam === 'spacing' ? spacingRoles
      : fam === 'size' ? sizeRoles
      : fam === 'selector' ? selectorRoles
      : fam === 'stroke' ? strokeRoles
      : breakpointRoles,
    )
  const setRolesOf = (fam: LayoutFamily, value: Record<string, string>) => {
    if (fam === 'radius') patch({ radiusRoles: value })
    else if (fam === 'spacing') patch({ spacingRoles: value })
    else if (fam === 'size') patch({ sizeRoles: value })
    else if (fam === 'selector') patch({ selectorRoles: value })
    else if (fam === 'stroke') patch({ strokeRoles: value })
    else patch({ breakpointRoles: value })
  }

  const groups = viewFamilies.flatMap((fam) => LAYOUT_ROLE_GROUPS[fam])
  const q = activeQuery.trim().toLowerCase()
  const rows = viewFamilies.flatMap((fam) => {
    if (group !== 'all' && !LAYOUT_ROLE_GROUPS[fam].some((g) => g.id === group)) return []
    return layoutRolesInGroup(fam, group)
      .filter((r) => !q || r.key.includes(q) || r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
      .map((role) => ({ family: fam, role }))
  })

  const locateRole = (raw: string): { family: LayoutFamily; key: string; spec: (typeof LAYOUT_ROLES)[LayoutFamily][number] } | null => {
    const dotted = raw.includes('.') ? raw.split('.') : null
    const hinted = dotted && (viewFamilies as string[]).includes(dotted[0])
      ? { family: dotted[0] as LayoutFamily, key: dotted.slice(1).join('.') }
      : null
    const candidates = hinted ? [hinted.family] : viewFamilies
    const key = hinted?.key ?? raw
    for (const fam of candidates) {
      const spec = LAYOUT_ROLES[fam].find((r) => r.key === key)
      if (spec) return { family: fam, key, spec }
    }
    return null
  }

  const flash = (fam: LayoutFamily, key: string) => {
    setQuery('')
    const spec = LAYOUT_ROLES[fam].find((r) => r.key === key)
    if (spec) setGroup((g) => (g === 'all' || g === spec.group ? g : spec.group))
    setFlashKey(`${fam}.${key}`)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => {
      document.getElementById(`layout-role-${fam}-${key}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    }, 40)
    window.setTimeout(() => setFlashKey(null), 1400)
  }

  useEffect(() => {
    if (!revealRole?.key) return
    const hit = locateRole(revealRole.key)
    if (!hit) return
    flash(hit.family, hit.key)
  }, [family, revealRole?.key, revealRole?.seq])

  const revealFromPreview = (key: string, fromFamily: LayoutFamily = family) => {
    const hit = locateRole(key.includes('.') ? key : `${fromFamily}.${key}`) ?? locateRole(key)
    if (!hit) return
    flash(hit.family, hit.key)
  }

  const sizePreview = family === 'size' && (group === 'all' || group === 'glyph')
  const preview = family === 'radius'
    ? <RadiusRolesPreview tokens={previewTokens} onEditRole={revealFromPreview} />
    : family === 'spacing' || family === 'stroke'
      ? <LayoutRolesPreview family={family} tokens={previewTokens} onEditRole={revealFromPreview} />
    : family === 'size'
      ? (
        <>
          {(group === 'all' || group !== 'glyph') && (
            <LayoutRolesPreview family="size" tokens={previewTokens} onEditRole={(key) => revealFromPreview(key, 'size')} />
          )}
          {sizePreview && (
            <LayoutRolesPreview family="selector" tokens={previewTokens} onEditRole={(key) => revealFromPreview(key, 'selector')} />
          )}
        </>
      )
      : null

  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <SemanticGroupRail
          ariaLabel="Role groups"
          active={group}
          collapsed={railCollapsed}
          onChange={setGroup}
          items={[
            { key: 'all', label: 'All', count: viewFamilies.reduce((n, fam) => n + LAYOUT_ROLES[fam].length, 0), shortLabel: 'ALL' },
            ...groups.map((item) => ({
              key: item.id,
              label: item.label,
              count: viewFamilies.reduce((n, fam) => n + layoutRolesInGroup(fam, item.id).length, 0),
              hint: item.hint,
            })),
          ]}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Dropped in the workspace — `ThemeWorkspaceTabs` already carries the
              tab label and "Search tokens", and the rail names the collection. */}
          {!controlledQuery && (
            <div className="foundation-layer-bar flex items-stretch flex-shrink-0 h-[52px] gap-3 pr-3">
              <div className="foundation-layer-title flex flex-1 min-w-0 items-center px-5">{tabBar}</div>
              <div className="self-center flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line-strong w-48 max-w-[45%] focus-within:border-fg transition-colors flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={innerQuery}
                  onChange={(e) => setInnerQuery(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 min-w-0 bg-transparent text-ui text-fg-muted placeholder:text-fg-faint outline-none"
                  aria-label="Filter roles"
                />
                {innerQuery && (
                  <button onClick={() => setInnerQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-1 min-w-0 min-h-0">
          <div className="flex-1 min-w-0 overflow-auto">
            <div className="min-w-[36rem]">
              <div className={tableHeaderClass(GRID)}>
                <div className="px-4 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Role</div>
                <div className="px-3 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Aliases</div>
                <div className="px-3 py-2.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">Preview</div>
                <div />
              </div>
              {rows.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No roles match “{activeQuery}”.</div>
              ) : rows.map(({ family: rowFamily, role }, i) => {
                const roles = rolesOf(rowFamily)
                const primitives = primitivesOf(rowFamily)
                const steps = LAYOUT_PRIMITIVE_STEPS[rowFamily]
                const step = roles[role.key]
                const modified = !layoutRoleIsDefault(rowFamily, role.key, step)
                const resolved = resolveLayoutRole(rowFamily, roles, primitives, role.key, '')
                return (
                  <div
                    key={`${rowFamily}-${role.key}`}
                    id={`layout-role-${rowFamily}-${role.key}`}
                    className={`${rowClass(i)} ${flashKey === `${rowFamily}.${role.key}` ? 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35' : ''}`}
                  >
                    <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
                      <span className="flex items-center gap-2 min-w-0">
                        <code className="font-mono text-body text-fg-muted truncate">{rowFamily}-{role.key}</code>
                        {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
                      </span>
                      <span className="text-caption text-fg-faint truncate">{role.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2 border-r border-line min-w-0">
                      <select
                        aria-label={`${role.key} primitive`}
                        value={step}
                        onChange={(e) => setRolesOf(rowFamily, { ...roles, [role.key]: e.target.value })}
                        className="min-w-0 h-7 px-1.5 rounded-md border border-line bg-app text-caption font-mono text-fg-muted hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                      >
                        {steps.map((s) => (
                          <option key={s} value={s}>{s} · {primitives[s] ?? '—'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-3 py-2 border-r border-line overflow-hidden gap-2">
                      <RolePreview family={rowFamily} value={resolved} accent={accent} />
                      <span className="text-caption font-mono text-fg-faint tabular-nums flex-shrink-0">{resolved || '—'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRolesOf(rowFamily, { ...roles, [role.key]: role.primitive })}
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
          <VariablesPreviewPane watch={`${family}/${group}/${previewTheme}/${previewAppearance}`} scope={group}>
            {preview}
          </VariablesPreviewPane>
          </div>
        </div>
      </div>
    </div>
  )
}
