import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthOTPVerification, AUTH_CONTAINERS, AUTH_LAYOUTS, authPlacement, type AuthLayout, AUTH_STATUSES, type AuthContainer, type AuthStatus } from '../../../../src/components/escala-ui/blocks/auth'

/** Story args = the Figma `AuthOTPVerification` set (Auth page): `Container` card · plain × `Layout` stacked · inline (inline only on plain). `Status` is the state the form can reach
 *  (code only; Figma draws idle). The block is built from escala-ui components and role tokens alone. */
interface Args {
  container: AuthContainer
  layout: AuthLayout
  status: AuthStatus
}

const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>{children}</div>

const meta: Meta<Args> = {
  title: 'Blocks/Auth/OTPVerification',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (args) => <AuthOTPVerification {...authPlacement(args.container, args.layout)} status={args.status} />,
  args: { container: 'card', layout: 'stacked', status: 'idle' },
  argTypes: {
    container: { name: 'Container', control: 'select', options: [...AUTH_CONTAINERS] },
    layout: { name: 'Layout', control: 'select', options: [...AUTH_LAYOUTS], description: 'inline: the desktop page, only with Container plain. Modals and phones stay stacked.' },
    status: { name: 'Status', control: 'select', options: [...AUTH_STATUSES], description: 'The state the form is in: idle · invalid · loading · success.' },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

/** Both Container values, as the Figma set draws them. */
export const Containers: Story = {
  render: (args) => (
    <Row>
      {AUTH_CONTAINERS.map((container) => <AuthOTPVerification key={container} container={container} status={args.status} />)}
    </Row>
  ),
}

/** Every state the form can reach, side by side. */
export const States: Story = {
  render: (args) => (
    <Row>
      {AUTH_STATUSES.map((status) => <AuthOTPVerification key={status} {...authPlacement(args.container, args.layout)} status={status} />)}
    </Row>
  ),
}

/**
 * Motion. The body of the block rises on `use-page-transition` every time the block mounts (a content swap), an inline notice
 * opens on `use-disclosure-in` and closes on `use-disclosure-out`. Replay remounts the block;
 * check reduced motion with the OS setting (the tokens neutralise travel and keep the fade).
 */
export const Motion: Story = {
  render: (args) => {
    const [run, setRun] = React.useState(0)
    const [status, setStatus] = React.useState<AuthStatus>('idle')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setRun((n) => n + 1)}>Replay mount</button>
          <button onClick={() => setStatus((s) => (s === 'invalid' ? 'idle' : 'invalid'))}>Toggle notice</button>
        </div>
        <AuthOTPVerification key={run} {...authPlacement(args.container, args.layout)} status={status} />
      </div>
    )
  },
}

/** The desktop page: `plain` + `inline`. */
export const DesktopPage: Story = { name: 'Desktop page', render: () => <AuthOTPVerification container="plain" layout="inline" /> }

/** The mobile page: `plain` + `stacked`. */
export const MobilePage: Story = { name: 'Mobile page', render: () => <AuthOTPVerification container="plain" layout="stacked" /> }

/** The modal: `card` + `stacked`. */
export const ModalCard: Story = { name: 'Modal', render: () => <AuthOTPVerification container="card" layout="stacked" /> }
