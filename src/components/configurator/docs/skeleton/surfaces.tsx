import type * as React from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon, avatarFillOf } from '../specimens'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { shadowOf } from '../../../../lib/previewTokens'
import { choreographyVar } from '../../../../lib/motion'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { Button as SkButton } from '../../../escala-ui/button'
import { type CardSize, Card as SkCard, CardHeader as SkCardHeader, CardTitle as SkCardTitle, CardDescription as SkCardDescription, CardFooter as SkCardFooter } from '../../../escala-ui/card'
import { Modal as SkModal, ModalContent as SkModalContent, ModalHeader as SkModalHeader, ModalFooter as SkModalFooter, type ModalSize, type ModalHeaderAlign, type ModalFooterLayout } from '../../../escala-ui/modal'
import { Separator as SkSeparator } from '../../../escala-ui/separator'
import { Accordion as SkAccordion, AccordionItem as SkAccordionItem, type AccordionVariant, type AccordionItemState } from '../../../escala-ui/accordion'
import { Image as SkImage, type ImageRatio, type ImageShape } from '../../../escala-ui/image'
import { Popover as SkPopover, PopoverContent as SkPopoverContent, PopoverFooter as SkPopoverFooter, type PopoverSize, type PopoverSide, type PopoverFooterLayout } from '../../../escala-ui/popover'
import { Tooltip as SkTooltip, TooltipContent as SkTooltipContent, TooltipProvider as SkTooltipProvider } from '../../../escala-ui/tooltip'
import { ScrollArea as SkScrollArea, ScrollAreaRow as SkScrollAreaRow } from '../../../escala-ui/scroll-area'
import { iconOf, spaceOf } from '../../../../lib/previewTokens'
import { Alert as SkAlert, AlertDescription as SkAlertDescription, AlertIcon as SkAlertIcon, AlertTitle as SkAlertTitle, type AlertVariant } from '../../../escala-ui/alert'
import { Toast as SkToast, type ToastAppearance, type ToastVariant } from '../../../escala-ui/toast'
import { Spinner as SkSpinner } from '../../../escala-ui/spinner'
import { RecipeScope } from './scope'
import { AlertDialog as SkAlertDialog, AlertDialogAction as SkAlertDialogAction, AlertDialogCancel as SkAlertDialogCancel, AlertDialogContent as SkAlertDialogContent, AlertDialogDescription as SkAlertDialogDescription, AlertDialogFooter as SkAlertDialogFooter, AlertDialogHeader as SkAlertDialogHeader, AlertDialogMedia as SkAlertDialogMedia, AlertDialogTitle as SkAlertDialogTitle, type AlertDialogSize } from '../../../escala-ui/alert-dialog'
import { Sheet as SkSheet, SheetContent as SkSheetContent, SheetDescription as SkSheetDescription, SheetFooter as SkSheetFooter, SheetHeader as SkSheetHeader, SheetTitle as SkSheetTitle, type SheetSide } from '../../../escala-ui/sheet'
import { DrawerContent as SkDrawerContent, DrawerDescription as SkDrawerDescription, DrawerFooter as SkDrawerFooter, DrawerHeader as SkDrawerHeader, DrawerTitle as SkDrawerTitle, type DrawerDirection } from '../../../escala-ui/drawer'
import { HoverCardContent as SkHoverCardContent } from '../../../escala-ui/hover-card'
import { Item as SkItem, ItemActions as SkItemActions, ItemContent as SkItemContent, ItemDescription as SkItemDescription, ItemMedia as SkItemMedia, ItemTitle as SkItemTitle, type ItemSize, type ItemVariant } from '../../../escala-ui/item'
import { Attachment as SkAttachment, AttachmentAction as SkAttachmentAction, AttachmentActions as SkAttachmentActions, AttachmentContent as SkAttachmentContent, AttachmentDescription as SkAttachmentDescription, AttachmentMedia as SkAttachmentMedia, AttachmentTitle as SkAttachmentTitle, type AttachmentSize, type AttachmentState } from '../../../escala-ui/attachment'
import { Message as SkMessage, MessageAvatar as SkMessageAvatar, MessageContent as SkMessageContent, MessageFooter as SkMessageFooter, MessageHeader as SkMessageHeader } from '../../../escala-ui/message'
import { Bubble as SkBubble, BubbleContent as SkBubbleContent, type BubbleVariant } from '../../../escala-ui/bubble'
import { ResizableHandle as SkResizableHandle, ResizablePanel as SkResizablePanel, ResizablePanelGroup as SkResizablePanelGroup } from '../../../escala-ui/resizable'
import { Collapsible as SkCollapsible, CollapsibleContent as SkCollapsibleContent, CollapsibleItem as SkCollapsibleItem, CollapsibleTrigger as SkCollapsibleTrigger } from '../../../escala-ui/collapsible'
import { Table as SkTable, TableBody as SkTableBody, TableCaption as SkTableCaption, TableCell as SkTableCell, TableDropIndicator as SkTableDropIndicator, TableEmpty as SkTableEmpty, TableFooter as SkTableFooter, TableHead as SkTableHead, TableHeader as SkTableHeader, TableLoadMore as SkTableLoadMore, TableLoading as SkTableLoading, TableMediaCell as SkTableMediaCell, TableResizer as SkTableResizer, TableRow as SkTableRow, TableTrendCell as SkTableTrendCell, type TableSize } from '../../../escala-ui/table'
import { TablePrototype } from './tablePrototype'
import { TABLE_PROTOTYPE_W } from '../componentOverviews'
import { Skeleton as SkSkeleton } from '../../../escala-ui/skeleton'
import { Empty as SkEmpty, EmptyContent as SkEmptyContent, EmptyDescription as SkEmptyDescription, EmptyHeader as SkEmptyHeader, EmptyMedia as SkEmptyMedia, EmptyTitle as SkEmptyTitle } from '../../../escala-ui/empty'

