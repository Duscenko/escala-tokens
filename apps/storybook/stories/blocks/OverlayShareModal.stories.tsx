import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShareModal } from '../../../../src/components/escala-ui/blocks/overlay'
import { AVATAR_PHOTOS } from '../avatarPhotos'

/** Both people are the file's `photo-11` (the file draws the same photo on both rows). */
const PHOTOS = [AVATAR_PHOTOS['photo-11']]

/** The Figma `ShareModal` block (Overlay page): the system's Modal filled with escala-ui components. It adds no motion of its own:
 *  open and close are the Modal's choreography. `Inline` is the docs rendering; the Dialog story opens the real thing. */
const meta: Meta = {
  title: 'Blocks/Overlay/ShareModal',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: () => <ShareModal inline photos={PHOTOS} />,
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
        <button onClick={() => setOpen(true)}>Open ShareModal</button>
        <ShareModal inline={false} photos={PHOTOS} open={open} onOpenChange={setOpen} onConfirm={() => setOpen(false)} />
      </>
    )
  },
}
