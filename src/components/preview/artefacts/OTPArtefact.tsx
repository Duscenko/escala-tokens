import { SPECIMENS } from '../../configurator/docs/specimens'
import { spacingRoleOf, typeStyleOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import { DeviceFrame } from './DeviceFrame'
import type { ArtefactProps } from './types'

const Card = SPECIMENS.Card
const Button = SPECIMENS.Button
const InputOTP = SPECIMENS.InputOTP
const TextLink = SPECIMENS.TextLink
const InlineAlert = SPECIMENS.InlineAlert

const gap = (t: PreviewTokens, role: string, fb: string) => spacingRoleOf(t, role, fb)

/**
 * OTP / 2FA — step two of the Login flow.
 *
 * The screen `Login` never touches: every colour on it was `content`/`action`
 * (accent, neutral, on-brand). This one exists specifically to exercise the
 * STATUS ramp — `InlineAlert`'s `Status: 'Error'` is the first live use of
 * `errorColor` in any artefact. `InputOTP` needs no `w` override: six fixed
 * digit boxes plus five gaps sit well under the frame's content width at every
 * size, so it's centred rather than stretched.
 */
function OTPScreen({ t, compact }: ArtefactProps) {
  const muted = t.fgMuted || '#717680'

  return (
    <DeviceFrame t={t} compact={compact}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-section', '24px') }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-tight', '4px') }}>
          <h3 style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>
            Enter verification code
          </h3>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            We sent a 6-digit code to you@company.com
          </p>
        </div>

        {/* Same elevated sheet as Login's — this is step two of that flow, so
            the two screens have to agree about what a content surface is. It
            also gives the STATUS ramp a real surface to sit on rather than the
            bare page. See `SpecimenProps.elev`. */}
        <Card t={t} v={{}} w="100%" elev="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-group', '16px') }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <InputOTP t={t} v={{ State: 'Filled' }} />
            </div>

            <InlineAlert t={t} v={{ Status: 'Error' }} w="100%">
              <span style={{ ...typeStyleOf(t, 'button') }}>Incorrect code</span>
              <span style={{ ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
                2 attempts remaining before it resets.
              </span>
            </InlineAlert>

            <Button t={t} v={{ Style: 'Solid', Size: 'LG' }} w="100%">Verify</Button>
          </div>
        </Card>

        <p style={{ margin: 0, textAlign: 'center', ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
          Didn’t get a code?{' '}
          <TextLink t={t} v={{}}>Resend</TextLink>
        </p>
      </div>
    </DeviceFrame>
  )
}

export const OTP_ARTEFACT = {
  key: 'otp',
  label: 'Verify code',
  hint: 'A 2FA / OTP step, the first artefact to exercise the status (error) ramp.',
  viewport: 'mobile' as const,
  render: (p: ArtefactProps) => <OTPScreen {...p} />,
}