export function SkeletonCardSpecimen({ t, v, w, children, elev }: SpecimenProps) {
  const shadow = elev === false ? 'none' : elev ? shadowOf(t, elev, 'none') : undefined
  return (
    <RecipeScope t={t}>
      <SkCard size={(v.Size ?? 'default') as CardSize} style={{ width: w ?? 280, boxShadow: shadow }}>
        {children ?? (
          <>
            <SkCardHeader>
              <SkCardTitle>Card title</SkCardTitle>
              <SkCardDescription>Supporting copy that explains the grouped content inside this surface.</SkCardDescription>
            </SkCardHeader>
            <SkCardFooter>
              <SkButton variant="link" size="sm" style={{ paddingInline: 0 }}>Learn more →</SkButton>
            </SkCardFooter>
          </>
        )}
      </SkCard>
    </RecipeScope>
  )
}

const MODAL_BODY = 'Replace this slot with the dialog body: a short paragraph, form fields, settings rows, a list or media. The body scrolls inside the dialog when it is taller than the viewport.'

function modalActions(layout: ModalFooterLayout, size: ModalSize) {
  const btn = size === 'lg' ? 'lg' : 'default'
  const confirm = <SkButton key="confirm" variant="default" appearance="solid" size={btn}>Confirm</SkButton>
  const cancel = <SkButton key="cancel" variant="secondary" appearance="solid" size={btn}>Cancel</SkButton>
  return layout === 'stacked' ? [confirm, cancel] : [cancel, confirm]
}

/** The Figma Modal (967:102): header, the Content slot and the footer in a 480 / 640 card, shown in place. */
export function SkeletonModalSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as ModalSize
  return (
    <RecipeScope t={t}>
      <SkModal open modal={false}>
        <SkModalContent
          inline
          size={size}
          closeIcon={<PreviewIcon concept="close" size={16} />}
          header={<SkModalHeader title="System notification" description="Review the details and take action." icon={<PreviewIcon concept="info" size={20} />} />}
          footer={<SkModalFooter>{modalActions('inline', size)}</SkModalFooter>}
        >
          {MODAL_BODY}
        </SkModalContent>
      </SkModal>
    </RecipeScope>
  )
}

/** The Figma ModalHeader (965:81) on its own, at the width the Modal gives it (440 / 600). */
export function SkeletonModalHeaderSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as ModalSize
  return (
    <RecipeScope t={t}>
      <div style={{ width: size === 'lg' ? 600 : 440 }}>
        <SkModalHeader size={size} align={(v.Align ?? 'horizontal') as ModalHeaderAlign} title="System notification" description="Review the details and take action." icon={<PreviewIcon concept="info" size={20} />} />
      </div>
    </RecipeScope>
  )
}

