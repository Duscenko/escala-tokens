// Escala component: a five-star score, optionally interactive. The star glyph is
// passed in (the product's icon set). Appearance: recipe (Rating).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface RatingProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  value?: number
  onValueChange?: (value: number) => void
  /** Rendered once per star. */
  star?: React.ReactNode
  /** The glyph for a filled star (a fill-weight icon); defaults to `star`. */
  starOn?: React.ReactNode
  /** "4.0 · 128 reviews" */
  label?: React.ReactNode
  /** Draw as interactive without wiring (docs, previews). */
  interactive?: boolean
}

function Rating({ value = 0, onValueChange, star = '★', starOn, label, interactive, className, ...props }: RatingProps) {
  const live = interactive ?? onValueChange != null
  const [hover, setHover] = React.useState<number | null>(null)
  const shown = hover ?? value
  return (
    <div
      data-slot="rating"
      data-escala="Rating"
      data-interactive={live ? 'True' : 'False'}
      aria-label={`${value} of 5 stars`}
      className={cn('flex items-center', className)}
      {...props}
    >
      <span data-part="Rating.stars" className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= Math.round(shown)
          const inner = <span data-part={on ? 'Rating.starOn' : 'Rating.star'} className="inline-flex">{on ? starOn ?? star : star}</span>
          return live ? (
            <button
              key={n} type="button" aria-label={`${n} stars`}
              className="inline-flex cursor-pointer border-0 bg-transparent p-0 outline-none"
              onMouseEnter={() => setHover(n)} onClick={() => onValueChange?.(n)}
            >{inner}</button>
          ) : <React.Fragment key={n}>{inner}</React.Fragment>
        })}
      </span>
      {label != null && <span data-part="Rating.label">{label}</span>}
    </div>
  )
}

export { Rating }
