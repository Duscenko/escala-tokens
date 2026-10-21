// COLOUR VARIABLE MAP — what Docs · Color adds for the system on screen: for
// one role, the primitives behind it and the components that read it, then
// the full component → role mapping. Pointing at a role previews it; a click
// pins it. A row in the mapping table pins that role too. The other
// foundations need no such block: their Docs page already lists every role.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../../lib/i18n'
import { COMPONENTS } from '../../../lib/componentCatalogue'
import { componentsByRole, findingFails, tokenElementId, tokenMapping } from '../../../lib/systemDashboard'
import { CHECKER } from '../checker'
import { BTN, BTN_PRIMARY, Card, EmptyRow, Mark, ROW, StatusPill, Swatch, TD, TH, Tag } from './parts'
import { useCheckText, type Dashboard } from './dashboardData'
import MapWires, { type Wire } from './MapWires'

const labelOf = (key: string) => COMPONENTS.find((c) => c.key === key)?.label ?? key

const cssVarOf = (id: string) => `var(--color-${id.replace(/\./g, '-')})`

/** From this width the map lays its three stages side by side and wires
 *  them, a variables graph; below it they stack on the spine. The CSS
 *  container query and the JS measure must agree: 34rem at the 18px root. */
const WIRED_MIN_PX = 612

/** A stage on the map's spine. The mark sits on the rule; the label names the stage. */
function MapStep({ mark, label, step, children }: {
  mark: string
  label: string
  step?: 'role' | 'use'
  children: React.ReactNode
}) {
  return (
    <div className={`map-step relative flex min-w-0 flex-col gap-2 ${step === 'role' ? 'map-step-role' : step === 'use' ? 'map-step-use' : ''}`}>
      <span aria-hidden className={`absolute -left-4 top-[5px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fg-faint @[34rem]:hidden`} />
      <span className="text-micro font-medium text-fg-faint">{mark} {label}</span>
      {children}
    </div>
  )
}

/** A component that reads the role, and what it paints with it. A node of the
 *  graph: the wire lands on its left edge. */
function ComponentNode({ id, label, paints, on, onEnter, onOpen }: {
  id: string
  label: string
  paints: string[]
  on: boolean
  onEnter: () => void
  onOpen?: () => void
}) {
  const shown = paints.slice(0, 3)
  const more = paints.length - shown.length
  return (
    <button
      type="button"
      data-wire={id}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onClick={onOpen}
      title={paints.join(' · ') || undefined}
      className={`map-node flex min-w-0 max-w-full flex-col items-stretch rounded-lg border bg-surface text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 @[34rem]:w-full ${
        on ? 'border-accent-ui/60 bg-accent-ui/[0.08]' : 'border-line hover:border-line-strong'
      }`}
    >
      <span className="truncate px-2.5 pt-1.5 text-caption font-medium text-fg">{label}</span>
      <span className="flex flex-col gap-px px-2.5 pb-1.5 pt-0.5">
        {shown.map((p) => <span key={p} className="truncate font-mono text-micro text-fg-faint">{p}</span>)}
        {more > 0 && <span className="font-mono text-micro text-fg-faint">+{more}</span>}
      </span>
    </button>
  )
}

/** One fact of the inspector: the label over its value. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-micro text-fg-faint">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-caption text-fg">{children}</dd>
    </div>
  )
}

/** A colour you can read and copy. The hex sits under the plate so a translucent fill never has to carry ink. */
function ColorPlate({ id, appearance, primitive, css, caption, copyLabel, on, onEnter, onCopy }: {
  id: string
  appearance: string
  primitive: string
  css: string
  caption: string
  copyLabel: string
  on: boolean
  onEnter: () => void
  onCopy: () => void
}) {
  return (
    <button
      type="button"
      data-wire={id}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onClick={onCopy}
      aria-label={copyLabel}
      className={`map-node group flex w-[10.5rem] max-w-full flex-col gap-1.5 rounded-xl border bg-surface p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 @[34rem]:w-full ${
        on ? 'border-accent-ui/60' : 'border-line hover:border-line-strong'
      }`}
    >
      <span
        aria-hidden
        className="block h-10 w-full overflow-hidden rounded-lg border border-fg/10"
        style={{ ...CHECKER, backgroundSize: '8px 8px' }}
      >
        <span className="block h-full w-full" style={{ background: css }} />
      </span>
      <span className="flex min-w-0 flex-col px-0.5 leading-tight">
        <span className="text-micro text-fg-muted">{appearance}</span>
        <span className="truncate font-mono text-micro text-fg">{primitive}</span>
        <span className="truncate font-mono text-micro text-fg-faint">{caption}</span>
      </span>
    </button>
  )
}

