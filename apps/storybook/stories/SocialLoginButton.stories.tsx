import type { Meta, StoryObj } from '@storybook/react-vite'
import { SocialLoginButton, SOCIAL_APPEARANCES_LIST, SOCIAL_BRANDS_LIST, type SocialAppearance, type SocialBrand } from '../../../src/components/escala-ui/social-login-button'
import type { ButtonState } from '../../../src/components/escala-ui/button'

/** Story args = the Figma `SocialLoginButton` set (364:20): Brand · Appearance · Size · State · IconOnly, in the file's order
 *  and with its defaults. The mark is the file's own `logo/<Brand>` (page ® Logos): in colour on white, one colour in the label's ink on brand and Disabled; the brand colours are the
 *  Social Media Brands collection (`<Brand>/Action/default|hover|pressed`, `Content/on-action`, `Border/focus`). */
interface SocialStoryArgs {
  brand: SocialBrand
  appearance: SocialAppearance
  size: 'default' | 'lg'
  forceState: ButtonState
  iconOnly: boolean
}

const STATES: ButtonState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled']

function render({ brand, appearance, size, forceState, iconOnly }: SocialStoryArgs) {
  return (
    <div style={{ width: iconOnly ? undefined : 260 }}>
      <SocialLoginButton brand={brand} appearance={appearance} size={size} forceState={forceState} disabled={forceState === 'Disabled'} iconOnly={iconOnly} />
    </div>
  )
}

const meta: Meta<SocialStoryArgs> = {
  title: 'Buttons/SocialLoginButton',
  render,
  args: { brand: 'Google', appearance: 'white', size: 'default', forceState: 'Default', iconOnly: false },
  argTypes: {
    brand: { name: 'Brand', control: 'select', options: [...SOCIAL_BRANDS_LIST] },
    appearance: { name: 'Appearance', control: 'select', options: [...SOCIAL_APPEARANCES_LIST], description: 'white: a bordered control. brand: the provider fill.' },
    size: { name: 'Size', control: 'select', options: ['default', 'lg'] },
    forceState: { name: 'State', control: 'select', options: STATES },
    iconOnly: { name: 'IconOnly', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<SocialStoryArgs>

export const Playground: Story = {}

/** Every brand in both appearances, full width and icon-only. */
export const Brands: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 260px)', gap: 12 }}>
      {SOCIAL_APPEARANCES_LIST.flatMap((appearance) => SOCIAL_BRANDS_LIST.map((brand) => <div key={appearance + brand}>{render({ ...args, brand, appearance })}</div>))}
    </div>
  ),
}

export const IconOnly: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {SOCIAL_APPEARANCES_LIST.flatMap((appearance) => SOCIAL_BRANDS_LIST.map((brand) => <span key={appearance + brand}>{render({ ...args, brand, appearance, iconOnly: true })}</span>))}
    </div>
  ),
}

/** Every State, per appearance. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 260px)', gap: 12 }}>
      {SOCIAL_APPEARANCES_LIST.flatMap((appearance) => STATES.map((forceState) => <div key={appearance + forceState}>{render({ ...args, appearance, forceState })}</div>))}
    </div>
  ),
}
