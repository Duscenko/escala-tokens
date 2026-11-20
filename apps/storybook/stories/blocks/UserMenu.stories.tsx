import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserMenu } from '../../../../src/components/escala-ui/blocks/siteNavigation'

/** The Figma `UserMenu` block (2259:589). Motion: the DropdownMenu's own choreography, nothing added. */
const meta: Meta = {
  title: 'Blocks/Navigation/UserMenu',
  tags: ['stage:storybook'],
  render: () => <UserMenu />,
  argTypes: {
  },
}
export default meta
export const Playground: StoryObj = {}
/** The open menu, drawn in place. */
export const Open: StoryObj = { render: () => <UserMenu inline /> }
