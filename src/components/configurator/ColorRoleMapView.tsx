// The colour map on the board: one colour of the brand read forward —
// Primitive → Semantic groups → Semantic roles → Application. It replaces the
// board while a colour row's ramp is open in the Color card (the same toggle
// drives both), the way the Contrast grid does. Every fact comes from
// `buildColorRoleMap` (design-plans/color-role-map.md); this file only lays
// it out.

import { useEffect, useMemo, useRef, useState } from 'react'
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

/** The map's stages sit side by side — and are wired — from 56rem of board
 *  (the 18px root). Must match the `@[56rem]/map` container query below. */
const WIRED_MIN_PX = 56 * 18

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

/** Primitive and Groups: a chip row on a narrow board, a column on a wide one. */
const STAGE_LIST = 'flex flex-wrap gap-1 @[56rem]/map:flex-col @[56rem]/map:flex-nowrap'
const STAGE_ITEM = 'flex h-8 min-w-0 items-center gap-2 rounded-lg px-2 text-left text-ui transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 @[56rem]/map:w-full'

/** Role | Application: two columns once the roles column has room, stacked below. */
const ROLE_GRID = 'grid grid-cols-1 @[30rem]/roles:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'

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

  // ── Wires: colour → group → role → its components, a variables graph. Only
  // once the stages sit side by side (the same 56rem the layout switches at);
  // stacked, a wire would run down through the rows it should join.
  const outerRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)
  const [wired, setWired] = useState(false)
  useEffect(() => {
    const el = outerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const read = () => setWired(el.getBoundingClientRect().width >= WIRED_MIN_PX)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
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
  const usedTones = Object.keys(map.tones).map(Number).sort((a, b) => a - b)
  const label = t(COLOR_ROLE_LABEL[colour])
  const appearanceWord = t(appearance === 'dark' ? 'Dark' : 'Light')

  return (
    // Container queries, not breakpoints: the board's width depends on the
    // inspector and the window. Wide, the four stages sit side by side as in
    // a variables graph; narrow, Primitive and Groups become chip rows over
    // the roles, so a role's name never truncates to nothing.
    <div ref={outerRef} className="@container/map flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-20">
        {/* One line saying what the map shows, in the theme on screen. */}
        <p className="mb-5 text-ui text-fg-muted">
          {t('{name} feeds {roles} roles and {components} components in {theme}.', {
            name: label, roles: String(roleCount), components: String(map.componentCount), theme: appearanceWord,
          })}
          {usedTones.length > 0 && (
            <span className="text-fg-faint"> {t('Tones in use: {tones}.', { tones: usedTones.join(' · ') })}</span>
          )}
        </p>

        <div
          ref={flowRef}
          onMouseLeave={() => setFocus(null)}
          // The wire layer is the first child, so every stage (positioned
          // `relative`) paints over it and a wire never crosses a label.
          className="relative grid grid-cols-1 gap-5 @[56rem]/map:grid-cols-[minmax(8rem,0.6fr)_minmax(8rem,0.6fr)_minmax(0,3fr)] @[56rem]/map:gap-x-10"
        >
          {wired && roleCount > 0 && (
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
                      className={`${STAGE_ITEM} ${
                        on ? 'bg-elevated text-fg shadow-[inset_0_0_0_1px_var(--line-strong)]' : 'text-fg-muted hover:bg-elevated/60 hover:text-fg'
                      }`}
                    >
                      <Chip css={swatch(id)} size="h-4 w-4" />
                      <span className="min-w-0 flex-1 truncate">{t(COLOR_ROLE_LABEL[id])}</span>
                      <span className="text-micro tabular-nums text-fg-faint">{counts[id]}</span>
                    </button>
                    {/* Neutral carries the fixed alpha ladders. */}
                    {id === 'neutral' && on && map.fixed.length > 0 && (
                      <p className="mt-1 ml-8 hidden text-micro text-fg-faint @[56rem]/map:block">
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
          <section aria-label={t('Semantic roles')} className="relative @container/roles min-w-0">
            <div className={`${ROLE_GRID} gap-x-4`}>
              <ColumnHead>{t('Semantic roles')}</ColumnHead>
              <span className="hidden @[30rem]/roles:block"><ColumnHead>{t('Application')}</ColumnHead></span>
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
  // The component being pointed at leads, so a row that reads it never hides
  // it behind "+N".
  const ordered = litComponent && role.components.some((c) => c.key === litComponent)
    ? [...role.components.filter((c) => c.key === litComponent), ...role.components.filter((c) => c.key !== litComponent)]
    : role.components
  const shown = ordered.slice(0, 4)
  const more = ordered.length - shown.length
  return (
    <div
      data-wire={`r:${role.id}`}
      onMouseEnter={onFocusRole}
      className={`${ROLE_GRID} items-start gap-x-4 gap-y-1.5 rounded-lg border bg-surface px-2 py-1.5 transition-[opacity,border-color] duration-150 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${
        lit ? 'border-accent-ui/60' : 'border-line'
      } ${dim ? 'opacity-45' : ''}`}
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
      {/* Role → Application: a connector across the gap, drawn by the row
          (an SVG wire would sit under the row's own fill). Two columns only. */}
      <div className={`relative flex min-w-0 flex-wrap gap-1 @[30rem]/roles:before:absolute @[30rem]/roles:before:-left-4 @[30rem]/roles:before:top-[0.6875rem] @[30rem]/roles:before:h-px @[30rem]/roles:before:w-4 @[30rem]/roles:before:transition-colors ${
        role.components.length ? (lit ? '@[30rem]/roles:before:bg-accent-ui' : '@[30rem]/roles:before:bg-line-strong') : ''
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
              <span title={role.components.slice(4).map((c) => c.label).join(' · ')} className="px-1 py-0.5 text-micro text-fg-faint">+{more}</span>
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
