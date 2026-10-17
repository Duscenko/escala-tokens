// Radius roles in the Variables editor. The rail lists one collection.
//
//   radius-container  →  radius-2xl (16px), and that step rounds down on Tablet / Mobile
//
//   Five roles, grouped Boxes · Fields · Selectors. Tablet and Mobile follow
//   the curve unless that viewport has its own value. The curve is not a
//   second collection.
//
// Both show ONE viewport — the rail's Platform switch, like Grid and Type.
// Every viewport edits with the same picker: the responsive TOKENS
// (radius-component-none … 5xl, full), each labelled with the px it reads on
// the viewport shown — the same ladder Theme preview's Radius panel offers.
// Desktop sets the role to a token, so it keeps stepping down; Tablet / Mobile
// open on the token they FOLLOW, and picking another stores that token's step
// for that viewport only. Picking the followed token again (or Reset) clears
// it. A role pinned to a raw px (older systems) shows as Pinned until a token
// is picked. Docs → Radius compares all three.

import { TABLE_HEAD_CELL, tableHeaderClass, tableRowClass } from './tableChrome'
import DimensionSelect from '../ui/DimensionSelect'
import VariableSelect from '../ui/VariableSelect'
import { CopyButton } from './docs/blocks'
import { CornerWindow, RADIUS_TOKEN_USE, valuesOf } from './docs/RadiusResponsiveDoc'
import { usePreviewPlatform } from './PlatformRail'
import {
  RADIUS_RESPONSIVE,
  RADIUS_RESPONSIVE_STEPS,
  RADIUS_STEPS,
  layoutRoleIsDefault,
  radiusTokensByRoleGroup,
  resolveLayoutRole,
  roleDimensionPx,
  rolesUsingRadiusToken,
  radiusRoleAt,
  setRadiusRoleViewport,
  type GridViewport,
  type RadiusResponsiveStep,
  type RadiusRoleViewports,
  type LayoutRole,
} from '../../lib/layoutTokens'

const ROLE_GRID = 'grid grid-cols-[minmax(9rem,1.1fr)_minmax(11rem,1fr)_minmax(8rem,1fr)_2.5rem]'
const VP_LABEL: Record<GridViewport, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }

export type RadiusCollection = 'semantics' | 'responsive'

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
    </svg>
  )
}

/** How many rungs `to` sits below `from` on the ramp (0 when equal). */
function rungsDown(from: string, to: string): number {
  const steps = RADIUS_STEPS as readonly string[]
  const a = steps.indexOf(from)
  const b = steps.indexOf(to)
  return a < 0 || b < 0 ? 0 : Math.max(0, a - b)
}

/** Top-left corner at the real radius. A 22px box turned every radius above
 *  ~11px into the same circle; the curve is drawn on a larger tile and cropped
 *  so 4px and 32px stay different. `full` (9999) is a pill, not a corner. */
function RadiusMark({ px, accent }: { px: string; accent: string }) {
  const n = parseFloat(px)
  const pill = !Number.isFinite(n) || n >= 999
  if (pill) {
    return (
      <span
        aria-hidden
        className="h-5 w-8 flex-shrink-0 rounded-full"
        style={{ backgroundColor: accent + '22', boxShadow: `inset 0 0 0 1.5px ${accent}55` }}
      />
    )
  }
  return (
    <span aria-hidden className="relative h-8 w-8 flex-shrink-0 overflow-hidden">
      <span
        className="absolute left-0 top-0 block h-[72px] w-[72px]"
        style={{
          borderTopLeftRadius: n,
          backgroundColor: accent + '22',
          boxShadow: `inset 1.5px 1.5px 0 ${accent}55`,
        }}
      />
    </span>
  )
}

/** The value at the selected viewport: corner drawn at its px, `step · px`,
 *  and — off Desktop — how far it stepped down and from what. */
