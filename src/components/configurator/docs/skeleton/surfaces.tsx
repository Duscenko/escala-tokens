import type * as React from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import type { PreviewTokens } from '../../../preview/ButtonPreview'
import { shadowOf } from '../../../../lib/previewTokens'
import { Button as SkButton } from '../../../escala-ui/button'
import { type CardSize, Card as SkCard, CardHeader as SkCardHeader, CardTitle as SkCardTitle, CardDescription as SkCardDescription, CardFooter as SkCardFooter } from '../../../escala-ui/card'
import { Dialog as SkDialog, DialogContent as SkDialogContent, DialogHeader as SkDialogHeader, DialogTitle as SkDialogTitle, DialogDescription as SkDialogDescription, DialogFooter as SkDialogFooter } from '../../../escala-ui/dialog'
import { Separator as SkSeparator } from '../../../escala-ui/separator'
import { Accordion as SkAccordion, AccordionContent as SkAccordionContent, AccordionItem as SkAccordionItem, AccordionTrigger as SkAccordionTrigger } from '../../../escala-ui/accordion'
import { AspectRatio as SkAspectRatio, type RatioName } from '../../../escala-ui/aspect-ratio'
import { Popover as SkPopover, PopoverContent as SkPopoverContent, PopoverDescription as SkPopoverDescription, PopoverTitle as SkPopoverTitle } from '../../../escala-ui/popover'
import { Tooltip as SkTooltip, TooltipContent as SkTooltipContent, TooltipProvider as SkTooltipProvider } from '../../../escala-ui/tooltip'
import { ScrollArea as SkScrollArea, ScrollAreaRow as SkScrollAreaRow } from '../../../escala-ui/scroll-area'
import { iconOf, spaceOf } from '../../../../lib/previewTokens'
import { Alert as SkAlert, AlertDescription as SkAlertDescription, AlertIcon as SkAlertIcon, AlertTitle as SkAlertTitle, type AlertVariant } from '../../../escala-ui/alert'
import { Toaster as SkToaster, toast, type SonnerType } from '../../../escala-ui/sonner'
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
import { Table as SkTable, TableBody as SkTableBody, TableCaption as SkTableCaption, TableCell as SkTableCell, TableFooter as SkTableFooter, TableHead as SkTableHead, TableHeader as SkTableHeader, TableRow as SkTableRow } from '../../../escala-ui/table'
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

export function SkeletonDialogSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <RecipeScope t={t}>
      <SkDialog open modal={false}>
        <SkDialogContent inline style={{ width: 320 }} closeIcon={<PreviewIcon concept="close" size={16} />}>
          <SkDialogHeader>
            <SkDialogTitle>Delete project?</SkDialogTitle>
            <SkDialogDescription>This action can't be undone. All tokens in this project will be removed.</SkDialogDescription>
          </SkDialogHeader>
          <SkDialogFooter>
            <SkButton variant="outline" size="sm">Cancel</SkButton>
            <SkButton variant="destructive" size="sm">Delete</SkButton>
          </SkDialogFooter>
        </SkDialogContent>
      </SkDialog>
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

export function SkeletonAccordionSpecimen({ t }: SpecimenProps) {
  const rows = ['What are design tokens?', 'How does Figma sync work?', 'Can I export CSS?']
  return (
    <RecipeScope t={t}>
      <SkAccordion type="single" collapsible defaultValue="item-0" style={{ width: 320 }}>
        {rows.map((q, i) => (
          <SkAccordionItem key={q} value={`item-${i}`}>
            <SkAccordionTrigger icon={<PreviewIcon concept="chevron" size={iconOf(13)} />}>{q}</SkAccordionTrigger>
            <SkAccordionContent>Named values for color, type and spacing that keep every surface consistent.</SkAccordionContent>
          </SkAccordionItem>
        ))}
      </SkAccordion>
    </RecipeScope>
  )
}

const RATIO_WIDTH: Record<string, number> = { '16:9': 240, '4:3': 200, '1:1': 140 }

export function SkeletonAspectRatioSpecimen({ t, v }: SpecimenProps) {
  const ratio = (v.Ratio ?? '16:9') as RatioName
  return <RecipeScope t={t}><SkAspectRatio ratio={ratio} style={{ width: RATIO_WIDTH[ratio] }}>{ratio}</SkAspectRatio></RecipeScope>
}

export function SkeletonPopoverSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div className="flex flex-col items-center" style={{ gap: 'var(--spacing-2)' }}>
        <SkPopover>
          <SkPopoverContent inline style={{ width: 260 }}>
            <SkPopoverTitle>Share this system</SkPopoverTitle>
            <SkPopoverDescription>Anyone with the link can view tokens and docs.</SkPopoverDescription>
            <SkButton size="sm" style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-1)' }}>Copy link</SkButton>
          </SkPopoverContent>
        </SkPopover>
        <SkButton variant="outline" size="sm" style={{ marginTop: 'var(--spacing-1_5)' }}>Share</SkButton>
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

export function SkeletonAlertSpecimen({ t, v, w, children }: SpecimenProps) {
  const variant = (v.Variant ?? 'default') as AlertVariant
  const destructive = variant === 'destructive'
  return (
    <RecipeScope t={t}>
      <SkAlert variant={variant} style={{ width: w ?? 320, maxWidth: '100%' }}>
        <SkAlertIcon><PreviewIcon concept={destructive ? 'error' : 'info'} size={iconOf(15)} /></SkAlertIcon>
        {children ?? (
          <>
            <SkAlertTitle>{destructive ? 'Export failed' : 'Heads up'}</SkAlertTitle>
            <SkAlertDescription>{destructive ? 'Check the token names and try again.' : 'Semantic tokens re-derive when the accent changes.'}</SkAlertDescription>
          </>
        )}
      </SkAlert>
    </RecipeScope>
  )
}

