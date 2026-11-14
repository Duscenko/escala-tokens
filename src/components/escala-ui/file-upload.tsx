// Escala components from the Figma file's FileUpload page: FileUpload (a FileUploadDropzone or a
// trigger Button above a list of FileUploadItem rows), FileUploadDropzone and FileUploadItem.
// Appearance: their recipes (FileUpload, FileUploadDropzone, FileUploadItem).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph, type IconName } from '../../lib/icons'
import { Button } from './button'
import { IconButton } from './icon-button'

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
        {icon ?? glyph('cloud-arrow-up', { className: 'size-full' })}
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

// FileUploadItem — the Figma `FileUploadItem` set (design-plans/file-upload-item-contract.md): one file
// row (Size default · sm × Status queued · uploading · paused · completed · error). The actions are the
// system's IconButton (secondary · ghost); the progress bar is the file's ProgressLine, drawn here.
export const FILE_UPLOAD_ITEM_SIZES = ['default', 'sm'] as const
export type FileUploadItemSize = (typeof FILE_UPLOAD_ITEM_SIZES)[number]
export const FILE_UPLOAD_ITEM_STATUSES = ['queued', 'uploading', 'paused', 'completed', 'error'] as const
export type FileUploadItemStatus = (typeof FILE_UPLOAD_ITEM_STATUSES)[number]


/** The file's own copy for each Status (its texts are not bound to properties). */
const ITEM_COPY: Record<FileUploadItemStatus, { status: string; meta: string; progress?: number }> = {
  queued: { status: 'Queued', meta: '2.6 MB' },
  uploading: { status: 'Uploading · 48%', meta: '1.2 MB / 2.6 MB', progress: 48 },
  paused: { status: 'Paused', meta: '0.6 MB / 2.6 MB', progress: 25 },
  completed: { status: 'Completed', meta: '2.6 MB' },
  error: { status: 'File exceeds 25 MB', meta: '28.4 MB' },
}

export interface FileUploadItemProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  /** Figma Size: default (two lines, IconButton sm) · sm (one line, IconButton xs). */
  size?: FileUploadItemSize
  /** Figma Status: the upload lifecycle. */
  status?: FileUploadItemStatus
  /** Figma Name. */
  name?: React.ReactNode
  /** Figma Icon (instance swap; FilePdf by default). */
  icon?: React.ReactNode
  /** Figma CompletedActionsVisible: Change and Download beside Remove (completed only). */
  completedActions?: boolean
  /** 0–100 while uploading or paused (the file shows 48 · 25). */
  progress?: number
  /** The status readout ("Uploading · 48%"); defaults to the file's copy. */
  statusText?: React.ReactNode
  /** The size readout ("1.2 MB / 2.6 MB"); defaults to the file's copy. */
  meta?: React.ReactNode
  onPause?: () => void
  onResume?: () => void
  onRemove?: () => void
  onRetry?: () => void
  onChange?: () => void
  onDownload?: () => void
}

/** FileUpload's Size, cascading to every row it holds (Figma: «Size … cascades to every item»). */
const FileUploadSizeContext = React.createContext<FileUploadItemSize | null>(null)

