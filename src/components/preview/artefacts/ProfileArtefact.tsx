import { SPECIMENS } from '../../configurator/docs/specimens'
import { SkeletonSettingsList } from '../../configurator/docs/skeleton/forms'
import { spacingRoleOf, typeStyleOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import { DeviceFrame } from './DeviceFrame'
import type { ArtefactProps } from './types'

const Card = SPECIMENS.Card
const Button = SPECIMENS.Button
const Avatar = SPECIMENS.Avatar
const StatusBadge = SPECIMENS.StatusBadge

const gap = (t: PreviewTokens, role: string, fb: string) => spacingRoleOf(t, role, fb)

/**
 * Profile / settings.
 *
 * The notification rows are a settings list of Switches labelled through
 * Field. The destructive action at the bottom is `Button variant="destructive"`
 * (shadcn's soft destructive: `status.critical.surface` with the severity's
 * own text), not a hand-picked red — editing those roles in Token Details
 * moves it directly.
 */
function ProfileScreen({ t, compact }: ArtefactProps) {
  const muted = t.fgMuted || '#717680'

  return (
    <DeviceFrame t={t} compact={compact}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-section', '24px') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: gap(t, 'gap-group', '16px') }}>
          <Avatar t={t} v={{ Size: 'lg' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-tight', '4px'), flex: 1, minWidth: 0 }}>
            <span style={{ ...typeStyleOf(t, 'heading-xs'), color: t.neutralText }}>Maya Duscenko</span>
            <span style={{ ...typeStyleOf(t, 'body-sm'), color: muted }}>maya@escala.ds</span>
          </div>
          <StatusBadge t={t} v={{ Status: 'online' }} />
        </div>

        {/* A grouped settings CARD, which is what a settings section actually
            is — and deliberately `md`, one step under Login's `lg` sheet. Two
            artefacts on two steps of the same ramp is what makes an elevation
            language legible; one step everywhere just reads as "there is a
            shadow". It also retires the two `Divider`s that used to fence this
            block off: a card and a rule are two answers to the same grouping
            question, and the card is the one that carries elevation. */}
        <Card t={t} v={{}} w="100%" elev="md">
          <SkeletonSettingsList
            t={t}
            control="switch"
            legend="Notifications"
            w="100%"
            rows={[
              { label: 'Email notifications', on: true },
              { label: 'Push notifications', on: true },
              { label: 'Marketing emails', on: false },
            ]}
          />
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-control', '8px') }}>
          <span
            style={{
              ...typeStyleOf(t, 'caption'), letterSpacing: '0.08em', textTransform: 'uppercase', color: muted,
            }}
          >
            Danger zone
          </span>
          <Button t={t} v={{ Variant: 'destructive', Size: 'lg' }} w="100%">Delete account</Button>
        </div>
      </div>
    </DeviceFrame>
  )
}

export const PROFILE_ARTEFACT = {
  key: 'profile',
  label: 'Profile',
  hint: 'Account settings — the first artefact to use Switch and a destructive Button.',
  viewport: 'mobile' as const,
  render: (p: ArtefactProps) => <ProfileScreen {...p} />,
}
