import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { Button } from '../../../src/components/escala-ui/button'
import { Input } from '../../../src/components/escala-ui/input'
import { PortalScopeContext } from '../../../src/components/escala-ui/portal-scope'
import {
  Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTrigger, SHEET_SIDES, type SheetSide,
} from '../../../src/components/escala-ui/sheet'

/** Story args = the Figma `Sheet` set (design-plans/sheet-contract.md; 1648:1577), in the panel's order and with its defaults:
 *  Side is its only variant axis, then Content (the slot) · FooterVisible · CloseVisible · ContentVisible. */
interface SheetStoryArgs {
  side: SheetSide
  content: string
  footerVisible: boolean
  closeVisible: boolean
  contentVisible: boolean
}

const BODY = 'Replace this slot with the sheet body.'
const bottom = (side: SheetSide) => side === 'bottom'

function actions(side: SheetSide) {
  const confirm = <Button key="confirm">Confirm</Button>
  const cancel = <SheetClose key="cancel" asChild><Button variant="secondary">Cancel</Button></SheetClose>
  // The file's stacked footer puts the confirm first; inline puts the primary action last.
  return bottom(side) ? [confirm, cancel] : [cancel, confirm]
}

function sheet({ side, content, footerVisible, closeVisible, contentVisible }: SheetStoryArgs) {
  return (
    <Sheet open modal={false}>
      <SheetContent
        inline
        side={side}
        showClose={closeVisible}
        // Figma draws the side sheets at the height of the screen it is on (852) and the bottom one at its content.
        style={bottom(side) ? { width: 393 } : { height: 852 }}
        header={<SheetHeader iconVisible={false} title="Sheet title" description="Short description of what this panel is for." />}
        footer={footerVisible ? <SheetFooter>{actions(side)}</SheetFooter> : undefined}
      >
        {contentVisible ? content : null}
      </SheetContent>
    </Sheet>
  )
}

const meta: Meta<SheetStoryArgs> = {
  title: 'Content & Surfaces/Sheet',
  render: sheet,
  args: { side: 'right', content: BODY, footerVisible: true, closeVisible: true, contentVisible: true },
  argTypes: {
    side: { name: 'Side', control: 'select', options: [...SHEET_SIDES], description: 'The edge it is anchored to: right · left (desktop drawers) · bottom (the mobile sheet).' },
    content: { name: 'Content', control: 'text' },
    footerVisible: { name: 'FooterVisible', control: 'boolean' },
    closeVisible: { name: 'CloseVisible', control: 'boolean' },
    contentVisible: { name: 'ContentVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<SheetStoryArgs>

export const Playground: Story = {}

/** The matrix: the three sides side by side, as the Figma set draws them. */
export const Sides: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SHEET_SIDES.map((side) => <div key={side}>{sheet({ ...args, side })}</div>)}
    </div>
  ),
}

/**
 * Motion: the real lifecycle. A trigger opens the Sheet over the page: the scrim fades on `use-overlay-in` while the panel
 * crosses in from its own edge on `use-travel-in` (`sheet-enter`); closing plays `sheet-exit` (`use-travel-out`,
 * `use-overlay-out`) BEFORE the panel unmounts. With reduced motion the travel becomes a fade, from the tokens.
 */
export const Motion: Story = {
  render: () => {
    const [side, setSide] = React.useState<SheetSide>('right')
    const [open, setOpen] = React.useState(false)
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <div style={{ display: 'flex', gap: 8 }}>
          {SHEET_SIDES.map((s) => (
            <SheetTrigger key={s} asChild><Button variant="secondary" onClick={() => setSide(s)}>Open {s}</Button></SheetTrigger>
          ))}
        </div>
        <SheetContent
          side={side}
          header={<SheetHeader iconVisible={false} title="Filters" description="Narrow the list." />}
          footer={<SheetFooter>{actions(side)}</SheetFooter>}
        >
          {BODY}
        </SheetContent>
      </Sheet>
    )
  },
}

/**
 * Mobile: the bottom sheet on a 393 x 852 screen, the real (portaled, focus-trapped) panel kept inside a phone frame. The
 * keyboard case passes the visual viewport a software keyboard leaves (336 px of 852): the sheet stays above it and is
 * capped by what is visible, not by 100vh. The bottom safe area sits under the footer.
 */
const COUNTRIES = ['Germany +49', 'Ghana +233', 'Gibraltar +350', 'Greece +30', 'Greenland +299', 'Grenada +1', 'Guadeloupe +590', 'Guam +1', 'Guatemala +502', 'Guernsey +44', 'Guinea +224', 'Guyana +592', 'Haiti +509', 'Honduras +504', 'Hong Kong +852', 'Hungary +36', 'Iceland +354', 'India +91', 'Indonesia +62', 'Iran +98']

function Phone({ keyboard }: { keyboard: boolean }) {
  const [frame, setFrame] = React.useState<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(true)
  return (
    <div
      ref={setFrame}
      // `transform` makes this the containing block of the panel's `position: fixed`.
      style={{ position: 'relative', width: 393, height: 852, overflow: 'hidden', transform: 'translateZ(0)', background: 'var(--color-surface-page)', boxShadow: '0 0 0 1px var(--color-border-default)', borderRadius: 40 }}
    >
      <div style={{ padding: 20 }}><Button onClick={() => setOpen(true)}>Open sheet</Button></div>
      <PortalScopeContext.Provider value={frame}>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            viewport={keyboard ? { height: 852 - 336, bottom: 336 } : { height: 852, bottom: 0 }}
            header={<SheetHeader iconVisible={false} title="Choose a country" />}
          >
            <Input type="search" placeholder="Search country or +code" aria-label="Search" shortcut={null} />
            {COUNTRIES.map((c) => <div key={c}>{c}</div>)}
          </SheetContent>
        </Sheet>
      </PortalScopeContext.Provider>
    </div>
  )
}
export const Mobile: Story = { render: () => <Phone keyboard={false} />, parameters: { layout: 'padded' } }
export const MobileKeyboard: Story = { render: () => <Phone keyboard />, parameters: { layout: 'padded' } }