const SONNER_COPY: Record<SonnerType, [string, string]> = {
  default: ['Event created', 'Sunday, 3 November at 9:00'],
  success: ['Changes saved', 'Your tokens are up to date.'],
  info: ['A new version is available', 'Reload to get the latest.'],
  warning: ['Storage almost full', '90% of your plan is in use.'],
  error: ['Something went wrong', 'The tokens were not published.'],
  loading: ['Publishing…', 'Sending your tokens to Figma.'],
}

/**
 * The real Sonner toaster, drawn in place: one Toaster per specimen (its own
 * `id`, so a toast lands only here), its list taken out of the viewport corner
 * and laid in the flow at the front toast's height. The toast never expires.
 */
export function SkeletonSonnerSpecimen({ t, v, w, children }: SpecimenProps) {
  const id = useId()
  const type = (v.Type ?? 'default') as SonnerType
  const [title, description] = SONNER_COPY[type] ?? SONNER_COPY.default
  const message = typeof children === 'string' ? children : title
  useEffect(() => {
    const opts = { id: `${id}-toast`, toasterId: id, description, duration: Infinity, action: type === 'default' ? { label: 'Undo', onClick: () => undefined } : undefined }
    if (type === 'default') toast(message, opts)
    else toast[type](message, opts)
    return () => { toast.dismiss(`${id}-toast`) }
  }, [id, type, message, description])
  // Sonner sizes its list from `getBoundingClientRect`, which a `scale()`d
  // ancestor (the board's photographed tiles) shrinks: the list collapsed to
  // the scaled height and stacked toasts overlapped. `offsetHeight` ignores
  // transforms, so the front toast is measured here instead.
  const box = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  useEffect(() => {
    const root = box.current
    if (!root) return
    let ro: ResizeObserver | null = null
    const attach = () => {
      const toastEl = root.querySelector<HTMLElement>('[data-sonner-toast]')
      if (!toastEl || ro) return
      ro = new ResizeObserver(() => setHeight(toastEl.offsetHeight))
      ro.observe(toastEl)
      setHeight(toastEl.offsetHeight)
    }
    attach()
    const mo = new MutationObserver(attach)
    mo.observe(root, { childList: true, subtree: true })
    return () => { mo.disconnect(); ro?.disconnect() }
  }, [])
  const icon = (concept: 'success' | 'info' | 'warning' | 'error') => <PreviewIcon concept={concept} size={iconOf(16)} />
  return (
    <RecipeScope t={t}>
      <div ref={box} style={{ width: w ?? 356, maxWidth: '100%' }}>
        <SkToaster
          id={id}
          offset={0}
          mobileOffset={0}
          icons={{ success: icon('success'), info: icon('info'), warning: icon('warning'), error: icon('error'), loading: <SkSpinner /> }}
          style={{ position: 'relative', inset: 'auto', transform: 'none', width: '100%', height: height ?? 'var(--front-toast-height)', '--width': '100%' } as React.CSSProperties}
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
        <SkCollapsibleTrigger icon={<PreviewIcon concept="chevron" size={iconOf(13)} />}>3 starred repositories</SkCollapsibleTrigger>
        <SkCollapsibleItem>escala/tokens</SkCollapsibleItem>
        <SkCollapsibleContent>
          <SkCollapsibleItem>escala/figma-plugin</SkCollapsibleItem>
          <SkCollapsibleItem>escala/registry</SkCollapsibleItem>
        </SkCollapsibleContent>
      </SkCollapsible>
    </RecipeScope>
  )
}

const TABLE_ROWS = [
  ['INV001', 'Paid', 'Card', '$250.00'],
  ['INV002', 'Pending', 'Transfer', '$150.00'],
  ['INV003', 'Unpaid', 'Card', '$350.00'],
]

export function SkeletonTableSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 420, maxWidth: '100%' }}>
        <SkTable>
          <SkTableCaption>Recent invoices.</SkTableCaption>
          <SkTableHeader>
            <SkTableRow>
              <SkTableHead>Invoice</SkTableHead>
              <SkTableHead>Status</SkTableHead>
              <SkTableHead>Method</SkTableHead>
              <SkTableHead style={{ textAlign: 'right' }}>Amount</SkTableHead>
            </SkTableRow>
          </SkTableHeader>
          <SkTableBody>
            {TABLE_ROWS.map(([id, status, method, amount], i) => (
              <SkTableRow key={id} data-state={i === 1 ? 'selected' : undefined}>
                <SkTableCell>{id}</SkTableCell>
                <SkTableCell>{status}</SkTableCell>
                <SkTableCell>{method}</SkTableCell>
                <SkTableCell style={{ textAlign: 'right' }}>{amount}</SkTableCell>
              </SkTableRow>
            ))}
          </SkTableBody>
          <SkTableFooter>
            <SkTableRow>
              <SkTableCell colSpan={3}>Total</SkTableCell>
              <SkTableCell style={{ textAlign: 'right' }}>$750.00</SkTableCell>
            </SkTableRow>
          </SkTableFooter>
        </SkTable>
      </div>
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
            {size === 'sm' && <SkAlertDialogMedia><PreviewIcon concept="close" size={iconOf(20)} /></SkAlertDialogMedia>}
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
        <SkAttachmentMedia><PreviewIcon concept="box" size={iconOf(16)} /></SkAttachmentMedia>
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
