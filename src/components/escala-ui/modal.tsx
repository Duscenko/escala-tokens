// Escala component: Modal, ModalHeader and ModalFooter — the Figma sets of the same names (design-plans/modal-contract.md;
// Modal 967:102, ModalHeader 965:81, ModalFooter 966:114), 1:1. Radix Dialog gives the behaviour (focus trap, Escape,
// aria-modal, return focus). A card (480 / 640) on Surface/layer-2: `main` = header + the Content slot, the footer under
// it, a ghost pill CloseButton in the corner. Appearance: recipes Modal, ModalHeader, ModalFooter (lib/componentRecipes.ts).
import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { CloseButton } from './close-button'
import { FeaturedIcon } from './featured-icon'

export const MODAL_SIZES = ['default', 'lg'] as const
export type ModalSize = (typeof MODAL_SIZES)[number]
export const MODAL_HEADER_ALIGNS = ['horizontal', 'vertical-left', 'vertical-center'] as const
export type ModalHeaderAlign = (typeof MODAL_HEADER_ALIGNS)[number]
export const MODAL_FOOTER_LAYOUTS = ['inline', 'stacked'] as const
export type ModalFooterLayout = (typeof MODAL_FOOTER_LAYOUTS)[number]

/** What the Modal tells its parts: its Size cascades to the header and the footer, the header leaves room for the close. */
const ModalContext = React.createContext<{ size: ModalSize; closeClearance: boolean; dialog: boolean } | null>(null)

function Modal(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="modal" {...props} />
}

function ModalTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="modal-trigger" {...props} />
}

function ModalPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="modal-portal" {...props} />
}

function ModalClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="modal-close" {...props} />
}

function ModalOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="modal-overlay"
      data-part="Modal.overlay"
      className={cn('fixed inset-0 isolate z-50', className)}
      {...props}
    />
  )
}

export interface ModalContentProps extends Omit<React.ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  /** Figma Size: 480 · 640 wide. */
  size?: ModalSize
  /** Figma CloseVisible. */
  showCloseButton?: boolean
  /** The close glyph — icons are the system's, passed in. */
  closeIcon?: React.ReactNode
  closeLabel?: string
  /** The ModalHeader (inside `main`, above the Content). */
  header?: React.ReactNode
  /** Figma FooterVisible: the ModalFooter, under `main`. */
  footer?: React.ReactNode
  /**
   * Render in place: no portal, no overlay, no fixed positioning, no focus steal. For docs and previews, where the
   * modal must stay inside the themed card (a portal would paint it with the page's theme instead).
   */
  inline?: boolean
}

/** Figma Modal. `children` is the Content slot. */
function ModalContent({
  size = 'default', className, children, header, footer, showCloseButton = true, closeIcon, closeLabel = 'Close', inline = false, ...props
}: ModalContentProps) {
  const content = (
    <ModalContext.Provider value={{ size, closeClearance: showCloseButton, dialog: true }}>
      <DialogPrimitive.Content
        data-slot="modal-content"
        data-escala="Modal"
        data-size={size}
        data-inline={inline ? '' : undefined}
        className={cn(
          'relative flex max-w-full flex-col overflow-hidden text-left outline-none',
          !inline && 'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2',
          className,
        )}
        onOpenAutoFocus={inline ? (e) => e.preventDefault() : undefined}
        onCloseAutoFocus={inline ? (e) => e.preventDefault() : undefined}
        {...props}
      >
        <div data-part="Modal.main" className="flex min-h-0 flex-col">
          {header}
          {children != null && <div data-part="Modal.content" className="flex min-h-0 flex-col overflow-y-auto">{children}</div>}
        </div>
        {footer}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="modal-close" asChild>
            <CloseButton
              data-part="Modal.close"
              appearance="ghost"
              shape="pill"
              // The file's Modal nests CloseButton Size=sm (32) at 480 and Size=default (40) at 640.
              size={size === 'lg' ? 'default' : 'sm'}
              icon={closeIcon}
              aria-label={closeLabel}
              className="absolute top-[var(--spacing-inset-surface)] right-[var(--spacing-inset-surface)]"
            />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </ModalContext.Provider>
  )
  if (inline) return content
  return (
    <ModalPortal>
      <ModalOverlay />
      {content}
    </ModalPortal>
  )
}

function ModalTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="modal-title" data-part="ModalHeader.title" className={cn('m-0', className)} {...props} />
}

function ModalDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="modal-description" data-part="ModalHeader.description" className={cn('m-0', className)} {...props} />
}

