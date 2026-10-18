// Escala component on the shadcn Input skeleton: committed tags and a text
// control in one field. Appearance: its recipe (InputTag).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputTagProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  /** The remove glyph (an X from the system's icon set). */
  removeIcon?: React.ReactNode
  width?: number | string
}

function InputTag({
  value, defaultValue = [], onValueChange, placeholder = 'Add a tag…', removeIcon = '×', width, className, ...props
}: InputTagProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const tags = value ?? inner
  const [draft, setDraft] = React.useState('')
  const ref = React.useRef<HTMLInputElement>(null)
  const commit = (next: string[]) => { setInner(next); onValueChange?.(next) }
  const add = () => {
    const tag = draft.trim().toLowerCase()
    setDraft('')
    if (tag && !tags.includes(tag)) commit([...tags, tag])
  }
  return (
    <div
      data-slot="input-tag"
      data-escala="InputTag"
      onClick={() => ref.current?.focus()}
      className={cn('flex cursor-text flex-wrap items-center transition-[border-color,box-shadow] duration-150', className)}
      style={{ width }}
      {...props}
    >
      {tags.map((tag) => (
        <span key={tag} data-part="InputTag.tag" className="inline-flex items-center">
          {tag}
          <button
            type="button" aria-label={`Remove ${tag}`} data-part="InputTag.tagRemove"
            className="inline-flex cursor-pointer border-0 bg-transparent p-0 outline-none"
            onClick={(e) => { e.stopPropagation(); commit(tags.filter((x) => x !== tag)) }}
          >{removeIcon}</button>
        </span>
      ))}
      <input
        ref={ref}
        data-part="InputTag.input"
        value={draft}
        placeholder={tags.length ? '' : placeholder}
        aria-label="Add a tag"
        className="min-w-16 flex-1 border-0 bg-transparent p-0 outline-none"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          else if (e.key === 'Backspace' && !draft) commit(tags.slice(0, -1))
        }}
      />
    </div>
  )
}

export { InputTag }
