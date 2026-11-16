import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthAccountLocked, AUTH_CONTAINERS, AUTH_STATUSES, type AuthContainer, type AuthStatus } from '../../../../src/components/escala-ui/blocks/auth'

/** Story args = the Figma `AuthAccountLocked` set (Auth page): `Container` card · plain. `Status` is the state the form can reach
 *  (code only; Figma draws idle). The block is built from escala-ui components and role tokens alone. */
interface Args {
  container: AuthContainer
}

const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>{children}</div>

const meta: Meta<Args> = {
  title: 'Blocks/Auth/AccountLocked',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (args) => <AuthAccountLocked container={args.container} />,
  args: { container: 'card' },
  argTypes: {
    container: { name: 'Container', control: 'select', options: [...AUTH_CONTAINERS] },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

/** Both Container values, as the Figma set draws them. */
export const Containers: Story = {
  render: (args) => (
    <Row>
      {AUTH_CONTAINERS.map((container) => <AuthAccountLocked key={container} container={container} />)}
    </Row>
  ),
}

/**
 * Motion. The body of the block rises on `use-page-transition` every time the block mounts (a content swap), an inline notice
 * opens on `use-disclosure-in` and closes on `use-disclosure-out`, a success moment rises once on `use-celebration`. Replay remounts the block;
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
        <AuthAccountLocked key={run} container={args.container} />
      </div>
    )
  },
}
