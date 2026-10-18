// Skeleton: shadcn/ui `bases/radix/ui/resizable.tsx` (MIT, see LICENSE-shadcn.md):
// react-resizable-panels — a group of panels split by draggable handles,
// `orientation` horizontal | vertical, `withHandle` for a visible grip.
// Appearance: recipe (Resizable).
import * as React from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'
import { cn } from '../../lib/utils'

function ResizablePanelGroup({ className, orientation = 'horizontal', ...props }: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      data-escala="Resizable"
      data-orientation={orientation}
      orientation={orientation}
      className={cn('flex h-full w-full', orientation === 'vertical' && 'flex-col', className)}
      {...props}
    />
  )
}

function ResizablePanel(props: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" data-part="Resizable.panel" {...props} />
}

function ResizableHandle({ withHandle, className, ...props }: ResizablePrimitive.SeparatorProps & { withHandle?: boolean }) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      data-part="Resizable.handle"
      className={cn('relative flex items-center justify-center outline-none', className)}
      {...props}
    >
      {withHandle && <div data-part="Resizable.grip" className="z-10 flex h-6 w-1 shrink-0" />}
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
