import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CARD_SIZES, type CardSize } from '../../../src/components/escala-ui/card'
import { Button } from '../../../src/components/escala-ui/button'

/** Card has no Figma set of its own: it is the surface of the Auth blocks' `Container=card` and of the
 *  configurator's artefacts (DEC-2026-11-16-008). Size, then the texts. */
interface CardStoryArgs { size: CardSize; title: string; description: string; footerVisible: boolean }

const meta: Meta<CardStoryArgs> = {
  title: 'Content & Surfaces/Card',
  render: ({ size, title, description, footerVisible }) => (
    <Card size={size} style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>Content goes here.</CardContent>
      {footerVisible && (
        <CardFooter>
          <Button>Continue</Button>
        </CardFooter>
      )}
    </Card>
  ),
  args: { size: 'default', title: 'Sign in', description: 'Use your work email.', footerVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...CARD_SIZES], description: 'sm tightens the padding and the gap between parts.' },
    title: { name: 'Title', control: 'text' },
    description: { name: 'Description', control: 'text' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<CardStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {CARD_SIZES.map((size) => meta.render!({ ...args, size }, {} as never))}
    </div>
  ),
}
