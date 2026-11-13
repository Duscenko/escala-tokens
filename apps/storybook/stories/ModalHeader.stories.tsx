import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import { ModalHeader, MODAL_HEADER_ALIGNS, MODAL_SIZES, type ModalHeaderAlign, type ModalSize } from '../../../src/components/escala-ui/modal'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `ModalHeader` set (design-plans/modal-contract.md), in the panel's order and with its
 *  defaults: Size · Align (variant axes), Title · DescriptionVisible · Description · IconVisible · TrailingVisible ·
 *  CloseClearanceVisible. The icon is the FeaturedIcon's swap. */
interface ModalHeaderStoryArgs {
  size: ModalSize
  align: ModalHeaderAlign
  title: string
  descriptionVisible: boolean
  description: string
  iconVisible: boolean
  trailingVisible: boolean
  closeClearance: boolean
  icon: ComponentIconName
}

const WIDTH: Record<ModalSize, number> = { default: 440, lg: 600 }

function header({ icon, size, ...args }: ModalHeaderStoryArgs) {
  return (
    <div style={{ width: WIDTH[size] }}>
      <ModalHeader size={size} icon={<PreviewIcon concept={icon} size={size === 'lg' ? 24 : 20} />} trailing={<Button variant="secondary" appearance="ghost" size={size === 'lg' ? 'default' : 'sm'}>Reset</Button>} {...args} />
    </div>
  )
}

const meta: Meta<ModalHeaderStoryArgs> = {
  title: 'Content & Surfaces/ModalHeader',
  render: header,
  args: { size: 'default', align: 'horizontal', title: 'System notification', descriptionVisible: true, description: 'Review the details and take action.', iconVisible: true, trailingVisible: false, closeClearance: false, icon: 'info' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...MODAL_SIZES] },
    align: { name: 'Align', control: 'select', options: [...MODAL_HEADER_ALIGNS] },
    title: { name: 'Title', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    iconVisible: { name: 'IconVisible', control: 'boolean' },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    closeClearance: { name: 'CloseClearanceVisible', control: 'boolean' },
    icon: iconSwapArg('Icon'),
  },
}
export default meta
type Story = StoryObj<ModalHeaderStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {MODAL_SIZES.flatMap((size) => MODAL_HEADER_ALIGNS.map((align) => <div key={size + align}>{header({ ...args, size, align })}</div>))}
    </div>
  ),
}
