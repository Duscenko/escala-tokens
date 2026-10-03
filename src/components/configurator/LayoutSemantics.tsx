import { useEffect, useState, type ReactNode } from 'react'
import { TABLE_HEAD_CELL, tableHeaderClass, tableRowClass } from './tableChrome'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import {
  LAYOUT_ROLE_GROUPS,
  LAYOUT_ROLES,
  dimensionRoleValue,
  extractBreakpoints,
  layoutRoleIsDefault,
  layoutRolesInGroup,
  mergeLayoutRoles,
  resolveLayoutRole,
  type LayoutFamily,
  type GridViewport,
  RADIUS_RESPONSIVE_STEPS,
  radiusTokensByRoleGroup,
  SPACING_RESPONSIVE_FAMILIES,
  SPACING_RESPONSIVE_KEYS,
} from '../../lib/layoutTokens'
import SemanticGroupRail from './SemanticGroupRail'
import RadiusSemanticsTable, { type RadiusCollection } from './RadiusSemanticsTable'
import SpacingSemanticsTable, { type SpacingCollection } from './SpacingSemanticsTable'
import { useActiveVariableCollection, useSetVariableCollection } from './VariableCollectionRail'
import { parseDimension } from '../../lib/dimensions'
import { useDimensions } from '../../lib/useDimensions'
import DimensionSelect from '../ui/DimensionSelect'
import { railControlsFor } from './LayoutRailControls'
import type { ThemeAppearance } from '../../lib/themeModes'