export interface ModalHeaderProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Figma Size (it follows the Modal it sits in). */
  size?: ModalSize
  /** Figma Align. */
  align?: ModalHeaderAlign
  /** Figma Title. */
  title?: React.ReactNode
  /** Figma DescriptionVisible / Description. */
  descriptionVisible?: boolean
  description?: React.ReactNode
  /** Figma IconVisible + the glyph: a FeaturedIcon (soft, circle), 40 · 48 like the header. */
  iconVisible?: boolean
  icon?: React.ReactNode
  /** Figma TrailingVisible / Trailing (Reset, Clear all, a Badge). Not in vertical headers. */
  trailingVisible?: boolean
  trailing?: React.ReactNode
  /** Figma CloseClearanceVisible: room for the Modal's close (the Modal sets it). */
  closeClearance?: boolean
}

/** Figma ModalHeader. Inside a Modal the title / description are the dialog's accessible name and description. */
function ModalHeader({
  size, align = 'horizontal', title, descriptionVisible = true, description, iconVisible = true, icon, trailingVisible = false, trailing,
  closeClearance, className, children, ...props
}: ModalHeaderProps) {
  const ctx = React.useContext(ModalContext)
  const sz = size ?? ctx?.size ?? 'default'
  const horizontal = align === 'horizontal'
  const clearance = horizontal && (closeClearance ?? ctx?.closeClearance ?? false)
  const inDialog = !!ctx?.dialog
  const Title = inDialog ? ModalTitle : 'h2'
  const Description = inDialog ? ModalDescription : 'p'
  return (
    <div
      data-slot="modal-header"
      data-escala="ModalHeader"
      data-size={sz}
      data-align={align}
      className={cn(
        'flex w-full',
        horizontal ? 'flex-row items-center' : 'flex-col',
        align === 'vertical-center' ? 'items-center' : align === 'vertical-left' ? 'items-start' : '',
        className,
      )}
      {...props}
    >
      {iconVisible && icon !== null && <FeaturedIcon size={sz} variant="default" appearance="soft" shape="circle" icon={icon} />}
      <div
        data-part="ModalHeader.content"
        className={cn('flex min-w-0 flex-1 flex-col', align === 'vertical-center' && 'items-center text-center', !horizontal && 'self-stretch')}
      >
        {children ?? (
          <>
            {title != null && <Title data-part="ModalHeader.title" className="m-0">{title}</Title>}
            {descriptionVisible && description != null && <Description data-part="ModalHeader.description" className="m-0">{description}</Description>}
          </>
        )}
      </div>
      {horizontal && trailingVisible && <div data-part="ModalHeader.trailing" className="flex shrink-0 items-center">{trailing}</div>}
      {clearance && <span data-part="ModalHeader.clearance" aria-hidden className="shrink-0" />}
    </div>
  )
}

export interface ModalFooterProps extends React.ComponentProps<'div'> {
  /** Figma Size (it follows the Modal it sits in). */
  size?: ModalSize
  /** Figma Layout: the actions at the end, or stacked full width (confirm first). */
  layout?: ModalFooterLayout
  /** Figma LeadingVisible / Leading (a step counter, a link). */
  leadingVisible?: boolean
  leading?: React.ReactNode
}

/** Figma ModalFooter. `children` is the Actions slot (put the primary action last for `inline`; `stacked` stacks them as given). */
function ModalFooter({ size, layout = 'inline', leadingVisible = false, leading, className, children, ...props }: ModalFooterProps) {
  const ctx = React.useContext(ModalContext)
  const sz = size ?? ctx?.size ?? 'default'
  const stacked = layout === 'stacked'
  return (
    <div
      data-slot="modal-footer"
      data-escala="ModalFooter"
      data-size={sz}
      data-layout={layout}
      className={cn('flex w-full', stacked ? 'flex-col' : 'flex-row items-center justify-end', className)}
      {...props}
    >
      {leadingVisible && <div data-part="ModalFooter.leading" className={cn('flex items-center', !stacked && 'mr-auto')}>{leading}</div>}
      <div data-part="ModalFooter.actions" className={cn('flex', stacked ? 'w-full flex-col [&>*]:w-full' : 'flex-row items-center')}>{children}</div>
    </div>
  )
}

export {
  Modal, ModalClose, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalOverlay, ModalPortal, ModalTitle, ModalTrigger,
  // Older names of the same parts (the shadcn Dialog), kept so existing code keeps compiling.
  Modal as Dialog, ModalClose as DialogClose, ModalContent as DialogContent, ModalDescription as DialogDescription,
  ModalFooter as DialogFooter, ModalHeader as DialogHeader, ModalOverlay as DialogOverlay, ModalPortal as DialogPortal,
  ModalTitle as DialogTitle, ModalTrigger as DialogTrigger,
}
