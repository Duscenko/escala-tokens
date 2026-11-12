import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Table, TableCaption, TableDropIndicator, TableEmpty, TableLoadMore, TableLoading,
} from '../../../src/components/escala-ui/table'
/** The single-purpose parts of the Table page, each at the file's 800px: TableCaption · TableDropIndicator · TableEmpty ·
 *  TableLoading · TableLoadMore (State Default · Loading). */
interface Args { loadMoreState: 'Default' | 'Loading'; title: string; description: string; emptyTitle: string; emptyDescription: string; loadingLabel: string }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableParts',
  render: (a) => (
    <div style={{ width: 800, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <table style={{ display: 'block' }} aria-label={a.title}><TableCaption title={a.title} description={a.description} /></table>
      <TableDropIndicator />
      <TableEmpty title={a.emptyTitle} description={a.emptyDescription} />
      <TableLoading label={a.loadingLabel} />
      <TableLoadMore state={a.loadMoreState} />
    </div>
  ),
  args: { loadMoreState: 'Default', title: 'Team billing', description: 'Invoices for the current billing period, in EUR.', emptyTitle: 'No invoices yet', emptyDescription: 'Invoices appear here once a billing period closes.', loadingLabel: 'Loading data…' },
  argTypes: {
    loadMoreState: { name: 'TableLoadMore · State', control: 'select', options: ['Default', 'Loading'] },
    title: { name: 'TableCaption · title', control: 'text' }, description: { name: 'TableCaption · description', control: 'text' },
    emptyTitle: { name: 'TableEmpty · title', control: 'text' }, emptyDescription: { name: 'TableEmpty · description', control: 'text' },
    loadingLabel: { name: 'TableLoading · Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const InATable: Story = {
  render: () => (
    <div style={{ width: 800 }}>
      <Table aria-label="Invoices"><TableEmpty /></Table>
    </div>
  ),
}
