// Escala components on the shadcn Button / Input / Progress skeleton:
// FileUpload (a trigger and its files) and Dropzone (a drag target).
// Appearance: their recipes (FileUpload, Dropzone).
import * as React from 'react'
import { cn } from '../../lib/utils'

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

export interface DropzoneProps extends Omit<React.ComponentProps<'div'>, 'onDrop' | 'title'> {
  /** Pin a state without a pointer (docs playground). */
  forceState?: 'Default' | 'Dragging' | 'Error'
  icon?: React.ReactNode
  title?: React.ReactNode
  hint?: React.ReactNode
  onFiles?: (files: File[]) => void
  width?: number | string
}

function Dropzone({ forceState, icon, title, hint, onFiles, width, className, style, ...props }: DropzoneProps) {
  const [over, setOver] = React.useState(false)
  const state = forceState ?? (over ? 'Dragging' : 'Default')
  return (
    <div
      data-slot="dropzone"
      data-escala="Dropzone"
      data-force-state={state !== 'Default' ? state : undefined}
      aria-invalid={state === 'Error' || undefined}
      className={cn('flex cursor-pointer flex-col items-center text-center', className)}
      // Dashed is the dropzone's shape, not a colour: inline so it wins over the recipe's solid.
      style={{ borderStyle: 'dashed', width, ...style }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles?.(Array.from(e.dataTransfer.files)) }}
      {...props}
    >
      <span data-part="Dropzone.icon" className="inline-flex items-center justify-center">{icon}</span>
      <span data-part="Dropzone.title">{title}</span>
      <span data-part="Dropzone.hint">{hint}</span>
    </div>
  )
}

export { Dropzone, FileUpload, FileUploadFile }
