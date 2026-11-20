import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AuthPasskeySetup, AuthPasskeySetupIndicator, AUTH_PASSKEY_SETUP_TYPES, AUTH_PASSKEY_SETUP_VARIANTS, AUTH_SETUP_STATUSES,
  type AuthPasskeySetupType, type AuthSetupStatus,
} from '../../../../src/components/escala-ui/blocks/authSetup'
import { AuthPasskeySetupDemo } from '../../../../src/components/escala-ui/blocks/authSetupDemo'

/** Story args = the Figma `AuthPasskeySetup` set (page AuthPasskeySetup (PRO)): `Type` intro · confirm · saved × `Status` active · error · completed.
 *  The file draws five pairs (intro·active, confirm·active / error / completed, saved·completed); any other pair draws the nearest one.
 *  The block is the system's Modal (tray, lg, no close) filled with escala-ui components; `Flow` plays it with a mocked WebAuthn request. */
interface Args {
  type: AuthPasskeySetupType
  status: AuthSetupStatus
}

const Column = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>{children}</div>
const variant = (type: AuthPasskeySetupType, status: AuthSetupStatus): Story => ({ name: `${type} · ${status}`, args: { type, status } })

const meta: Meta<Args> = {
  title: 'Blocks/Auth/PasskeySetup',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (args) => <AuthPasskeySetup inline type={args.type} status={args.status} />,
  args: { type: 'intro', status: 'active' },
  argTypes: {
    type: { name: 'Type', control: 'select', options: [...AUTH_PASSKEY_SETUP_TYPES], description: 'The step: intro · confirm · saved.' },
    status: { name: 'Status', control: 'select', options: [...AUTH_SETUP_STATUSES], description: 'Where the WebAuthn request stands on confirm. intro is always active, saved always completed.' },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

export const IntroActive: Story = variant('intro', 'active')
export const ConfirmActive: Story = variant('confirm', 'active')
export const ConfirmError: Story = variant('confirm', 'error')
export const ConfirmCompleted: Story = variant('confirm', 'completed')
export const SavedCompleted: Story = variant('saved', 'completed')

/** The five pairs the Figma set draws, one under the other: the card keeps one size. */
export const AllVariants: Story = {
  name: 'All variants',
  render: () => <Column>{AUTH_PASSKEY_SETUP_VARIANTS.map(([type, status]) => <AuthPasskeySetup key={`${type}-${status}`} inline type={type} status={status} />)}</Column>,
}

/** The same five pairs in Escala Dark (the toolbar switches any story). */
export const AllVariantsDark: Story = { ...AllVariants, name: 'All variants · Dark', globals: { theme: 'dark' } }

/** The part `AuthPasskeySetupIndicator`, its three Status values. With `onSensorClick` the sensor is a button (a simulated prompt). */
export const Indicator: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 592, maxWidth: '100%' }}>
      {AUTH_SETUP_STATUSES.map((status) => <AuthPasskeySetupIndicator key={status} status={status} />)}
    </div>
  ),
}

/**
 * The flow, with a mocked WebAuthn request. Create passkey starts it and the request stays pending until you click the sensor;
 * it then saves and lands on the last step. `Outcome` error cancels the first request, as a dismissed platform prompt would:
 * Try again then succeeds. Back aborts a pending request. Focus moves to each step's heading.
 */
export const Flow: StoryObj<Args & { outcome: 'success' | 'error' }> = {
  args: { outcome: 'success' },
  argTypes: {
    outcome: { name: 'Outcome', control: 'inline-radio', options: ['success', 'error'], description: 'Story only: what the mocked authenticator answers the first time.' },
    type: { table: { disable: true } },
    status: { table: { disable: true } },
  },
  render: (args) => <AuthPasskeySetupDemo key={args.outcome} inline outcome={args.outcome} />,
}

/** The real dialog: trigger, scrim, focus trap, Escape. Its open and close are the Modal's own motion; the card never moves between steps. */
export const Dialog: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open AuthPasskeySetup</button>
        <AuthPasskeySetupDemo inline={false} open={open} onOpenChange={setOpen} />
      </>
    )
  },
}

/**
 * Motion. A step swap fades its content in on `use-page-transition`; the ring turns on `use-loop` while the device is asked;
 * an error arrives on `use-disclosure-in`; the check lands on `use-emphasis-in`. Replay remounts the block on the chosen pair.
 * Check reduced motion with the OS setting (the ring stands still, the fades stay).
 */
export const Motion: Story = {
  render: () => {
    const [run, setRun] = React.useState(0)
    const [pair, setPair] = React.useState(1)
    const [type, status] = AUTH_PASSKEY_SETUP_VARIANTS[pair]
    return (
      <Column>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {AUTH_PASSKEY_SETUP_VARIANTS.map(([t, s], i) => <button key={`${t}-${s}`} aria-pressed={i === pair} onClick={() => setPair(i)}>{t} · {s}</button>)}
          <button onClick={() => setRun((n) => n + 1)}>Replay mount</button>
        </div>
        <AuthPasskeySetup key={run} inline type={type} status={status} />
      </Column>
    )
  },
}
