import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  FileUpload, FileUploadItem, FILE_UPLOAD_SIZES, FILE_UPLOAD_LAYOUTS,
  type FileUploadSize, type FileUploadLayout,
} from '../../../src/components/escala-ui/file-upload'

/** Story args = the Figma `FileUpload` set (design-plans/file-upload-contract.md), in the panel's
 *  order and with its defaults: Size · Layout (Content is a slot: the file's three sample rows). */
interface FileUploadStoryArgs {
  size: FileUploadSize
  layout: FileUploadLayout
}

const meta: Meta<FileUploadStoryArgs> = {
  title: 'Forms/FileUpload',
  render: ({ size, layout }) => <FileUpload size={size} layout={layout} />,
  args: { size: 'default', layout: 'dropzone' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...FILE_UPLOAD_SIZES], description: 'Row density; cascades to every FileUploadItem.' },
    layout: { name: 'Layout', control: 'select', options: [...FILE_UPLOAD_LAYOUTS], description: 'A FileUploadDropzone, or the trigger Button «Upload files».' },
  },
}
export default meta
type Story = StoryObj<FileUploadStoryArgs>

export const Playground: Story = {}

/** Every Size × Layout, as the file's 4 variants. */
export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {FILE_UPLOAD_LAYOUTS.flatMap((layout) => FILE_UPLOAD_SIZES.map((size) => (
        <FileUpload key={`${layout}-${size}`} size={size} layout={layout} />
      )))}
    </div>
  ),
}

/** Your own rows in the Content slot; they take the FileUpload's Size. */
export const CustomRows: Story = {
  render: ({ size, layout }) => (
    <FileUpload size={size} layout={layout} announcement="logo.svg uploaded">
      <FileUploadItem status="completed" name="logo.svg" completedActions />
      <FileUploadItem status="paused" name="launch-deck.pdf" />
      <FileUploadItem status="queued" name="press-kit.zip" />
    </FileUpload>
  ),
}
