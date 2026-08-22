import { useState } from 'react'
import type { PreviewTokens } from '../ButtonPreview'
import { fontStack } from '../../../lib/fonts'
import {
  TYPE_ROLE_GROUPS,
  mergeTypeRoles,
  resolveTypeStyle,
  typeRolesInGroup,
  type TypeRoleGroupId,
} from '../../../lib/typeRoles'

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.2 2.6 11.4 5.8" />
      <path d="M5.1 11.4 2.6 11.4 2.6 8.9 9.3 2.2c.4-.4 1-.4 1.4 0l1.1 1.1c.4.4.4 1 0 1.4z" />
    </svg>
  )
}

export function TypeRolesPreview({
  tokens,
  focus = 'all',
  onEditRole,
}: {
  tokens: PreviewTokens
  focus?: TypeRoleGroupId | 'all'
  /** Jump the Variables table to this role's row. */
  onEditRole?: (key: string) => void
}) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const ty = tokens.typography
  const roles = mergeTypeRoles(ty.roles)
  const groups = focus === 'all' ? TYPE_ROLE_GROUPS : TYPE_ROLE_GROUPS.filter((g) => g.id === focus)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Text roles</span>
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-elevated border border-line">
          {(['desktop', 'mobile'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewport(v)}
              aria-pressed={viewport === v}
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                viewport === v ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg-muted'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {groups.map((g) => (
        <div key={g.id} className="flex flex-col gap-1.5">
          {focus === 'all' && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">{g.label}</span>
          )}
          {typeRolesInGroup(g.id).map((role) => {
            const style = resolveTypeStyle(roles[role.key][viewport], ty)
            const editable = Boolean(onEditRole)
            const Card = editable ? 'button' : 'div'
            return (
              <Card
                key={role.key}
                {...(editable
                  ? {
                      type: 'button' as const,
                      onClick: () => onEditRole?.(role.key),
                      title: `Edit text-${role.key} in the table`,
                      'aria-label': `Edit text-${role.key} in the table`,
                    }
                  : {})}
                className={`relative rounded-xl border border-line bg-app px-3 py-2 min-w-0 text-left block w-full ${
                  editable
                    ? 'group hover:border-line-strong hover:bg-elevated/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg transition-colors cursor-pointer'
                    : ''
                }`}
              >
                <span className="block text-[10px] font-mono text-fg-faint truncate pr-6">text-{role.key}</span>
                <span
                  className="block text-fg truncate"
                  style={{
                    fontFamily: fontStack(style.family),
                    fontSize: Math.min(parseInt(style.size, 10) || 16, 28),
                    fontWeight: style.weight,
                    lineHeight: 1.25,
                  }}
                >
                  {role.label}
                </span>
                {editable && (
                  <span className="absolute top-2 right-2 text-fg-faint group-hover:text-fg group-focus-visible:text-fg transition-colors">
                    <EditIcon />
                  </span>
                )}
              </Card>
            )
          })}
        </div>
      ))}
    </div>
  )
}
