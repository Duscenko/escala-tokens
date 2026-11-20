import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReactionGroup, type ReactionValue } from '../../../src/components/escala-ui/reaction-group'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import { Separator } from '../../../src/components/escala-ui/separator'
import { Button } from '../../../src/components/escala-ui/button'
import { blockType } from '../../../src/components/escala-ui/blocks/shared'
import { AVATAR_PHOTOS } from './avatarPhotos'

/** Story args = the Figma `ReactionGroup` set (design-plans/reaction-group-contract.md), in the panel's order and with its
 *  defaults: Summary · SummaryVisible (Content is the slot the reactions fill). The reactions themselves are the code API. */
interface ReactionGroupStoryArgs {
  summary: string
  summaryVisible: boolean
}

/** The file's default row: Celebrate 13 and Like 10 are yours, Insightful 3, Question 1. */
const DEFAULT: ReactionValue[] = [
  { id: 'celebrate', count: 13, reacted: true },
  { id: 'like', count: 10, reacted: true },
  { id: 'insightful', count: 3 },
  { id: 'question', count: 1 },
]
/** Frame 2 of the prototype: you took your Like back. */
const TOGGLED_OFF: ReactionValue[] = DEFAULT.map((v) => (v.id === 'like' ? { ...v, count: 9, reacted: false } : v))
/** Frame 4: you picked Love, which arrives before the trigger. */
const ADDED: ReactionValue[] = [...TOGGLED_OFF, { id: 'love', count: 1, reacted: true }]

const DEFAULT_SUMMARY = '27 reactions · You reacted with Celebrate and Like'

/** The file draws the set 480 wide. */
const frame: React.CSSProperties = { width: 'calc(var(--dimension-96, 384px) + var(--dimension-24, 96px))', maxWidth: '100%' }

function Row({ value, args, open, highlighted }: { value: ReactionValue[]; args: ReactionGroupStoryArgs; open?: boolean; highlighted?: string }) {
  const [current, setCurrent] = React.useState(value)
  // The Figma default text describes the default row; once the row changes the summary is written from it.
  const untouched = current === value && args.summary === DEFAULT_SUMMARY && value === DEFAULT
  return (
    <div style={frame}>
      <ReactionGroup
        value={current}
        onValueChange={setCurrent}
        summary={untouched || args.summary !== DEFAULT_SUMMARY ? args.summary : undefined}
        summaryVisible={args.summaryVisible}
        defaultOpen={open}
        highlighted={highlighted}
      />
    </div>
  )
}

const meta: Meta<ReactionGroupStoryArgs> = {
  title: 'Buttons/ReactionGroup',
  tags: ['stage:storybook'],
  render: (args) => <Row value={DEFAULT} args={args} />,
  args: { summary: DEFAULT_SUMMARY, summaryVisible: true },
  argTypes: {
    summary: { name: 'Summary', control: 'text', description: 'The line under the row. In an app, leave it out and it is written from the reactions.' },
    summaryVisible: { name: 'SummaryVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ReactionGroupStoryArgs>

export const Playground: Story = {}

/** The file's default: Celebrate 13 and Like 10 selected (you reacted), Insightful 3, Question 1, then the trigger. */
export const Default: Story = {}

/** You took your Like back: the pill returns to its Default look and its count rolls down to 9. */
export const ToggleOff: Story = { render: (args) => <Row value={TOGGLED_OFF} args={args} /> }

/** The picker open above the trigger (State=Open), Love highlighted. Arrow keys move and wrap, Escape closes. */
export const PickerOpen: Story = {
  // Room above the row: the picker opens on top, as the file draws it.
  render: (args) => <div style={{ paddingTop: 'var(--dimension-20, 80px)' }}><Row value={TOGGLED_OFF} args={args} open highlighted="love" /></div>,
}

/** You picked Love: a new selected pill (Love 1) arrives before the trigger. */
export const ReactionAdded: Story = { render: (args) => <Row value={ADDED} args={args} /> }

/** In a post, as the file's prototype draws it: author, title, body, a subtle separator, then the group with its summary. */
export const InPost: Story = {
  render: (args) => (
    <article
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', padding: 'var(--spacing-inset-surface)', boxSizing: 'border-box',
        width: 'calc(var(--dimension-96, 384px) + var(--dimension-44, 176px))', maxWidth: '100%',
        background: 'var(--color-surface-layer-1)', border: 'var(--stroke-divider, 1px) solid var(--color-border-default)', borderRadius: 'var(--radius-container)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-gap-control)' }}>
        <Avatar type="image" src={AVATAR_PHOTOS['photo-11']} alt="Inès Moreau" />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ ...blockType('heading-2xs'), color: 'var(--color-content-primary)' }}>Inès Moreau</span>
          <span style={{ ...blockType('body-sm'), color: 'var(--color-content-secondary)' }}>Shipped Ohmewn 2.4 · Tue 18 Nov</span>
        </div>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-tight)' }}>
        <h3 style={{ ...blockType('heading-xs'), margin: 0, color: 'var(--color-content-primary)' }}>Comments now work offline</h3>
        <p style={{ ...blockType('body-md'), margin: 0, color: 'var(--color-content-secondary)' }}>
          Notes you leave on a plane or in a tunnel are kept on your device and posted the moment you are back online. When two people edit the same comment, both versions stay visible until someone picks one.
        </p>
      </div>
      <Separator tone="subtle" />
      <Row value={DEFAULT} args={args} />
    </article>
  ),
}

/**
 * Motion: the real lifecycle. Replay shows the first render (the pills arrive one after another on `use-stagger-in`). Toggle a
 * pill and its count rolls in the direction of the change (`use-toggle`); take the last count away and the pill leaves on
 * `use-travel-out` while its neighbours travel into the gap (`use-travel-in`); pick a reaction and the picker opens on
 * `popover-enter`. A pressed pill sinks on `use-press`. Reduced motion comes from the tokens.
 */
export const Motion: Story = {
  render: (args) => {
    const [run, setRun] = React.useState(0)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', alignItems: 'flex-start' }}>
        <Button variant="secondary" appearance="outline" size="sm" onClick={() => setRun((n) => n + 1)}>Replay</Button>
        <Row key={run} value={DEFAULT} args={args} />
      </div>
    )
  },
}
