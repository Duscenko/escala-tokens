// Escala components on the shadcn Button / Input / Progress skeleton:
// FileUpload (a trigger and its files) and FileUploadDropzone (the Figma file's drop target).
// Appearance: their recipes (FileUpload, FileUploadDropzone).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'

export interface FileUploadFileProps extends React.ComponentProps<'div'> {
  name: string
  /** Extension badge ("PDF"). */
  kind?: string
  /** 0–100; omit for a finished upload. */
  progress?: number
}

function FileUploadFile({ name, kind, progress, className, ...props }: FileUploadFileProps) {
  return (
    <div data-slot="file-upload-file" data-part="FileUpload.file" className={cn('flex items-center', className)} {...props}>
      {kind && <span data-part="FileUpload.badge">{kind}</span>}
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--spacing-1_5)' }}>
        <div className="flex justify-between">
          <span data-part="FileUpload.name" className="truncate">{name}</span>
          {progress != null && <span data-part="FileUpload.meta">{progress}%</span>}
        </div>
        {progress != null && (
          <div data-part="FileUpload.track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div data-part="FileUpload.progress" className="h-full" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

function FileUpload({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="file-upload" data-escala="FileUpload" className={cn('flex flex-col', className)} {...props} />
}

// FileUploadDropzone — the Figma `FileUploadDropzone` set (design-plans/file-upload-dropzone-contract.md):
// a dashed drop area (Size default · sm · lg × State Default · Hover · Dragging · Invalid · Disabled).
// Clicking anywhere, or the system's secondary Button, opens the file picker; dragged files land in
// `onFiles`. No focus of its own: Tab reaches the Button, as the file says.
export const FILE_UPLOAD_DROPZONE_SIZES = ['default', 'sm', 'lg'] as const
export type FileUploadDropzoneSize = (typeof FILE_UPLOAD_DROPZONE_SIZES)[number]
export const FILE_UPLOAD_DROPZONE_STATES = ['Default', 'Hover', 'Dragging', 'Invalid', 'Disabled'] as const
export type FileUploadDropzoneState = (typeof FILE_UPLOAD_DROPZONE_STATES)[number]
const DROPZONE_BUTTON_SIZE: Record<FileUploadDropzoneSize, 'xs' | 'sm' | 'default'> = { sm: 'xs', default: 'sm', lg: 'default' }

export interface FileUploadDropzoneProps extends Omit<React.ComponentProps<'div'>, 'onDrop' | 'title'> {
  /** Figma Size: default (row, 480) · sm (compact row, 400, no description) · lg (column, 400). */
  size?: FileUploadDropzoneSize
  /** Pin a State without a pointer (docs playground). */
  forceState?: FileUploadDropzoneState
  /** Figma Icon (instance swap; CloudArrowUp by default). */
  icon?: React.ReactNode
  /** Figma Title. Invalid shows the file's "Upload failed" when omitted. */
  title?: React.ReactNode
  /** Figma Description; `null` hides it (DescriptionVisible). sm never shows it. */
  description?: React.ReactNode | null
  /** Figma SeparatorVisible: the "OR" rule above the Button (lg only). */
  separator?: boolean
  /** The Button's label ("Choose file"; "Choose again" when Invalid). */
  triggerLabel?: React.ReactNode
  accept?: string
  multiple?: boolean
  invalid?: boolean
  disabled?: boolean
  onFiles?: (files: File[]) => void
}

const CLOUD_ARROW_UP = 'M178.34,165.66,160,147.31V208a8,8,0,0,1-16,0V147.31l-18.34,18.35a8,8,0,0,1-11.32-11.32l32-32a8,8,0,0,1,11.32,0l32,32a8,8,0,0,1-11.32,11.32ZM160,40A88.08,88.08,0,0,0,81.29,88.68,64,64,0,1,0,72,216h40a8,8,0,0,0,0-16H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.12A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,100.8,66,8,8,0,0,0,3.2,15.34,7.9,7.9,0,0,0,3.2-.68A88,88,0,0,0,160,40Z'
function PhosphorGlyph({ d }: { d: string }) {
  return <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false" className="size-full"><path d={d} /></svg>
}

function FileUploadDropzone({
  size = 'default', forceState, icon, title, description, separator = true, triggerLabel,
  accept, multiple = true, invalid, disabled, onFiles, className, style, onClick, ...props
}: FileUploadDropzoneProps) {
  const [over, setOver] = React.useState(false)
  const input = React.useRef<HTMLInputElement>(null)
  const isDisabled = disabled || forceState === 'Disabled'
  const state: FileUploadDropzoneState | undefined = forceState && forceState !== 'Default'
    ? forceState
    : isDisabled ? 'Disabled' : over ? 'Dragging' : invalid ? 'Invalid' : undefined
  const isInvalid = state === 'Invalid'
  const lg = size === 'lg'
  const titleText = title ?? (isInvalid ? (size === 'sm' ? 'The file exceeds the 25 MB limit.' : 'Upload failed') : 'Drag and drop files')
  const descText = description === undefined
    ? (isInvalid ? 'The file exceeds the 25 MB limit.' : 'Max 10 MB each · PDF, ZIP or images')
    : description
  const open = () => { if (!isDisabled) input.current?.click() }
  const take = (list: FileList | null) => { if (list && list.length) onFiles?.(Array.from(list)) }
  return (
    <div
      data-slot="file-upload-dropzone"
      data-escala="FileUploadDropzone"
      data-size={size}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      aria-invalid={isInvalid || undefined}
      className={cn('flex', lg ? 'flex-col items-center' : 'items-center', isDisabled ? 'cursor-not-allowed' : 'cursor-pointer', className)}
      // Dashed is the dropzone's shape (Figma dash 4·4); CSS cannot set the dash length.
      style={{ borderStyle: 'dashed', ...style }}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) open() }}
      onDragOver={(e) => { e.preventDefault(); if (!isDisabled) setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!isDisabled) take(e.dataTransfer.files) }}
      {...props}
    >
      <input
        ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden
        accept={accept} multiple={multiple} disabled={isDisabled}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => { take(e.target.files); e.target.value = '' }}
      />
      <span data-part="FileUploadDropzone.icon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">
        {icon ?? <PhosphorGlyph d={CLOUD_ARROW_UP} />}
      </span>
      <div data-part="FileUploadDropzone.text" className={cn('flex min-w-0 flex-col', lg ? 'items-center text-center' : 'flex-1')}>
        <span data-part="FileUploadDropzone.title">{titleText}</span>
        {size !== 'sm' && descText != null && <span data-part="FileUploadDropzone.description">{descText}</span>}
      </div>
      {lg && separator && (
        <div data-part="FileUploadDropzone.separator" aria-hidden className="flex w-full items-center">
          <span data-part="FileUploadDropzone.rule" className="min-w-0 flex-1" />
          <span data-part="FileUploadDropzone.or">OR</span>
          <span data-part="FileUploadDropzone.rule" className="min-w-0 flex-1" />
        </div>
      )}
      <Button
        type="button" variant="secondary" appearance="solid" size={DROPZONE_BUTTON_SIZE[size]}
        disabled={isDisabled} className="shrink-0"
        onClick={(e) => { e.stopPropagation(); open() }}
      >
        {triggerLabel ?? (isInvalid ? 'Choose again' : 'Choose file')}
      </Button>
    </div>
  )
}

export { FileUploadDropzone, FileUpload, FileUploadFile }