function FileUploadItem({
  size: sizeProp, status = 'queued', name = 'Q3-financial-report.pdf', icon, completedActions = false,
  progress, statusText, meta, onPause, onResume, onRemove, onRetry, onChange, onDownload, className, ...props
}: FileUploadItemProps) {
  const size = sizeProp ?? React.useContext(FileUploadSizeContext) ?? 'default'
  const copy = ITEM_COPY[status]
  const sm = size === 'sm'
  const btn = sm ? 'xs' : 'sm'
  const pct = Math.max(0, Math.min(100, progress ?? copy.progress ?? 0))
  const action = (label: string, d: IconName, onClick?: () => void) => (
    <IconButton key={label} aria-label={label} variant="secondary" appearance="ghost" size={btn} icon={glyph(d, { className: 'size-full' })} onClick={onClick} />
  )
  const actions = (
    <div data-part="FileUploadItem.actions" className="flex shrink-0 items-center">
      {status === 'uploading' && action('Pause', 'pause', onPause)}
      {status === 'paused' && action('Resume', 'play', onResume)}
      {status === 'error' && action('Retry', 'arrow-clockwise', onRetry)}
      {status === 'completed' && completedActions && action('Change', 'swap', onChange)}
      {status === 'completed' && completedActions && action('Download', 'download-simple', onDownload)}
      {action('Remove', status === 'completed' ? 'trash' : 'close', onRemove)}
    </div>
  )
  const statusGlyph = status === 'completed' ? 'check-circle' : status === 'error' ? 'warning-circle' : null
  const statusEl = (
    <div data-part="FileUploadItem.status" className={cn('flex min-w-0 items-center', sm ? 'shrink-0' : 'flex-1')}>
      {statusGlyph && <span data-part="FileUploadItem.statusIcon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{glyph(statusGlyph, { className: 'size-full' })}</span>}
      <span data-part="FileUploadItem.label" className="truncate">{statusText ?? copy.status}</span>
    </div>
  )
  const metaEl = <span data-part="FileUploadItem.meta" className="shrink-0">{meta ?? copy.meta}</span>
  const nameEl = <span data-part="FileUploadItem.name" className="min-w-0 flex-1 truncate">{name}</span>
  const track = (status === 'uploading' || status === 'paused') && (
    <div data-part="FileUploadItem.track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress" className="w-full overflow-hidden">
      <div data-part="FileUploadItem.bar" className="h-full" style={{ width: `${pct}%` }} />
    </div>
  )
  return (
    <div
      data-slot="file-upload-item"
      data-escala="FileUploadItem"
      data-size={size}
      data-status={status}
      className={cn('flex max-w-full', sm ? 'items-center' : 'items-start', className)}
      {...props}
    >
      <span data-part="FileUploadItem.icon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{icon ?? glyph('file-pdf', { className: 'size-full' })}</span>
      <div data-part="FileUploadItem.content" className="flex min-w-0 flex-1 flex-col">
        {sm ? (
          <div data-part="FileUploadItem.header" className="flex items-center">{nameEl}{statusEl}{metaEl}{actions}</div>
        ) : (
          <>
            <div data-part="FileUploadItem.header" className="flex items-center">{nameEl}{actions}</div>
            <div data-part="FileUploadItem.footer" className="flex items-center">{statusEl}{metaEl}</div>
          </>
        )}
        {track}
      </div>
    </div>
  )
}


// FileUpload — the Figma `FileUpload` set (design-plans/file-upload-contract.md): Size default · sm ×
// Layout dropzone · trigger. A FileUploadDropzone (lg at default, default at sm) or the system's
// secondary Button «Upload files» above the Content slot: the FileUploadItem rows, which take this
// Size unless they set their own. Keep `announcement` filled for the aria-live region (completed,
// removed and failed files), as the set's description asks.
export const FILE_UPLOAD_SIZES = ['default', 'sm'] as const
export type FileUploadSize = (typeof FILE_UPLOAD_SIZES)[number]
export const FILE_UPLOAD_LAYOUTS = ['dropzone', 'trigger'] as const
export type FileUploadLayout = (typeof FILE_UPLOAD_LAYOUTS)[number]

export interface FileUploadProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Figma Size: row density, cascades to the rows. */
  size?: FileUploadSize
  /** Figma Layout: a FileUploadDropzone, or a single trigger Button. */
  layout?: FileUploadLayout
  /** Props for the dropzone (title, description, invalid…). */
  dropzone?: Omit<FileUploadDropzoneProps, 'size' | 'onFiles' | 'accept' | 'multiple'>
  /** The trigger Button's label (Layout trigger). */
  triggerLabel?: React.ReactNode
  accept?: string
  multiple?: boolean
  onFiles?: (files: File[]) => void
  /** Text for the polite live region («brand-guidelines.pdf uploaded»). */
  announcement?: React.ReactNode
  /** Figma Content slot: the FileUploadItem rows. Omitted → the file's three sample rows. */
  children?: React.ReactNode
}

function FileUpload({
  size = 'default', layout = 'dropzone', dropzone, triggerLabel = 'Upload files', accept, multiple = true,
  onFiles, announcement, children, className, ...props
}: FileUploadProps) {
  const input = React.useRef<HTMLInputElement>(null)
  const take = (list: FileList | null) => { if (list && list.length) onFiles?.(Array.from(list)) }
  const rows = children ?? (
    <>
      <FileUploadItem status="completed" name="brand-guidelines.pdf" />
      <FileUploadItem status="uploading" name="Q3-financial-report.pdf" />
      <FileUploadItem status="error" name="product-video.mp4" icon={glyph('file', { className: 'size-full' })} />
    </>
  )
  return (
    <FileUploadSizeContext.Provider value={size}>
      <div data-slot="file-upload" data-escala="FileUpload" data-size={size} data-layout={layout} className={cn('flex max-w-full flex-col', className)} {...props}>
        {layout === 'dropzone' ? (
          // The file's dropzone FILLS the column (its own 480 / 400 is the set's specimen width).
          <FileUploadDropzone {...dropzone} size={size === 'sm' ? 'default' : 'lg'} accept={accept} multiple={multiple} onFiles={onFiles} className={cn('w-full!', dropzone?.className)} />
        ) : (
          <>
            <input
              ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden accept={accept} multiple={multiple}
              onChange={(e) => { take(e.target.files); e.target.value = '' }}
            />
            <Button
              type="button" variant="secondary" appearance="solid" size={size === 'sm' ? 'sm' : 'default'} className="self-start"
              leading={<span data-part="FileUpload.triggerIcon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{glyph('upload-simple', { className: 'size-full' })}</span>}
              onClick={() => input.current?.click()}
            >
              {triggerLabel}
            </Button>
          </>
        )}
        {/* Rows FILL the column (the item's own 480 is its specimen width). */}
        <div data-part="FileUpload.content" className="flex flex-col [&>[data-escala=FileUploadItem]]:w-full!">{rows}</div>
        <div aria-live="polite" className="sr-only">{announcement}</div>
      </div>
    </FileUploadSizeContext.Provider>
  )
}

export { FileUploadDropzone, FileUploadItem, FileUpload }
