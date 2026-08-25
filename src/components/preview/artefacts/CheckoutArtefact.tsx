import { SPECIMENS } from '../../configurator/docs/specimens'
import { spacingRoleOf, typeStyleOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import { DeviceFrame } from './DeviceFrame'
import type { ArtefactProps } from './types'

const Button = SPECIMENS.Button
const Input = SPECIMENS.Input
const Divider = SPECIMENS.Divider
const InlineAlert = SPECIMENS.InlineAlert

const gap = (t: PreviewTokens, role: string, fb: string) => spacingRoleOf(t, role, fb)

/** One receipt row — label left, amount right. No cataloged component is a
 *  line-item row; this is composition, same as `Feature` in `PricingArtefact`.
 *  `bold` only changes weight, never introduces a role the type system
 *  doesn't already carry (Total reads `button`, the system's one semibold
 *  body-scale role, rather than a hand-picked font-weight). */
function LineItem({ t, label, amount, bold }: { t: PreviewTokens; label: string; amount: string; bold?: boolean }) {
  const role = bold ? 'button' : 'body-sm'
  // The amount stays full-contrast even on a muted (non-bold) row — a receipt
  // reads left-to-right as "what" (muted) then "how much" (always legible),
  // not two columns of the same weight.
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ ...typeStyleOf(t, role), color: bold ? t.neutralText : (t.fgMuted || '#717680') }}>{label}</span>
      <span style={{ ...typeStyleOf(t, role), color: t.neutralText }}>{amount}</span>
    </div>
  )
}

/**
 * Checkout — paying for the plan chosen on `Pricing`.
 *
 * Reuses `Input`'s real `Default`/`E-Mail` types for contact fields — no
 * invented "Card number" type: the catalogue's `Input` axis is a closed set
 * that mirrors the plugin's real Figma variants, and adding a fake one here
 * would claim a control the system doesn't actually ship. `InlineAlert`'s
 * `Status: 'Success'` is the second status colour an artefact exercises
 * (after OTP's `Error`) — SAME component, opposite status, so the two
 * artefacts together prove the ramp works both directions.
 */
function CheckoutScreen({ t, compact }: ArtefactProps) {
  const muted = t.fgMuted || '#717680'

  return (
    <DeviceFrame t={t} compact={compact}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-section', '24px') }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-tight', '4px') }}>
          <h3 style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>
            Checkout
          </h3>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            Review your order before you pay.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-group', '16px') }}>
          <Input t={t} v={{ Type: 'Default' }} w="100%" />
          <Input t={t} v={{ Type: 'E-Mail' }} w="100%" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: gap(t, 'gap-control', '8px') }}>
          <LineItem t={t} label="Pro plan (monthly)" amount="$12.00" />
          <LineItem t={t} label="Promo SAVE20" amount="−$2.40" />
          <Divider t={t} v={{}} w="100%" />
          <LineItem t={t} label="Total" amount="$9.60" bold />
        </div>

        <InlineAlert t={t} v={{ Status: 'Success' }} w="100%">
          <span style={{ ...typeStyleOf(t, 'button') }}>Promo applied</span>
          <span style={{ ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            SAVE20 took 20% off your first month.
          </span>
        </InlineAlert>

        <Button t={t} v={{ Style: 'Solid', Size: 'LG' }} w="100%">Pay $9.60</Button>
      </div>
    </DeviceFrame>
  )
}

export const CHECKOUT_ARTEFACT = {
  key: 'checkout',
  label: 'Checkout',
  hint: 'An order summary — reuses real Input types, no invented variants.',
  viewport: 'mobile' as const,
  render: (p: ArtefactProps) => <CheckoutScreen {...p} />,
}
