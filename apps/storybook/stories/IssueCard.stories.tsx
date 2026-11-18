import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import { Badge } from '../../../src/components/escala-ui/badge'
import { IssueCard, ISSUE_CARD_STATES, type IssueCardState } from '../../../src/components/escala-ui/issue-card'

/** Story args = the Figma `IssueCard` set (2228:160). */
interface Args {
  forceState: IssueCardState; issueKey: string; title: string; pullRequestVisible: boolean; pullRequest: string
  tagSecondaryVisible: boolean; commentsVisible: boolean; comments: string; dueVisible: boolean; due: string; assigneeVisible: boolean
}
function card(a: Args) {
  return (
    <IssueCard
      href="#" onClick={(e) => e.preventDefault()} forceState={a.forceState} issueKey={a.issueKey} title={a.title}
      pullRequest={a.pullRequestVisible ? a.pullRequest : undefined}
      assignee={a.assigneeVisible ? <Avatar type="initials" size="xs" shape="circle" variant="secondary" appearance="soft">IM</Avatar> : undefined}
      tag={<Badge appearance="soft" shape="rounded" size="sm" type="default" variant="info">Payments</Badge>}
      tagSecondary={a.tagSecondaryVisible ? <Badge appearance="soft" shape="rounded" size="sm" type="default" variant="critical">Bug</Badge> : undefined}
      comments={a.commentsVisible ? a.comments : undefined} due={a.dueVisible ? a.due : undefined}
    />
  )
}
const meta: Meta<Args> = {
  title: 'Pages/IssueCard',
  tags: ['stage:storybook'],
  render: (a) => <div style={{ width: 256 }}>{card(a)}</div>,
  args: { forceState: 'Default', issueKey: 'PAY-312', title: 'Support split payments across two cards', pullRequestVisible: true, pullRequest: '#2041', tagSecondaryVisible: true, commentsVisible: true, comments: '3', dueVisible: true, due: 'Nov 20', assigneeVisible: true },
  argTypes: {
    forceState: { name: 'State', control: 'select', options: [...ISSUE_CARD_STATES] },
    issueKey: { name: 'IssueKey', control: 'text' }, title: { name: 'Title', control: 'text' },
    pullRequestVisible: { name: 'PullRequestVisible', control: 'boolean' }, pullRequest: { name: 'PullRequest', control: 'text' },
    tagSecondaryVisible: { name: 'TagSecondaryVisible', control: 'boolean' },
    commentsVisible: { name: 'CommentsVisible', control: 'boolean' }, comments: { name: 'Comments', control: 'text' },
    dueVisible: { name: 'DueVisible', control: 'boolean' }, due: { name: 'Due', control: 'text' },
    assigneeVisible: { name: 'AssigneeVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
/** Every State. */
export const States: Story = { render: (a) => <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>{ISSUE_CARD_STATES.map((s) => <div key={s} style={{ width: 256 }}>{card({ ...a, forceState: s })}</div>)}</div> }
/** Drag the card: the position follows the pointer with no transition (MOT-005); only the edge and the shadow ease. */
export const Motion: Story = {
  render: function Render(a) {
    const [drag, setDrag] = React.useState<{ x: number; y: number; ox: number; oy: number } | null>(null)
    const [at, setAt] = React.useState({ x: 0, y: 0 })
    return (
      <div style={{ height: 320 }}>
        <div
          data-testid="drag-target"
          style={{ width: 256, touchAction: 'none', cursor: drag ? 'grabbing' : 'grab', transform: `translate(${at.x}px, ${at.y}px)` }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: at.x, y: at.y, ox: e.clientX, oy: e.clientY }) }}
          onPointerMove={(e) => { if (drag) setAt({ x: drag.x + e.clientX - drag.ox, y: drag.y + e.clientY - drag.oy }) }}
          onPointerUp={() => setDrag(null)}
        >
          {card({ ...a, forceState: drag ? 'Dragging' : 'Default' })}
        </div>
      </div>
    )
  },
}
