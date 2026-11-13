import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ComboboxGroup, ComboboxItem, ComboboxPopover, ComboboxSeparator, COMBOBOX_POPOVER_CONTENTS, COMBOBOX_SIZES,
  type ComboboxPopoverContent, type ComboboxSize,
} from '../../../src/components/escala-ui/combobox'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'

const GLYPH_PX: Record<ComboboxSize, number> = { sm: 14, default: 16, lg: 18 }

/** Story args = the Figma `ComboboxPopover` set (415:489), in the panel's order and with its
 *  defaults: Content · Size, then FooterVisible · FooterText · EmptyText. */
interface ComboboxPopoverStoryArgs {
  content: ComboboxPopoverContent
  size: ComboboxSize
  footerVisible: boolean
  footerText: string
  emptyText: string
}

function render({ content, size, footerVisible, footerText, emptyText }: ComboboxPopoverStoryArgs) {
  const icon = <PreviewIcon concept="home" size={GLYPH_PX[size]} />
  return (
    <ComboboxPopover size={size} content={content} emptyText={emptyText} footer={footerVisible ? footerText : undefined} width={280}>
      {content === 'grouped' ? (
        <>
          <ComboboxGroup label="Suggested" size={size}>
            <ComboboxItem size={size} forceState="Selected" icon={icon} description="React framework" trailing="⌘1">Next.js</ComboboxItem>
            <ComboboxItem size={size} forceState="Focused" icon={icon} description="Full-stack web framework" trailing="⌘2">Remix</ComboboxItem>
          </ComboboxGroup>
          <ComboboxSeparator />
          <ComboboxGroup label="All frameworks" size={size}>
            <ComboboxItem size={size} icon={icon}>Astro</ComboboxItem>
            <ComboboxItem size={size} forceState="Disabled" icon={icon}>SvelteKit</ComboboxItem>
          </ComboboxGroup>
        </>
      ) : (
        <>
          <ComboboxItem size={size} forceState="Selected">Next.js</ComboboxItem>
          <ComboboxItem size={size} forceState="Focused">Remix</ComboboxItem>
          <ComboboxItem size={size}>Astro</ComboboxItem>
          <ComboboxItem size={size} forceState="Disabled">SvelteKit</ComboboxItem>
        </>
      )}
    </ComboboxPopover>
  )
}

const meta: Meta<ComboboxPopoverStoryArgs> = {
  title: 'Forms/ComboboxPopover',
  render,
  args: { content: 'list', size: 'default', footerVisible: false, footerText: '3 results', emptyText: 'No match' },
  argTypes: {
    content: { name: 'Content', control: 'select', options: [...COMBOBOX_POPOVER_CONTENTS] },
    size: { name: 'Size', control: 'select', options: [...COMBOBOX_SIZES] },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
    footerText: { name: 'FooterText', control: 'text' },
    emptyText: { name: 'EmptyText', control: 'text' },
  },
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<ComboboxPopoverStoryArgs>

export const Playground: Story = {}

/** Every Content × Size, as the file's 9 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {COMBOBOX_POPOVER_CONTENTS.flatMap((content) => COMBOBOX_SIZES.map((size) => (
        <div key={`${content}-${size}`}>{render({ ...args, content, size })}</div>
      )))}
    </div>
  ),
}
