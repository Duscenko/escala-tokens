import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AuthSignInPasskey } from '../../../../src/components/escala-ui/blocks/auth'
import { Button } from '../../../../src/components/escala-ui/button'
import { Modal, ModalContent, ModalTrigger } from '../../../../src/components/escala-ui/modal'

/** The Figma `AuthSignInPasskey` component (2146:8197): the tray modal. The block reports what was chosen; WebAuthn lives in the app. */
const meta: Meta<typeof AuthSignInPasskey> = {
  title: 'Blocks/Auth/SignInPasskey',
  component: AuthSignInPasskey,
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  args: { onContinue: fn(), onPasskey: fn(), onProvider: fn(), onSignUp: fn() },
}
export default meta
type Story = StoryObj<typeof AuthSignInPasskey>

export const Playground: Story = {}

/** Motion: inside a Modal the overlay's `dialog-enter` / `dialog-exit` play, and the block adds nothing. */
export const Motion: Story = {
  render: (args) => (
    <Modal>
      <ModalTrigger asChild><Button>Open sign in</Button></ModalTrigger>
      <ModalContent style={{ background: 'transparent', border: 0, boxShadow: 'none', padding: 0 }}>
        <AuthSignInPasskey {...args} />
      </ModalContent>
    </Modal>
  ),
}
