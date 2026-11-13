import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconButton } from '../../../src/components/escala-ui/icon-button'
import { BUTTON_APPEARANCES, BUTTON_SIZES, BUTTON_VARIANTS, type ButtonState } from '../../../src/components/escala-ui/button'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `IconButton` set's properties: Variant · Appearance ·
 *  Size · State, BadgeVisible, and the Icon instance swap. */
interface IconButtonStoryArgs {
  variant: (typeof BUTTON_VARIANTS)[number]
  appearance: (typeof BUTTON_APPEARANCES)[number]
  size: (typeof BUTTON_SIZES)[number]
  forceState: ButtonState
  badgeVisible: boolean
  icon: ComponentIconName
  ariaLabel: string
}

const STATES: ButtonState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled']

function Dot() {
  return <span style={{ display: 'block', width: 8, height: 8, borderRadius: 999, background: 'var(--color-status-critical-surface-solid)' }} aria-hidden />
}

function render({ variant, appearance, size, forceState, badgeVisible, icon, ariaLabel }: IconButtonStoryArgs) {
  return (
    <IconButton
      variant={variant}
      appearance={appearance}
      size={size}
      forceState={forceState}
      loading={forceState === 'Loading'}
      disabled={forceState === 'Disabled'}
      aria-label={ariaLabel}
      icon={<PreviewIcon concept={icon} size={ICON_PX[size]} />}
      badge={badgeVisible ? <Dot /> : undefined}
    />
  )
}

const meta: Meta<IconButtonStoryArgs> = {
  title: 'Buttons/IconButton',
  render,
  args: { variant: 'default', appearance: 'solid', size: 'default', forceState: 'Default', badgeVisible: false, icon: 'home', ariaLabel: 'Home' },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...BUTTON_VARIANTS] },
    appearance: { name: 'Appearance', control: 'select', options: [...BUTTON_APPEARANCES] },
    size: { name: 'Size', control: 'select', options: [...BUTTON_SIZES] },
    forceState: { name: 'State', control: 'select', options: STATES },
    badgeVisible: { name: 'BadgeVisible', control: 'boolean' },
    icon: iconSwapArg('Icon'),
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
