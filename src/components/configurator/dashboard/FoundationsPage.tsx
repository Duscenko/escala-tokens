// FOUNDATIONS — how the values are layered and who reads them. Colour shows
// the whole chain for one role (primitive → role → components); the other
// foundations list each role and the step it points at. Editing stays in the
// Generator: every tab links to the editor it describes.

import { useMemo, useState } from 'react'
import { useI18n } from '../../../lib/i18n'
import { COMPONENTS } from '../../../lib/componentCatalogue'
import { componentsByRole, findingFails, tokenElementId, tokenMapping } from '../../../lib/systemDashboard'
import { resolveThemeFoundations } from '../../../lib/themeFoundations'
import { LAYOUT_ROLES, mergeLayoutRoles, resolveLayoutRole, type LayoutFamily } from '../../../lib/layoutTokens'
import { TYPE_ROLES, mergeTypeRoles, resolveTypeStyle } from '../../../lib/typeRoles'
import { BTN, Card, EmptyRow, Mark, PageHeader, ROW, StatusPill, Swatch, TD, TH, Tag } from './parts'
import { useCheckText, type Dashboard } from './dashboardData'

type FoundationTab = 'color' | 'typography' | 'radius' | 'spacing' | 'sizes' | 'stroke'

const TABS: { key: FoundationTab; label: string }[] = [
  { key: 'color', label: 'Color' },
  { key: 'typography', label: 'Typography' },
  { key: 'radius', label: 'Radius' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'sizes', label: 'Sizes' },
  { key: 'stroke', label: 'Stroke' },
]

const LAYOUT_TAB: Partial<Record<FoundationTab, LayoutFamily>> = {
  radius: 'radius', spacing: 'spacing', sizes: 'size', stroke: 'stroke',
}

const labelOf = (key: string) => COMPONENTS.find((c) => c.key === key)?.label ?? key