/** The Figma ModalFooter (966:114) on its own, at the Modal's width (480 / 640). */
export function SkeletonModalFooterSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as ModalSize
  const layout = (v.Layout ?? 'inline') as ModalFooterLayout
  return (
    <RecipeScope t={t}>
      <div style={{ width: size === 'lg' ? 640 : 480 }}>
        <SkModalFooter size={size} layout={layout}>{modalActions(layout, size)}</SkModalFooter>
      </div>
    </RecipeScope>
  )
}

export function SkeletonSeparatorSpecimen({ t, v, w }: SpecimenProps) {
  const horizontal = (v.Orientation ?? 'horizontal') === 'horizontal'
  return (
    <RecipeScope t={t}>
      <SkSeparator orientation={horizontal ? 'horizontal' : 'vertical'} style={horizontal ? { width: w ?? 220 } : undefined} />
    </RecipeScope>
  )
}

/** The Figma Accordion at its 480px sample width: three items, the first open. */
export function SkeletonAccordionSpecimen({ t, v }: SpecimenProps) {
  // Each question has its own answer — three identical panels read as a bug.
  const rows: [string, string][] = [
    ['What is Escala?', 'Escala is a design system with tokens, components and docs that stay in sync between Figma and code.'],
    ['How do design tokens sync?', 'Variables map to CSS custom properties through a token pipeline.'],
    ['Can I customize the theme?', 'Yes. Swap variable modes for color, shape and density.'],
  ]
  return (
    <RecipeScope t={t}>
      <SkAccordion variant={(v.Variant ?? 'ghost-default') as AccordionVariant} defaultValue={['item-0']} style={{ width: 480 }}>
        {rows.map(([q, a], i) => <SkAccordionItem key={q} value={`item-${i}`} label={q}>{a}</SkAccordionItem>)}
      </SkAccordion>
    </RecipeScope>
  )
}

/** The Figma AccordionItem on its own (State Open starts it open; Disabled mutes it). */
export function SkeletonAccordionItemSpecimen({ t, v }: SpecimenProps) {
  const state = (v.State ?? 'Closed') as AccordionItemState
  return (
    <RecipeScope t={t}>
      <div style={{ width: 480 }}>
        <SkAccordion variant={(v.Variant ?? 'ghost-default') as AccordionVariant} defaultValue={state === 'Open' ? ['item'] : []}>
          <SkAccordionItem value="item" disabled={state === 'Disabled'} />
        </SkAccordion>
      </div>
    </RecipeScope>
  )
}

/** The Figma Image at the file's 240px sample width (`auto` in a 240 × 160 slot). The file's photo is a stock
 *  image: shown as the system's gradient (no image ships). */
export function SkeletonImageSpecimen({ t, v }: SpecimenProps) {
  const ratio = (v.Ratio ?? 'auto') as ImageRatio
  return (
    <RecipeScope t={t}>
      <div style={{ width: 240, height: ratio === 'auto' ? 160 : undefined }}>
        <SkImage ratio={ratio} shape={(v.Shape ?? 'square') as ImageShape}>
          <div style={{ width: '100%', height: '100%', background: avatarFillOf(t) }} />
        </SkImage>
      </div>
    </RecipeScope>
  )
}

const POPOVER_DESC = 'Anyone with the link can see the filters and columns you applied.'

function popoverFooterButtons(size: PopoverSize, layout: PopoverFooterLayout) {
  // Popover sm → Button xs, default → sm, lg → default (the file's footer buttons).
  const btn = size === 'sm' ? 'xs' : size === 'lg' ? 'default' : 'sm'
  const skip = <SkButton key="skip" variant="secondary" appearance="solid" size={btn}>Skip</SkButton>
  const next = <SkButton key="next" variant="default" appearance="solid" size={btn}>Next</SkButton>
  return [skip, next]
}

/** The Figma Popover (973:364) in place: arrow, title, description, optional footer / close / media. */
export function SkeletonPopoverSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as PopoverSize
  return (
    <RecipeScope t={t}>
      <SkPopover>
        <SkPopoverContent
          inline
          size={size}
          side={(v.Side ?? 'bottom') as PopoverSide}
          title="Share this view"
          description={POPOVER_DESC}
          closeIcon={<PreviewIcon concept="close" size={size === 'lg' ? 16 : 12} />}
        />
      </SkPopover>
    </RecipeScope>
  )
}

/** The Figma PopoverFooter (972:279) on its own, 256 wide. */
export function SkeletonPopoverFooterSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as PopoverSize
  const layout = (v.Layout ?? 'inline') as PopoverFooterLayout
  return (
    <RecipeScope t={t}>
      <div style={{ width: 256 }}>
        <SkPopoverFooter size={size} layout={layout} leading="Step 1 of 3">{popoverFooterButtons(size, layout)}</SkPopoverFooter>
      </div>
    </RecipeScope>
  )
}

