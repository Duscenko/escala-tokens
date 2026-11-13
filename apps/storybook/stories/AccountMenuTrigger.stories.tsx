import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccountMenuTrigger, ACCOUNT_MENU_TRIGGER_SIZES, ACCOUNT_MENU_TRIGGER_STATES, type AccountMenuTriggerSize, type AccountMenuTriggerState } from '../../../src/components/escala-ui/account-menu-trigger'

/** Story args = the Figma `AccountMenuTrigger` set (design-plans/nav-header-contract.md): Size · State, then Name, NameVisible. */
interface TriggerStoryArgs {
  size: AccountMenuTriggerSize
  forceState: AccountMenuTriggerState
  name: string
  nameVisible: boolean
}

const meta: Meta<TriggerStoryArgs> = {
  title: 'Navigation/AccountMenuTrigger',
  render: ({ size, forceState, name, nameVisible }) => <AccountMenuTrigger size={size} forceState={forceState} name={name} nameVisible={nameVisible} />,
  args: { size: 'default', forceState: 'Default', name: 'Ayla', nameVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...ACCOUNT_MENU_TRIGGER_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...ACCOUNT_MENU_TRIGGER_STATES] },
    name: { name: 'Name', control: 'text' },
    nameVisible: { name: 'NameVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<TriggerStoryArgs>

export const Playground: Story = {}

export const States: Story = {
  render: (args) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{ACCOUNT_MENU_TRIGGER_STATES.map((s) => <AccountMenuTrigger key={s} size={args.size} forceState={s} name={args.name} nameVisible={args.nameVisible} />)}</div>,
}

export const Sizes: Story = {
  render: (args) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>{ACCOUNT_MENU_TRIGGER_SIZES.map((size) => <AccountMenuTrigger key={size} size={size} forceState={args.forceState} name={args.name} nameVisible={args.nameVisible} />)}</div>,
}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {ACCOUNT_MENU_TRIGGER_SIZES.map((size) => (
        <div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {ACCOUNT_MENU_TRIGGER_STATES.map((s) => <AccountMenuTrigger key={s} size={size} forceState={s} name={args.name} nameVisible={args.nameVisible} />)}
        </div>
      ))}
    </div>
  ),
}
