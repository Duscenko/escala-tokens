// ROLES TABLE — what Docs adds under Typography, Radius, Spacing, Sizes and
// Stroke for the brand on screen: every role, the step it points at, the value
// it resolves to and what it is for. Read from the brand's own foundations, so
// the table can never name a value the export does not ship.

import { useMemo } from 'react'
import { useI18n } from '../../../lib/i18n'
import { resolveThemeFoundations } from '../../../lib/themeFoundations'
import { LAYOUT_ROLES, mergeLayoutRoles, resolveLayoutRole, type LayoutFamily } from '../../../lib/layoutTokens'
import { TYPE_ROLES, mergeTypeRoles, resolveTypeStyle } from '../../../lib/typeRoles'
import { BTN, Card, ROW, TD, TH } from './parts'
import type { Dashboard } from './dashboardData'

const LAYOUT_FAMILY: Record<string, 'radius' | 'spacing' | 'size' | 'stroke'> = {
  radius: 'radius', spacing: 'spacing', sizes: 'size', stroke: 'stroke',
}

export default function FoundationRolesTable({ dash, foundation, onEdit }: {
  dash: Dashboard
  /** A Docs foundation key from `ROLE_TABLE_KEYS`. */
  foundation: string
  onEdit?: (foundationKey: string) => void
}) {
  const { t } = useI18n()
  const { store, roles } = dash
  const f = useMemo(() => resolveThemeFoundations(store, roles.brand), [store, roles.brand])

  const rows = useMemo(() => {
    if (foundation === 'typography') {
      const merged = mergeTypeRoles(f.typography.roles)
      return TYPE_ROLES.map((spec) => {
        const alias = merged[spec.key]?.desktop ?? spec.desktop
        const style = resolveTypeStyle(alias, f.typography)
        return {
          key: spec.key,
          description: spec.description,
          pointsTo: `${alias.size} · ${alias.weight}`,
          value: `${style.size} / ${style.lineHeight} · ${style.weight} · ${style.family}`,
        }
      })
    }
    const family: LayoutFamily | undefined = LAYOUT_FAMILY[foundation]
    if (!family) return []
    const primitives = { radius: f.radius, spacing: f.spacing, size: f.sizes, stroke: f.stroke }[family as 'radius' | 'spacing' | 'size' | 'stroke']
    const stored = { radius: f.radiusRoles, spacing: f.spacingRoles, size: f.sizeRoles, stroke: f.strokeRoles }[family as 'radius' | 'spacing' | 'size' | 'stroke']
    const merged = mergeLayoutRoles(family, stored)
    return LAYOUT_ROLES[family].map((spec) => ({
      key: spec.key,
      description: spec.description,
      pointsTo: merged[spec.key] ?? spec.primitive,
      value: resolveLayoutRole(family, merged, primitives, spec.key, '—'),
    }))
  }, [foundation, f])

  if (rows.length === 0) return null
  return (
    <Card
      title={t('Roles')}
      right={(
        <>
          <span className="text-caption text-fg-faint">{t('Desktop values')}</span>
          {onEdit && <button type="button" onClick={() => onEdit(foundation)} className={BTN}>{t('Edit in Variables')}</button>}
        </>
      )}
    >
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
            {rows.map((row) => (
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
  )
}