export function SkeletonTooltipSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTooltipProvider>
        <SkTooltip>
          <SkTooltipContent inline>Copy to clipboard</SkTooltipContent>
        </SkTooltip>
      </SkTooltipProvider>
    </RecipeScope>
  )
}

export function SkeletonScrollAreaSpecimen({ t }: SpecimenProps) {
  const rows = ['Accent / 500', 'Accent / 600', 'Neutral / 100', 'Neutral / 200', 'Success / 500', 'Warning / 500', 'Error / 500']
  return (
    <RecipeScope t={t}>
      <SkScrollArea style={{ width: 240, height: 150 }}>
        {rows.map((r) => <SkScrollAreaRow key={r}>{r}</SkScrollAreaRow>)}
      </SkScrollArea>
    </RecipeScope>
  )
}

// ── Feedback ──────────────────────────────────────────────────────────────

/** The Figma Alert at its sample widths (800 banner, 320 boxed). Passing `children` (the artefacts' title + description)
 *  keeps the boxed, close-less composition; `destructive` is the older name of `critical`. */
export function SkeletonAlertSpecimen({ t, v, w, children }: SpecimenProps) {
  const variant = ((v.Variant === 'destructive' ? 'critical' : v.Variant) ?? 'default') as AlertVariant
  const layout = (v.Layout ?? (children ? 'vertical' : 'horizontal')) as 'horizontal' | 'vertical'
  return (
    <RecipeScope t={t}>
      <SkAlert
        variant={variant}
        appearance={(v.Appearance ?? 'outline') as 'outline' | 'solid' | 'soft' | 'inverse'}
        layout={layout}
        size={(v.Size ?? 'default') as 'sm' | 'default'}
        actionsVisible={v.Actions === 'True'}
        actions={<SkButton variant="secondary" appearance="solid" size={v.Size === 'sm' ? 'sm' : 'default'}>Action</SkButton>}
        style={{ width: w ?? (layout === 'vertical' ? 320 : 800), maxWidth: '100%' }}
      >
        {children}
      </SkAlert>
    </RecipeScope>
  )
}

const TOAST_COPY: Record<string, [string, string]> = {
  default: ['Event created', 'Sunday, 3 November at 9:00'],
  secondary: ['Draft saved', 'Your changes are kept locally.'],
  success: ['Changes saved', 'Your tokens are up to date.'],
  info: ['A new version is available', 'Reload to get the latest.'],
  warning: ['Storage almost full', '90% of your plan is in use.'],
  critical: ['Something went wrong', 'The tokens were not published.'],
}

/** One pass of a toast on the playing board: in, held, out on the last step. */
const TOAST_PLAY_STEPS = 7

/** The Figma Toast, drawn in place at its 360px (the `Toaster` queue is the consumer's). While the board plays it
 *  leaves and arrives again on the brand's own `sonner-enter` choreography. */
export function SkeletonToastSpecimen({ t, v, w, children }: SpecimenProps) {
  const variant = (v.Variant ?? 'default') as ToastVariant
  const [title, description] = TOAST_COPY[variant] ?? TOAST_COPY.default
  const beat = useAutoplayStep(TOAST_PLAY_STEPS, variant === 'success' ? 800 : 950)
  const play: React.CSSProperties | undefined = beat == null ? undefined
    : beat === TOAST_PLAY_STEPS - 1
      ? { opacity: 0, transition: 'opacity var(--motion-use-overlay-out)' }
      : { animation: `var(${choreographyVar('sonner-enter')})` }
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 360, maxWidth: '100%', ...play }}>
        <SkToast
          appearance={(v.Appearance ?? 'filled') as ToastAppearance}
          variant={variant}
          title={typeof children === 'string' ? children : title}
          description={description}
          actionsVisible={v.Actions === 'True'}
          actions={<SkButton variant="secondary" appearance="solid" size="sm">Undo</SkButton>}
          className="!w-full"
        />
      </div>
    </RecipeScope>
  )
}

// ── Content & Surfaces (batch 1) ──────────────────────────────────────────

/** shadcn's demo: a starred-repositories list. `Open` drives it; the trigger
 *  still toggles it locally. */
