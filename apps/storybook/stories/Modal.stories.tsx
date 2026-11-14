import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from '../../../src/components/escala-ui/button'
import {
  Modal, ModalClose, ModalContent, ModalFooter, ModalHeader, ModalTrigger, MODAL_SIZES, type ModalSize,
} from '../../../src/components/escala-ui/modal'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'

/** Story args = the Figma `Modal` set (design-plans/modal-contract.md), in the panel's order and with its defaults:
 *  Size is its only variant axis, then CloseVisible · ContentVisible · FooterVisible (the Content slot is the body text). */
interface ModalStoryArgs {
  size: ModalSize
  closeVisible: boolean
  contentVisible: boolean
  content: string
  footerVisible: boolean
}

const BODY = 'Replace this slot with the dialog body: a short paragraph, form fields, settings rows, a list or media. The body scrolls inside the dialog when it is taller than the viewport.'

function modal({ size, closeVisible, contentVisible, content, footerVisible }: ModalStoryArgs) {
  return (
    <Modal open modal={false}>
      <ModalContent
        inline
        size={size}
        showCloseButton={closeVisible}
        header={<ModalHeader title="System notification" description="Review the details and take action." icon={<PreviewIcon concept="zap" size={24} />} />}
        footer={footerVisible ? (
          <ModalFooter>
            <Button variant="secondary" appearance="solid" size={size === 'lg' ? 'lg' : 'default'}>Cancel</Button>
            <Button variant="default" appearance="solid" size={size === 'lg' ? 'lg' : 'default'}>Confirm</Button>
          </ModalFooter>
        ) : undefined}
      >
        {contentVisible ? content : null}
      </ModalContent>
    </Modal>
  )
}

const meta: Meta<ModalStoryArgs> = {
  title: 'Content & Surfaces/Modal',
  render: modal,
  args: { size: 'default', closeVisible: true, contentVisible: true, content: BODY, footerVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...MODAL_SIZES] },
    closeVisible: { name: 'CloseVisible', control: 'boolean' },
    contentVisible: { name: 'ContentVisible', control: 'boolean' },
    content: { name: 'Content', control: 'text' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ModalStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {MODAL_SIZES.map((size) => <div key={size}>{modal({ ...args, size })}</div>)}
    </div>
  ),
}

/** The real thing: a trigger, the scrim, a focus trap, Escape and Cancel (a ModalClose) to dismiss. */
export const WithTrigger: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <Modal open={open} onOpenChange={setOpen}>
        <ModalTrigger asChild><Button>Open modal</Button></ModalTrigger>
        <ModalContent
          size={args.size}
          header={<ModalHeader title="Delete project?" description="This action can't be undone." icon={<PreviewIcon concept="info" size={20} />} />}
          footer={(
            <ModalFooter>
              <ModalClose asChild><Button variant="secondary" appearance="solid">Cancel</Button></ModalClose>
              <ModalClose asChild><Button>Delete</Button></ModalClose>
            </ModalFooter>
          )}
        >
          All tokens in this project will be removed.
        </ModalContent>
      </Modal>
    )
  },
}
