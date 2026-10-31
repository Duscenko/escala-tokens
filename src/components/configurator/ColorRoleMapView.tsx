// The colour map on the board: one colour of the brand read forward —
// Primitive → Semantic groups → Semantic roles → Application. It replaces the
// board while a colour row's ramp is open in the Color card (the same toggle
// drives both), the way the Contrast grid does. Every fact comes from
// `buildColorRoleMap` (design-plans/color-role-map.md); this file only lays
// it out.

import { useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { COLOR_ROLE_LABEL, COLOR_ROLE_ORDER, type ColorRoleId } from '../../lib/colorRoles'
import { buildColorRoleMap, focusedRoleIds, visibleGroups, type MapFocus, type MappedRole } from '../../lib/colorRoleMap'
import { GLOBAL_FAMILY, scaleForFamily, type FamilySlot } from '../../lib/themeSources'
import { COMPONENTS, type ComponentDef } from '../../lib/componentCatalogue'
import type { ThemeAppearance } from '../../lib/themeModes'
import { CHECKER } from './checker'
import MapWires, { type Wire } from './dashboard/MapWires'
import { wireKey } from './dashboard/mapWireKey'
import type { ColorRoleMapData } from './useColorRoleMap'
import { HintTip } from '../ui/HintTip'

/** Map: a colour wired out to its roles. Board: the bento of screens. */
const MAP_VIEW_GLYPH: Record<'graph' | 'board', React.ReactNode> = {
  graph: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <circle cx="3.5" cy="8" r="1.75" />
      <circle cx="12.5" cy="3.5" r="1.5" />
      <circle cx="12.5" cy="8" r="1.5" />
      <circle cx="12.5" cy="12.5" r="1.5" />
      <path d="M5.2 7.4C8 7 8.5 3.6 11 3.5M5.25 8H11M5.2 8.6C8 9 8.5 12.4 11 12.5" />
    </svg>
  ),
  board: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="2.5" width="5" height="11" rx="1.2" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1.2" />
    </svg>
  ),
}

/** The map is a graph at EVERY board width: its four stages always sit side
 *  by side, wired, and a board narrower than this scrolls sideways. A
 *  stacked layout was tried and rejected by the owner — the graph reads as a
 *  graph only in columns. */
const MAP_MIN_WIDTH = 'min-w-[56rem]'

const SLOT_OF: Record<ColorRoleId, FamilySlot> = {
  accent: 'brand', neutral: 'gray', success: 'success', error: 'error', warning: 'warning', info: 'info',
}

/** A group's glyph, the same five the Variables rail draws for Categorical. */
function GroupGlyph({ group }: { group: string }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (group) {
    case 'content': return <svg {...common}><path d="M3 3.5h10M8 3.5V13" /></svg>
    case 'action': return <svg {...common}><path d="M3.5 2.5l9 4.2-3.9 1.2-1.2 3.9z" /></svg>
    case 'surface': return <svg {...common}><rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" stroke="none" opacity=".85" /></svg>
    case 'status': return <svg {...common}><path d="M1.5 8h3l1.5-4 3 8 1.5-4h4" /></svg>
    case 'border': return <svg {...common}><rect x="3" y="3" width="10" height="10" rx="2" /></svg>
    default: return <svg {...common}><circle cx="8" cy="8" r="4" /></svg>
  }
}

/** Primitive and Groups: a column each. */
const STAGE_LIST = 'flex flex-col gap-1'
const STAGE_ITEM = 'flex h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-ui transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** Role | Application: two SEPARATE columns, always. The role is a card of
 *  its own; the components it paints sit beside it, outside the card, joined
 *  by a connector — one long box holding both read as one thing (reported). */
const ROLE_GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-x-8'

