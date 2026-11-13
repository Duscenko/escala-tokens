import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Checkbox, CHECKBOX_SIZES, CHECKBOX_STATES, CHECKBOX_VARIANTS,
  type CheckboxSize, type CheckboxState, type CheckboxVariant,
} from '../../../src/components/escala-ui/checkbox'

const CHECKED = ['false', 'true', 'indeterminate'] as const
type CheckedArg = (typeof CHECKED)[number]

/** Story args = the Figma `Checkbox` set (design-plans/checkbox-contract.md), in the panel's order
 *  and with its defaults: Size · Checked · State · Variant. */
interface CheckboxStoryArgs {
  size: CheckboxSize
  checked: CheckedArg
  forceState: CheckboxState
  variant: CheckboxVariant
}

function render({ size, checked, forceState, variant }: CheckboxStoryArgs) {
  return (
    <Checkbox
      key={checked}
      aria-label="Checkbox"
      size={size}
      variant={variant}
      defaultChecked={checked === 'indeterminate' ? 'indeterminate' : checked === 'true'}
      forceState={forceState === 'Default' ? undefined : forceState}
    />
  )
}

const meta: Meta<CheckboxStoryArgs> = {
  title: 'Forms/Checkbox',
  render,
  args: { size: 'default', checked: 'false', forceState: 'Default', variant: 'default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...CHECKBOX_SIZES], description: 'Box 16 · 16 · 20, glyph 12 · 12 · 16.' },
    checked: { name: 'Checked', control: 'select', options: [...CHECKED] },
    forceState: { name: 'State', control: 'select', options: [...CHECKBOX_STATES], description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    variant: { name: 'Variant', control: 'select', options: [...CHECKBOX_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<CheckboxStoryArgs>

export const Playground: Story = {}

/** Checked × State × Variant at one Size (colours do not change with Size), as the file's grid. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {CHECKBOX_VARIANTS.map((variant) => (
        <div key={variant} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', padding: 8, background: variant === 'inverse' ? 'var(--color-surface-inverse)' : undefined }}>
          {CHECKED.flatMap((checked) => CHECKBOX_STATES.map((forceState) => (
            <span key={`${checked}-${forceState}`} style={{ display: 'inline-flex', padding: 4 }}>{render({ ...args, variant, checked, forceState })}</span>
          )))}
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {CHECKBOX_SIZES.map((size) => <span key={size}>{render({ ...args, size, checked: 'true' })}</span>)}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {CHECKBOX_STATES.map((forceState) => <span key={forceState}>{render({ ...args, forceState, checked: 'true' })}</span>)}
    </div>
  ),
}