export function SkeletonCollapsibleSpecimen({ t, v, w }: SpecimenProps) {
  const open = (v.Open ?? 'False') === 'True'
  return (
    <RecipeScope t={t}>
      <SkCollapsible key={String(open)} defaultOpen={open} style={{ width: w ?? 300 }}>
        <SkCollapsibleTrigger icon={<PreviewIcon concept="chevrons-up-down" size={iconOf(13)} />}>3 starred repositories</SkCollapsibleTrigger>
        <SkCollapsibleItem>escala/tokens</SkCollapsibleItem>
        <SkCollapsibleContent>
          <SkCollapsibleItem>escala/figma-plugin</SkCollapsibleItem>
          <SkCollapsibleItem>escala/registry</SkCollapsibleItem>
        </SkCollapsibleContent>
      </SkCollapsible>
    </RecipeScope>
  )
}

/** The file's sample rows (Table Prototype): name · role · status · amount (numeric, Align end). */
const TABLE_SAMPLE = [
  ['Olivia Martin', 'Design', 'Active', '1,280.00'],
  ['Liam Chen', 'Engineering', 'Active', '940.50'],
  ['Sofia Rossi', 'Product', 'Invited', '2,115.00'],
  ['Noah Kim', 'Support', 'Paused', '310.25'],
]
const TABLE_HEADS = ['Name', 'Role', 'Status', 'Amount']
const sizeOf = (v: SpecimenProps['v']) => (v.Size ?? 'default') as TableSize
const dividersOf = (v: SpecimenProps['v']) => ((v.Dividers ?? 'rows') as 'rows' | 'grid')

/** A strip of cells, as the file draws a row: the cell specimens sit in a 200px column of one. */
function CellFrame({ w, children }: { w?: number | string; children: React.ReactNode }) {
  return (
    <div style={{ width: w ?? 200, maxWidth: '100%' }}>
      <table className="block w-full" role="table" aria-label="Sample">
        <tbody className="block w-full" role="rowgroup">
          <tr className="flex w-full" role="row">{children}</tr>
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonTableCellSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <CellFrame w={w}>
        <SkTableCell size={sizeOf(v)} align={(v.Align ?? 'start') as 'start' | 'end'} pinned={(v.Pinned ?? 'none') as 'none' | 'start' | 'end'} state={(v.State ?? 'Default') as 'Default' | 'Disabled'} />
      </CellFrame>
    </RecipeScope>
  )
}

export function SkeletonTableHeadSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as 'Default' | 'Hover'
  return (
    <RecipeScope t={t}>
      <CellFrame w={w}>
        <SkTableHead size={sizeOf(v)} align={(v.Align ?? 'start') as 'start' | 'end'} pinned={(v.Pinned ?? 'none') as 'none' | 'start' | 'end'} sort={(v.Sort ?? 'none') as 'none' | 'ascending' | 'descending'} forceState={state} />
      </CellFrame>
    </RecipeScope>
  )
}

export function SkeletonTableMediaCellSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <CellFrame w={w}>
        <SkTableMediaCell size={sizeOf(v)} ratio={(v.Ratio ?? 'square') as 'square' | 'wide'} state={(v.State ?? 'Default') as 'Default' | 'Disabled'} image={<div style={{ width: '100%', height: '100%', background: avatarFillOf(t) }} />} />
      </CellFrame>
    </RecipeScope>
  )
}

export function SkeletonTableTrendCellSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <CellFrame w={w}>
        <SkTableTrendCell size={sizeOf(v)} trend={(v.Trend ?? 'up') as 'up' | 'down' | 'neutral'} state={(v.State ?? 'Default') as 'Default' | 'Disabled'} />
      </CellFrame>
    </RecipeScope>
  )
}

/** The handle sits at the end edge of a head in the file (9 × the head height). */
export function SkeletonTableResizerSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ height: 48 }} className="flex">
        <SkTableResizer forceState={(v.State ?? 'Default') as 'Default' | 'Hover' | 'Resizing'} aria-label="Resize column" />
      </div>
    </RecipeScope>
  )
}

function SampleRowCells({ row }: { row: string[] }) {
  return (
    <>
      <SkTableCell label={row[0]} />
      <SkTableCell label={row[1]} />
      <SkTableCell label={row[2]} />
      <SkTableCell label={row[3]} align="end" />
    </>
  )
}

function SampleHeads() {
  return (
    <>
      {TABLE_HEADS.map((h, i) => <SkTableHead key={h} label={h} align={i === 3 ? 'end' : 'start'} />)}
    </>
  )
}

