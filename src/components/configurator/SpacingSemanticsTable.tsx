// Spacing roles in the Variables editor. The rail lists one collection.
//
//   spacing-gap-section follows section-md (24 / 16 / 12 on a 4px base)
//
//   Roles are grouped Gap · Inset. A role on the curve tightens on smaller
//   screens; a fixed step holds one value. The curve is not a second collection.
//
// Both show ONE viewport — the rail's Platform switch. Docs → Spacing compares
// all three.

import { TABLE_HEAD_CELL, tableHeaderClass, tableRowClass } from './tableChrome'
import VariableSelect from '../ui/VariableSelect'
import { usePreviewPlatform } from './PlatformRail'
import {
  SPACING_RESPONSIVE,
  SPACING_RESPONSIVE_FAMILIES,
  SPACING_RESPONSIVE_KEYS,
  SPACING_STEPS,
  dimensionRoleValue,
  isSpacingResponsiveRef,
  layoutRoleIsDefault,
  roleDimensionPx,
  rolesUsingSpacingToken,
  spacingRefStep,
  type GridViewport,
  type LayoutRole,
} from '../../lib/layoutTokens'

const ROLE_GRID = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(11rem,1fr)_minmax(8rem,1fr)_2.5rem]'
const TOKEN_GRID = 'grid grid-cols-[minmax(10rem,1.1fr)_minmax(9rem,1fr)_minmax(8rem,1fr)_2.5rem]'
const VP_LABEL: Record<GridViewport, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }
const FAMILY_LABEL: Record<string, string> = { component: 'Component', section: 'Section', layout: 'Layout' }

export type SpacingCollection = 'semantics' | 'responsive'

/** The negative Dimension primitives an Overlap role may pin — the same ladder
 *  Dimensions lists (`-32 … -1`), plus 0 for "no overlap". */
const OVERLAP_CHOICES = [0, -1, -2, -4, -6, -8, -12, -16, -24, -32] as const

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
    </svg>
  )
}

/** `0_5` → `0.5`: the step as it reads, not as it is keyed. */
const stepLabel = (step: string) => step.replace('_', '.')

/** The value at the selected viewport: a gap drawn at its px, `space-N · px`,
 *  and — when it differs from Desktop — the Desktop value it stepped down from. */
function Cell({ step, px, accent, desktopPx }: { step: string; px: number | null; accent: string; desktopPx?: number | null }) {
  const pinned = roleDimensionPx(step, true) !== null
  // A negative length is an OVERLAP, so it is drawn as what it does: three
  // discs, each tucked under the last by `px`. A bar can't be negative.
  if (px !== null && px < 0) {
    const d = 16
    return (
      <div className="flex items-center gap-2 px-3 py-2 min-w-0 border-r border-line">
        <span aria-hidden className="flex items-center h-5 w-12 min-w-1 flex-shrink overflow-hidden">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-4 w-4 flex-shrink-0 rounded-full"
              style={{ marginLeft: i === 0 ? 0 : px, backgroundColor: accent + '66', border: `1px solid ${accent}` }}
            />
          ))}
        </span>
        <span className="flex-shrink-0 text-caption font-mono text-fg">overlap</span>
        <span className="flex-shrink-0 text-caption font-mono text-fg-faint tabular-nums">{px}px</span>
        <span className="sr-only">{`${Math.min(Math.abs(px), d)} of ${d}px hidden`}</span>
      </div>
    )
  }
  const w = Math.max(px ?? 0, 0)
  return (
    <div className="flex items-center gap-2 px-3 py-2 min-w-0 border-r border-line">
      {/* True px, cropped only past the spacing ladder's top step (128). The
          old 48px cap made space-12 and space-32 the same bar. */}
      <span aria-hidden className="flex items-center h-5 max-w-32 min-w-1 flex-shrink overflow-hidden">
        <span className="h-4 rounded-[2px]" style={{ width: Math.max(w, 1.5), backgroundColor: accent + '33', borderLeft: `1px solid ${accent}`, borderRight: `1px solid ${accent}` }} />
      </span>
      <span className="flex-shrink-0 text-caption font-mono text-fg">{pinned ? 'pinned' : `space-${stepLabel(step)}`}</span>
      <span className="flex-shrink-0 text-caption font-mono text-fg-faint tabular-nums">{px === null ? '—' : `${px}px`}</span>
      {desktopPx != null && px !== null && desktopPx !== px && (
        <span className="ml-auto flex-shrink-0 text-caption text-fg-faint" title={`${desktopPx}px on Desktop`}>↓ {desktopPx}</span>
      )}
    </div>
  )
}

