// Radius foundation specimen — one card per semantic role, with the catalogue
// components that bind that role, plus an edit affordance that jumps the
// Variables table to the row (same contract as TypeRolesPreview).

import type { PreviewTokens } from '../ButtonPreview'
import { radiusRoleOf } from '../../../lib/previewTokens'
import { LAYOUT_ROLE_GROUPS, LAYOUT_ROLES } from '../../../lib/layoutTokens'
import { SPECIMENS } from '../../configurator/docs/specimens'
import { RoleEditCard } from './RoleEditCard'

const ButtonSpec = SPECIMENS.Button
const InputSpec = SPECIMENS.Input
const CheckboxSpec = SPECIMENS.Checkbox
const CardSpec = SPECIMENS.Card
const BadgeSpec = SPECIMENS.Badge
const SwitchSpec = SPECIMENS.Toggle
const AvatarSpec = SPECIMENS.Avatar
const PopoverSpec = SPECIMENS.Popover

function Examples({ role, tokens: t }: { role: string; tokens: PreviewTokens }) {
  if (role === 'control') {
    return (
      <>
        <CheckboxSpec t={t} v={{ Checked: 'True' }} />
        <CheckboxSpec t={t} v={{ Checked: 'False' }} />
      </>
    )
  }
  if (role === 'action') {
    return (
      <>
        <ButtonSpec t={t} v={{ Style: 'Solid' }} />
        <ButtonSpec t={t} v={{ Style: 'Outline' }} />
        <InputSpec t={t} v={{}} />
      </>
    )
  }
  if (role === 'container') return <CardSpec t={t} v={{}} />
  if (role === 'overlay') {
    return (
      <div className="w-full min-w-0 overflow-hidden">
        <PopoverSpec t={t} v={{}} />
      </div>
    )
  }
  if (role === 'pill') {
    return (
      <>
        <BadgeSpec t={t} v={{ Style: 'Solid', Color: 'Brand' }} />
        <BadgeSpec t={t} v={{ Style: 'Soft', Color: 'Neutral' }} />
        <SwitchSpec t={t} v={{ On: 'True' }} />
        <AvatarSpec t={t} v={{ Size: 'MD' }} />
      </>
    )
  }
  return null
}

export function RadiusRolesPreview({
  tokens,
  onEditRole,
}: {
  tokens: PreviewTokens
  onEditRole?: (key: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {LAYOUT_ROLE_GROUPS.radius.map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{g.label}</span>
          {LAYOUT_ROLES.radius.filter((r) => r.group === g.id).map((role) => {
            const r = radiusRoleOf(tokens, role.key)
            const accent = tokens.brandSolid ?? '#7f56d9'
            return (
              <RoleEditCard
                key={role.key}
                tokens={tokens}
                token={`radius-${role.key}`}
                label={role.label}
                swatch={(
                  <span
                    className="flex-shrink-0 mt-0.5"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: r,
                      background: accent + '22',
                      border: `1.5px solid ${accent}66`,
                    }}
                    aria-hidden
                  />
                )}
                onEdit={onEditRole ? () => onEditRole(role.key) : undefined}
              >
                <Examples role={role.key} tokens={tokens} />
              </RoleEditCard>
            )
          })}
        </section>
      ))}
    </div>
  )
}
