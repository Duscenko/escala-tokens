import type { Meta, StoryObj } from '@storybook/react-vite'
import { IssueBoardPage } from '../../../src/components/escala-ui/screens/screens'
import { AVATAR_PHOTO_LIST } from './avatarPhotos'

/** The Figma `IssueBoardPage` (2223:839): a screen composed from components only. Its pieces, BoardColumn and
 *  IssueCard, are parts of this entry, never loose components. Motion: none beyond the components. */
const meta: Meta = {
  title: 'Screens/IssueBoardPage',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: () => <IssueBoardPage photos={AVATAR_PHOTO_LIST} />,
}
export default meta
type Story = StoryObj
export const Playground: Story = {}
export const Dark: Story = { globals: { theme: 'dark' } }
export const Mobile: Story = { globals: { dimensions: 'mobile' } }
