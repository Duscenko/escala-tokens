import { SPECIMENS } from '../../configurator/docs/specimens'
import { radiusRoleOf, spacingRoleOf, typeStyleOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import { DeviceFrame } from './DeviceFrame'
import type { ArtefactProps } from './types'

const Input = SPECIMENS.Input
const Button = SPECIMENS.Button
const Checkbox = SPECIMENS.Checkbox
const SocialLoginButton = SPECIMENS.SocialLoginButton
const Divider = SPECIMENS.Divider
const TextLink = SPECIMENS.TextLink

/** Every gap is a spacing ROLE, never a number — `gap-group` is what the system
 *  itself calls "stacked fields", so this screen re-spaces when that role moves. */
const gap = (t: PreviewTokens, role: string, fb: string) => spacingRoleOf(t, role, fb)

/** The one horizontal rule with a word through it. Composed from the catalogue's
 *  Divider rather than a hand-drawn line, so the stroke width and colour are the
 *  system's `divider` role in both halves. */
function OrRule({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gap(t, 'gap-control', '8px') }}>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Divider t={t} v={{}} w="100%" />
      </span>
      <span style={{ ...typeStyleOf(t, 'helper', { leading: false }), color: t.fgMuted || '#717680' }}>or</span>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Divider t={t} v={{}} w="100%" />
      </span>
    </div>
  )
}

/**
 * Login — the first artefact.
 *
 * Every control is a catalogue specimen at `w: '100%'`, so the screen is made of
 * the exact renderers the Figma plugin ships; only the width (and, for Button
 * and TextLink, the label — see `SpecimenProps.children`) differ from the
 * Components playground. Most copy is still the specimen's own, unwritten
 * here — `Input`'s E-Mail and Password types already carry the right labels
 * and placeholders, `Checkbox` already reads "Remember me", and
 * `SocialLoginButton` already reads "Continue with …". The artefact supplies
 * only what no component provides on its own: the page's title/subtitle, and
 * the two labels ("Sign in", "Sign up") a generic Button/TextLink demo has no
 * way to guess.
 *
 * The CTA is `Size: 'LG'`, which resolves the same `lg` primitive the system's
 * `touch` size role points at — the role whose description is literally "Mobile
 * CTA. 48px covers HIG 44."
 */
function LoginScreen({ t, compact }: ArtefactProps) {
  const muted = t.fgMuted || '#717680'

  return (
    <DeviceFrame t={t} compact={compact}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-section', '24px') }}>
        {/* Brand lockup — no catalogue component owns a logo, so the mark is a
            plain square painted with the accent and the container radius. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: gap(t, 'gap-tight', '4px') }}>
          <span
            aria-hidden
            style={{
              width: 28, height: 28, flexShrink: 0,
              borderRadius: radiusRoleOf(t, 'container', '12px'),
              background: t.coverGradient || t.brandSolid,
            }}
          />
          <span style={{ ...typeStyleOf(t, 'label', { leading: false }), color: t.neutralText }}>Acme</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-tight', '4px') }}>
          <h3 style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>
            Welcome back
          </h3>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            Sign in to continue to your workspace.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-group', '16px') }}>
          <Input t={t} v={{ Type: 'E-Mail' }} w="100%" />
          <Input t={t} v={{ Type: 'Password' }} w="100%" />
          <Checkbox t={t} v={{ Checked: 'True' }} />
          {/* `touch` is the system's own mobile-CTA height role; LG resolves the
              same `lg` primitive it points at. */}
          <Button t={t} v={{ Style: 'Solid', Size: 'LG' }} w="100%">Sign in</Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-group', '16px') }}>
          <OrRule t={t} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-control', '8px') }}>
            <SocialLoginButton t={t} v={{ Provider: 'Google' }} w="100%" />
            <SocialLoginButton t={t} v={{ Provider: 'Apple' }} w="100%" />
          </div>
        </div>

        <p style={{ margin: 0, textAlign: 'center', ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
          Don’t have an account?{' '}
          <TextLink t={t} v={{}}>Sign up</TextLink>
        </p>
      </div>
    </DeviceFrame>
  )
}

export const LOGIN_ARTEFACT = {
  key: 'login',
  label: 'Login',
  hint: 'A sign-in screen composed from the catalogue, on the system’s mobile grid.',
  viewport: 'mobile' as const,
  render: (p: ArtefactProps) => <LoginScreen {...p} />,
}
