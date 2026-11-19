import type { Meta, StoryObj } from '@storybook/react-vite'
import { BoardColumn } from '../../../src/components/escala-ui/board-column'
import { IssueCard } from '../../../src/components/escala-ui/issue-card'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import { Badge } from '../../../src/components/escala-ui/badge'
import { AVATAR_PHOTOS } from './avatarPhotos'

/** The file's default IssueCard: a photo assignee, a PR, two tags, comments and a due date. */
const face = (name: keyof typeof AVATAR_PHOTOS) => <Avatar type="image" size="xs" shape="circle" src={AVATAR_PHOTOS[name]} aria-label="Assignee" />
const tags = { tag: <Badge appearance="soft" shape="rounded" size="sm" type="default" variant="info">Frontend</Badge>, tagSecondary: <Badge appearance="soft" shape="rounded" size="sm" type="default" variant="critical">Bug</Badge> }

/** Story args = the Figma `BoardColumn` (2228:161): Title, Count, NewIssueVisible and the Content slot. Motion: none. */
interface Args { title: string; count: string; newIssueVisible: boolean }
const meta: Meta<Args> = {
  title: 'Screens/IssueBoardPage',
  tags: ['!autodocs', 'part'],
  render: (a) => (
    <div style={{ width: 272 }}>
      <BoardColumn title={a.title} count={a.count} newIssueVisible={a.newIssueVisible}>
        <IssueCard href="#" issueKey="PAY-312" title="Support split payments across two cards" pullRequest="#2041" assignee={face('photo-9')} {...tags} comments="3" due="Nov 20" />
        <IssueCard href="#" issueKey="PAY-298" title="Retry failed webhooks with backoff" pullRequest="#2036" assignee={face('photo-12')} {...tags} comments="1" due="Nov 22" />
      </BoardColumn>
    </div>
  ),
  args: { title: 'Backlog', count: '4', newIssueVisible: true },
  argTypes: { title: { name: 'Title', control: 'text' }, count: { name: 'Count', control: 'text' }, newIssueVisible: { name: 'NewIssueVisible', control: 'boolean' } },
}
export default meta
type Story = StoryObj<Args>
export const BoardColumnPlayground: Story = { name: 'BoardColumn · Playground' }
