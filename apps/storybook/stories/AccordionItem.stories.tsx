import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import {
  Accordion, AccordionItem, ACCORDION_VARIANTS, ACCORDION_ITEM_STATES, type AccordionVariant, type AccordionItemState,
} from '../../../src/components/escala-ui/accordion'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `AccordionItem` set (design-plans/accordion-contract.md), in the panel's order and with its
 *  defaults: IconVisible · Icon · Label · Content, then Variant · State. */
interface ItemStoryArgs {
  iconVisible: boolean
  /** Figma Icon (the swap); the file's default is a house: unset = the built-in one. */
  icon?: ComponentIconName
  label: string
  content: string
  variant: AccordionVariant
  state: AccordionItemState
}

function render({ iconVisible, icon, label, content, variant, state }: ItemStoryArgs) {
  return (
    <div style={{ width: 480 }}>
      {/* The State is part of the playground: Open starts the item open, Disabled mutes it. */}
      <Accordion key={state} variant={variant} defaultValue={state === 'Open' ? ['item'] : []}>
        <AccordionItem value="item" disabled={state === 'Disabled'} label={label} iconVisible={iconVisible} icon={icon ? <PreviewIcon concept={icon} size={20} /> : undefined}>
          {content}
        </AccordionItem>
      </Accordion>
    </div>
  )
}

const meta: Meta<ItemStoryArgs> = {
  title: 'Content & Surfaces/AccordionItem',
  render,
  args: {
    iconVisible: true, label: 'Accordion title', variant: 'ghost-default', state: 'Closed',
    content: 'Accordion content goes here. Add supporting detail for this section.',
  },
  argTypes: {
    iconVisible: { name: 'IconVisible', control: 'boolean' },
    icon: iconSwapArg('Icon'),
    label: { name: 'Label', control: 'text' },
    content: { name: 'Content', control: 'text' },
    variant: { name: 'Variant', control: 'select', options: [...ACCORDION_VARIANTS] },
    state: { name: 'State', control: 'select', options: [...ACCORDION_ITEM_STATES] },
  },
}
export default meta
type Story = StoryObj<ItemStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {ACCORDION_VARIANTS.flatMap((variant) => ACCORDION_ITEM_STATES.map((state) => <div key={`${variant}-${state}`}>{render({ ...args, variant, state, label: `${args.label} · ${variant} · ${state}` })}</div>))}
    </div>
  ),
}