/** One node of the variable map. `depth` indents it under its parent. */
function MapNode({ depth, swatch, children, strong }: { depth: number; swatch?: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex items-center" style={{ paddingLeft: depth * 20 }}>
      {depth > 0 && <span aria-hidden className="mr-2 h-px w-3 flex-shrink-0 bg-line-strong" />}
      <span className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1 text-caption ${strong ? 'border-accent-ui/60 bg-accent-ui/[0.08] text-fg' : 'border-line text-fg'}`}>
        {swatch && <Swatch css={swatch} size={14} />}
        <span className="min-w-0 truncate">{children}</span>
      </span>
    </li>
  )
}

export default function FoundationsPage({ dash, onEditFoundation, onOpenComponent, onOpenStatus }: {
  dash: Dashboard
  onEditFoundation?: (key: string) => void
  onOpenComponent?: (key: string) => void
  onOpenStatus: (elementId: string) => void
}) {
  const { t } = useI18n()
  const checkText = useCheckText()
  const { store, roles, elements } = dash
  const [tab, setTab] = useState<FoundationTab>('color')

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

  const foundations = useMemo(() => resolveThemeFoundations(store, roles.brand), [store, roles.brand])
  const layoutFamily = LAYOUT_TAB[tab]
  const layoutRows = useMemo(() => {
    if (!layoutFamily) return []
    const primitives = { radius: foundations.radius, spacing: foundations.spacing, size: foundations.sizes, stroke: foundations.stroke }[layoutFamily as 'radius' | 'spacing' | 'size' | 'stroke']
    const stored = { radius: foundations.radiusRoles, spacing: foundations.spacingRoles, size: foundations.sizeRoles, stroke: foundations.strokeRoles }[layoutFamily as 'radius' | 'spacing' | 'size' | 'stroke']
    const merged = mergeLayoutRoles(layoutFamily, stored)
    return LAYOUT_ROLES[layoutFamily].map((spec) => ({
      key: spec.key,
      label: spec.label,
      description: spec.description,
      pointsTo: merged[spec.key] ?? spec.primitive,
      value: resolveLayoutRole(layoutFamily, merged, primitives, spec.key, '—'),
    }))
  }, [layoutFamily, foundations])
  const typeRows = useMemo(() => {
    if (tab !== 'typography') return []
    const merged = mergeTypeRoles(foundations.typography.roles)
    return TYPE_ROLES.map((spec) => {
      const alias = merged[spec.key]?.desktop ?? spec.desktop
      const style = resolveTypeStyle(alias, foundations.typography)
      return {
        key: spec.key,
        label: spec.label,
        description: spec.description,
        pointsTo: `${alias.size} · ${alias.weight}`,
        value: `${style.size} / ${style.lineHeight} · ${style.weight} · ${style.family}`,
      }
    })
  }, [tab, foundations])
  const plainRows = tab === 'typography' ? typeRows : layoutRows

  return (
    <>
      <PageHeader
        title={t('Foundations')}
        detail={t('How the values are layered, which components read them and where each one is mapped.')}
        right={onEditFoundation && (
          <button type="button" onClick={() => onEditFoundation(tab)} className={BTN}>{t('Edit in the Generator')}</button>
        )}
      />

      <div role="tablist" aria-label={t('Foundations')} className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`-mb-px h-9 border-b-2 px-3 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
              tab === item.key ? 'border-accent-ui text-fg' : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {tab === 'color' ? (
        <>
          {!role ? <EmptyRow>{t('This brand has no semantic roles to show.')}</EmptyRow> : (
            <div className="grid items-start gap-4 lg:[grid-template-columns:14rem_minmax(0,1fr)_17rem]">
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

              <Card title={t('Variable map')} right={<Tag>{roles.modeKeys.map((mode) => (roles.appearanceOf[mode] === 'dark' ? t('Dark') : t('Light'))).join(' + ')}</Tag>}>
                <ul className="flex flex-col gap-2">
                  {roles.modeKeys.map((mode) => (
                    <MapNode key={mode} depth={0} swatch={role.modes[mode]?.css}>
                      <span className="text-fg-muted">{roles.appearanceOf[mode] === 'dark' ? t('Dark') : t('Light')}</span>
                      {' · '}
                      <span className="font-mono text-micro">{role.modes[mode]?.label}</span>
                    </MapNode>
                  ))}
                  <MapNode depth={1} strong><span className="font-mono text-micro">{role.id}</span></MapNode>
                  {usedBy.length === 0 ? (
                    <MapNode depth={2}><span className="text-fg-faint">{t('No component in this system reads it')}</span></MapNode>
                  ) : usedBy.map((key) => (
                    <li key={key} className="flex items-center" style={{ paddingLeft: 40 }}>
                      <span aria-hidden className="mr-2 h-px w-3 flex-shrink-0 bg-line-strong" />
                      <button
                        type="button"
                        onClick={() => onOpenComponent?.(key)}
                        className="rounded-full border border-line px-2.5 py-1 text-caption text-fg transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                      >
                        {labelOf(key)}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-fg-faint">{t('Primitive, then semantic role, then the components that read it.')}</p>
              </Card>

              <Card title={t('Inspector')} right={element && <StatusPill status={element.status} />}>
                <dl className="flex flex-col text-caption">
                  <div className="flex items-center justify-between gap-3 py-1.5">
                    <dt className="text-fg-muted">{t('Token')}</dt>
                    <dd className="min-w-0 truncate font-mono text-micro text-fg">{role.id}</dd>
                  </div>
                  {roles.modeKeys.map((mode) => (
                    <div key={mode} className="flex items-center justify-between gap-3 border-t border-line py-1.5">
                      <dt className="text-fg-muted">{roles.appearanceOf[mode] === 'dark' ? t('Dark') : t('Light')}</dt>
                      <dd className="flex min-w-0 items-center gap-1.5 font-mono text-micro text-fg">
                        <Swatch css={role.modes[mode]?.css ?? 'transparent'} size={12} />
                        <span className="truncate">{role.modes[mode]?.css}</span>
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 border-t border-line py-1.5">
                    <dt className="text-fg-muted">{t('CSS variable')}</dt>
                    <dd className="min-w-0 truncate font-mono text-micro text-fg">--color-{role.id.replace(/\./g, '-')}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-line py-1.5">
                    <dt className="text-fg-muted">{t('Used by')}</dt>
                    <dd className="text-fg">{t('{n} components', { n: usedBy.length })}</dd>
                  </div>
                  {role.edited && (
                    <div className="flex items-center justify-between gap-3 border-t border-line py-1.5">
                      <dt className="text-fg-muted">{t('Source')}</dt>
                      <dd className="text-fg">{t('Set for this brand')}</dd>
                    </div>
                  )}
                </dl>
                {contrast && (
                  <p className="flex items-start gap-2 border-t border-line pt-3 text-caption text-fg">
                    <span className="pt-0.5"><Mark state={roleFails ? 'fail' : checkText(contrast).state} /></span>
                    <span>{checkText(contrast).text}</span>
                  </p>
                )}
                <button type="button" onClick={() => onOpenStatus(tokenElementId(role.id))} className={`${BTN} self-start`}>
                  {t('Open in status board')}
                </button>
              </Card>
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
        </>
      ) : (
        <Card title={t('Roles')} right={<span className="text-caption text-fg-faint">{t('Desktop values')}</span>}>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>{t('Role')}</th>
                  <th className={TH}>{t('Points to')}</th>
                  <th className={TH}>{t('Value')}</th>
                  <th className={TH}>{t('Used for')}</th>
                </tr>
              </thead>
              <tbody>
                {plainRows.map((row) => (
                  <tr key={row.key} className={ROW}>
                    <td className={`${TD} font-mono text-micro`}>{row.key}</td>
                    <td className={`${TD} font-mono text-micro text-fg-muted`}>{row.pointsTo}</td>
                    <td className={`${TD} font-mono text-micro`}>{row.value}</td>
                    <td className={`${TD} text-fg-muted`}>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
