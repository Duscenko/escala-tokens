import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  FileUploadDropzone, FILE_UPLOAD_DROPZONE_SIZES, FILE_UPLOAD_DROPZONE_STATES,
  type FileUploadDropzoneSize, type FileUploadDropzoneState,
} from '../../../src/components/escala-ui/file-upload'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_SWAP_OPTIONS } from './iconSwap'

/** Story args = the Figma `FileUploadDropzone` set (design-plans/file-upload-dropzone-contract.md),
 *  in the panel's order and with its defaults: Size · State, then Title · DescriptionVisible ·
 *  Description · Icon · SeparatorVisible. The Icon swap starts on the file's CloudArrowUp. */
interface FileUploadDropzoneStoryArgs {
  size: FileUploadDropzoneSize
  forceState: FileUploadDropzoneState
  title: string
  descriptionVisible: boolean
  description: string
  icon: 'CloudArrowUp' | ComponentIconName
  separatorVisible: boolean
}

const ICON_PX: Record<FileUploadDropzoneSize, number> = { sm: 16, default: 20, lg: 24 }

function render({ size, forceState, title, descriptionVisible, description, icon, separatorVisible }: FileUploadDropzoneStoryArgs) {
  const invalid = forceState === 'Invalid'
  return (
    <FileUploadDropzone
      size={size}
      forceState={forceState === 'Default' ? undefined : forceState}
      // Invalid: the file overrides the texts ("Upload failed"), unbound to Title / Description.
      title={invalid ? undefined : title}
      description={!descriptionVisible ? null : invalid ? undefined : description}
      icon={icon === 'CloudArrowUp' ? undefined : <PreviewIcon concept={icon} size={ICON_PX[size]} />}
      separator={separatorVisible}
    />
  )
}

const meta: Meta<FileUploadDropzoneStoryArgs> = {
  title: 'Forms/FileUploadDropzone',
  render,
  args: {
    size: 'default',
    forceState: 'Default',
    title: 'Drag and drop files',
    descriptionVisible: true,
    description: 'Max 10 MB each · PDF, ZIP or images',
    icon: 'CloudArrowUp',
    separatorVisible: true,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...FILE_UPLOAD_DROPZONE_SIZES], description: 'Row 480 with Button sm · compact row 400 with Button xs, no description · column 400 with OR and Button default.' },
    forceState: { name: 'State', control: 'select', options: [...FILE_UPLOAD_DROPZONE_STATES], description: 'Pins a state; in an app Hover and Dragging come from the pointer.' },
    title: { name: 'Title', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    icon: { name: 'Icon', control: 'select', options: ['CloudArrowUp', ...ICON_SWAP_OPTIONS] },
    separatorVisible: { name: 'SeparatorVisible', control: 'boolean', description: 'The OR rule above the Button (lg only).' },
  },
}
export default meta
type Story = StoryObj<FileUploadDropzoneStoryArgs>

export const Playground: Story = {}

/** Every Size × State, as the file's 15 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {(['default', 'sm', 'lg'] as const).flatMap((size) => FILE_UPLOAD_DROPZONE_STATES.map((forceState) => (
        <div key={`${size}-${forceState}`}>{render({ ...args, size, forceState })}</div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {(['default', 'sm', 'lg'] as const).map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {FILE_UPLOAD_DROPZONE_STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState })}</div>)}
    </div>
  ),
}
