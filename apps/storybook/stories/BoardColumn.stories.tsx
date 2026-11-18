import type { Meta, StoryObj } from '@storybook/react-vite'
import { BoardColumn } from '../../../src/components/escala-ui/board-column'
import { IssueCard } from '../../../src/components/escala-ui/issue-card'

/** Story args = the Figma `BoardColumn` (2228:161): Title, Count, NewIssueVisible and the Content slot. Motion: none. */
interface Args { title: string; count: string; newIssueVisible: boolean }
const meta: Meta<Args> = {
  title: 'Pages/BoardColumn',
  tags: ['stage:storybook'],
  render: (a) => (
    <div style={{ width: 272 }}>
      <BoardColumn title={a.title} count={a.count} newIssueVisible={a.newIssueVisible}>
        <IssueCard href="#" issueKey="PAY-312" title="Support split payments across two cards" comments="3" due="Nov 20" />
        <IssueCard href="#" issueKey="PAY-298" title="Retry failed webhooks with backoff" pullRequest="#2036" />
      </BoardColumn>
    </div>
  ),
  args: { title: 'Backlog', count: '4', newIssueVisible: true },
  argTypes: { title: { name: 'Title', control: 'text' }, count: { name: 'Count', control: 'text' }, newIssueVisible: { name: 'NewIssueVisible', control: 'boolean' } },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