/** A column's heading — the mockup's four labels. */
function ColumnHead({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-caption font-medium text-fg-muted">{children}</h3>
}

/** A colour you can see on any page: translucent ones over the checker. */
function Chip({ css, size = 'h-3 w-3' }: { css: string; size?: string }) {
  return (
    <span aria-hidden className={`relative ${size} flex-shrink-0 overflow-hidden rounded-[3px] ring-1 ring-inset ring-fg/15`} style={{ ...CHECKER, backgroundSize: '6px 6px' }}>
      <span className="absolute inset-0" style={{ background: css }} />
    </span>
  )
}

export default function ColorRoleMapView({
  data, previewTheme, appearance, colour, onColourChange, focus, onFocusChange, group, onGroupChange, onPickRole, onOpenComponent,
}: {
  /** Resolved once by the hub (`useColorRoleMap`) — the rail's ramp legend
   *  reads the same data. */
  data: ColorRoleMapData
  previewTheme: string
  appearance: ThemeAppearance
  colour: ColorRoleId
  /** Column 1 moves the map — and the open ramp in the rail with it. */
  onColourChange: (colour: ColorRoleId) => void
  /** What lights a path. Held by the hub: the rail's ramp sets it too (a
   *  tone) and lights the steps the map's focus reads. */
  focus: MapFocus
  onFocusChange: (focus: MapFocus) => void
  /** The group filter, held by the hub for the same reason. */
  group: string | null
  onGroupChange: (group: string | null) => void
  /** A role opens Token Details, where it is re-pointed. */
  onPickRole: (roleId: string, css: string, appearance: ThemeAppearance) => void
  onOpenComponent?: (def: ComponentDef) => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const { store, roles, mode, map } = data
  const setGroup = onGroupChange
  const setFocus = onFocusChange

  // Each colour's anchor (tone 9) in this theme, for column 1's swatches.
  const swatch = (id: ColorRoleId) => {
    const family = store.themeSources[previewTheme]?.[SLOT_OF[id]] ?? GLOBAL_FAMILY[SLOT_OF[id]]
    return scaleForFamily(family, appearance, store)?.[9] ?? 'transparent'
  }
  const counts = useMemo(() => Object.fromEntries(COLOR_ROLE_ORDER.map((id) => {
    const m = buildColorRoleMap(roles, id, mode)
    return [id, m.groups.reduce((n, g) => n + g.roles.length, 0)]
  })) as Record<ColorRoleId, number>, [roles, mode])

  const activeGroup = group && map.groups.find((g) => g.key === group)?.roles.length ? group : null
  const shown = useMemo(() => visibleGroups(map, group), [map, group])

  // ── Wires: colour → group → role, a variables graph — at every width,
  // since the stages always sit side by side.
  const flowRef = useRef<HTMLDivElement>(null)
  const wires = useMemo<Wire[]>(() => {
    const out: Wire[] = []
    shown.forEach((g, i) => out.push({ from: `p:${colour}`, to: `g:${g.key}`, stage: 'primitive', index: i }))
    let j = 0
    for (const g of shown) {
      for (const role of g.roles) {
        out.push({ from: `g:${g.key}`, to: `r:${role.id}`, stage: 'component', index: j })
        j += 1
      }
    }
    return out
  }, [shown, colour])
  // The draw replays when what is drawn changes, never on a hover.
  const drawKey = `${colour}-${mode}-${activeGroup ?? 'all'}`

  // ── Focus, both ways. Pointing at a group lights its roles; at a role, its
  // path; at a component, EVERY role that paints it — the map read backwards;
  // at a step of the rail's ramp, every role on that tone.
  const focusRoles = useMemo(() => focusedRoleIds(shown, focus), [focus, shown])
  const litPairs = useMemo(() => {
    const out = new Set<string>()
    if (!focusRoles) return out
    for (const g of shown) {
      for (const role of g.roles) {
        if (!focusRoles.has(role.id)) continue
        out.add(wireKey(`p:${colour}`, `g:${g.key}`))
        out.add(wireKey(`g:${g.key}`, `r:${role.id}`))
      }
    }
    return out
  }, [focusRoles, shown, colour])
  const groupLit = (key: string) => focusRoles != null && shown.some((g) => g.key === key && g.roles.some((r) => focusRoles.has(r.id)))
  const roleCount = map.groups.reduce((n, g) => n + g.roles.length, 0)
  const label = t(COLOR_ROLE_LABEL[colour])
  const appearanceWord = t(appearance === 'dark' ? 'Dark' : 'Light')

  return (
    // Container queries, not breakpoints: the board's width depends on the
    // inspector and the window. Wide, the four stages sit side by side as in
    // a variables graph; narrow, Primitive and Groups become chip rows over
    // the roles, so a role's name never truncates to nothing.
    // A board narrower than the graph scrolls sideways: the columns keep
    // their width instead of stacking (owner's call).
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-5 pt-5 pb-20">
        <div
          ref={flowRef}
          onMouseLeave={() => setFocus(null)}
          // The wire layer is the first child, so every stage (positioned
          // `relative`) paints over it and a wire never crosses a label.
          className={`relative grid ${MAP_MIN_WIDTH} grid-cols-[minmax(8rem,0.6fr)_minmax(8rem,0.6fr)_minmax(0,3fr)] gap-x-10 gap-y-5`}
        >
          {roleCount > 0 && (
            <MapWires key={drawKey} containerRef={flowRef} wires={wires} lit={null} litPairs={litPairs} mode="draw" />
          )}
          {/* 1 · Primitive */}
          <section aria-label={t('Primitive')} className="relative">
            <ColumnHead>{t('Primitive')}</ColumnHead>
            <ul className={STAGE_LIST}>
              {COLOR_ROLE_ORDER.map((id) => {
                const on = id === colour
                return (
                  <li key={id}>
                    <button
                      type="button"
                      data-wire={on ? `p:${id}` : undefined}
                      onClick={() => { setGroup(null); onColourChange(id) }}
                      aria-pressed={on}
                      // Only the colour on the map reads as selected. The others
                      // are quiet choices: faint ink, a muted swatch and count,
                      // brought back to full on hover/focus — so one row, not
                      // six, says "this is the one you're reading".
                      className={`group/prim ${STAGE_ITEM} ${
                        on
                          ? 'bg-elevated font-medium text-fg shadow-[inset_0_0_0_1px_var(--line-strong)]'
                          : 'text-fg-faint hover:bg-elevated/50 hover:text-fg focus-visible:text-fg'
                      }`}
                    >
                      <span className={`flex transition-[opacity,filter] duration-150 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${
                        on ? '' : 'opacity-45 saturate-[.6] group-hover/prim:opacity-100 group-hover/prim:saturate-100 group-focus-visible/prim:opacity-100 group-focus-visible/prim:saturate-100'
                      }`}>
                        <Chip css={swatch(id)} size="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{t(COLOR_ROLE_LABEL[id])}</span>
                      <span className={`text-micro tabular-nums transition-opacity duration-150 motion-reduce:transition-none ${
                        on ? 'text-fg-muted' : 'text-fg-faint opacity-0 group-hover/prim:opacity-100 group-focus-visible/prim:opacity-100'
                      }`}>{counts[id]}</span>
                    </button>
                    {/* Neutral carries the fixed alpha ladders. */}
                    {id === 'neutral' && on && map.fixed.length > 0 && (
                      <p className="mt-1 ml-8 text-micro text-fg-faint">
                        {t('+ Fixed alpha')} <span className="font-mono">black-a · white-a</span>
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* 2 · Semantic groups */}
          <section aria-label={t('Semantic groups')} className="relative">
            <ColumnHead>{t('Semantic groups')}</ColumnHead>
            <ul className={STAGE_LIST}>
              {map.groups.map((g) => {
                const empty = g.roles.length === 0
                const on = activeGroup === g.key
                const lit = groupLit(g.key)
                return (
                  <li key={g.key}>
                    <button
                      type="button"
                      data-wire={empty ? undefined : `g:${g.key}`}
                      disabled={empty}
                      onClick={() => setGroup(on ? null : g.key)}
                      onMouseEnter={() => !empty && setFocus({ kind: 'group', id: g.key })}
                      onFocus={() => !empty && setFocus({ kind: 'group', id: g.key })}
                      aria-pressed={on}
                      title={empty ? t('{name} feeds no {group} role.', { name: label, group: t(g.label) }) : undefined}
                      className={`${STAGE_ITEM} disabled:cursor-default disabled:opacity-35 ${
                        on || lit ? 'bg-elevated text-fg shadow-[inset_0_0_0_1px_var(--line-selected)]' : 'text-fg-muted enabled:hover:bg-elevated/60 enabled:hover:text-fg'
                      } ${focusRoles && !lit && !empty ? 'opacity-50' : ''}`}
                    >
                      <span className="flex-shrink-0 text-fg-faint"><GroupGlyph group={g.key} /></span>
                      <span className="min-w-0 flex-1 truncate">{t(g.label)}</span>
                      <span className="text-micro tabular-nums text-fg-faint">{g.roles.length}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* 3 + 4 · Semantic roles → Application, one row per role, so a
              role and the components it paints read on one line. */}
          <section aria-label={t('Semantic roles')} className="relative min-w-0">
            <div className={ROLE_GRID}>
              <ColumnHead>{t('Semantic roles')}</ColumnHead>
              <div className="mb-2">
                <h3 className="text-caption font-medium text-fg-muted">{t('Application')}</h3>
                <p className="text-micro text-fg-faint">{t('Components that paint with each role')}</p>
              </div>
            </div>
            {roleCount === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-ui text-fg-faint">
                {t('No role reads {name} in {theme}.', { name: label, theme: appearanceWord })}
              </p>
            ) : (
              <motion.div
                key={`${colour}-${mode}-${activeGroup ?? 'all'}`}
                // Opacity only: the wires measure these rows, and a moving
                // row would leave every wire end a few pixels off.
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-4"
              >
                {shown.map((g) => (
                  <div key={g.key} className="flex flex-col gap-1">
                    <p className="flex items-center gap-1.5 text-micro font-medium text-fg-faint">
                      <GroupGlyph group={g.key} />{t(g.label)}
                    </p>
                    {g.roles.map((role) => (
                      <RoleRow
                        key={role.id}
                        role={role}
                        dim={focusRoles != null && !focusRoles.has(role.id)}
                        lit={focusRoles?.has(role.id) ?? false}
                        litComponent={focus?.kind === 'component' ? focus.id : null}
                        onFocusRole={() => setFocus({ kind: 'role', id: role.id })}
                        onFocusComponent={(key) => setFocus({ kind: 'component', id: key })}
                        onPick={() => onPickRole(role.id, role.css, appearance)}
                        onOpenComponent={onOpenComponent}
                      />
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/** One role: its name and the primitive it reads, then the components that
 *  paint with it. A click on the role opens Token Details to re-point it. */
function RoleRow({ role, dim, lit, litComponent, onFocusRole, onFocusComponent, onPick, onOpenComponent }: {
  role: MappedRole
  /** Another path is lit: this row steps back. */
  dim: boolean
  /** On the lit path. */
  lit: boolean
  /** The component under the pointer — shown first here, and marked. */
  litComponent: string | null
  onFocusRole: () => void
  onFocusComponent: (key: string) => void
  onPick: () => void
  onOpenComponent?: (def: ComponentDef) => void
}) {
  const { t } = useI18n()
  // The order never changes under the pointer: moving the pointed-at chip to
  // the front slid another chip beneath the cursor, which took the focus and
  // reshuffled again (reported as a bug on Button). A lit component hidden
  // behind "+N" takes the last visible slot instead.
  const LIMIT = 4
  let shown = role.components.slice(0, LIMIT)
  const hidden = litComponent ? role.components.slice(LIMIT).find((c) => c.key === litComponent) : undefined
  if (hidden) shown = [...shown.slice(0, LIMIT - 1), hidden]
  const more = role.components.length - shown.length
  return (
    <div
      onMouseEnter={onFocusRole}
      className={`${ROLE_GRID} items-center transition-opacity duration-150 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${dim ? 'opacity-45' : ''}`}
    >
      <div
        data-wire={`r:${role.id}`}
        className={`min-w-0 rounded-lg border bg-surface px-2 py-1.5 transition-[border-color] duration-150 ${lit ? 'border-accent-ui/60' : 'border-line'}`}
      >
      <button
        type="button"
        onClick={onPick}
        onFocus={onFocusRole}
        title={t('Re-point {role}', { role: role.id })}
        className="group/role flex min-w-0 flex-col items-start gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <span className="w-full min-w-0 truncate font-mono text-caption text-fg group-hover/role:underline">{role.name}</span>
        <span className="flex flex-wrap items-center gap-1">
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-fg/[0.06] px-1.5 py-0.5 font-mono text-micro text-fg-muted">
            <Chip css={role.css} size="h-2.5 w-2.5" />
            {role.label}
          </span>
            {role.band === 'fixed' && <Tag title={t('A fixed alpha ladder: the same wash on any hue.')}>{t('Fixed alpha')}</Tag>}
            {role.solved && <Tag title={t('Solved for contrast: the tone moves when the hue does.')}>{t('Solved')}</Tag>}
            {role.edited && <Tag title={t('Re-pointed by hand.')}>{t('Edited')}</Tag>}
            {role.elsewhere.map((e) => (
              <Tag key={e.mode} title={t('Reads a different tone in {theme}.', { theme: t(e.appearance === 'dark' ? 'Dark' : 'Light') })}>
                {t(e.appearance === 'dark' ? 'Dark' : 'Light')} <span className="font-mono normal-case tracking-normal">{e.label}</span>
              </Tag>
            ))}
        </span>
      </button>
      </div>
      {/* Role → Application: a connector across the gap between the role's
          card and its components, drawn by the row. */}
      <div className={`relative flex min-w-0 flex-wrap gap-1 before:absolute before:-left-8 before:top-1/2 before:h-px before:w-7 before:transition-colors ${
        role.components.length ? (lit ? 'before:bg-accent-ui' : 'before:bg-line-strong') : 'before:hidden'
      }`}>
        {role.components.length === 0 ? (
          <span className="text-micro text-fg-faint">{t('No component reads it yet')}</span>
        ) : (
          <>
            {shown.map((c) => {
              const def = COMPONENTS.find((d) => d.key === c.key)
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={!onOpenComponent || !def}
                  onClick={() => def && onOpenComponent?.(def)}
                  onMouseEnter={(event) => { event.stopPropagation(); onFocusComponent(c.key) }}
                  onFocus={() => onFocusComponent(c.key)}
                  title={c.paints.join(' · ')}
                  className={`max-w-full truncate rounded-md border px-1.5 py-0.5 text-micro text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                    c.key === litComponent ? 'border-accent-ui bg-accent-ui/15' : 'border-line bg-surface enabled:hover:border-line-strong'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
            {more > 0 && (
              <span title={role.components.filter((c) => !shown.includes(c)).map((c) => c.label).join(' · ')} className="px-1 py-0.5 text-micro text-fg-faint">+{more}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Tag({ title, children }: { title: string; children: React.ReactNode }) {
  return <span title={title} className="rounded px-1 py-px text-nano font-medium uppercase tracking-wide text-fg-faint ring-1 ring-inset ring-line">{children}</span>
}

/** Map · On the board — the two views of one colour map, in the board's
 *  header. A real tab pair (one tab stop, arrows move), like Theme ·
 *  Components; same recessed well as the board's other switches. */
export function MapViewSwitch({ value, onChange, inset = false }: {
  value: 'graph' | 'board'
  onChange: (view: 'graph' | 'board') => void
  /** Inside the board toolbar, in place of Undo · Redo: icons only (the
   *  words stay the tabs' names and tooltips), like Theme · Components. */
  inset?: boolean
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const views = [
    { id: 'graph' as const, label: t('Map') },
    { id: 'board' as const, label: t('Board') },
  ]
  // Same shell and selected pill as the Light · Dark switch beside it
  // (BrandThemesPicker `inset`), so the two read the same way: the pick is a
  // raised, filled pill in full ink; the other is faint text on the well.
  return (
    <div
      role="tablist"
      aria-label={t('Colour map view')}
      className="flex h-8 flex-shrink-0 select-none items-center gap-0.5 rounded-lg bg-fg/[0.04] p-0.5"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        onChange(value === 'graph' ? 'board' : 'graph')
      }}
    >
      {views.map((view) => {
        const on = view.id === value
        const tab = (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(view.id)}
            aria-label={inset ? view.label : undefined}
            className={`relative flex items-center justify-center ${inset ? 'h-7 w-7' : 'h-7 px-2.5'} rounded-md text-caption font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 motion-reduce:transition-none ${
              on ? 'text-fg' : 'text-fg-faint hover:bg-fg/[0.06] hover:text-fg'
            }`}
          >
            {on && (
              <motion.span
                layoutId={inset ? 'map-view-pill-bar' : 'map-view-pill'}
                aria-hidden
                className="absolute inset-0 rounded-md bg-fg/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)]"
                transition={reduce ? { duration: 0 } : { type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="relative flex">{inset ? MAP_VIEW_GLYPH[view.id] : view.label}</span>
          </button>
        )
        return inset ? <HintTip key={view.id} label={view.label}>{tab}</HintTip> : tab
      })}
    </div>
  )
}