export default function ColorVariableMap({ dash, onOpenComponent, onEditRole, onOpenStatus }: {
  dash: Dashboard
  onOpenComponent?: (key: string) => void
  /** Opens this role's primitive picker in the inspector. The map stays. */
  onEditRole?: (roleId: string) => void
  /** Absent while the Status board is on hold. */
  onOpenStatus?: (elementId: string) => void
}) {
  const { t } = useI18n()
  const checkText = useCheckText()
  const { store, roles, elements } = dash

  const categories = useMemo(() => {
    const seen = new Map<string, { key: string; label: string; count: number }>()
    for (const role of roles.roles) {
      const hit = seen.get(role.category)
      if (hit) hit.count += 1
      else seen.set(role.category, { key: role.category, label: role.categoryLabel, count: 1 })
    }
    return [...seen.values()]
  }, [roles])
  const [category, setCategory] = useState<string>('')
  const activeCategory = categories.some((c) => c.key === category) ? category : categories[0]?.key ?? ''
  const inCategory = roles.roles.filter((role) => role.category === activeCategory)
  const [roleId, setRoleId] = useState<string>('')
  // Pointer preview. It never replaces the pin: leaving the list restores it.
  const [hoverId, setHoverId] = useState<string | null>(null)
  const shownId = hoverId && inCategory.some((r) => r.id === hoverId) ? hoverId : roleId
  const role = inCategory.find((r) => r.id === shownId) ?? inCategory[0]

  const usage = useMemo(() => componentsByRole(store.selectedComponents), [store.selectedComponents])
  const usedBy = role ? usage.get(role.id) ?? [] : []
  const element = role ? elements.find((el) => el.id === tokenElementId(role.id)) : undefined
  const contrast = element?.checks.find((check) => check.kind === 'contrast')
  const roleFails = role ? roles.findings.some((f) => f.role === role.id && f.intent !== 'decorative' && f.intent !== 'surface' && findingFails(f)) : false

  const [mapComponent, setMapComponent] = useState<string>('all')
  const [focusComponent, setFocusComponent] = useState<string | null>(null)
  // The plate under the pointer: its wire to the role lights.
  const [focusMode, setFocusMode] = useState<string | null>(null)
  // Measured, not assumed: the wires exist only once the stages sit side by side.
  const flowRef = useRef<HTMLDivElement>(null)
  const [wired, setWired] = useState(false)
  const hasRole = role != null
  useEffect(() => {
    const el = flowRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const read = () => setWired(el.getBoundingClientRect().width >= WIRED_MIN_PX)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
    // The flow remounts with the pin, so the observer has to follow it.
  }, [hasRole, roleId])
  const mapping = useMemo(() => tokenMapping(store.selectedComponents), [store.selectedComponents])
  const mappingShown = mapComponent === 'all' ? mapping : mapping.filter((row) => row.component === mapComponent)
  const firstMode = roles.modeKeys[0]
  const valueOf = (id: string | null) => (id ? roles.roles.find((r) => r.id === id)?.modes[firstMode] : undefined)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimer = useRef<number | null>(null)
  const pinRef = useRef<HTMLButtonElement>(null)
  const focusPin = useRef(false)

  useEffect(() => () => {
    if (copyTimer.current != null) window.clearTimeout(copyTimer.current)
  }, [])

  // Only a pin moves the list. A hover is already under the pointer.
  useEffect(() => {
    pinRef.current?.scrollIntoView({ block: 'nearest' })
    if (focusPin.current) {
      focusPin.current = false
      pinRef.current?.focus()
    }
  }, [roleId])

  function pinRole(id: string, focus = false) {
    const found = roles.roles.find((r) => r.id === id)
    if (!found) return
    setCategory(found.category)
    setRoleId(id)
    setHoverId(null)
    if (focus) focusPin.current = true
  }

  function copyVar(id: string) {
    void navigator.clipboard.writeText(cssVarOf(id)).then(() => {
      setCopiedId(id)
      if (copyTimer.current != null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1200)
    }, () => {})
  }

  function moveRole(fromId: string, delta: number) {
    const index = inCategory.findIndex((r) => r.id === fromId)
    if (index < 0) return
    const next = inCategory[Math.max(0, Math.min(inCategory.length - 1, index + delta))]
    if (!next || next.id === fromId) return
    pinRole(next.id, true)
  }

  const copied = role != null && copiedId === role.id
  const copyLabel = role ? `${t('Copy CSS variable')}: ${cssVarOf(role.id)}` : ''
  // The pin, not the hover. Hover repaints the plates in place; pinning a
  // different role remounts the spine so the path draws once more.
  const flowKey = roleId || inCategory[0]?.id || 'map'
  const primitivePath = role
    ? roles.modeKeys.map((mode) => role.modes[mode]?.label).filter((label): label is string => Boolean(label)).join(' · ')
    : ''
  // Plate → role per mode, then role → every component that reads it.
  const wires: Wire[] = [
    ...roles.modeKeys.map((mode, index): Wire => ({ from: `p:${mode}`, to: 'role', stage: 'primitive', index })),
    ...usedBy.map((key, index): Wire => ({ from: 'role', to: `c:${key}`, stage: 'component', index })),
  ]
  const lit = focusComponent ? `c:${focusComponent}` : focusMode ? `p:${focusMode}` : null
  // A hover preview re-wires with a fade; only a pin draws the wires in.
  const previewing = role != null && role.id !== flowKey

  return (
    <section aria-labelledby="color-variable-map" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="color-variable-map" className="text-title font-semibold text-fg">{t('Variable map')}</h2>
        <p className="text-body text-fg-muted">{t('Pick a role to see the primitives behind it and the components that read it.')}</p>
      </div>
          {!role ? <EmptyRow>{t('This brand has no semantic roles to show.')}</EmptyRow> : (
            // Laid out by the room this page has, not by the window: Home's menu
            // takes a column, so a window breakpoint lies about the width.
            <div className="@container">
            <div
              className="grid items-start gap-4 @[38rem]:[grid-template-columns:14rem_minmax(0,1fr)]"
              onMouseLeave={() => setHoverId(null)}
            >
              <Card title={t('Roles')}>
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => { setCategory(cat.key); setHoverId(null) }}
                      aria-pressed={cat.key === activeCategory}
                      className={`h-7 rounded-md px-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                        cat.key === activeCategory ? 'bg-accent-ui/[0.14] text-fg' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
                      }`}
                    >
                      {cat.label} <span className="tabular-nums text-fg-faint">{cat.count}</span>
                    </button>
                  ))}
                </div>
                <ul className="-mx-1 flex max-h-[22rem] flex-col gap-0.5 overflow-y-auto">
                  {inCategory.map((r) => {
                    const current = r.id === role.id
                    const css = r.modes[firstMode]?.css ?? 'transparent'
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          data-role={r.id}
                          ref={r.id === roleId ? pinRef : undefined}
                          tabIndex={current ? 0 : -1}
                          onMouseEnter={() => setHoverId(r.id)}
                          onClick={() => pinRole(r.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') { event.preventDefault(); moveRole(r.id, 1) }
                            else if (event.key === 'ArrowUp') { event.preventDefault(); moveRole(r.id, -1) }
                            else if (event.key === 'Home') { event.preventDefault(); const first = inCategory[0]; if (first) pinRole(first.id, true) }
                            else if (event.key === 'End') { event.preventDefault(); const last = inCategory[inCategory.length - 1]; if (last) pinRole(last.id, true) }
                          }}
                          aria-current={current ? 'true' : undefined}
                          className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left font-mono text-micro transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
                            current ? 'bg-accent-ui/[0.14] text-fg' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
                          }`}
                        >
                          <Swatch css={css} size={16} />
                          <span className="min-w-0 truncate">{r.id.slice(r.category.length + 1)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </Card>

              <div className="flex min-w-0 flex-col gap-4">
                <Card title={t('Variable map')} right={element && <StatusPill status={element.status} />}>
                  <div key={flowKey} className="@container flex flex-col gap-3">
                    <p className="font-mono text-micro text-fg">
                      {primitivePath}
                      <span aria-hidden className="px-1.5 text-fg-faint">→</span>
                      {role.id}
                    </p>
                    <div
                      ref={flowRef}
                      onMouseLeave={() => { setFocusMode(null); setFocusComponent(null) }}
                      className={`map-flow relative flex flex-col gap-4 pl-5 @[34rem]:grid @[34rem]:items-start @[34rem]:gap-x-10 @[34rem]:pl-0 @[34rem]:[grid-template-columns:9.5rem_10.5rem_minmax(0,1fr)] ${wired ? 'map-flow-wired' : ''}`}
                    >
                    <span aria-hidden className={`pointer-events-none absolute bottom-1 left-[5px] top-1 w-px bg-line @[34rem]:hidden`} />
                    <span aria-hidden className={`map-spine pointer-events-none absolute bottom-1 left-[5px] top-1 w-px bg-accent-ui @[34rem]:hidden`} />
                    {wired && (
                      <MapWires key={role.id} containerRef={flowRef} wires={wires} lit={lit} mode={previewing ? 'fade' : 'draw'} />
                    )}
                    <MapStep mark="1" label={t('Primitive')}>
                      <div className={`flex flex-wrap gap-2 @[34rem]:flex-col @[34rem]:flex-nowrap`}>
                        {roles.modeKeys.map((mode) => (
                          <ColorPlate
                            key={mode}
                            id={`p:${mode}`}
                            appearance={roles.appearanceOf[mode] === 'dark' ? t('Dark') : t('Light')}
                            primitive={role.modes[mode]?.label ?? '—'}
                            css={role.modes[mode]?.css ?? 'transparent'}
                            caption={copied ? t('Copied') : (role.modes[mode]?.css ?? '—')}
                            copyLabel={copyLabel}
                            on={focusMode === mode}
                            onEnter={() => { setFocusMode(mode); setFocusComponent(null) }}
                            onCopy={() => copyVar(role.id)}
                          />
                        ))}
                      </div>
                    </MapStep>
                    <MapStep mark="2" label={t('Role')} step="role">
                      <div className={`flex w-full min-w-[11rem] max-w-sm flex-col gap-2 @[34rem]:min-w-0`}>
                        <div data-wire="role" className="flex flex-col gap-1.5 rounded-xl border border-accent-ui/50 bg-accent-ui/[0.06] p-1.5">
                          <span
                            aria-hidden
                            className="flex h-10 overflow-hidden rounded-lg border border-fg/10"
                            style={{ ...CHECKER, backgroundSize: '8px 8px' }}
                          >
                            {roles.modeKeys.map((mode) => (
                              <span key={mode} className="h-full min-w-0 flex-1" style={{ background: role.modes[mode]?.css ?? 'transparent' }} />
                            ))}
                          </span>
                          <span className="flex min-w-0 flex-col px-0.5 leading-tight">
                            <span className="truncate font-mono text-micro text-fg">{role.id}</span>
                            <button
                              type="button"
                              onClick={() => copyVar(role.id)}
                              aria-label={copyLabel}
                              className="truncate rounded text-left font-mono text-micro text-fg-faint hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                            >
                              {copied ? t('Copied') : cssVarOf(role.id)}
                            </button>
                          </span>
                        </div>
                        {onEditRole && (
                          <button
                            type="button"
                            onClick={() => onEditRole(role.id)}
                            aria-label={`${t('Edit in Variables')}: ${role.id}`}
                            className={`${BTN_PRIMARY} w-full justify-center whitespace-nowrap px-2`}
                          >
                            {t('Edit in Variables')}
                          </button>
                        )}
                      </div>
                    </MapStep>
                    <MapStep mark="3" label={usedBy.length ? `${t('Components')} · ${usedBy.length}` : t('Components')} step="use">
                      {usedBy.length === 0 ? (
                        <span className="flex h-7 items-center text-caption text-fg-faint">{t('No component in this system reads it')}</span>
                      ) : (
                        <div className={`flex flex-wrap gap-1.5 @[34rem]:flex-col @[34rem]:flex-nowrap @[34rem]:gap-2`}>
                          {usedBy.map((key) => (
                            <ComponentNode
                              key={key}
                              id={`c:${key}`}
                              label={labelOf(key)}
                              paints={mapping.filter((row) => row.component === key && row.role === role.id).map((row) => row.property)}
                              on={focusComponent === key}
                              onEnter={() => { setFocusComponent(key); setFocusMode(null) }}
                              onOpen={onOpenComponent ? () => onOpenComponent(key) : undefined}
                            />
                          ))}
                        </div>
                      )}
                    </MapStep>
                    </div>
                  </div>
                </Card>

                <Card title={t('Inspector')}>
                  <dl className="grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
                    {roles.modeKeys.map((mode) => (
                      <Stat key={mode} label={roles.appearanceOf[mode] === 'dark' ? t('Dark') : t('Light')}>
                        <Swatch css={role.modes[mode]?.css ?? 'transparent'} size={12} />
                        <span className="truncate font-mono text-micro">{role.modes[mode]?.css}</span>
                      </Stat>
                    ))}
                    <Stat label={t('CSS variable')}>
                      <button
                        type="button"
                        onClick={() => copyVar(role.id)}
                        aria-label={copyLabel}
                        className="min-w-0 truncate rounded font-mono text-micro hover:text-accent-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                      >
                        {copied ? t('Copied') : cssVarOf(role.id)}
                      </button>
                    </Stat>
                    {role.edited && <Stat label={t('Source')}>{t('Set for this brand')}</Stat>}
                  </dl>
                  {contrast && (
                    <p className="flex items-start gap-2 border-t border-line pt-3 text-caption text-fg">
                      <span className="pt-0.5"><Mark state={roleFails ? 'fail' : checkText(contrast).state} /></span>
                      <span>{checkText(contrast).text}</span>
                    </p>
                  )}
                  {onOpenStatus && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onOpenStatus(tokenElementId(role.id))} className={BTN}>
                        {t('Open in status board')}
                      </button>
                    </div>
                  )}
                </Card>
              </div>
            </div>
            </div>
          )}

          <Card
            title={t('Token mapping')}
            right={(
              <>
                <span className="text-caption text-fg-faint">{t('Component, what it paints, the role, its value')}</span>
                <select
                  aria-label={t('Component')}
                  value={mapComponent}
                  onChange={(e) => setMapComponent(e.target.value)}
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-caption text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                >
                  <option value="all">{t('All components')}</option>
                  {store.selectedComponents.map((key) => <option key={key} value={key}>{labelOf(key)}</option>)}
                </select>
              </>
            )}
          >
            {mappingShown.length === 0 ? <EmptyRow>{t('No component in this system has a colour mapping yet.')}</EmptyRow> : (
              <div className="-mx-1 max-h-[26rem] overflow-auto">
                <table className="w-full min-w-[34rem] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>{t('Component')}</th>
                      <th className={TH}>{t('Paints')}</th>
                      <th className={TH}>{t('Role')}</th>
                      <th className={TH}>{t('Value')}</th>
                      <th className={TH}>{t('Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappingShown.map((row) => {
                      const value = valueOf(row.role)
                      const onRole = row.role != null && row.role === role?.id
                      const onComp = focusComponent === row.component
                      return (
                        <tr key={`${row.component}-${row.property}-${row.role}`} className={`${ROW} ${onRole ? 'bg-accent-ui/[0.08]' : onComp ? 'bg-fg/[0.04]' : ''}`}>
                          <td className={TD}>
                            {onOpenComponent ? (
                              <button
                                type="button"
                                onMouseEnter={() => setFocusComponent(row.component)}
                                onMouseLeave={() => setFocusComponent(null)}
                                onClick={() => onOpenComponent(row.component)}
                                className="font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                              >
                                {row.componentLabel}
                              </button>
                            ) : row.componentLabel}
                          </td>
                          <td className={`${TD} text-fg-muted`}>{row.property}</td>
                          <td className={TD}>
                            {row.role ? (
                              <button
                                type="button"
                                onClick={() => pinRole(row.role!)}
                                aria-label={t('Show {name} on the map', { name: row.role })}
                                className="max-w-full truncate rounded font-mono text-micro text-fg underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                              >
                                {row.role}
                              </button>
                            ) : '—'}
                          </td>
                          <td className={TD}>
                            {value ? (
                              <span className="flex items-center gap-1.5 font-mono text-micro">
                                <Swatch css={value.css} size={12} />{value.css}
                              </span>
                            ) : '—'}
                          </td>
                          <td className={TD}>
                            {row.role && value
                              ? <Tag tone="success">{t('Mapped')}</Tag>
                              : <Tag tone="warning" title={t('The component reads a value that no semantic role names yet.')}>{t('No role')}</Tag>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
    </section>
  )
}
