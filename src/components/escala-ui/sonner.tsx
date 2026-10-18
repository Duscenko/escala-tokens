// Skeleton: shadcn/ui `bases/radix/ui/sonner.tsx` (MIT, see LICENSE-shadcn.md):
// the `sonner` Toaster, its toast `type`s (default · success · info · warning ·
// error · loading) told apart by the icon, as in shadcn. shadcn points Sonner's
// CSS variables at its popover colours; here the recipe (Sonner) paints the
// toast parts Sonner renders (`[data-sonner-toast]`, `[data-title]`,
// `[data-description]`, `[data-icon]`, `[data-button]`) under the wrapper.
import * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

export const SONNER_TYPES = ['default', 'success', 'info', 'warning', 'error', 'loading'] as const
export type SonnerType = (typeof SONNER_TYPES)[number]

function Toaster(props: ToasterProps) {
  return (
    <div data-slot="sonner" data-escala="Sonner" style={{ display: 'contents' }}>
      <Sonner className="toaster group" {...props} />
    </div>
  )
}

export { Toaster }
export { toast } from 'sonner'
