import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  FileUploadItem, FILE_UPLOAD_ITEM_SIZES, FILE_UPLOAD_ITEM_STATUSES,
  type FileUploadItemSize, type FileUploadItemStatus,
} from '../../../src/components/escala-ui/file-upload'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_SWAP_OPTIONS } from './iconSwap'

/** Story args = the Figma `FileUploadItem` set (design-plans/file-upload-item-contract.md), in the
 *  panel's order and with its defaults: Size · Status, then Name · Icon · CompletedActionsVisible.
 *  The Icon swap starts on the file's FilePdf. */
interface FileUploadItemStoryArgs {
  size: FileUploadItemSize
  status: FileUploadItemStatus
  name: string
  icon: 'FilePdf' | ComponentIconName
  completedActions: boolean
}

function render({ size, status, name, icon, completedActions }: FileUploadItemStoryArgs) {
  return (
    <FileUploadItem
      size={size}
      status={status}
      name={name}
      icon={icon === 'FilePdf' ? undefined : <PreviewIcon concept={icon} size={size === 'sm' ? 20 : 24} />}
      completedActions={completedActions}
    />
  )
}

const meta: Meta<FileUploadItemStoryArgs> = {
  title: 'Forms/FileUploadItem',
  render,
  args: { size: 'default', status: 'queued', name: 'Q3-financial-report.pdf', icon: 'FilePdf', completedActions: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...FILE_UPLOAD_ITEM_SIZES], description: 'Two lines with IconButton sm · one line with IconButton xs.' },
    status: { name: 'Status', control: 'select', options: [...FILE_UPLOAD_ITEM_STATUSES] },
    name: { name: 'Name', control: 'text' },
    icon: { name: 'Icon', control: 'select', options: ['FilePdf', ...ICON_SWAP_OPTIONS] },
    completedActions: { name: 'CompletedActionsVisible', control: 'boolean', description: 'Change and Download beside Remove (Status completed).' },
  },
}
export default meta
type Story = StoryObj<FileUploadItemStoryArgs>

export const Playground: Story = {}

/** Every Size × Status, as the file's 10 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {FILE_UPLOAD_ITEM_SIZES.flatMap((size) => FILE_UPLOAD_ITEM_STATUSES.map((status) => (
        <div key={`${size}-${status}`}>{render({ ...args, size, status })}</div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {FILE_UPLOAD_ITEM_SIZES.map((size) => <div key={size}>{render({ ...args, size, status: 'uploading' })}</div>)}
    </div>
  ),
}

export const Statuses: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {FILE_UPLOAD_ITEM_STATUSES.map((status) => <div key={status}>{render({ ...args, status, completedActions: status === 'completed' })}</div>)}
    </div>
  ),
}
