// Escala component: Sheet — the Figma set of the same name (design-plans/sheet-contract.md; Sheet 1648:1577), 1:1.
// A mirror of Modal: the same Radix Dialog primitive (focus trap, Escape, aria-modal, focus returns to the trigger) and
// the same parts — the header and the footer ARE ModalHeader and ModalFooter (`SheetHeader` / `SheetFooter` are their
// other names, not copies). What differs is the shape: a panel anchored to an edge. Side right | left are desktop drawers
// (full height, 400 wide, clamped 320–480); bottom is the mobile sheet (a grabber, the footer stacked, the bottom safe
// area under it, a height that follows the VISUAL viewport so the keyboard never covers it).
// Appearance: recipe Sheet (lib/recipes/surfaces.ts). Motion: the choreography `sheet-enter` / `sheet-exit`, which the
// recipe plays on the panel and the scrim — the panel crosses in from its own edge (`data-side`).
import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { CloseButton } from './close-button'
import { ModalContext, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from './modal'
import { usePortalContainer } from './portal-scope'
import { useVisualViewport } from './visual-viewport'

export { useVisualViewport }

export const SHEET_SIDES = ['right', 'left', 'bottom'] as const
export type SheetSide = (typeof SHEET_SIDES)[number]

function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="sheet-overlay" data-part="Sheet.overlay" className={cn('fixed inset-0 isolate z-50', className)} {...props} />
}

function SheetTitle(props: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <ModalTitle {...props} />
}

function SheetDescription(props: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <ModalDescription {...props} />
}

export interface SheetContentProps extends Omit<React.ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  /** Figma Side: the edge it is anchored to. */
  side?: SheetSide
  /** Figma CloseVisible. */
  showClose?: boolean
  /** The close glyph — icons are the system's, passed in. */
  closeIcon?: React.ReactNode
  closeLabel?: string
  /** The header (a ModalHeader / SheetHeader), inside `main` above the Content. */
  header?: React.ReactNode
  /** Figma FooterVisible: the footer (a SheetFooter), under `main`. Stacked on the bottom side by default. */
  footer?: React.ReactNode
  /** Docs and tests: the visible part of the page, replacing the live `visualViewport` (a phone frame in a story, a keyboard). */
  viewport?: { height: number; bottom: number }
  /** Render in place: no portal, no scrim, no fixed positioning, no focus steal (docs and previews inside a themed card). */
  inline?: boolean
}

/** Figma Sheet. `children` is the Content slot. */
function SheetContent({
  side = 'right', className, style, children, header, footer, showClose = true, closeIcon, closeLabel = 'Close', inline = false, viewport: viewportProp, ...props
}: SheetContentProps) {
  const container = usePortalContainer()
  const bottom = side === 'bottom'
  const live = useVisualViewport(bottom && !inline && !viewportProp)
  const viewport = viewportProp ?? live
  const panel = (
    <DialogPrimitive.Content
      data-slot="sheet-content"
      data-escala="Sheet"
      data-side={side}
      data-inline={inline ? '' : undefined}
      className={cn(
        'relative flex max-w-full flex-col overflow-hidden text-left outline-none',
        !inline && (side === 'right' ? 'fixed inset-y-0 right-0 z-50' : side === 'left' ? 'fixed inset-y-0 left-0 z-50' : 'fixed inset-x-0 z-50 w-full'),
        className,
      )}
      style={{
        // The bottom sheet: never taller than what is visible, and above the keyboard (not 100vh).
        ...(bottom && !inline ? { bottom: viewport?.bottom ?? 0, maxHeight: viewport ? `calc(${viewport.height}px - env(safe-area-inset-top, 0px))` : 'calc(100dvh - env(safe-area-inset-top, 0px))' } : {}),
        ...(bottom && inline ? { width: '100%' } : {}),
        // The bottom safe area sits UNDER the footer (or the last of the content), on the sheet's own surface.
        ...(bottom ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : {}),
        ...style,
      }}
      onOpenAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      onCloseAutoFocus={inline ? (e) => e.preventDefault() : undefined}
      {...props}
    >
      {bottom && (
        <div data-part="Sheet.grabber" aria-hidden className="flex shrink-0 items-start justify-center">
          <div data-part="Sheet.handle" className="shrink-0" />
        </div>
      )}
      <div data-part="Sheet.main" className={cn('flex min-h-0 flex-col', !bottom && 'flex-1')}>
        {header}
        {children != null && <div data-part="Sheet.body" className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>}
      </div>
      {footer}
      {showClose && (
        <DialogPrimitive.Close data-slot="sheet-close" asChild>
          <CloseButton
            data-part="Sheet.close"
            appearance="soft"
            shape="pill"
            size="sm"
            icon={closeIcon}
            aria-label={closeLabel}
            // 20 from the corner inside the 1px edge: the edge sits on one side only (right sheet: left; left sheet: right;
            // bottom: top, under the grabber's 12).
            className="absolute"
            style={{
              top: bottom ? 'calc(var(--spacing-inset-surface) + var(--spacing-3) - var(--stroke-divider))' : 'var(--spacing-inset-surface)',
              right: side === 'left' ? 'calc(var(--spacing-inset-surface) - var(--stroke-divider))' : 'var(--spacing-inset-surface)',
            }}
          />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  )
  const provided = (
    <ModalContext.Provider value={{ size: 'default', closeClearance: showClose, dialog: true, footerLayout: bottom ? 'stacked' : 'inline' }}>
      {inline ? panel : (
        <SheetPortal container={container}>
          <SheetOverlay />
          {panel}
        </SheetPortal>
      )}
    </ModalContext.Provider>
  )
  return provided
}

export {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger,
  // The Sheet's header and footer ARE the Modal's.
  ModalHeader as SheetHeader, ModalFooter as SheetFooter,
}
