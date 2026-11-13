import type { Meta, StoryObj } from '@storybook/react-vite'
import { Brand, BRAND_SIZES, type BrandSize } from '../../../src/components/escala-ui/brand'

/** Story args = the Figma `Brand` set (design-plans/nav-header-contract.md): Size, then Logo (slot: the default stack mark), Name, VersionVisible. */
interface BrandStoryArgs {
  size: BrandSize
  name: string
  versionVisible: boolean
}

const meta: Meta<BrandStoryArgs> = {
  title: 'Navigation/Brand',
  render: ({ size, name, versionVisible }) => <Brand size={size} name={name} versionVisible={versionVisible} />,
  args: { size: 'default', name: 'Escala', versionVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...BRAND_SIZES] },
    name: { name: 'Name', control: 'text' },
    versionVisible: { name: 'VersionVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<BrandStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {BRAND_SIZES.map((size) => <Brand key={size} size={size} name={args.name} versionVisible={args.versionVisible} />)}
    </div>
  ),
}

/** As it goes in a header: wrapped in a link with an accessible name. */
export const AsLink: Story = {
  render: (args) => <a href="#" aria-label={`${args.name}${args.versionVisible ? ' v1.1' : ''} home`} onClick={(e) => e.preventDefault()} style={{ textDecoration: 'none' }}><Brand size={args.size} name={args.name} versionVisible={args.versionVisible} /></a>,
}
