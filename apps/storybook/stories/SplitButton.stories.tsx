import type { Meta, StoryObj } from '@storybook/react-vite'
import { SplitButton, SPLIT_BUTTON_SIZES, SPLIT_BUTTON_VARIANTS } from '../../../src/components/escala-ui/split-button'

/** Story args = the Figma `SplitButton` set's properties, in the order and with the defaults of its component playground
 *  (design-plans/split-button-contract.md): `Variant` · `Size` · `Open` are its only properties (three variant axes, no
 *  TEXT, BOOLEAN or INSTANCE_SWAP). `label` is NOT a Figma property: the file edits the label «through the exposed
 *  ButtonGroup items», so here it is one extra control after the panel's. */
interface SplitButtonStoryArgs {
  variant: (typeof SPLIT_BUTTON_VARIANTS)[number]
  size: (typeof SPLIT_BUTTON_SIZES)[number]
  open: boolean
  label: string
}

/** `open` seeds the menu's starting state; a real click on the caret, Escape or a pick still opens and closes it, so the
 *  Playground behaves as the product does. `key` re-seeds it when the control changes. */
function render({ variant, size, open, label }: SplitButtonStoryArgs) {
  return (
    <SplitButton key={`${variant}-${size}-${open}`} variant={variant} size={size} defaultOpen={open}>
      {label}
    </SplitButton>
  )
}

/** The menu hangs in place (no portal, no focus trap) so several can be open on one page, like the file's DocMatrix. */
function Specimen({ variant, size, open, label }: SplitButtonStoryArgs) {
  return (
    <SplitButton variant={variant} size={size} open={open} inline>
      {label}
    </SplitButton>
  )
}

const meta: Meta<SplitButtonStoryArgs> = {
  title: 'Buttons/SplitButton',
  render,
  args: { variant: 'default', size: 'default', open: false, label: 'Publish' },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...SPLIT_BUTTON_VARIANTS], description: 'Brand (Action/primary) or neutral (Action/secondary) fill, inherited from ButtonGroup.' },
    size: { name: 'Size', control: 'select', options: [...SPLIT_BUTTON_SIZES], description: 'Size/control-md 40 · xs 24 · sm 32 · lg 48. The menu is the DropdownMenu of the same size (xs opens sm).' },
    open: { name: 'Open', control: 'boolean', description: 'Closed, or open: the caret turns Active (CaretUp) and the DropdownMenu hangs below, aligned to the end edge.' },
    label: { name: 'Label', control: 'text', description: 'The main segment\'s label — the nested ButtonGroupItem\'s Label in the file, not a property of the set. The caret is named after it: «Publish more actions».' },
  },
  // The default Variant's label is light on the violet fill in Dark: the file's Content/on-action on Action/primary/default, judged by perceived
  // contrast (APCA) as on Button — the a11y panel reads WCAG 4.0:1 there. The owner's decision, not a bug.
  parameters: { a11y: { context: { exclude: ['[data-escala="SplitButton"][data-variant="default"] [data-part="SplitButton.action"]'] } } },
}
export default meta
type Story = StoryObj<SplitButtonStoryArgs>

/** The set as Figma's component playground has it. Click the caret (or press ↓ / Enter on it) to open the menu. */
export const Playground: Story = {}

/** The 16 variants, as the file's DocMatrix draws them: Variant down, Size across, closed above and open below. */
export const AllCombinations: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 296px)', columnGap: 16, rowGap: 24, alignItems: 'start' }}>
      {SPLIT_BUTTON_VARIANTS.flatMap((variant) =>
        ([false, true] as const).flatMap((open) =>
          SPLIT_BUTTON_SIZES.map((size) => (
            <div key={`${variant}-${open}-${size}`} style={{ minHeight: open ? 220 : 48, display: 'flex', justifyContent: 'flex-start', paddingLeft: 256 - 148 + 8 }}>
              <Specimen {...args} variant={variant} size={size} open={open} />
            </div>
          )),
        ),
      )}
    </div>
  ),
}

/** `Size` — the four heights of Button: Size/control-xs · sm · md · lg (24 · 32 · 40 · 48). */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      {SPLIT_BUTTON_SIZES.map((size) => <div key={size}><Specimen {...args} size={size} open={false} /></div>)}
    </div>
  ),
}

/** `Open` — closed and open for both Variants. Open pins the caret Active (Action/primary or secondary pressed) and hangs the menu. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 160, alignItems: 'flex-start', flexWrap: 'wrap', paddingBottom: 168, paddingLeft: 120 }}>
      {SPLIT_BUTTON_VARIANTS.flatMap((variant) =>
        ([false, true] as const).map((open) => (
          <div key={`${variant}-${open}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <Specimen {...args} variant={variant} open={open} />
            <span style={{ font: '12px sans-serif', color: 'var(--color-content-secondary)', marginTop: open ? 0 : 0 }}>{variant} · {open ? 'open' : 'closed'}</span>
          </div>
        )),
      )}
    </div>
  ),
}

/** Motion. Click the caret: it turns Active and swaps to CaretUp, the menu grows out of it on `popover-enter`, and its rows arrive one after
 *  another on `use-stagger-in` (each `--motion-stagger` behind the last). Escape or a click outside closes it on `popover-exit` and focus returns
 *  to the caret. Switch the toolbar's motion preset to retime it; reduced motion keeps only the fade. */
export const Motion: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 96, alignItems: 'flex-start', flexWrap: 'wrap', paddingBottom: 168 }}>
      {SPLIT_BUTTON_VARIANTS.map((variant) => (
        <div key={variant} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <SplitButton variant={variant} size={args.size}>{args.label}</SplitButton>
          <span style={{ font: '12px sans-serif', color: 'var(--color-content-secondary)' }}>{variant} · click the caret</span>
        </div>
      ))}
    </div>
  ),
}
