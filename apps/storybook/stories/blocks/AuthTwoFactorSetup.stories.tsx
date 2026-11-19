import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AuthTwoFactorSetup, AuthTwoFactorSetupGroup, AuthTwoFactorSetupItem, AuthTwoFactorSetupQR, AUTH_SETUP_STATUSES, AUTH_TWO_FACTOR_SETUP_TYPES, AUTH_TWO_FACTOR_SETUP_VARIANTS,
  type AuthSetupStatus, type AuthTwoFactorSetupType,
} from '../../../../src/components/escala-ui/blocks/authSetup'
import { AuthTwoFactorSetupDemo } from '../../../../src/components/escala-ui/blocks/authSetupDemo'

/** Story args = the Figma `AuthTwoFactorSetup` set (page AuthTwoFactorSetup (PRO)): `Type` scan · verify · backup × `Status` active · error · completed.
 *  The file draws six pairs (scan·active, verify·active / error / completed, backup·active / completed); any other pair draws the nearest one.
 *  The block is the system's Modal (tray, lg, no close) filled with escala-ui components; `Flow` plays it with a mocked authenticator app. */
interface Args {
  type: AuthTwoFactorSetupType
  status: AuthSetupStatus
}

const Column = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>{children}</div>
/** The code a static pair shows in its field: the rejected one on error, the accepted one while it is checked. */
const codeOf = (type: AuthTwoFactorSetupType, status: AuthSetupStatus) => (type !== 'verify' || status === 'active' ? '' : status === 'error' ? '318205' : '440912')
const block = (type: AuthTwoFactorSetupType, status: AuthSetupStatus) => <AuthTwoFactorSetup key={`${type}-${status}`} inline type={type} status={status} defaultCode={codeOf(type, status)} />
const variant = (type: AuthTwoFactorSetupType, status: AuthSetupStatus): Story => ({ name: `${type} · ${status}`, args: { type, status } })

const meta: Meta<Args> = {
  title: 'Blocks/Auth/TwoFactorSetup',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (args) => block(args.type, args.status),
  args: { type: 'scan', status: 'active' },
  argTypes: {
    type: { name: 'Type', control: 'select', options: [...AUTH_TWO_FACTOR_SETUP_TYPES], description: 'The step: scan · verify · backup.' },
    status: { name: 'Status', control: 'select', options: [...AUTH_SETUP_STATUSES], description: 'On verify, where the check stands. On backup, completed once the codes are acknowledged. scan is always active.' },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

export const ScanActive: Story = variant('scan', 'active')
export const VerifyActive: Story = variant('verify', 'active')
export const VerifyError: Story = variant('verify', 'error')
export const VerifyCompleted: Story = variant('verify', 'completed')
export const BackupActive: Story = variant('backup', 'active')
export const BackupCompleted: Story = variant('backup', 'completed')

/** The six pairs the Figma set draws, one under the other: the card keeps one size. */
export const AllVariants: Story = {
  name: 'All variants',
  render: () => <Column>{AUTH_TWO_FACTOR_SETUP_VARIANTS.map(([type, status]) => block(type, status))}</Column>,
}

/** The same six pairs in Escala Dark (the toolbar switches any story). The QR stays black on white: a scanner needs it. */
export const AllVariantsDark: Story = { ...AllVariants, name: 'All variants · Dark', globals: { theme: 'dark' } }

/** The parts the page keeps: the QR artwork, the simulated authenticator row and the backup codes. */
export const Parts: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start', width: 592, maxWidth: '100%' }}>
      <AuthTwoFactorSetupQR />
      <AuthTwoFactorSetupItem />
      <AuthTwoFactorSetupGroup />
    </div>
  ),
}

/**
 * The flow, with a mocked authenticator app. Continue moves to the code: focus lands in its first slot. Click the app's code to
 * type it (or type any six digits: only the code the app shows now passes, and it rotates every 30 seconds). A wrong code turns
 * the field invalid until you type again. Turn on waits for the checkbox, then confirms with a Toast.
 */
export const Flow: Story = {
  argTypes: { type: { table: { disable: true } }, status: { table: { disable: true } } },
  render: () => <AuthTwoFactorSetupDemo inline />,
}

/** The real dialog: trigger, scrim, focus trap, Escape. Turn on closes it and shows the Toast. */
export const Dialog: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open AuthTwoFactorSetup</button>
        <AuthTwoFactorSetupDemo inline={false} open={open} onOpenChange={setOpen} />
      </>
    )
  },
}

/**
 * Motion. A step swap fades its content in on `use-page-transition`; an error arrives on `use-disclosure-in`. Replay remounts the
 * block on the chosen pair. Check reduced motion with the OS setting (the fades stay, the travel goes).
 */
export const Motion: Story = {
  render: () => {
    const [run, setRun] = React.useState(0)
    const [pair, setPair] = React.useState(2)
    const [type, status] = AUTH_TWO_FACTOR_SETUP_VARIANTS[pair]
    return (
      <Column>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {AUTH_TWO_FACTOR_SETUP_VARIANTS.map(([t, s], i) => <button key={`${t}-${s}`} aria-pressed={i === pair} onClick={() => setPair(i)}>{t} · {s}</button>)}
          <button onClick={() => setRun((n) => n + 1)}>Replay mount</button>
        </div>
        <React.Fragment key={run}>{block(type, status)}</React.Fragment>
      </Column>
    )
  },
}
