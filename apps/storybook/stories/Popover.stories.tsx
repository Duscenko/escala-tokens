import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import {
  Popover, PopoverContent, PopoverFooter, PopoverTrigger, POPOVER_SIDES, POPOVER_SIZES, type PopoverSide, type PopoverSize,
} from '../../../src/components/escala-ui/popover'
import { avatarGradientCss } from '../../../src/components/escala-ui/avatar'

/** Story args = the Figma `Popover` set (design-plans/popover-contract.md), in the panel's order and with its defaults:
 *  Size · Side (variant axes), ArrowVisible · CloseVisible · MediaVisible · Title · DescriptionVisible · Description ·
 *  ContentVisible · FooterVisible. */
interface PopoverStoryArgs {
  size: PopoverSize
  side: PopoverSide
  arrowVisible: boolean
  closeVisible: boolean
  mediaVisible: boolean
  title: string
  descriptionVisible: boolean
  description: string
  contentVisible: boolean
  footerVisible: boolean
}

const CONTENT = 'Replace this slot with the popover body: a mini form, settings rows, a profile card or release notes.'

function popover({ size, side, arrowVisible, closeVisible, mediaVisible, title, descriptionVisible, description, contentVisible, footerVisible }: PopoverStoryArgs) {
  const btn = size === 'sm' ? 'xs' : size === 'lg' ? 'default' : 'sm'
  return (
    <Popover>
      <PopoverContent
        inline
        size={size}
        side={side}
        arrow={arrowVisible}
        showCloseButton={closeVisible}
        media={mediaVisible ? <div style={{ height: '100%', width: '100%', background: avatarGradientCss(0) }} /> : undefined}
        title={title}
        descriptionVisible={descriptionVisible}
        description={description}
        footer={footerVisible ? (
          <PopoverFooter leading="Step 1 of 3">
            <Button variant="secondary" appearance="solid" size={btn}>Skip</Button>
            <Button variant="default" appearance="solid" size={btn}>Next</Button>
          </PopoverFooter>
        ) : undefined}
      >
        {contentVisible ? CONTENT : null}
      </PopoverContent>
    </Popover>
  )
}

const meta: Meta<PopoverStoryArgs> = {
  title: 'Content & Surfaces/Popover',
  render: popover,
  args: {
    size: 'default', side: 'bottom', arrowVisible: true, closeVisible: false, mediaVisible: false, title: 'Share this view',
    descriptionVisible: true, description: 'Anyone with the link can see the filters and columns you applied.', contentVisible: false, footerVisible: false,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...POPOVER_SIZES] },
    side: { name: 'Side', control: 'select', options: [...POPOVER_SIDES] },
    arrowVisible: { name: 'ArrowVisible', control: 'boolean' },
    closeVisible: { name: 'CloseVisible', control: 'boolean' },
    mediaVisible: { name: 'MediaVisible', control: 'boolean' },
    title: { name: 'Title', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    contentVisible: { name: 'ContentVisible', control: 'boolean' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<PopoverStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {POPOVER_SIZES.flatMap((size) => POPOVER_SIDES.map((side) => <div key={size + side}>{popover({ ...args, size, side })}</div>))}
    </div>
  ),
}

/** The real thing: opens from the trigger on click, closes with Escape or an outside click. */
export const WithTrigger: Story = {
  render: (args) => (
    <div style={{ padding: 120 }}>
      <Popover>
        <PopoverTrigger asChild><Button variant="secondary">Share</Button></PopoverTrigger>
        <PopoverContent size={args.size} side={args.side} title={args.title} description={args.description} />
      </Popover>
    </div>
  ),
}
