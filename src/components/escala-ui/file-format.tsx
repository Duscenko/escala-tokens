// Escala component: a document glyph with its extension on a coloured plate.
// Appearance: recipe (FileFormat). The page outline reads the recipe's two
// colours (`currentColor` and `--escala-paint`).
import * as React from 'react'
import { cn } from '../../lib/utils'

export type Format = 'pdf' | 'png' | 'svg' | 'zip'

export interface FileFormatProps extends React.ComponentProps<'span'> {
  format: Format
}

function FileFormat({ format, className, ...props }: FileFormatProps) {
  return (
    <span
      data-slot="file-format"
      data-escala="FileFormat"
      data-format={format}
      role="img"
      aria-label={`${format.toUpperCase()} file`}
      className={cn('relative inline-block', className)}
      {...props}
    >
      <svg data-part="FileFormat.page" viewBox="0 0 40 48" width="100%" height="100%" fill="none" aria-hidden>
        <path d="M4 4a3 3 0 0 1 3-3h18l11 11v32a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4Z" style={{ fill: 'var(--escala-paint)' }} stroke="currentColor" strokeWidth="1.5" />
        <path d="M25 1v8a3 3 0 0 0 3 3h8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span data-part="FileFormat.plate" className="absolute whitespace-nowrap" style={{ left: '-10%', bottom: '17%', letterSpacing: '0.04em' }}>{format.toUpperCase()}</span>
    </span>
  )
}

export { FileFormat }