/** One strip (row, header or footer) at the file's 800px, alone in a ghost table. */
function StripFrame({ w, size, dividers, children }: { w?: number | string; size: TableSize; dividers: 'rows' | 'grid'; children: React.ReactNode }) {
  return (
    <div style={{ width: w ?? 800, maxWidth: '100%' }}>
      <SkTable appearance="ghost" size={size} dividers={dividers}>{children}</SkTable>
    </div>
  )
}

export function SkeletonTableRowSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as 'Default' | 'Hover' | 'Selected' | 'Focused' | 'Disabled' | 'Dragging'
  return (
    <RecipeScope t={t}>
      <StripFrame w={w} size={sizeOf(v)} dividers={dividersOf(v)}>
        <SkTableBody>
          <SkTableRow forceState={state}><SampleRowCells row={TABLE_SAMPLE[0]} /></SkTableRow>
        </SkTableBody>
      </StripFrame>
    </RecipeScope>
  )
}

export function SkeletonTableHeaderSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <StripFrame w={w} size={sizeOf(v)} dividers={dividersOf(v)}>
        <SkTableHeader scrolled={v.Scrolled === 'true'}><SampleHeads /></SkTableHeader>
      </StripFrame>
    </RecipeScope>
  )
}

export function SkeletonTableFooterSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <StripFrame w={w} size={sizeOf(v)} dividers={dividersOf(v)}>
        <SkTableFooter>
          <SkTableCell label="Total" />
          <SkTableCell label="" />
          <SkTableCell label="" />
          <SkTableCell label="4,645.75" align="end" />
        </SkTableFooter>
      </StripFrame>
    </RecipeScope>
  )
}

/** The file's sample table: a header, a row, a selected row, a row and a disabled row (800px). */
export function SkeletonTableSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      {w === TABLE_PROTOTYPE_W ? (
        // «Table Prototype»: Dividers grid is its dark example (pinned Name, resizing Role, Join date sorted, scrolled header).
        <TablePrototype
          width={w} size={sizeOf(v)} appearance={(v.Appearance ?? 'filled') as 'filled' | 'ghost'} dividers={dividersOf(v)}
          {...(dividersOf(v) === 'grid' ? { pinned: true, scrolled: true, defaultSort: { key: 'joined' as const, dir: 'descending' as const } } : {})}
        />
      ) : (
      <div style={{ width: w ?? 800, maxWidth: '100%' }}>
        <SkTable size={sizeOf(v)} appearance={(v.Appearance ?? 'filled') as 'filled' | 'ghost'} dividers={dividersOf(v)} aria-label="Team members">
          <SkTableHeader><SampleHeads /></SkTableHeader>
          <SkTableBody>
            <SkTableRow><SampleRowCells row={TABLE_SAMPLE[0]} /></SkTableRow>
            <SkTableRow selected><SampleRowCells row={TABLE_SAMPLE[1]} /></SkTableRow>
            <SkTableRow><SampleRowCells row={TABLE_SAMPLE[2]} /></SkTableRow>
            <SkTableRow disabled><SampleRowCells row={TABLE_SAMPLE[3]} /></SkTableRow>
          </SkTableBody>
        </SkTable>
      </div>
      )}
    </RecipeScope>
  )
}

export function SkeletonTableCaptionSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 800, maxWidth: '100%' }}>
        <table className="block w-full" aria-label="Team billing"><SkTableCaption /></table>
      </div>
    </RecipeScope>
  )
}

export function SkeletonTableDropIndicatorSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 800, maxWidth: '100%' }}><SkTableDropIndicator /></div>
    </RecipeScope>
  )
}

export function SkeletonTableEmptySpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 800, maxWidth: '100%' }}><SkTableEmpty /></div>
    </RecipeScope>
  )
}

export function SkeletonTableLoadingSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 800, maxWidth: '100%' }}><SkTableLoading /></div>
    </RecipeScope>
  )
}

export function SkeletonTableLoadMoreSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 800, maxWidth: '100%' }}><SkTableLoadMore state={(v.State ?? 'Default') as 'Default' | 'Loading'} /></div>
    </RecipeScope>
  )
}

// ── Feedback (batch 1) ────────────────────────────────────────────────────

