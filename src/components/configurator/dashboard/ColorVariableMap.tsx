// COLOUR VARIABLE MAP — what Docs · Color adds for the system on screen: for
// one role, the primitives behind it and the components that read it, then
// the full component → role mapping. The other foundations need no such block:
// their Docs page already lists every role and the step it points at.

import { useMemo, useState } from 'react'
import { useI18n } from '../../../lib/i18n'
import { COMPONENTS } from '../../../lib/componentCatalogue'
import { componentsByRole, findingFails, tokenElementId, tokenMapping } from '../../../lib/systemDashboard'
import { BTN, BTN_PRIMARY, Card, EmptyRow, Mark, ROW, StatusPill, Swatch, TD, TH, Tag } from './parts'
import { useCheckText, type Dashboard } from './dashboardData'

const labelOf = (key: string) => COMPONENTS.find((c) => c.key === key)?.label ?? key

const PILL = 'inline-flex h-7 min-w-0 max-w-full items-center gap-2 rounded-full border px-2.5 text-caption'

/** One column of the variable map: what it holds, then its nodes. */
function MapColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-micro font-medium text-fg-faint">{label}</span>
      {children}
    </div>
  )
}

/** The link between two columns. It points right when they sit side by side and down when they stack. */
function MapArrow() {
  return (
    <span aria-hidden className="flex h-5 items-center justify-center text-fg-faint @[30rem]:mt-[1.375rem] @[30rem]:h-7">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="rotate-90 @[30rem]:rotate-0">
        <path d="M4 12h15M13 6l6 6-6 6" />
      </svg>
    </span>
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

export default function ColorVariableMap({ dash, onOpenComponent, onEditRole, onOpenStatus }: {
  dash: Dashboard
  onOpenComponent?: (key: string) => void
  /** Opens this role's editor in Variables · Color semantics. */
  onEditRole?: (roleId: string) => void
  onOpenStatus: (elementId: string) => void
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
  const role = inCategory.find((r) => r.id === roleId) ?? inCategory[0]

  const usage = useMemo(() => componentsByRole(store.selectedComponents), [store.selectedComponents])
  const usedBy = role ? usage.get(role.id) ?? [] : []
  const element = role ? elements.find((el) => el.id === tokenElementId(role.id)) : undefined
  const contrast = element?.checks.find((check) => check.kind === 'contrast')
  const roleFails = role ? roles.findings.some((f) => f.role === role.id && f.intent !== 'decorative' && f.intent !== 'surface' && findingFails(f)) : false

  const [mapComponent, setMapComponent] = useState<string>('all')
  const mapping = useMemo(() => tokenMapping(store.selectedComponents), [store.selectedComponents])
  const mappingShown = mapComponent === 'all' ? mapping : mapping.filter((row) => row.component === mapComponent)
  const firstMode = roles.modeKeys[0]
  const valueOf = (id: string | null) => (id ? roles.roles.find((r) => r.id === id)?.modes[firstMode] : undefined)

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
            <div className="grid items-start gap-4 @[38rem]:[grid-template-columns:14rem_minmax(0,1fr)]">
              <Card title={t('Roles')}>
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
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
                  {inCategory.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setRoleId(r.id)}
                        aria-current={r.id === role.id ? 'true' : undefined}
                        className={`flex h-7 w-full items-center gap-2 rounded-md px-2 text-left font-mono text-micro transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
                          r.id === role.id ? 'bg-accent-ui/[0.14] text-fg' : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
                        }`}
                      >
                        <Swatch css={r.modes[firstMode]?.css ?? 'transparent'} size={12} />
                        <span className="min-w-0 truncate">{r.id.slice(r.category.length + 1)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>

              <div className="flex min-w-0 flex-col gap-4">
                <Card title={t('Variable map')} right={element && <StatusPill status={element.status} />}>
                  <div className="@container">
                    <div className="grid gap-x-3 gap-y-2 @[30rem]:[grid-template-columns:minmax(0,max-content)_auto_minmax(0,max-content)_auto_minmax(0,1fr)]">
                      <MapColumn label={t('Primitive')}>
                        {roles.modeKeys.map((mode) => (
                          <span key={mode} className={`${PILL} border-line text-fg`} title={role.modes[mode]?.label}>
                            <Swatch css={role.modes[mode]?.css ?? 'transparent'} size={14} />
                            <span className="flex-shrink-0 text-fg-muted">{roles.appearanceOf[mode] === 'dark' ? t('Dark') : t('Light')}</span>
                            <span className="min-w-0 truncate font-mono text-micro">{role.modes[mode]?.label}</span>
                          </span>
                        ))}
                      </MapColumn>
                      <MapArrow />
                      <MapColumn label={t('Role')}>
                        <span className={`${PILL} self-start border-accent-ui/60 bg-accent-ui/[0.08] text-fg`} title={role.id}>
                          <span className="min-w-0 truncate font-mono text-micro">{role.id}</span>
                        </span>
                      </MapColumn>
                      <MapArrow />
                      <MapColumn label={usedBy.length ? `${t('Components')} · ${usedBy.length}` : t('Components')}>
                        {usedBy.length === 0 ? (
                          <span className="flex h-7 items-center text-caption text-fg-faint">{t('No component in this system reads it')}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {usedBy.map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => onOpenComponent?.(key)}
                                className={`${PILL} border-line text-fg transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
                              >
                                {labelOf(key)}
                              </button>
                            ))}
                          </div>
                        )}
                      </MapColumn>
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
                      <span className="truncate font-mono text-micro">--color-{role.id.replace(/\./g, '-')}</span>
                    </Stat>
                    {role.edited && <Stat label={t('Source')}>{t('Set for this brand')}</Stat>}
                  </dl>
                  {contrast && (
                    <p className="flex items-start gap-2 border-t border-line pt-3 text-caption text-fg">
                      <span className="pt-0.5"><Mark state={roleFails ? 'fail' : checkText(contrast).state} /></span>
                      <span>{checkText(contrast).text}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {onEditRole && (
                      <button type="button" onClick={() => onEditRole(role.id)} className={BTN_PRIMARY}>
                        {t('Edit in Variables')}
                      </button>
                    )}
                    <button type="button" onClick={() => onOpenStatus(tokenElementId(role.id))} className={BTN}>
                      {t('Open in status board')}
                    </button>
                  </div>
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
                      return (
                        <tr key={`${row.component}-${row.property}`} className={ROW}>
                          <td className={`${TD} font-medium`}>{row.componentLabel}</td>
                          <td className={`${TD} text-fg-muted`}>{row.property}</td>
                          <td className={`${TD} font-mono text-micro`}>{row.role ?? '—'}</td>
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