export default function SpacingSemanticsTable({
  collection,
  group,
  rows,
  roles,
  spacing,
  onRoles,
  onRevealRole,
  accent,
  flashKey,
  query,
}: {
  collection: SpacingCollection
  /** Rail group: `all`, a role group (gap · inset) or a token family. */
  group: string
  /** The role rows already filtered by group + query (semantics). */
  rows: LayoutRole[]
  roles: Record<string, string>
  spacing: Record<string, string>
  onRoles: (next: Record<string, string>) => void
  onRevealRole: (key: string) => void
  accent: string
  flashKey: string | null
  query: string
}) {
  const platformCtx = usePreviewPlatform()
  const platform: GridViewport = platformCtx?.previewPlatform ?? 'desktop'
  const pxOf = (step: string): number | null => {
    const pinned = roleDimensionPx(step, true)
    if (pinned !== null) return pinned
    const n = parseFloat(spacing[step] ?? '')
    return Number.isFinite(n) ? n : null
  }

  if (collection === 'responsive') {
    const q = query.trim().toLowerCase()
    const keys = SPACING_RESPONSIVE_KEYS
      .filter((key) => group === 'all' || key.startsWith(`${group}-`))
      .filter((key) => !q || `spacing-${key}`.includes(q))
    return (
      <div className="min-w-[34rem]">
        <div className={tableHeaderClass(TOKEN_GRID)}>
          <span className={`${TABLE_HEAD_CELL} pl-4`}>Token</span>
          <span className={`${TABLE_HEAD_CELL} px-3`}>Used by</span>
          <span className={`${TABLE_HEAD_CELL} px-3 text-fg`}>{VP_LABEL[platform]}</span>
          <span aria-hidden />
        </div>
        {keys.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{query}”.</div>
        ) : keys.map((key, i) => {
          const row = SPACING_RESPONSIVE[key]
          const users = rolesUsingSpacingToken(roles, key)
          return (
            <div key={key} className={tableRowClass(i, TOKEN_GRID)}>
              <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
                <code className="font-mono text-body text-fg-muted truncate">spacing-{key}</code>
                <span className="text-caption text-fg-faint truncate tabular-nums">
                  {(['desktop', 'tablet', 'mobile'] as const).map((vp) => pxOf(row[vp]) ?? '—').join(' · ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-r border-line min-w-0">
                {users.length === 0 ? (
                  <span className="text-caption text-fg-faint" title="No role aliases this token. A component that needs this exact space can bind it directly.">
                    Available
                  </span>
                ) : users.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onRevealRole(role)}
                    title={`Open spacing-${role} in Spacing semantics`}
                    className="px-1.5 py-0.5 rounded-md bg-elevated text-caption font-mono text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                  >
                    {role}
                  </button>
                ))}
              </div>
              <Cell step={row[platform]} px={pxOf(row[platform])} accent={accent} desktopPx={platform === 'desktop' ? null : pxOf(row.desktop)} />
              <span aria-hidden />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-w-[36rem]">
      <div className={tableHeaderClass(ROLE_GRID)}>
        <span className={`${TABLE_HEAD_CELL} pl-4`}>Role</span>
        <span className={`${TABLE_HEAD_CELL} px-3`}>Token</span>
        <span className={`${TABLE_HEAD_CELL} px-3 text-fg`}>{VP_LABEL[platform]}</span>
        <span aria-hidden />
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-fg-faint">No roles match “{query}”.</div>
      ) : rows.map((role, i) => {
        const value = roles[role.key]
        const responsive = isSpacingResponsiveRef(value)
        const step = spacingRefStep(value, platform)
        const modified = !layoutRoleIsDefault('spacing', role.key, value, spacing)
        const pinned = roleDimensionPx(value, true) !== null
        const overlap = role.group === 'overlap'
        return (
          <div
            key={role.key}
            id={`layout-role-spacing-${role.key}`}
            className={`${tableRowClass(i, ROLE_GRID)} ${flashKey === `spacing.${role.key}` ? 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35' : ''}`}
          >
            <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
              <span className="flex items-center gap-2 min-w-0">
                <code className="font-mono text-body text-fg-muted truncate">spacing-{role.key}</code>
                {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
              </span>
              <span className="text-caption text-fg-faint truncate" title={role.description}>
                {responsive ? 'Steps down on smaller screens' : 'Fixed — same on every viewport'}
              </span>
            </div>
            <div className="flex items-center px-3 py-2 border-r border-line min-w-0">
              {/* A role references a TOKEN — the same choice on every platform. */}
              {overlap ? (
                // Overlap is negative space: the only choices are the negative
                // Dimension primitives, pinned — a spacing step is never negative.
                <VariableSelect ariaLabel={`${role.key} overlap`} value={value} onChange={(next) => onRoles({ ...roles, [role.key]: next })}>
                  {OVERLAP_CHOICES.map((n) => (
                    <option key={n} value={dimensionRoleValue(n)}>{`dimension-${n}  ·  ${n}px`}</option>
                  ))}
                  {!OVERLAP_CHOICES.some((n) => dimensionRoleValue(n) === value) && pinned && (
                    <option value={value}>{`pinned · ${roleDimensionPx(value, true)}px`}</option>
                  )}
                </VariableSelect>
              ) : (
              <VariableSelect ariaLabel={`${role.key} token`} value={value} onChange={(next) => onRoles({ ...roles, [role.key]: next })}>
                {SPACING_RESPONSIVE_FAMILIES.map((family) => (
                  <optgroup key={family} label={`Responsive · ${FAMILY_LABEL[family]}`}>
                    {SPACING_RESPONSIVE_KEYS.filter((k) => k.startsWith(`${family}-`)).map((k) => (
                      <option key={k} value={k}>{`${k}  ·  ${pxOf(SPACING_RESPONSIVE[k].desktop) ?? '—'} / ${pxOf(SPACING_RESPONSIVE[k].tablet) ?? '—'} / ${pxOf(SPACING_RESPONSIVE[k].mobile) ?? '—'}`}</option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Fixed">
                  {SPACING_STEPS.map((s) => (
                    <option key={s} value={s}>{`space-${stepLabel(s)}  ·  ${pxOf(s) ?? '—'}px`}</option>
                  ))}
                  {pinned && <option value={value}>{`pinned · ${roleDimensionPx(value, true)}px`}</option>}
                </optgroup>
              </VariableSelect>
              )}
            </div>
            <Cell step={step} px={pxOf(step)} accent={accent} desktopPx={platform === 'desktop' || !responsive ? null : pxOf(spacingRefStep(value))} />
            <button
              type="button"
              onClick={() => onRoles({ ...roles, [role.key]: role.primitive })}
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
  )
}