/** shadcn's demo: an avatar and two lines of text, still loading. */
export function SkeletonSkeletonSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div aria-busy="true" style={{ display: 'flex', alignItems: 'center', gap: spaceOf(t, 12) }}>
        <SkSkeleton aria-hidden style={{ width: 40, height: 40, borderRadius: 999 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: spaceOf(t, 8) }}>
          <SkSkeleton aria-hidden style={{ width: 200, height: 14 }} />
          <SkSkeleton aria-hidden style={{ width: 140, height: 14 }} />
        </div>
      </div>
    </RecipeScope>
  )
}

export function SkeletonEmptySpecimen({ t, v, w }: SpecimenProps) {
  const icon = (v.Media ?? 'default') === 'icon'
  return (
    <RecipeScope t={t}>
      <SkEmpty style={{ width: w ?? 340 }}>
        <SkEmptyHeader>
          <SkEmptyMedia variant={icon ? 'icon' : 'default'}>
            <PreviewIcon concept="box" size={iconOf(icon ? 16 : 32)} />
          </SkEmptyMedia>
          <SkEmptyTitle>No projects yet</SkEmptyTitle>
          <SkEmptyDescription>Create your first project to start building your design system.</SkEmptyDescription>
        </SkEmptyHeader>
        <SkEmptyContent>
          <SkButton size="sm">Create project</SkButton>
        </SkEmptyContent>
      </SkEmpty>
    </RecipeScope>
  )
}

// ── Overlays (batch 2), drawn in place ────────────────────────────────────

export function SkeletonAlertDialogSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as AlertDialogSize
  return (
    <RecipeScope t={t}>
      <SkAlertDialog open inline>
        <SkAlertDialogContent inline size={size} style={{ width: size === 'sm' ? 300 : 400 }}>
          <SkAlertDialogHeader>
            {size === 'sm' && <SkAlertDialogMedia><PreviewIcon concept="trash" size={iconOf(20)} /></SkAlertDialogMedia>}
            <SkAlertDialogTitle>Delete this project?</SkAlertDialogTitle>
            <SkAlertDialogDescription>This removes every token and brand in it. You can't undo this.</SkAlertDialogDescription>
          </SkAlertDialogHeader>
          <SkAlertDialogFooter>
            <SkAlertDialogCancel size="sm">Cancel</SkAlertDialogCancel>
            <SkAlertDialogAction size="sm" variant="destructive">Delete</SkAlertDialogAction>
          </SkAlertDialogFooter>
        </SkAlertDialogContent>
      </SkAlertDialog>
    </RecipeScope>
  )
}

export function SkeletonSheetSpecimen({ t, v }: SpecimenProps) {
  const side = (v.Side ?? 'right') as SheetSide
  const across = side === 'top' || side === 'bottom'
  return (
    <RecipeScope t={t}>
      <SkSheet open modal={false}>
        <SkSheetContent inline side={side} closeIcon={<PreviewIcon concept="close" size={16} />} style={across ? { width: 420 } : { width: 300, height: 300 }}>
          <SkSheetHeader>
            <SkSheetTitle>Edit profile</SkSheetTitle>
            <SkSheetDescription>Make changes to your profile here.</SkSheetDescription>
          </SkSheetHeader>
          <SkSheetFooter>
            <SkButton size="sm">Save changes</SkButton>
          </SkSheetFooter>
        </SkSheetContent>
      </SkSheet>
    </RecipeScope>
  )
}

export function SkeletonDrawerSpecimen({ t, v }: SpecimenProps) {
  const direction = (v.Direction ?? 'bottom') as DrawerDirection
  return (
    <RecipeScope t={t}>
      <SkDrawerContent inline direction={direction} style={{ width: 340 }}>
        <SkDrawerHeader>
          <SkDrawerTitle>Move goal</SkDrawerTitle>
          <SkDrawerDescription>Set your daily activity goal.</SkDrawerDescription>
        </SkDrawerHeader>
        <SkDrawerFooter>
          <SkButton size="sm">Submit</SkButton>
          <SkButton size="sm" variant="outline">Cancel</SkButton>
        </SkDrawerFooter>
      </SkDrawerContent>
    </RecipeScope>
  )
}

export function SkeletonHoverCardSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div className="flex flex-col items-start" style={{ gap: 'var(--spacing-1_5)' }}>
        <SkButton variant="link" size="sm" style={{ paddingInline: 0 }}>@escala</SkButton>
        <SkHoverCardContent inline style={{ width: 280 }}>
          <div style={{ fontWeight: 600 }}>Escala</div>
          <div>Design tokens and components for Figma and code, from one system.</div>
          <div style={{ color: 'var(--color-content-subtle)' }}>Joined October 2026</div>
        </SkHoverCardContent>
      </div>
    </RecipeScope>
  )
}

