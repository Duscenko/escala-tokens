import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { Button } from '../../../src/components/escala-ui/button'
import {
  Alert, ALERT_VARIANTS, ALERT_APPEARANCES, ALERT_LAYOUTS, ALERT_SIZES, type AlertVariant, type AlertAppearance, type AlertLayout, type AlertSize,
} from '../../../src/components/escala-ui/alert'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `Alert` set (design-plans/alert-contract.md), in the panel's order and with its defaults:
 *  Description · IconVisible · Icon · ActionsVisible · CloseVisible, then Variant · Appearance · Layout · Size. */
interface AlertStoryArgs {
  description: string
  iconVisible: boolean
  icon?: ComponentIconName
  actionsVisible: boolean
  closeVisible: boolean
  variant: AlertVariant
  appearance: AlertAppearance
  layout: AlertLayout
  size: AlertSize
}

function render({ icon, actionsVisible, layout, size, ...args }: AlertStoryArgs) {
  return (
    <div style={{ width: layout === 'vertical' ? 320 : 800 }}>
      <Alert
        {...args}
        layout={layout}
        size={size}
        actionsVisible={actionsVisible}
        icon={icon ? <PreviewIcon concept={icon} size={size === 'sm' ? 16 : 20} /> : undefined}
        actions={<Button variant="secondary" appearance="solid" size={size === 'sm' ? 'sm' : 'default'}>Action</Button>}
      />
    </div>
  )
}

const meta: Meta<AlertStoryArgs> = {
  title: 'Feedback/Alert',
  render,
  args: { description: 'Description', iconVisible: true, actionsVisible: false, closeVisible: true, variant: 'default', appearance: 'outline', layout: 'horizontal', size: 'default' },
  argTypes: {
    description: { name: 'Description', control: 'text' },
    iconVisible: { name: 'IconVisible', control: 'boolean' },
    icon: iconSwapArg('Icon'),
    actionsVisible: { name: 'ActionsVisible', control: 'boolean' },
    closeVisible: { name: 'CloseVisible', control: 'boolean' },
    variant: { name: 'Variant', control: 'select', options: [...ALERT_VARIANTS] },
    appearance: { name: 'Appearance', control: 'select', options: [...ALERT_APPEARANCES] },
    layout: { name: 'Layout', control: 'select', options: [...ALERT_LAYOUTS] },
    size: { name: 'Size', control: 'select', options: [...ALERT_SIZES] },
  },
}
export default meta
type Story = StoryObj<AlertStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ALERT_APPEARANCES.flatMap((appearance) => ALERT_VARIANTS.map((variant) => <div key={appearance + variant}>{render({ ...args, appearance, variant, description: `${variant} · ${appearance}` })}</div>))}
    </div>
  ),
}

export const Vertical: Story = {
  args: { layout: 'vertical', actionsVisible: true },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {ALERT_APPEARANCES.map((appearance) => <div key={appearance}>{render({ ...args, appearance })}</div>)}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ALERT_SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}
