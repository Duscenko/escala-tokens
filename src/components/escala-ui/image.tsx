// Escala component: Image — the Figma set of the same name (design-plans/image-contract.md, 1126:15), 1:1,
// the file's name for what code called AspectRatio. A photo or illustration cropped to a fixed ratio
// (object-fit: cover) over Surface/muted while it loads; Ratio auto fills its parent. Always give alt text
// (alt="" when decorative). Appearance: recipe (Image).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const IMAGE_RATIOS = ['auto', '16:9', '4:3', '3:2', '1:1', '3:4'] as const
export type ImageRatio = (typeof IMAGE_RATIOS)[number]
export const IMAGE_SHAPES = ['square', 'rounded'] as const
export type ImageShape = (typeof IMAGE_SHAPES)[number]
const RATIO: Record<Exclude<ImageRatio, 'auto'>, string> = { '16:9': '16 / 9', '4:3': '4 / 3', '3:2': '3 / 2', '1:1': '1 / 1', '3:4': '3 / 4' }

export interface ImageProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Ratio: `auto` fills the parent, the rest lock the height to the width. */
  ratio?: ImageRatio
  /** Figma Shape: square (inside a slot that clips its own corners) or rounded (Radius/container). */
  shape?: ImageShape
  /** Figma Media (the swap): the picture. */
  src?: string
  alt?: string
  /** Or any media node (a video, a map) instead of `src`. */
  children?: React.ReactNode
}

function Image({ ratio = 'auto', shape = 'square', src, alt = '', children, className, style, ...props }: ImageProps) {
  return (
    <div
      data-slot="image"
      data-escala="Image"
      data-ratio={ratio}
      data-shape={shape}
      className={cn('relative block overflow-hidden', ratio === 'auto' ? 'size-full' : 'w-full', className)}
      style={ratio === 'auto' ? style : { aspectRatio: RATIO[ratio], ...style }}
      {...props}
    >
      <div data-part="Image.media" className="absolute inset-0 overflow-hidden [&>img]:size-full [&>img]:object-cover">
        {children ?? (src ? <img src={src} alt={alt} /> : null)}
      </div>
    </div>
  )
}

export { Image }
