// Screen patterns — the five artefacts the configurator renders
// (`components/preview/artefacts/`), written down as data so the agent package
// can teach them without importing React.
//
// This is a MIRROR, held to its source by agentContextAudit.test.ts: every
// component listed must be a `SPECIMENS.<Key>` the artefact renders, and every
// spacing, type and radius role must be one the artefact reads. Add or change
// an artefact → update its entry here, or the test fails.
//
// Only the composition lives here (which components, which roles). Every value
// (px, Figma name, CSS variable) is resolved from the payload when the skill
// is generated.

export interface ScreenPart {
  /** Catalogue key. */
  key: string
  /** The catalogue axis values this screen renders it with (default when absent). */
  axes?: Record<string, string>
  /** What it is for on this screen. */
  use: string
}

export interface ScreenPattern {
  key: string
  label: string
  /** The artefact source it mirrors, under `components/preview/artefacts/`. */
  source: string
  purpose: string
  parts: ScreenPart[]
  /** Spacing roles, from the outside in. */
  spacing: { role: string; between: string }[]
  type: { role: string; use: string }[]
  radius?: { role: string; use: string }[]
  /** The shadow step of the main card (`elev`). */
  cardShadow?: string
}

export const SCREEN_PATTERNS: ScreenPattern[] = [
  {
    key: 'login',
    label: 'Login',
    source: 'LoginArtefact.tsx',
    purpose: 'Sign in with email and password, or with a provider.',
    parts: [
      { key: 'Card', use: 'the sign-in surface holding the whole form' },
      { key: 'Input', use: 'email, then password, full width' },
      { key: 'Checkbox', axes: { Checked: 'True' }, use: 'remember me' },
      { key: 'Button', axes: { Variant: 'default', Size: 'lg' }, use: 'sign in: the one primary action, full width' },
      { key: 'Separator', use: 'the "or" rule, a separator on each side of the word' },
      { key: 'SocialLoginButton', axes: { Provider: 'google' }, use: 'one per provider (google, apple), full width' },
    ],
    spacing: [
      { role: 'gap-section', between: 'brand, title block, card, footer line' },
      { role: 'gap-group', between: 'the controls inside the card' },
      { role: 'gap-control', between: 'the provider buttons; the "or" rule and its word' },
      { role: 'gap-tight', between: 'brand mark and name; title and subtitle' },
    ],
    type: [
      { role: 'heading-sm', use: 'screen title' },
      { role: 'body-sm', use: 'subtitle and the sign-up footer line' },
      { role: 'label', use: 'brand name' },
      { role: 'helper', use: 'the word "or"' },
    ],
    radius: [{ role: 'container', use: 'the brand mark tile' }],
    cardShadow: 'lg',
  },
  {
    key: 'otp',
    label: 'Verify code',
    source: 'OTPArtefact.tsx',
    purpose: 'Enter a one-time code; show the error in place.',
    parts: [
      { key: 'Card', use: 'the surface' },
      { key: 'InputOTP', axes: { State: 'Filled' }, use: 'the code' },
      { key: 'Alert', axes: { Variant: 'destructive' }, use: 'a wrong or expired code' },
      { key: 'Button', axes: { Variant: 'default', Size: 'lg' }, use: 'verify, full width' },
    ],
    spacing: [
      { role: 'gap-section', between: 'title block, card, resend line' },
      { role: 'gap-group', between: 'code, alert and button inside the card' },
      { role: 'gap-tight', between: 'title and subtitle' },
    ],
    type: [
      { role: 'heading-sm', use: 'screen title' },
      { role: 'body-sm', use: 'explanation and the resend line' },
    ],
    cardShadow: 'lg',
  },
  {
    key: 'pricing',
    label: 'Pricing',
    source: 'PricingArtefact.tsx',
    purpose: 'Pick a plan; the recommended one is marked.',
    parts: [
      { key: 'RadioGroup', use: 'billing period, above the plan' },
      { key: 'Card', use: 'the plan' },
      { key: 'Badge', axes: { Variant: 'secondary' }, use: '"Most popular" on the recommended plan' },
      { key: 'Button', axes: { Variant: 'default', Size: 'lg' }, use: 'choose the plan' },
    ],
    spacing: [
      { role: 'gap-section', between: 'title block, period, plan card' },
      { role: 'gap-control', between: 'feature rows; a check icon and its text' },
      { role: 'gap-tight', between: 'title and subtitle' },
    ],
    type: [
      { role: 'heading-sm', use: 'screen title' },
      { role: 'heading-xs', use: 'plan name' },
      { role: 'heading-lg', use: 'price' },
      { role: 'body-sm', use: 'subtitle, "/ month" and features' },
    ],
    cardShadow: 'xl',
  },
  {
    key: 'checkout',
    label: 'Checkout',
    source: 'CheckoutArtefact.tsx',
    purpose: 'Pay: order summary, payment fields, confirmation.',
    parts: [
      { key: 'Input', use: 'payment fields, full width, on the page' },
      { key: 'Card', use: 'the order summary' },
      { key: 'Separator', use: 'between the line items and the total' },
      { key: 'Alert', axes: { Variant: 'default' }, use: 'payment confirmed' },
      { key: 'Button', axes: { Variant: 'default', Size: 'lg' }, use: 'pay, full width' },
    ],
    spacing: [
      { role: 'gap-section', between: 'title block, fields, summary, alert, button' },
      { role: 'gap-group', between: 'the payment fields' },
      { role: 'gap-control', between: 'summary lines' },
      { role: 'gap-tight', between: 'title and subtitle' },
    ],
    type: [
      { role: 'heading-sm', use: 'screen title' },
      { role: 'body-sm', use: 'subtitle and line items' },
    ],
    cardShadow: 'sm',
  },
  {
    key: 'profile',
    label: 'Profile',
    source: 'ProfileArtefact.tsx',
    purpose: 'Account settings: identity, preferences, a destructive action last.',
    parts: [
      { key: 'Avatar', axes: { Size: 'lg' }, use: 'the person, in the header row' },
      { key: 'StatusBadge', axes: { Status: 'online' }, use: 'presence, end of the header row' },
      { key: 'Card', use: 'the notification settings: a list of Switches, each labelled through a Field' },
      { key: 'Button', axes: { Variant: 'destructive', Size: 'lg' }, use: 'delete the account, last on the page' },
    ],
    spacing: [
      { role: 'gap-section', between: 'header row, settings card, danger zone' },
      { role: 'gap-group', between: 'avatar and the name block' },
      { role: 'gap-control', between: 'the danger-zone caption and its button' },
      { role: 'gap-tight', between: 'name and email' },
    ],
    type: [
      { role: 'heading-xs', use: 'the name' },
      { role: 'body-sm', use: 'the email' },
      { role: 'caption', use: 'the danger-zone caption' },
    ],
    cardShadow: 'md',
  },
]
