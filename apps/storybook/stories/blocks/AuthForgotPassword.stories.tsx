import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthForgotPassword, AUTH_CONTAINERS, AUTH_STATUSES, type AuthContainer, type AuthStatus } from '../../../../src/components/escala-ui/blocks/auth'

/** Story args = the Figma `AuthForgotPassword` set (Auth page): `Container` card · plain, and Method email · sms. `Status` is the state the form can reach
 *  (code only; Figma draws idle). The block is built from escala-ui components and role tokens alone. */
interface Args {
  container: AuthContainer
  status: AuthStatus
  method: 'email' | 'sms'
}

const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>{children}</div>

const meta: Meta<Args> = {
  title: 'Blocks/Auth/ForgotPassword',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (args) => <AuthForgotPassword container={args.container} status={args.status} method={args.method} />,
  args: { container: 'card', status: 'idle', method: 'email' },
  argTypes: {
    container: { name: 'Container', control: 'select', options: [...AUTH_CONTAINERS] },
    status: { name: 'Status', control: 'select', options: [...AUTH_STATUSES], description: 'The state the form is in: idle · invalid · loading · success.' },
    method: { name: 'Method', control: 'select', options: ['email', 'sms'] },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

/** Both Container values, as the Figma set draws them. */
export const Containers: Story = {
  render: (args) => (
    <Row>
      {AUTH_CONTAINERS.map((container) => <AuthForgotPassword key={container} container={container} status={args.status} method={args.method} />)}
    </Row>
  ),
}

/** Every state the form can reach, side by side. */
export const States: Story = {
  render: (args) => (
    <Row>
      {AUTH_STATUSES.map((status) => <AuthForgotPassword key={status} container={args.container} status={status} method={args.method} />)}
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
        <AuthForgotPassword key={run} container={args.container} status={status} method={args.method} />
      </div>
    )
  },
}
