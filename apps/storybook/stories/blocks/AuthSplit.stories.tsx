import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthForgotPassword, AuthSignIn, AuthSplit } from '../../../../src/components/escala-ui/blocks/auth'

/** The Figma `AuthSplit` component (2146:8199): a brand panel beside any Auth block in `container="plain"`. Below the Tablet
 *  breakpoint only the block is drawn. No motion on load. */
const meta: Meta<typeof AuthSplit> = {
  title: 'Blocks/Auth/Split',
  component: AuthSplit,
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof AuthSplit>

export const Playground: Story = { render: (args) => <AuthSplit {...args}><AuthSignIn container="plain" /></AuthSplit> }

/** The Content slot takes any Auth block. */
export const AnyBlock: Story = { name: 'Any block', render: (args) => <AuthSplit {...args}><AuthForgotPassword container="plain" /></AuthSplit> }
