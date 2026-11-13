import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator, BREADCRUMB_APPEARANCES, BREADCRUMB_GLYPHS, BREADCRUMB_SEPARATORS, BREADCRUMB_SIZES,
  type BreadcrumbAppearance, type BreadcrumbSeparatorKind, type BreadcrumbSize,
} from '../../../src/components/escala-ui/breadcrumb'

/** Story args = the Figma `Breadcrumb` set (design-plans/breadcrumb-contract.md), in the panel's order and with its defaults:
 *  Appearance · Separator · Size (variant axes), then EllipsisVisible · Item2Visible · Item3Visible. */
interface BreadcrumbStoryArgs {
  appearance: BreadcrumbAppearance
  separator: BreadcrumbSeparatorKind
  size: BreadcrumbSize
  ellipsisVisible: boolean
  item2Visible: boolean
  item3Visible: boolean
}

function Trail({ appearance, separator, size, ellipsisVisible, item2Visible, item3Visible, label }: BreadcrumbStoryArgs & { label?: string }) {
  const stop = (e: React.MouseEvent) => e.preventDefault()
  return (
    <Breadcrumb appearance={appearance} separator={separator} size={size} aria-label={label}>
      <BreadcrumbList>
        <BreadcrumbItem href="#" onClick={stop} iconLeading={BREADCRUMB_GLYPHS.house}>Home</BreadcrumbItem>
        <BreadcrumbSeparator />
        {ellipsisVisible && (<><BreadcrumbEllipsis /><BreadcrumbSeparator /></>)}
        {item2Visible && (<><BreadcrumbItem href="#" onClick={stop}>Projects</BreadcrumbItem><BreadcrumbSeparator /></>)}
        {item3Visible && (<><BreadcrumbItem href="#" onClick={stop}>Escala</BreadcrumbItem><BreadcrumbSeparator /></>)}
        <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

const meta: Meta<BreadcrumbStoryArgs> = {
  title: 'Navigation/Breadcrumb',
  render: (args) => <Trail {...args} />,
  args: { appearance: 'ghost', separator: 'chevron', size: 'default', ellipsisVisible: false, item2Visible: true, item3Visible: true },
  argTypes: {
    appearance: { name: 'Appearance', control: 'select', options: [...BREADCRUMB_APPEARANCES] },
    separator: { name: 'Separator', control: 'select', options: [...BREADCRUMB_SEPARATORS] },
    size: { name: 'Size', control: 'select', options: [...BREADCRUMB_SIZES] },
    ellipsisVisible: { name: 'EllipsisVisible', control: 'boolean' },
    item2Visible: { name: 'Item2Visible', control: 'boolean' },
    item3Visible: { name: 'Item3Visible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<BreadcrumbStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {BREADCRUMB_APPEARANCES.flatMap((appearance) => BREADCRUMB_SEPARATORS.map((separator) => (
        <Trail key={appearance + separator} {...args} appearance={appearance} separator={separator} label={`${appearance} ${separator}`} />
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {BREADCRUMB_SIZES.map((size) => <Trail key={size} {...args} size={size} label={`Size ${size}`} />)}
    </div>
  ),
}

/** A long trail: the start collapses into the ellipsis. */
export const Collapsed: Story = { args: { ellipsisVisible: true, item2Visible: false, item3Visible: true } }
