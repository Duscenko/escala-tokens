import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthForgotPassword, AuthSignIn, AuthSplit } from '../../../../src/components/escala-ui/blocks/auth'
import { COVERS } from '../../../../src/components/escala-ui/blocks/mediaSamples'

/** The Figma `AuthSplit` component (2146:8199): a brand panel beside any Auth block in `container="plain"`. Below the Tablet
 *  breakpoint only the block is drawn. No motion on load. `media` (code only) puts one of the file's `media/cover-*` photos
 *  between the icon and the copy; the copy never sits on the photo. */
type Args = ComponentProps<typeof AuthSplit> & { photo: keyof typeof COVERS | 'none' }

const meta: Meta<Args> = {
  title: 'Blocks/Auth/Split',
  component: AuthSplit,
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  args: { photo: 'alpine' },
  argTypes: {
    photo: { name: 'Media (code)', control: 'inline-radio', options: ['none', ...Object.keys(COVERS)], description: 'A photo from the Figma Media page in the brand panel. `none` is the Figma set as drawn: the bare accent panel.' },
  },
}
export default meta
type Story = StoryObj<Args>

const media = (photo: Args['photo']) => (photo === 'none' ? undefined : COVERS[photo])

export const Playground: Story = { render: ({ photo, ...args }) => <AuthSplit {...args} media={media(photo)}><AuthSignIn container="plain" /></AuthSplit> }

/** The Content slot takes any Auth block. */
export const AnyBlock: Story = { name: 'Any block', render: ({ photo, ...args }) => <AuthSplit {...args} media={media(photo)}><AuthForgotPassword container="plain" /></AuthSplit> }
