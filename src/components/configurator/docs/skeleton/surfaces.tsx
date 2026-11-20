import type * as React from 'react'
import { useEffect, useId, useRef, useState, Fragment } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon, avatarFillOf } from '../specimens'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { shadowOf } from '../../../../lib/previewTokens'
import { choreographyVar } from '../../../../lib/motion'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { Button as SkButton } from '../../../escala-ui/button'
import { type CardSize, Card as SkCard, CardHeader as SkCardHeader, CardTitle as SkCardTitle, CardDescription as SkCardDescription, CardFooter as SkCardFooter } from '../../../escala-ui/card'
import { Modal as SkModal, ModalContent as SkModalContent, ModalHeader as SkModalHeader, ModalFooter as SkModalFooter, type ModalSize, type ModalHeaderAlign, type ModalFooterLayout } from '../../../escala-ui/modal'
import { Separator as SkSeparator, type SeparatorAlign, type SeparatorTone, type SeparatorVariant } from '../../../escala-ui/separator'
import { Accordion as SkAccordion, AccordionItem as SkAccordionItem, type AccordionVariant, type AccordionItemState } from '../../../escala-ui/accordion'
import { Image as SkImage, type ImageRatio, type ImageShape } from '../../../escala-ui/image'
import { Popover as SkPopover, PopoverContent as SkPopoverContent, PopoverFooter as SkPopoverFooter, type PopoverSize, type PopoverSide, type PopoverFooterLayout } from '../../../escala-ui/popover'
import { Tooltip as SkTooltip, TooltipContent as SkTooltipContent, TooltipInfoTrigger as SkTooltipInfoTrigger, TooltipProvider as SkTooltipProvider, type TooltipSize, type TooltipSide, type TooltipAlign, type TooltipVariant, type TooltipTriggerState } from '../../../escala-ui/tooltip'
import { ScrollArea as SkScrollArea, type ScrollAppearance, type ScrollAreaOrientation, type ScrollAreaSize } from '../../../escala-ui/scroll-area'
import { Alert as SkAlert, AlertDescription as SkAlertDescription, AlertIcon as SkAlertIcon, AlertTitle as SkAlertTitle, type AlertVariant } from '../../../escala-ui/alert'
import { Toast as SkToast, type ToastAppearance, type ToastVariant } from '../../../escala-ui/toast'
import { Spinner as SkSpinner } from '../../../escala-ui/spinner'
import { RecipeScope } from './scope'
import { Sheet as SkSheet, SheetContent as SkSheetContent, SheetFooter as SkSheetFooter, SheetHeader as SkSheetHeader, type SheetSide } from '../../../escala-ui/sheet'
import { Table as SkTable, TableBody as SkTableBody, TableCaption as SkTableCaption, TableCell as SkTableCell, TableDropIndicator as SkTableDropIndicator, TableEmpty as SkTableEmpty, TableFooter as SkTableFooter, TableHead as SkTableHead, TableHeader as SkTableHeader, TableLoadMore as SkTableLoadMore, TableLoading as SkTableLoading, TableMediaCell as SkTableMediaCell, TableResizer as SkTableResizer, TableRow as SkTableRow, TableTrendCell as SkTableTrendCell, type TableSize } from '../../../escala-ui/table'
import { TablePrototype } from './tablePrototype'
import { TABLE_PROTOTYPE_W } from '../componentOverviews'

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
          header={<SkModalHeader title="System notification" description="Review the details and take action." icon={<PreviewIcon concept="zap" size={24} />} />}
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
  const align = (v.Align ?? 'none') as SeparatorAlign
  return (
    <RecipeScope t={t}>
      <SkSeparator
        orientation={horizontal ? 'horizontal' : 'vertical'}
        align={align}
        tone={(v.Tone ?? 'default') as SeparatorTone}
        variant={(v.Variant ?? 'default') as SeparatorVariant}
        style={horizontal ? { width: w ?? 220 } : { height: 112 }}
      >
        {align !== 'none' ? 'OR' : undefined}
      </SkSeparator>
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
        <SkAccordion standalone variant={(v.Variant ?? 'ghost-default') as AccordionVariant} defaultValue={state === 'Open' ? ['item'] : []}>
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

/** The Figma TooltipContent (415:773) in place, with the file's sample text. */
export function SkeletonTooltipContentSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkTooltipProvider>
        <SkTooltip>
          <SkTooltipContent
            inline
            size={(v.Size ?? 'default') as TooltipSize}
            side={(v.Side ?? 'top') as TooltipSide}
            align={(v.Align ?? 'start') as TooltipAlign}
            variant={(v.Variant ?? 'default') as TooltipVariant}
          >
            Used on invoices and receipts. Format: 12-3456789.
          </SkTooltipContent>
        </SkTooltip>
      </SkTooltipProvider>
    </RecipeScope>
  )
}

