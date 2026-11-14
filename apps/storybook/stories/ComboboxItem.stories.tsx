import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComboboxItem, COMBOBOX_SIZES, type ComboboxItemState, type ComboboxSize } from '../../../src/components/escala-ui/combobox'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { iconSwapArg } from './iconSwap'

const STATES: ComboboxItemState[] = ['Default', 'Focused', 'Selected', 'Disabled']
const GLYPH_PX: Record<ComboboxSize, number> = { sm: 14, default: 16, lg: 18 }

/** Story args = the Figma `ComboboxItem` set (406:140), in the panel's order and with its
 *  defaults: Size · State, then Label · DescriptionVisible · Description · IconLeadingVisible ·
 *  IconLeadingIcon · TrailingVisible · Trailing · IndicatorVisible. */
interface ComboboxItemStoryArgs {
  size: ComboboxSize
  forceState: ComboboxItemState
  label: string
  descriptionVisible: boolean
  description: string
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  trailingVisible: boolean
  trailing: string
  indicatorVisible: boolean
}

function render(a: ComboboxItemStoryArgs) {
  return (
    <div role="listbox" aria-label="Options" style={{ width: 256 }}>
      <ComboboxItem
        size={a.size}
        forceState={a.forceState === 'Default' ? undefined : a.forceState}
        description={a.descriptionVisible ? a.description : undefined}
        icon={a.iconLeadingVisible ? <PreviewIcon concept={a.iconLeadingIcon} size={GLYPH_PX[a.size]} /> : undefined}
        trailing={a.trailingVisible ? a.trailing : undefined}
        indicator={a.indicatorVisible}
      >
        {a.label}
      </ComboboxItem>
    </div>
  )
}

const meta: Meta<ComboboxItemStoryArgs> = {
  title: 'Forms/ComboboxItem',
  render,
  args: {
    size: 'default', forceState: 'Default', label: 'Option', descriptionVisible: false, description: 'Secondary text',
    iconLeadingVisible: false, iconLeadingIcon: 'home', trailingVisible: false, trailing: '⌘K', indicatorVisible: true,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...COMBOBOX_SIZES], description: 'Row 28 · 32 · 36.' },
    forceState: { name: 'State', control: 'select', options: STATES },
    label: { name: 'Label', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    trailing: { name: 'Trailing', control: 'text' },
    indicatorVisible: { name: 'IndicatorVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ComboboxItemStoryArgs>

export const Playground: Story = {}

/** Every Size × State, as the file's 12 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {COMBOBOX_SIZES.flatMap((size) => STATES.map((forceState) => (
        <div key={`${size}-${forceState}`}>{render({ ...args, size, forceState })}</div>
      )))}
    </div>
  ),
}

/** A row under the pointer or the arrow keys (`highlighted`) takes the fill only; the ring is keyboard focus, shown by the pinned Focused row beside it. */
export const HighlightedHasNoRing: Story = {
  render: (args) => (
    <div role="listbox" aria-label="Options" style={{ width: 256 }}>
      <ComboboxItem size={args.size} highlighted>Highlighted: fill, no ring</ComboboxItem>
      <ComboboxItem size={args.size} forceState="Focused">Focused: fill + ring</ComboboxItem>
      <ComboboxItem size={args.size}>Default</ComboboxItem>
    </div>
  ),
}