function Cell({ step, px, accent, from }: { step: string; px: string; accent: string; from?: string }) {
  const pinned = roleDimensionPx(step) !== null
  const down = from ? rungsDown(from, step) : 0
  return (
    <div className="flex items-center gap-2 px-3 py-2 min-w-0 border-r border-line">
      <RadiusMark px={px} accent={accent} />
      <span className="flex-shrink-0 text-caption font-mono text-fg">{pinned ? 'pinned' : step}</span>
      <span className="flex-shrink-0 text-caption font-mono text-fg-faint tabular-nums">{px || '—'}</span>
      {down > 0 && (
        <span className="ml-auto flex-shrink-0 text-caption text-fg-faint" title={`${from} on Desktop, ${down} step${down > 1 ? 's' : ''} down here`}>
          ↓ {down}
        </span>
      )}
    </div>
  )
}

export default function RadiusSemanticsTable({
  collection,
  group,
  rows,
  roles,
  radius,
  onRoles,
  viewports,
  onViewports,
  onRevealRole,
  accent,
  flashKey,
  query,
}: {
  collection: RadiusCollection
  /** Rail group: `all`, a role group id, or `unassigned` (responsive only). */
  group: string
  /** The role rows already filtered by group + query (semantics). */
  rows: LayoutRole[]
  roles: Record<string, string>
  radius: Record<string, string>
  onRoles: (next: Record<string, string>) => void
  /** Hand-set Tablet / Mobile values, and their setter. */
  viewports: RadiusRoleViewports | undefined
  onViewports: (next: RadiusRoleViewports) => void
  /** Jump to a role in the semantics collection. */
  onRevealRole: (key: string) => void
  dimensionScale: Parameters<typeof DimensionSelect>[0]['scale']
  accent: string
  flashKey: string | null
  query: string
}) {
  const platformCtx = usePreviewPlatform()
  const platform: GridViewport = platformCtx?.previewPlatform ?? 'desktop'
  const onDesktop = platform === 'desktop'
  const pxOf = (step: string) => resolveLayoutRole('radius', { probe: step }, radius, 'probe', '')

  if (collection === 'responsive') {
    // Every responsive token, the way Docs → Radius shows it: its corner at
    // Mobile · Tablet · Desktop (one window when it is the same everywhere),
    // what it is for, and the roles that alias it.
    const q = query.trim().toLowerCase()
    const byGroup = radiusTokensByRoleGroup(roles)
    const inGroup = group === 'all' ? RADIUS_RESPONSIVE_STEPS : (byGroup[group] ?? [])
    const tokens = inGroup.filter((step) => !q || `radius-component-${step}`.includes(q))
    return (
      <div className="min-w-[40rem] px-5 pb-6">
        <div className="flex items-center justify-between gap-3 border-b border-line py-3">
          <span className="font-mono text-body text-fg">component</span>
          <span className="font-mono text-caption text-fg-faint">mobile · tablet · desktop, corners shown at 2×</span>
        </div>
        {tokens.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-fg-faint">
            {q ? `No tokens match “${query}”.` : 'No responsive token in this group.'}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {tokens.map((step) => {
              const values = valuesOf(radius, step)
              const fixed = values.mobile === values.desktop && values.tablet === values.desktop
              const shown = fixed ? [values.desktop] : [values.mobile, values.tablet, values.desktop]
              const name = `radius-component-${step}`
              const users = rolesUsingRadiusToken(roles, step)
              return (
                <div key={step} className="grid grid-cols-[minmax(10rem,1fr)_auto_minmax(8rem,1fr)] items-center gap-6 py-5">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex items-center gap-2 font-mono text-body text-fg">
                      component-{step}
                      <CopyButton text={name} label="" title={`Copy ${name}`} />
                    </span>
                    {users.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {users.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onRevealRole(key)}
                            title={`Open radius-${key} in Radius semantics`}
                            className="rounded-md bg-elevated px-1.5 py-0.5 font-mono text-caption text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                          >
                            {key}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-[repeat(3,104px)] gap-6" title={fixed ? 'Same at every breakpoint' : 'Mobile · Tablet · Desktop'}>
                    {shown.map((px, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <CornerWindow px={px} />
                        <span className="font-mono text-caption text-fg-muted tabular-nums">{px}px</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-right font-mono text-caption text-fg-faint">{RADIUS_TOKEN_USE[step]}</span>
                </div>
              )
            })}
          </div>
        )}
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
        const step = roles[role.key]
        const at = radiusRoleAt(roles, viewports, role.key, platform)
        const vp = platform === 'desktop' ? null : platform
        const overridden = vp ? viewports?.[vp]?.[role.key] !== undefined : false
        const modified = vp ? overridden : !layoutRoleIsDefault('radius', role.key, step, radius)
        const follows = (RADIUS_RESPONSIVE_STEPS as readonly string[]).includes(step)
        const note = vp
          ? (overridden ? `Set for ${VP_LABEL[platform]} — Desktop is ${step}` : at === step ? 'Follows Desktop' : `Follows Desktop: ${step} ↓ ${rungsDown(step, at)}`)
          : (follows ? 'Steps down on smaller screens' : 'Pinned — same on every viewport unless set per viewport')
        return (
          <div
            key={role.key}
            id={`layout-role-radius-${role.key}`}
            className={`${tableRowClass(i, ROLE_GRID)} ${flashKey === `radius.${role.key}` ? 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35' : ''}`}
          >
            <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
              <span className="flex items-center gap-2 min-w-0">
                <code className="font-mono text-body text-fg-muted truncate">radius-{role.key}</code>
                {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title={vp ? `Set for ${VP_LABEL[platform]}` : 'Modified'} />}
              </span>
              <span className="text-caption text-fg-faint truncate" title={role.description}>{note}</span>
            </div>
            <div className="flex items-center px-3 py-2 border-r border-line min-w-0">
              <RadiusTokenSelect
                ariaLabel={`${role.key} token (${VP_LABEL[platform]})`}
                platform={platform}
                desktopStep={step}
                at={at}
                pxOf={pxOf}
                onPick={(token) => {
                  if (vp) {
                    // The followed token clears the override; any other stores
                    // that token's step on this viewport.
                    const value = token === step ? null : RADIUS_RESPONSIVE[token][vp]
                    onViewports(setRadiusRoleViewport(viewports, roles, role.key, vp, value))
                  } else {
                    onRoles({ ...roles, [role.key]: token })
                  }
                }}
              />
            </div>
            <Cell step={at} px={pxOf(at)} accent={accent} from={vp && !overridden ? step : undefined} />
            <button
              type="button"
              onClick={() => vp
                ? onViewports(setRadiusRoleViewport(viewports, roles, role.key, vp, null))
                : onRoles({ ...roles, [role.key]: role.primitive })}
              disabled={!modified}
              title={vp ? `Follow Desktop on ${VP_LABEL[platform]}` : 'Reset to standard'}
              aria-label={vp ? `Reset ${role.label} on ${VP_LABEL[platform]}` : `Reset ${role.label}`}
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

const PINNED = '__pinned'

/** The responsive token a role reads on `platform`: on Desktop the role's own
 *  token; elsewhere the token it follows, unless an override lands on a step
 *  no token reads there (or the role is pinned) — then `null`, shown Pinned. */
function tokenAt(platform: GridViewport, desktopStep: string, at: string): RadiusResponsiveStep | null {
  const steps = RADIUS_RESPONSIVE_STEPS as readonly string[]
  if (steps.includes(desktopStep) && RADIUS_RESPONSIVE[desktopStep as RadiusResponsiveStep][platform] === at) {
    return desktopStep as RadiusResponsiveStep
  }
  return RADIUS_RESPONSIVE_STEPS.find((token) => RADIUS_RESPONSIVE[token][platform] === at) ?? null
}

function RadiusTokenSelect({
  ariaLabel, platform, desktopStep, at, pxOf, onPick,
}: {
  ariaLabel: string
  platform: GridViewport
  desktopStep: string
  at: string
  pxOf: (step: string) => string
  onPick: (token: RadiusResponsiveStep) => void
}) {
  const current = tokenAt(platform, desktopStep, at)
  return (
    <VariableSelect
      ariaLabel={ariaLabel}
      value={current ?? PINNED}
      onChange={(value) => { if (value !== PINNED) onPick(value as RadiusResponsiveStep) }}
    >
      {current === null && (
        <option value={PINNED} disabled>Pinned · {pxOf(at)}</option>
      )}
      {RADIUS_RESPONSIVE_STEPS.map((token) => (
        <option key={token} value={token}>
          component-{token} · {pxOf(RADIUS_RESPONSIVE[token][platform])}
        </option>
      ))}
    </VariableSelect>
  )
}