/** The Figma TooltipInfoTrigger (415:556): the info-circle button, a state at a time. */
export function SkeletonTooltipInfoTriggerSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as TooltipSize
  return (
    <RecipeScope t={t}>
      <SkTooltipInfoTrigger
        size={size}
        variant={(v.Variant ?? 'default') as TooltipVariant}
        forceState={(v.State ?? 'Default') as TooltipTriggerState}
        aria-label="More information"
        icon={<PreviewIcon concept="info" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      />
    </RecipeScope>
  )
}

const SCROLL_TAGS = ['v1.2.0-beta.50', 'v1.2.0-beta.49', 'v1.2.0-beta.48', 'v1.2.0-beta.47', 'v1.2.0-beta.46', 'v1.2.0-beta.45', 'v1.2.0-beta.44', 'v1.2.0-beta.43', 'v1.2.0-beta.42', 'v1.2.0-beta.41']
const SCROLL_PROJECTS = ['Q4 Campaign · Draft · 128 files · Updated 2 h ago · Owner Maya Chen', 'Brand refresh · Review · 64 files · Updated yesterday · Owner Julien Roux', 'Onboarding flow · Live · 32 files · Updated 3 d ago · Owner Marta Ruiz', 'Pricing page · Draft · 18 files · Updated 5 d ago · Owner Leo Martin', 'Design tokens v2 · Live · 240 files · Updated 1 w ago · Owner Ana Lucía']
const SCROLL_PHOTOS = [['linear-gradient(135deg,#c6b7bf,#e8cec0)', 'Photo by Ana Lucía'], ['linear-gradient(135deg,#b9b6c9,#dec6c6)', 'Photo by Marta Ruiz'], ['linear-gradient(135deg,#b9b5c7,#dfc3bf)', 'Photo by Julien Roux'], ['linear-gradient(135deg,#aeb9b9,#d0d8cb)', 'Photo by Inès Haddad'], ['linear-gradient(135deg,#c6b7bf,#e8cec0)', 'Photo by Leo Martin']]

