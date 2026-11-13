import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import { Toast, Toaster, showToast, TOAST_APPEARANCES, TOAST_VARIANTS, type ToastAppearance, type ToastVariant } from '../../../src/components/escala-ui/toast'

/** Story args = the Figma `Toast` set (design-plans/toast-contract.md), in the panel's order and with its defaults:
 *  Title · DescriptionVisible · Description · IconVisible · ActionsVisible · CloseVisible · ProgressVisible, then
 *  Appearance · Variant. */
interface ToastStoryArgs {
  title: string
  descriptionVisible: boolean
  description: string
  iconVisible: boolean
  actionsVisible: boolean
  closeVisible: boolean
  progressVisible: boolean
  appearance: ToastAppearance
  variant: ToastVariant
}

function render({ actionsVisible, ...args }: ToastStoryArgs) {
  return <Toast {...args} actionsVisible={actionsVisible} actions={<Button variant="secondary" appearance="solid" size="sm">Undo</Button>} />
}

const meta: Meta<ToastStoryArgs> = {
  title: 'Feedback/Toast',
  render,
  args: { title: 'Title', descriptionVisible: true, description: 'Description', iconVisible: true, actionsVisible: false, closeVisible: true, progressVisible: true, appearance: 'filled', variant: 'default' },
  argTypes: {
    title: { name: 'Title', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    iconVisible: { name: 'IconVisible', control: 'boolean' },
    actionsVisible: { name: 'ActionsVisible', control: 'boolean' },
    closeVisible: { name: 'CloseVisible', control: 'boolean' },
    progressVisible: { name: 'ProgressVisible', control: 'boolean' },
    appearance: { name: 'Appearance', control: 'select', options: [...TOAST_APPEARANCES] },
    variant: { name: 'Variant', control: 'select', options: [...TOAST_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<ToastStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {TOAST_APPEARANCES.flatMap((appearance) => TOAST_VARIANTS.map((variant) => <div key={appearance + variant}>{render({ ...args, appearance, variant, title: `${variant} · ${appearance}` })}</div>))}
    </div>
  ),
}

/** The queue: `Toaster` once, `showToast` anywhere. */
export const InAToaster: Story = {
  render: (args) => (
    <div>
      <Toaster position="bottom-right" />
      <Button onClick={() => showToast({ ...args, duration: 4000 })}>Show toast</Button>
    </div>
  ),
}
