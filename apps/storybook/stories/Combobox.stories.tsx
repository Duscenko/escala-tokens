import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Combobox, COMBOBOX_SHAPES, COMBOBOX_SIZES, COMBOBOX_VARIANTS,
  type ComboboxOption, type ComboboxShape, type ComboboxSize, type ComboboxState, type ComboboxVariant,
} from '../../../src/components/escala-ui/combobox'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { iconSwapArg } from './iconSwap'

const STATES: ComboboxState[] = ['Default', 'Hover', 'Focused', 'Open', 'Invalid', 'Disabled', 'Loading']
const VALUES = ['placeholder', 'filled'] as const
type ComboboxValue = (typeof VALUES)[number]
/** Glyph px per Size, as the file draws them (14 · Size/icon-sm · 18). */
const GLYPH_PX: Record<ComboboxSize, number> = { sm: 14, default: 16, lg: 18 }

/** The file's sample list (ComboboxPopover, Content list). */
const FRAMEWORKS: ComboboxOption[] = [
  { label: 'Next.js', value: 'next' },
  { label: 'Remix', value: 'remix' },
  { label: 'Astro', value: 'astro' },
  { label: 'SvelteKit', value: 'sveltekit', disabled: true },
]

/** Story args = the Figma `Combobox` set (413:1478), in the panel's order and with its
 *  defaults: Size · State · Variant · Shape · Value, then IconLeadingVisible ·
 *  IconLeadingIcon · Placeholder · ClearVisible · ChevronVisible · SelectedText. */
interface ComboboxStoryArgs {
  size: ComboboxSize
  forceState: ComboboxState
  variant: ComboboxVariant
  shape: ComboboxShape
  value: ComboboxValue
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  placeholder: string
  clearVisible: boolean
  chevronVisible: boolean
  selectedText: string
}

function render(a: ComboboxStoryArgs) {
  const options = FRAMEWORKS.map((o) => (o.value === 'next' ? { ...o, label: a.selectedText } : o))
  return (
    <Combobox
      key={`${a.value}-${a.forceState}`}
      aria-label="Framework"
      options={options}
      size={a.size}
      variant={a.variant}
      shape={a.shape}
      forceState={a.forceState === 'Default' ? undefined : a.forceState}
      defaultValue={a.value === 'filled' ? 'next' : undefined}
      placeholder={a.placeholder}
      leading={a.iconLeadingVisible ? <PreviewIcon concept={a.iconLeadingIcon} size={GLYPH_PX[a.size]} /> : null}
      clearable={a.clearVisible}
      chevron={a.chevronVisible}
      width={280}
    />
  )
}

const meta: Meta<ComboboxStoryArgs> = {
  title: 'Forms/Combobox',
  render,
  args: {
    size: 'default', forceState: 'Default', variant: 'default', shape: 'rounded', value: 'placeholder',
    iconLeadingVisible: true, iconLeadingIcon: 'search', placeholder: 'Search framework...',
    clearVisible: false, chevronVisible: true, selectedText: 'Next.js',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...COMBOBOX_SIZES], description: 'Box 32 · 40 · 48.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover, Focused and Open come from the pointer, keyboard and list.' },
    variant: { name: 'Variant', control: 'select', options: [...COMBOBOX_VARIANTS], description: 'default fills its width; compact hugs its content.' },
    shape: { name: 'Shape', control: 'select', options: [...COMBOBOX_SHAPES] },
    value: { name: 'Value', control: 'select', options: [...VALUES] },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    placeholder: { name: 'Placeholder', control: 'text' },
    clearVisible: { name: 'ClearVisible', control: 'boolean' },
    chevronVisible: { name: 'ChevronVisible', control: 'boolean' },
    selectedText: { name: 'SelectedText', control: 'text' },
  },
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<ComboboxStoryArgs>

export const Playground: Story = {}

/** Every State in both Values (default size, rounded), as the file's columns. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', paddingBottom: 200 }}>
      {VALUES.flatMap((value) => STATES.filter((s) => s !== 'Open').map((forceState) => (
        <div key={`${value}-${forceState}`}>{render({ ...args, value, forceState })}</div>
      )))}
    </div>
  ),
}

/** Size × Variant × Shape at rest. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
      {COMBOBOX_SHAPES.flatMap((shape) => COMBOBOX_VARIANTS.flatMap((variant) => COMBOBOX_SIZES.map((size) => (
        <div key={`${shape}-${variant}-${size}`}>{render({ ...args, shape, variant, size })}</div>
      ))))}
    </div>
  ),
}

/** Open: the list 8px below the trigger, as the file's Open variant. */
export const Open: Story = {
  args: { forceState: 'Open', value: 'filled' },
  render: (args) => <div style={{ paddingBottom: 220 }}>{render(args)}</div>,
}

/** Live: type to filter, arrows to move, Enter to choose, Escape to close; grouped options. */
export const Live: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', paddingBottom: 280 }}>
      <Combobox aria-label="Framework" options={FRAMEWORKS} clearable width={280} footer="4 frameworks" />
      <Combobox
        aria-label="Framework"
        width={280}
        defaultValue="next"
        options={[
          { label: 'Next.js', value: 'next', group: 'Suggested', description: 'React framework', trailing: '⌘1' },
          { label: 'Remix', value: 'remix', group: 'Suggested', description: 'Full-stack web framework', trailing: '⌘2' },
          { label: 'Astro', value: 'astro', group: 'All frameworks' },
          { label: 'SvelteKit', value: 'sveltekit', group: 'All frameworks', disabled: true },
        ]}
      />
    </div>
  ),
}
