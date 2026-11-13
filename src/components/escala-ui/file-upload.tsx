// Escala components from the Figma file's FileUpload page: FileUpload (a FileUploadDropzone or a
// trigger Button above a list of FileUploadItem rows), FileUploadDropzone and FileUploadItem.
// Appearance: their recipes (FileUpload, FileUploadDropzone, FileUploadItem).
import * as React from 'react'
import { cn } from '../../lib/utils'
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

// FileUploadItem — the Figma `FileUploadItem` set (design-plans/file-upload-item-contract.md): one file
// row (Size default · sm × Status queued · uploading · paused · completed · error). The actions are the
// system's IconButton (secondary · ghost); the progress bar is the file's ProgressLine, drawn here.
export const FILE_UPLOAD_ITEM_SIZES = ['default', 'sm'] as const
export type FileUploadItemSize = (typeof FILE_UPLOAD_ITEM_SIZES)[number]
export const FILE_UPLOAD_ITEM_STATUSES = ['queued', 'uploading', 'paused', 'completed', 'error'] as const
export type FileUploadItemStatus = (typeof FILE_UPLOAD_ITEM_STATUSES)[number]

const FILE_PDF = 'M224,152a8,8,0,0,1-8,8H192v16h16a8,8,0,0,1,0,16H192v16a8,8,0,0,1-16,0V152a8,8,0,0,1,8-8h32A8,8,0,0,1,224,152ZM92,172a28,28,0,0,1-28,28H56v8a8,8,0,0,1-16,0V152a8,8,0,0,1,8-8H64A28,28,0,0,1,92,172Zm-16,0a12,12,0,0,0-12-12H56v24h8A12,12,0,0,0,76,172Zm88,8a36,36,0,0,1-36,36H112a8,8,0,0,1-8-8V152a8,8,0,0,1,8-8h16A36,36,0,0,1,164,180Zm-16,0a20,20,0,0,0-20-20h-8v40h8A20,20,0,0,0,148,180ZM40,112V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,0,1-16,0ZM160,80h28.69L160,51.31Z'
const PAUSE = 'M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z'
const PLAY = 'M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z'
const X = 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'
const TRASH = 'M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z'
const ARROW_CLOCKWISE = 'M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z'
const SWAP = 'M224,48V152a16,16,0,0,1-16,16H99.31l10.35,10.34a8,8,0,0,1-11.32,11.32l-24-24a8,8,0,0,1,0-11.32l24-24a8,8,0,0,1,11.32,11.32L99.31,152H208V48H96v8a8,8,0,0,1-16,0V48A16,16,0,0,1,96,32H208A16,16,0,0,1,224,48ZM168,192a8,8,0,0,0-8,8v8H48V104H156.69l-10.35,10.34a8,8,0,0,0,11.32,11.32l24-24a8,8,0,0,0,0-11.32l-24-24a8,8,0,0,0-11.32,11.32L156.69,88H48a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16H160a16,16,0,0,0,16-16v-8A8,8,0,0,0,168,192Z'
const DOWNLOAD_SIMPLE = 'M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z'
const CHECK_CIRCLE = 'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z'
const WARNING_CIRCLE = 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z'

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
  const action = (label: string, d: string, onClick?: () => void) => (
    <IconButton key={label} aria-label={label} variant="secondary" appearance="ghost" size={btn} icon={<PhosphorGlyph d={d} />} onClick={onClick} />
  )
  const actions = (
    <div data-part="FileUploadItem.actions" className="flex shrink-0 items-center">
      {status === 'uploading' && action('Pause', PAUSE, onPause)}
      {status === 'paused' && action('Resume', PLAY, onResume)}
      {status === 'error' && action('Retry', ARROW_CLOCKWISE, onRetry)}
      {status === 'completed' && completedActions && action('Change', SWAP, onChange)}
      {status === 'completed' && completedActions && action('Download', DOWNLOAD_SIMPLE, onDownload)}
      {action('Remove', status === 'completed' ? TRASH : X, onRemove)}
    </div>
  )
  const statusGlyph = status === 'completed' ? CHECK_CIRCLE : status === 'error' ? WARNING_CIRCLE : null
  const statusEl = (
    <div data-part="FileUploadItem.status" className={cn('flex min-w-0 items-center', sm ? 'shrink-0' : 'flex-1')}>
      {statusGlyph && <span data-part="FileUploadItem.statusIcon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full"><PhosphorGlyph d={statusGlyph} /></span>}
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
      <span data-part="FileUploadItem.icon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full">{icon ?? <PhosphorGlyph d={FILE_PDF} />}</span>
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

const UPLOAD_SIMPLE = 'M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0ZM93.66,77.66,120,51.31V144a8,8,0,0,0,16,0V51.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,77.66Z'
const FILE = 'M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z'

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
      <FileUploadItem status="error" name="product-video.mp4" icon={<PhosphorGlyph d={FILE} />} />
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
              leading={<span data-part="FileUpload.triggerIcon" aria-hidden className="inline-flex shrink-0 [&>svg]:size-full"><PhosphorGlyph d={UPLOAD_SIMPLE} /></span>}
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