// The Primitive track holds `<icon> dimension-9999 <chevron>`: ~92px of mono text
// plus 56px of icon and chevron and the cell's own padding, so it needs more than
// the 8rem it had before the control carried an icon.
const GRID = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(11rem,1fr)_minmax(8rem,1.2fr)_2.5rem]'


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
  previewPlatform?: GridViewport
}) {
  const { store, foundations, patch } = useThemeFoundations(previewTheme)
  // A role is a semantic token: it points at a Dimension primitive, picked by name.
  const { scale: dimensionScale } = useDimensions(previewTheme)
  const {
    radius, spacing, sizes, selector, stroke, grid,
    radiusRoles, spacingRoles, sizeRoles, selectorRoles, strokeRoles, breakpointRoles,
  } = foundations
  const { primaryColor, primaryScale } = store
  const accent = primaryScale[9] ?? primaryColor
  const [group, setGroup] = useState<string>('all')
  // Radius renders two collections (layers) from this one component: the
  // roles and the responsive tokens they alias. Hooks run unconditionally.
  const activeCollection = useActiveVariableCollection()
  const setCollection = useSetVariableCollection()
  const radiusCollection: RadiusCollection = family === 'radius' && activeCollection === 'responsive' ? 'responsive' : 'semantics'
  const spacingCollection: SpacingCollection = family === 'spacing' && activeCollection === 'responsive' ? 'responsive' : 'semantics'
  const responsiveView = radiusCollection === 'responsive' || spacingCollection === 'responsive'
  // A group that only exists in the OTHER collection (radius' `unassigned`, a
  // spacing family vs a role group) reads as All, never as an empty table.
  const ownGroups = responsiveView
    ? (family === 'spacing' ? [...SPACING_RESPONSIVE_FAMILIES] : [...LAYOUT_ROLE_GROUPS.radius.map((g) => g.id), 'unassigned'])
    : LAYOUT_ROLE_GROUPS[family].map((g) => g.id)
  const railGroup = group === 'all' || ownGroups.includes(group) ? group : 'all'
  const controlledQuery = query !== undefined
  const [innerQuery, setInnerQuery] = useState('')
  const setQuery = setInnerQuery
  const activeQuery = controlledQuery ? query : innerQuery
  const [flashKey, setFlashKey] = useState<string | null>(null)

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
    if (railGroup !== 'all' && !LAYOUT_ROLE_GROUPS[fam].some((g) => g.id === railGroup)) return []
    return layoutRolesInGroup(fam, railGroup)
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


  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <SemanticGroupRail
          ariaLabel="Role groups"
          active={railGroup}
          collapsed={railCollapsed}
          onChange={setGroup}
          controls={railControlsFor(family, previewTheme)}
          items={spacingCollection === 'responsive'
            ? [
                { key: 'all', label: 'All', count: SPACING_RESPONSIVE_KEYS.length, shortLabel: 'ALL' },
                ...SPACING_RESPONSIVE_FAMILIES.map((family) => ({
                  key: family,
                  label: family[0].toUpperCase() + family.slice(1),
                  count: SPACING_RESPONSIVE_KEYS.filter((k) => k.startsWith(`${family}-`)).length,
                  hint: family === 'component' ? 'Padding and gaps inside a component.' : family === 'section' ? 'Rhythm between blocks of a page.' : 'Room between page regions.',
                })),
              ]
            : radiusCollection === 'responsive'
            ? (() => {
                // Same Boxes · Fields · Selectors words as the roles, counting the
                // tokens each group's roles alias; Unassigned = no role uses it.
                const byGroup = radiusTokensByRoleGroup(rolesOf('radius'))
                return [
                  { key: 'all', label: 'All', count: RADIUS_RESPONSIVE_STEPS.length, shortLabel: 'ALL' },
                  ...groups.map((item) => ({ key: item.id, label: item.label, count: byGroup[item.id]?.length ?? 0, hint: `Tokens the ${item.label.toLowerCase()} roles use.` })),
                  { key: 'unassigned', label: 'Unassigned', count: byGroup.unassigned.length, hint: 'No role uses these; a component can bind one directly.' },
                ]
              })()
            : [
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
            {family === 'spacing' ? (
              <SpacingSemanticsTable
                collection={spacingCollection}
                group={railGroup}
                rows={rows.map((r) => r.role)}
                roles={rolesOf('spacing')}
                spacing={spacing}
                onRoles={(next) => setRolesOf('spacing', next)}
                onRevealRole={(key) => {
                  setCollection('semantics')
                  flash('spacing', key)
                }}
                accent={accent}
                flashKey={flashKey}
                query={activeQuery}
              />
            ) : family === 'radius' ? (
              <RadiusSemanticsTable
                collection={radiusCollection}
                group={railGroup}
                rows={rows.map((r) => r.role)}
                roles={rolesOf('radius')}
                radius={radius}
                onRoles={(next) => setRolesOf('radius', next)}
                viewports={foundations.radiusRoleViewports}
                onViewports={(next) => patch({ radiusRoleViewports: next })}
                onRevealRole={(key) => {
                  setCollection('semantics')
                  flash('radius', key)
                }}
                dimensionScale={dimensionScale}
                accent={accent}
                flashKey={flashKey}
                query={activeQuery}
              />
            ) : (
            <div className="min-w-[36rem]">
                <div className={tableHeaderClass(GRID)}>
                  <span className={`${TABLE_HEAD_CELL} pl-4`}>Role</span>
                  <span className={`${TABLE_HEAD_CELL} px-3`}>Primitive</span>
                  <span className={`${TABLE_HEAD_CELL} px-3`}>Preview</span>
                  <span aria-hidden />
                </div>
                {rows.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-fg-faint">No roles match “{activeQuery}”.</div>
                ) : rows.map(({ family: rowFamily, role }, i) => {
                  const roles = rolesOf(rowFamily)
                  const primitives = primitivesOf(rowFamily)
                  const step = roles[role.key]
                  const modified = !layoutRoleIsDefault(rowFamily, role.key, step, primitives)
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
                        <DimensionSelect
                          ariaLabel={`${role.key} primitive`}
                          value={resolved}
                          scale={dimensionScale}
                          onChange={(px) => {
                            const n = parseDimension(px)
                            if (n !== null) setRolesOf(rowFamily, { ...roles, [role.key]: dimensionRoleValue(n) })
                          }}
                        />
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
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
