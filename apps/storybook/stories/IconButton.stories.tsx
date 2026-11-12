import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconButton } from '../../../src/components/escala-ui/icon-button'
import { BUTTON_APPEARANCES, BUTTON_SIZES, BUTTON_VARIANTS, type ButtonState } from '../../../src/components/escala-ui/button'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'

/** Story args = the Figma `IconButton` set's properties: Variant · Appearance ·
 *  Size · State, BadgeVisible; the Icon swap is the glyph. */
interface IconButtonStoryArgs {
  variant: (typeof BUTTON_VARIANTS)[number]
  appearance: (typeof BUTTON_APPEARANCES)[number]
  size: (typeof BUTTON_SIZES)[number]
  forceState: ButtonState
  badgeVisible: boolean
  ariaLabel: string
}

const STATES: ButtonState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled']
const ICON_PX: Record<string, number> = { xs: 16, sm: 16, default: 20, lg: 24 }

function Dot() {
  return <span style={{ display: 'block', width: 8, height: 8, borderRadius: 999, background: 'var(--color-status-critical-surface-solid)' }} aria-hidden />
}

function render({ variant, appearance, size, forceState, badgeVisible, ariaLabel }: IconButtonStoryArgs) {
  return (
    <IconButton
      variant={variant}
      appearance={appearance}
      size={size}
      forceState={forceState}
      loading={forceState === 'Loading'}
      disabled={forceState === 'Disabled'}
      aria-label={ariaLabel}
      icon={<PreviewIcon concept="home" size={ICON_PX[size]} />}
      badge={badgeVisible ? <Dot /> : undefined}
    />
  )
}

const meta: Meta<IconButtonStoryArgs> = {
  title: 'Buttons/IconButton',
  render,
  args: { variant: 'default', appearance: 'solid', size: 'default', forceState: 'Default', badgeVisible: false, ariaLabel: 'Home' },
  argTypes: {
    variant: { name: 'Variant', control: 'inline-radio', options: [...BUTTON_VARIANTS] },
    appearance: { name: 'Appearance', control: 'inline-radio', options: [...BUTTON_APPEARANCES] },
    size: { name: 'Size', control: 'inline-radio', options: [...BUTTON_SIZES] },
    forceState: { name: 'State', control: 'select', options: STATES },
    badgeVisible: { name: 'BadgeVisible', control: 'boolean' },
    ariaLabel: { name: 'aria-label', control: 'text', description: 'Required: the accessible name (there is no visible text).' },
  },
}
export default meta
type Story = StoryObj<IconButtonStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: 16, alignItems: 'center' }}>
      {BUTTON_VARIANTS.flatMap((variant) =>
        BUTTON_APPEARANCES.map((appearance) => (
          <div key={`${variant}-${appearance}`}>{render({ ...args, variant, appearance, ariaLabel: `${variant} ${appearance}` })}</div>
        )),
      )}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {BUTTON_SIZES.map((size) => <div key={size}>{render({ ...args, size, ariaLabel: `Home ${size}` })}</div>)}
    </div>
  ),
}
