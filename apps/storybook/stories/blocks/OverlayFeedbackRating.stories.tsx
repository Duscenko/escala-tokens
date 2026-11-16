import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FeedbackRating } from '../../../../src/components/escala-ui/blocks/overlay'

/** The Figma `FeedbackRating` block (Overlay page): the system's Modal filled with escala-ui components. It adds no motion of its own:
 *  open and close are the Modal's choreography. `Inline` is the docs rendering; the Dialog story opens the real thing. */
const meta: Meta = {
  title: 'Blocks/Overlay/FeedbackRating',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: () => <FeedbackRating inline />,
}
export default meta
type Story = StoryObj

export const Playground: Story = {}

/** The real dialog: trigger, scrim, focus trap, Escape. Its open and close are the Modal's own motion (measure there). */
export const Dialog: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open FeedbackRating</button>
        <FeedbackRating inline={false} open={open} onOpenChange={setOpen} onConfirm={() => setOpen(false)} />
      </>
    )
  },
}