// ── Lists and chat (batch 2) ──────────────────────────────────────────────

export function SkeletonItemSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkItem variant={(v.Variant ?? 'default') as ItemVariant} size={(v.Size ?? 'default') as ItemSize} style={{ width: w ?? 380 }}>
        <SkItemMedia variant="icon"><PreviewIcon concept="settings" size={iconOf(16)} /></SkItemMedia>
        <SkItemContent>
          <SkItemTitle>Two-factor authentication</SkItemTitle>
          <SkItemDescription>Verify sign-ins with a code from your phone.</SkItemDescription>
        </SkItemContent>
        <SkItemActions><SkButton size="sm" variant="outline">Enable</SkButton></SkItemActions>
      </SkItem>
    </RecipeScope>
  )
}

export function SkeletonAttachmentSpecimen({ t, v }: SpecimenProps) {
  const state = (v.State ?? 'done') as AttachmentState
  const vertical = v.Orientation === 'vertical'
  const sub: Record<AttachmentState, string> = {
    idle: 'Drop to attach', uploading: 'Uploading… 42%', processing: 'Processing…', error: 'Upload failed', done: '2.4 MB',
  }
  return (
    <RecipeScope t={t}>
      <SkAttachment state={state} size={(v.Size ?? 'default') as AttachmentSize} orientation={vertical ? 'vertical' : 'horizontal'} style={{ width: vertical ? 160 : 280 }}>
        <SkAttachmentMedia><PreviewIcon concept="file" size={iconOf(16)} /></SkAttachmentMedia>
        <SkAttachmentContent>
          <SkAttachmentTitle>brand-tokens.json</SkAttachmentTitle>
          <SkAttachmentDescription>{sub[state]}</SkAttachmentDescription>
        </SkAttachmentContent>
        <SkAttachmentActions>
          <SkAttachmentAction aria-label="Remove"><PreviewIcon concept="close" size={iconOf(12)} /></SkAttachmentAction>
        </SkAttachmentActions>
      </SkAttachment>
    </RecipeScope>
  )
}

export function SkeletonMessageSpecimen({ t, v }: SpecimenProps) {
  const end = v.Align === 'end'
  return (
    <RecipeScope t={t}>
      <div style={{ width: 380 }}>
        <SkMessage align={end ? 'end' : 'start'}>
          <SkMessageAvatar>{end ? 'You' : 'AI'}</SkMessageAvatar>
          <SkMessageContent>
            <SkMessageHeader>{end ? 'You' : 'Escala'} · 10:42</SkMessageHeader>
            <SkBubble variant={end ? 'default' : 'muted'} align={end ? 'end' : 'start'}>
              <SkBubbleContent>{end ? 'Can you make the radius rounder?' : 'Done — Boxes moved to 24px.'}</SkBubbleContent>
            </SkBubble>
            <SkMessageFooter>Delivered</SkMessageFooter>
          </SkMessageContent>
        </SkMessage>
      </div>
    </RecipeScope>
  )
}

export function SkeletonBubbleSpecimen({ t, v }: SpecimenProps) {
  const end = v.Align === 'end'
  return (
    <RecipeScope t={t}>
      <div style={{ width: 320, display: 'flex', flexDirection: 'column' }}>
        <SkBubble variant={(v.Variant ?? 'default') as BubbleVariant} align={end ? 'end' : 'start'}>
          <SkBubbleContent>Ship the new radius to Figma today?</SkBubbleContent>
        </SkBubble>
      </div>
    </RecipeScope>
  )
}

export function SkeletonResizableSpecimen({ t, v }: SpecimenProps) {
  const vertical = v.Orientation === 'vertical'
  return (
    <RecipeScope t={t}>
      <div style={{ width: 360, height: 200 }}>
        <SkResizablePanelGroup orientation={vertical ? 'vertical' : 'horizontal'}>
          <SkResizablePanel defaultSize={50}><div className="flex h-full items-center justify-center">One</div></SkResizablePanel>
          <SkResizableHandle withHandle />
          <SkResizablePanel defaultSize={50}><div className="flex h-full items-center justify-center">Two</div></SkResizablePanel>
        </SkResizablePanelGroup>
      </div>
    </RecipeScope>
  )
}
