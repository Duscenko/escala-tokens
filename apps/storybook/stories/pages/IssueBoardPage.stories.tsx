import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from '../../../../src/components/escala-ui/avatar'
import { Badge } from '../../../../src/components/escala-ui/badge'
import { BoardColumn } from '../../../../src/components/escala-ui/board-column'
import { IssueCard } from '../../../../src/components/escala-ui/issue-card'
import { AVATAR_PHOTO_LIST } from '../avatarPhotos'

/** The Figma `IssueBoardPage` (2223:839): a screen composed from components only. Motion: none beyond the components. */
const LANES = [
  { title: 'Backlog', issues: [{ k: 'PAY-312', t: 'Support split payments across two cards', tag: 'Payments' }, { k: 'PAY-298', t: 'Retry failed webhooks with backoff', tag: 'Platform' }] },
  { title: 'In progress', issues: [{ k: 'PAY-305', t: 'Show tax on the order summary', tag: 'Checkout' }] },
  { title: 'In review', issues: [{ k: 'PAY-287', t: 'Refund to the original payment method', tag: 'Payments' }] },
  { title: 'Done', issues: [{ k: 'PAY-271', t: 'Export invoices as PDF', tag: 'Billing' }] },
]
function IssueBoardPage() {
  return (
    <main style={{ background: 'var(--color-surface-page)', padding: 'var(--spacing-inset-page)', display: 'flex', gap: 'var(--spacing-gap-group)', overflowX: 'auto', alignItems: 'flex-start' }}>
      {LANES.map((lane, li) => (
        <div key={lane.title} style={{ width: 272, flexShrink: 0 }}>
          <BoardColumn title={lane.title} count={lane.issues.length}>
            {lane.issues.map((i, ii) => (
              <IssueCard key={i.k} href="#" issueKey={i.k} title={i.t} comments="3" due="Nov 20"
                assignee={<Avatar type="image" size="xs" shape="circle" src={AVATAR_PHOTO_LIST[(li * 2 + ii) % AVATAR_PHOTO_LIST.length]} aria-label="Assignee" />}
                tag={<Badge appearance="soft" shape="rounded" size="sm" type="default" variant="info">{i.tag}</Badge>} />
            ))}
          </BoardColumn>
        </div>
      ))}
    </main>
  )
}
const meta: Meta = { title: 'Pages/IssueBoardPage', tags: ['stage:storybook'], parameters: { layout: 'fullscreen' }, render: () => <IssueBoardPage /> }
export default meta
type Story = StoryObj
export const Playground: Story = {}
export const Dark: Story = { globals: { theme: 'dark' } }
export const Mobile: Story = { globals: { dimensions: 'mobile' } }