/** The Figma ScrollArea (977:572) in place: a tag list (vertical), a photo strip (horizontal) or a long project list (both). */
export function SkeletonScrollAreaSpecimen({ t, v }: SpecimenProps) {
  const orientation = (v.Orientation ?? 'vertical') as ScrollAreaOrientation
  const frame = orientation === 'horizontal' ? { width: 384, height: 248 } : orientation === 'both' ? { width: 288, height: 288 } : { width: 192, height: 288 }
  return (
    <RecipeScope t={t}>
      <SkScrollArea aria-label="Scrollable content" size={(v.Size ?? 'default') as ScrollAreaSize} orientation={orientation} appearance={(v.Appearance ?? 'filled') as ScrollAppearance} style={frame}>
        {orientation === 'horizontal' ? (
          <div className="flex" style={{ gap: 'var(--spacing-gap-control)' }}>
            {SCROLL_PHOTOS.map(([bg, caption]) => (
              <figure key={caption} className="m-0 flex shrink-0 flex-col" style={{ width: 144, gap: 'var(--spacing-gap-control)' }}>
                <div style={{ height: 176, background: bg, borderRadius: 'var(--radius-control)' }} />
                <figcaption style={{ font: 'var(--type-caption)', color: 'var(--color-content-secondary)' }}>{caption}</figcaption>
              </figure>
            ))}
          </div>
        ) : orientation === 'both' ? (
          <>
            <p className="m-0 whitespace-nowrap" style={{ font: 'var(--type-label)', color: 'var(--color-content-primary)' }}>Recent projects</p>
            {SCROLL_PROJECTS.map((r) => <p key={r} className="m-0 whitespace-nowrap" style={{ font: 'var(--type-body-sm)', color: 'var(--color-content-primary)' }}>{r}</p>)}
          </>
        ) : (
          <>
            <p className="m-0" style={{ font: 'var(--type-label)', color: 'var(--color-content-primary)' }}>Tags</p>
            {SCROLL_TAGS.map((tag) => (
              <Fragment key={tag}>
                <p className="m-0" style={{ font: 'var(--type-body-sm)', color: 'var(--color-content-primary)' }}>{tag}</p>
                <SkSeparator tone="subtle" />
              </Fragment>
            ))}
          </>
        )}
      </SkScrollArea>
    </RecipeScope>
  )
}

export function SkeletonScrollBarSpecimen({ t, v }: SpecimenProps) {
  const vertical = (v.Orientation ?? 'vertical') === 'vertical'
  return (
    <RecipeScope t={t}>
      <SkScrollArea aria-label="Scroll bar" size={(v.Size ?? 'default') as ScrollAreaSize} orientation={vertical ? 'vertical' : 'horizontal'} appearance={(v.Appearance ?? 'filled') as ScrollAppearance} style={vertical ? { width: 40, height: 160, border: 0 } : { width: 160, height: 40, border: 0 }}>
        <div style={vertical ? { height: 400 } : { width: 400, height: 8 }} />
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
 *  leaves and arrives again on the brand's own `toast-enter` choreography. */
export function SkeletonToastSpecimen({ t, v, w, children }: SpecimenProps) {
  const variant = (v.Variant ?? 'default') as ToastVariant
  const [title, description] = TOAST_COPY[variant] ?? TOAST_COPY.default
  const beat = useAutoplayStep(TOAST_PLAY_STEPS, variant === 'success' ? 800 : 950)
  const play: React.CSSProperties | undefined = beat == null ? undefined
    : beat === TOAST_PLAY_STEPS - 1
      ? { opacity: 0, transition: 'opacity var(--motion-use-overlay-out)' }
      : { animation: `var(${choreographyVar('toast-enter', 'fade')}), var(${choreographyVar('toast-enter', 'rise')})` }
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



// ── Overlays (batch 2), drawn in place ────────────────────────────────────


/** The Figma Sheet (1648:1577): header, the Content slot and the footer on an edge panel, shown in place (400 wide on a side,
 *  the width of a phone on the bottom). */
export function SkeletonSheetSpecimen({ t, v }: SpecimenProps) {
  const side = (v.Side ?? 'right') as SheetSide
  const bottom = side === 'bottom'
  return (
    <RecipeScope t={t}>
      <SkSheet open modal={false}>
        <SkSheetContent
          inline
          side={side}
          closeIcon={<PreviewIcon concept="close" size={16} />}
          style={bottom ? { width: 393 } : { height: 460 }}
          header={<SkSheetHeader iconVisible={false} title="Sheet title" description="Short description of what this panel is for." />}
          footer={<SkSheetFooter>{modalActions(bottom ? 'stacked' : 'inline', 'default')}</SkSheetFooter>}
        >
          Replace this slot with the sheet body.
        </SkSheetContent>
      </SkSheet>
    </RecipeScope>
  )
}



// ── Lists and chat (batch 2) ──────────────────────────────────────────────





