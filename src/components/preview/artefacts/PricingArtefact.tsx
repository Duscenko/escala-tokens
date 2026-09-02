import { SPECIMENS, TokenIcon } from '../../configurator/docs/specimens'
import { spacingRoleOf, typeStyleOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import { DeviceFrame } from './DeviceFrame'
import type { ArtefactProps } from './types'

const Button = SPECIMENS.Button
const Badge = SPECIMENS.Badge
const Card = SPECIMENS.Card
const RadioGroup = SPECIMENS.RadioGroup

const gap = (t: PreviewTokens, role: string, fb: string) => spacingRoleOf(t, role, fb)

const FEATURES = ['Unlimited design systems', 'Figma live sync', 'Priority support']

/** One feature row — a check glyph plus a line of copy. Not a cataloged
 *  component (the catalogue has no "feature list"), so this is composition,
 *  same class as Login's brand lockup: the glyph itself still comes from
 *  `TokenIcon`, the system's own icon library, never a hand-drawn SVG. */
function Feature({ t, children }: { t: PreviewTokens; children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gap(t, 'gap-control', '8px') }}>
      <TokenIcon t={t} concept="check" size={16} color={t.brandSolid} />
      <span style={{ ...typeStyleOf(t, 'body-sm'), color: t.neutralText }}>{children}</span>
    </div>
  )
}

/**
 * Pricing — choosing a plan.
 *
 * `RadioGroup`'s own demo content ("Monthly billing" / "Yearly billing — save
 * 20%" / "Lifetime") already IS a billing-period picker — used verbatim, no
 * `children` override needed, unlike everything inside `Card`. `Card` is the
 * one specimen extended to take arbitrary `children`: its chrome (border,
 * radius, shadow, the `inset-surface` padding) is the reusable, token-driven
 * part; a real plan's name, price and feature list is composition, the same
 * "system owns the component, composition owns the copy" split `LoginArtefact`
 * documents for its own prose.
 */
function PricingScreen({ t, compact }: ArtefactProps) {
  const muted = t.fgMuted || '#717680'

  return (
    <DeviceFrame t={t} compact={compact}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-section', '24px') }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-tight', '4px') }}>
          <h3 style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>
            Choose your plan
          </h3>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            Upgrade anytime. Cancel whenever.
          </p>
        </div>

        <RadioGroup t={t} v={{}} />

        {/* The top of the ramp. A "Most popular" plan is the one card in the
            whole artefact set whose whole job is to sit ABOVE everything around
            it, so it takes `xl` — the step nothing else uses. See
            `SpecimenProps.elev`. */}
        <Card t={t} v={{}} w="100%" elev="xl">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...typeStyleOf(t, 'heading-xs'), color: t.neutralText }}>Pro</span>
            <Badge t={t} v={{ Color: 'Brand', Style: 'Soft' }}>Most popular</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ ...typeStyleOf(t, 'heading-lg'), color: t.neutralText }}>$12</span>
            <span style={{ ...typeStyleOf(t, 'body-sm'), color: muted }}>/ month</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-control', '8px') }}>
            {FEATURES.map((f) => <Feature key={f} t={t}>{f}</Feature>)}
          </div>

          <Button t={t} v={{ Style: 'Solid', Size: 'LG' }} w="100%">Continue with Pro</Button>
        </Card>
      </div>
    </DeviceFrame>
  )
}

export const PRICING_ARTEFACT = {
  key: 'pricing',
  label: 'Pricing',
  hint: 'A plan picker — the first artefact to compose radius, shadow and Card together.',
  viewport: 'mobile' as const,
  render: (p: ArtefactProps) => <PricingScreen {...p} />,
}
